'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import { useScopedI18n } from '@/locales/client';

type Screenshot = {
  url: string;
  pathname: string;
};

function PhoneSkeleton() {
  return (
    <div className="mx-auto w-[220px] sm:w-[240px]">
      <div className="relative rounded-[2.5rem] border-[3px] border-border/40 bg-card p-2 shadow-lg">
        {/* Notch */}
        <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-background" />
        <div className="aspect-[9/19.5] animate-pulse rounded-[2rem] bg-muted" />
      </div>
    </div>
  );
}

export function ScreenshotShowcase() {
  const t = useScopedI18n('home.screenshots');
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
      skipSnaps: false,
    },
    [
      Autoplay({
        delay: 4000,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    ]
  );

  useEffect(() => {
    fetch('/api/screenshots')
      .then((res) => res.json())
      .then((data) => {
        setScreenshots(data.screenshots || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi]
  );

  if (!loading && screenshots.length === 0) return null;

  return (
    <motion.section
      className="overflow-hidden py-20"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="mb-14 px-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          {t('label')}
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Carousel or skeletons */}
      {loading ? (
        <div className="flex justify-center gap-6 px-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="hidden first:block sm:block">
              <PhoneSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {screenshots.map((screenshot, index) => {
                const isActive = index === selectedIndex;
                return (
                  <div
                    key={screenshot.pathname}
                    className="min-w-0 flex-[0_0_65%] px-3 sm:flex-[0_0_40%] lg:flex-[0_0_25%]"
                  >
                    <motion.div
                      className="mx-auto max-w-[260px]"
                      animate={{
                        scale: isActive ? 1.05 : 0.95,
                        opacity: isActive ? 1 : 0.6,
                      }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      {/* Phone frame */}
                      <div className="relative rounded-[2.5rem] border-[3px] border-border/40 bg-card p-2 shadow-lg">
                        {/* Notch */}
                        <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-background" />
                        {/* Screenshot */}
                        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2rem] bg-muted">
                          <Image
                            src={screenshot.url}
                            alt={screenshot.pathname
                              .replace(/\.\w+$/, '')
                              .replace(/^\d+-/, '')}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 65vw, (max-width: 1024px) 40vw, 25vw"
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="mt-8 flex justify-center gap-2">
            {screenshots.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                aria-label={`Go to screenshot ${index + 1}`}
                className="p-1"
              >
                <motion.div
                  className="h-2 rounded-full bg-foreground/30"
                  animate={{
                    width: index === selectedIndex ? 24 : 8,
                    backgroundColor:
                      index === selectedIndex
                        ? 'var(--foreground)'
                        : 'color-mix(in srgb, var(--foreground) 30%, transparent)',
                  }}
                  transition={{ duration: 0.3 }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </motion.section>
  );
}
