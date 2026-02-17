'use client';

import { Locale } from '@/lib/locales';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

import 'flag-icons/css/flag-icons.min.css';

type Props = {
  locales: readonly Locale[];
  defaultValue: Locale;
  label: string;
  getCountryCode: (_locale: string) => string;
};

export default function LocaleSwitcherSelect({
  locales,
  defaultValue,
  label,
  getCountryCode,
  onLocaleSelect,
}: Props & { onLocaleSelect: (_locale: string) => void }) {
  return (
    <div className="relative">
      <p className="sr-only">{label}</p>
      <Select value={defaultValue} onValueChange={onLocaleSelect}>
        <SelectTrigger className="inline-flex items-center rounded-md border px-2 py-1 hover:bg-slate-500 hover:text-black">
          <span className={`fi fi-${getCountryCode(defaultValue)} mr-2`} />
        </SelectTrigger>
        <SelectContent className="rounded-md border shadow-lg">
          {locales.map((locale) => (
            <SelectItem key={locale} value={locale}>
              <div className="flex items-center">
                <span className={`fi fi-${getCountryCode(locale)} mr-2`} />
                <span>{locale}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
