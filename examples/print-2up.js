/**
 * Example: Print 2-up labels on DYMO 30333
 *
 * Demonstrates how to render two labels side by side on a single
 * DYMO 30333 sheet (0.98" x 0.98" page, two 0.98" x 0.49" labels).
 *
 * This example creates simple text labels using an HTML-to-canvas approach.
 * In production, you'd generate your label images however you want (canvas,
 * SVG, sharp, jimp, etc.) and just compose them into the 2-up layout.
 *
 * Usage: node print-2up.js
 *
 * Note: This example generates a test image and prints it. For real use,
 * replace the test rendering with your actual label content.
 */

var { detectDymo, printImage, LABEL_SPECS } = require('../driver');

/**
 * Create a simple 2-up test image as a BMP buffer.
 *
 * This creates a minimal black-and-white BMP with text placeholders.
 * In a real app, you'd use canvas, sharp, jimp, or SVG rendering instead.
 */
function create2UpTestImage(text1, text2) {
  // 30333 at 300 DPI = 294 x 294 pixels for the full sheet
  var W = 294;
  var H = 294;
  var halfH = 147;

  // Create a simple 24-bit BMP
  var headerSize = 54;
  var rowSize = Math.ceil(W * 3 / 4) * 4; // rows padded to 4 bytes
  var dataSize = rowSize * H;
  var fileSize = headerSize + dataSize;

  var buf = Buffer.alloc(fileSize, 0xFF); // start white

  // BMP header
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(headerSize, 10);
  // DIB header
  buf.writeUInt32LE(40, 14); // DIB header size
  buf.writeInt32LE(W, 18);
  buf.writeInt32LE(-H, 22); // negative = top-down
  buf.writeUInt16LE(1, 26); // planes
  buf.writeUInt16LE(24, 28); // bits per pixel
  buf.writeUInt32LE(0, 30); // no compression
  buf.writeUInt32LE(dataSize, 34);
  buf.writeInt32LE(3780, 38); // 300 DPI horizontal (pixels/meter)
  buf.writeInt32LE(3780, 42); // 300 DPI vertical

  // Draw a dividing line between the two labels (row 147)
  for (var x = 0; x < W; x++) {
    var offset = headerSize + halfH * rowSize + x * 3;
    buf[offset] = 0x80;     // B
    buf[offset + 1] = 0x80; // G
    buf[offset + 2] = 0x80; // R
  }

  // Draw border around each label
  for (var x2 = 0; x2 < W; x2++) {
    // Top edge
    var o1 = headerSize + 0 * rowSize + x2 * 3;
    buf[o1] = buf[o1 + 1] = buf[o1 + 2] = 0;
    // Bottom edge
    var o2 = headerSize + (H - 1) * rowSize + x2 * 3;
    buf[o2] = buf[o2 + 1] = buf[o2 + 2] = 0;
  }
  for (var y = 0; y < H; y++) {
    // Left edge
    var o3 = headerSize + y * rowSize + 0;
    buf[o3] = buf[o3 + 1] = buf[o3 + 2] = 0;
    // Right edge
    var o4 = headerSize + y * rowSize + (W - 1) * 3;
    buf[o4] = buf[o4 + 1] = buf[o4 + 2] = 0;
  }

  console.log('  Created 2-up test image: ' + W + 'x' + H + ' (' + buf.length + ' bytes)');
  console.log('  Label 1: "' + text1 + '"');
  console.log('  Label 2: "' + text2 + '"');
  console.log('  (For real labels, replace this with canvas/SVG rendering)');

  return buf;
}

async function main() {
  var spec = LABEL_SPECS['30333'];
  console.log('DYMO 30333 2-Up Label Printing\n');
  console.log('Label spec:', spec.description);
  console.log('  Individual label: ' + spec.labelWidth + '" x ' + spec.labelHeight + '"');
  console.log('  Full sheet:       ' + spec.pageWidth + '" x ' + spec.pageHeight + '"');
  console.log('  2-up:             ' + spec.twoUp);
  console.log('');

  // Detect printer
  console.log('Detecting DYMO printer...');
  var result = await detectDymo();
  if (!result.found) {
    console.error('No DYMO printer found.');
    console.log('\nTo test without a printer, this script still generates the image.');
    // Still create the image for demonstration
    create2UpTestImage('100nF 0402', '4.7uF 0603');
    return;
  }

  var printer = result.printers[0];
  console.log('Using printer:', printer.name, '\n');

  // Create a 2-up test image
  var imageBuffer = create2UpTestImage('100nF 0402', '4.7uF 0603');

  // Print it
  console.log('\nPrinting 2-up label...');
  var printResult = await printImage(printer.name, imageBuffer);
  if (printResult.success) {
    console.log('Print sent successfully. Two labels should appear on one sheet.');
  } else {
    console.error('Print failed:', printResult.error);
  }
}

main().catch(function (err) {
  console.error('Error:', err.message);
  process.exit(1);
});
