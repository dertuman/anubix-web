export const locales = ['en'] as const;
export const localeLabels = [
  { label: 'English', value: 'en' },
];
export type Locale = (typeof locales)[number];

export const defaultLocale = 'en';
