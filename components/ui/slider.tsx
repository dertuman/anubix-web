'use client';

import * as React from 'react';
import { forwardRef, useEffect, useState } from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

type SliderProps = React.ComponentPropsWithoutRef<
  typeof SliderPrimitive.Root
> & {
  ariaValueNow?: number;
  disabled?: boolean;
  thumbId?: string;
};

const Slider = forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, ariaValueNow, disabled, thumbId, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full select-none items-center',
      disabled && 'cursor-not-allowed opacity-50',
      className
    )}
    {...props}
    disabled={disabled}
  >
    <SliderPrimitive.Track className="bg-muted relative h-2 w-full grow overflow-hidden rounded-full">
      <SliderPrimitive.Range className="bg-primary absolute h-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        'border-primary bg-background ring-offset-background focus-visible:ring-ring relative flex size-5 cursor-grab items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        disabled && 'cursor-not-allowed'
      )}
    >
      <span className="text-md absolute bottom-full mb-2 font-bold">
        {ariaValueNow}
      </span>
      <span
        id={thumbId}
        className="text-md absolute bottom-full mb-2 font-bold"
      >
        {ariaValueNow}
      </span>
    </SliderPrimitive.Thumb>
    <div className="absolute bottom-[-24px] left-0 flex w-full justify-between text-xs">
      <span>1</span>
      <span>10</span>
      <span>100</span>
    </div>
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

type SliderWithCommitProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  // eslint-disable-next-line no-unused-vars
  onCommit: (value: number) => void;
  disabled?: boolean;
  thumbId: string;
};

const SliderWithCommit: React.FC<SliderWithCommitProps> = ({
  value,
  min,
  max,
  step,
  onCommit,
  disabled,
  thumbId,
  ...props
}) => {
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const linearToExponential = (linearValue: number) => {
    const expMin = Math.log10(1);
    const expMax = Math.log10(100);
    return Math.round(Math.pow(10, linearValue * (expMax - expMin) + expMin));
  };

  const exponentialToLinear = (expValue: number) => {
    const expMin = Math.log10(1);
    const expMax = Math.log10(100);
    return (Math.log10(expValue) - expMin) / (expMax - expMin);
  };

  const handleValueChange = ([newValue]: number[]) => {
    const expValue = linearToExponential(newValue / max);
    setTempValue(expValue);
  };

  const handleValueCommit = ([newValue]: number[]) => {
    const expValue = linearToExponential(newValue / max);
    onCommit(expValue);

    // Trigger the animation when the thumb is released
    const thumbValueElement = document.getElementById(thumbId);
    if (thumbValueElement) {
      thumbValueElement.classList.add('animate-scale');
      setTimeout(() => {
        thumbValueElement.classList.remove('animate-scale');
      }, 600);
    }
  };

  return (
    <Slider
      className="grow"
      value={[exponentialToLinear(tempValue) * max]}
      min={min}
      max={max}
      step={step}
      onValueChange={handleValueChange}
      onValueCommit={handleValueCommit}
      ariaValueNow={tempValue}
      disabled={disabled}
      thumbId={thumbId}
      {...props}
    />
  );
};

export { Slider, SliderWithCommit };
