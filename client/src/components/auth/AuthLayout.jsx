import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Globe,
  ChevronDown,
  Brain,
  BookOpen,
  FileCheck,
  BarChart3,
  ShieldCheck,
  Lock,
  Headphones,
} from 'lucide-react'
import {
  AshokaLionEmblem,
  KaushalAiLogo,
  IgotLogo,
  NsstaSeal,
  GovtBuildingIllustration,
} from './GovtEmblems'
import styles from '../../styles/AuthPage.module.css'

const FEATURES = [
  {
    icon: Brain,
    circleClass: styles.featureIconPurple,
    title: 'AI Driven Skill Intelligence',
    desc: 'Identify competency gaps and get personalized learning recommendations',
  },
  {
    icon: BookOpen,
    circleClass: styles.featureIconGreen,
    title: 'Seamless iGOT Integration',
    desc: "Access iGOT Karmayogi courses and NSSTA's TPAC training programmes",
  },
  {
    icon: FileCheck,
    circleClass: styles.featureIconOrange,
    title: 'AI Generated Assessments',
    desc: 'Generate MCQs and quizzes from uploaded learning materials',
  },
  {
    icon: BarChart3,
    circleClass: styles.featureIconBlue,
    title: 'Data Driven Insights',
    desc: 'Track progress, measure impact and strengthen capacity building',
  },
]

export default function AuthLayout({ children }) {
  const [lang, setLang] = useState('English')

  return (
    <div className={styles.pageRoot}>
      {/* ── Top Official Government Bar ── */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <AshokaLionEmblem size={34} />
          <div className={styles.topBarMinistry}>
            <span className={styles.topBarMinistryName}>
              Ministry of Statistics &amp; Programme Implementation
            </span>
            <span className={styles.topBarGovt}>Government of India</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.langSelector}
          onClick={() => setLang((l) => (l === 'English' ? 'हिन्दी' : 'English'))}
          title="Change language / भाषा बदलें"
        >
          <Globe size={15} color="#475569" />
          <span>{lang}</span>
          <ChevronDown size={13} color="#94a3b8" />
        </button>
      </header>

      {/* ── Main Dual-Panel Container ── */}
      <main className={styles.mainContainer}>
        {/* Left Column: Brand, Features, Illustration, Co-Branding */}
        <section className={styles.heroCol}>
          <div className={styles.logoHeadingRow}>
            <KaushalAiLogo size={42} />
            <div className={styles.logoTextWrap}>
              <div className={styles.brandTitle}>
                Kaushal<span className={styles.brandTitleAi}>AI</span>
              </div>
              <div className={styles.brandSubtitle}>
                AI Enabled Learning Platform for Official Statistics
              </div>
            </div>
          </div>

          <h1 className={styles.heroTagline}>
            Empowering India&apos;s
            <br />
            Official Statistics Workforce
          </h1>

          <p className={styles.heroDesc}>
            AI-powered skill intelligence, personalized learning and continuous assessment
            through integration with iGOT Karmayogi ecosystem.
          </p>

          <div className={styles.featureList}>
            {FEATURES.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className={styles.featureItem}>
                  <div className={`${styles.featureIconCircle} ${item.circleClass}`}>
                    <Icon size={19} />
                  </div>
                  <div className={styles.featureContent}>
                    <span className={styles.featureTitle}>{item.title}</span>
                    <span className={styles.featureDesc}>{item.desc}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.illustrationWrap}>
            <GovtBuildingIllustration />
          </div>

          {/* Bottom Co-branding Card */}
          <div className={styles.coBrandingCard}>
            <div className={styles.coBrandItem}>
              <AshokaLionEmblem size={26} />
              <div className={styles.coBrandText}>
                <span className={styles.coBrandName}>MoSPI</span>
                <span className={styles.coBrandDesc}>
                  Ministry of Statistics &amp; Programme Implementation
                </span>
              </div>
            </div>

            <div className={styles.coBrandItem}>
              <IgotLogo size={24} />
              <div className={styles.coBrandText}>
                <span className={styles.coBrandName}>iGOT</span>
                <span className={styles.coBrandDesc}>Karmayogi</span>
              </div>
            </div>

            <div className={styles.coBrandItem}>
              <NsstaSeal size={28} />
              <div className={styles.coBrandText}>
                <span className={styles.coBrandName}>NSSTA</span>
                <span className={styles.coBrandDesc}>
                  National Statistical System Training Academy
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Floating Auth Card */}
        <section className={styles.cardCol}>{children}</section>
      </main>

      {/* ── Trust & Compliance Footer ── */}
      <footer className={styles.footerContainer}>
        <div className={styles.footerColumns}>
          <div className={styles.footerCol}>
            <div
              className={styles.footerColIcon}
              style={{ background: '#eff6ff', color: '#2563eb' }}
            >
              <ShieldCheck size={20} />
            </div>
            <div className={styles.footerColContent}>
              <span className={styles.footerColTitle}>Secure &amp; Compliant</span>
              <span className={styles.footerColDesc}>
                Your data is protected with enterprise-grade security
              </span>
            </div>
          </div>

          <div className={styles.footerCol}>
            <div
              className={styles.footerColIcon}
              style={{ background: '#ede9fe', color: '#7c3aed' }}
            >
              <Lock size={20} />
            </div>
            <div className={styles.footerColContent}>
              <span className={styles.footerColTitle}>Privacy First</span>
              <span className={styles.footerColDesc}>
                We comply with government data protection policies
              </span>
            </div>
          </div>

          <div className={styles.footerCol}>
            <div
              className={styles.footerColIcon}
              style={{ background: '#f0fdf4', color: '#16a34a' }}
            >
              <Headphones size={20} />
            </div>
            <div className={styles.footerColContent}>
              <span className={styles.footerColTitle}>Need Help?</span>
              <span className={styles.footerColDesc}>support@kaushalai.gov.in</span>
            </div>
          </div>
        </div>

        <div className={styles.subFooter}>
          <Link to="/privacy" className={styles.subFooterLink}>
            Privacy Policy
          </Link>
          <span className={styles.subFooterDot}>•</span>
          <Link to="/terms" className={styles.subFooterLink}>
            Terms of Use
          </Link>
          <span className={styles.subFooterDot}>•</span>
          <Link to="/support" className={styles.subFooterLink}>
            Help &amp; Support
          </Link>
          <span className={styles.subFooterDot}>•</span>
          <Link to="/contact" className={styles.subFooterLink}>
            Contact Us
          </Link>
          <span className={styles.subFooterDot}>•</span>
          <span className={styles.copyright}>© 2026 MoSPI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
