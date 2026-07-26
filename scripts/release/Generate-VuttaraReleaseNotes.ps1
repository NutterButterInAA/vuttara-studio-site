param(
    [Parameter()]
    [ValidatePattern("^\d+\.\d+\.\d+$")]
    [string]$Version = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SiteRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ReleasesRoot = Join-Path $SiteRoot "public\updates\releases"
$OutputRoot = Join-Path $SiteRoot "public\release-notes"
$IndexJsonPath = Join-Path $ReleasesRoot "index.json"
$OutputHtmlPath = Join-Path $OutputRoot "index.html"

function Get-PropertyValue {
    param(
        [Parameter(Mandatory)]$Object,
        [Parameter(Mandatory)][string[]]$Names,
        [Parameter()][AllowEmptyString()][string]$Default = ""
    )

    if (-not $Object) {
        return $Default
    }

    $properties = @($Object.PSObject.Properties.Name)

    foreach ($name in $Names) {
        if ($properties -contains $name) {
            $value = $Object.$name
            if ($null -ne $value -and [string]$value -ne "") {
                return $value
            }
        }
    }

    return $Default
}

function Convert-ToStringList {
    param($Value)

    if ($null -eq $Value) {
        return @()
    }

    if ($Value -is [string]) {
        if ([string]::IsNullOrWhiteSpace($Value)) {
            return @()
        }

        return @($Value.Trim())
    }

    $valueProperties = @($Value.PSObject.Properties.Name)
    if ($valueProperties.Count -gt 0) {
        $objectText = Get-PropertyValue `
            -Object $Value `
            -Names @("text", "title", "description", "summary", "value") `
            -Default ""

        if (-not [string]::IsNullOrWhiteSpace([string]$objectText)) {
            return @(([string]$objectText).Trim())
        }
    }

    if ($Value -is [System.Collections.IEnumerable]) {
        $items = @()

        foreach ($item in $Value) {
            if ($null -eq $item) {
                continue
            }

            if ($item -is [string]) {
                if (-not [string]::IsNullOrWhiteSpace($item)) {
                    $items += $item.Trim()
                }
                continue
            }

            $text = Get-PropertyValue `
                -Object $item `
                -Names @("text", "title", "description", "summary", "value") `
                -Default ([string]$item)

            if (-not [string]::IsNullOrWhiteSpace([string]$text)) {
                $items += ([string]$text).Trim()
            }
        }

        return @($items)
    }

    return @(([string]$Value).Trim())
}

function Encode-Html {
    param([Parameter()][AllowEmptyString()][string]$Value = "")
    return [System.Net.WebUtility]::HtmlEncode($Value)
}

if (-not (Test-Path -LiteralPath $ReleasesRoot -PathType Container)) {
    throw "Release metadata directory was not found: $ReleasesRoot"
}

$releaseFiles = @(
    Get-ChildItem `
        -LiteralPath $ReleasesRoot `
        -Filter "*.json" `
        -File |
    Where-Object {
        $_.Name -ne "index.json" -and
        $_.BaseName -match "^\d+\.\d+\.\d+$"
    }
)

if ($releaseFiles.Count -eq 0) {
    throw "No versioned release JSON files were found in $ReleasesRoot"
}

$releases = [System.Collections.Generic.List[object]]::new()

foreach ($file in $releaseFiles) {
    $jsonText = [System.IO.File]::ReadAllText(
        $file.FullName,
        [System.Text.Encoding]::UTF8
    ).TrimStart([char]0xFEFF).Trim()

    $data = $jsonText | ConvertFrom-Json
    $properties = @($data.PSObject.Properties.Name)

    $releaseVersion = [string](Get-PropertyValue `
        -Object $data `
        -Names @("version") `
        -Default $file.BaseName)

    if ($releaseVersion -notmatch "^\d+\.\d+\.\d+$") {
        throw "Invalid release version in $($file.Name): $releaseVersion"
    }

    $summary = [string](Get-PropertyValue `
        -Object $data `
        -Names @("summary", "description", "releaseSummary", "notes") `
        -Default "")

    if ([string]::IsNullOrWhiteSpace($summary) -and
        $properties -contains "releaseNotes" -and
        $null -ne $data.releaseNotes) {
        $summary = [string](Get-PropertyValue `
            -Object $data.releaseNotes `
            -Names @("summary", "description", "title", "notes") `
            -Default "")
    }

    if ([string]::IsNullOrWhiteSpace($summary)) {
        $summary = "Vuttara Studio $releaseVersion release."
    }

    $publishedAtRaw = Get-PropertyValue `
        -Object $data `
        -Names @("publishedAt", "published_at", "releaseDate", "date", "createdAt") `
        -Default ""

    $publishedAt = $null

    if ($publishedAtRaw) {
        try {
            $publishedAt = [DateTimeOffset]::Parse([string]$publishedAtRaw)
        }
        catch {
            $publishedAt = $null
        }
    }

    $changes = @()

    foreach ($propertyName in @(
        "changes",
        "highlights",
        "features",
        "improvements",
        "fixes",
        "releaseNotes",
        "notes"
    )) {
        if ($properties -contains $propertyName) {
            $changes += Convert-ToStringList -Value $data.$propertyName
        }
    }

    $changes = @(
        $changes |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -Unique
    )

    if ($changes.Count -eq 0 -and $summary) {
        $changes = @($summary)
    }

    $installer = $null

    if ($properties -contains "installer") {
        $installer = $data.installer
    }
    elseif ($properties -contains "download") {
        $installer = $data.download
    }
    else {
        $installer = $data
    }

    $installerName = [string](Get-PropertyValue `
        -Object $installer `
        -Names @("filename", "fileName", "name") `
        -Default "Vuttara-Studio-$releaseVersion-Setup.exe")

    $installerUrl = [string](Get-PropertyValue `
        -Object $installer `
        -Names @("url", "downloadUrl", "installerUrl") `
        -Default "")

    $releases.Add([pscustomobject]@{
        version = $releaseVersion
        summary = $summary
        publishedAt = if ($publishedAt) { $publishedAt.ToString("o") } else { $null }
        changes = @($changes)
        installer = [pscustomobject]@{
            filename = $installerName
            url = $installerUrl
        }
        source = "/updates/releases/$($file.Name)"
    })
}

$sortedReleases = @(
    $releases |
    Sort-Object {
        [version]$_.version
    } -Descending
)

if ($Version -and $sortedReleases.version -notcontains $Version) {
    throw "The requested release version $Version is missing from the versioned release metadata."
}

$indexObject = [ordered]@{
    product = "Vuttara Studio"
    channel = "stable"
    generatedAt = [DateTimeOffset]::UtcNow.ToString("o")
    latestVersion = $sortedReleases[0].version
    releases = $sortedReleases
}

New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$indexJson = $indexObject | ConvertTo-Json -Depth 12

[System.IO.File]::WriteAllText(
    $IndexJsonPath,
    $indexJson + "`n",
    $utf8NoBom
)

$cards = [System.Text.StringBuilder]::new()

foreach ($release in $sortedReleases) {
    $changeItems = [System.Text.StringBuilder]::new()

    foreach ($change in $release.changes) {
        [void]$changeItems.AppendLine(
            "              <li>$(Encode-Html ([string]$change))</li>"
        )
    }

    $dateLabel = "Published release"

    if ($release.publishedAt) {
        try {
            $dateLabel = ([DateTimeOffset]::Parse($release.publishedAt)).ToString(
                "MMMM d, yyyy"
            )
        }
        catch {
            $dateLabel = "Published release"
        }
    }

    $downloadHtml = ""

    if ($release.installer.url -match "^https://") {
        $downloadHtml = @"
            <a class="release-download" href="$(Encode-Html $release.installer.url)">
              Download $(Encode-Html $release.installer.filename)
            </a>
"@
    }

    [void]$cards.AppendLine(@"
      <article class="release-card" id="v$($release.version)">
        <header class="release-header">
          <div>
            <p class="release-kicker">$dateLabel</p>
            <h2>Vuttara Studio $(Encode-Html $release.version)</h2>
          </div>
          <span class="release-channel">Stable</span>
        </header>

        <p class="release-summary">$(Encode-Html $release.summary)</p>

        <h3>Changes in this release</h3>
        <ul class="release-list">
$changeItems
        </ul>

$downloadHtml
      </article>
"@)
}

$html = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta
    name="description"
    content="Release notes, improvements, fixes, and download information for every Vuttara Studio release."
  />
  <title>Release notes | Vuttara Studio</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #070910;
      color: #f7f7ff;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 75% -10%, rgba(103, 72, 255, 0.18), transparent 35%),
        #070910;
    }

    a { color: inherit; }

    .page-shell {
      width: min(980px, calc(100% - 40px));
      margin: 0 auto;
      padding: 72px 0 96px;
    }

    .back-link {
      display: inline-flex;
      margin-bottom: 38px;
      color: #b8c0dd;
      text-decoration: none;
    }

    .back-link:hover { color: #ffffff; }

    .hero h1 {
      margin: 0;
      font-size: clamp(3.5rem, 10vw, 6.5rem);
      line-height: 0.92;
      letter-spacing: -0.07em;
    }

    .hero p {
      max-width: 700px;
      margin: 28px 0 56px;
      color: #b8c0dd;
      font-size: 1.04rem;
      line-height: 1.7;
    }

    .release-stack {
      display: grid;
      gap: 24px;
    }

    .release-card {
      padding: clamp(28px, 5vw, 48px);
      border: 1px solid #292d3d;
      border-radius: 22px;
      background: rgba(17, 20, 31, 0.92);
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.22);
    }

    .release-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #2b3040;
    }

    .release-kicker {
      margin: 0 0 8px;
      color: #9ba5c6;
      font-size: 0.84rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .release-header h2 {
      margin: 0;
      font-size: clamp(1.7rem, 4vw, 2.25rem);
      letter-spacing: -0.035em;
    }

    .release-channel {
      flex: 0 0 auto;
      padding: 7px 11px;
      border: 1px solid #39405a;
      border-radius: 999px;
      color: #c7cdef;
      font-size: 0.78rem;
    }

    .release-summary {
      margin: 26px 0;
      color: #c4cae1;
      line-height: 1.7;
    }

    .release-card h3 {
      margin: 0 0 14px;
      font-size: 1rem;
    }

    .release-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding-left: 22px;
      color: #b9c3e4;
      line-height: 1.55;
    }

    .release-download {
      display: inline-flex;
      margin-top: 28px;
      padding: 12px 17px;
      border-radius: 10px;
      background: #f4f3ff;
      color: #10111a;
      font-weight: 700;
      text-decoration: none;
    }

    .release-download:hover {
      transform: translateY(-1px);
    }

    .generated-note {
      margin-top: 32px;
      color: #78809c;
      font-size: 0.8rem;
    }

    @media (max-width: 620px) {
      .page-shell {
        width: min(100% - 24px, 980px);
        padding-top: 38px;
      }

      .release-header {
        display: grid;
      }

      .release-channel {
        width: fit-content;
      }
    }
  </style>
</head>
<body>
  <main class="page-shell">
    <a class="back-link" href="/">Back to Vuttara Studio</a>

    <section class="hero">
      <h1>Release notes</h1>
      <p>
        Changes, fixes, improvements, download information, and known release
        details for every published Vuttara Studio version.
      </p>
    </section>

    <section class="release-stack" aria-label="Vuttara Studio releases">
$cards
    </section>

    <p class="generated-note">
      RELEASE_NOTES_AUTOMATION_V1 · RELEASE_NOTES_OBJECT_RENDERING_REPAIR_V1 · Latest version:
      $(Encode-Html $sortedReleases[0].version)
    </p>
  </main>
</body>
</html>
"@

[System.IO.File]::WriteAllText(
    $OutputHtmlPath,
    $html,
    $utf8NoBom
)

if (-not (Test-Path -LiteralPath $OutputHtmlPath -PathType Leaf)) {
    throw "The generated release-notes page was not created."
}

if (-not (Test-Path -LiteralPath $IndexJsonPath -PathType Leaf)) {
    throw "The generated release index was not created."
}

$generatedHtml = [System.IO.File]::ReadAllText(
    $OutputHtmlPath,
    [System.Text.Encoding]::UTF8
)

if ($generatedHtml -notmatch "RELEASE_NOTES_AUTOMATION_V1") {
    throw "The generated release-notes page is missing its runtime validation marker."
}

if ($generatedHtml -notmatch [regex]::Escape($sortedReleases[0].version)) {
    throw "The generated release-notes page is missing the latest version."
}

if ($generatedHtml -match "@\{[^}]*=" -or
    $generatedHtml -match "System\.Management\.Automation\.PSCustomObject") {
    throw "The generated release-notes page contains raw PowerShell object text."
}

if ($generatedHtml -notmatch "RELEASE_NOTES_OBJECT_RENDERING_REPAIR_V1") {
    throw "The generated release-notes page is missing the object-rendering repair marker."
}

Write-Host "PASS: Vuttara Studio release notes generated."
Write-Host "Latest version: $($sortedReleases[0].version)"
Write-Host "Releases:       $($sortedReleases.Count)"
Write-Host "HTML:           $OutputHtmlPath"
Write-Host "Index:          $IndexJsonPath"
