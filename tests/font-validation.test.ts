import { describe, expect, it } from 'vitest';
import { validateInstallableFont } from '../src/font-validation';

function fontWithTables(...tags: string[]): Uint8Array {
  const bytes = new Uint8Array(12 + tags.length * 16);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x00010000, false);
  view.setUint16(4, tags.length, false);
  tags.forEach((tag, index) => {
    Array.from(tag).forEach((character, characterIndex) => {
      bytes[12 + index * 16 + characterIndex] = character.charCodeAt(0);
    });
  });
  return bytes;
}

describe('validateInstallableFont', () => {
  it('accepts a static TrueType font', () => {
    expect(validateInstallableFont(fontWithTables('name', 'glyf'))).toEqual({ valid: true, format: 'truetype' });
  });

  it('rejects variable fonts by their fvar table', () => {
    expect(validateInstallableFont(fontWithTables('name', 'fvar'))).toEqual({
      valid: false,
      reason: 'Variable fonts cannot be installed using an Apple font profile. Choose a static style.',
    });
  });

  it('rejects font collections', () => {
    const bytes = new TextEncoder().encode('ttcf00000000');
    expect(validateInstallableFont(bytes)).toMatchObject({ valid: false });
  });
});
