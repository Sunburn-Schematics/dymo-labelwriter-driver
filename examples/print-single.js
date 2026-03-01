/**
 * Example: Print a single label image
 *
 * Detects the first available DYMO printer and prints the specified image file.
 * The image should be sized to match the label dimensions at 300 DPI.
 *
 * Usage: node print-single.js [image-file]
 *        node print-single.js label.png
 */

var { detectDymo, printImage } = require('../driver');
var fs = require('fs');

async function main() {
  var imageFile = process.argv[2];
  if (!imageFile) {
    console.log('Usage: node print-single.js <image-file>');
    console.log('');
    console.log('Example: node print-single.js label.png');
    console.log('');
    console.log('The image should be sized for your label type at 300 DPI:');
    console.log('  30333 (2-up): 294 x 294 pixels (full sheet with both labels)');
    console.log('  30332:        300 x 638 pixels');
    console.log('  30252:        338 x 1050 pixels');
    process.exit(1);
  }

  // Check image exists
  if (!fs.existsSync(imageFile)) {
    console.error('File not found:', imageFile);
    process.exit(1);
  }

  // Detect printer
  console.log('Detecting DYMO printer...');
  var result = await detectDymo();
  if (!result.found) {
    console.error('No DYMO printer found. Is it plugged in and powered on?');
    process.exit(1);
  }

  var printer = result.printers[0];
  console.log('Using printer:', printer.name);

  // Read and print
  var imageBuffer = fs.readFileSync(imageFile);
  console.log('Printing', imageFile, '(' + Math.round(imageBuffer.length / 1024) + ' KB)...');

  var printResult = await printImage(printer.name, imageBuffer);
  if (printResult.success) {
    console.log('Print sent successfully.');
  } else {
    console.error('Print failed:', printResult.error);
    process.exit(1);
  }
}

main().catch(function (err) {
  console.error('Error:', err.message);
  process.exit(1);
});
