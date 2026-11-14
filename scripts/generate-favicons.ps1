$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore, WindowsBase

$webDir = Split-Path -Parent $PSScriptRoot
$brandDir = Join-Path $webDir "assets\brand"
[xml]$logo = Get-Content -LiteralPath (Join-Path $brandDir 'pausen-mark.svg') -Raw
if ($logo.svg.viewBox -ne '0 0 64 64') { throw 'Update the favicon scale for the new logo viewBox.' }

# Render the canonical brand paths at each size on a fully opaque black tile.
function Write-FaviconPng($destPath, $width) {
    $visual = [System.Windows.Media.DrawingVisual]::new()
    $drawing = $visual.RenderOpen()
    try {
        $drawing.DrawRectangle([System.Windows.Media.Brushes]::Black, $null, [System.Windows.Rect]::new(0, 0, $width, $width))
        $drawing.PushTransform([System.Windows.Media.ScaleTransform]::new($width / 64.0, $width / 64.0))
        foreach ($path in $logo.svg.path) {
            $color = [System.Windows.Media.ColorConverter]::ConvertFromString($path.fill)
            $brush = [System.Windows.Media.SolidColorBrush]::new($color)
            $drawing.DrawGeometry($brush, $null, [System.Windows.Media.Geometry]::Parse($path.d))
        }
        $drawing.Pop()
    } finally { $drawing.Close() }
    $bitmap = [System.Windows.Media.Imaging.RenderTargetBitmap]::new($width, $width, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
    $bitmap.Render($visual)
    $encoder = [System.Windows.Media.Imaging.PngBitmapEncoder]::new()
    $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
    $stream = [System.IO.File]::Create($destPath)
    try { $encoder.Save($stream) } finally { $stream.Dispose() }
}

# 1. Generate individual PNG sizes
$sizes = @(
    @{ Name = "favicon-16x16.png"; Width = 16; Height = 16 },
    @{ Name = "favicon-32x32.png"; Width = 32; Height = 32 },
    @{ Name = "favicon-48x48.png"; Width = 48; Height = 48 },
    @{ Name = "favicon-96x96.png"; Width = 96; Height = 96 },
    @{ Name = "apple-touch-icon.png"; Width = 180; Height = 180 },
    @{ Name = "favicon-192x192.png"; Width = 192; Height = 192 },
    @{ Name = "favicon-512x512.png"; Width = 512; Height = 512 }
)

foreach ($s in $sizes) {
    $outPath = Join-Path $brandDir $s.Name
    Write-FaviconPng $outPath $s.Width
    Write-Output "Generated $($s.Name) ($($s.Width)x$($s.Height))"
}

# 2. Copy root conveniences for Googlebot & Apple
Copy-Item (Join-Path $brandDir "favicon-48x48.png") (Join-Path $webDir "favicon-48x48.png") -Force
Copy-Item (Join-Path $brandDir "apple-touch-icon.png") (Join-Path $webDir "apple-touch-icon.png") -Force

# 3. Assemble multi-resolution favicon.ico containing 16, 32, 48 PNG frames
$icoSizes = @(16, 32, 48)
$icoImages = @()
foreach ($is in $icoSizes) {
    $pngPath = Join-Path $brandDir "favicon-$($is)x$($is).png"
    $bytes = [System.IO.File]::ReadAllBytes($pngPath)
    $icoImages += ,@($is, $bytes)
}

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# Header: reserved(2) + type(2) + count(2)
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$icoImages.Count)

$offset = 6 + ($icoImages.Count * 16)
foreach ($item in $icoImages) {
    $s = $item[0]
    $data = $item[1]
    $bw.Write([byte]$s)
    $bw.Write([byte]$s)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$data.Length)
    $bw.Write([uint32]$offset)
    $offset += $data.Length
}

foreach ($item in $icoImages) {
    $data = $item[1]
    $bw.Write($data, 0, $data.Length)
}

$bw.Flush()
$icoBytes = $ms.ToArray()
$bw.Close()
$ms.Close()

[System.IO.File]::WriteAllBytes((Join-Path $brandDir "favicon.ico"), $icoBytes)
[System.IO.File]::WriteAllBytes((Join-Path $webDir "favicon.ico"), $icoBytes)

Write-Output "favicon.ico successfully generated at root and brand directory ($($icoBytes.Length) bytes)."
