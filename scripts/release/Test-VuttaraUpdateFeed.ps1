param(
    [Parameter()]
    [string]$Path = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SiteRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

if (-not $Path) {
    $Path = Join-Path $SiteRoot "public\updates\latest.json"
}

$text = [System.IO.File]::ReadAllText(
    $Path,
    [System.Text.Encoding]::UTF8
).TrimStart([char]0xFEFF).Trim()

if (-not $text.StartsWith("{")) {
    throw "Update feed does not begin with a JSON object."
}

$feed = $text | ConvertFrom-Json

$properties = @($feed.PSObject.Properties.Name)

foreach ($requiredProperty in @("product", "channel", "version")) {
    if ($properties -notcontains $requiredProperty) {
        throw "Missing required update-feed property: $requiredProperty"
    }
}

if ([string]$feed.product -ne "Vuttara Studio") {
    throw "Invalid product."
}

if ([string]$feed.channel -ne "stable") {
    throw "Invalid channel."
}

if ([string]$feed.version -notmatch "^\d+\.\d+\.\d+$") {
    throw "Invalid semantic version."
}

if ($properties -contains "platform" -and [string]$feed.platform -ne "windows") {
    throw "Invalid platform."
}

if ($properties -contains "architecture" -and [string]$feed.architecture -ne "x64") {
    throw "Invalid architecture."
}

$installerObject = $null

if ($properties -contains "installer") {
    $installerObject = $feed.installer
}
elseif ($properties -contains "download") {
    $installerObject = $feed.download
}
else {
    $installerObject = $feed
}

$installerProperties = @($installerObject.PSObject.Properties.Name)

$filename = $null
foreach ($name in @("filename", "fileName", "name")) {
    if ($installerProperties -contains $name) {
        $filename = [string]$installerObject.$name
        break
    }
}

$url = $null
foreach ($name in @("url", "downloadUrl", "installerUrl")) {
    if ($installerProperties -contains $name) {
        $url = [string]$installerObject.$name
        break
    }
}

if (-not $filename -or $filename -notmatch "^Vuttara-Studio-\d+\.\d+\.\d+-Setup\.exe$") {
    throw "Invalid or missing installer filename."
}

if (-not $url -or $url -notmatch "^https://") {
    throw "Installer URL must use HTTPS."
}

$checksumObject = $null

if ($installerProperties -contains "checksum") {
    $checksumObject = $installerObject.checksum
}
elseif ($properties -contains "checksum") {
    $checksumObject = $feed.checksum
}

if (-not $checksumObject) {
    throw "Missing checksum metadata."
}

$checksumProperties = @($checksumObject.PSObject.Properties.Name)

$algorithm = $null
foreach ($name in @("algorithm", "type")) {
    if ($checksumProperties -contains $name) {
        $algorithm = [string]$checksumObject.$name
        break
    }
}

$value = $null
foreach ($name in @("value", "sha256", "hash")) {
    if ($checksumProperties -contains $name) {
        $value = [string]$checksumObject.$name
        break
    }
}

if ($algorithm -and $algorithm.ToUpperInvariant().Replace("-", "") -ne "SHA256") {
    throw "Checksum algorithm must be SHA-256."
}

if (-not $value -or $value -notmatch "^[a-fA-F0-9]{64}$") {
    throw "Invalid SHA-256 checksum."
}

Write-Host "PASS: Vuttara Studio update feed is valid."
Write-Host "Version: $($feed.version)"
Write-Host "File:    $($feed.filename)"
