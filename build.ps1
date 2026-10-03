# Packages the extension into a store-ready zip (Chrome Web Store / Edge Add-ons).
# The store requires all extension files at the root of the archive, so nothing is nested.

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$outDir = Join-Path $root 'dist'
$version = (Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json).version
$outFile = Join-Path $outDir "aniworld-helper_v$version.zip"

$files = @(
    'manifest.json',
    'background.js',
    'content-main.js',
    'content-player.js',
    'popup.html',
    'popup.css',
    'popup.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png'
)

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $outFile) { Remove-Item $outFile -Force }

$zip = [System.IO.Compression.ZipFile]::Open($outFile, 'Create')
try {
    foreach ($file in $files) {
        $path = Join-Path $root $file
        if (-not (Test-Path $path)) {
            Write-Warning "Skipping missing file: $file"
            continue
        }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $path, ($file -replace '\\', '/')) | Out-Null
    }
} finally {
    $zip.Dispose()
}

Write-Host "Created $outFile"
