'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useScopedI18n } from '@/locales/client';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';

import { Button } from '@/components/ui/button';

export function ParallaxHeader() {
  const tCommon = useScopedI18n('common');
  const { user } = useUser();

  const phrases = [
    'This project is incredible',
    'This project is amazing',
    'This project is awesome',
    'This project is fantastic',
    'This project is great',
    'This project is wonderful',
    'This project is amazing',
    'This project is awesome',
  ];

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhraseIndex((prevIndex) =>
        prevIndex === phrases.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(timer);
  }, [phrases.length]);

  return (
    <header className="relative h-[calc(100dvh-4.1rem)] w-full overflow-hidden">
      <div className="absolute inset-0 mb-10 flex flex-col items-center justify-center gap-4 px-4 text-center">
        {/* Welcome message */}
        {user?.fullName && (
          <span className="text-muted-foreground text-lg">
            Welcome back,{' '}
            <span className="text-primary font-bold">{user.fullName}</span>
          </span>
        )}

        <h1 className="font-montserrat text-5xl font-black leading-tight tracking-wider md:text-6xl">
          {tCommon('siteName')}
        </h1>

        <div className="flex h-14 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentPhraseIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-2xl"
            >
              {phrases[currentPhraseIndex]}
            </motion.h2>
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <Link prefetch href="/sign-in">
            <Button
              size="lg"
              className="font-montserrat flex w-56 items-center gap-2 text-lg font-black tracking-wider"
            >
              <span className="text-2xl">🔑</span>
              {tCommon('login')}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
