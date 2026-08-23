import { parse } from 'plist';
import { describe, expect, it } from 'vitest';
import { buildProfile, identifierForFamily } from '../src/profile';

describe('profile generation', () => {
  it('serializes font bytes and Apple font payloads', () => {
    const xml = buildProfile([{
      filename: 'Example-Regular.ttf',
      family: 'Example',
      style: 'normal',
      weight: 400,
      data: new Uint8Array([0, 1, 2, 255]),
    }], { identifier: 'com.example.font.example', displayName: 'Example' });
    const parsed = parse(xml) as Record<string, unknown>;
    const payloads = parsed.PayloadContent as Array<Record<string, unknown>>;
    expect(parsed.PayloadType).toBe('Configuration');
    expect(parsed.PayloadDisplayName).toBe('Example');
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.PayloadType).toBe('com.apple.font');
    expect(Array.from(payloads[0]?.Font as Uint8Array)).toEqual([0, 1, 2, 255]);
  });

  it('creates a safe identifier from a family name', () => {
    expect(identifierForFamily('Noto Sans JP')).toBe('com.example.font.noto-sans-jp');
  });

  it('rejects malformed profile identifiers', () => {
    expect(() => buildProfile([{
      filename: 'Example.ttf', family: 'Example', style: 'normal', weight: 400, data: new Uint8Array([1]),
    }], { identifier: 'not an identifier' })).toThrow('reverse-domain notation');
  });
});
