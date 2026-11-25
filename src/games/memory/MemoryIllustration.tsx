import type { MemorySymbolId } from './types'

interface MemoryIllustrationProps {
  symbolId: MemorySymbolId
  color: string
  className?: string
}

export function MemoryIllustration({
  symbolId,
  color,
  className = '',
}: MemoryIllustrationProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      style={{ color }}
    >
      {symbolId === 'teacup' && (
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 28h26v10a13 13 0 0 1-26 0V28z" fill="currentColor" fillOpacity="0.16" />
          <path d="M42 30h4a5 5 0 0 1 0 10h-4" />
          <path d="M12 49h34" />
          <path d="M23 19c0-3 2-4 2-7" />
          <path d="M31 20c0-3 2-4 2-7" />
        </g>
      )}

      {symbolId === 'acorn' && (
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 26c0-6 6.5-10 14-10s14 4 14 10H18z" fill="currentColor" fillOpacity="0.28" />
          <path d="M21 26v9c0 8 5 14 11 16 6-2 11-8 11-16v-9" fill="currentColor" fillOpacity="0.12" />
          <path d="M32 16v-5c0-2 2-3 4-3" />
          <path d="M24 21h16" />
        </g>
      )}

      {symbolId === 'fox' && (
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M14 18l8 10h20l8-10 2 18-20 15L12 36l2-18z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <circle cx="24" cy="34" r="2" fill="currentColor" />
          <circle cx="40" cy="34" r="2" fill="currentColor" />
          <path d="M29 43l3 3 3-3" fill="currentColor" />
        </g>
      )}

      {symbolId === 'owl' && (
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M18 18l6 5h16l6-5v19a14 14 0 0 1-28 0V18z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <circle cx="25" cy="31" r="4.5" fill="#fff" />
          <circle cx="39" cy="31" r="4.5" fill="#fff" />
          <circle cx="25" cy="31" r="1.8" fill="currentColor" />
          <circle cx="39" cy="31" r="1.8" fill="currentColor" />
          <path d="M30 37l2 4 2-4z" fill="currentColor" />
        </g>
      )}

      {symbolId === 'lantern' && (
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M25 14a7 7 0 0 1 14 0" />
          <rect x="20" y="18" width="24" height="5" rx="2" fill="currentColor" fillOpacity="0.25" />
          <rect x="22" y="23" width="20" height="22" rx="3" fill="currentColor" fillOpacity="0.15" />
          <path d="M32 29c3 3 4 6 0 10-4-4-3-7 0-10z" fill="currentColor" fillOpacity="0.5" />
          <rect x="19" y="45" width="26" height="5" rx="2" fill="currentColor" fillOpacity="0.25" />
        </g>
      )}

      {symbolId === 'yarn' && (
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="16" fill="currentColor" fillOpacity="0.16" />
          <path d="M19 25c9-2 19 2 25 10" />
          <path d="M17 34c10-2 18 2 23 11" />
          <path d="M27 17c4 9 3 19-4 28" />
          <path d="M44 43c4 4 8 3 10 1" />
        </g>
      )}

      {symbolId === 'pie' && (
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 33c0-9 9-15 20-15s20 6 20 15" fill="currentColor" fillOpacity="0.16" />
          <path d="M10 33h44l-4 14H14l-4-14z" fill="currentColor" fillOpacity="0.24" />
          <path d="M24 23l-3 6" />
          <path d="M32 22v7" />
          <path d="M40 23l3 6" />
        </g>
      )}

      {symbolId === 'leaf' && (
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M48 15C30 15 17 26 17 42c16 0 27-11 31-27z"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <path d="M14 49l26-26" />
          <path d="M25 38h10" />
          <path d="M31 32v-8" />
        </g>
      )}

      {symbolId === 'star' && (
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M32 12l5.8 11.8 13 1.9-9.4 9.2 2.2 13L32 41.8 20.4 47.9l2.2-13-9.4-9.2 13-1.9L32 12z"
            fill="currentColor"
            fillOpacity="0.22"
          />
        </g>
      )}

      {symbolId === 'mitten' && (
        <g fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M22 44V26a10 10 0 0 1 20 0v6l5-3a4 4 0 0 1 4 6.8L42 44H22z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <rect x="20" y="44" width="24" height="7" rx="2.5" fill="currentColor" fillOpacity="0.28" />
        </g>
      )}
    </svg>
  )
}
