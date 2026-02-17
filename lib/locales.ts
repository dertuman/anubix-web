export const locales = ['en', 'es'] as const;
export const localeLabels = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
];
export type Locale = (typeof locales)[number];

export const defaultLocale = 'en';
