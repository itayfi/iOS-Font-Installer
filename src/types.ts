export type FontStyle = 'normal' | 'italic';

export interface FontAsset {
  filename: string;
  family: string;
  style: FontStyle;
  weight: number;
  data: Uint8Array;
}

export interface GoogleFontVariant {
  filename: string;
  url: string;
  style: FontStyle;
  weight: number;
  label: string;
}

export interface GoogleFontFamily {
  family: string;
  category: string;
  popularityRank: number;
  variants: GoogleFontVariant[];
}

export interface GoogleFontCatalog {
  generatedAt: string;
  source: string;
  families: GoogleFontFamily[];
}

export interface ProfileOptions {
  displayName?: string;
  description?: string;
  identifier: string;
}
