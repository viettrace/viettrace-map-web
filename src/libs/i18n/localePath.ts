import { routing } from './routing';

export type SupportedLocale = (typeof routing.locales)[number];

interface LocationParts {
  hash?: string;
  pathname: string;
  search?: string;
}

export function replacePathnameLocale(pathname: string, targetLocale: SupportedLocale) {
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (normalizedPathname === '/') {
    return `/${targetLocale}`;
  }

  const segments = normalizedPathname.split('/');
  const currentLocale = segments[1];

  if (currentLocale && isSupportedLocale(currentLocale)) {
    segments[1] = targetLocale;
  } else {
    segments.splice(1, 0, targetLocale);
  }

  return segments.join('/');
}

export function buildLocaleHref(location: LocationParts, targetLocale: SupportedLocale) {
  return [
    replacePathnameLocale(location.pathname, targetLocale),
    normalizeSearchOrHash(location.search, '?'),
    normalizeSearchOrHash(location.hash, '#'),
  ].join('');
}

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return routing.locales.includes(locale as SupportedLocale);
}

function normalizeSearchOrHash(value: string | undefined, prefix: '?' | '#') {
  if (!value) {
    return '';
  }

  return value.startsWith(prefix) ? value : `${prefix}${value}`;
}
