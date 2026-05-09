import { normalizeAdministrativeName } from './normalize';

export function createSlug(value: string) {
  return normalizeAdministrativeName(value).replace(/\s+/g, '-');
}
