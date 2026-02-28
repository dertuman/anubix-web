import { Space_Grotesk, Geist, Geist_Mono } from 'next/font/google';

export const fontSans = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

export const fontGeist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
});

export const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});
