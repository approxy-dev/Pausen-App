Add-Type -AssemblyName System.Drawing

$srcFile = "E:\SleepGuardian Mobile App\SG + WEB2\docs\brand\pausen-icon-512.png"
$webDir = "E:\SleepGuardian Mobile App\SG + WEB2\website"
$brandDir = Join-Path $webDir "assets\brand"

if (-not (Test-Path $brandDir)) {
    New-Item -ItemType Directory -Path $brandDir -Force | Out-Null
}

function Resize-Png($srcBmp, $destPath, $w, $h) {
    $dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($srcBmp, 0, 0, $w, $h)
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
}

$bmp = [System.Drawing.Bitmap]::FromFile($srcFile)

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
    Resize-Png $bmp $outPath $s.Width $s.Height
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

$bmp.Dispose()
Write-Output "favicon.ico successfully generated at root and brand directory ($($icoBytes.Length) bytes)."
