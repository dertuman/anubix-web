import React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader as LucideLoader } from 'lucide-react';

import { cn } from '@/lib/utils';

const loaderVariants = cva('inline-flex items-center justify-center relative', {
  variants: {
    size: {
      default: 'h-6 w-6',
      small: 'h-4 w-4',
      large: 'h-8 w-8',
    },
    variant: {
      default: 'animate-spin',
      glowing: '',
      dots: '',
      lucide: 'animate-spin',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
});

export interface LoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof loaderVariants>, 'size'> {
  asChild?: boolean;
  size?: VariantProps<typeof loaderVariants>['size'] | number;
}

const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  (
    { className, size = 'default', variant, asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? SlotPrimitive.Slot : 'div';
    const sizeStyles =
      typeof size === 'number'
        ? { width: `${size}px`, height: `${size}px` }
        : undefined;
    const sizeClass = typeof size === 'number' ? undefined : size;

    if (variant === 'lucide') {
      return (
        <Comp
          className={cn(
            loaderVariants({ size: sizeClass, variant, className })
          )}
          style={sizeStyles}
          ref={ref}
          {...props}
        >
          <LucideLoader className="h-full w-full" />
        </Comp>
      );
    }

    if (variant === 'dots') {
      const dotSize = typeof size === 'number' ? Math.max(3, Math.round(size / 4.5)) : 4;
      const dotStyle = { width: `${dotSize}px`, height: `${dotSize}px` };
      return (
        <Comp
          className={cn(
            'inline-flex items-center justify-center gap-[3px]',
            className
          )}
          style={sizeStyles}
          ref={ref}
          {...props}
        >
          <span className="typing-dot rounded-full bg-primary/70" style={dotStyle} />
          <span className="typing-dot typing-dot-delay-1 rounded-full bg-primary/70" style={dotStyle} />
          <span className="typing-dot typing-dot-delay-2 rounded-full bg-primary/70" style={dotStyle} />
        </Comp>
      );
    }

    if (variant === 'glowing') {
      return (
        <Comp
          className={cn(
            loaderVariants({ size: sizeClass, variant, className })
          )}
          style={sizeStyles}
          ref={ref}
          {...props}
        >
          <div className="animate-pulse-glow absolute inset-[-15%]">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-primary/80 via-custom-green/80 to-primary/80 blur-xl" />
          </div>
          <div className="relative flex h-full w-full items-center justify-center">
            <div className="absolute inset-[10%]">
              <div className="float-particle-1 absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/80 blur-sm" />
              <div className="float-particle-2 absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-custom-green/80 blur-sm" />
              <div className="float-particle-3 absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info/80 blur-sm" />
              <div className="float-particle-4 absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/80 blur-sm" />
              <div className="float-particle-5 absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-custom-green/80 blur-sm" />
            </div>

            <div className="absolute inset-[25%] animate-pulse rounded-full bg-gradient-to-tr from-primary/60 via-custom-green/60 to-info/60 blur-lg" />
          </div>
        </Comp>
      );
    }

    // Default: spinning LucideLoader (backward compatible)
    return (
      <Comp
        className={cn(loaderVariants({ size: sizeClass, variant, className }))}
        style={sizeStyles}
        ref={ref}
        {...props}
      >
        <LucideLoader className="h-full w-full" />
      </Comp>
    );
  }
);

Loader.displayName = 'Loader';

export { Loader, loaderVariants };
