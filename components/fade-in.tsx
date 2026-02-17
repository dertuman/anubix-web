'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface FadeInWhenVisibleProps {
  children: ReactNode;
  delay?: number;
  once?: boolean;
}

export const FadeInWhenVisible = ({
  children,
  delay = 0,
  once = false,
}: FadeInWhenVisibleProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{
        once: once,
        margin: '-50px',
        amount: 0.1,
      }}
      transition={{
        duration: 1,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {children}
    </motion.div>
  );
};
