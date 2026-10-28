import type { Metadata } from 'next';
import React from 'react';
import '../styles/tokens.scss';
import '../styles/base.scss';
import './globals.css';
import { plusJakartaSans } from '../styles/fonts';
import { AppHeader } from '../components/shell/AppHeader';
import { AppFooter } from '../components/shell/AppFooter';
import { ToastContainer } from '../components/common/ToastContainer';

export const metadata: Metadata = {
  title: 'IconHub — Open Source Icon Discovery & Customization',
  description: 'Fast, responsive, open-source icon discovery and real-time customization platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plusJakartaSans.variable} font-sans`}>
      <head>
        {/* Zero-flash theme initialization script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('iconhub:theme');
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored === 'dark' || (!stored && prefersDark) || (stored === 'system' && prefersDark);
                  var root = document.documentElement;
                  if (isDark) {
                    root.classList.add('dark');
                  } else {
                    root.classList.remove('dark');
                  }
                  root.setAttribute('data-theme', stored || 'system');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--color-bg-main)] text-[var(--color-text-body)] antialiased transition-colors duration-200">
        {/* Accessible Skip Link for Keyboard Users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-md focus:shadow-md focus:outline-none"
        >
          Skip to main content
        </a>

        {/* Global Application Shell Header */}
        <AppHeader />

        {/* Landmark Main Content */}
        <main id="main-content" className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Global Application Shell Footer */}
        <AppFooter />

        {/* Global Accessible Toast Region */}
        <ToastContainer />
      </body>
    </html>
  );
}
