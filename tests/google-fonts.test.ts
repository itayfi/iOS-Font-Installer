import { describe, expect, it } from 'vitest';
import { filterFamilies } from '../src/google-fonts';
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
});
