'use client';

import React from 'react';
import { default as LottieReact } from 'lottie-react';

interface LottieProps {
  animationData: any;
  loop?: boolean;
  className?: string;
}

export function Lottie({
  animationData,
  loop = true,
  className = 'w-10',
}: LottieProps) {
  return (
    <LottieReact
      animationData={animationData}
      loop={loop}
      className={className}
    />
  );
}
