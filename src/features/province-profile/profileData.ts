import type { ProvinceIndexEntry } from '@src/features/province-index/provinceIndexTypes';
import {
  getProvinceGeography,
  type Direction,
  type ProvinceBorder,
} from '@src/libs/data/geography';
import { getProvinceChildren } from '@src/libs/data/nested';
import { findProvinceByName, getProvinceEntries, getProvinceEntry } from '@src/libs/data/provinces';
import { getProvinceRegion, getProvinceToRegion, type RegionMeta } from '@src/libs/data/regions';
import {
  getProvinceStatEntry,
  getProvinceStatistics,
  type ProvinceStatEntryRaw,
} from '@src/libs/data/stats';

export interface RelatedProvince {
  mode: 'pre' | 'post';
  slug: string;
  name: string;
  name_en: string;
}

export interface NeighborLink {
  direction: Direction;
  province: RelatedProvince;
}

export interface ChildUnit {
  name: string;
  name_en: string;
  isIsland: boolean;
}

export interface StatRank {
  rank: number;
  total: number;
  sharePct: number | null; // null when a national share is not meaningful (density)
}

export interface ProvinceRanks {
  population: StatRank | null;
  area: StatRank | null;
  density: StatRank | null;
  grdp: StatRank | null;
}

// The province's place in the 2025 merger, with resolved cross-links to related profiles.
export type MergerRelation =
  | { kind: 'absorbed'; mergeDate?: string; target: RelatedProvince }
  | { kind: 'continued'; target: RelatedProvince }
  | { kind: 'expanded'; mergeDate?: string; components: RelatedProvince[] }
  | { kind: 'unchanged'; origin: RelatedProvince | null };

export interface ProvinceProfile {
  entry: ProvinceIndexEntry;
  region: RegionMeta | null;
  regionPeers: RelatedProvince[];
  stats: ProvinceStatEntryRaw | null;
  ranks: ProvinceRanks;
  merger: MergerRelation;
  neighbors: NeighborLink[];
  borders: ProvinceBorder[];
  coastline: { hasCoastline: boolean; km: number } | null;
  children: { type: 'district' | 'ward'; count: number; islandCount: number; items: ChildUnit[] };
}

function toRelated(entry: ProvinceIndexEntry): RelatedProvince {
  return { mode: entry.mode, slug: entry.slug, name: entry.name, name_en: entry.name_en };
}

export async function getProvinceProfile(
  mode: 'pre' | 'post',
  slug: string,
): Promise<ProvinceProfile | null> {
  const entry = await getProvinceEntry(mode, slug);
  if (!entry) return null;

  const [region, stats, geo, childrenRaw, allStats, provinceToRegion, allEntries] =
    await Promise.all([
      getProvinceRegion(slug),
      getProvinceStatEntry(mode, slug),
      getProvinceGeography(mode, slug),
      getProvinceChildren(mode, slug),
      getProvinceStatistics('vi'), // locale irrelevant — only numbers used for ranking
      getProvinceToRegion(),
      getProvinceEntries(),
    ]);

  // ---- merger relation (cross-linked to related profiles) ----
  let merger: MergerRelation;
  if (mode === 'pre') {
    if (entry.merger?.newProvince) {
      const target = await findProvinceByName('post', entry.merger.newProvince);
      merger = target
        ? { kind: 'absorbed', mergeDate: entry.merger.mergeDate, target: toRelated(target) }
        : { kind: 'unchanged', origin: null };
    } else {
      const post = allEntries.find(e => e.mode === 'post' && e.slug === slug);
      merger = post
        ? { kind: 'continued', target: toRelated(post) }
        : { kind: 'unchanged', origin: null };
    }
  } else {
    const componentSlugs = stats?.components ?? [];
    if (componentSlugs.length > 1) {
      const preBySlug = new Map(allEntries.filter(e => e.mode === 'pre').map(e => [e.slug, e]));
      const components = componentSlugs
        .map(s => preBySlug.get(s))
        .filter((e): e is ProvinceIndexEntry => Boolean(e))
        .map(toRelated);
      merger = { kind: 'expanded', mergeDate: entry.merger?.mergeDate, components };
    } else {
      const pre = allEntries.find(e => e.mode === 'pre' && e.slug === slug);
      merger = { kind: 'unchanged', origin: pre ? toRelated(pre) : null };
    }
  }

  // ---- national rank + share per indicator ----
  const arr = allStats[mode];
  const me = arr.find(r => r.slug === slug);
  const rankShare = (
    metric: 'population' | 'area' | 'density' | 'grdp',
    nationalTotal: number,
  ): StatRank | null => {
    if (!me) return null;
    const value = me[metric] as number;
    const rank =
      [...arr]
        .sort((a, b) => (b[metric] as number) - (a[metric] as number))
        .findIndex(r => r.slug === slug) + 1;
    const sharePct = nationalTotal > 0 ? Math.round((value / nationalTotal) * 1000) / 10 : null;
    return { rank, total: arr.length, sharePct };
  };
  const ranks: ProvinceRanks = {
    population: rankShare('population', allStats.nationalPopulation),
    area: rankShare('area', allStats.nationalArea),
    density: rankShare('density', 0), // rank only — share of national density is meaningless
    grdp: rankShare('grdp', allStats.nationalGrdp),
  };

  // ---- neighbors (resolved to profiles) ----
  const neighbors: NeighborLink[] = [];
  for (const n of geo?.neighbors ?? []) {
    const p = allEntries.find(e => e.mode === mode && e.slug === n.slug);
    if (p) neighbors.push({ direction: n.direction, province: toRelated(p) });
  }

  // ---- region peers (same mode, same economic region) ----
  const myRegion = provinceToRegion[slug];
  const regionPeers = myRegion
    ? allEntries
        .filter(e => e.mode === mode && e.slug !== slug && provinceToRegion[e.slug] === myRegion)
        .map(toRelated)
    : [];

  // ---- child units ----
  const children = {
    type: (mode === 'pre' ? 'district' : 'ward') as 'district' | 'ward',
    count: childrenRaw.count,
    islandCount: childrenRaw.islandCount,
    items: childrenRaw.items.map(c => ({
      name: c.name,
      name_en: c.name_en,
      isIsland: c.isIsland,
    })),
  };

  return {
    entry,
    region,
    regionPeers,
    stats,
    ranks,
    merger,
    neighbors,
    borders: geo?.borders ?? [],
    coastline: geo ? { hasCoastline: geo.hasCoastline, km: geo.coastlineKm } : null,
    children,
  };
}
