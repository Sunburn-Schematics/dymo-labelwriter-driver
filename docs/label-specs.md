# DYMO Label Specifications

Detailed dimensions and specifications for DYMO LabelWriter labels.

## 30333 — Multipurpose 2-Up

This is the label we use most for SMD component labeling. The key thing people miss: **each physical sheet holds TWO labels side by side.**

### Physical Layout

```
┌──────────────────────────────────┐
│  ┌─────────────────────────────┐ │
│  │         Label 1              │ │  0.49"
│  │    0.98" x 0.49"             │ │
│  ├─────────────────────────────┤ │  ← perforation
│  │         Label 2              │ │  0.49"
│  │    0.98" x 0.49"             │ │
│  └─────────────────────────────┘ │
└──────────────────────────────────┘
            0.98"

     Feed direction: ────────→
```

### Dimensions

| Measurement | Inches | mm | Pixels @300 DPI |
|-------------|--------|---------|-----------------|
| Sheet width | 0.98 | 24.9 | 294 |
| Sheet height | 0.98 | 24.9 | 294 |
| Label width | 0.98 | 24.9 | 294 |
| Label height | 0.49 | 12.4 | 147 |
| Left margin | 0.075 | 1.9 | 23 |
| Right margin | 0.075 | 1.9 | 23 |
| Top margin | 0.02 | 0.5 | 6 |
| Bottom margin | 0.02 | 0.5 | 6 |
| Safe print width | 0.83 | 21.1 | 249 |
| Safe print height (per label) | 0.45 | 11.4 | 135 |

### Rendering

When printing 2-up labels, you render **both labels into a single image** that fills the entire 0.98" x 0.98" sheet:

```
Image (294 x 294 pixels at 300 DPI):
┌─────────────────────────┐
│ ┌───────────────────┐   │
│ │   margin           │   │
│ │ ┌───────────────┐ │   │
│ │ │   Label 1     │ │   │  rows 0-146
│ │ │  (your content)│ │   │
│ │ └───────────────┘ │   │
│ ├───────────────────┤   │
│ │ ┌───────────────┐ │   │
│ │ │   Label 2     │ │   │  rows 147-293
│ │ │  (your content)│ │   │
│ │ └───────────────┘ │   │
│ └───────────────────┘   │
└─────────────────────────┘
```

### Available Colors

| Color | Typical Use |
|-------|-------------|
| White | Default — works for everything |
| Yellow | Capacitors / caution |
| Red | High voltage / power / warning |
| Green | Connectors / inductors |
| Blue | ICs / semiconductors |
| Orange | Resistors |

Colors are pre-printed on the label stock. The thermal printer only adds black print on top.

## 30330 — Return Address

| Measurement | Inches | mm | Pixels @300 DPI |
|-------------|--------|---------|-----------------|
| Width | 0.75 | 19.1 | 225 |
| Height | 2.0 | 50.8 | 600 |

## 30332 — Multipurpose

| Measurement | Inches | mm | Pixels @300 DPI |
|-------------|--------|---------|-----------------|
| Width | 1.0 | 25.4 | 300 |
| Height | 2.125 | 54.0 | 638 |

## 30334 — Multipurpose Medium

| Measurement | Inches | mm | Pixels @300 DPI |
|-------------|--------|---------|-----------------|
| Width | 2.25 | 57.2 | 675 |
| Height | 1.25 | 31.8 | 375 |

## 30252 — Standard Address

| Measurement | Inches | mm | Pixels @300 DPI |
|-------------|--------|---------|-----------------|
| Width | 1.125 | 28.6 | 338 |
| Height | 3.5 | 88.9 | 1050 |

## 30256 — Shipping

| Measurement | Inches | mm | Pixels @300 DPI |
|-------------|--------|---------|-----------------|
| Width | 2.3125 | 58.7 | 694 |
| Height | 4.0 | 101.6 | 1200 |

## 30299 — Price Tag / Jewelry

| Measurement | Inches | mm | Pixels @300 DPI |
|-------------|--------|---------|-----------------|
| Width | 0.375 | 9.5 | 113 |
| Height | 0.75 | 19.1 | 225 |

Tiny labels — useful for very small component packages or jewelry price tags.

## Printing Tips

### Image Format
- **PNG** is recommended — lossless, good for sharp text
- **BMP** works fine but produces larger files
- **JPEG** also works but introduces artifacts on sharp text at small sizes
- The printer is thermal (B&W only) — color images are auto-dithered by the driver

### DPI and Sizing
- The LabelWriter 450 prints at **300 x 600 DPI** (300 horizontal, 600 vertical)
- For label design, use **300 DPI** — the printer handles the vertical doubling
- Image dimensions = label dimensions in inches x 300

### Paper Size Setting
The Windows printer driver must be configured with the correct paper size:
1. Windows Settings > Printers & Scanners > DYMO LabelWriter 450
2. Printing Preferences > Paper Size
3. Select the label type you're using (e.g., "30333 Multipurpose - 2 Up")

If this doesn't match, the image will be cropped or scaled incorrectly.

### Thermal Printing Considerations
- **Black text on white** gives the best results
- **Large solid black areas** can cause labels to curl (too much heat)
- **Fine lines under 1px** may not print reliably
- **Grayscale images** are dithered — simple bold graphics work better than photos
- **Barcodes** print well — use adequate quiet zones (margins around the barcode)
