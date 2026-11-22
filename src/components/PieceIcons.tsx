import React from 'react';
import type { PieceColor, PieceType } from '../chess/types';

interface PieceIconProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
}

export const PieceSvgIcon: React.FC<PieceIconProps> = ({ type, color, className = 'w-4 h-4' }) => {
  const fill = color === 'w' ? '#f5eedf' : '#23262e';
  const stroke = color === 'w' ? '#8c7548' : '#d4af37';

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {type === 'p' && (
        <path
          d="M12 4.5a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Zm-2.2 6.8c0 1.8-.9 3.6-2.3 5.2H16.5c-1.4-1.6-2.3-3.4-2.3-5.2H9.8ZM6.5 18.2h11v2H6.5v-2Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      )}
      {type === 'r' && (
        <path
          d="M6.5 4.5h2.4v2h1.9v-2h2.4v2h1.9v-2h2.4V9l-1.5 1.4v6.6l1.5 1.4v2H6.5v-2L8 17v-6.6L6.5 9V4.5Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      )}
      {type === 'n' && (
        <path
          d="M15.8 4.8c-2.8 0-5.7 1.3-7.6 3.7L7.3 10.7l1.8 1.2 1.6-1c-.2 1.4-.9 3.2-2.6 5.5h8.8c.4-3.7-.1-6.9-1.1-8.7l1.4-1.3-1.4-1.6ZM6.5 18.2h11v2H6.5v-2Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      )}
      {type === 'b' && (
        <path
          d="M12 3.4a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm0 3c-2.6 1.7-3.6 4.4-2.6 7.1l1.2 2.9h2.8l1.2-2.9c1-2.7 0-5.4-2.6-7.1Zm-1.4 3.4 2.8 2.8M6.5 18.2h11v2H6.5v-2Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {type === 'q' && (
        <path
          d="M4.5 7.5a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm3.8-2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 4.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm3.7 1.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm3.8 2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM5.4 9.9l2.4 6.8h8.4l2.4-6.8-3.4 3.2-3.2-4.6-3.2 4.6-3.4-3.2ZM6.5 18.2h11v2H6.5v-2Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}
      {type === 'k' && (
        <path
          d="M12 2.8v3.4M10.3 4.5h3.4M7.2 16.7c-1.5-1.9-2.2-3.9-1.7-5.6.5-1.7 2.4-2.8 4.4-2.1 1 .3 1.7 1 2.1 1.8.4-.8 1.1-1.5 2.1-1.8 2-.7 3.9.4 4.4 2.1.5 1.7-.2 3.7-1.7 5.6H7.2ZM6.5 18.2h11v2H6.5v-2Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

export const AureliaTitleLockup: React.FC = () => (
  <svg
    viewBox="0 0 420 132"
    className="w-full max-w-[380px] h-auto"
    role="img"
    aria-label="Aurelia 3D Chess Grandmaster Studio"
  >
    <defs>
      <linearGradient id="aureliaGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f5dfa0" />
        <stop offset="55%" stopColor="#d4af37" />
        <stop offset="100%" stopColor="#9c7a24" />
      </linearGradient>
    </defs>

    {/* Emblem Shield & Royal Crown */}
    <g transform="translate(8, 16)">
      <path
        d="M44 4 L82 20 V56 C82 78 64 94 44 102 C24 94 6 78 6 56 V20 L44 4 Z"
        fill="#191b22"
        stroke="url(#aureliaGold)"
        strokeWidth="2.4"
      />
      <path
        d="M25 65 L21 38 L35 49 L44 31 L53 49 L67 38 L63 65 Z"
        fill="url(#aureliaGold)"
        stroke="#191b22"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="34" r="2.6" fill="url(#aureliaGold)" />
      <circle cx="44" cy="26" r="3" fill="url(#aureliaGold)" />
      <circle cx="67" cy="34" r="2.6" fill="url(#aureliaGold)" />
      <rect x="26" y="70" width="36" height="6.5" rx="2" fill="url(#aureliaGold)" />
    </g>

    {/* Typography Lockup */}
    <text
      x="112"
      y="58"
      fill="#f5efe4"
      fontSize="44"
      fontWeight="700"
      letterSpacing="5"
      fontFamily="Georgia, 'Times New Roman', serif"
    >
      AURELIA
    </text>
    <line x1="114" y1="72" x2="384" y2="72" stroke="url(#aureliaGold)" strokeWidth="1.5" strokeOpacity="0.65" />
    <text
      x="114"
      y="98"
      fill="#d4af37"
      fontSize="14.5"
      fontWeight="600"
      letterSpacing="4.6"
      fontFamily="Inter, system-ui, sans-serif"
    >
      3D CHESS STUDIO
    </text>
  </svg>
);
