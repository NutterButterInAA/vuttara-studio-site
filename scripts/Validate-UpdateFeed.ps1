$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$LatestPath = Join-Path $ProjectRoot "public\updates\latest.json"
$ReleaseFolder = Join-Path $ProjectRoot "public\updates\releases"

function Assert-Valid {
    param(
        [Parameter(Mandatory)]
        [bool]$Condition,

        [Parameter(Mandatory)]
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Test-Version {
    param(
        [Parameter(Mandatory)]
        [string]$Version
    )

    return $Version -match "^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$"
}

function Test-UpdateFile {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [bool]$IsLatest
    )

    Write-Host "Validating $Path" -ForegroundColor Cyan

    Assert-Valid `
        (Test-Path -LiteralPath $Path) `
        "Update file was not found: $Path"

    $Update = Get-Content -LiteralPath $Path -Raw |
        ConvertFrom-Json

    Assert-Valid `
        ($Update.schemaVersion -eq 1) `
        "schemaVersion must be 1."

    Assert-Valid `
        ($Update.product -eq "Vuttara Studio") `
        "product must be Vuttara Studio."

    Assert-Valid `
        ($Update.productId -eq "com.nuttabuttainaa.vuttarastudio") `
        "productId is invalid."

    Assert-Valid `
        ($Update.channel -in @("stable", "beta", "nightly")) `
        "Update channel is invalid."

    Assert-Valid `
        (Test-Version ([string]$Update.version)) `
        "version is invalid."

    Assert-Valid `
        ([string]$Update.displayVersion -eq [string]$Update.version) `
        "displayVersion must match version."

    Assert-Valid `
        (Test-Version ([string]$Update.minimumSupportedVersion)) `
        "minimumSupportedVersion is invalid."

    Assert-Valid `
        ([string]$Update.download.url).StartsWith("https://") `
        "Installer URL must use HTTPS."

    $ExpectedInstaller =
        "Vuttara-Studio-$($Update.version)-Setup.exe"

    Assert-Valid `
        ([string]$Update.download.fileName -eq $ExpectedInstaller) `
        "Installer filename must be $ExpectedInstaller"

    Assert-Valid `
        ([string]$Update.download.url).EndsWith("/$ExpectedInstaller") `
        "Installer URL must end with $ExpectedInstaller"

    Assert-Valid `
        ([string]$Update.integrity.algorithm -eq "SHA-256") `
        "Integrity algorithm must be SHA-256."

    if ($null -ne $Update.integrity.sha256) {
        Assert-Valid `
            ([string]$Update.integrity.sha256 -match "^[a-fA-F0-9]{64}$") `
            "SHA-256 must contain 64 hexadecimal characters."
    }

    Assert-Valid `
        ([string]$Update.releaseNotes.url).StartsWith("https://") `
        "Release-notes URL must use HTTPS."

    Assert-Valid `
        ([bool]$Update.installationPolicy.blockInstallWhileStreaming) `
        "Streaming installation protection must be enabled."

    Assert-Valid `
        ([bool]$Update.installationPolicy.blockInstallWhileRecording) `
        "Recording installation protection must be enabled."

    Assert-Valid `
        ([bool]$Update.installationPolicy.blockInstallWhileReplayBufferActive) `
        "Replay-buffer installation protection must be enabled."

    Assert-Valid `
        ([bool]$Update.installationPolicy.blockAutomaticRestartWhileBusy) `
        "Automatic restart protection must be enabled."

    Assert-Valid `
        ([bool]$Update.installationPolicy.requireUserApproval) `
        "User approval must be required."

    if ($IsLatest) {
        $ReleasePath = Join-Path `
            $ReleaseFolder `
            "$($Update.version).json"

        Assert-Valid `
            (Test-Path -LiteralPath $ReleasePath) `
            "Release-specific metadata is missing: $ReleasePath"

        $ReleaseUpdate = Get-Content `
            -LiteralPath $ReleasePath `
            -Raw |
            ConvertFrom-Json

        Assert-Valid `
            ([string]$ReleaseUpdate.version -eq [string]$Update.version) `
            "Latest and release metadata versions do not match."

        Assert-Valid `
            ([string]$ReleaseUpdate.download.fileName -eq
                [string]$Update.download.fileName) `
            "Latest and release installer names do not match."
    }

    Write-Host "PASS: $Path" -ForegroundColor Green
}

Test-UpdateFile `
    -Path $LatestPath `
    -IsLatest $true

$ReleaseFiles = @(
    Get-ChildItem `
        -LiteralPath $ReleaseFolder `
        -Filter "*.json"
)

foreach ($ReleaseFile in $ReleaseFiles) {
    Test-UpdateFile `
        -Path $ReleaseFile.FullName `
        -IsLatest $false
}

Write-Host ''
Write-Host 'PASS: All Vuttara Studio update feeds are valid.' `
    -ForegroundColor Green