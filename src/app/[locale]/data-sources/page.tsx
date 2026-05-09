import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { routing } from '@src/libs/i18n/routing';

const OSM_BOUNDARIES_URL = 'https://osm-boundaries.com/';
const GEOBOUNDARIES_URL = 'https://www.geoboundaries.org/';
const REPORT_DATA_ISSUE_URL = 'https://github.com/viettrace/viettrace-map-web/issues/new?template=data_issue.md';

type Locale = (typeof routing.locales)[number];

interface PageProps {
  params: Promise<{ locale: string }>;
}

const copy = {
  vi: {
    title: 'Nguồn dữ liệu',
    description:
      'Viettrace dùng dữ liệu hành chính có nguồn gốc mở để hiển thị ranh giới tỉnh/thành trước và sau đợt sáp nhập tháng 7/2025.',
    backToMap: 'Quay lại bản đồ',
    reportIssue: 'Báo lỗi dữ liệu',
    sections: {
      currentData: 'Dữ liệu đang dùng',
      licenses: 'License và ghi công',
      limitations: 'Giới hạn đã biết',
      updatePolicy: 'Cách cập nhật',
    },
    rows: [
      {
        dataset: 'Ranh giới tỉnh/thành trước 7/2025',
        source: 'OSM-Boundaries, admin level 4',
        use: 'Lớp 63 tỉnh/thành.',
      },
      {
        dataset: 'Ranh giới tỉnh/thành sau 7/2025',
        source: 'OSM-Boundaries, admin level 4, đã lọc các bản ghi historic',
        use: 'Lớp 34 tỉnh/thành.',
      },
      {
        dataset: 'Lớp hiển thị tỉnh/thành',
        source: 'Dữ liệu OSM-Boundaries đã xử lý bằng script của Viettrace',
        use: 'Loại bỏ phần Trường Sa bị trùng trong geometry Khánh Hòa để tránh chồng lấn với lớp đảo ngoài khơi.',
      },
      {
        dataset: 'Hoàng Sa và Trường Sa',
        source: 'geoBoundaries ADM2',
        use: 'Lớp tham chiếu đảo ngoài khơi, tách riêng khỏi dữ liệu tỉnh/thành.',
      },
    ],
    tableHeaders: {
      dataset: 'Bộ dữ liệu',
      source: 'Nguồn',
      use: 'Cách dùng trên Viettrace',
    },
    licenses: [
      'Dữ liệu có nguồn gốc OpenStreetMap được ghi công bằng “© OpenStreetMap contributors” trong giao diện bản đồ.',
      'Dữ liệu Hoàng Sa và Trường Sa từ geoBoundaries được ghi công bằng “© geoBoundaries www.geoboundaries.org”.',
      'Viettrace giữ dữ liệu gốc và dữ liệu đã xử lý tách riêng để phục vụ kiểm tra và truy vết thay đổi.',
    ],
    limitations: [
      'Dữ liệu OSM-Boundaries có thể chưa hoàn toàn chính xác ở mọi khu vực.',
      'Hoàng Sa không có geometry admin-level-4 phù hợp trong export OSM-Boundaries hiện tại, nên đang dùng lớp tham chiếu riêng từ geoBoundaries ADM2.',
      'Ranh giới Trường Sa trong dữ liệu OSM-derived của Khánh Hòa được loại khỏi lớp hiển thị để tránh chồng lấn, nhưng dữ liệu gốc vẫn được giữ để audit.',
    ],
    updatePolicy:
      'Các lỗi về ranh giới, tên tỉnh/thành, metadata sáp nhập hoặc vị trí label nên được gửi qua issue template để có bằng chứng, vị trí và ngữ cảnh rõ ràng trước khi cập nhật dữ liệu.',
  },
  en: {
    title: 'Data Sources',
    description:
      'Viettrace uses open administrative-boundary datasets to show Vietnam province/city boundaries before and after the July 2025 merger.',
    backToMap: 'Back to map',
    reportIssue: 'Report data issue',
    sections: {
      currentData: 'Current Data',
      licenses: 'Licenses And Attribution',
      limitations: 'Known Limitations',
      updatePolicy: 'Update Policy',
    },
    rows: [
      {
        dataset: 'Pre-July-2025 province/city boundaries',
        source: 'OSM-Boundaries, admin level 4',
        use: 'The 63-province layer.',
      },
      {
        dataset: 'Post-July-2025 province/city boundaries',
        source: 'OSM-Boundaries, admin level 4, with historic records filtered out',
        use: 'The 34-province layer.',
      },
      {
        dataset: 'Display province layers',
        source: 'OSM-Boundaries data processed by Viettrace scripts',
        use: 'Removes the Truong Sa overlap from the Khanh Hoa geometry so it does not collide with the offshore-islands layer.',
      },
      {
        dataset: 'Hoang Sa and Truong Sa',
        source: 'geoBoundaries ADM2',
        use: 'Separate offshore-islands reference layer, not merged into the province/city datasets.',
      },
    ],
    tableHeaders: {
      dataset: 'Dataset',
      source: 'Source',
      use: 'Use In Viettrace',
    },
    licenses: [
      'OpenStreetMap-derived data is attributed as “© OpenStreetMap contributors” in the map UI.',
      'Hoang Sa and Truong Sa data from geoBoundaries is attributed as “© geoBoundaries www.geoboundaries.org”.',
      'Viettrace keeps raw and processed data separate so changes can be audited and traced.',
    ],
    limitations: [
      'OSM-Boundaries data may not be perfectly accurate in every area.',
      'Hoang Sa does not have suitable admin-level-4 geometry in the current OSM-Boundaries export, so Viettrace uses a separate geoBoundaries ADM2 reference layer.',
      'Truong Sa geometry from the OSM-derived Khanh Hoa province feature is removed from the display layer to avoid overlap, while the original source data is preserved for audit.',
    ],
    updatePolicy:
      'Boundary, name, merger-metadata, and label-placement corrections should be reported through the issue template with clear evidence, location, and context before data is updated.',
  },
} satisfies Record<Locale, {
  title: string;
  description: string;
  backToMap: string;
  reportIssue: string;
  sections: Record<'currentData' | 'licenses' | 'limitations' | 'updatePolicy', string>;
  rows: Array<{ dataset: string; source: string; use: string }>;
  tableHeaders: Record<'dataset' | 'source' | 'use', string>;
  licenses: string[];
  limitations: string[];
  updatePolicy: string;
}>;

export default async function DataSourcesPage({ params }: PageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = copy[locale];

  return (
    <main className="min-h-dvh bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-8">
          <Link
            href={`/${locale}/map`}
            className="w-fit rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100"
          >
            {t.backToMap}
          </Link>
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">{t.title}</h1>
            <p className="mt-3 text-base leading-7 text-slate-700">{t.description}</p>
          </div>
        </header>

        <section className="overflow-hidden">
          <h2 className="text-xl font-semibold text-slate-950">{t.sections.currentData}</h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.tableHeaders.dataset}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.tableHeaders.source}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t.tableHeaders.use}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {t.rows.map((row) => (
                  <tr key={row.dataset}>
                    <td className="px-4 py-3 align-top font-medium text-slate-950">{row.dataset}</td>
                    <td className="px-4 py-3 align-top text-slate-700">{row.source}</td>
                    <td className="px-4 py-3 align-top text-slate-700">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">{t.sections.licenses}</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            {t.licenses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <a
              href={OSM_BOUNDARIES_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100"
            >
              OSM-Boundaries
            </a>
            <a
              href={GEOBOUNDARIES_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100"
            >
              geoBoundaries
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">{t.sections.limitations}</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            {t.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="border-t border-slate-200 pt-8">
          <h2 className="text-xl font-semibold text-slate-950">{t.sections.updatePolicy}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-700">{t.updatePolicy}</p>
          <a
            href={REPORT_DATA_ISSUE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            {t.reportIssue}
          </a>
        </section>
      </div>
    </main>
  );
}
