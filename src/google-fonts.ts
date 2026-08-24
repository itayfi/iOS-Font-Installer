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

export function previewStylesheetUrl(family: GoogleFontFamily): string {
  const tuples = family.variants
    .map((variant) => [variant.style === 'italic' ? 1 : 0, variant.weight] as const)
    .sort(([leftItalic, leftWeight], [rightItalic, rightWeight]) =>
      leftItalic - rightItalic || leftWeight - rightWeight
    )
    .filter((tuple, index, all) => index === 0 || tuple[0] !== all[index - 1]?.[0] || tuple[1] !== all[index - 1]?.[1])
    .map(([italic, weight]) => `${italic},${weight}`)
    .join(';');
  const previewText = [...new Set(family.variants.flatMap((variant) => [...variant.label]))].join('');
  const url = new URL('https://fonts.googleapis.com/css2');
  url.searchParams.set('family', `${family.family}:ital,wght@${tuples}`);
  url.searchParams.set('text', previewText);
  return url.toString();
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
