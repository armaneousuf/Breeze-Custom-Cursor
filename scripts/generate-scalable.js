#!/usr/bin/env node
/**
 * generate-scalable.js
 *
 * Builds Plasma-native SVG cursors ("cursors_scalable") as a parallel
 * output alongside your existing XCursor bitmap pipeline. Nothing in
 * render.json / configs/*.toml / build.sh needs to change — this reads
 * the same source of truth and writes a new tree next to your existing
 * XCursor output.
 *
 * Reads:
 *   svg/*.svg                 - your source vector cursors
 *   render.json                - per-theme color-swap definitions
 *   configs/x.build.toml        - hotspots, x11 names, symlink aliases
 *
 * Writes:
 *   themes/<ThemeName>/cursors_scalable/<name>/metadata.json
 *   themes/<ThemeName>/cursors_scalable/<name>/<filename>.svg
 *   (+ symlinked alias directories for x11_symlinks entries)
 *
 * Usage:
 *   node bin/generate-scalable.js
 *
 * Place this file in your repo's bin/ directory (paths below assume
 * that — adjust ROOT if you put it elsewhere).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..'); // bin/.. => repo root
const SVG_DIR = path.join(ROOT, 'svg');
const RENDER_JSON = path.join(ROOT, 'render.json');
const X_TOML = path.join(ROOT, 'configs', 'x.build.toml');
const THEMES_DIR = path.join(ROOT, 'themes');

// Fallback only used if a canvas size genuinely can't be detected at all
// (neither the master PNG nor the SVG itself yields usable dimensions).
const FALLBACK_NOMINAL_SIZE = 24;

// The ground truth for nominal_size is NOT the SVG's own viewBox --
// it's whatever pixel dimensions the master PNG (the flat file ctgen
// actually loads, e.g. bitmaps/Breeze-Dark-Custom/left_ptr.png) has. clickgen's
// source (parser/png.py) validates and scales hotspot_x/hotspot_y
// against that file's real pixel size, which can differ from the SVG's
// authored viewBox (confirmed: left_ptr.svg has viewBox 16x16, but its
// rendered master PNG is 257x257 -- cbmp doesn't render 1:1 from viewBox).
function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`Not a valid PNG (missing IHDR): ${filePath}`);
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function getCanvasSize(svgText, contextLabel) {
  const viewBoxMatch = svgText.match(/viewBox\s*=\s*"([^"]+)"/);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
      const w = parts[2];
      const h = parts[3];
      if (Math.abs(w - h) > 1) {
        console.warn(`  [warn] ${contextLabel}: non-square viewBox (${w}x${h}), using average`);
      }
      return Math.round((w + h) / 2);
    }
  }
  const widthMatch = svgText.match(/<svg[^>]*\bwidth\s*=\s*"([\d.]+)/);
  const heightMatch = svgText.match(/<svg[^>]*\bheight\s*=\s*"([\d.]+)/);
  if (widthMatch && heightMatch) {
    return Math.round((parseFloat(widthMatch[1]) + parseFloat(heightMatch[1])) / 2);
  }
  console.warn(`  [warn] ${contextLabel}: no viewBox or width/height found, falling back to ${FALLBACK_NOMINAL_SIZE}`);
  return FALLBACK_NOMINAL_SIZE;
}

// Prefer the master PNG's real dimensions (matches what ctgen/clickgen
// actually validates hotspots against). Fall back to the SVG's own
// viewBox only if the bitmap doesn't exist yet (e.g. `yarn render`
// hasn't been run), with a loud warning since that fallback may be
// wrong the way left_ptr's case was.
function getNominalSize(bitmapsDir, pngFilename, svgText, contextLabel) {
  if (pngFilename) {
    const pngPath = path.join(bitmapsDir, pngFilename);
    if (fs.existsSync(pngPath)) {
      try {
        const { width, height } = getPngDimensions(pngPath);
        if (Math.abs(width - height) > 1) {
          console.warn(`  [warn] ${contextLabel}: non-square master PNG (${width}x${height}), using average`);
        }
        return Math.round((width + height) / 2);
      } catch (e) {
        console.warn(`  [warn] ${contextLabel}: couldn't read master PNG (${e.message}), falling back to SVG viewBox`);
      }
    } else {
      console.warn(`  [warn] ${contextLabel}: master PNG not found at ${pngPath}, falling back to SVG viewBox (may be inaccurate)`);
    }
  }
  return getCanvasSize(svgText, contextLabel);
}

// If your animations look too fast/slow after testing, adjust this.
// x11_delay in the toml may not be in the same units KDE expects here
// (KDE wants milliseconds per frame) — verify visually and tweak.
const DEFAULT_DELAY_MS = 30;

// ---------------------------------------------------------------------
// Minimal TOML parser — NOT a full spec implementation. It only handles
// what these specific config files use: [section] / [section.sub]
// headers, quoted strings, bare numbers, and single/multi-line arrays
// of strings or numbers. If you restructure the toml files with
// features beyond that (inline tables, nested arrays, etc.) this will
// need extending.
// ---------------------------------------------------------------------

function parseValueLiteral(raw) {
  raw = raw.trim();
  if (raw.startsWith('[') && raw.endsWith(']')) return parseArrayLiteral(raw);
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    return raw.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

function parseArrayLiteral(raw) {
  const inner = raw.trim().replace(/^\[/, '').replace(/\]\s*$/, '');
  const items = [];
  let buf = '';
  let inQuote = false;
  let wasQuoted = false;

  const pushItem = () => {
    const t = buf.trim();
    if (t || wasQuoted) {
      // Quoted items (e.g. alias names like "00008160...") must stay
      // strings verbatim -- never run them through numeric coercion,
      // even if every character happens to be a digit.
      items.push(wasQuoted ? t : parseValueLiteral(t));
    }
    buf = '';
    wasQuoted = false;
  };

  for (const ch of inner) {
    if (ch === '"') {
      inQuote = !inQuote;
      wasQuoted = true;
      continue;
    }
    if (ch === ',' && !inQuote) {
      pushItem();
      continue;
    }
    buf += ch;
  }
  pushItem();
  return items;
}

function parseSimpleToml(text) {
  const lines = text.split(/\r?\n/);
  const root = {};
  let current = root;
  let arrayMode = false;
  let arrayKey = null;
  let arrayRaw = '';

  for (const rawLine of lines) {
    if (arrayMode) {
      arrayRaw += rawLine + '\n';
      if (rawLine.includes(']')) {
        current[arrayKey] = parseArrayLiteral(arrayRaw);
        arrayMode = false;
        arrayKey = null;
        arrayRaw = '';
      }
      continue;
    }

    let line = rawLine;
    const commentIdx = line.indexOf('#');
    if (commentIdx !== -1) line = line.slice(0, commentIdx);
    const trimmed = line.trim();
    if (!trimmed) continue;

    const sectionMatch = trimmed.match(/^\[([\w.\-]+)\]$/);
    if (sectionMatch) {
      const segments = sectionMatch[1].split('.');
      current = root;
      for (const seg of segments) {
        if (!current[seg]) current[seg] = {};
        current = current[seg];
      }
      continue;
    }

    const kvMatch = trimmed.match(/^([\w.\-]+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const rawValue = kvMatch[2].trim();
      if (rawValue.startsWith('[') && !rawValue.endsWith(']')) {
        arrayMode = true;
        arrayKey = key;
        arrayRaw = rawValue + '\n';
        continue;
      }
      current[key] = parseValueLiteral(rawValue);
    }
  }
  return root;
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

// Supports a single '*' wildcard, e.g. "wait-*.svg"
function globToFiles(dir, pattern) {
  const files = fs.readdirSync(dir);
  if (!pattern.includes('*')) {
    return files.includes(pattern) ? [pattern] : [];
  }
  const [prefix, suffix] = pattern.split('*');
  return files
    .filter((f) => f.startsWith(prefix) && f.endsWith(suffix))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function recolor(svgText, colorMap) {
  let out = svgText;
  for (const { match, replace } of colorMap) {
    out = out.split(match).join(replace);
    out = out.split(match.toLowerCase()).join(replace);
    out = out.split(match.toUpperCase()).join(replace);
  }
  return out;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

function main() {
  if (!fs.existsSync(RENDER_JSON)) {
    console.error(`Missing render.json at ${RENDER_JSON}`);
    process.exit(1);
  }
  if (!fs.existsSync(X_TOML)) {
    console.error(`Missing configs/x.build.toml at ${X_TOML}`);
    process.exit(1);
  }

  const renderConfig = JSON.parse(fs.readFileSync(RENDER_JSON, 'utf8'));
  const toml = parseSimpleToml(fs.readFileSync(X_TOML, 'utf8'));

  const cursors = { ...(toml.cursors || {}) };
  const fallback = cursors.fallback_settings || {};
  delete cursors.fallback_settings;

  let totalOk = 0;
  let totalSkipped = 0;

  for (const [themeName, themeCfg] of Object.entries(renderConfig)) {
    const svgSourceDir = path.join(ROOT, themeCfg.dir || 'svg');
    const bitmapsDir = path.join(ROOT, themeCfg.out || `bitmaps/${themeName}`);
    if (!fs.existsSync(svgSourceDir)) {
      console.warn(`[skip theme] "${themeName}": svg dir not found at ${svgSourceDir}`);
      continue;
    }
    if (!fs.existsSync(bitmapsDir)) {
      console.warn(`[warn] "${themeName}": bitmaps dir not found at ${bitmapsDir} -- run "yarn render" first for accurate nominal_size. Falling back to SVG viewBox for now.`);
    }

    const scalableDir = path.join(THEMES_DIR, themeName, 'cursors_scalable');
    ensureDir(scalableDir);

    console.log(`\n=== ${themeName} ===`);

    for (const [cursorKey, cfg] of Object.entries(cursors)) {
      const x11Name = cfg.x11_name || cursorKey;
      const hotspotX = cfg.x_hotspot ?? fallback.x_hotspot;
      const hotspotY = cfg.y_hotspot ?? fallback.y_hotspot;
      const delayMs = fallback.x11_delay ?? DEFAULT_DELAY_MS;

      const pngPattern = cfg.png;
      if (!pngPattern) {
        console.warn(`[skip] "${cursorKey}" has no png field in toml`);
        totalSkipped++;
        continue;
      }
      const svgPattern = pngPattern.replace(/\.png$/, '.svg');
      const matchedSvgs = globToFiles(svgSourceDir, svgPattern);

      if (matchedSvgs.length === 0) {
        console.warn(`[skip] "${cursorKey}": no SVG found matching "${svgPattern}"`);
        totalSkipped++;
        continue;
      }

      const cursorOutDir = path.join(scalableDir, x11Name);
      ensureDir(cursorOutDir);

      const frames = matchedSvgs.map((filename) => {
        const srcPath = path.join(svgSourceDir, filename);
        const svgText = fs.readFileSync(srcPath, 'utf8');
        const nominalSize = getNominalSize(bitmapsDir, pngPattern, svgText, `${x11Name}/${filename}`);
        const recolored = recolor(svgText, themeCfg.colors || []);
        fs.writeFileSync(path.join(cursorOutDir, filename), recolored);

        const frame = {
          filename,
          hotspot_x: hotspotX,
          hotspot_y: hotspotY,
          nominal_size: nominalSize,
        };
        if (matchedSvgs.length > 1) frame.delay = delayMs;
        return frame;
      });

      fs.writeFileSync(
        path.join(cursorOutDir, 'metadata.json'),
        JSON.stringify(frames, null, 2) + '\n'
      );

      console.log(
        `[ok] ${x11Name} (${matchedSvgs.length} frame${matchedSvgs.length > 1 ? 's' : ''}, hotspot ${hotspotX},${hotspotY})`
      );
      totalOk++;

      // Aliases: mirror x11_symlinks as symlinked directories
      const symlinks = cfg.x11_symlinks || [];
      for (const alias of symlinks) {
        const aliasPath = path.join(scalableDir, alias);
        if (fs.existsSync(aliasPath) || fs.lstatSync(scalableDir).isSymbolicLink?.()) {
          // already exists, skip
        }
        try {
          if (!fs.existsSync(aliasPath)) {
            fs.symlinkSync(x11Name, aliasPath, 'dir');
          }
        } catch (e) {
          console.warn(`  [warn] could not create alias "${alias}" -> "${x11Name}": ${e.message}`);
        }
      }
    }
  }

  console.log(`\nDone. ${totalOk} cursors generated, ${totalSkipped} skipped.`);
  console.log('Next: update deploy.sh to also copy cursors_scalable/ alongside cursors/ into ~/.icons and /usr/share/icons.');
}

main();