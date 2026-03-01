/**
 * Example: Print component labels on the DYMO LabelWriter 450
 *
 * Renders 2-up labels (two components per sheet) using the exact same
 * layout as the Sunburn Schematics web app — component symbol, QR code,
 * footprint badge, specs — and prints them on the DYMO LabelWriter 450.
 *
 * The 30333 labels are 2-up format: two 0.98" x 0.49" labels per sheet.
 * This example renders each pair as a single 294x294 image at 300 DPI.
 *
 * Usage:
 *   node print-component-label.js                    # prints all sample pairs
 *   node print-component-label.js --preview          # saves images without printing
 *
 * Requires: npm install (puppeteer, qrcode)
 */

var fs = require('fs');
var path = require('path');
var { render2UpLabel, closeBrowser, SAMPLE_COMPONENTS } = require('../label-renderer');
var { detectDymo, printImage } = require('../driver');

var PREVIEW_ONLY = false;
var args = process.argv.slice(2);
for (var i = 0; i < args.length; i++) {
  if (args[i] === '--preview') PREVIEW_ONLY = true;
}

async function main() {
  console.log('DYMO LabelWriter 450 — 2-Up Component Labels');
  console.log('==============================================\n');

  // Pair up components for 2-up printing
  var pairs = [];
  for (var p = 0; p < SAMPLE_COMPONENTS.length; p += 2) {
    if (p + 1 < SAMPLE_COMPONENTS.length) {
      pairs.push([SAMPLE_COMPONENTS[p], SAMPLE_COMPONENTS[p + 1]]);
    } else {
      pairs.push([SAMPLE_COMPONENTS[p], SAMPLE_COMPONENTS[p]]);
    }
  }

  // Detect printer (if not preview-only)
  var printerName = null;
  if (!PREVIEW_ONLY) {
    console.log('Detecting DYMO printer...');
    var result = await detectDymo();
    if (!result.found) {
      console.error('No DYMO printer found. Use --preview to save images without printing.');
      await closeBrowser();
      process.exit(1);
    }
    printerName = result.printers[0].name;
    console.log('Using: ' + printerName + '\n');
  }

  for (var idx = 0; idx < pairs.length; idx++) {
    var pair = pairs[idx];
    console.log('[Sheet ' + (idx + 1) + '/' + pairs.length + ']');
    console.log('  Label 1: ' + pair[0].mpn + ' (' + pair[0].component_type + ')');
    console.log('  Label 2: ' + pair[1].mpn + ' (' + pair[1].component_type + ')');

    var png = await render2UpLabel(pair[0], pair[1]);
    console.log('  Image: ' + png.length + ' bytes PNG (294x294)');

    if (PREVIEW_ONLY) {
      var outFile = path.join(__dirname, 'preview-2up-' + (idx + 1) + '.png');
      fs.writeFileSync(outFile, png);
      console.log('  Saved: ' + outFile);
    } else {
      console.log('  Printing...');
      var printResult = await printImage(printerName, png);
      if (printResult.success) {
        console.log('  Printed successfully!');
      } else {
        console.log('  Print failed: ' + printResult.error);
      }
      // Short pause between sheets
      if (idx < pairs.length - 1) {
        await new Promise(function (r) { setTimeout(r, 2000); });
      }
    }
    console.log('');
  }

  await closeBrowser();
  console.log('Done.');
}

main().catch(function (err) {
  console.error('Error:', err.message);
  closeBrowser().then(function () { process.exit(1); });
});
