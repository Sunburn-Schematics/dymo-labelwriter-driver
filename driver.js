/**
 * DYMO LabelWriter Printer Driver
 *
 * Print labels on DYMO LabelWriter printers from Node.js without installing
 * DYMO Connect or the DYMO SDK. Uses the built-in Windows print spooler.
 *
 * Tested with: DYMO LabelWriter 450
 * Compatible with: LabelWriter 450, 550, 4XL, 5XL, and other models that
 * register as standard Windows printers.
 *
 * @example
 *   const { detectDymo, printImage } = require('./driver');
 *   const result = await detectDymo();
 *   if (result.found) {
 *     await printImage(result.printers[0].name, fs.readFileSync('label.png'));
 *   }
 */

var { execFile } = require('child_process');
var fs = require('fs');
var path = require('path');
var os = require('os');

// ---------------------------------------------------------------------------
// Label Specifications
// ---------------------------------------------------------------------------

/**
 * Known DYMO label types with dimensions in inches.
 * Use these to size your images correctly (multiply by 300 for pixels at 300 DPI).
 */
var LABEL_SPECS = {
  '30333': {
    name: '30333 Multipurpose 2-Up',
    labelWidth: 0.98,
    labelHeight: 0.49,
    twoUp: true,
    pageWidth: 0.98,
    pageHeight: 0.98,
    printMargin: { top: 0.02, right: 0.075, bottom: 0.02, left: 0.075 },
    description: '1" x 1/2" multipurpose labels, 2 per sheet'
  },
  '30330': {
    name: '30330 Return Address',
    labelWidth: 0.75,
    labelHeight: 2.0,
    twoUp: false,
    pageWidth: 0.75,
    pageHeight: 2.0,
    printMargin: { top: 0.02, right: 0.06, bottom: 0.02, left: 0.06 },
    description: '3/4" x 2" return address labels'
  },
  '30332': {
    name: '30332 Multipurpose',
    labelWidth: 1.0,
    labelHeight: 2.125,
    twoUp: false,
    pageWidth: 1.0,
    pageHeight: 2.125,
    printMargin: { top: 0.02, right: 0.06, bottom: 0.02, left: 0.06 },
    description: '1" x 2-1/8" multipurpose labels'
  },
  '30252': {
    name: '30252 Address',
    labelWidth: 1.125,
    labelHeight: 3.5,
    twoUp: false,
    pageWidth: 1.125,
    pageHeight: 3.5,
    printMargin: { top: 0.02, right: 0.06, bottom: 0.02, left: 0.06 },
    description: '1-1/8" x 3-1/2" standard address labels'
  },
  '30256': {
    name: '30256 Shipping',
    labelWidth: 2.3125,
    labelHeight: 4.0,
    twoUp: false,
    pageWidth: 2.3125,
    pageHeight: 4.0,
    printMargin: { top: 0.04, right: 0.06, bottom: 0.04, left: 0.06 },
    description: '2-5/16" x 4" large shipping labels'
  }
};

// ---------------------------------------------------------------------------
// Printer Detection
// ---------------------------------------------------------------------------

/**
 * Detect DYMO printers installed on this machine via Windows WMI.
 *
 * Queries Win32_Printer for printers with "DYMO" or "LabelWriter" in the name.
 * Does NOT require DYMO Connect or any DYMO software — just the basic printer
 * driver (installed via Windows Update or from DYMO's website).
 *
 * @returns {Promise<{found: boolean, printers: Array, error?: string}>}
 *
 * @example
 *   const result = await detectDymo();
 *   if (result.found) {
 *     console.log('Printer:', result.printers[0].name);
 *     console.log('Connected:', result.printers[0].connected);
 *   }
 */
function detectDymo() {
  return new Promise(function (resolve) {
    if (os.platform() !== 'win32') {
      resolve({ found: false, printers: [], error: 'DYMO detection requires Windows (uses WMI)' });
      return;
    }

    var script =
      '$printers = Get-CimInstance Win32_Printer | Where-Object { $_.Name -match "DYMO|LabelWriter" }; ' +
      'if ($printers) { $printers | Select-Object Name, DriverName, PortName, PrinterStatus, WorkOffline | ConvertTo-Json -Compress } ' +
      'else { Write-Output "[]" }';

    execFile('powershell', ['-NoProfile', '-Command', script], { timeout: 10000 }, function (err, stdout) {
      if (err) {
        resolve({ found: false, printers: [], error: err.message });
        return;
      }
      try {
        var raw = stdout.trim();
        var data = JSON.parse(raw);
        // PowerShell returns a bare object for single result, array for multiple
        if (!Array.isArray(data)) data = [data];
        var printers = data.map(function (p) {
          return {
            name: p.Name || '',
            driver: p.DriverName || '',
            port: p.PortName || '',
            status: p.PrinterStatus || 0,
            offline: !!p.WorkOffline,
            connected: !p.WorkOffline && (p.PrinterStatus === 0 || p.PrinterStatus === 3)
          };
        });
        resolve({ found: printers.length > 0, printers: printers });
      } catch (e) {
        resolve({ found: false, printers: [], error: 'Parse error: ' + e.message });
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Printing
// ---------------------------------------------------------------------------

/**
 * Print an image to a DYMO printer via the Windows print spooler.
 *
 * The image is written to a temp file and printed using the Windows shell
 * "Print" verb. The printer's default paper size setting in Windows Printer
 * Preferences determines how the image is scaled.
 *
 * @param {string} printerName - Printer name as reported by detectDymo()
 * @param {Buffer} imageBuffer - PNG, BMP, or JPEG image data
 * @param {object} [options] - Reserved for future use
 * @returns {Promise<{success: boolean, error?: string}>}
 *
 * @example
 *   const image = fs.readFileSync('label.png');
 *   const result = await printImage('DYMO LabelWriter 450', image);
 *   if (!result.success) console.error(result.error);
 */
function printImage(printerName, imageBuffer, options) {
  options = options || {};
  return new Promise(function (resolve) {
    if (os.platform() !== 'win32') {
      resolve({ success: false, error: 'DYMO printing requires Windows (uses print spooler)' });
      return;
    }

    // Write image to temp file (Windows Print verb needs a file path)
    var tmpDir = os.tmpdir();
    var tmpFile = path.join(tmpDir, 'dymo_print_' + Date.now() + '.png');

    fs.writeFile(tmpFile, imageBuffer, function (err) {
      if (err) {
        resolve({ success: false, error: 'Failed to write temp file: ' + err.message });
        return;
      }

      // Use PowerShell Start-Process with the Print verb to send to specific printer
      var script = 'Start-Process -FilePath "' + tmpFile.replace(/\\/g, '\\\\') +
        '" -Verb Print -ArgumentList "/d:\\"' + printerName.replace(/"/g, '\\"') + '\\"" -Wait';

      execFile('powershell', ['-NoProfile', '-Command', script], { timeout: 30000 }, function (err2) {
        // Always clean up temp file
        try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }

        if (err2) {
          resolve({ success: false, error: 'Print failed: ' + err2.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  detectDymo: detectDymo,
  printImage: printImage,
  LABEL_SPECS: LABEL_SPECS
};
