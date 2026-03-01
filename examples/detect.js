/**
 * Example: Detect DYMO LabelWriter printers
 *
 * Scans for DYMO printers registered with Windows via WMI.
 * No DYMO Connect or DYMO SDK required — just the basic printer driver.
 *
 * Usage: node detect.js
 */

var { detectDymo, LABEL_SPECS } = require('../driver');

async function main() {
  console.log('Scanning for DYMO printers...\n');

  var result = await detectDymo();

  if (!result.found) {
    console.log('No DYMO printers found.');
    if (result.error) {
      console.log('Error:', result.error);
    }
    console.log('\nMake sure:');
    console.log('  1. The printer is plugged in via USB');
    console.log('  2. The printer driver is installed (check Windows Settings > Printers)');
    console.log('  3. The printer is powered on');
    return;
  }

  console.log('Found ' + result.printers.length + ' DYMO printer(s):\n');

  result.printers.forEach(function (p, idx) {
    console.log('  Printer ' + (idx + 1) + ':');
    console.log('    Name:      ' + p.name);
    console.log('    Driver:    ' + p.driver);
    console.log('    Port:      ' + p.port);
    console.log('    Status:    ' + (p.connected ? 'Connected' : 'Offline'));
    console.log('');
  });

  console.log('Supported label types:');
  var keys = Object.keys(LABEL_SPECS);
  for (var i = 0; i < keys.length; i++) {
    var spec = LABEL_SPECS[keys[i]];
    console.log('  ' + keys[i] + ': ' + spec.description +
      (spec.twoUp ? ' [2-UP]' : ''));
  }
}

main().catch(function (err) {
  console.error('Error:', err.message);
  process.exit(1);
});
