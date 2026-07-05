import { promises as fs } from 'fs';
import path from 'path';
import type { NestedIndex, NestedIndexEntry } from '@src/features/nested-index/nestedIndexTypes';

// Server-side (fs) loader for public/data/nested-index.json (districts pre-2025 / wards post-2025).
// The client uses useNestedIndex(); the province profile (server component) reads the file directly.
let cache: NestedIndex | null = null;

async function load(): Promise<NestedIndex> {
  if (!cache) {
    const filePath = path.join(process.cwd(), 'public/data/nested-index.json');
    cache = JSON.parse(await fs.readFile(filePath, 'utf-8')) as NestedIndex;
  }
  return cache;
}

// Island detection (no new dataset): post-2025 island units are the "Đặc khu …" special zones
// (Cô Tô, Vân Đồn, Phú Quốc, Côn Đảo, Lý Sơn, …). Pre-2025 island districts share their core name
// (Huyện Cô Tô ↔ Đặc khu Cô Tô), so we derive the island core-name set from the post đặc khu list
// instead of hand-maintaining it. Hoàng Sa / Trường Sa are always islands (slug fallback).
const ADMIN_PREFIX = /^(Đặc khu|Thành phố|Thị xã|Thị trấn|Quận|Huyện|Phường|Xã)\s+/;
const SPECIAL_ZONE = /^Đặc khu\b/;
const coreName = (name: string) => name.replace(ADMIN_PREFIX, '').trim();

let islandCores: Set<string> | null = null;
async function getIslandCores(): Promise<Set<string>> {
  if (!islandCores) {
    const data = await load();
    islandCores = new Set(
      data.features
        .filter(f => f.mode === 'post' && SPECIAL_ZONE.test(f.name))
        .map(f => coreName(f.name)),
    );
  }
  return islandCores;
}

function isIslandUnit(entry: NestedIndexEntry, cores: Set<string>): boolean {
  return (
    SPECIAL_ZONE.test(entry.name) ||
    /hoang-sa|truong-sa/.test(entry.slug) ||
    cores.has(coreName(entry.name))
  );
}

export interface ProvinceChildUnit extends NestedIndexEntry {
  isIsland: boolean;
}

export interface ProvinceChildren {
  count: number;
  islandCount: number;
  items: ProvinceChildUnit[];
}

// The child admin units of a province: districts for pre-2025, wards for post-2025.
export async function getProvinceChildren(mode: string, slug: string): Promise<ProvinceChildren> {
  const data = await load();
  const cores = await getIslandCores();
  const items = data.features
    .filter(f => f.mode === mode && f.parentProvinceSlug === slug)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    .map(f => ({ ...f, isIsland: isIslandUnit(f, cores) }));
  const islandCount = items.filter(i => i.isIsland).length;
  return { count: items.length, islandCount, items };
}
