import { describe, expect, it } from 'vitest';
import { buildLocaleHref, replacePathnameLocale } from './localePath';

describe('localePath', () => {
  it('replaces the existing locale segment', () => {
    expect(replacePathnameLocale('/vi/map', 'en')).toBe('/en/map');
    expect(replacePathnameLocale('/en/data-sources', 'vi')).toBe('/vi/data-sources');
  });

  it('adds a locale segment when the pathname is not localized', () => {
    expect(replacePathnameLocale('/map', 'vi')).toBe('/vi/map');
    expect(replacePathnameLocale('/', 'en')).toBe('/en');
  });

  it('preserves query string and hash when building a localized href', () => {
    expect(
      buildLocaleHref(
        {
          hash: '#details',
          pathname: '/vi/map',
          search: '?mode=post&province=ha-noi',
        },
        'en',
      ),
    ).toBe('/en/map?mode=post&province=ha-noi#details');
  });
});
