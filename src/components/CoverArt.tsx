import React from 'react';

interface CoverArtProps {
  variant?: number;
  customUrl?: string;
  title?: string;
  artist?: string;
  className?: string;
  showVinylRing?: boolean;
  isPlaying?: boolean;
}

const COVER_PALETTES = [
  { bg1: '#23091B', bg2: '#0B060A', accent1: '#FF4FA3', accent2: '#FFB6D5', shape: 'portrait' },
  { bg1: '#1A0726', bg2: '#080808', accent1: '#FF2D95', accent2: '#FF4FA3', shape: 'waves' },
  { bg1: '#2B0C1C', bg2: '#0E070B', accent1: '#FFB6D5', accent2: '#FF2D95', shape: 'eclipse' },
  { bg1: '#180A1D', bg2: '#080808', accent1: '#FF4FA3', accent2: '#9D174D', shape: 'prism' },
  { bg1: '#260B19', bg2: '#0A0A0A', accent1: '#FF2D95', accent2: '#FFB6D5', shape: 'vinyl' },
  { bg1: '#140812', bg2: '#060606', accent1: '#FF4FA3', accent2: '#F472B6', shape: 'monolith' },
  { bg1: '#290E22', bg2: '#090508', accent1: '#FFB6D5', accent2: '#FF4FA3', shape: 'petals' },
  { bg1: '#1F0618', bg2: '#070707', accent1: '#FF2D95', accent2: '#F9A8D4', shape: 'horizon' },
];

export const CoverArt: React.FC<CoverArtProps> = ({
  variant = 0,
  customUrl,
  title = 'KAMY',
  artist = '',
  className = 'w-14 h-14 rounded-2xl',
  showVinylRing = false,
}) => {
  if (customUrl) {
    return (
      <div className={`relative overflow-hidden shrink-0 bg-[#121212] ${className}`}>
        <img
          src={customUrl}
          alt={`${title} ${artist}`.trim()}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const idx = Math.abs(variant) % COVER_PALETTES.length;
  const pal = COVER_PALETTES[idx];
  const uid = `kamy-cov-${idx}-${title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)}`;

  return (
    <div
      className={`relative overflow-hidden shrink-0 select-none border border-white/10 ${className}`}
      style={{
        background: `linear-gradient(135deg, ${pal.bg1} 0%, ${pal.bg2} 100%)`,
      }}
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full object-cover"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-g1`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={pal.accent1} stopOpacity="0.9" />
            <stop offset="100%" stopColor={pal.accent2} stopOpacity="0.25" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="65%" cy="35%" r="60%">
            <stop offset="0%" stopColor={pal.accent1} stopOpacity="0.55" />
            <stop offset="100%" stopColor={pal.bg2} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="200" height="200" fill={`url(#${uid}-glow)`} />

        {pal.shape === 'portrait' && (
          <g>
            <circle cx="115" cy="75" r="52" fill={`url(#${uid}-g1)`} opacity="0.45" />
            <path
              d="M55 185 C60 130, 140 130, 150 185 Z"
              fill={pal.accent1}
              opacity="0.35"
            />
            <circle cx="105" cy="82" r="28" fill={pal.accent2} opacity="0.7" />
            <path
              d="M72 82 C72 60, 138 60, 138 82"
              stroke={pal.accent1}
              strokeWidth="6"
              fill="none"
            />
            <rect x="64" y="74" width="12" height="22" rx="6" fill={pal.accent1} />
            <rect x="132" y="74" width="12" height="22" rx="6" fill={pal.accent1} />
          </g>
        )}

        {pal.shape === 'waves' && (
          <g>
            <circle cx="100" cy="100" r="64" fill="none" stroke={`url(#${uid}-g1)`} strokeWidth="3" />
            <path
              d="M10 130 Q 55 75, 100 130 T 190 120"
              fill="none"
              stroke={pal.accent1}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M10 155 Q 60 105, 110 150 T 190 145"
              fill="none"
              stroke={pal.accent2}
              strokeWidth="3"
              opacity="0.7"
            />
            <circle cx="135" cy="65" r="22" fill={pal.accent1} opacity="0.65" />
          </g>
        )}

        {pal.shape === 'eclipse' && (
          <g>
            <circle cx="104" cy="100" r="58" fill={`url(#${uid}-g1)`} />
            <circle cx="88" cy="94" r="46" fill={pal.bg2} />
            <circle cx="134" cy="66" r="8" fill={pal.accent2} opacity="0.9" />
          </g>
        )}

        {pal.shape === 'prism' && (
          <g>
            <polygon
              points="100,32 162,152 38,152"
              fill="none"
              stroke={`url(#${uid}-g1)`}
              strokeWidth="6"
            />
            <polygon
              points="100,56 144,142 56,142"
              fill={pal.accent1}
              opacity="0.3"
            />
            <line x1="20" y1="115" x2="180" y2="85" stroke={pal.accent2} strokeWidth="3" opacity="0.75" />
          </g>
        )}

        {pal.shape === 'vinyl' && (
          <g>
            <circle cx="100" cy="100" r="72" fill="#0B0B0B" stroke={pal.accent1} strokeWidth="2" strokeOpacity="0.5" />
            <circle cx="100" cy="100" r="54" fill="none" stroke="#262626" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="38" fill="none" stroke="#262626" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="24" fill={`url(#${uid}-g1)`} />
            <circle cx="100" cy="100" r="6" fill="#080808" />
          </g>
        )}

        {pal.shape === 'monolith' && (
          <g>
            <rect x="68" y="34" width="64" height="132" rx="14" fill={`url(#${uid}-g1)`} opacity="0.75" />
            <rect x="82" y="48" width="36" height="104" rx="8" fill={pal.bg2} opacity="0.8" />
            <circle cx="100" cy="100" r="14" fill={pal.accent1} />
          </g>
        )}

        {pal.shape === 'petals' && (
          <g>
            <circle cx="85" cy="85" r="42" fill={pal.accent1} opacity="0.45" />
            <circle cx="120" cy="95" r="42" fill={pal.accent2} opacity="0.4" />
            <circle cx="100" cy="122" r="38" fill={`url(#${uid}-g1)`} opacity="0.6" />
          </g>
        )}

        {pal.shape === 'horizon' && (
          <g>
            <circle cx="100" cy="96" r="50" fill={`url(#${uid}-g1)`} />
            <rect x="20" y="102" width="160" height="6" fill={pal.bg2} />
            <rect x="20" y="114" width="160" height="8" fill={pal.bg2} />
            <rect x="20" y="128" width="160" height="12" fill={pal.bg2} />
          </g>
        )}
      </svg>

      {showVinylRing && (
        <div className="pointer-events-none absolute inset-0 rounded-inherit ring-1 ring-inset ring-[#FF4FA3]/30" />
      )}
    </div>
  );
};
