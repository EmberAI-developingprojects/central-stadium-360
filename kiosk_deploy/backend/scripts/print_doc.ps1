<#
  print_doc.ps1 — render a receipt/ticket spec to a bitmap and either print it
  to a Windows printer (POS80 thermal) or save it as a PNG (for testing).

  The bridge shells out to this: it generates QR PNGs + a JSON spec, then calls
  either  -PrinterName "POS80"  to print, or  -OutFile receipt.png  to preview.

  Rendering is done with GDI+ (System.Drawing), so Mongolian Cyrillic — incl.
  Ө/Ү which single-byte ESC/POS codepages can't encode — prints correctly.
#>
param(
  [Parameter(Mandatory=$true)][string]$SpecPath,
  [string]$PrinterName,
  [string]$OutFile
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$spec = Get-Content -Raw -LiteralPath $SpecPath -Encoding UTF8 | ConvertFrom-Json
$dpi = 203                                   # POS80 native density
$widthMm = [double]($spec.widthMm); if ($widthMm -le 0) { $widthMm = 72 }
$wPx = [int][Math]::Round($widthMm / 25.4 * $dpi)
$fontFamily = if ($spec.font) { [string]$spec.font } else { 'Arial' }

function New-Font([double]$pt, [bool]$bold) {
  $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  New-Object System.Drawing.Font($fontFamily, [single]$pt, $style, [System.Drawing.GraphicsUnit]::Point)
}
function Pt([string]$size) {
  switch ($size) { 'sm' {8} 'lg' {14} 'xl' {20} default {10.5} }
}
function Align([string]$a) {
  switch ($a) { 'center' {[System.Drawing.StringAlignment]::Center} 'right' {[System.Drawing.StringAlignment]::Far} default {[System.Drawing.StringAlignment]::Near} }
}

# Draw (or just measure, when $draw=$false) every block top-to-bottom; return final Y in px.
function Invoke-Layout {
  param([System.Drawing.Graphics]$g, [bool]$draw)
  $black = [System.Drawing.Brushes]::Black
  $grey  = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(110,110,110))
  $pad = [int]($dpi * 0.06)                  # ~3mm side padding
  $innerW = $wPx - 2*$pad
  $y = [double]($dpi * 0.05)
  foreach ($b in $spec.blocks) {
    switch ([string]$b.type) {
      'text' {
        $f = New-Font (Pt $b.size) ([bool]$b.bold)
        $fmt = New-Object System.Drawing.StringFormat
        $fmt.Alignment = Align $b.align
        $txt = [string]$b.text
        $sz = $g.MeasureString($txt, $f, $innerW, $fmt)
        if ($draw) { $g.DrawString($txt, $f, $black, (New-Object System.Drawing.RectangleF($pad, $y, $innerW, $sz.Height)), $fmt) }
        $y += $sz.Height
        $f.Dispose()
      }
      'kv' {
        $f = New-Font (Pt 'md') $false
        $kFmt = New-Object System.Drawing.StringFormat; $kFmt.Alignment = [System.Drawing.StringAlignment]::Near
        $vFmt = New-Object System.Drawing.StringFormat; $vFmt.Alignment = [System.Drawing.StringAlignment]::Far
        $k = [string]$b.k; $v = [string]$b.v
        $h = ($g.MeasureString($v, $f, $innerW, $vFmt)).Height
        if ($draw) {
          $rect = New-Object System.Drawing.RectangleF($pad, $y, $innerW, $h)
          $g.DrawString($k, $f, $grey, $rect, $kFmt)
          $g.DrawString($v, $f, $black, $rect, $vFmt)
        }
        $y += $h
        $f.Dispose()
      }
      'rule' {
        $y += $dpi * 0.04
        if ($draw) {
          $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(150,150,150)), 1
          $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
          $g.DrawLine($pen, $pad, [single]$y, $wPx-$pad, [single]$y)
          $pen.Dispose()
        }
        $y += $dpi * 0.04
      }
      'qr' {
        $qpx = [int][Math]::Round([double]($b.sizeMm) / 25.4 * $dpi)
        if ($qpx -le 0) { $qpx = [int]($dpi * 1.6) }
        $y += $dpi * 0.03
        if ($draw -and (Test-Path -LiteralPath $b.path)) {
          $img = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $b.path))
          $x = [int](($wPx - $qpx) / 2)
          $g.DrawImage($img, $x, [int]$y, $qpx, $qpx)
          $img.Dispose()
        }
        $y += $qpx + $dpi * 0.03
      }
      'space' { $y += $dpi * ([double]$b.mm / 25.4) }
      default { }
    }
  }
  $grey.Dispose()
  return [int][Math]::Ceiling($y + $dpi * 0.05)
}

# Pass 1: measure total height on a scratch surface.
$scratch = New-Object System.Drawing.Bitmap 8, 8
$mg = [System.Drawing.Graphics]::FromImage($scratch)
$mg.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$hPx = Invoke-Layout -g $mg -draw $false
$mg.Dispose(); $scratch.Dispose()

# Pass 2: render to the real bitmap.
$bmp = New-Object System.Drawing.Bitmap $wPx, $hPx
$bmp.SetResolution($dpi, $dpi)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
[void](Invoke-Layout -g $g -draw $true)
$g.Dispose()

if ($OutFile) {
  $bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "RENDERED $OutFile ($wPx x $hPx px)"
  $bmp.Dispose()
  exit 0
}

# Print the bitmap to the named printer, sizing the page to the content so no
# blank paper is fed before the cut.
$pd = New-Object System.Drawing.Printing.PrintDocument
$pd.PrinterSettings.PrinterName = $PrinterName
if (-not $pd.PrinterSettings.IsValid) { Write-Error "Invalid printer: '$PrinterName'"; exit 2 }
$pd.DocumentName = if ($spec.title) { [string]$spec.title } else { 'Kiosk receipt' }
$widthHund  = [int][Math]::Round($widthMm / 25.4 * 100)
$heightHund = [int][Math]::Round($hPx / $dpi * 100)
$pd.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize('KioskRoll', $widthHund, $heightHund)
$pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)
$pd.add_PrintPage({
  param($s, $e)
  $e.Graphics.DrawImage($bmp, 0, 0, $widthHund, $heightHund)
  $e.HasMorePages = $false
})
$pd.Print()
$bmp.Dispose()
Write-Output "PRINTED to '$PrinterName' ($wPx x $hPx px)"
