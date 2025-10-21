import * as QRCode from 'qrcode';

export async function generateQrMatrix(text: string): Promise<{ size: number; base64Data: string }> {
  const qrData = await QRCode.create(text, { errorCorrectionLevel: 'M' });

  const modules = qrData.modules;
  const size = modules.size;
  const data: number[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isDark = modules.get(x, y);
      data.push(isDark ? 1 : 0);
    }
  }

  return { size, base64Data: bitsToBase64(data) };
}

function bitsToBase64(data: number[]): string {
  const byteLength = Math.ceil(data.length / 8);
  const bytes = new Uint8Array(byteLength);

  for (let i = 0; i < data.length; i++) {
    if (data[i]) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8); // MSB부터 채움
      bytes[byteIndex] |= 1 << bitIndex;
    }
  }

  return Buffer.from(bytes).toString('base64');
}