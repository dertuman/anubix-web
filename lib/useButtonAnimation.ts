'use client';

import { useEffect } from 'react';

export const useButtonAnimation = (buttonId: string, animateId: string) => {
  useEffect(() => {
    const animateElement = document.getElementById(animateId);
    const buttonElement = document.getElementById(buttonId);

    if (animateElement && buttonElement) {
      const { width, height } = buttonElement.getBoundingClientRect();
      animateElement.style.width = `${width}px`;
      animateElement.style.height = `${height}px`;
    }
  }, [buttonId, animateId]);

  const triggerAnimation = () => {
    const animateElement = document.getElementById(animateId);
    if (animateElement) {
      animateElement.classList.add('animate-scale'); //globals.css
      setTimeout(() => {
        animateElement.classList.remove('animate-scale');
      }, 600);
    }
  };

  return { triggerAnimation };
};
