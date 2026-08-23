import type { FontAsset } from './types';
import { validateInstallableFont } from './font-validation';

export async function readLocalFonts(files: FileList): Promise<FontAsset[]> {
  const assets: FontAsset[] = [];
  for (const file of Array.from(files)) {
    const data = new Uint8Array(await file.arrayBuffer());
    const validation = validateInstallableFont(data);
    if (!validation.valid) throw new Error(`${file.name}: ${validation.reason}`);
    assets.push({
      filename: file.name,
      family: file.name.replace(/\.(?:ttf|otf)$/i, '').replace(/[-_]/g, ' '),
      style: /italic/i.test(file.name) ? 'italic' : 'normal',
      weight: 400,
      data,
    });
  }
  return assets;
}
