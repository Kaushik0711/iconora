import localFont from 'next/font/local';

export const plusJakartaSans = localFont({
  src: [
    {
      path: '../fonts/plus-jakarta-sans-latin-wght-normal.woff2',
      weight: '200 800',
      style: 'normal',
    },
    {
      path: '../fonts/plus-jakarta-sans-latin-wght-italic.woff2',
      weight: '200 800',
      style: 'italic',
    },
  ],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

