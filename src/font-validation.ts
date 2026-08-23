export type FontValidationResult =
  | { valid: true; format: 'truetype' | 'opentype' }
  | { valid: false; reason: string };

const readTag = (data: Uint8Array, offset: number): string =>
  String.fromCharCode(...data.subarray(offset, offset + 4));

export function validateInstallableFont(data: Uint8Array): FontValidationResult {
  if (data.byteLength < 12) {
    return { valid: false, reason: 'The file is too small to be a valid font.' };
  }

  const signature = readTag(data, 0);
  if (signature === 'ttcf') {
    return { valid: false, reason: 'Font collections (.ttc/.otc) are not supported by Apple font profiles.' };
  }
  if (signature === 'wOFF' || signature === 'wOF2') {
    return { valid: false, reason: 'Web font files are not installable. Choose a static .ttf or .otf file.' };
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const scalerType = view.getUint32(0, false);
  const isTrueType = scalerType === 0x00010000 || signature === 'true';
  const isOpenType = signature === 'OTTO';
  if (!isTrueType && !isOpenType) {
    return { valid: false, reason: 'This is not a supported TrueType or OpenType font.' };
  }

  const tableCount = view.getUint16(4, false);
  if (12 + tableCount * 16 > data.byteLength) {
    return { valid: false, reason: 'The font table is truncated or corrupt.' };
  }

  for (let index = 0; index < tableCount; index += 1) {
    if (readTag(data, 12 + index * 16) === 'fvar') {
      return { valid: false, reason: 'Variable fonts cannot be installed using an Apple font profile. Choose a static style.' };
    }
  }

  return { valid: true, format: isOpenType ? 'opentype' : 'truetype' };
}
