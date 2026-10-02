param(
  [string]$WorkspaceRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sourceRoot = Join-Path $WorkspaceRoot "icons\order_image"
$outputRoot = Join-Path $WorkspaceRoot "apps\customer-app\assets\cloth-details\order-v2"
$fitRoot = Join-Path $outputRoot "fit"
$garmentRoot = Join-Path $outputRoot "garments"
$categoryRoot = Join-Path $outputRoot "categories"
$serviceRoot = Join-Path $outputRoot "services"

@($fitRoot, $garmentRoot, $categoryRoot, $serviceRoot) | ForEach-Object {
  [System.IO.Directory]::CreateDirectory($_) | Out-Null
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object MimeType -eq "image/jpeg" |
  Select-Object -First 1

function Export-OrderImage {
  param(
    [Parameter(Mandatory)] [string]$Source,
    [Parameter(Mandatory)] [string]$Destination,
    [System.Drawing.Rectangle]$Crop
  )

  $image = [System.Drawing.Image]::FromFile($Source)
  try {
    $sourceRect = if ($Crop.Width -gt 0 -and $Crop.Height -gt 0) {
      $Crop
    } else {
      [System.Drawing.Rectangle]::new(0, 0, $image.Width, $image.Height)
    }
    $bitmap = [System.Drawing.Bitmap]::new(768, 768, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($image, [System.Drawing.Rectangle]::new(0, 0, 768, 768), $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
      } finally {
        $graphics.Dispose()
      }
      $qualityEncoder = [System.Drawing.Imaging.Encoder]::Quality
      $encoderParameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
      try {
        $encoderParameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new($qualityEncoder, [long]90)
        $bitmap.Save($Destination, $jpegCodec, $encoderParameters)
      } finally {
        $encoderParameters.Dispose()
      }
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $image.Dispose()
  }
}

function Source-Image([string]$name) {
  return Join-Path $sourceRoot $name
}

$standalone = @{
  # Gender / fit choices
  (Join-Path $fitRoot "men.jpg") = "ChatGPT Image Oct 2, 2026, 10_58_26 AM-2.png"
  (Join-Path $fitRoot "women.jpg") = "ChatGPT Image Oct 2, 2026, 10_58_28 AM-3.png"
  (Join-Path $fitRoot "kids.jpg") = "ChatGPT Image Oct 2, 2026, 10_58_29 AM-4.png"
  (Join-Path $fitRoot "unisex.jpg") = "ChatGPT Image Oct 2, 2026, 10_58_31 AM-5.png"

  # Shared/adult garments
  (Join-Path $garmentRoot "kurta.jpg") = "ChatGPT Image Oct 2, 2026, 10_58_32 AM-6.png"
  (Join-Path $garmentRoot "kurta_pajama.jpg") = "ChatGPT Image Oct 2, 2026, 10_58_34 AM-7.png"
  (Join-Path $garmentRoot "shirt.jpg") = "ChatGPT Image Oct 2, 2026, 10_58_35 AM-8.png"
  (Join-Path $garmentRoot "trousers.jpg") = "ChatGPT Image Oct 2, 2026, 10_58_37 AM-9.png"
  (Join-Path $garmentRoot "blazer.jpg") = "ChatGPT Image Oct 2, 2026, 10_58_38 AM-10.png"
  (Join-Path $garmentRoot "waistcoat.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_10 AM-1.png"
  (Join-Path $garmentRoot "sherwani.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_11 AM-2.png"
  (Join-Path $garmentRoot "pathani_suit.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_15 AM-3.png"
  (Join-Path $garmentRoot "suit.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_17 AM-4.png"
  (Join-Path $garmentRoot "blouse.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_18 AM-5.png"
  (Join-Path $garmentRoot "kurti.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_20 AM-6.png"
  (Join-Path $garmentRoot "salwar_suit.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_21 AM-7.png"
  (Join-Path $garmentRoot "dress.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_23 AM-8.png"
  (Join-Path $garmentRoot "top.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_24 AM-9.png"
  (Join-Path $garmentRoot "skirt.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_26 AM-10.png"
  (Join-Path $garmentRoot "palazzo.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_42 AM-1.png"
  (Join-Path $garmentRoot "lehenga.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_44 AM-2.png"
  (Join-Path $garmentRoot "anarkali.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_46 AM-3.png"
  (Join-Path $garmentRoot "other_garment.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_48 AM-4.png"

  # Kids-specific garments (kept separate from adult garments with the same name)
  (Join-Path $garmentRoot "kids_frock.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_50 AM-5.png"
  (Join-Path $garmentRoot "kids_dress.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_52 AM-6.png"
  (Join-Path $garmentRoot "kids_kurta.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_54 AM-7.png"
  (Join-Path $garmentRoot "kids_shirt.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_56 AM-8.png"
  (Join-Path $garmentRoot "kids_shorts.jpg") = "ChatGPT Image Oct 2, 2026, 10_59_58 AM-9.png"
  (Join-Path $garmentRoot "kids_pants.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_00 AM-10.png"
  (Join-Path $garmentRoot "kids_lehenga.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_13 AM-1.png"
  (Join-Path $garmentRoot "kids_suit.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_15 AM-2.png"
  (Join-Path $garmentRoot "kids_school_uniform.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_17 AM-3.png"
  (Join-Path $garmentRoot "kids_other.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_19 AM-4.png"

  # Uniform and custom garments
  (Join-Path $garmentRoot "school_uniform.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_21 AM-5.png"
  (Join-Path $garmentRoot "office_uniform.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_23 AM-6.png"
  (Join-Path $garmentRoot "chef_uniform.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_25 AM-7.png"
  (Join-Path $garmentRoot "medical_uniform.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_27 AM-8.png"
  (Join-Path $garmentRoot "college_uniform.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_29 AM-9.png"
  (Join-Path $garmentRoot "custom_garment.jpg") = "ChatGPT Image Oct 2, 2026, 11_00_31 AM-10.png"
}

foreach ($entry in $standalone.GetEnumerator()) {
  Export-OrderImage -Source (Source-Image $entry.Value) -Destination $entry.Key
}

$finishingGrid = Source-Image "Tailoring and Alterations Service Grid-4.png"
$serviceGrid = Source-Image "Sewing Services Grid Infographic-1.png"
$repairGrid = Source-Image "Tailoring and Repair Services Grid-6.png"

function Export-GridItem([string]$source, [string]$destination, [int]$x, [int]$y, [int]$size) {
  Export-OrderImage -Source $source -Destination $destination -Crop ([System.Drawing.Rectangle]::new($x, $y, $size, $size))
}

# Category thumbnails use the strongest matching supplied service photograph.
Export-GridItem $serviceGrid (Join-Path $categoryRoot "new_stitching.jpg") 344 552 252
Export-GridItem $serviceGrid (Join-Path $categoryRoot "alteration.jpg") 1236 552 252
Export-GridItem $repairGrid (Join-Path $categoryRoot "repair.jpg") 36 36 262
Export-GridItem $repairGrid (Join-Path $categoryRoot "embroidery.jpg") 935 515 262
Export-GridItem $finishingGrid (Join-Path $categoryRoot "finishing.jpg") 35 54 257
Export-GridItem $serviceGrid (Join-Path $categoryRoot "other.jpg") 50 552 252

# New Stitching and Alteration work.
Export-GridItem $serviceGrid (Join-Path $serviceRoot "stitch_from_fabric.jpg") 344 552 252
Export-GridItem $serviceGrid (Join-Path $serviceRoot "copy_garment.jpg") 638 552 252
Export-GridItem $serviceGrid (Join-Path $serviceRoot "stitch_from_reference.jpg") 942 552 252
Export-GridItem $serviceGrid (Join-Path $serviceRoot "tighten.jpg") 1236 552 252

# Repair & Mending work.
$repairTop = @(
  @{ Name = "torn_seam_repair.jpg"; X = 36 },
  @{ Name = "hole_repair.jpg"; X = 327 },
  @{ Name = "zip_repair.jpg"; X = 638 },
  @{ Name = "zip_replacement.jpg"; X = 935 },
  @{ Name = "button_replacement.jpg"; X = 1244 }
)
foreach ($item in $repairTop) {
  Export-GridItem $repairGrid (Join-Path $serviceRoot $item.Name) $item.X 36 262
}
$repairBottom = @(
  @{ Name = "hook_replacement.jpg"; X = 36 },
  @{ Name = "elastic_replacement.jpg"; X = 327 },
  @{ Name = "pocket_repair.jpg"; X = 638 },
  @{ Name = "embroidery_detail.jpg"; X = 935 },
  @{ Name = "lace_work.jpg"; X = 1244 }
)
foreach ($item in $repairBottom) {
  Export-GridItem $repairGrid (Join-Path $serviceRoot $item.Name) $item.X 515 262
}

# Finishing work.
$finishingItems = @(
  @{ Name = "hemming.jpg"; X = 35 },
  @{ Name = "pico.jpg"; X = 336 },
  @{ Name = "fall_stitching.jpg"; X = 638 },
  @{ Name = "lining_work.jpg"; X = 941 },
  @{ Name = "minor_finishing.jpg"; X = 1244 }
)
foreach ($item in $finishingItems) {
  Export-GridItem $finishingGrid (Join-Path $serviceRoot $item.Name) $item.X 54 257
}

Write-Output "Prepared customer order images in $outputRoot"
