'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface MotionWrapperProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Accessible animation container built with Motion for React (`motion/react`).
 * Automatically honors the user's `prefers-reduced-motion` operating system setting.
 */
export function MotionWrapper({
  children,
  className = '',
  delay = 0,
}: MotionWrapperProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

