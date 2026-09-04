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

/**
 * Karmayogi-style KaushalAI Brand Emblem & Tagline Lockup
 * Matches the official winged sun/lotus emblem and "कौशल AI / KaushalAI — लोकहितं मम करणीयम् —"
 */
export function KarmayogiKaushalLogo({ className = '', scale = 1 }) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14 * scale,
        userSelect: 'none',
      }}
    >
      {/* Winged Sun / Lotus Emblem */}
      <svg
        width={56 * scale}
        height={48 * scale}
        viewBox="0 0 70 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldWingL" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="goldWingR" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="blueLoop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>

        {/* Outer Left Feathers / Rays */}
        <path d="M35 30 C28 22 18 16 8 18 C12 25 20 30 35 32 Z" fill="url(#goldWingL)" />
        <path d="M35 28 C26 17 18 10 12 8 C14 17 24 23 35 29 Z" fill="url(#goldWingL)" opacity="0.9" />
        <path d="M35 25 C28 14 24 6 20 2 C20 12 28 20 35 26 Z" fill="url(#goldWingL)" opacity="0.8" />
        
        {/* Outer Right Feathers / Rays */}
        <path d="M35 30 C42 22 52 16 62 18 C58 25 50 30 35 32 Z" fill="url(#goldWingR)" />
        <path d="M35 28 C44 17 52 10 58 8 C56 17 46 23 35 29 Z" fill="url(#goldWingR)" opacity="0.9" />
        <path d="M35 25 C42 14 46 6 50 2 C50 12 42 20 35 26 Z" fill="url(#goldWingR)" opacity="0.8" />

        {/* Center Golden Flame / Lotus Core */}
        <path d="M35 5 C32 14 30 22 35 30 C40 22 38 14 35 5 Z" fill="#f59e0b" />
        <circle cx="35" cy="18" r="3" fill="#ea580c" />

        {/* Center Blue Figure / Dynamic Loop */}
        <path
          d="M35 30 C30 35 26 40 29 46 C31 50 35 50 35 45 C35 50 39 50 41 46 C44 40 40 35 35 30 Z"
          fill="url(#blueLoop)"
        />
        <circle cx="35" cy="36" r="3.2" fill="#0284c7" />
        <path d="M32 46 C34 52 36 55 35 58" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" />
      </svg>

      {/* Brand Name & Sanskrit Tagline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 * scale }}>
          <span
            style={{
              fontFamily: "'Segoe UI', Roboto, 'Nirmala UI', sans-serif",
              fontSize: 26 * scale,
              fontWeight: 800,
              color: '#ea580c',
              letterSpacing: '-0.01em',
            }}
          >
            कौशल
          </span>
          <span
            style={{
              fontFamily: "'Segoe UI', Roboto, 'Nirmala UI', sans-serif",
              fontSize: 26 * scale,
              fontWeight: 800,
              color: '#005a9c',
              letterSpacing: '0.02em',
            }}
          >
            AI
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6 * scale,
            marginTop: 3 * scale,
            width: '100%',
          }}
        >
          <div style={{ height: 1.5, background: '#cbd5e1', flex: 1 }} />
          <span
            style={{
              fontSize: 10.5 * scale,
              fontWeight: 700,
              color: '#334155',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              fontFamily: "'Nirmala UI', serif",
            }}
          >
            लोकहितं मम करणीयम्
          </span>
          <div style={{ height: 1.5, background: '#cbd5e1', flex: 1 }} />
        </div>
      </div>
    </div>
  )
}

/**
 * Built-in High-Fidelity "How To Login" Infographic
 * Matches the left-side illustration of Screenshots 1 & 2
 */
export function HowToLoginInfographic() {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 540,
        color: '#ffffff',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        padding: '20px 10px',
      }}
    >
      {/* Title Header */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#fbbf24',
            letterSpacing: '0.02em',
            marginBottom: 4,
          }}
        >
          Welcome to <span style={{ color: '#ffffff' }}>Kaushal AI</span>
        </div>
        <div
          style={{
            fontSize: '2.4rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            display: 'inline-flex',
            alignItems: 'baseline',
            position: 'relative',
          }}
        >
          How To Log
          <span
            style={{
              position: 'relative',
              display: 'inline-block',
              borderBottom: '3.5px solid #f97316',
              paddingBottom: 2,
              marginLeft: 2,
            }}
          >
            in
            {/* White Mouse Pointer Arrow */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="1.2"
              style={{
                position: 'absolute',
                right: -16,
                bottom: -10,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
              }}
            >
              <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" />
            </svg>
          </span>
        </div>
      </div>

      {/* Step 1: Email ID issues */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
        {/* Circular Dial badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              border: '10px solid #ffffff',
              borderTopColor: '#f97316',
              borderLeftColor: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0c4fa8',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                background: '#1e3a8a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Officer / Lock icon */}
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Text and bullet points */}
        <div style={{ flex: 1, paddingTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <span
              style={{
                background: '#ea580c',
                color: '#ffffff',
                width: 26,
                height: 26,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 14,
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              !
            </span>
            <span
              style={{
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: '1.05rem',
                lineHeight: 1.35,
              }}
            >
              In case you face issues while logging in with your email ID
            </span>
          </div>

          <ul
            style={{
              margin: '0 0 0 36px',
              padding: 0,
              fontSize: '0.88rem',
              color: '#f8fafc',
              lineHeight: 1.55,
              listStyleType: 'disc',
            }}
          >
            <li>Clear the browser cache</li>
            <li>Open the browser's private window by pressing Ctrl+Shift+N</li>
            <li>Login with mobile OTP after selecting the 'Log in with OTP' option</li>
          </ul>
        </div>
      </div>

      {/* Step 2: Parichay issues */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
        <div style={{ flex: 1, paddingTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <span
              style={{
                background: '#ea580c',
                color: '#ffffff',
                width: 26,
                height: 26,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 14,
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              2
            </span>
            <span
              style={{
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: '1.05rem',
                lineHeight: 1.35,
              }}
            >
              In case you face issues while logging in with Parichay
            </span>
          </div>

          <ul
            style={{
              margin: '0 0 0 36px',
              padding: 0,
              fontSize: '0.88rem',
              color: '#f8fafc',
              lineHeight: 1.55,
              listStyleType: 'disc',
            }}
          >
            <li>Log out from all open Parichay websites/tabs</li>
            <li>Clear the browser cache</li>
            <li>Open the browser's private window by pressing Ctrl+Shift+N</li>
            <li>Login to the Kaushal AI portal with Parichay credentials and enter OTP</li>
            <li>Tick both the Mobile Number and Primary Email ID checkboxes and click Allow button.</li>
          </ul>
        </div>

        {/* Circular Parichay Badge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              border: '10px solid #ffffff',
              borderBottomColor: '#f97316',
              borderRightColor: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0c4fa8',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: '50%',
                background: '#ea580c',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                textAlign: 'center',
                padding: 4,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5 }}>PARICHAY</div>
              <div style={{ fontSize: 7, opacity: 0.9 }}>Single, Simplified, Safe</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Built-in High-Fidelity "How To Register" Infographic
 * Matches the left-side illustration of Screenshot 3
 */
export function HowToRegisterInfographic() {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 520,
        color: '#ffffff',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 10px',
        position: 'relative',
      }}
    >
      {/* 2x2 Grid of Instructions around Center Circle */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px 24px',
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Node 1: Top Left */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.4, color: '#ffffff', marginBottom: 12, minHeight: 45 }}>
            You can only register with your government Email ID on the Kaushal AI platform
          </p>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#ffffff',
              border: '3px solid #f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
          >
            {/* Mail Icon */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#ea580c',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              1
            </span>
          </div>
        </div>

        {/* Node 2: Top Right */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.4, color: '#ffffff', marginBottom: 12, minHeight: 45 }}>
            In case you do not have government Email ID, please contact the MDO admin of your organization to onboard you
          </p>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#ffffff',
              border: '3px solid #f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
          >
            {/* Officer / Settings Icon */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#ea580c',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              2
            </span>
          </div>
        </div>

        {/* Center Circular Emblem */}
        <div
          style={{
            gridColumn: '1 / span 2',
            margin: '6px auto',
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
            Welcome to <span style={{ color: '#005a9c' }}>Kaushal AI</span>
          </div>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#ea580c',
              lineHeight: 1.15,
            }}
          >
            How To
            <br />
            Register
          </div>
        </div>

        {/* Node 3: Bottom Left */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#ffffff',
              border: '3px solid #f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              position: 'relative',
              marginBottom: 12,
            }}
          >
            {/* Search Doc Icon */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <circle cx="11" cy="14" r="3" />
              <line x1="13.5" y1="16.5" x2="16" y2="19" />
            </svg>
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#ea580c',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              3
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.4, color: '#ffffff' }}>
            To find your MDO admin details{' '}
            <span
              style={{
                display: 'inline-block',
                background: '#f97316',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: '0.78rem',
                marginTop: 4,
              }}
            >
              Click Here
            </span>
          </p>
        </div>

        {/* Node 4: Bottom Right */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#ffffff',
              border: '3px solid #f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              position: 'relative',
              marginBottom: 12,
            }}
          >
            {/* Monitor / Check Icon */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <path d="m9 10 2 2 4-4" />
            </svg>
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#ea580c',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              4
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.4, color: '#ffffff' }}>
            In case the details of your MDO admin are not in the list, please connect within your organization
          </p>
        </div>
      </div>
    </div>
  )
}
