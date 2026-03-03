'use client';

import { useState, useRef, useEffect, Suspense, lazy } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { ArrowRight, Menu, Info, LayoutDashboard, CreditCard, LogIn } from 'lucide-react';

const Dithering = lazy(() =>
  import('@paper-design/shaders-react').then((mod) => ({ default: mod.Dithering }))
);

import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

export function PromptHero() {
  const [prompt, setPrompt] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    if (isLoaded && isSignedIn) {
      router.push(`/workspace?mode=chat&prompt=${encodeURIComponent(trimmed)}`);
    } else {
      sessionStorage.setItem('anubix_pending_prompt', trimmed);
      router.push('/sign-in');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section
      className="relative flex min-h-svh flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dithering shader background */}
      <Suspense fallback={null}>
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen">
          <Dithering
            colorBack="#00000000"
            colorFront="#2A9D6E"
            shape="warp"
            type="4x4"
            speed={isHovered ? 0.5 : 0.15}
            className="size-full"
            minPixelRatio={1}
          />
        </div>
      </Suspense>

      {/* Mini nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Image src="/logo.webp" alt="Anubix" width={28} height={28} />
          <span className="text-sm font-medium tracking-tight text-foreground">Anubix</span>
        </div>

        {/* Nav links (desktop) */}
        <div className="hidden items-center gap-5 md:flex">
          <Link href="#about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/workspace" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Workspace
          </Link>
          <Link href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignedOut>
            <Link
              href="/sign-in"
              className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              Sign in
            </Link>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* Mobile burger menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-background">
              <DialogTitle className="sr-only">Navigation menu</DialogTitle>
              <DialogDescription className="sr-only">Navigation menu</DialogDescription>
              <nav className="mt-6 flex flex-col gap-1 px-2">
                <div className="mb-4 flex items-center gap-2 px-3">
                  <Image src="/logo.webp" alt="Anubix" width={24} height={24} />
                  <span className="text-lg font-bold tracking-tight">Anubix</span>
                </div>
                <Button variant="ghost" asChild className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
                  <Link href="#about" onClick={() => setMobileMenuOpen(false)}>
                    <Info className="size-4" />
                    About
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
                  <Link href="/workspace" onClick={() => setMobileMenuOpen(false)}>
                    <LayoutDashboard className="size-4" />
                    Workspace
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
                  <Link href="#pricing" onClick={() => setMobileMenuOpen(false)}>
                    <CreditCard className="size-4" />
                    Pricing
                  </Link>
                </Button>
                <SignedOut>
                  <Separator className="my-3" />
                  <Button asChild className="w-full gap-2">
                    <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                      <LogIn className="size-4" />
                      Sign in
                    </Link>
                  </Button>
                </SignedOut>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Centered content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl space-y-8 text-center">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative">
              <Image
                src="/logo.webp"
                alt="Anubix"
                width={64}
                height={64}
                className="relative z-10"
              />
              <div className="absolute inset-0 blur-2xl opacity-20 bg-primary rounded-full scale-150" />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-2xl tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl whitespace-nowrap">
              Build anything. From anywhere.
            </h1>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
              A complete cloud IDE. Powerful enough for production, light enough for your phone.
            </p>
          </div>

          {/* Prompt box */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="prompt-box-glow overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-primary/5 transition-all focus-within:border-primary/40 focus-within:shadow-primary/10">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to build?"
                rows={3}
                className="w-full resize-none bg-transparent px-4 pt-4 pb-12 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <div className="absolute bottom-3 right-3">
                <button
                  onClick={handleSubmit}
                  disabled={!prompt.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-30"
                >
                  Start
                  <ArrowRight className="size-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Secondary links */}
          <div className="space-y-2">
            <Link
              href="/workspace?mode=chat"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              or try the multi-model chat free
              <ArrowRight className="size-3" />
            </Link>
            <p className="text-xs text-muted-foreground/60">
              Chat free. Code from &euro;10/mo. You own everything you build.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
