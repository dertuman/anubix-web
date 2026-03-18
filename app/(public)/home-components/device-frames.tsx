import Image from 'next/image';

/** Safari-style dark browser chrome frame */
export function BrowserFrame({
  src,
  alt,
  url = 'anubix.com',
  width,
  height,
  bleedRight,
}: {
  src: string;
  alt: string;
  url?: string;
  width: number;
  height: number;
  /** When true, removes right border-radius and right border for viewport-bleed layouts */
  bleedRight?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden border border-border bg-card shadow-2xl ${
        bleedRight
          ? 'rounded-l-xl border-r-0'
          : 'rounded-xl'
      }`}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-[#ff5f57]" />
          <div className="size-3 rounded-full bg-[#febc2e]" />
          <div className="size-3 rounded-full bg-[#28c840]" />
        </div>
        {/* URL bar */}
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-muted px-3 py-1">
          <svg className="size-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-xs text-muted-foreground/70">{url}</span>
        </div>
        {/* Spacer to balance the traffic lights */}
        <div className="w-[52px]" />
      </div>
      {/* Screenshot */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="block w-full"
      />
    </div>
  );
}

/** iPhone-style phone frame */
export function PhoneFrame({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <div className="relative mx-auto w-fit">
      {/* Phone bezel */}
      <div className="overflow-hidden rounded-[2.5rem] border-[3px] border-muted-foreground/20 bg-black p-1.5 shadow-2xl">
        {/* Dynamic Island */}
        <div className="absolute left-1/2 top-2.5 z-10 h-[1.4rem] w-[5.5rem] -translate-x-1/2 rounded-full bg-black" />
        {/* Screen */}
        <div className="overflow-hidden rounded-[2rem]">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="block w-full"
          />
        </div>
      </div>
    </div>
  );
}
