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
  [string]$OutFile,
  # 'raw' = send native ESC/POS raster bytes straight to the spooler (RAW
  # datatype), bypassing the driver's page model entirely — thermal drivers
  # kept remapping/scaling GDI pages (tickets printed shrunken or oversized).
  # 'gdi' = legacy System.Drawing.Printing path, kept as an escape hatch.
  [string]$Mode = 'raw'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# winspool P/Invoke for RAW spooling — defined at top level (Windows PowerShell
# 5.1's parser mishandles a multi-line here-string nested inside try/if blocks).
# Single-quoted here-string: no PowerShell interpolation of the C# source.
$rawPrnCode = @'
using System;
using System.Runtime.InteropServices;
public class RawPrn {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public struct DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv")] public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA di);
  [DllImport("winspool.Drv")] public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv")] public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv")] public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
}
'@

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
  # NB: thermal printers have no greyscale — a grey brush dithers into sparse
  # dots and prints almost invisibly. Everything prints solid black.
  $grey  = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Black)
  $padL = [int]($dpi * 0.08)                  # ~2mm left margin
  $padR = [int]($dpi * 0.06)                  # ~1.5mm right margin
  $pad = $padL
  $innerW = $wPx - $padL - $padR
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
          $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::Black), 1
          $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
          $g.DrawLine($pen, $padL, [single]$y, $wPx-$padR, [single]$y)
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
#
# Thermal roll drivers (POS80 class) often IGNORE a programmatic custom paper
# size and silently substitute their default form — clipping everything below
# its length (the "half ticket" bug). The driver only reveals the page size it
# actually granted inside PrintPage ($e.PageBounds), so we paginate there: if
# the granted page is shorter than the content, keep printing the remainder on
# further pages — on roll paper they come out joined. If the driver honours
# the custom size, this stays a single page exactly like before.
# ─── RAW ESC/POS path (default) ─────────────────────────────────────────────
# The printer's native raster command (GS v 0) prints the bitmap dot-for-dot
# at the head's 203dpi — no driver page mapping, so no shrinking/enlarging.
# Sent through the Windows spooler with datatype RAW (winspool P/Invoke).
if ($Mode -eq 'raw' -and -not $OutFile) {
  try {
    if (-not ('RawPrn' -as [type])) { Add-Type -TypeDefinition $rawPrnCode }
    # 1bpp packed rows straight from GDI+ (MSB-first, exactly ESC/POS's layout).
    $rect = New-Object System.Drawing.Rectangle(0, 0, $bmp.Width, $bmp.Height)
    $mono = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format1bppIndexed)
    $bd = $mono.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format1bppIndexed)
    $stride = [Math]::Abs($bd.Stride)
    $rows = $mono.Height
    $rawBits = New-Object byte[] ($stride * $rows)
    [System.Runtime.InteropServices.Marshal]::Copy($bd.Scan0, $rawBits, 0, $rawBits.Length)
    $mono.UnlockBits($bd)
    # ESC/POS wants bit=1 for a BLACK dot; the 1bpp palette says which index
    # is white. Invert when bit=1 maps to white (the usual case).
    $p1 = $mono.Palette.Entries[1]
    $invert = ([int]$p1.R + [int]$p1.G + [int]$p1.B) -gt 384
    $mono.Dispose()
    $bytesPerRow = [int][Math]::Ceiling($bmp.Width / 8.0)
    # Width isn't a multiple of 8 → the last byte has padding bits past the real
    # pixels. After inverting they'd flip to "print" and draw a 1px hairline down
    # the right edge, so mask the padding bits off the final byte of every row.
    $lastValidBits = $bmp.Width - ($bytesPerRow - 1) * 8
    $lastMask = [byte]((0xFF -shl (8 - $lastValidBits)) -band 0xFF)

    $ms = New-Object System.IO.MemoryStream
    $ms.Write([byte[]](0x1B, 0x40), 0, 2)                    # ESC @  init
    $y0 = 0
    while ($y0 -lt $rows) {
      $h = [Math]::Min(1024, $rows - $y0)
      $hdr = [byte[]](0x1D, 0x76, 0x30, 0x00,
        ($bytesPerRow -band 0xFF), (($bytesPerRow -shr 8) -band 0xFF),
        ($h -band 0xFF), (($h -shr 8) -band 0xFF))            # GS v 0
      $ms.Write($hdr, 0, 8)
      for ($r = 0; $r -lt $h; $r++) {
        $off = ($y0 + $r) * $stride
        for ($b = 0; $b -lt $bytesPerRow; $b++) {
          $v = $rawBits[$off + $b]
          if ($invert) { $v = $v -bxor 0xFF }
          if ($b -eq ($bytesPerRow - 1)) { $v = $v -band $lastMask }
          $ms.WriteByte([byte]$v)
        }
      }
      $y0 += $h
    }
    # The cutter sits ~15-18mm PAST the print head, so the last printed rows
    # (the ticket code under the QR) can be guillotined off if we cut as soon
    # as the raster bytes finish. Feed the paper forward explicitly before the
    # partial cut. Override with PRINT_POST_CUT_FEED_MM if a POS80 clone needs
    # a slightly longer or shorter tail.
    $postCutFeedMm = 24.0
    if ($env:PRINT_POST_CUT_FEED_MM) {
      try {
        $postCutFeedMm = [Math]::Max(0.0, [double]::Parse($env:PRINT_POST_CUT_FEED_MM, [System.Globalization.CultureInfo]::InvariantCulture))
      } catch { }
    }
    $feedDots = [int][Math]::Round($dpi * ($postCutFeedMm / 25.4))
    while ($feedDots -gt 0) {
      $chunk = [Math]::Min(255, $feedDots)
      $ms.Write([byte[]](0x1B, 0x4A, ($chunk -band 0xFF)), 0, 3)   # ESC J n
      $feedDots -= $chunk
    }
    $ms.Write([byte[]](0x1D, 0x56, 0x01), 0, 3)             # GS V 1  partial cut
    $bytes = $ms.ToArray()

    $h = [IntPtr]::Zero
    if (-not [RawPrn]::OpenPrinter($PrinterName, [ref]$h, [IntPtr]::Zero)) {
      throw "OpenPrinter('$PrinterName') failed"
    }
    try {
      $docName = if ($spec.title) { [string]$spec.title } else { 'Kiosk receipt' }
      $di = New-Object RawPrn+DOCINFOA
      $di.pDocName = $docName
      $di.pDataType = 'RAW'
      if (-not [RawPrn]::StartDocPrinter($h, 1, [ref]$di)) { throw 'StartDocPrinter failed' }
      [void][RawPrn]::StartPagePrinter($h)
      $written = 0
      if (-not [RawPrn]::WritePrinter($h, $bytes, $bytes.Length, [ref]$written)) { throw 'WritePrinter failed' }
      [void][RawPrn]::EndPagePrinter($h)
      [void][RawPrn]::EndDocPrinter($h)
    } finally {
      [void][RawPrn]::ClosePrinter($h)
    }
    $bmp.Dispose()
    Write-Output "RAW printed $rows rows x ${wPx}px ($($bytes.Length) bytes) to '$PrinterName'"
    Write-Output "PRINTED to '$PrinterName' ($wPx x $hPx px, raw ESC/POS)"
    exit 0
  } catch {
    Write-Output "RAW print failed: $($_.Exception.Message) — falling back to GDI"
  }
}

# ─── GDI fallback path ──────────────────────────────────────────────────────
$pd = New-Object System.Drawing.Printing.PrintDocument
$pd.PrinterSettings.PrinterName = $PrinterName
if (-not $pd.PrinterSettings.IsValid) { Write-Error "Invalid printer: '$PrinterName'"; exit 2 }
$pd.DocumentName = if ($spec.title) { [string]$spec.title } else { 'Kiosk receipt' }
$widthHund  = [int][Math]::Round($widthMm / 25.4 * 100)
$heightHund = [int][Math]::Round($hPx / $dpi * 100)

# Thermal roll drivers routinely IGNORE a programmatic custom PaperSize and
# substitute the control-panel default form, then map our page onto it —
# which shrinks the print (the "tiny receipt" bug). Two defences:
#   1. Prefer a paper size from the DRIVER'S OWN list (e.g. "papersize
#      (80x3276mm)") — a form the driver recognises is never remapped — and
#      set it on BOTH DefaultPageSettings and PrinterSettings (MS Q&A 1328706).
#   2. Draw RELATIVE to the page the driver actually granted (PageBounds):
#      fill 90% of its width (72mm of an 80mm roll) — so even a remapped
#      page ends up full-width on paper instead of a shrunken strip.
$forms = @($pd.PrinterSettings.PaperSizes)
$script:log = @()
$script:log += ("PAPER forms: " + (($forms | ForEach-Object { "{0}={1}x{2}" -f $_.PaperName, $_.Width, $_.Height }) -join '; '))
$roll = $forms |
  Where-Object { $_.Width -ge 250 -and $_.Width -le 350 -and $_.Height -ge $heightHund } |
  Sort-Object Height | Select-Object -First 1
if (-not $roll) {
  $roll = $forms | Where-Object { $_.Width -ge 250 -and $_.Width -le 350 } | Sort-Object -Descending Height | Select-Object -First 1
}
if ($roll) {
  $pd.DefaultPageSettings.PaperSize = $roll
  $pd.PrinterSettings.DefaultPageSettings.PaperSize = $roll
  $script:log += ("PAPER using driver form: {0} ({1}x{2})" -f $roll.PaperName, $roll.Width, $roll.Height)
} else {
  $custom = New-Object System.Drawing.Printing.PaperSize('KioskRoll', $widthHund, $heightHund)
  $pd.DefaultPageSettings.PaperSize = $custom
  $pd.PrinterSettings.DefaultPageSettings.PaperSize = $custom
  $script:log += ("PAPER using custom size: {0}x{1}" -f $widthHund, $heightHund)
}
$pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)

$script:printedHund = 0
$script:pageNo = 0
$pd.add_PrintPage({
  param($s, $e)
  $script:pageNo++
  $pageW = [int]$e.PageBounds.Width
  $pageH = [int]$e.PageBounds.Height
  if ($pageW -le 0) { $pageW = $widthHund }
  if ($pageH -le 0) { $pageH = $heightHund }
  # Scale to the granted page: 90% of its width, aspect ratio preserved.
  $drawW = [int]($pageW * 0.9)
  $drawH = [int]([double]$drawW * $hPx / $wPx)
  $x = [int](($pageW - $drawW) / 2)
  # NB: pipeline output vanishes inside a .NET event handler — collect it.
  $script:log += ("PAGE {0}: granted {1}x{2}, drawing {3}x{4} at x={5}" -f $script:pageNo, $pageW, $pageH, $drawW, $drawH, $x)
  # Draw the full image shifted up so this page shows the next slice.
  $e.Graphics.DrawImage($bmp, $x, [int](-$script:printedHund), $drawW, $drawH)
  $script:printedHund += $pageH
  $e.HasMorePages = (($script:printedHund -lt $drawH) -and ($script:pageNo -lt 20))
})
$pd.Print()
$bmp.Dispose()
$script:log | ForEach-Object { Write-Output $_ }
Write-Output "PRINTED to '$PrinterName' ($wPx x $hPx px, $script:pageNo page(s))"
