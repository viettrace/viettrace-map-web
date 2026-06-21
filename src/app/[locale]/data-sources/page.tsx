import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import MapLanguageSwitch from '@src/components/Map/MapLanguageSwitch';
import { Link } from '@src/libs/i18n/navigation';
import { routing } from '@src/libs/i18n/routing';

const OSM_URL = 'https://www.openstreetmap.org/';
const REPORT_DATA_ISSUE_URL =
  'https://github.com/viettrace/viettrace-map-web/issues/new?template=data_issue.md';

type Locale = (typeof routing.locales)[number];

interface PageProps {
  params: Promise<{ locale: string }>;
}

interface SourceEntry {
  name: string;
  description: string;
  license: string;
  url: string;
}

const copy = {
  vi: {
    title: 'Nguồn dữ liệu',
    description:
      'Ranh giới hành chính trên Viettrace được tổng hợp từ các nguồn dữ liệu mở và cập nhật theo đợt sáp nhập hành chính tháng 7/2025.',
    backToMap: 'Quay lại bản đồ',
    sourcesTitle: 'Dữ liệu đến từ đâu?',
    sources: [
      {
        name: 'OpenStreetMap',
        description:
          'Bản đồ cộng đồng do hàng triệu tình nguyện viên toàn cầu đóng góp và duy trì. Viettrace dùng dữ liệu ranh giới tỉnh/thành, quận/huyện và phường/xã từ nguồn này.',
        license: 'ODbL',
        url: OSM_URL,
      },
    ] as SourceEntry[],
    accuracyTitle: 'Về độ chính xác',
    accuracy: [
      'Ranh giới hiển thị mang tính tham khảo và không phải tài liệu pháp lý chính thức.',
      'Thông tin quận/huyện và phường/xã có thể chưa đầy đủ ở một số khu vực.',
      'Hoàng Sa và Trường Sa được hiển thị theo dữ liệu OpenStreetMap.',
    ],
    reportTitle: 'Phát hiện lỗi?',
    reportDescription:
      'Nếu thấy ranh giới sai, tên không đúng hoặc thiếu thông tin, vui lòng báo cáo để chúng tôi cải thiện.',
    reportIssue: 'Báo lỗi dữ liệu',
  },
  en: {
    title: 'Data Sources',
    description:
      'Administrative boundaries on Viettrace are compiled from open datasets and updated to reflect the July 2025 administrative merger.',
    backToMap: 'Back to map',
    sourcesTitle: 'Where does the data come from?',
    sources: [
      {
        name: 'OpenStreetMap',
        description:
          'A community-built map maintained by millions of volunteers worldwide. Viettrace uses province, district, and ward boundary data from this source.',
        license: 'ODbL',
        url: OSM_URL,
      },
    ] as SourceEntry[],
    accuracyTitle: 'About accuracy',
    accuracy: [
      'Displayed boundaries are approximate and not official legal documents.',
      'District and ward data may be incomplete in some areas.',
      'Hoang Sa and Truong Sa are displayed based on OpenStreetMap data.',
    ],
    reportTitle: 'Found an issue?',
    reportDescription:
      'If you spot a boundary error, incorrect name, or missing information, please report it so we can improve.',
    reportIssue: 'Report data issue',
  },
} satisfies Record<
  Locale,
  {
    title: string;
    description: string;
    backToMap: string;
    sourcesTitle: string;
    sources: SourceEntry[];
    accuracyTitle: string;
    accuracy: string[];
    reportTitle: string;
    reportDescription: string;
    reportIssue: string;
  }
>;

export default async function DataSourcesPage({ params }: PageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = copy[locale];

  return (
    <main className="min-h-dvh bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/map"
              locale={locale}
              className="w-fit rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100"
            >
              {t.backToMap}
            </Link>
            <MapLanguageSwitch fallbackPathname="/data-sources" />
          </div>
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              {t.title}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-700">{t.description}</p>
          </div>
        </header>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">{t.sourcesTitle}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {t.sources.map(source => (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-semibold text-slate-950 group-hover:text-blue-700 transition-colors">
                    {source.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {source.license}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-700">{source.description}</p>
              </a>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-950">{t.accuracyTitle}</h2>
          <ul className="mt-4 space-y-2">
            {t.accuracy.map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-slate-200 pt-8">
          <h2 className="text-xl font-semibold text-slate-950">{t.reportTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">{t.reportDescription}</p>
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
