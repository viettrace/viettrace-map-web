const ADMIN_PREFIX_PATTERN = /^(tinh|thanh pho|tp)\s+/;

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
