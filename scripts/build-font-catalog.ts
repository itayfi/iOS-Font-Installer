import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FontStyle, GoogleFontCatalog, GoogleFontFamily, GoogleFontVariant } from '../src/types';

const API_URL = 'https://www.googleapis.com/webfonts/v1/webfonts';

const WEIGHT_LABELS: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
};

interface DeveloperApiFamily {
  family: string;
  category: string;
  files: Record<string, string>;
}

interface DeveloperApiResponse {
  items: DeveloperApiFamily[];
}

export function variantFromApi(name: string, fontUrl: string): GoogleFontVariant | null {
  const match = name.match(/^(regular|italic|([1-9]00)(italic)?)$/);
  if (!match) return null;

  const weight = match[2] ? Number(match[2]) : 400;
  const style: FontStyle = name.endsWith('italic') ? 'italic' : 'normal';
  const url = fontUrl.replace(/^http:\/\//, 'https://');
  const filename = new URL(url).pathname.split('/').at(-1);
  if (!filename?.toLowerCase().endsWith('.ttf') || !url.startsWith('https://fonts.gstatic.com/')) return null;

  return {
    filename,
    url,
    style,
    weight,
    label: `${WEIGHT_LABELS[weight] ?? weight}${style === 'italic' ? ' Italic' : ''}`,
  };
}

function normalizeCategory(category: string): string {
  return category.toUpperCase().replaceAll('-', '_');
}

export function buildCatalog(response: DeveloperApiResponse): GoogleFontCatalog {
  const families: GoogleFontFamily[] = response.items.map((item) => ({
    family: item.family,
    category: normalizeCategory(item.category),
    variants: Object.entries(item.files)
      .map(([name, url]) => variantFromApi(name, url))
      .filter((variant): variant is GoogleFontVariant => variant !== null)
      .sort((left, right) => left.weight - right.weight || left.style.localeCompare(right.style)),
  })).filter((family) => family.variants.length > 0);

  families.sort((left, right) => left.family.localeCompare(right.family));
  return {
    generatedAt: new Date().toISOString(),
    source: 'Google Fonts Developer API',
    families,
  };
}

async function fetchCatalog(apiKey: string): Promise<DeveloperApiResponse> {
  const url = new URL(API_URL);
  url.searchParams.set('sort', 'alpha');
  url.searchParams.set('key', apiKey);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * (2 ** attempt)));
      continue;
    }

    if (response.ok) {
      const data = await response.json() as Partial<DeveloperApiResponse>;
      if (!Array.isArray(data.items)) throw new Error('Google Fonts Developer API response did not contain a font list.');
      return data as DeveloperApiResponse;
    }
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`Google Fonts Developer API returned ${response.status}.`);
    }
    if (attempt === 2) throw new Error(`Google Fonts Developer API returned ${response.status} after 3 attempts.`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * (2 ** attempt)));
  }

  throw new Error('Google Fonts Developer API request failed.');
}

async function main(): Promise<void> {
  const outputFlag = process.argv.indexOf('--output');
  const outputArgument = outputFlag >= 0 ? process.argv[outputFlag + 1] : undefined;
  const output = resolve(outputArgument ?? 'public/data/google-fonts.json');
  const apiKey = process.env.GOOGLE_FONTS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GOOGLE_FONTS_API_KEY is required. Copy .env.example to .env and add your key.');
  }

  const catalog = buildCatalog(await fetchCatalog(apiKey));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(catalog)}\n`);
  console.log(`Wrote ${catalog.families.length} static font families to ${output}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
