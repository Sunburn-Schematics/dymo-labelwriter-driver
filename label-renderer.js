/**
 * DYMO Label Renderer for 30333 2-Up Labels
 *
 * Generates simple, clean component labels sized for DYMO 30333 labels
 * (0.98" x 0.49" each, two per sheet). Uses puppeteer to render HTML
 * to a 294x294 PNG at 300 DPI.
 *
 * The labels are simple text layouts optimized for the tiny DYMO labels:
 * - MPN (part number) in bold
 * - Value / key specs
 * - Package / footprint
 * - Component type code
 *
 * @example
 *   const { render2UpLabel, closeBrowser, SAMPLE_COMPONENTS } = require('./label-renderer');
 *   const png = await render2UpLabel(SAMPLE_COMPONENTS[0], SAMPLE_COMPONENTS[1]);
 *   // png is a 294x294 Buffer ready for printing on DYMO 30333
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var SHEET_W = 294;   // Full 30333 sheet width at 300 DPI
var SHEET_H = 294;   // Full 30333 sheet height (two labels stacked)
var LABEL_H = 147;   // Each label is half the sheet

// ---------------------------------------------------------------------------
// Simple Label HTML (optimized for tiny DYMO labels)
// ---------------------------------------------------------------------------

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderSimpleLabel(item, w, h) {
  var mpn = item.mpn || '';
  var mfr = item.manufacturer || '';
  var type = item.component_type || '';
  var pkg = item.package || '';
  var desc = item.description || '';
  var spn = item.sunburn_pn || '';

  // Build a short spec line from item data
  var specLine = '';
  if (item.specs) {
    var val = item.specs.Value || item.specs.Capacitance || item.specs.Resistance || item.specs.Inductance || '';
    var tol = item.specs.Tolerance || '';
    var volt = item.specs['Voltage Rating'] || item.specs.voltage_max || '';
    specLine = [val, tol, volt].filter(Boolean).join(' ');
  }
  if (!specLine && desc) {
    specLine = desc.length > 40 ? desc.substring(0, 40) + '...' : desc;
  }

  // Extract footprint size (0402, 0603, etc.)
  var fp = '';
  if (pkg) {
    var fpMatch = pkg.match(/\b(0\d{3}|1\d{3}|2\d{3})\b/);
    if (fpMatch) fp = fpMatch[1];
  }

  // Compact layout for tiny labels
  var pad = 6;
  var innerW = w - pad * 2;

  return '<div style="width:' + w + 'px;height:' + h + 'px;padding:' + pad + 'px;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;">' +
    // Top: MPN bold
    '<div style="font-size:14px;font-weight:900;color:#000;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHTML(mpn) + '</div>' +
    // Middle: manufacturer + specs
    '<div style="font-size:9px;color:#333;line-height:1.2;overflow:hidden;">' +
      (mfr ? '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHTML(mfr) + '</div>' : '') +
      (specLine ? '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHTML(specLine) + '</div>' : '') +
    '</div>' +
    // Bottom: type + footprint + SPN
    '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:4px;">' +
      '<div style="display:flex;gap:4px;align-items:center;">' +
        (type ? '<span style="font-size:10px;font-weight:800;color:#000;">' + escapeHTML(type) + '</span>' : '') +
        (fp ? '<span style="font-size:9px;font-weight:700;background:#333;color:#fff;padding:1px 4px;border-radius:3px;">' + fp + '</span>' : '') +
      '</div>' +
      (spn ? '<span style="font-size:10px;font-weight:800;color:#000;">' + escapeHTML(spn) + '</span>' : '') +
    '</div>' +
  '</div>';
}

// ---------------------------------------------------------------------------
// Puppeteer Rendering
// ---------------------------------------------------------------------------

var _browser = null;

/**
 * Render a 2-up DYMO 30333 label (two components, one sheet).
 *
 * @param {object} item1 - First component data (top label)
 * @param {object} item2 - Second component data (bottom label)
 * @param {object} [options] - { bgColor }
 * @returns {Promise<Buffer>} PNG buffer, 294x294 pixels at 300 DPI
 */
async function render2UpLabel(item1, item2, options) {
  options = options || {};
  var bgColor = options.bgColor || '#FFFFFF';

  var label1HTML = renderSimpleLabel(item1, SHEET_W, LABEL_H);
  var label2HTML = renderSimpleLabel(item2, SHEET_W, LABEL_H);

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:' + SHEET_W + 'px;height:' + SHEET_H + 'px;background:' + bgColor + ';overflow:hidden;}</style>' +
    '</head><body>' +
    '<div style="width:' + SHEET_W + 'px;height:' + LABEL_H + 'px;border-bottom:1px dashed #ccc;">' + label1HTML + '</div>' +
    '<div style="width:' + SHEET_W + 'px;height:' + LABEL_H + 'px;">' + label2HTML + '</div>' +
    '</body></html>';

  var puppeteer = require('puppeteer');
  if (!_browser) {
    _browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  }
  var page = await _browser.newPage();
  await page.setViewport({ width: SHEET_W, height: SHEET_H, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  var buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: SHEET_W, height: SHEET_H } });
  await page.close();
  return buf;
}

/**
 * Render a single DYMO 30333 label (one component, fills one label slot).
 *
 * @param {object} item - Component data
 * @param {object} [options] - { bgColor }
 * @returns {Promise<Buffer>} PNG buffer, 294x147 pixels
 */
async function renderSingleLabel(item, options) {
  options = options || {};
  var bgColor = options.bgColor || '#FFFFFF';

  var labelHTML = renderSimpleLabel(item, SHEET_W, LABEL_H);

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:' + SHEET_W + 'px;height:' + LABEL_H + 'px;background:' + bgColor + ';overflow:hidden;}</style>' +
    '</head><body>' + labelHTML + '</body></html>';

  var puppeteer = require('puppeteer');
  if (!_browser) {
    _browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  }
  var page = await _browser.newPage();
  await page.setViewport({ width: SHEET_W, height: LABEL_H, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  var buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: SHEET_W, height: LABEL_H } });
  await page.close();
  return buf;
}

/**
 * Close the shared puppeteer browser instance.
 */
async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

// ---------------------------------------------------------------------------
// Sample Component Data (for testing / examples)
// ---------------------------------------------------------------------------

var SAMPLE_COMPONENTS = [
  {
    mpn: 'CL05A104KA5NNNC',
    manufacturer: 'Samsung',
    sunburn_pn: '723',
    component_type: 'CAP',
    description: 'Cap 100nF 25V X5R 0402',
    package: '0402 (1005 Metric)',
    specs: { Value: '100nF', Tolerance: '\u00B110%', 'Voltage Rating': '25V' },
  },
  {
    mpn: 'RC0402FR-0710KL',
    manufacturer: 'Yageo',
    sunburn_pn: '707',
    component_type: 'RES',
    description: 'Res 10K 1% 1/16W 0402',
    package: '0402 (1005 Metric)',
    specs: { Value: '10k\u03A9', Tolerance: '\u00B11%', 'Voltage Rating': '50V' },
  },
  {
    mpn: 'LT8616EV#PBF',
    manufacturer: 'Analog Devices',
    sunburn_pn: '1218',
    component_type: 'PWR',
    description: 'IC REG BUCK ADJ 2.5A 20TSSOP',
    package: '20-TSSOP',
    specs: {},
  },
  {
    mpn: 'SMBJ100CA-13-F',
    manufacturer: 'Diodes Inc',
    sunburn_pn: '704',
    component_type: 'PROT',
    description: 'TVS DIODE 100VWM 162VC SMB',
    package: 'DO-214AA, SMB',
    specs: { 'Voltage Rating': '100V' },
  },
  {
    mpn: 'GS61008T',
    manufacturer: 'GaN Systems',
    sunburn_pn: '401',
    component_type: 'FET',
    description: 'MOSFET N-CH GaN 100V 90A',
    package: 'GaNPX-4',
    specs: {},
  },
  {
    mpn: '1N4148WT',
    manufacturer: 'ON Semi',
    sunburn_pn: '308',
    component_type: 'DIO',
    description: 'DIODE 75V 200mA SOD-523',
    package: 'SOD-523',
    specs: {},
  },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  render2UpLabel: render2UpLabel,
  renderSingleLabel: renderSingleLabel,
  closeBrowser: closeBrowser,
  SAMPLE_COMPONENTS: SAMPLE_COMPONENTS,
  SHEET_W: SHEET_W,
  SHEET_H: SHEET_H,
  LABEL_H: LABEL_H,
};
