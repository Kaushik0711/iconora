import React from 'react';
import { Hero } from '@/components/home/Hero';
import { CategoryChips } from '@/components/home/CategoryChips';
import { LibraryCards } from '@/components/home/LibraryCards';

export const metadata = {
  title: 'IconHub — Open Source Icons for Modern Projects',
  description:
    'Discover, customize, and copy thousands of open-source vector icons from Lucide, Heroicons, Tabler, Phosphor, and more.',
};

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1">
      {/* 1. Centered Hero Composition */}
      <Hero />

      {/* 2. Responsive Category Chip Navigation */}
      <CategoryChips />

      {/* 3. Popular Library Cards Grid */}
      <LibraryCards />
    </div>
  );
}
