import React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader as LucideLoader } from 'lucide-react';

import { cn } from '@/lib/utils';

const loaderVariants = cva('inline-flex items-center justify-center', {
  variants: {
    size: {
      default: 'h-6 w-6',
      small: 'h-4 w-4',
      large: 'h-8 w-8',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface LoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loaderVariants> {
  asChild?: boolean;
}

const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? SlotPrimitive.Slot : 'div';
    return (
      <Comp
        className={cn(loaderVariants({ size, className }), 'animate-spin')}
        ref={ref}
        {...props}
      >
        <LucideLoader />
      </Comp>
    );
  }
);
Loader.displayName = 'Loader';

export { Loader, loaderVariants };
