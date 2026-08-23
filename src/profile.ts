import { build } from 'plist';
import type { FontAsset, ProfileOptions } from './types';

function uuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().toUpperCase();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  }).toUpperCase();
}

export function randomIdentifier(): string {
  const suffix = Array.from({ length: 6 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `com.example.font-${suffix}`;
}

export function identifierForFamily(family: string): string {
  const slug = family.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `com.example.font.${slug || 'custom'}`;
}

function identifierComponent(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'font';
}

export function buildProfile(fonts: FontAsset[], options: ProfileOptions): string {
  if (fonts.length === 0) {
    throw new Error('At least one font is required.');
  }
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(options.identifier)) {
    throw new Error('The profile identifier must use reverse-domain notation, such as com.example.font-name.');
  }

  const profile: Record<string, unknown> = {
    PayloadContent: fonts.map((font, index) => ({
      Font: font.data,
      PayloadIdentifier: `${options.identifier}.${identifierComponent(font.filename)}.${index + 1}`,
      PayloadType: 'com.apple.font',
      PayloadUUID: uuid(),
      PayloadVersion: 1,
    })),
    PayloadIdentifier: options.identifier,
    PayloadType: 'Configuration',
    PayloadUUID: uuid(),
    PayloadVersion: 1,
  };

  if (options.displayName) profile.PayloadDisplayName = options.displayName;
  if (options.description) profile.PayloadDescription = options.description;

  return build(profile as Parameters<typeof build>[0]);
}

export function downloadProfile(profile: string, filename = 'font.mobileconfig'): void {
  const url = URL.createObjectURL(new Blob([profile], { type: 'application/x-apple-aspen-config' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
