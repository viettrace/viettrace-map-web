'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import AddressResultMap from './AddressResultMap';
import {
  buildSelectionQuery,
  findDistrict,
  formatNewAddress,
  formatOldAddress,
  parseSelection,
  provinceFileUrl,
  resolveSelection,
  type AddressIndex,
  type AddressProvinceFile,
  type AddressResult,
} from './addressConversion';

interface Props {
  index: AddressIndex;
  locale: string;
}

export default function AddressConverterView({ index, locale }: Props) {
  const t = useTranslations('AddressConverter');
  const isEn = locale === 'en';

  const [provinceCode, setProvinceCode] = useState<string | null>(null);
  const [file, setFile] = useState<AddressProvinceFile | null>(null);
  const [districtCode, setDistrictCode] = useState<string | null>(null);
  const [wardCode, setWardCode] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState(false);

  const hydratedRef = useRef(false);
  // On hydrate, the selected d/w belong to the province being loaded; apply them once the file lands.
  const pendingRef = useRef<{ d: string | null; w: string | null } | null>(null);

  // Hydrate the selection from the shareable URL once, on mount.
  useEffect(() => {
    const sel = parseSelection(new URLSearchParams(window.location.search));
    if (sel.p) {
      pendingRef.current = { d: sel.d, w: sel.w };
      setProvinceCode(sel.p);
    }
    hydratedRef.current = true;
  }, []);

  // Load the per-province ward file whenever the province changes.
  useEffect(() => {
    if (!provinceCode) {
      setFile(null);
      return;
    }
    const controller = new AbortController();
    setIsLoadingFile(true);
    setFileError(false);
    fetch(provinceFileUrl(provinceCode), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as AddressProvinceFile;
      })
      .then(loaded => {
        setFile(loaded);
        setIsLoadingFile(false);
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) {
          if (pending.d) setDistrictCode(pending.d);
          if (pending.w) setWardCode(pending.w);
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFile(null);
        setIsLoadingFile(false);
        setFileError(true);
      });
    return () => controller.abort();
  }, [provinceCode]);

  // Keep the URL in sync (shareable), but never before the initial hydrate has run.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const query = buildSelectionQuery({ p: provinceCode, d: districtCode, w: wardCode });
    window.history.replaceState(null, '', window.location.pathname + query + window.location.hash);
  }, [provinceCode, districtCode, wardCode]);

  const district = findDistrict(file, districtCode);
  const resolved = resolveSelection(file, districtCode, wardCode);

  const onProvinceChange = (code: string) => {
    setProvinceCode(code || null);
    setDistrictCode(null);
    setWardCode(null);
  };
  const onDistrictChange = (code: string) => {
    setDistrictCode(code || null);
    setWardCode(null);
  };

  const mapHref = (r: AddressResult) => {
    const base = `/${locale}/map?mode=post&province=${r.newProvinceSlug}`;
    return r.lat !== null && r.lon !== null ? `${base}&lat=${r.lat}&lng=${r.lon}&z=12` : base;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}`}
            className="group inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {t('backToMap')}
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl dark:text-slate-100">
            {t('title')}
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">{t('subtitle')}</p>
        </div>

        {/* Picker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('provinceLabel')}>
              <select
                value={provinceCode ?? ''}
                onChange={e => onProvinceChange(e.target.value)}
                className={selectClass}
              >
                <option value="">{t('provincePlaceholder')}</option>
                {index.provinces.map(p => (
                  <option key={p.code} value={p.code}>
                    {isEn ? p.name_en : p.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('districtLabel')}>
              <select
                value={districtCode ?? ''}
                onChange={e => onDistrictChange(e.target.value)}
                disabled={!file || isLoadingFile}
                className={selectClass}
              >
                <option value="">
                  {isLoadingFile ? t('loading') : t('districtPlaceholder')}
                </option>
                {file?.districts.map(d => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('wardLabel')}>
              <select
                value={wardCode ?? ''}
                onChange={e => setWardCode(e.target.value || null)}
                disabled={!district || district.isIsland}
                className={selectClass}
              >
                <option value="">{t('wardPlaceholder')}</option>
                {district?.wards.map(w => (
                  <option key={w.code} value={w.code}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {district?.isIsland && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              {t('islandNote')}
            </p>
          )}
          {fileError && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{t('loadError')}</p>
          )}
        </div>

        {/* Result */}
        <div className="mt-6">
          {!resolved ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              {t('emptyState')}
            </p>
          ) : (
            <ResultCard
              resolved={resolved}
              province={file!}
              t={t}
              mapHref={mapHref}
            />
          )}
        </div>

        {/* Data source */}
        <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">
            {t('dataSourceTitle')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('dataSourceContent')}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">{t('disclaimer')}</p>
        </section>
      </div>
    </main>
  );
}

function ResultCard({
  resolved,
  province,
  t,
  mapHref,
}: {
  resolved: NonNullable<ReturnType<typeof resolveSelection>>;
  province: AddressProvinceFile;
  t: ReturnType<typeof useTranslations>;
  mapHref: (r: AddressResult) => string;
}) {
  const { district, ward, results, isDivided } = resolved;
  const oldAddress = formatOldAddress(province, district, ward);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {t('oldAddressLabel')}
        </div>
        <div className="mt-1 text-base font-medium text-slate-700 dark:text-slate-200">
          {oldAddress}
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="text-xs font-medium tracking-wide text-blue-600 uppercase dark:text-blue-400">
          {t('newAddressLabel')}
        </div>

        {isDivided && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {t('dividedNote', { name: ward?.name ?? '', count: results.length })}
          </p>
        )}

        <ul className="mt-3 space-y-3">
          {results.map((r, i) => (
            <li
              key={r.newWardCode}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
            >
              <div>
                {isDivided && (
                  <span className="mr-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {t('candidateBadge', { n: i + 1 })}
                  </span>
                )}
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatNewAddress(r)}
                </span>
                {r.areaKm2 !== null && (
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    {t('areaLabel')}: {r.areaKm2.toLocaleString('vi-VN')} km²
                  </span>
                )}
              </div>
              <Link
                href={mapHref(r)}
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                {t('viewOnMap')}
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <AddressResultMap results={results} />
        </div>
      </div>
    </div>
  );
}

const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800/50';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}
