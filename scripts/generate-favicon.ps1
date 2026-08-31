Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\sures\Downloads\purabiya-foundation-admin-main\purabiya-foundation-admin-main\public\assets\images\logo.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# 1. Generate 32x32 PNG
$icon32 = New-Object System.Drawing.Bitmap 32, 32
$g32 = [System.Drawing.Graphics]::FromImage($icon32)
$g32.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g32.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g32.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g32.DrawImage($bmp, 0, 0, 32, 32)
$g32.Dispose()

$icon32.Save("c:\Users\sures\Downloads\purabiya-foundation-admin-main\purabiya-foundation-admin-main\public\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon32.Save("c:\Users\sures\Downloads\purabiya-foundation-admin-main\purabiya-foundation-admin-main\app\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 2. Generate 192x192 PNG for apple-touch-icon / high-res
$icon192 = New-Object System.Drawing.Bitmap 192, 192
$g192 = [System.Drawing.Graphics]::FromImage($icon192)
$g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g192.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g192.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g192.DrawImage($bmp, 0, 0, 192, 192)
$g192.Dispose()

$icon192.Save("c:\Users\sures\Downloads\purabiya-foundation-admin-main\purabiya-foundation-admin-main\public\apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 3. Create .ico files
$hIcon = $icon32.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($hIcon)

$icoStreamPub = [System.IO.File]::Create("c:\Users\sures\Downloads\purabiya-foundation-admin-main\purabiya-foundation-admin-main\public\favicon.ico")
$ico.Save($icoStreamPub)
$icoStreamPub.Close()

$icoStreamApp = [System.IO.File]::Create("c:\Users\sures\Downloads\purabiya-foundation-admin-main\purabiya-foundation-admin-main\app\favicon.ico")
$ico.Save($icoStreamApp)
$icoStreamApp.Close()

$icon32.Dispose()
$icon192.Dispose()
$bmp.Dispose()

Write-Output "Favicon and icon files generated successfully!"
