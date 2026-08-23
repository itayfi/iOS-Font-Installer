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

  it('builds a catalog and normalizes API categories', () => {
    const catalog = buildCatalog({ items: [{
      family: 'Example Sans',
      category: 'sans-serif',
      files: {
        regular: 'https://fonts.gstatic.com/regular.ttf',
        italic: 'https://fonts.gstatic.com/italic.ttf',
      },
    }] });
    expect(catalog.source).toBe('Google Fonts Developer API');
    expect(catalog.families[0]).toMatchObject({ family: 'Example Sans', category: 'SANS_SERIF' });
    expect(catalog.families[0]?.variants).toHaveLength(2);
  });

  it('filters by query and category', () => {
    const families = [
      { family: 'Example Sans', category: 'SANS_SERIF', variants: [] },
      { family: 'Example Serif', category: 'SERIF', variants: [] },
    ] satisfies GoogleFontFamily[];
    expect(filterFamilies(families, 'sans', 'all')).toHaveLength(1);
    expect(filterFamilies(families, '', 'SERIF')[0]?.family).toBe('Example Serif');
  });
});
