import { Space_Grotesk, Geist, Geist_Mono } from 'next/font/google';

export const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const fontDisplay = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

export const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});
