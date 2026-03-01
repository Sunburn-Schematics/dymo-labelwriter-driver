/**
 * DYMO Label Renderer for 30333 2-Up Labels
 *
 * Generates component labels for DYMO 30333 labels (0.98" x 0.49" each,
 * two per sheet). Uses the same layout as the Sunburn Schematics web app —
 * component symbol, QR code, footprint badge, specs — scaled down for
 * the tiny DYMO labels. Renders HTML via puppeteer to a 294x294 PNG.
 *
 * @example
 *   const { render2UpLabel, closeBrowser, SAMPLE_COMPONENTS } = require('./label-renderer');
 *   const png = await render2UpLabel(SAMPLE_COMPONENTS[0], SAMPLE_COMPONENTS[1]);
 *   // png is a 294x294 Buffer ready for printing on DYMO 30333
 */

var QRCode = require('qrcode');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var SHEET_W = 294;   // Full 30333 sheet width at 300 DPI
var SHEET_H = 294;   // Full 30333 sheet height (two labels stacked)
var LABEL_H = 147;   // Each label is half the sheet

// ---------------------------------------------------------------------------
// Component Type Definitions (from partTypes.js)
// ---------------------------------------------------------------------------

var SUNBURN_TYPES = {
  RES: {
    code: 'RES', name: 'Resistor', color: '#EF4444',
    symbol: 'M 4 12 L 6 12 L 7 8 L 9 16 L 11 8 L 13 16 L 15 8 L 17 16 L 18 12 L 20 12',
    symbolType: 'path',
  },
  CAP: {
    code: 'CAP', name: 'Capacitor', color: '#EAB308',
    symbol: [
      { type: 'line', x1: 4, y1: 12, x2: 9, y2: 12 },
      { type: 'line', x1: 9, y1: 6, x2: 9, y2: 18 },
      { type: 'line', x1: 15, y1: 6, x2: 15, y2: 18 },
      { type: 'line', x1: 15, y1: 12, x2: 20, y2: 12 },
    ],
    symbolType: 'lines',
  },
  IND: {
    code: 'IND', name: 'Inductor', color: '#F97316',
    symbol: 'M 4 12 L 6 12 Q 8 4 10 12 Q 12 4 14 12 Q 16 4 18 12 L 20 12',
    symbolType: 'path',
  },
  DIO: {
    code: 'DIO', name: 'Diode', color: '#3B82F6',
    symbol: [
      { type: 'line', x1: 4, y1: 12, x2: 8, y2: 12 },
      { type: 'polygon', points: '8,6 8,18 16,12' },
      { type: 'line', x1: 16, y1: 6, x2: 16, y2: 18 },
      { type: 'line', x1: 16, y1: 12, x2: 20, y2: 12 },
    ],
    symbolType: 'complex',
  },
  FET: {
    code: 'FET', name: 'FET', color: '#06B6D4',
    symbol: [
      { type: 'line', x1: 4, y1: 12, x2: 10, y2: 12 },
      { type: 'line', x1: 10, y1: 5, x2: 10, y2: 19 },
      { type: 'line', x1: 13, y1: 7, x2: 20, y2: 7 },
      { type: 'line', x1: 13, y1: 17, x2: 20, y2: 17 },
    ],
    symbolType: 'complex',
  },
  BJT: {
    code: 'BJT', name: 'Transistor', color: '#6366F1',
    symbol: [
      { type: 'line', x1: 4, y1: 12, x2: 10, y2: 12 },
      { type: 'line', x1: 10, y1: 6, x2: 10, y2: 18 },
      { type: 'line', x1: 10, y1: 9, x2: 18, y2: 5 },
      { type: 'line', x1: 10, y1: 15, x2: 18, y2: 19 },
    ],
    symbolType: 'complex',
  },
  IC: {
    code: 'IC', name: 'IC', color: '#22C55E',
    symbol: [
      { type: 'rect', x: 7, y: 5, width: 10, height: 14, rx: 1 },
      { type: 'line', x1: 4, y1: 9, x2: 7, y2: 9 },
      { type: 'line', x1: 4, y1: 15, x2: 7, y2: 15 },
      { type: 'line', x1: 17, y1: 9, x2: 20, y2: 9 },
      { type: 'line', x1: 17, y1: 15, x2: 20, y2: 15 },
      { type: 'circle', cx: 10, cy: 8, r: 1 },
    ],
    symbolType: 'complex',
  },
  LED: {
    code: 'LED', name: 'LED', color: '#818CF8',
    symbol: [
      { type: 'line', x1: 4, y1: 12, x2: 8, y2: 12 },
      { type: 'polygon', points: '8,6 8,18 16,12' },
      { type: 'line', x1: 16, y1: 6, x2: 16, y2: 18 },
      { type: 'line', x1: 16, y1: 12, x2: 20, y2: 12 },
      { type: 'line', x1: 14, y1: 4, x2: 18, y2: 2 },
      { type: 'line', x1: 16, y1: 6, x2: 20, y2: 4 },
    ],
    symbolType: 'complex',
  },
  CONN: {
    code: 'CONN', name: 'Connector', color: '#6B7280',
    symbol: [
      { type: 'rect', x: 8, y: 4, width: 8, height: 16, rx: 1, fill: 'none' },
      { type: 'line', x1: 4, y1: 8, x2: 8, y2: 8 },
      { type: 'line', x1: 4, y1: 12, x2: 8, y2: 12 },
      { type: 'line', x1: 4, y1: 16, x2: 8, y2: 16 },
      { type: 'circle', cx: 12, cy: 8, r: 1.5 },
      { type: 'circle', cx: 12, cy: 12, r: 1.5 },
      { type: 'circle', cx: 12, cy: 16, r: 1.5 },
    ],
    symbolType: 'complex',
  },
  PROT: {
    code: 'PROT', name: 'Protection', color: '#38BDF8',
    symbol: [
      { type: 'line', x1: 3, y1: 12, x2: 8, y2: 12 },
      { type: 'polygon', points: '8,7 8,17 13,12' },
      { type: 'line', x1: 13, y1: 7, x2: 13, y2: 17 },
      { type: 'line', x1: 13, y1: 7, x2: 11, y2: 9 },
      { type: 'line', x1: 13, y1: 17, x2: 15, y2: 15 },
      { type: 'line', x1: 13, y1: 12, x2: 21, y2: 12 },
    ],
    symbolType: 'complex',
  },
  XTAL: {
    code: 'XTAL', name: 'Crystal/Oscillator', color: '#A78BFA',
    symbol: [
      { type: 'line', x1: 4, y1: 12, x2: 8, y2: 12 },
      { type: 'line', x1: 8, y1: 7, x2: 8, y2: 17 },
      { type: 'rect', x: 9, y: 8, width: 6, height: 8, rx: 0 },
      { type: 'line', x1: 16, y1: 7, x2: 16, y2: 17 },
      { type: 'line', x1: 16, y1: 12, x2: 20, y2: 12 },
    ],
    symbolType: 'complex',
  },
  PWR: {
    code: 'PWR', name: 'Power Supply', color: '#10B981',
    symbol: [{ type: 'polygon', points: '10,3 7,13 11,13 8,21 16,10 12,10 15,3' }],
    symbolType: 'complex',
  },
  XFMR: {
    code: 'XFMR', name: 'Transformer', color: '#FB923C',
    symbol: [
      { type: 'line', x1: 2, y1: 6, x2: 6, y2: 6 },
      { type: 'line', x1: 2, y1: 18, x2: 6, y2: 18 },
      { type: 'line', x1: 18, y1: 6, x2: 22, y2: 6 },
      { type: 'line', x1: 18, y1: 18, x2: 22, y2: 18 },
      { type: 'line', x1: 11, y1: 3, x2: 11, y2: 21 },
      { type: 'line', x1: 13, y1: 3, x2: 13, y2: 21 },
    ],
    symbolType: 'complex',
    extraPaths: [
      'M 6,6 Q 9,6 9,8 Q 9,10 6,10 Q 9,10 9,12 Q 9,14 6,14 Q 9,14 9,16 Q 9,18 6,18',
      'M 18,6 Q 15,6 15,8 Q 15,10 18,10 Q 15,10 15,12 Q 15,14 18,14 Q 15,14 15,16 Q 15,18 18,18',
    ],
  },
  RELAY: {
    code: 'RELAY', name: 'Relay/Switch', color: '#78716C',
    symbol: [
      { type: 'rect', x: 6, y: 4, width: 12, height: 16, rx: 1, fill: 'none' },
      { type: 'line', x1: 9, y1: 16, x2: 15, y2: 8 },
      { type: 'circle', cx: 9, cy: 16, r: 1.5 },
      { type: 'circle', cx: 15, cy: 8, r: 1.5 },
    ],
    symbolType: 'complex',
  },
  OTHER: {
    code: 'OTHER', name: 'Other', color: '#9CA3AF',
    symbol: [
      { type: 'circle', cx: 12, cy: 12, r: 7, fill: 'none' },
      { type: 'text', x: 12, y: 16, text: '?' },
    ],
    symbolType: 'complex',
  },
};

// ---------------------------------------------------------------------------
// Font & Layout Constants
// ---------------------------------------------------------------------------

var FONT = "'Roboto Condensed', 'Arial Narrow', Arial, sans-serif";
var MONO = "'Roboto Mono', 'Consolas', monospace";
var COND_R = 0.55;
var COND_BOLD_R = 0.58;

function fitFont(len, availPx, ratio, maxSize, minSize, lines) {
  minSize = minSize || 4;
  lines = lines || 1;
  if (!len || len <= 0) return maxSize;
  var perLine = Math.ceil(len / lines);
  var sz = availPx / (perLine * ratio);
  return Math.max(minSize, Math.min(maxSize, Math.round(sz * 2) / 2));
}

// ---------------------------------------------------------------------------
// Footprint Colors
// ---------------------------------------------------------------------------

var FOOTPRINT_SIZES = ['0201', '0402', '0603', '0805', '1206', '1210', '1812', '2010', '2512'];
var FOOTPRINT_COLORS = {
  _smaller: { bg: '#E91E8C', text: '#fff' },
  '0201':   { bg: '#9C27B0', text: '#fff' },
  '0402':   { bg: '#3F51B5', text: '#fff' },
  '0603':   { bg: '#2196F3', text: '#fff' },
  '0805':   { bg: '#009688', text: '#fff' },
  '1206':   { bg: '#4CAF50', text: '#fff' },
  '1210':   { bg: '#FF9800', text: '#fff' },
  '1812':   { bg: '#FF5722', text: '#fff' },
  '2010':   { bg: '#E53935', text: '#fff' },
  '2512':   { bg: '#D32F2F', text: '#fff' },
  _larger:  { bg: '#795548', text: '#fff' },
};

function extractImperialFootprint(pkgStr, specs) {
  if (!pkgStr) return null;
  if (/wide/i.test(pkgStr)) {
    var supPkg = (specs && specs['Supplier Device Package']) || '';
    var wideMatch = supPkg.match(/\b(0\d{3})\b/) || pkgStr.match(/,\s*(0\d{3})\b/);
    if (wideMatch) return wideMatch[1];
  }
  var m = pkgStr.match(/\b(0\d{3}|1\d{3}|2\d{3})\b/);
  return m ? m[1] : null;
}

function getFootprintColor(fp) {
  if (!fp) return null;
  if (FOOTPRINT_COLORS[fp]) return FOOTPRINT_COLORS[fp];
  var num = parseInt(fp, 10);
  if (num < 201) return FOOTPRINT_COLORS._smaller;
  if (num > 2512) return FOOTPRINT_COLORS._larger;
  for (var i = 0; i < FOOTPRINT_SIZES.length - 1; i++) {
    var lo = parseInt(FOOTPRINT_SIZES[i], 10);
    var hi = parseInt(FOOTPRINT_SIZES[i + 1], 10);
    if (num >= lo && num < hi) return FOOTPRINT_COLORS[FOOTPRINT_SIZES[i]];
  }
  return FOOTPRINT_COLORS._larger;
}

// ---------------------------------------------------------------------------
// SVG Symbol Rendering
// ---------------------------------------------------------------------------

function symbolToSVG(typeInfo, size, color) {
  var c = color || typeInfo.color;
  var sw = 1.5;
  var inner = '';
  if (typeInfo.symbolType === 'path') {
    inner = '<path d="' + typeInfo.symbol + '" fill="none" stroke="' + c + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>';
  } else if (typeInfo.symbolType === 'lines') {
    inner = typeInfo.symbol.map(function (s) {
      return '<line x1="' + s.x1 + '" y1="' + s.y1 + '" x2="' + s.x2 + '" y2="' + s.y2 + '" stroke="' + c + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
    }).join('');
  } else if (typeInfo.symbolType === 'complex') {
    inner = typeInfo.symbol.map(function (s) {
      if (s.type === 'line') return '<line x1="' + s.x1 + '" y1="' + s.y1 + '" x2="' + s.x2 + '" y2="' + s.y2 + '" stroke="' + c + '" stroke-width="' + sw + '" stroke-linecap="round"' + (s.strokeDasharray ? ' stroke-dasharray="' + s.strokeDasharray + '"' : '') + '/>';
      if (s.type === 'rect') return '<rect x="' + s.x + '" y="' + s.y + '" width="' + s.width + '" height="' + s.height + '" rx="' + (s.rx || 0) + '" fill="' + (s.fill || 'none') + '" stroke="' + c + '" stroke-width="' + sw + '"/>';
      if (s.type === 'circle') return '<circle cx="' + s.cx + '" cy="' + s.cy + '" r="' + s.r + '" fill="' + (s.fill || 'none') + '" stroke="' + c + '" stroke-width="' + sw + '"/>';
      if (s.type === 'polygon') return '<polygon points="' + s.points + '" fill="' + c + '" stroke="' + c + '" stroke-width="0.5"/>';
      if (s.type === 'text') return '<text x="' + s.x + '" y="' + s.y + '" text-anchor="middle" fill="' + c + '" font-size="10" font-weight="bold">' + s.text + '</text>';
      return '';
    }).join('');
  }
  if (typeInfo.extraPaths) {
    typeInfo.extraPaths.forEach(function (p) {
      inner += '<path d="' + p + '" fill="none" stroke="' + c + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>';
    });
  }
  var rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + size + '" height="' + size + '">' + inner + '</svg>';
  var encoded = rawSvg.replace(/"/g, "'").replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E');
  return '<img src="data:image/svg+xml,' + encoded + '" width="' + size + '" height="' + size + '" style="display:block;" />';
}

// ---------------------------------------------------------------------------
// QR Code Generation
// ---------------------------------------------------------------------------

function generateQRSVG(text, size) {
  if (!text) return '';
  try {
    var qr = QRCode.create(text, { errorCorrectionLevel: 'L' });
    var modules = qr.modules;
    var moduleCount = modules.size;
    var cellSize = size / moduleCount;
    var paths = '';
    for (var row = 0; row < moduleCount; row++) {
      for (var col = 0; col < moduleCount; col++) {
        if (modules.get(row, col)) {
          var x = Math.round(col * cellSize * 100) / 100;
          var y = Math.round(row * cellSize * 100) / 100;
          var w = Math.round(cellSize * 100) / 100;
          paths += 'M' + x + ',' + y + 'h' + w + 'v' + w + 'h' + (-w) + 'z';
        }
      }
    }
    var rawSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '">' + (paths ? '<path d="' + paths + '" fill="#000"/>' : '') + '</svg>';
    var encoded = rawSvg.replace(/"/g, "'").replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E');
    return '<img src="data:image/svg+xml,' + encoded + '" width="' + size + '" height="' + size + '" style="display:block;margin:0 auto;" />';
  } catch (e) {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Text Helpers
// ---------------------------------------------------------------------------

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function ohmSymbol(str) {
  if (!str) return '';
  return str.replace(/\bohms?\b/gi, '\u03A9');
}

function fmtNum(n) {
  return n.toFixed(1).replace(/\.0$/, '');
}

function stylizeCapValue(str) {
  if (!str) return '';
  var m = str.match(/^(\d+(?:\.\d+)?)\s*(pF|nF|µF|uF|UF|NF|PF|mF|MF|F)\s*$/i);
  if (!m) return str.replace(/uF/g, '\u00B5F').replace(/UF/g, '\u00B5F');
  var val = parseFloat(m[1]);
  var unit = m[2].toLowerCase().replace('uf', '\u00B5f');
  var multipliers = { 'pf': 1, 'nf': 1e3, '\u00B5f': 1e6, 'mf': 1e9, 'f': 1e12 };
  var pf = val * (multipliers[unit] || 1);
  if (pf >= 1e6) return fmtNum(pf / 1e6) + '\u00B5F';
  if (pf >= 1e3) return fmtNum(pf / 1e3) + 'nF';
  return fmtNum(pf) + 'pF';
}

function stylizePower(str) {
  if (!str || str === '-') return str;
  var watts = null;
  var fracMatch = str.match(/(\d+)\s*\/\s*(\d+)\s*W/i);
  if (fracMatch) watts = parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  if (watts === null) {
    var decMatch = str.match(/(\d+(?:\.\d+)?)\s*W\b/i);
    if (decMatch) watts = parseFloat(decMatch[1]);
  }
  if (watts === null) {
    var mwMatch = str.match(/(\d+(?:\.\d+)?)\s*mW/i);
    if (mwMatch) watts = parseFloat(mwMatch[1]) / 1000;
  }
  if (watts === null) return str;
  if (watts >= 1) return fmtNum(watts) + 'W';
  var mw = watts * 1000;
  if (mw >= 1) return fmtNum(mw) + 'mW';
  return fmtNum(watts * 1e6) + '\u00B5W';
}

function isValidSpecVal(v) {
  return v && typeof v === 'string' && v !== '-' && v !== 'N/A' && v.trim() !== '';
}

function getSpec(specs) {
  if (!specs) return '';
  var keys = Array.prototype.slice.call(arguments, 1);
  for (var i = 0; i < keys.length; i++) {
    if (isValidSpecVal(specs[keys[i]])) return specs[keys[i]];
  }
  var entries = Object.entries(specs);
  for (var j = 0; j < keys.length; j++) {
    var kLower = keys[j].toLowerCase();
    for (var e = 0; e < entries.length; e++) {
      var lk = entries[e][0].toLowerCase();
      if ((lk === kLower || lk.includes(kLower)) && isValidSpecVal(entries[e][1])) return entries[e][1];
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// Description Builder
// ---------------------------------------------------------------------------

function buildDescAndDetails(item) {
  var specs = item.specs || {};
  var type = item.component_type || 'OTHER';
  var descRaw = item.description || '';
  var pkgRaw = item.package || getSpec(specs, 'Case/Package', 'Package / Case') || '';

  if (type === 'CAP') {
    var capVal = stylizeCapValue(getSpec(specs, 'Value', 'Capacitance') || '');
    var capTol = getSpec(specs, 'Tolerance') || '';
    var capVolt = getSpec(specs, 'voltage_max', 'Voltage Rating', 'Voltage - Rated', 'Voltage', 'Voltage Rating (DC)', 'Voltage Rating(DC)') || '';
    var capDiel = getSpec(specs, 'thermal_coefficient', 'Temperature Coefficient', 'Dielectric', 'Dielectric Material') || '';
    var capDesc = [capVal, capTol, capVolt, capDiel].filter(Boolean).join(' \u00B7 ') || descRaw;
    var capFp = extractImperialFootprint(pkgRaw, specs);
    return { desc: capDesc, details: pkgRaw, footprint: capFp };
  }
  if (type === 'RES') {
    var resVal = getSpec(specs, 'Value', 'Resistance') || '';
    var resTol = getSpec(specs, 'Tolerance') || '';
    var resPwrRaw = getSpec(specs, 'power', 'Power Rating', 'Power (Watts)', 'Power') || '';
    var resPwr = stylizePower(resPwrRaw);
    var resFp = extractImperialFootprint(pkgRaw, specs);
    var resVolt = getSpec(specs, 'voltage_max', 'Voltage Rating', 'Voltage - Rated', 'Voltage', 'Voltage Rating (DC)', 'Working Voltage') || '';
    var resDesc = ohmSymbol([resVal, resTol, resPwr, resVolt].filter(Boolean).join(' \u00B7 ') || descRaw);
    return { desc: resDesc, details: pkgRaw, footprint: resFp };
  }
  if (type === 'IND') {
    var indVal = getSpec(specs, 'Value', 'Inductance') || '';
    var indTol = getSpec(specs, 'Tolerance') || '';
    var indCur = getSpec(specs, 'Current Rating', 'Current - Saturation', 'Current Rating (Amps)') || '';
    var indDesc = [indVal, indTol, indCur].filter(Boolean).join(' \u00B7 ') || descRaw;
    return { desc: indDesc, details: pkgRaw, footprint: null };
  }
  var cleanDesc = descRaw;
  if (pkgRaw && descRaw.toLowerCase().includes(pkgRaw.toLowerCase())) {
    cleanDesc = descRaw.replace(new RegExp('\\s*' + pkgRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'gi'), ' ').trim();
  }
  return { desc: ohmSymbol(cleanDesc), details: pkgRaw, footprint: null };
}

// ---------------------------------------------------------------------------
// Label HTML Renderer (Sunburn layout scaled for tiny DYMO labels)
// ---------------------------------------------------------------------------

function renderUniformLabel(item, typeInfo, safeW, safeH) {
  var mpnRaw = item.mpn || '';
  var spnRaw = item.sunburn_pn || '';
  var mfrRaw = item.manufacturer || '';
  var parsed = buildDescAndDetails(item);
  var descText = parsed.desc;
  var detailsText = parsed.details;
  var footprint = parsed.footprint;
  var fpColor = footprint ? getFootprintColor(footprint) : null;

  var mpn = escapeHTML(mpnRaw);
  var spn = escapeHTML(spnRaw);
  var mfr = escapeHTML(mfrRaw);
  var code = typeInfo ? typeInfo.code : '';
  var codeColor = (typeInfo && typeInfo.color) || '#666';

  var padX = 2, padY = 2;
  var innerW = safeW - (padX * 2);
  var innerH = safeH - (padY * 2);

  var rightColW = Math.round(innerW * 0.35);
  var leftColW = innerW - rightColW - 2;

  var iconSz = Math.min(14, Math.max(8, Math.round(rightColW * 0.45)));
  var svg = typeInfo ? symbolToSVG(typeInfo, iconSz, '#333') : '';

  var mpnRowH = Math.round(innerH * 0.22);
  var mfrRowH = mfr ? Math.round(innerH * 0.14) : 0;
  var descH = Math.round(innerH * 0.34);

  var qrSize = Math.min(Math.round(innerH * 0.38), rightColW - 4);
  var qrSvg = generateQRSVG(spnRaw, qrSize);

  var mpnSize = fitFont(mpnRaw.length, leftColW, COND_BOLD_R, 10, 4);
  var mfrSize = fitFont(mfrRaw.length, leftColW, 0.48, 7, 3.5);

  var descMinFont = 4;
  var descLineH = 1.3;
  var descSize = 6.5;
  if (descText.length > 0) {
    for (var sz = 6.5; sz >= descMinFont; sz -= 0.5) {
      var lineH = sz * descLineH;
      var maxLines = Math.max(1, Math.floor((descH - 2) / lineH));
      var charsPerLine = Math.floor(leftColW / (sz * COND_R));
      var totalChars = charsPerLine * maxLines;
      if (totalChars >= descText.length) { descSize = sz; break; }
      descSize = sz;
    }
  }
  var spnSize = fitFont(spnRaw.length, rightColW, COND_BOLD_R, 8, 5);
  var codeSize = Math.max(6, Math.round(iconSz * 0.45));

  return '<div style="position:absolute;inset:0;padding:' + padY + 'px ' + padX + 'px;display:flex;box-sizing:border-box;">' +
    '<div style="width:' + leftColW + 'px;min-width:0;display:flex;flex-direction:column;">' +
      '<div style="height:' + mpnRowH + 'px;display:flex;align-items:center;box-sizing:border-box;max-width:' + leftColW + 'px;">' +
        '<div style="font-family:' + FONT + ';font-size:' + mpnSize + 'px;font-weight:700;color:#000;line-height:1.15;white-space:nowrap;max-width:100%;">' + (mpn || '\u2014') + '</div>' +
      '</div>' +
      (mfr ? '<div style="height:' + mfrRowH + 'px;display:flex;align-items:center;box-sizing:border-box;overflow:hidden;max-width:' + leftColW + 'px;">' +
        '<div style="font-family:' + FONT + ';font-size:' + mfrSize + 'px;font-weight:500;color:#000;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:' + leftColW + 'px;">' + mfr + '</div>' +
      '</div>' : '') +
      '<div style="height:1px;background:#888;flex-shrink:0;"></div>' +
      '<div style="height:' + descH + 'px;max-height:' + descH + 'px;overflow:hidden;padding-top:1px;box-sizing:border-box;flex-shrink:0;">' +
        '<div style="width:' + leftColW + 'px;max-height:' + (descH - 1) + 'px;font-family:' + FONT + ';font-size:' + descSize + 'px;font-weight:400;color:#000;line-height:' + descLineH + ';word-wrap:break-word;overflow-wrap:break-word;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' + Math.max(1, Math.floor((descH - 1) / (descSize * descLineH))) + ';">' + (escapeHTML(descText) || '\u2014') + '</div>' +
      '</div>' +
      '<div style="height:1px;background:#888;flex-shrink:0;"></div>' +
      '<div style="flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;">' +
        (fpColor && footprint ?
          '<div style="display:inline-flex;align-items:center;justify-content:center;background:#333;color:#fff;font-family:' + MONO + ';font-size:' + Math.min(8, Math.max(5, Math.round(leftColW * 0.12))) + 'px;font-weight:700;letter-spacing:0.5px;padding:1px ' + Math.round(leftColW * 0.08) + 'px;border-radius:99px;line-height:1.2;white-space:nowrap;">' + footprint + '</div>'
          : detailsText ?
          '<div style="width:' + leftColW + 'px;font-family:' + FONT + ';font-size:' + fitFont(detailsText.length || 1, leftColW, COND_R, 6, 4) + 'px;font-weight:500;color:#000;line-height:1.2;word-wrap:break-word;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHTML(detailsText) + '</div>'
          : '') +
      '</div>' +
    '</div>' +
    '<div style="width:' + rightColW + 'px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding-left:2px;padding-bottom:3px;">' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:0;">' +
        svg +
        '<div style="font-family:' + FONT + ';font-size:' + codeSize + 'px;font-weight:700;color:#000;line-height:1;letter-spacing:0.5px;margin-top:1px;">' + code + '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">' +
        '<div style="font-family:' + FONT + ';font-size:' + spnSize + 'px;font-weight:800;color:#000;line-height:1;white-space:nowrap;">' + spn + '</div>' +
        (qrSvg ? '<div style="display:flex;justify-content:center;">' + qrSvg + '</div>' : '') +
      '</div>' +
    '</div>' +
  '</div>';
}

// ---------------------------------------------------------------------------
// Puppeteer Rendering
// ---------------------------------------------------------------------------

var _browser = null;

/**
 * Render a single DYMO 30333 label to HTML, ready for puppeteer.
 * Uses the same DPI scaling approach as the Sunburn website:
 * content is laid out at 96 DPI then CSS-scaled to 300 DPI.
 */
function renderLabelHTML(item, pxW, pxH) {
  var typeCode = item.component_type || 'OTHER';
  if (typeCode === 'OPTO' || typeCode === 'FILT' || typeCode === 'SENS') typeCode = 'IC';
  if (typeCode === 'MOSFET' || typeCode === 'GAN') typeCode = 'FET';
  var typeInfo = SUNBURN_TYPES[typeCode] || SUNBURN_TYPES.OTHER;

  var DPI = 300;
  var PREVIEW_DPI = 96;
  var printScale = DPI / PREVIEW_DPI;
  var pm = { top: 0.02, right: 0.075, bottom: 0.04, left: 0.075 };

  var widthInches = pxW / DPI;
  var heightInches = pxH / DPI;
  var safeW = Math.round((widthInches - pm.left - pm.right) * PREVIEW_DPI);
  var safeH = Math.round((heightInches - pm.top - pm.bottom) * PREVIEW_DPI);

  var labelHTML = renderUniformLabel(item, typeInfo, safeW, safeH);

  return '<div style="width:' + pxW + 'px;height:' + pxH + 'px;position:relative;overflow:hidden;">' +
    '<div style="position:absolute;top:' + (pm.top * DPI) + 'px;left:' + (pm.left * DPI) + 'px;">' +
      '<div style="width:' + safeW + 'px;height:' + safeH + 'px;transform:scale(' + printScale.toFixed(4) + ');transform-origin:top left;position:relative;">' +
        labelHTML +
      '</div>' +
    '</div>' +
  '</div>';
}

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

  var label1HTML = renderLabelHTML(item1, SHEET_W, LABEL_H);
  var label2HTML = renderLabelHTML(item2, SHEET_W, LABEL_H);

  // Render labels normally in landscape
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;500;700;800&family=Roboto+Mono:wght@700&display=swap" rel="stylesheet">' +
    '<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:' + SHEET_W + 'px;height:' + SHEET_H + 'px;background:' + bgColor + ';overflow:hidden;}</style>' +
    '</head><body>' +
    '<div style="width:' + SHEET_W + 'px;height:' + LABEL_H + 'px;">' + label1HTML + '</div>' +
    '<div style="width:' + SHEET_W + 'px;height:' + LABEL_H + 'px;">' + label2HTML + '</div>' +
    '</body></html>';

  var puppeteer = require('puppeteer');
  if (!_browser) {
    _browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  }
  var page = await _browser.newPage();
  await page.setViewport({ width: SHEET_W, height: SHEET_H, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  var buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: SHEET_W, height: SHEET_H } });
  await page.close();

  // Rotate the final image 90° CW so text reads correctly when the label exits
  // the printer. Since the sheet is square (294x294), dimensions are preserved.
  var rotPage = await _browser.newPage();
  await rotPage.setViewport({ width: SHEET_W, height: SHEET_H, deviceScaleFactor: 1 });
  var b64 = buf.toString('base64');
  await rotPage.setContent('<!DOCTYPE html><html><body style="margin:0;padding:0;">' +
    '<canvas id="c" width="' + SHEET_W + '" height="' + SHEET_H + '"></canvas>' +
    '<script>' +
    'var c=document.getElementById("c");var ctx=c.getContext("2d");' +
    'var img=new Image();img.onload=function(){' +
    'ctx.translate(' + (SHEET_W/2) + ',' + (SHEET_H/2) + ');' +
    'ctx.rotate(Math.PI/2);' +
    'ctx.drawImage(img,-' + (SHEET_W/2) + ',-' + (SHEET_H/2) + ');' +
    'document.title="done";};' +
    'img.src="data:image/png;base64,' + b64 + '";' +
    '</script></body></html>', { waitUntil: 'load' });
  await rotPage.waitForFunction('document.title==="done"');
  var rotBuf = await rotPage.screenshot({ type: 'png', clip: { x: 0, y: 0, width: SHEET_W, height: SHEET_H } });
  await rotPage.close();
  return rotBuf;
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

  var labelHTML = renderLabelHTML(item, SHEET_W, LABEL_H);

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;500;700;800&family=Roboto+Mono:wght@700&display=swap" rel="stylesheet">' +
    '<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:' + SHEET_W + 'px;height:' + LABEL_H + 'px;background:' + bgColor + ';overflow:hidden;}</style>' +
    '</head><body>' + labelHTML + '</body></html>';

  var puppeteer = require('puppeteer');
  if (!_browser) {
    _browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  }
  var page = await _browser.newPage();
  await page.setViewport({ width: SHEET_W, height: LABEL_H, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
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
  SUNBURN_TYPES: SUNBURN_TYPES,
  SHEET_W: SHEET_W,
  SHEET_H: SHEET_H,
  LABEL_H: LABEL_H,
};
