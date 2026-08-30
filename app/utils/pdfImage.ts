import { getBackendOrigin } from "@/lib/api-url";

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

  const normalized = source.replace(/^\/+/, '');
  if (normalized.startsWith('uploads/')) {
    return `${getBackendBaseUrl()}/${normalized}`;
  }

  return `${getBackendBaseUrl()}/uploads/${normalized}`;
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

    const url = toAbsoluteImageUrl(source);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PurabiyaFoundation/1.0)' },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image from ${url}: ${response.status} ${response.statusText}`);
      return null;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const mime = response.headers.get('content-type') || detectMimeFromBytes(bytes) || undefined;
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

  page.drawImage(image, {
    x,
    y: pageHeight - yFromTop - height,
    width,
    height,
  });
}
