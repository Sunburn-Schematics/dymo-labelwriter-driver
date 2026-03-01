# DYMO LabelWriter Driver (No SDK Required)

Print labels on **DYMO LabelWriter** printers from Node.js on Windows — without installing DYMO Connect, DYMO Label Software, or the DYMO SDK. Uses the built-in Windows print spooler directly.

![Color-coded DYMO labels on WENTAI component boxes](images/printer-1.jpg)

## Why This Exists

If you've ever prototyped with SMD components, you know the pain. You've got dozens of tiny WENTAI boxes full of 0402 capacitors, 0603 resistors, SOT-23 transistors — and they all look identical. You're squinting at faded factory labels, cross-referencing Digi-Key order sheets, and losing 10 minutes every time you need a 4.7uF cap because it's buried in a box that says "CL05A475MP5NRNC" in 4-point font.

The DYMO LabelWriter 450 with **30333 multipurpose labels** solves this. These tiny 1" x 1/2" labels come in a **2-up format** — two labels print side by side on each sheet. Print the part number, value, and package size, stick one on each WENTAI box, and suddenly you can find the right component on the first try instead of the fifth.

The problem? DYMO's official SDK is bloated, poorly documented, and a pain to integrate. Their desktop software is mandatory for most workflows. All you actually need is the Windows print spooler — the DYMO LabelWriter registers as a standard Windows printer, so you can print any image to it using the built-in `Start-Process -Verb Print` shell command.

This project gives you:
- **A clean Node.js driver** — detect and print in ~50 lines, no SDK required
- **2-up label support** — render two labels side by side on one sheet
- **The complete label specification** — dimensions, margins, and DPI documented
- **Production-tested** — we print hundreds of component labels with this at [Sunburn Schematics](https://sunburnschematics.com)

### The Workflow

1. Design your labels (we built a web app with a label designer)
2. For 2-up labels (30333), render two labels side by side into a single image
3. Send the image to the DYMO printer via the Windows spooler
4. The printer auto-feeds and prints — about 3 seconds per sheet (2 labels)
5. Peel and stick on your component boxes, bins, bags, PCB trays
6. Actually find the right 0402 cap when you need it

### Why Not the DYMO SDK?

| | DYMO SDK | This Driver |
|---|---------|-------------|
| Install size | ~200MB+ (DYMO Connect) | Zero — uses Windows built-in |
| Dependencies | .NET Framework, COM objects | Node.js only |
| Linux/Mac | SDK is Windows-only | Driver is Windows-only (same limitation) |
| Label design | XML-based label format | Send any image (PNG, BMP, JPEG) |
| Complexity | 500+ API calls | 2 functions: `detect()` and `print()` |
| Works without DYMO software | No | Yes — just needs the printer driver |

The DYMO LabelWriter shows up as a standard Windows printer once you install the basic printer driver (included with Windows Update or from DYMO's website). That's all you need — no DYMO Connect, no DYMO Label, no SDK.

## Quick Start

```js
const { detectDymo, printImage } = require('./driver');
const fs = require('fs');

// Find DYMO printers
const result = await detectDymo();
if (result.found) {
  console.log('Found:', result.printers[0].name);

  // Print an image
  const image = fs.readFileSync('label.png');
  const printResult = await printImage(result.printers[0].name, image);
  console.log(printResult.success ? 'Printed!' : 'Failed:', printResult.error);
}
```

## Hardware Specifications

| Spec | Value |
|------|-------|
| Model | DYMO LabelWriter 450 |
| Print Technology | Direct thermal (no ink, no toner) |
| Resolution | 300 x 600 DPI |
| Max Print Width | ~2.25" (56mm) |
| Connectivity | USB 2.0 (appears as Windows printer) |
| Speed | ~51 labels/min (standard address labels) |
| Power | 24V DC adapter |

### Compatible Label Sizes

| Model | Size | Type | Notes |
|-------|------|------|-------|
| **30333** | 1" x 1/2" | Multipurpose, **2-up** | Two labels per sheet — ideal for small component boxes |
| 30330 | 3/4" x 2" | Return address | |
| 30332 | 1" x 2-1/8" | Multipurpose | |
| 30334 | 2-1/4" x 1-1/4" | Multipurpose | |
| 30252 | 1-1/8" x 3-1/2" | Address | Standard mailing label |
| 30256 | 2-5/16" x 4" | Shipping | Large shipping label |
| 30299 | 3/8" x 3/4" | Price tag / jewelry | Tiny labels |

## The 30333 "2-Up" Format

The DYMO 30333 is the label we use most for component labeling. Here's the key thing people miss: **the physical sheet is 1" x 1" and holds TWO labels side by side.**

```
┌─────────────────────────┐
│  ┌──────────┬──────────┐ │
│  │          │          │ │
│  │  Label 1 │  Label 2 │ │  ← One physical sheet (1" x 1")
│  │ 0.49"x   │ 0.49"x   │ │
│  │  0.98"   │  0.98"   │ │
│  │          │          │ │
│  └──────────┴──────────┘ │
└─────────────────────────┘
        Feed direction →
```

### 30333 Dimensions

| Measurement | Inches | mm | Pixels @300 DPI |
|-------------|--------|-------|-----------------|
| **Individual label** | 0.98" x 0.49" | 24.9mm x 12.4mm | 294 x 147 |
| **Full sheet (2-up)** | 0.98" x 0.98" | 24.9mm x 24.9mm | 294 x 294 |
| **Print margin (each side)** | 0.075" L/R, 0.02" T/B | — | 23px L/R, 6px T/B |
| **Safe print area (per label)** | 0.83" x 0.45" | — | 249 x 135 |

### How to Render 2-Up Labels

When printing 30333 labels, you need to compose both labels into a single image before sending it to the printer:

```js
// Create a 294x294 canvas (full sheet at 300 DPI)
const canvas = createCanvas(294, 294);
const ctx = canvas.getContext('2d');

// White background
ctx.fillStyle = '#FFFFFF';
ctx.fillRect(0, 0, 294, 294);

// Draw label 1 (top half)
ctx.drawImage(label1Image, 0, 0, 294, 147);

// Draw label 2 (bottom half)
ctx.drawImage(label2Image, 0, 147, 294, 147);

// Send the combined image to the printer
const buffer = canvas.toBuffer('image/png');
await printImage('DYMO LabelWriter 450', buffer);
```

The printer treats the full 0.98" x 0.98" sheet as one print job. After printing, you peel the two labels apart.

### Available Colors

The 30333 comes in multiple colors — useful for color-coding component categories:

| Color | Use Case |
|-------|----------|
| White | Default — works for everything |
| Yellow | Capacitors |
| Red | High voltage / warning |
| Green | Inductors / connectors |
| Blue | ICs / semiconductors |
| Orange | Resistors |

(Color assignments are just suggestions — use whatever system works for you.)

## How It Works

The DYMO LabelWriter registers as a standard Windows printer via the `usbprint.sys` driver. This means:

1. **No protocol reverse-engineering needed** — unlike raw USB or TCP printers, the DYMO uses the Windows print pipeline
2. **Detection** uses WMI (`Win32_Printer` class) to find printers with "DYMO" or "LabelWriter" in the name
3. **Printing** uses the Windows shell `Print` verb — writes the image to a temp file and calls `Start-Process -Verb Print`

### Detection (WMI)

```powershell
Get-CimInstance Win32_Printer | Where-Object { $_.Name -match "DYMO|LabelWriter" } |
  Select-Object Name, DriverName, PortName, PrinterStatus, WorkOffline
```

Returns:
```json
{
  "Name": "DYMO LabelWriter 450",
  "DriverName": "DYMO LabelWriter 450",
  "PortName": "USB001",
  "PrinterStatus": 0,
  "WorkOffline": false
}
```

**Printer status codes:**

| PrinterStatus | Meaning |
|---------------|---------|
| 0 | Ready / Idle |
| 1 | Paused |
| 2 | Error |
| 3 | Printing (in progress) |
| 4 | Warming up |
| 5 | Stopped |
| 6 | Offline |

### Printing (Shell Verb)

```powershell
Start-Process -FilePath "C:\temp\label.png" -Verb Print -ArgumentList '/d:"DYMO LabelWriter 450"' -Wait
```

This hands the image to the Windows print subsystem, which handles:
- Scaling to the label size (set via printer preferences)
- Dithering color images to 1-bit thermal
- Spooling and feeding

### Important: Printer Preferences

For correct label sizing, the DYMO printer's **default paper size must match your labels** in Windows Printer Preferences:

1. Open **Settings > Printers & Scanners > DYMO LabelWriter 450 > Printing Preferences**
2. Set **Paper Size** to "30333 Multipurpose - 2 Up" (or whichever label you're using)
3. Set **Orientation** to match your label layout
4. Set **Quality** to "Text & Graphics" for component labels

If the paper size doesn't match, Windows will either crop or scale the image incorrectly.

## API Reference

### `detectDymo()`

Detects DYMO printers installed on the system.

```js
const result = await detectDymo();
// {
//   found: true,
//   printers: [
//     {
//       name: 'DYMO LabelWriter 450',
//       driver: 'DYMO LabelWriter 450',
//       port: 'USB001',
//       status: 0,
//       offline: false,
//       connected: true
//     }
//   ]
// }
```

### `printImage(printerName, imageBuffer, options)`

Prints an image buffer to the specified printer.

```js
const result = await printImage('DYMO LabelWriter 450', pngBuffer, {});
// { success: true }
// or
// { success: false, error: 'Print failed: ...' }
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `printerName` | string | Printer name as reported by Windows (from `detectDymo`) |
| `imageBuffer` | Buffer | PNG, BMP, or JPEG image data |
| `options` | object | Reserved for future use |

**Notes:**
- The image is written to a temp file in `os.tmpdir()`, printed, then deleted
- The function waits for the print to complete (30s timeout)
- The image should be sized to match the label dimensions at 300 DPI
- For 30333 2-up labels: 294 x 294 pixels
- For other labels: width x height in inches * 300

## Comparison with Brother VC-500W

We also maintain an open-source driver for the [Brother VC-500W](https://github.com/Sunburn-Schematics/brother-vc500w-driver) color label printer. Here's how they compare:

| | DYMO LabelWriter 450 | Brother VC-500W |
|---|---------------------|-----------------|
| Print tech | Direct thermal (B&W only) | ZINK (full color) |
| Protocol | Windows print spooler | Raw XML over TCP/USB |
| Connection | USB only | WiFi + USB |
| Speed | ~3s per sheet | ~15s per label |
| Cost per label | ~$0.02 | ~$0.15 |
| Best for | High-volume B&W component labels | Color labels with symbols/logos |
| 2-up support | Yes (30333) | No (continuous roll) |
| Linux support | Requires CUPS + DYMO driver | WiFi driver works on any platform |

For SMD component labeling, we use both: DYMO 30333 for bulk black-and-white labels (part number + value), and Brother VC-500W for color labels that include schematic symbols or photos.

## Project Structure

```
dymo-labelwriter-driver/
├── README.md              # This file — full documentation
├── LICENSE                # MIT License
├── driver.js              # Node.js driver (detect + print)
├── examples/
│   ├── detect.js          # Find DYMO printers on this machine
│   ├── print-single.js    # Print a single label image
│   └── print-2up.js       # Render and print 2-up labels (30333)
└── docs/
    └── label-specs.md     # Detailed label dimensions and specs
```

## Prerequisites

- **Windows** (uses WMI and Windows print spooler)
- **Node.js** 14+
- **DYMO printer driver installed** (comes via Windows Update or [DYMO website](https://www.dymo.com/support))
- **DYMO Connect / DYMO Label software NOT required**

The printer just needs to show up in Windows **Settings > Printers & Scanners**. That's it.

## Credits

- **Sunburn Schematics** — production use, driver development, label design
- The Windows print spooler for making this ridiculously simple compared to raw USB

## License

MIT License — see [LICENSE](LICENSE) for details.

## Contributing

Found a bug? Want to add support for another DYMO model? PRs and issues welcome.
