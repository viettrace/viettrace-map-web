import { promises as fs } from 'fs';
import path from 'path';

/**
 * Province entry from province-index.json
 */
type ProvinceEntry = {
  id: string;
  mode: 'pre' | 'post';
  name: string;
  name_en: string;
  slug: string;
  merger?: {
    mergeDate: string;
    newProvince?: string; // for pre entries: where this province went
    oldProvinces?: string[]; // for post entries: which provinces were absorbed into it
  };
};

type ProvinceIndex = {
  provinces: ProvinceEntry[];
};

/**
 * One merger case: a post-2025 province formed by combining provinces.
 */
export type MergerCase = {
  resultName: string; // The new (post-2025) province name
  resultSlug: string; // Post province slug, for deep-linking to the map
  components: string[]; // All pre-2025 provinces that form it (survivor first, then absorbed)
  componentCount: number; // Total number of pre-2025 provinces combined
  mergeDate?: string; // ISO date string from merger metadata (e.g. "2025-07-01")
};

/**
 * Aggregated, human-readable statistics about the 2025 merger.
 *
 * Source of truth: province-index.json (pre = 63, post = 34).
 * - A pre province with a `merger` field was absorbed away (no longer exists).
 * - A post province with a `merger.oldProvinces` field absorbed others (expanded).
 * - A post province without a `merger` field is truly unchanged.
 */
export type MergerStats = {
  preCount: number; // 63
  postCount: number; // 34

  unchanged: number; // Provinces that stayed exactly the same (e.g. 11)
  unchangedList: string[];

  expanded: number; // Surviving provinces that absorbed others (e.g. 23)
  expandedList: string[];

  absorbed: number; // Pre provinces that were absorbed away (e.g. 29)
  absorbedList: string[];

  // Full name lists for the before/after comparison view.
  beforeList: string[]; // All 63 pre-2025 province names
  afterList: string[]; // All 34 post-2025 province names

  // Distribution of new units by how many pre-provinces they combine.
  // e.g. { 1: 11, 2: 17, 3: 6 }
  scale: Record<number, number>;

  // The biggest mergers (most pre-provinces combined), for highlighting.
  biggestMergers: MergerCase[];

  // Every actual merger case (post provinces that combined >1 province).
  mergers: MergerCase[];
};

async function loadProvinceIndex(): Promise<ProvinceIndex> {
  const filePath = path.join(process.cwd(), 'public/data/province-index.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

export async function getMergerStats(locale: string = 'vi'): Promise<MergerStats> {
  const { provinces } = await loadProvinceIndex();
  const pre = provinces.filter((p) => p.mode === 'pre');
  const post = provinces.filter((p) => p.mode === 'post');

  const useEn = locale === 'en';
  const sortLocale = useEn ? 'en' : 'vi';

  // Build lookup: Vietnamese name → English name (needed because merger.oldProvinces
  // stores Vietnamese names and we need to resolve them to the right locale).
  const viNameToEn = new Map<string, string>();
  for (const p of provinces) {
    viNameToEn.set(p.name, p.name_en);
  }

  function entryDisplayName(p: ProvinceEntry): string {
    return useEn ? p.name_en : p.name;
  }

  function resolveDisplayName(viName: string): string {
    if (!useEn) return viName;
    return viNameToEn.get(viName) ?? viName;
  }

  // Pre provinces absorbed away = those with a merger field pointing elsewhere.
  const absorbedList = pre
    .filter((p) => p.merger)
    .map(entryDisplayName)
    .sort((a, b) => a.localeCompare(b, sortLocale));

  // Post provinces that absorbed others = have merger.oldProvinces.
  const expandedList = post
    .filter((p) => p.merger?.oldProvinces && p.merger.oldProvinces.length > 0)
    .map(entryDisplayName)
    .sort((a, b) => a.localeCompare(b, sortLocale));

  // Post provinces with no merger = truly unchanged.
  const unchangedList = post
    .filter((p) => !p.merger?.oldProvinces || p.merger.oldProvinces.length === 0)
    .map(entryDisplayName)
    .sort((a, b) => a.localeCompare(b, sortLocale));

  // Build merger cases (only post provinces that actually combined >1 province).
  const mergers: MergerCase[] = post
    .filter((p) => p.merger?.oldProvinces && p.merger.oldProvinces.length > 0)
    .map((p) => {
      const absorbed = p.merger?.oldProvinces ?? [];
      // Survivor name first, then the provinces it absorbed.
      const components = [entryDisplayName(p), ...absorbed.map(resolveDisplayName)];
      return {
        resultName: entryDisplayName(p),
        resultSlug: p.slug,
        components,
        componentCount: components.length,
        mergeDate: p.merger?.mergeDate,
      };
    })
    .sort((a, b) => {
      if (b.componentCount !== a.componentCount) return b.componentCount - a.componentCount;
      return a.resultName.localeCompare(b.resultName, sortLocale);
    });

  // Distribution by total component count across ALL post provinces.
  const scale: Record<number, number> = {};
  for (const p of post) {
    const absorbed = p.merger?.oldProvinces?.length ?? 0;
    const components = absorbed + 1; // itself + absorbed
    scale[components] = (scale[components] || 0) + 1;
  }

  const maxComponents = Math.max(...mergers.map((m) => m.componentCount), 0);
  const biggestMergers = mergers.filter((m) => m.componentCount === maxComponents);

  const beforeList = pre.map(entryDisplayName).sort((a, b) => a.localeCompare(b, sortLocale));
  const afterList = post.map(entryDisplayName).sort((a, b) => a.localeCompare(b, sortLocale));

  return {
    preCount: pre.length,
    postCount: post.length,
    unchanged: unchangedList.length,
    unchangedList,
    expanded: expandedList.length,
    expandedList,
    absorbed: absorbedList.length,
    absorbedList,
    beforeList,
    afterList,
    scale,
    biggestMergers,
    mergers,
  };
}
