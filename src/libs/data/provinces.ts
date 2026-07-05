import { promises as fs } from 'fs';
import path from 'path';
import type {
  ProvinceIndex,
  ProvinceIndexEntry,
} from '@src/features/province-index/provinceIndexTypes';

// Server-side (fs) loader for public/data/province-index.json. The client uses
// useProvinceIndex()/fetch; server components (e.g. the province profile route
// + its generateStaticParams) read the file directly. Cached per process.
let cache: ProvinceIndex | null = null;

async function load(): Promise<ProvinceIndex> {
  if (!cache) {
    const filePath = path.join(process.cwd(), 'public/data/province-index.json');
    cache = JSON.parse(await fs.readFile(filePath, 'utf-8')) as ProvinceIndex;
  }
  return cache;
}

export async function getProvinceEntries(): Promise<ProvinceIndexEntry[]> {
  return (await load()).provinces;
}

export async function getProvinceEntry(
  mode: string,
  slug: string,
): Promise<ProvinceIndexEntry | null> {
  const provinces = await getProvinceEntries();
  return provinces.find(p => p.mode === mode && p.slug === slug) ?? null;
}

// Resolve a Vietnamese province name (as stored in merger.newProvince /
// merger.oldProvinces) to its entry in a given mode.
export async function findProvinceByName(
  mode: 'pre' | 'post',
  name: string,
): Promise<ProvinceIndexEntry | null> {
  const provinces = await getProvinceEntries();
  return provinces.find(p => p.mode === mode && p.name === name) ?? null;
}
