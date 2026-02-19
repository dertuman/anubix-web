import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Anubix — Build apps by talking';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Anubix geometric logo (SVG inline) */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          fill="none"
          style={{ marginBottom: '24px' }}
        >
          <path
            d="M50 8L15 35L25 55L50 45L75 55L85 35L50 8Z"
            stroke="#34d399"
            strokeWidth="4"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M25 55L40 70L50 60L60 70L75 55"
            stroke="#34d399"
            strokeWidth="4"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M50 60L50 80L45 90"
            stroke="#34d399"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M50 80L55 90"
            stroke="#34d399"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-2px',
              margin: 0,
              lineHeight: 1,
            }}
          >
            Anubix
          </h1>
          <p
            style={{
              fontSize: '28px',
              fontWeight: 400,
              color: '#a1a1aa',
              margin: 0,
              letterSpacing: '-0.5px',
            }}
          >
            Build apps by talking. No code required.
          </p>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '4px',
            background: 'linear-gradient(90deg, transparent 0%, #34d399 50%, transparent 100%)',
            display: 'flex',
          }}
        />

        {/* URL watermark */}
        <p
          style={{
            position: 'absolute',
            bottom: '24px',
            fontSize: '16px',
            color: '#52525b',
            margin: 0,
          }}
        >
          anubix.com
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
