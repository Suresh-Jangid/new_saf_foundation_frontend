import 'regenerator-runtime/runtime';
import {
  PDFPage,
  PDFFont,
  Color,
  rgb,
  PDFArray,
  PDFHexString,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames,
  pushGraphicsState,
  popGraphicsState,
  beginText,
  endText,
  setFillingColor,
  setFontAndSize,
  moveText,
} from 'pdf-lib';

export interface DrawDevanagariOptions {
  x: number;
  y: number;
  size?: number;
  color?: Color;
  maxW?: number;
  minSize?: number;
}

/**
 * Checks whether the given string contains any Devanagari characters (U+0900–U+097F).
 */
export function containsDevanagari(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Measures the effective visual width of text rendered with the Devanagari font.
 * For Devanagari runs, discounts the phantom advance width of pre-base matra glyphs (uni093F.*)
 * which are pulled back via TJ positioning.
 */
export function measureDevanagariWidth(font: PDFFont, text: string, size: number): number {
  if (!text) return 0;
  const str = String(text).trim();
  if (!str) return 0;

  const embedder = (font as any)?.embedder;
  if (!embedder || !embedder.font) {
    return font.widthOfTextAtSize ? font.widthOfTextAtSize(str, size) : 0;
  }

  // If text does not contain Devanagari, standard font measurement is accurate
  if (!containsDevanagari(str)) {
    return font.widthOfTextAtSize ? font.widthOfTextAtSize(str, size) : 0;
  }

  const fk = embedder.font;
  const runs = str.split(/([\u0900-\u097F]+)/g).filter(Boolean);

  let totalUnits = 0;
  for (const run of runs) {
    const isDeva = containsDevanagari(run);
    const glyphRun = fk.layout(run, embedder.fontFeatures, isDeva ? 'deva' : undefined);
    for (let i = 0; i < glyphRun.glyphs.length; i++) {
      const g = glyphRun.glyphs[i];
      // Pre-base short-i matra advance is canceled out by TJ adjustment
      if (g.name && g.name.startsWith('uni093F') && i + 1 < glyphRun.glyphs.length) {
        continue;
      }
      totalUnits += g.advanceWidth || 0;
    }
  }

  const scale = size / 1000;
  const fontScale = typeof embedder.scale === 'number' ? embedder.scale : 1;
  return totalUnits * scale * fontScale;
}

/**
 * Draws text containing Devanagari (Hindi) or mixed Hindi/English/numbers/symbols
 * with correct OpenType shaping, pre-base matra (uni093F.*) kerning correction,
 * and proper font subset registration.
 */
export function drawDevanagariText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  options: DrawDevanagariOptions
): void {
  if (!text) return;
  const str = String(text).trim();
  if (!str || str === 'undefined' || str === 'null' || str === 'NaN') return;

  const {
    x = 0,
    y = 0,
    size = 10,
    color = rgb(0, 0, 0),
  } = options || {};

  const embedder = (font as any)?.embedder;
  // If font doesn't have custom embedder, fallback to standard drawText
  if (!embedder || !embedder.font) {
    page.drawText(str, { x, y, size, font, color });
    return;
  }

  const fk = embedder.font;
  const doc = page.doc;
  const { newFontKey } = (page as any).setOrEmbedFont(font);

  // If embedded without subsetting (subset: false), ensure glyphCache contains
  // all glyphs so the PDF /W (widths) dictionary contains proper advance widths
  // for all ligatures and conjuncts.
  if (!embedder.subset && embedder.glyphCache && !(embedder as any)._allGlyphsPopulated) {
    const allGlyphs = [];
    for (let i = 0; i < fk.numGlyphs; i++) {
      allGlyphs.push(fk.getGlyph(i));
    }
    embedder.glyphCache.value = allGlyphs;
    (embedder as any)._allGlyphsPopulated = true;
  }

  // Segment string into Devanagari and non-Devanagari runs
  const runs = str.split(/([\u0900-\u097F]+)/g).filter(Boolean);
  const tjArray = PDFArray.withContext(doc.context);

  for (const run of runs) {
    const isDeva = containsDevanagari(run);
    // Explicitly layout Devanagari runs with 'deva' script for Indic syllable shaper
    const glyphRun = fk.layout(run, embedder.fontFeatures, isDeva ? 'deva' : undefined);

    let currentHex = '';
    for (let i = 0; i < glyphRun.glyphs.length; i++) {
      const g = glyphRun.glyphs[i];
      let hexId: string;

      if (embedder.subset) {
        // Register glyph with fontkit subset stream and map ID
        const subsetGlyphId = embedder.subset.includeGlyph(g);
        embedder.glyphs[subsetGlyphId - 1] = g;
        embedder.glyphIdMap.set(g.id, subsetGlyphId);
        hexId = subsetGlyphId.toString(16).padStart(4, '0');
      } else {
        hexId = g.id.toString(16).padStart(4, '0');
      }

      currentHex += hexId;

      // Pre-base short-i matra correction:
      // When uni093F.* is encountered, flush preceding hex and emit a positive
      // TJ number equal to the matra's advanceWidth. In PDF TJ, a positive number
      // shifts the text cursor back to the left, pulling the following base
      // consonant directly under the matra canopy.
      if (g.name && g.name.startsWith('uni093F') && i + 1 < glyphRun.glyphs.length) {
        tjArray.push(PDFHexString.of(currentHex));
        currentHex = '';
        tjArray.push(PDFNumber.of(g.advanceWidth || 259));
      }
    }

    if (currentHex) {
      tjArray.push(PDFHexString.of(currentHex));
    }
  }

  if (embedder.subset && embedder.glyphCache) {
    embedder.glyphCache.invalidate();
  }
  (font as any).modified = true;

  page.pushOperators(
    pushGraphicsState(),
    beginText(),
    setFillingColor(color),
    setFontAndSize(newFontKey, size),
    moveText(x, y),
    PDFOperator.of(PDFOperatorNames.ShowTextAdjusted, [tjArray]),
    endText(),
    popGraphicsState()
  );
}

/**
 * Draws bounded Devanagari/mixed text with automatic font size scaling if width exceeds maxW.
 * Preserves the exact parameters, scaling limits, and coordinates of existing PDF templates.
 */
export function drawDevanagariBounded(
  page: PDFPage,
  font: PDFFont,
  text: unknown,
  optionsOrX: DrawDevanagariOptions | number,
  optY?: number,
  optSize?: number,
  optMaxW?: number,
  optColor?: Color,
  optMinSize?: number
): void {
  if (text === undefined || text === null) return;
  const str = String(text).trim();
  if (!str || str === 'undefined' || str === 'null' || str === 'NaN') return;

  let x: number;
  let y: number;
  let size: number;
  let maxW: number | undefined;
  let color: Color;
  let minSize: number;

  if (typeof optionsOrX === 'object' && optionsOrX !== null) {
    x = optionsOrX.x;
    y = optionsOrX.y;
    size = optionsOrX.size ?? 10;
    maxW = optionsOrX.maxW;
    color = optionsOrX.color ?? rgb(0, 0, 0);
    minSize = optionsOrX.minSize ?? 6.0;
  } else {
    x = optionsOrX;
    y = optY ?? 0;
    size = optSize ?? 10;
    maxW = optMaxW;
    color = optColor ?? rgb(0, 0, 0);
    minSize = optMinSize ?? 6.0;
  }

  let finalSize = size;
  if (maxW && maxW > 0) {
    try {
      const measuredW = measureDevanagariWidth(font, str, size);
      if (measuredW > maxW) {
        finalSize = Math.max(minSize, size * (maxW / measuredW));
      }
    } catch {
      // Keep initial size if measurement encounters an edge case
    }
  }

  drawDevanagariText(page, font, str, {
    x,
    y,
    size: finalSize,
    color,
  });
}
