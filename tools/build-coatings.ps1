$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$source = Join-Path $PSScriptRoot '../assets/coins'
$target = Join-Path $source 'composed'
foreach ($element in @('metal','wood','water','fire','earth')) {
 $img = [System.Drawing.Image]::FromFile((Join-Path $source "$element.png"))
 $canvas = [System.Drawing.Bitmap]::new(1024,1024)
 $g = [System.Drawing.Graphics]::FromImage($canvas)
 $g.Clear([System.Drawing.Color]::Transparent)
 $g.SmoothingMode = 'AntiAlias'
 $g.InterpolationMode = 'HighQualityBicubic'
 $g.PixelOffsetMode = 'HighQuality'
 $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
 # Crop the stray pixels outside the metal rim and inside its opening.
 $path.AddEllipse(4,4,1016,1016)
 $path.AddEllipse(188,188,648,648)
 $g.SetClip($path)
 $dest = [System.Drawing.RectangleF]::new(0,0,1024,1024)
 $src = [System.Drawing.RectangleF]::new(18,18,476,476)
 $g.DrawImage($img,$dest,$src,[System.Drawing.GraphicsUnit]::Pixel)
 $output = [System.Drawing.Bitmap]::new(512,512)
 $og = [System.Drawing.Graphics]::FromImage($output)
 $og.InterpolationMode = 'HighQualityBicubic'
 $og.PixelOffsetMode = 'HighQuality'
 $og.DrawImage($canvas,0,0,512,512)
 $output.Save((Join-Path $target "coating-$element.png"),[System.Drawing.Imaging.ImageFormat]::Png)
 $og.Dispose();$output.Dispose();$path.Dispose();$g.Dispose();$canvas.Dispose();$img.Dispose()
}
Write-Output 'Built five transparent coating icons.'
