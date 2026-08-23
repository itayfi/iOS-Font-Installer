import type { FontAsset, GoogleFontCatalog, GoogleFontFamily, GoogleFontVariant } from './types';
import { validateInstallableFont } from './font-validation';

export function filterFamilies(
  families: GoogleFontFamily[],
  query: string,
  category: string,
): GoogleFontFamily[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return families.filter((family) =>
    (category === 'all' || family.category === category)
    && (!normalizedQuery || family.family.toLocaleLowerCase().includes(normalizedQuery)),
  );
}

export async function loadCatalog(signal?: AbortSignal): Promise<GoogleFontCatalog> {
  const response = await fetch('./data/google-fonts.json', { signal });
  if (!response.ok) throw new Error(`Could not load the font catalog (${response.status}).`);
  return response.json() as Promise<GoogleFontCatalog>;
}

export async function downloadVariant(
  family: GoogleFontFamily,
  variant: GoogleFontVariant,
  signal?: AbortSignal,
): Promise<FontAsset> {
  const response = await fetch(variant.url, { signal });
  if (!response.ok) throw new Error(`${variant.label} failed to download (${response.status}).`);
  const data = new Uint8Array(await response.arrayBuffer());
  const validation = validateInstallableFont(data);
  if (!validation.valid) throw new Error(`${variant.label}: ${validation.reason}`);
  return {
    filename: variant.filename,
    family: family.family,
    style: variant.style,
    weight: variant.weight,
    data,
  };
}
