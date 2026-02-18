'use client';

import { useScopedI18n } from '@/locales/client';

const LOGOS = [
  { name: 'Next.js', icon: NextjsIcon },
  { name: 'Clerk', icon: ClerkIcon },
  { name: 'Supabase', icon: SupabaseIcon },
  { name: 'Vercel', icon: VercelIcon },
  { name: 'GitHub', icon: GitHubIcon },
];

export function LogosSection() {
  const t = useScopedI18n('home.logos');

  return (
    <section className="border-y border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t('title')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
          {LOGOS.map(({ name, icon: Icon }) => (
            <div
              key={name}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Icon className="size-5" />
              <span className="text-sm font-medium">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Inline SVG icons (keep bundle small, no external deps) ─── */

function NextjsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 0-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.86-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.572 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 0 1 .237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 0 1 .233-.296c.096-.05.13-.054.5-.054z" />
    </svg>
  );
}

function ClerkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.79 6.328a.6.6 0 0 0-.6-.026l-3.804 1.96a.6.6 0 0 0-.133.971l1.744 1.744a4.8 4.8 0 0 1-7.554 4.128.6.6 0 0 0-.757.057l-2.7 2.7a.6.6 0 0 0 .08.899A10.8 10.8 0 0 0 23.414 8.298a.6.6 0 0 0-.317-.514l-2.308-1.456zM7.098 15.126a4.8 4.8 0 0 1 7.554-4.128.6.6 0 0 0 .757-.057l2.7-2.7a.6.6 0 0 0-.08-.899A10.8 10.8 0 0 0 .586 17.702a.6.6 0 0 0 .317.514l2.308 1.456a.6.6 0 0 0 .6.026l3.804-1.96a.6.6 0 0 0 .133-.971l-1.744-1.744a4.788 4.788 0 0 1 1.094-3.897z" />
    </svg>
  );
}

function SupabaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.73 21.8a1.29 1.29 0 0 1-2.18.92l-8.4-7.96a.86.86 0 0 1 .59-1.49h7.3l-1-11.07a1.29 1.29 0 0 1 2.18-.92l8.4 7.96a.86.86 0 0 1-.59 1.49h-7.3l1 11.07z" />
    </svg>
  );
}

function VercelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 1L24 22H0L12 1z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
