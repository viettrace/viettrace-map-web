const ADMIN_PREFIX_PATTERN = /^(tinh|thanh pho|tp)\s+/;
// Search-only prefix list. We DO NOT use this for slug generation because the
// existing slugs intentionally keep prefixes like "huyen-truong-sa" and
// "dac-khu-hoang-sa" so we don't break already-shared URLs.
const SEARCH_ADMIN_PREFIX_PATTERN =
  /^(tinh|thanh pho|tp|thi xa|huyen|quan|dac khu|phuong|xa|thi tran)\s+/;

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeAdministrativeName(value: string) {
  return normalizeSearchText(value).replace(ADMIN_PREFIX_PATTERN, '').trim();
}

// Strip any administrative prefix (province, city, district, ward, special zone, ...).
// Used for search alias generation so that, e.g., "Huyện Trường Sa" (pre) and
// "Đặc khu Trường Sa" (post) both reduce to "truong sa" for cross-era queries.
export function stripAdministrativePrefix(value: string) {
  return normalizeSearchText(value).replace(SEARCH_ADMIN_PREFIX_PATTERN, '').trim();
}
