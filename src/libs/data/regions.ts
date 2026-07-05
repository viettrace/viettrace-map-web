import { promises as fs } from 'fs';
import path from 'path';

// Server-side (fs) loader for public/data/regional-classification.json. The
// existing src/types/regional-classification.ts loads via browser fetch (client
// only), so server components need this fs-based reader. `provinceToRegion` keys
// resolve for both pre and post slugs (a post survivor shares the pre slug).

interface RegionalClassificationFile {
  regions: Record<string, { name_vi: string; name_en: string; provinces: string[] }>;
  provinceToRegion: Record<string, string>;
}

export interface RegionMeta {
  key: string;
  name_vi: string;
  name_en: string;
}

let cache: RegionalClassificationFile | null = null;

async function load(): Promise<RegionalClassificationFile> {
  if (!cache) {
    const filePath = path.join(process.cwd(), 'public/data/regional-classification.json');
    cache = JSON.parse(await fs.readFile(filePath, 'utf-8')) as RegionalClassificationFile;
  }
  return cache;
}

export async function getProvinceRegion(slug: string): Promise<RegionMeta | null> {
  const data = await load();
  const key = data.provinceToRegion[slug];
  if (!key) return null;
  const def = data.regions[key];
  if (!def) return null;
  return { key, name_vi: def.name_vi, name_en: def.name_en };
}

// slug → region key (present for both pre and post slugs; a post survivor shares its pre slug).
export async function getProvinceToRegion(): Promise<Record<string, string>> {
  return (await load()).provinceToRegion;
}
