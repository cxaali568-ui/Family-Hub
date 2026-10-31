import React from 'react';

interface Icon3DProps {
  className?: string;
  size?: number;
}

export const Chat3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="chat_grad_1" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="0.5" stopColor="#4F46E5" />
        <stop offset="1" stopColor="#3730A3" />
      </linearGradient>
      <linearGradient id="chat_highlight" x1="12" y1="8" x2="36" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#A5B4FC" stopOpacity="0.8" />
        <stop offset="1" stopColor="#818CF8" stopOpacity="0" />
      </linearGradient>
      <filter id="chat_shadow" x="2" y="4" width="44" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#312E81" floodOpacity="0.35" />
      </filter>
    </defs>
    <g filter="url(#chat_shadow)">
      <path
        d="M24 6C13.507 6 5 13.611 5 23C5 27.24 6.75 31.11 9.7 34.02L7.3 41.5C7.05 42.27 7.8 42.97 8.53 42.63L17.2 38.64C19.34 39.52 21.62 40 24 40C34.493 40 43 32.389 43 23C43 13.611 34.493 6 24 6Z"
        fill="url(#chat_grad_1)"
      />
      <path
        d="M24 7.5C14.34 7.5 6.5 14.44 6.5 23C6.5 26.96 8.13 30.56 10.87 33.27L9.2 38.5L15.35 35.68C17.93 37.49 20.88 38.5 24 38.5C33.66 38.5 41.5 31.56 41.5 23C41.5 14.44 33.66 7.5 24 7.5Z"
        fill="url(#chat_highlight)"
      />
      <circle cx="16" cy="22.5" r="2.75" fill="#FFFFFF" />
      <circle cx="24" cy="22.5" r="2.75" fill="#FFFFFF" />
      <circle cx="32" cy="22.5" r="2.75" fill="#FFFFFF" />
    </g>
  </svg>
);

export const Family3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="fam_grad_main" x1="8" y1="8" x2="40" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="0.6" stopColor="#059669" />
        <stop offset="1" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="fam_accent" x1="16" y1="10" x2="32" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6EE7B7" stopOpacity="0.8" />
        <stop offset="1" stopColor="#34D399" stopOpacity="0" />
      </linearGradient>
      <filter id="fam_shadow" x="2" y="4" width="44" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#064E3B" floodOpacity="0.3" />
      </filter>
    </defs>
    <g filter="url(#fam_shadow)">
      {/* Center Parent */}
      <circle cx="24" cy="14" r="6" fill="url(#fam_grad_main)" />
      <path
        d="M15 36C15 29.5 19 25 24 25C29 25 33 29.5 33 36C33 37.66 31.66 39 30 39H18C16.34 39 15 37.66 15 36Z"
        fill="url(#fam_grad_main)"
      />
      {/* Left Member */}
      <circle cx="12" cy="18" r="4.5" fill="#34D399" />
      <path
        d="M5 38C5 33 8 29.5 12 29.5C14.2 29.5 16.1 30.5 17.3 32.2C16.5 34.2 16 36.5 16 39H7C5.9 39 5 38.1 5 38Z"
        fill="#059669"
      />
      {/* Right Member */}
      <circle cx="36" cy="18" r="4.5" fill="#34D399" />
      <path
        d="M43 38C43 33 40 29.5 36 29.5C33.8 29.5 31.9 30.5 30.7 32.2C31.5 34.2 32 36.5 32 39H41C42.1 39 43 38.1 43 38Z"
        fill="#059669"
      />
      {/* Specular Highlight */}
      <circle cx="24" cy="14" r="5" stroke="url(#fam_accent)" strokeWidth="1.5" />
    </g>
  </svg>
);

export const Documents3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="doc_grad" x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="0.6" stopColor="#D97706" />
        <stop offset="1" stopColor="#B45309" />
      </linearGradient>
      <filter id="doc_shadow" x="4" y="4" width="40" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#78350F" floodOpacity="0.3" />
      </filter>
    </defs>
    <g filter="url(#doc_shadow)">
      {/* Under sheet */}
      <rect x="8" y="10" width="26" height="32" rx="4" fill="#FDE68A" />
      {/* Main sheet */}
      <path
        d="M14 6H29L39 16V38C39 40.2 37.2 42 35 42H14C11.8 42 10 40.2 10 38V10C10 7.8 11.8 6 14 6Z"
        fill="url(#doc_grad)"
      />
      {/* Fold corner */}
      <path d="M29 6V16H39L29 6Z" fill="#FBBF24" />
      {/* Lines */}
      <rect x="16" y="22" width="16" height="2.5" rx="1.25" fill="#FFFFFF" fillOpacity="0.9" />
      <rect x="16" y="28" width="12" height="2.5" rx="1.25" fill="#FFFFFF" fillOpacity="0.9" />
      <rect x="16" y="34" width="8" height="2.5" rx="1.25" fill="#FFFFFF" fillOpacity="0.7" />
    </g>
  </svg>
);

export const Expenses3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="exp_grad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="0.6" stopColor="#059669" />
        <stop offset="1" stopColor="#047857" />
      </linearGradient>
      <filter id="exp_shadow" x="2" y="4" width="44" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#064E3B" floodOpacity="0.35" />
      </filter>
    </defs>
    <g filter="url(#exp_shadow)">
      {/* Dimensional Coin */}
      <circle cx="24" cy="24" r="18" fill="url(#exp_grad)" />
      <circle cx="24" cy="24" r="15" stroke="#A7F3D0" strokeWidth="1.5" strokeOpacity="0.8" />
      {/* Dollar/Currency Sign */}
      <path
        d="M24 13V35M28.5 18C28.5 15.8 26.5 14.5 24 14.5C21 14.5 19 16 19 18.5C19 23 29 21.5 29 26.5C29 29.5 26.5 31.5 24 31.5C21 31.5 18.5 29.8 18.5 27.5"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

export const Calendar3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="cal_body" x1="8" y1="12" x2="40" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F87171" />
        <stop offset="0.5" stopColor="#EF4444" />
        <stop offset="1" stopColor="#DC2626" />
      </linearGradient>
      <filter id="cal_shadow" x="3" y="4" width="42" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#7F1D1D" floodOpacity="0.3" />
      </filter>
    </defs>
    <g filter="url(#cal_shadow)">
      {/* Calendar Body */}
      <rect x="7" y="10" width="34" height="32" rx="6" fill="#FFFFFF" />
      <path d="M7 16C7 12.69 9.69 10 13 10H35C38.31 10 41 12.69 41 16V21H7V16Z" fill="url(#cal_body)" />
      {/* Binder Rings */}
      <rect x="14" y="6" width="3.5" height="8" rx="1.75" fill="#334155" />
      <rect x="30.5" y="6" width="3.5" height="8" rx="1.75" fill="#334155" />
      {/* Calendar Grid Dots */}
      <circle cx="15" cy="27" r="2" fill="#EF4444" />
      <circle cx="24" cy="27" r="2" fill="#CBD5E1" />
      <circle cx="33" cy="27" r="2" fill="#CBD5E1" />
      <circle cx="15" cy="35" r="2" fill="#CBD5E1" />
      <circle cx="24" cy="35" r="2.5" fill="#EF4444" />
      <circle cx="33" cy="35" r="2" fill="#CBD5E1" />
    </g>
  </svg>
);

export const PersonalSpace3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="sec_grad" x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818CF8" />
        <stop offset="0.5" stopColor="#6366F1" />
        <stop offset="1" stopColor="#4338CA" />
      </linearGradient>
      <filter id="sec_shadow" x="3" y="4" width="42" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#312E81" floodOpacity="0.4" />
      </filter>
    </defs>
    <g filter="url(#sec_shadow)">
      {/* Shield */}
      <path
        d="M24 6L9 11.5V23C9 32.5 15.4 41.3 24 43.5C32.6 41.3 39 32.5 39 23V11.5L24 6Z"
        fill="url(#sec_grad)"
      />
      {/* Lock Body */}
      <rect x="18" y="24" width="12" height="10" rx="3" fill="#FFFFFF" />
      {/* Shackle */}
      <path
        d="M21 24V20C21 18.34 22.34 17 24 17C25.66 17 27 18.34 27 20V24"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="28.5" r="1.5" fill="#4338CA" />
    </g>
  </svg>
);

export const Settings3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="set_grad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#64748B" />
        <stop offset="0.5" stopColor="#475569" />
        <stop offset="1" stopColor="#334155" />
      </linearGradient>
      <filter id="set_shadow" x="3" y="4" width="42" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.35" />
      </filter>
    </defs>
    <g filter="url(#set_shadow)">
      <circle cx="24" cy="24" r="16" fill="url(#set_grad)" />
      <circle cx="24" cy="24" r="6" fill="#0F172A" />
      <circle cx="24" cy="24" r="14" stroke="#94A3B8" strokeWidth="1.2" strokeOpacity="0.7" />
      {/* Gear Teeth */}
      <rect x="22" y="5" width="4" height="6" rx="1.5" fill="#475569" />
      <rect x="22" y="37" width="4" height="6" rx="1.5" fill="#475569" />
      <rect x="5" y="22" width="6" height="4" rx="1.5" fill="#475569" />
      <rect x="37" y="22" width="6" height="4" rx="1.5" fill="#475569" />
    </g>
  </svg>
);

export const Camera3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="cam_grad" x1="6" y1="12" x2="42" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="0.5" stopColor="#2563EB" />
        <stop offset="1" stopColor="#1D4ED8" />
      </linearGradient>
      <filter id="cam_shadow" x="3" y="4" width="42" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1E3A8A" floodOpacity="0.35" />
      </filter>
    </defs>
    <g filter="url(#cam_shadow)">
      <path
        d="M17 11L19.2 8.5C19.8 7.8 20.6 7.5 21.5 7.5H26.5C27.4 7.5 28.2 7.8 28.8 8.5L31 11H37C39.2 11 41 12.8 41 15V35C41 37.2 39.2 39 37 39H11C8.8 39 7 37.2 7 35V15C7 12.8 8.8 11 11 11H17Z"
        fill="url(#cam_grad)"
      />
      {/* Lens */}
      <circle cx="24" cy="25" r="9" fill="#0F172A" stroke="#93C5FD" strokeWidth="2" />
      <circle cx="24" cy="25" r="5" fill="#3B82F6" />
      {/* Flash */}
      <circle cx="34" cy="16" r="2" fill="#FDE047" />
    </g>
  </svg>
);

export const Shield3D = PersonalSpace3D;

export const Birthday3D: React.FC<Icon3DProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-md ${className}`}
    style={size ? { width: size, height: size } : undefined}
  >
    <defs>
      <linearGradient id="bday_box" x1="8" y1="18" x2="40" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F43F5E" />
        <stop offset="0.5" stopColor="#E11D48" />
        <stop offset="1" stopColor="#9F1239" />
      </linearGradient>
      <linearGradient id="bday_lid" x1="6" y1="14" x2="42" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FB7185" />
        <stop offset="1" stopColor="#E11D48" />
      </linearGradient>
      <linearGradient id="bday_ribbon" x1="20" y1="6" x2="28" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FBBF24" />
        <stop offset="0.6" stopColor="#F59E0B" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
      <filter id="bday_shadow" x="2" y="4" width="44" height="42" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#881337" floodOpacity="0.35" />
      </filter>
    </defs>
    <g filter="url(#bday_shadow)">
      {/* Gift Box Base */}
      <rect x="9" y="20" width="30" height="22" rx="4" fill="url(#bday_box)" />
      {/* Box Lid */}
      <rect x="7" y="14" width="34" height="7" rx="3" fill="url(#bday_lid)" />
      {/* Vertical Ribbon */}
      <rect x="21" y="14" width="6" height="28" fill="url(#bday_ribbon)" />
      {/* Horizontal Ribbon */}
      <rect x="9" y="28" width="30" height="5" fill="url(#bday_ribbon)" />
      {/* Bow Left */}
      <path
        d="M24 14C20 9 14 9 16 13C17.5 16 23 14 24 14Z"
        fill="#FDE68A"
        stroke="#D97706"
        strokeWidth="1"
      />
      {/* Bow Right */}
      <path
        d="M24 14C28 9 34 9 32 13C30.5 16 25 14 24 14Z"
        fill="#FDE68A"
        stroke="#D97706"
        strokeWidth="1"
      />
      {/* Center Knot */}
      <circle cx="24" cy="14" r="2.5" fill="#F59E0B" />
    </g>
  </svg>
);
