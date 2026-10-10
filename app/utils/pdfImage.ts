import { getBackendOrigin } from "@/lib/api-url";
import { resolvePhotoUrl } from "@/lib/utils";
import { pushGraphicsState, popGraphicsState, clip, endPath, rectangle } from 'pdf-lib';

const getBackendBaseUrl = () => getBackendOrigin();

export function pickPhotoSource(...sources: (string | null | undefined)[]): string | null {
  for (const source of sources) {
    if (source && typeof source === 'string' && source.trim()) {
      return source.trim();
    }
  }
  return null;
}

export function toAbsoluteImageUrl(source: string): string {
  if (source.startsWith('data:') || source.startsWith('http://') || source.startsWith('https://')) {
    return source;
  }

  return resolvePhotoUrl(source);
}

function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export async function loadImageBytes(
  source: string,
): Promise<{ bytes: Uint8Array; mime?: string } | null> {
  try {
    if (source.startsWith('data:')) {
      const [header, base64 = ''] = source.split(',');
      const mime = header.split(':')[1]?.split(';')[0];
      return {
        bytes: new Uint8Array(Buffer.from(base64, 'base64')),
        mime,
      };
    }

    if (/^[A-Za-z0-9+/=\s]+$/.test(source) && source.length > 100) {
      const bytes = new Uint8Array(Buffer.from(source.replace(/\s/g, ''), 'base64'));
      return { bytes, mime: detectMimeFromBytes(bytes) || undefined };
    }

    // Check if source exists on local filesystem
    try {
      const fs = await import('fs');
      const path = await import('path');
      let localBytes: Uint8Array | null = null;
      if (fs.existsSync(source) && fs.statSync(source).isFile()) {
        localBytes = new Uint8Array(fs.readFileSync(source));
      } else {
        const publicPath = path.join(process.cwd(), 'public', source.replace(/^\/+/, ''));
        if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
          localBytes = new Uint8Array(fs.readFileSync(publicPath));
        }
      }
      if (localBytes) {
        let localMime = detectMimeFromBytes(localBytes) || undefined;
        if (localMime === 'image/webp') {
          try {
            const sharp = (await import('sharp')).default;
            localBytes = new Uint8Array(await sharp(Buffer.from(localBytes)).jpeg({ quality: 90 }).toBuffer());
            localMime = 'image/jpeg';
          } catch {
            // keep original
          }
        }
        return { bytes: localBytes, mime: localMime };
      }
    } catch {
      // Fall through to remote URL fetch
    }

    let url = toAbsoluteImageUrl(source);
    // If ImageKit asset, request dynamic JPEG transformation preserving original print resolution & q=90
    if (url.includes('ik.imagekit.io') && !url.includes('tr=')) {
      url += (url.includes('?') ? '&' : '?') + 'tr=f-jpg,orig-true,q-90';
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PurabiyaFoundation/1.0)' },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image from ${url}: ${response.status} ${response.statusText}`);
      return null;
    }

    let bytes = new Uint8Array(await response.arrayBuffer());
    let mime = response.headers.get('content-type') || detectMimeFromBytes(bytes) || undefined;

    // If WebP format is received, convert to high-grade JPEG for pdf-lib compatibility
    if (mime?.includes('webp') || detectMimeFromBytes(bytes) === 'image/webp') {
      try {
        const sharp = (await import('sharp')).default;
        const converted = await sharp(Buffer.from(bytes)).jpeg({ quality: 90 }).toBuffer();
        bytes = new Uint8Array(converted);
        mime = 'image/jpeg';
      } catch (convErr) {
        console.warn('WebP conversion for PDF embedding skipped:', convErr);
      }
    }

    return { bytes, mime };
  } catch (error) {
    console.error('Error loading image for PDF:', error);
    return null;
  }
}

export async function embedPdfImage(
  pdfDoc: import('pdf-lib').PDFDocument,
  page: import('pdf-lib').PDFPage,
  pageHeight: number,
  source: string,
  x: number,
  yFromTop: number,
  width: number,
  height: number,
  fit: 'fill' | 'contain' | 'cover' = 'fill',
): Promise<void> {
  const loaded = await loadImageBytes(source);
  if (!loaded) return;

  const { bytes, mime } = loaded;
  const detectedMime = mime || detectMimeFromBytes(bytes) || '';
  let image;

  const isJpeg =
    detectedMime.includes('jpeg') ||
    detectedMime.includes('jpg') ||
    (bytes[0] === 0xff && bytes[1] === 0xd8);
  const isPng = detectedMime.includes('png') || (bytes[0] === 0x89 && bytes[1] === 0x50);

  try {
    if (isJpeg) {
      image = await pdfDoc.embedJpg(bytes);
    } else if (isPng) {
      image = await pdfDoc.embedPng(bytes);
    } else {
      try {
        image = await pdfDoc.embedJpg(bytes);
      } catch {
        image = await pdfDoc.embedPng(bytes);
      }
    }
  } catch (error) {
    console.error('Error embedding image in PDF:', error, { mime: detectedMime, size: bytes.length });
    return;
  }

  const boxX = x;
  const boxY = pageHeight - yFromTop - height;
  const boxW = width;
  const boxH = height;

  if (fit === 'cover' && image.width && image.height) {
    const scale = Math.max(boxW / image.width, boxH / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const drawX = boxX + (boxW - drawW) / 2;
    const drawY = boxY + (boxH - drawH) / 2;

    // Strict clipping to the inner box rectangle ensures zero leakage onto the black border
    page.pushOperators(
      pushGraphicsState(),
      rectangle(boxX, boxY, boxW, boxH),
      clip(),
      endPath()
    );

    page.drawImage(image, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });

    page.pushOperators(popGraphicsState());
    return;
  }

  let drawX = boxX;
  let drawY = boxY;
  let drawW = boxW;
  let drawH = boxH;

  if (fit === 'contain' && image.width && image.height) {
    const scale = Math.min(boxW / image.width, boxH / image.height);
    drawW = image.width * scale;
    drawH = image.height * scale;
    drawX = boxX + (boxW - drawW) / 2;
    drawY = boxY + (boxH - drawH) / 2;
  }

  page.drawImage(image, {
    x: drawX,
    y: drawY,
    width: drawW,
    height: drawH,
  });
}
