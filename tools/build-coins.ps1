# Assemble supplied layers once; gameplay loads the resulting transparent PNGs.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$source = Join-Path $PSScriptRoot '../assets/coins'
$target = Join-Path $source 'composed'
$bitmaps = @{}
foreach ($name in @('center-light','center-dark','frame-light','frame-dark','metal','wood','water','fire','earth')) {
  $bitmaps[$name] = [System.Drawing.Image]::FromFile((Join-Path $source "$name.png"))
}
function Paint-Layer($graphics, $name, [double]$outer, [double]$inner, [int]$sx, [int]$sy, [int]$sw) {
  $r = 512 * $outer
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddEllipse([single](512-$r),[single](512-$r),[single](2*$r),[single](2*$r))
  if ($inner -gt 0) {
    $ri = 512 * $inner
    $path.AddEllipse([single](512-$ri),[single](512-$ri),[single](2*$ri),[single](2*$ri))
  }
  $saved = $graphics.Save()
  $graphics.SetClip($path)
  $rect = [System.Drawing.RectangleF]::new([single](512-$r),[single](512-$r),[single](2*$r),[single](2*$r))
  $srcRect = [System.Drawing.RectangleF]::new($sx,$sy,$sw,$sw)
  $graphics.DrawImage($bitmaps[$name],$rect,$srcRect,[System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Restore($saved)
  $path.Dispose()
}
try {
 foreach ($face in @('light','dark')) {
  foreach ($element in @('metal','wood','water','fire','earth','none')) {
   $canvas = [System.Drawing.Bitmap]::new(1024,1024)
   $g = [System.Drawing.Graphics]::FromImage($canvas)
   $g.Clear([System.Drawing.Color]::Transparent)
   $g.SmoothingMode = 'AntiAlias'
   $g.InterpolationMode = 'HighQualityBicubic'
   $g.PixelOffsetMode = 'HighQuality'
   $baseColor = if ($face -eq 'light') { '#b69a62' } else { '#55565a' }
   $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($baseColor))
   $g.FillEllipse($brush,10,10,1004,1004)
   $centerRadius = if ($element -eq 'none') { .83 } else { .55 }
   Paint-Layer $g "center-$face" $centerRadius 0 172 160 900
   if ($element -ne 'none') { Paint-Layer $g $element .84 .52 18 18 476 }
   Paint-Layer $g "frame-$face" 1 .80 16 8 1216
   $output = [System.Drawing.Bitmap]::new(512,512)
   $og = [System.Drawing.Graphics]::FromImage($output)
   $og.InterpolationMode = 'HighQualityBicubic'
   $og.PixelOffsetMode = 'HighQuality'
   $og.DrawImage($canvas,0,0,512,512)
   $output.Save((Join-Path $target "$face-$element.png"),[System.Drawing.Imaging.ImageFormat]::Png)
   $og.Dispose();$output.Dispose();$brush.Dispose();$g.Dispose();$canvas.Dispose()
  }
 }
} finally { foreach ($bitmap in $bitmaps.Values) { $bitmap.Dispose() } }
Write-Output 'Built 12 transparent 512 x 512 coin sprites.'
