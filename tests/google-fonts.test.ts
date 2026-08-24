import { describe, expect, it } from 'vitest';
import { filterFamilies, previewStylesheetUrl } from '../src/google-fonts';
import { buildCatalog, variantFromApi } from '../scripts/build-font-catalog';
import type { GoogleFontFamily } from '../src/types';

describe('Google Fonts catalog', () => {
  it('parses static API variants and upgrades their URLs to HTTPS', () => {
    expect(variantFromApi('700italic', 'http://fonts.gstatic.com/example.ttf')).toMatchObject({
      weight: 700,
      style: 'italic',
      url: 'https://fonts.gstatic.com/example.ttf',
    });
    expect(variantFromApi('unexpected', 'https://fonts.gstatic.com/example.ttf')).toBeNull();
  });

  it('preserves API popularity order and normalizes categories', () => {
    const catalog = buildCatalog({ items: [
      {
        family: 'Popular Sans',
        category: 'sans-serif',
        files: {
          regular: 'https://fonts.gstatic.com/popular-regular.ttf',
          italic: 'https://fonts.gstatic.com/popular-italic.ttf',
        },
      },
      {
        family: 'Another Serif',
        category: 'serif',
        files: { regular: 'https://fonts.gstatic.com/another-regular.ttf' },
      },
    ] });
    expect(catalog.source).toBe('Google Fonts Developer API');
    expect(catalog.families.map(({ family, popularityRank }) => ({ family, popularityRank }))).toEqual([
      { family: 'Popular Sans', popularityRank: 1 },
      { family: 'Another Serif', popularityRank: 2 },
    ]);
    expect(catalog.families[0]).toMatchObject({ category: 'SANS_SERIF' });
    expect(catalog.families[0]?.variants).toHaveLength(2);
  });

  it('filters by query and category', () => {
    const families = [
      { family: 'Example Sans', category: 'SANS_SERIF', popularityRank: 1, variants: [] },
      { family: 'Example Serif', category: 'SERIF', popularityRank: 2, variants: [] },
    ] satisfies GoogleFontFamily[];
    expect(filterFamilies(families, 'sans', 'all')).toHaveLength(1);
    expect(filterFamilies(families, '', 'SERIF')[0]?.family).toBe('Example Serif');
  });

  it('builds a text-optimized CSS preview request in API tuple order', () => {
    const family = {
      family: 'Example Sans',
      category: 'SANS_SERIF',
      popularityRank: 1,
      variants: [
        { filename: 'bold-italic.ttf', url: 'https://fonts.gstatic.com/bold-italic.ttf', style: 'italic', weight: 700, label: 'Bold Italic' },
        { filename: 'regular.ttf', url: 'https://fonts.gstatic.com/regular.ttf', style: 'normal', weight: 400, label: 'Regular' },
        { filename: 'bold.ttf', url: 'https://fonts.gstatic.com/bold.ttf', style: 'normal', weight: 700, label: 'Bold' },
      ],
    } satisfies GoogleFontFamily;
    const url = new URL(previewStylesheetUrl(family));

    expect(url.origin + url.pathname).toBe('https://fonts.googleapis.com/css2');
    expect(url.searchParams.get('family')).toBe('Example Sans:ital,wght@0,400;0,700;1,700');
    expect(url.searchParams.get('text')).toContain('R');
    expect(url.searchParams.get('display')).toBe('swap');
  });
});
