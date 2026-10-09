import 'regenerator-runtime/runtime';
import {
  PDFPage,
  PDFFont,
  Color,
  rgb,
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
} from 'pdf-lib';
import * as hb from 'harfbuzzjs';

export interface DrawDevanagariOptions {
  x: number;
  y: number;
  size?: number;
  color?: Color;
  maxW?: number;
  minSize?: number;
}

interface CachedHbFont {
  face: hb.Face;
  font: hb.Font;
  upem: number;
}

// Cache HarfBuzz font representations by fontData Uint8Array to make shaping near-instant
const hbFontCache = new WeakMap<Uint8Array, CachedHbFont>();

function getHbFont(fontData: Uint8Array): CachedHbFont {
  let cached = hbFontCache.get(fontData);
  if (!cached) {
    const blob = new hb.Blob(fontData);
    const face = new hb.Face(blob);
    const font = new hb.Font(face);
    const upem = face.upem || 1000;
    cached = { face, font, upem };
    hbFontCache.set(fontData, cached);
  }
  return cached;
}

/**
 * Checks whether the given string contains any Devanagari characters (U+0900–U+097F).
 */
export function containsDevanagari(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Measures the exact visual advance width of text using HarfBuzz OpenType shaping.
 * Accurately accounts for ligatures, conjuncts, mark positioning, and kerning.
 */
export function measureDevanagariWidth(font: PDFFont, text: string, size: number): number {
  if (!text) return 0;
  const str = String(text).trim();
  if (!str) return 0;

  const embedder = (font as any)?.embedder;
  const fontData: Uint8Array | undefined = embedder?.fontData;

  // Fallback if font does not have custom embedder
  if (!fontData || !embedder?.font) {
    return font.widthOfTextAtSize ? font.widthOfTextAtSize(str, size) : str.length * size * 0.6;
  }

  try {
    const { font: hbFont, upem } = getHbFont(fontData);
    const buffer = new hb.Buffer();
    buffer.addText(str);
    buffer.guessSegmentProperties();
    hb.shape(hbFont, buffer);

    const positions = buffer.getGlyphPositions();
    let totalAdvance = 0;
    for (let i = 0; i < positions.length; i++) {
      totalAdvance += positions[i].xAdvance;
    }

    const scale = size / upem;
    return totalAdvance * scale;
  } catch (err) {
    console.warn('HarfBuzz measurement failed, falling back to standard metrics:', err);
    return font.widthOfTextAtSize ? font.widthOfTextAtSize(str, size) : str.length * size * 0.6;
  }
}

/**
 * Draws text containing Devanagari (Hindi) or mixed Hindi/English/numbers/symbols
 * with authentic HarfBuzz OpenType shaping, GSUB ligature formation, GPOS mark positioning,
 * and precise glyph placement in the PDF content stream.
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
  const fontData: Uint8Array | undefined = embedder?.fontData;

  // Fallback to standard drawText if custom embedder is absent
  if (!fontData || !embedder?.font) {
    page.drawText(str, { x, y, size, font, color });
    return;
  }

  const fk = embedder.font;
  const { newFontKey } = (page as any).setOrEmbedFont(font);

  // If embedded without subsetting (subset: false), populate glyphCache for widths dictionary
  if (!embedder.subset && embedder.glyphCache && !(embedder as any)._allGlyphsPopulated) {
    const allGlyphs = [];
    for (let i = 0; i < fk.numGlyphs; i++) {
      allGlyphs.push(fk.getGlyph(i));
    }
    embedder.glyphCache.value = allGlyphs;
    (embedder as any)._allGlyphsPopulated = true;
  }

  try {
    const { font: hbFont, upem } = getHbFont(fontData);
    const buffer = new hb.Buffer();
    buffer.addText(str);
    buffer.guessSegmentProperties();
    hb.shape(hbFont, buffer);

    const infos = buffer.getGlyphInfos();
    const positions = buffer.getGlyphPositions();

    const scale = size / upem;
    let cursorX = x;
    let cursorY = y;

    const operators: PDFOperator[] = [
      pushGraphicsState(),
      beginText(),
      setFillingColor(color),
      setFontAndSize(newFontKey, size),
    ];

    for (let i = 0; i < infos.length; i++) {
      const gid = infos[i].codepoint;
      const pos = positions[i];
      let hexId: string;

      if (embedder.subset) {
        // Register glyph with fontkit subset stream and get mapped subset ID
        const g = fk.getGlyph(gid);
        const subsetGlyphId = embedder.subset.includeGlyph(g);
        embedder.glyphs[subsetGlyphId - 1] = g;
        embedder.glyphIdMap.set(g.id, subsetGlyphId);
        hexId = subsetGlyphId.toString(16).padStart(4, '0');
      } else {
        hexId = gid.toString(16).padStart(4, '0');
      }

      // Exact HarfBuzz GPOS positioning:
      // gx = cursor + xOffset, gy = cursor + yOffset
      const gx = cursorX + (pos.xOffset * scale);
      const gy = cursorY + (pos.yOffset * scale);

      operators.push(
        PDFOperator.of(PDFOperatorNames.SetTextMatrix, [
          PDFNumber.of(1),
          PDFNumber.of(0),
          PDFNumber.of(0),
          PDFNumber.of(1),
          PDFNumber.of(Number(gx.toFixed(3))),
          PDFNumber.of(Number(gy.toFixed(3))),
        ]),
        PDFOperator.of(PDFOperatorNames.ShowText, [PDFHexString.of(hexId)])
      );

      // Advance cursor
      cursorX += pos.xAdvance * scale;
      cursorY += pos.yAdvance * scale;
    }

    operators.push(endText(), popGraphicsState());

    if (embedder.subset && embedder.glyphCache) {
      embedder.glyphCache.invalidate();
    }
    (font as any).modified = true;

    page.pushOperators(...operators);
  } catch (err) {
    console.warn('HarfBuzz rendering failed, falling back to standard drawText:', err);
    page.drawText(str, { x, y, size, font, color });
  }
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

export interface DrawDevanagariCenteredOptions {
  size?: number;
  color?: Color;
  minSize?: number;
  padding?: number;
  maxW?: number;
}

/**
 * Draws horizontally centered text between minX and maxX on a baseline Y coordinate.
 * Uses HarfBuzz OpenType shaping for all Devanagari, numeric, and mixed text,
 * measures exact visual advances, and scales font size if text exceeds box width.
 */
export function drawDevanagariCenteredAtBaseline(
  page: PDFPage,
  font: PDFFont,
  text: unknown,
  minX: number,
  maxX: number,
  blY: number,
  optionsOrSize?: DrawDevanagariCenteredOptions | number,
  optColor?: Color
): void {
  if (text === undefined || text === null) return;
  const str = String(text).trim();
  if (!str || str === 'undefined' || str === 'null' || str === 'NaN') return;

  let size = 10.5;
  let color: Color = rgb(0, 0, 0);
  let minSize = 6.0;
  let padding = 4;
  let customMaxW: number | undefined;

  if (typeof optionsOrSize === 'object' && optionsOrSize !== null) {
    size = optionsOrSize.size ?? 10.5;
    color = optionsOrSize.color ?? rgb(0, 0, 0);
    minSize = optionsOrSize.minSize ?? 6.0;
    padding = optionsOrSize.padding ?? 4;
    customMaxW = optionsOrSize.maxW;
  } else if (typeof optionsOrSize === 'number') {
    size = optionsOrSize;
    if (optColor) color = optColor;
  }

  const boxW = customMaxW ?? Math.max(0, maxX - minX - padding);
  let fontSize = size;

  try {
    const measuredW = measureDevanagariWidth(font, str, fontSize);
    if (boxW > 0 && measuredW > boxW) {
      fontSize = Math.max(minSize, fontSize * (boxW / measuredW));
    }
    const finalW = measureDevanagariWidth(font, str, fontSize);
    const x = minX + Math.max(0, (maxX - minX - finalW) / 2);

    drawDevanagariText(page, font, str, {
      x,
      y: blY,
      size: fontSize,
      color,
    });
  } catch (err) {
    console.warn('drawDevanagariCenteredAtBaseline fallback:', err);
    drawDevanagariText(page, font, str, {
      x: minX + 2,
      y: blY,
      size: fontSize,
      color,
    });
  }
}

/**
 * Draws text centered horizontally and vertically inside a rectangular box (boxX, boxY, boxW, boxH).
 * In PDF bottom-left coordinate space, boxY is the bottom edge of the box.
 * Automatically shapes Devanagari and mixed text via HarfBuzz.
 */
export function drawDevanagariCenteredInRect(
  page: PDFPage,
  font: PDFFont,
  text: unknown,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  optionsOrSize?: DrawDevanagariCenteredOptions | number,
  optColor?: Color
): void {
  if (text === undefined || text === null) return;
  const str = String(text).trim();
  if (!str || str === 'undefined' || str === 'null' || str === 'NaN') return;

  let size = 11.0;
  let color: Color = rgb(0, 0, 0);
  let minSize = 6.5;

  if (typeof optionsOrSize === 'object' && optionsOrSize !== null) {
    size = optionsOrSize.size ?? 11.0;
    color = optionsOrSize.color ?? rgb(0, 0, 0);
    minSize = optionsOrSize.minSize ?? 6.5;
  } else if (typeof optionsOrSize === 'number') {
    size = optionsOrSize;
    if (optColor) color = optColor;
  }

  const maxW = Math.max(0, boxW - 4);
  let fontSize = size;

  try {
    const measuredW = measureDevanagariWidth(font, str, fontSize);
    if (maxW > 0 && measuredW > maxW) {
      fontSize = Math.max(minSize, fontSize * (maxW / measuredW));
    }
    const finalW = measureDevanagariWidth(font, str, fontSize);
    const x = boxX + Math.max(0, (boxW - finalW) / 2);
    // Optical vertical centering: capHeight is approx 0.72 of font size
    const capHeight = fontSize * 0.72;
    const y = boxY + (boxH - capHeight) / 2;

    drawDevanagariText(page, font, str, {
      x,
      y,
      size: fontSize,
      color,
    });
  } catch (err) {
    console.warn('drawDevanagariCenteredInRect fallback:', err);
    drawDevanagariText(page, font, str, {
      x: boxX + 2,
      y: boxY + boxH * 0.2,
      size: fontSize,
      color,
    });
  }
}
