import * as React from 'react';
import { useScopedI18n } from '@/locales/client';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Status mapping configuration for automatic badge styling (text comes from localization)
const STATUS_CONFIG = {
  // General statuses
  pending: { variant: 'orange' as const },
  approved: { variant: 'green' as const },
  rejected: { variant: 'red' as const },

  // Boolean statuses
  active: { variant: 'green' as const },
  inactive: { variant: 'red' as const },
  featured: { variant: 'green' as const },
  not_featured: { variant: 'outline' as const },
  verified: { variant: 'green' as const },
  unverified: { variant: 'orange' as const },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none text-center',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        green: 'border-transparent bg-primary text-primary-foreground',
        greenOutline: 'bg-background border-primary/70',
        red: 'border-transparent bg-destructive text-destructive-foreground',
        orange: 'border-transparent bg-warning text-warning-foreground',
        blue: 'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        exciting: 'border-warning text-muted-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * Auto-format a status value from the database
   * Will automatically determine variant and format text
   */
  status?: string | boolean;
  /**
   * For boolean values, specify what true/false represent
   */
  booleanLabels?: { true: StatusKey; false: StatusKey };
}

function Badge({
  className,
  variant,
  status,
  booleanLabels = { true: 'active', false: 'inactive' },
  children,
  ...props
}: BadgeProps) {
  // Get badges translations - hook must be called unconditionally
  const t = useScopedI18n('badges' as any);

  // Handle status prop
  if (status !== undefined) {
    let statusKey: StatusKey;

    if (typeof status === 'boolean') {
      statusKey = status ? booleanLabels.true : booleanLabels.false;
    } else {
      statusKey = status as StatusKey;
    }

    const config = STATUS_CONFIG[statusKey];
    if (config) {
      return (
        <div
          className={cn(badgeVariants({ variant: config.variant }), className)}
          {...props}
        >
          {t(statusKey as any, {})}
        </div>
      );
    }

    // Fallback for unknown statuses - auto-format
    const fallbackText =
      typeof status === 'string'
        ? status
            .split('_')
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(' ')
        : String(status);

    return (
      <div
        className={cn(
          badgeVariants({ variant: variant || 'outline' }),
          className
        )}
        {...props}
      >
        {fallbackText}
      </div>
    );
  }

  // Default behavior when no status prop
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

export { Badge, badgeVariants, STATUS_CONFIG };
