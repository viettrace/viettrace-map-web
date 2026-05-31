'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { buildLocaleHref, type SupportedLocale } from '@src/libs/i18n/localePath';

const languageOptions: Array<{
  label: string;
  locale: SupportedLocale;
  nameKey: 'languageEnglish' | 'languageVietnamese';
}> = [
  {
    label: 'VI',
    locale: 'vi',
    nameKey: 'languageVietnamese',
  },
  {
    label: 'EN',
    locale: 'en',
    nameKey: 'languageEnglish',
  },
];

interface MapLanguageSwitchProps {
  fallbackPathname?: string;
  // 'panel' = desktop unified control panel row, no own background/border.
  variant?: 'segmented' | 'toolbar' | 'panel';
}

export default function MapLanguageSwitch({
  fallbackPathname = '/map',
  variant = 'segmented',
}: MapLanguageSwitchProps) {
  const currentLocale = useLocale();
  const router = useRouter();
  const t = useTranslations('Map');
  const normalizedFallbackPathname = fallbackPathname.startsWith('/')
    ? fallbackPathname
    : `/${fallbackPathname}`;

  function handleLocaleClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    targetLocale: SupportedLocale,
  ) {
    event.preventDefault();

    if (targetLocale === currentLocale) {
      return;
    }

    const nextHref = buildLocaleHref(
      {
        hash: window.location.hash,
        pathname: window.location.pathname,
        search: window.location.search,
      },
      targetLocale,
    );

    router.push(nextHref);
  }

  const navClassName = (() => {
    if (variant === 'toolbar') {
      return 'flex flex-col items-stretch gap-1';
    }
    if (variant === 'panel') {
      return 'flex items-center gap-1 px-2 py-1.5';
    }
    return 'flex w-14 flex-col items-stretch rounded-xl border border-slate-200 bg-white/95 p-0.5 shadow-md backdrop-blur-sm sm:w-fit sm:flex-row sm:items-center sm:rounded-full sm:p-1 sm:shadow-lg';
  })();

  return (
    <nav
      aria-label={t('languageSwitchLabel')}
      className={navClassName}
    >
      {languageOptions.map(option => {
        const isActive = option.locale === currentLocale;
        const languageName = t(option.nameKey);

        return (
          <a
            key={option.locale}
            href={`/${option.locale}${normalizedFallbackPathname}`}
            hrefLang={option.locale}
            aria-current={isActive ? 'page' : undefined}
            aria-label={
              isActive
                ? t('languageCurrent', { language: languageName })
                : t('languageSwitchTo', { language: languageName })
            }
            onClick={event => handleLocaleClick(event, option.locale)}
            className={(() => {
              const stateClasses = isActive
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950';
              if (variant === 'toolbar') {
                return `flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold transition-colors focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:outline-none ${stateClasses}`;
              }
              if (variant === 'panel') {
                return `flex h-7 min-w-9 items-center justify-center rounded-full px-2 text-[11px] font-semibold transition-colors focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:outline-none ${stateClasses}`;
              }
              return `w-full rounded-lg px-2 py-1 text-center text-[11px] font-semibold transition-colors focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:outline-none sm:min-w-10 sm:rounded-full sm:px-2.5 sm:text-xs ${stateClasses}`;
            })()}
          >
            {option.label}
          </a>
        );
      })}
    </nav>
  );
}
