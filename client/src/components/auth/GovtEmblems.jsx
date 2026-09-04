import React from 'react'

/**
 * National Emblem of India (State Emblem / Lion Capital of Ashoka)
 * Scalable vector representation with Satyameva Jayate.
 */
export function AshokaLionEmblem({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="National Emblem of India"
    >
      {/* Central Lion Head & Mane */}
      <path
        d="M50 14 C43 14 38 18 36 24 C34 29 36 35 38 39 C36 43 36 48 39 52 C41 55 45 57 50 57 C55 57 59 55 61 52 C64 48 64 43 62 39 C64 35 66 29 64 24 C62 18 57 14 50 14 Z"
        fill="#1e293b"
      />
      {/* Left Lion Profile */}
      <path
        d="M34 26 C30 22 25 24 22 28 C19 33 20 40 23 45 C21 49 22 55 26 58 C30 61 35 59 37 55 C34 50 33 42 35 36 C34 33 34 29 34 26 Z"
        fill="#334155"
      />
      {/* Right Lion Profile */}
      <path
        d="M66 26 C70 22 75 24 78 28 C81 33 80 40 77 45 C79 49 78 55 74 58 C70 61 65 59 63 55 C66 50 67 42 65 36 C66 33 66 29 66 26 Z"
        fill="#334155"
      />
      {/* Crown / Ears / Facial contours */}
      <path d="M46 20 Q50 18 54 20" stroke="#f8fafc" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="45" cy="27" r="1.5" fill="#f8fafc" />
      <circle cx="55" cy="27" r="1.5" fill="#f8fafc" />
      <path d="M50 28 L48 33 H52 Z" fill="#f8fafc" />
      <path d="M46 36 Q50 38 54 36" stroke="#f8fafc" strokeWidth="1.2" strokeLinecap="round" />
      
      {/* Pedestal / Abacus */}
      <rect x="20" y="60" width="60" height="12" rx="2" fill="#1e293b" />
      
      {/* Ashoka Chakra in center of abacus */}
      <circle cx="50" cy="66" r="4.5" stroke="#0284c7" strokeWidth="1" fill="#ffffff" />
      <circle cx="50" cy="66" r="1" fill="#0284c7" />
      <line x1="50" y1="61.5" x2="50" y2="70.5" stroke="#0284c7" strokeWidth="0.6" />
      <line x1="45.5" y1="66" x2="54.5" y2="66" stroke="#0284c7" strokeWidth="0.6" />
      <line x1="47" y1="63" x2="53" y2="69" stroke="#0284c7" strokeWidth="0.6" />
      <line x1="47" y1="69" x2="53" y2="63" stroke="#0284c7" strokeWidth="0.6" />

      {/* Bull on right, Horse on left (symbolic silhouetted reliefs) */}
      <path d="M28 65 Q32 63 35 66" stroke="#f8fafc" strokeWidth="1" strokeLinecap="round" />
      <path d="M65 65 Q68 63 72 66" stroke="#f8fafc" strokeWidth="1" strokeLinecap="round" />

      {/* Lotus Base */}
      <path
        d="M26 72 C32 82 42 85 50 85 C58 85 68 82 74 72 Z"
        fill="#334155"
      />
      <path d="M38 72 Q50 83 62 72" stroke="#64748b" strokeWidth="1" fill="none" />

      {/* Stepped Base Plinth */}
      <rect x="16" y="87" width="68" height="5" rx="1.5" fill="#1e293b" />
      <rect x="12" y="93" width="76" height="4" rx="1" fill="#475569" />

      {/* Satyameva Jayate (सत्यमेव जयते in stylized Devanagari script) */}
      <text
        x="50"
        y="110"
        textAnchor="middle"
        fill="#1e293b"
        fontSize="8.5"
        fontFamily="serif"
        fontWeight="bold"
        letterSpacing="0.5"
      >
        सत्यमेव जयते
      </text>
    </svg>
  )
}

/**
 * KaushalAI Logo
 * Multi-colored rising histogram bars with an upward swooping blue growth curve.
 */
export function KaushalAiLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="barGrad1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id="barGrad2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="barGrad3" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="barGrad4" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="swooshGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>

      {/* 4 Growing Histogram Bars */}
      <rect x="6" y="28" width="6" height="14" rx="2" fill="url(#barGrad1)" />
      <rect x="15" y="20" width="6" height="22" rx="2" fill="url(#barGrad2)" />
      <rect x="24" y="24" width="6" height="18" rx="2" fill="url(#barGrad3)" />
      <rect x="33" y="14" width="6" height="28" rx="2" fill="url(#barGrad4)" />

      {/* Upward Dynamic Growth Arrow Swoosh */}
      <path
        d="M8 32 C 16 28, 24 16, 38 7"
        stroke="url(#swooshGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Arrow Head */}
      <path
        d="M32 7 H39.5 V14.5"
        stroke="url(#swooshGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * iGOT Karmayogi Logo
 * Official 4-color cross star emblem of Mission Karmayogi.
 */
export function IgotLogo({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top Petal - Orange / Saffron */}
      <path
        d="M20 5 C17.5 11 15 15 20 18 C25 15 22.5 11 20 5 Z"
        fill="#f97316"
      />
      {/* Right Petal - Blue */}
      <path
        d="M35 20 C29 17.5 25 15 22 20 C25 25 29 22.5 35 20 Z"
        fill="#0284c7"
      />
      {/* Bottom Petal - Green */}
      <path
        d="M20 35 C22.5 29 25 25 20 22 C15 25 17.5 29 20 35 Z"
        fill="#16a34a"
      />
      {/* Left Petal - Amber / Gold */}
      <path
        d="M5 20 C11 22.5 15 25 18 20 C15 15 11 17.5 5 20 Z"
        fill="#eab308"
      />
      {/* Center Core */}
      <circle cx="20" cy="20" r="3" fill="#1e293b" />
    </svg>
  )
}

/**
 * NSSTA Training Academy Seal
 * National Statistical Systems Training Academy (Greater Noida)
 */
export function NsstaSeal({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="25" cy="25" r="23" stroke="#334155" strokeWidth="1.5" strokeDasharray="2 1.5" />
      <circle cx="25" cy="25" r="20" stroke="#0284c7" strokeWidth="1" fill="#f8fafc" />
      
      {/* Central Book / Open Pages */}
      <path
        d="M25 27 C22 25 18 25 14 26 V18 C18 17 22 17 25 19 C28 17 32 17 36 18 V26 C32 25 28 25 25 27 Z"
        fill="#ffffff"
        stroke="#1e293b"
        strokeWidth="1.2"
      />
      <line x1="25" y1="19" x2="25" y2="28" stroke="#0284c7" strokeWidth="1.2" />

      {/* Academy Lamp / Flame */}
      <path d="M25 12 C24 14 23 15 25 17 C27 15 26 14 25 12 Z" fill="#f97316" />

      {/* Mini Data Bars under the book */}
      <rect x="18" y="32" width="3" height="4" rx="0.5" fill="#0284c7" />
      <rect x="23.5" y="30" width="3" height="6" rx="0.5" fill="#10b981" />
      <rect x="29" y="28" width="3" height="8" rx="0.5" fill="#6366f1" />
    </svg>
  )
}

/**
 * Parichay / Govt SSO Shield Icon
 */
export function GovtSsoShield({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2L4 5V11C4 16.5 7.5 21.2 12 22.5C16.5 21.2 20 16.5 20 11V5L12 2Z"
        fill="#1e3a8a"
        stroke="#2563eb"
        strokeWidth="1.5"
      />
      <text
        x="12"
        y="14.5"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="7.5"
        fontWeight="bold"
        fontFamily="sans-serif"
        letterSpacing="0.3"
      >
        SSO
      </text>
    </svg>
  )
}

/**
 * Government Building & Statistics Illustration
 * Features the Secretariat / Rashtrapati Bhavan dome with Indian Flag,
 * data charts, and officers collaborating.
 */
export function GovtBuildingIllustration({ className = '' }) {
  return (
    <svg
      viewBox="0 0 540 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0f7ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e0effe" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="domeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>

      {/* Gentle Sky & Horizon */}
      <rect width="540" height="280" fill="url(#skyGrad)" rx="16" />

      {/* Subtle Background Architectural Silhouettes (Secretariat / North Block) */}
      <g opacity="0.35">
        {/* Main Central Dome */}
        <path d="M240 140 C240 95 300 95 300 140 Z" fill="url(#domeGrad)" />
        {/* Dome Finial & Indian Flagpole */}
        <line x1="270" y1="95" x2="270" y2="60" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        {/* Indian Tricolor Flag */}
        <rect x="270" y="60" width="18" height="4" fill="#f97316" />
        <rect x="270" y="64" width="18" height="4" fill="#ffffff" />
        <circle cx="279" cy="66" r="1.2" fill="#0284c7" />
        <rect x="270" y="68" width="18" height="4" fill="#16a34a" />

        {/* Dome Colonnade Drum */}
        <rect x="232" y="140" width="76" height="25" fill="#cbd5e1" />
        <line x1="242" y1="140" x2="242" y2="165" stroke="#94a3b8" strokeWidth="2" />
        <line x1="256" y1="140" x2="256" y2="165" stroke="#94a3b8" strokeWidth="2" />
        <line x1="270" y1="140" x2="270" y2="165" stroke="#94a3b8" strokeWidth="2" />
        <line x1="284" y1="140" x2="284" y2="165" stroke="#94a3b8" strokeWidth="2" />
        <line x1="298" y1="140" x2="298" y2="165" stroke="#94a3b8" strokeWidth="2" />

        {/* Secretariat Wings */}
        <rect x="180" y="160" width="180" height="40" fill="#e2e8f0" rx="2" />
        <rect x="150" y="170" width="240" height="30" fill="#cbd5e1" rx="2" />
      </g>

      {/* Modern Statistical Dashboard Window Graphic (Center) */}
      <g filter="drop-shadow(0 10px 20px rgba(0,0,0,0.06))">
        {/* Floating Card */}
        <rect x="120" y="110" width="220" height="135" rx="10" fill="url(#chartGrad)" stroke="#e2e8f0" strokeWidth="1.5" />
        
        {/* Browser / App Header Dots */}
        <circle cx="135" cy="122" r="3" fill="#f87171" />
        <circle cx="144" cy="122" r="3" fill="#fbbf24" />
        <circle cx="153" cy="122" r="3" fill="#34d399" />
        <line x1="120" y1="132" x2="340" y2="132" stroke="#f1f5f9" strokeWidth="1.5" />

        {/* Donut Chart */}
        <circle cx="165" cy="175" r="22" stroke="#e2e8f0" strokeWidth="9" fill="none" />
        <circle
          cx="165"
          cy="175"
          r="22"
          stroke="#f97316"
          strokeWidth="9"
          strokeDasharray="45 100"
          strokeDashoffset="10"
          fill="none"
        />
        <circle
          cx="165"
          cy="175"
          r="22"
          stroke="#0284c7"
          strokeWidth="9"
          strokeDasharray="65 100"
          strokeDashoffset="60"
          fill="none"
        />

        {/* Histogram Bars in Card */}
        <rect x="140" y="215" width="8" height="15" rx="2" fill="#0284c7" />
        <rect x="152" y="208" width="8" height="22" rx="2" fill="#3b82f6" />
        <rect x="164" y="212" width="8" height="18" rx="2" fill="#60a5fa" />
        <rect x="176" y="205" width="8" height="25" rx="2" fill="#93c5fd" />

        {/* Trending Line Graph */}
        <path
          d="M210 185 L235 165 L260 178 L290 148 L320 155"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="235" cy="165" r="3" fill="#2563eb" />
        <circle cx="260" cy="178" r="3" fill="#2563eb" />
        <circle cx="290" cy="148" r="3" fill="#2563eb" />
        <circle cx="320" cy="155" r="3" fill="#2563eb" />
      </g>

      {/* Left Officer (Woman with Laptop) */}
      <g>
        {/* Office Chair */}
        <path d="M48 200 C48 180 60 170 80 170 C100 170 112 180 112 200 Z" fill="#475569" />
        {/* Body & Coat */}
        <path d="M60 210 C60 185 100 185 100 210 V250 H60 Z" fill="#38bdf8" />
        {/* Head & Hair */}
        <circle cx="80" cy="162" r="14" fill="#fed7aa" />
        <path d="M66 160 C66 145 94 145 94 160 C94 175 66 175 66 160 Z" fill="#1e293b" />
        {/* Laptop */}
        <path d="M75 220 L115 220 L120 238 L70 238 Z" fill="#1e293b" />
        <rect x="80" y="195" width="34" height="24" rx="2" fill="#0f172a" />
        <rect x="83" y="198" width="28" height="18" rx="1" fill="#38bdf8" />
      </g>

      {/* Right Officer (Man Pointing to Analytics) */}
      <g>
        {/* Office Chair */}
        <path d="M420 200 C420 180 432 170 452 170 C472 170 484 180 484 200 Z" fill="#475569" />
        {/* Body & Shirt (MoSPI Green / Teal) */}
        <path d="M410 205 C410 180 450 180 450 205 V250 H410 Z" fill="#10b981" />
        {/* Head & Hair */}
        <circle cx="430" cy="162" r="14" fill="#fed7aa" />
        <path d="M416 156 C416 148 444 148 444 156 C444 162 438 165 430 165 Z" fill="#0f172a" />
        {/* Arm extending to gesture toward chart */}
        <path d="M410 195 Q380 185 365 178" stroke="#10b981" strokeWidth="8" strokeLinecap="round" />
        <circle cx="363" cy="177" r="4" fill="#fed7aa" />
      </g>
    </svg>
  )
}

export const StatSkillLogo = KaushalAiLogo
