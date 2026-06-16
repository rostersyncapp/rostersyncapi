'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';


// Vercel Style Theme:
// - Background: pure black (#000000) or ultra-dark (#050505)
// - Borders: fine neutral lines (#262626 / border-neutral-800)
// - Typography: high-contrast white and neutral-400
// - Accents: subtle grays, clean white buttons, and crisp tabular numbers
// - Background: Vivid color gradients (mesh style, no grid lines)

// RosterSync league lists (excluding NCAA) — using official league_logos from Supabase Storage
const SUPABASE_LOGOS = 'https://rddqcxfalrlmlvirjlca.supabase.co/storage/v1/object/public/logos/league_logos';

const LEAGUES = [
  { id: 'NFL',        name: 'National Football League',          logoUrl: `${SUPABASE_LOGOS}/nfl.svg` },
  { id: 'NHL',        name: 'National Hockey League',            logoUrl: `${SUPABASE_LOGOS}/nhl.svg` },
  { id: 'MLB',        name: 'Major League Baseball',             logoUrl: `${SUPABASE_LOGOS}/mlb.svg` },
  { id: 'NBA',        name: 'National Basketball Association',   logoUrl: `${SUPABASE_LOGOS}/nba.svg` },
  { id: 'MLS',        name: 'Major League Soccer',               logoUrl: `${SUPABASE_LOGOS}/mls.svg` },
  { id: 'MiLB',       name: 'Minor League Baseball',             logoUrl: `${SUPABASE_LOGOS}/milb.svg` },
  { id: 'WNBA',       name: "Women's National Basketball Assoc", logoUrl: `${SUPABASE_LOGOS}/wnba.svg` },
  { id: 'NWSL',       name: "National Women's Soccer League",    logoUrl: `${SUPABASE_LOGOS}/nwsl.svg` },
  { id: 'USL',        name: 'United Soccer League',              logoUrl: `${SUPABASE_LOGOS}/usl.png` },
  { id: 'EPL',        name: 'Premier League',                    logoUrl: `${SUPABASE_LOGOS}/premier1.png` },
  { id: 'LA LIGA',    name: 'La Liga',                           logoUrl: `${SUPABASE_LOGOS}/la-liga.svg` },
  { id: 'SERIE A',    name: 'Serie A',                           logoUrl: `${SUPABASE_LOGOS}/serieA.png` },
  { id: 'BUNDESLIGA', name: 'Bundesliga',                        logoUrl: `${SUPABASE_LOGOS}/bundesliga.svg` },
  { id: 'LIGUE 1',    name: 'Ligue 1',                           logoUrl: `${SUPABASE_LOGOS}/ligue1.png` },
  { id: 'LIGA MX',    name: 'Liga MX',                           logoUrl: `${SUPABASE_LOGOS}/liga-mx.svg` },
  { id: 'EREDIVISIE', name: 'Eredivisie',                        logoUrl: `${SUPABASE_LOGOS}/eredivisie.svg` },
  { id: 'IPL',        name: 'Indian Premier League',             logoUrl: `${SUPABASE_LOGOS}/ipl.svg` },
];

const INTEGRATIONS = [
  { id: 'ICONIK',     name: 'Iconik',         logoUrl: 'https://rddqcxfalrlmlvirjlca.supabase.co/storage/v1/object/public/logos/systems/iconik.png' },
  { id: 'CATDV',      name: 'CatDV',          logoUrl: 'https://rddqcxfalrlmlvirjlca.supabase.co/storage/v1/object/public/logos/systems/catdv.png' },
];

// Rich mockup data for top players from each major league
const FAQ_ITEMS = [
  {
    q: 'Which sports leagues does RosterSync cover?',
    a: 'RosterSync covers all major professional and collegiate leagues under a single, all-access plan. Supported leagues include: NFL, NHL, MLB, NBA, MLS, MiLB, WNBA, NWSL, USL, English Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Liga MX, Eredivisie, IPL, NCAA Football, NCAA Men\'s Basketball, and NCAA Women\'s Basketball.'
  },
  {
    q: 'How does automated delivery work?',
    a: 'RosterSync is built for zero manual setup. Your roster metadata is delivered via direct CSV downloads, automated daily email digests, and real-time DAM push events (Iconik and CatDV).'
  },
  {
    q: 'What DAM platforms are supported?',
    a: 'We offer native metadata pushes directly into Iconik and CatDV, ensuring your production assets are perfectly synced with live roster changes.'
  },
  {
    q: 'Is there a free tier or trial?',
    a: 'We offer a 14-day free trial (no credit card required) to test the synchronization with your DAM. After that, plans start at $49/month for Sync and $149/month for Studio.'
  },
  {
    q: 'What is included in the athlete metadata?',
    a: 'The metadata payload includes core player data (Name, Number, Position, Class/Year, Height, Weight) as well as advanced enrichment: simplified phonetic spellings, full IPA guides, Mandarin translations, and team brand hex colors.'
  },
  {
    q: 'Does RosterSync track live play-by-play statistics?',
    a: 'No. We focus exclusively on player identity, name pronunciation, translations, and preserving historical archives. By keeping the payload concentrated on identity metadata, we ensure seamless deliveries to your DAM.'
  }
];

const PRICING_TIERS = [
  {
    name: 'Sync',
    price: '$49',
    desc: 'Best for mid-major D1, small pro operations, and independent teams.',
    features: [
      'CSV download + daily email digest',
      '3 NCAA leagues (FB, MBB, WBB) + 1 pro league',
      '3-year historical archive',
      'Basic data: Name, #, position, class, height, weight',
      'Optional Google Sheets sync',
      '14-day free trial, no credit card required'
    ],
    highlighted: false,
    cta: 'Start Free Trial'
  },
  {
    name: 'Studio',
    price: '$149',
    desc: 'Best for Power 5 programs, professional teams, and media networks.',
    features: [
      'CSV download + daily email digest',
      'Real-time DAM push (Iconik & CatDV)',
      'Broadcast polling URL (Vizrt, Ross, Chyron)',
      'All 18 professional & college leagues',
      '25-year comprehensive historical archive',
      'Full data: Phonetics, IPA keys, Mandarin, team colors',
      'Optional Google Sheets sync',
      '14-day free trial, no credit card required'
    ],
    highlighted: true,
    cta: 'Start Free Trial'
  }
];

export default function VercelStylePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Contact Modal States
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);



  return (
    <div 
      className="min-h-screen text-text-primary selection:bg-white selection:text-black antialiased font-sans relative overflow-x-hidden page-hero-bg"
    >
      
      {/* ─── BACKGROUND EFFECTS ─── */}
      {/* High-Intensity Vivid Ambient Side Glows */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[900px] h-[900px] rounded-full blur-[150px] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at center, var(--glow-2) 0%, transparent 70%)' }}
      />
      <div 
        className="absolute top-[10%] right-[-10%] w-[900px] h-[900px] rounded-full blur-[150px] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at center, var(--glow-1) 0%, transparent 70%)' }}
      />
      <div 
        className="absolute bottom-[-10%] left-[15%] w-[800px] h-[800px] rounded-full blur-[140px] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at center, var(--glow-3) 0%, transparent 70%)' }}
      />

      <header className="border-b border-border-custom bg-bg-surface/80 fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight text-text-primary flex items-center gap-2 group">
              <svg className="w-5 h-5 text-text-primary transition-transform group-hover:scale-105" viewBox="0 0 75 65" fill="currentColor">
                <path d="M37.59.25L75.02 65H.16L37.59.25z" />
              </svg>
              <span className="text-text-primary font-bold text-base">rostersync</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium uppercase tracking-wider text-text-secondary">
              <span onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-text-primary transition-colors cursor-pointer">Overview</span>
              <span onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-text-primary transition-colors cursor-pointer">Pricing</span>
              <span onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-text-primary transition-colors cursor-pointer">FAQ</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login" className="text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">Log in</Link>
            <Link href="/signup" className="bg-text-primary text-bg-primary hover:opacity-90 text-xs px-3.5 py-1.5 font-bold uppercase tracking-wider rounded-md transition-all shadow-md cursor-pointer">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-20 relative z-10">
        
        {/* Soft, Centered Spotlight Glow */}
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-gradient-to-r from-blue-500/15 via-emerald-500/20 to-teal-500/15 rounded-full blur-[120px] pointer-events-none z-0 select-none" />

        <div className="text-center max-w-4xl mx-auto mb-20 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-bg-surface border border-border-custom text-text-secondary mb-6 shadow-inner hover:border-accent transition-all duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
            Real-time metadata pipeline
          </span>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-6">
            <span className="text-text-primary">
              Roster Metadata.
            </span>
            <br />
            <span className="text-accent italic">
              Auto-Synced to your DAM.
            </span>
          </h1>
          
          <p className="mt-8 text-text-primary text-lg md:text-xl font-medium leading-relaxed max-w-3xl mx-auto">
            RosterSync delivers enriched player metadata—including pronunciation guides, IPA keys, Mandarin translations, and team colors—directly into Digital Asset Management systems.
          </p>
          
          <p className="mt-4 text-text-secondary text-xs md:text-sm leading-relaxed max-w-2xl mx-auto">
            Sync 25 years of player history across 18 leagues straight to your DAM (Iconik, CatDV). The entire pipeline runs automatically behind the scenes, keeping your production assets current without anyone touching a keyboard.
          </p>
        </div>



        {/* Leagues Ticker (Scrolls Left) */}
        <section className="mb-6 w-full overflow-hidden py-7 bg-transparent relative">
          <div className="animate-ticker flex items-center gap-16 select-none">
            {/* First Loop */}
            {LEAGUES.map((league) => (
              <div key={league.id} className="flex items-center gap-4 shrink-0">
                {league.logoUrl && (
                  <img 
                    src={league.logoUrl} 
                    alt={`${league.name} logo`} 
                    className="h-14 w-auto object-contain opacity-90 hover:opacity-100 transition-all duration-300"
                  />
                )}
              </div>
            ))}
            {/* Second Loop for Infinite scroll */}
            {LEAGUES.map((league) => (
              <div key={`${league.id}-dup`} className="flex items-center gap-4 shrink-0">
                {league.logoUrl && (
                  <img 
                    src={league.logoUrl} 
                    alt={`${league.name} logo`} 
                    className="h-14 w-auto object-contain opacity-90 hover:opacity-100 transition-all duration-300"
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Integrations (Static Logos) */}
        <section className="mb-24 w-full py-8 bg-transparent relative">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-12 sm:gap-16 px-6">
            {INTEGRATIONS.map((int) => (
              <div key={int.id} className="flex items-center justify-center shrink-0">
                {int.logoUrl && (
                  <img 
                    src={int.logoUrl} 
                    alt={`${int.name} logo`} 
                    className="h-10 w-auto object-contain transition-all duration-300 hover:scale-105"
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        <br />

        {/* Platform Features Section - Technical Editorial / Brutalist Swiss Remix */}
        <section id="features" className="mb-28 border-t border-border-custom pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Sticky Left Column: Typographic Header & Legend */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
              <span className="text-accent font-mono text-xs uppercase tracking-widest font-bold block mb-4">
                // DELIVERY CHANNELS
              </span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-text-primary leading-none">
                Automated Metadata Delivery
              </h2>
              <p className="text-text-secondary text-sm font-mono mt-6 leading-relaxed">
                RosterSync delivers enriched roster metadata directly into your existing production workflow. No API keys, no polling loops, no manual mapping.
              </p>
              
              <div className="mt-8 border-t border-border-custom pt-6 hidden lg:block">
                <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active pipeline updates</span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-text-muted">
                  Daily refreshes &bull; Real-time push triggers
                </div>
              </div>
            </div>

            {/* Right Column: Staggered High-Contrast Feature Cards */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Feature 1: DAM Push */}
              <div className="border border-accent/40 bg-bg-surface p-8 hover:border-accent transition-all duration-300 relative group flex flex-col justify-between min-h-[180px] shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-accent font-mono text-xs block mb-1">01 &bull; ENTERPRISE INGESTION</span>
                    <h3 className="text-xl font-bold text-text-primary group-hover:text-accent transition-colors">Direct DAM Push</h3>
                  </div>
                  <span className="text-[10px] font-mono text-accent bg-accent/10 border border-accent/30 px-2 py-0.5 uppercase tracking-wider font-semibold">
                    Studio Tier
                  </span>
                </div>
                <p className="text-text-secondary text-sm font-mono mt-4 leading-relaxed">
                  Pushes rich player metadata directly into Digital Asset Management systems. Keep asset libraries in Iconik or CatDV perfectly synchronized whenever trades, call-ups, or retirements are triggered.
                </p>
                <div className="mt-6 border-t border-border-custom pt-4 flex flex-wrap gap-2">
                  {['Iconik Integration', 'CatDV Agent', 'Real-time Event Webhooks'].map((tag) => (
                    <span key={tag} className="text-[9px] font-mono text-text-muted border border-border-custom px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Feature 2: CSV Download */}
              <div className="border border-border-custom bg-bg-surface p-8 hover:border-accent transition-all duration-300 relative group flex flex-col justify-between min-h-[180px] shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-text-muted font-mono text-xs block mb-1">02 &bull; THE BASELINE</span>
                    <h3 className="text-xl font-bold text-text-primary group-hover:text-accent transition-colors">On-Demand CSV Export</h3>
                  </div>
                  <span className="text-[10px] font-mono text-text-secondary bg-bg-primary border border-border-custom px-2 py-0.5 uppercase tracking-wider">
                    Both Tiers
                  </span>
                </div>
                <p className="text-text-secondary text-sm font-mono mt-4 leading-relaxed">
                  Log in and download instant snapshots of full roster registries. Comes pre-populated with Player Names, Jersey Numbers, Positions, Class/Year, Height, Weight, Phonetics, and IPA keys.
                </p>
                <div className="mt-6 border-t border-border-custom pt-4 flex flex-wrap gap-2">
                  {['Player ID', 'Phonetics', 'IPA Mappings', 'Mandarin Translations'].map((tag) => (
                    <span key={tag} className="text-[9px] font-mono text-text-muted border border-border-custom px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Feature 3: Daily Email Digest */}
              <div className="border border-border-custom bg-bg-surface p-8 hover:border-accent transition-all duration-300 relative group flex flex-col justify-between min-h-[180px] shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-text-muted font-mono text-xs block mb-1">03 &bull; AUTOMATED SUMMARIES</span>
                    <h3 className="text-xl font-bold text-text-primary group-hover:text-accent transition-colors">Daily Email Digest</h3>
                  </div>
                  <span className="text-[10px] font-mono text-text-secondary bg-bg-primary border border-border-custom px-2 py-0.5 uppercase tracking-wider">
                    Both Tiers
                  </span>
                </div>
                <p className="text-text-secondary text-sm font-mono mt-4 leading-relaxed">
                  A daily safety net for SIDs. Every morning during the active season, receive a summary of all team changes (transfers, additions, number swaps) with the latest CSV automatically attached.
                </p>
                <div className="mt-6 border-t border-border-custom pt-4 flex flex-wrap gap-2">
                  {['Transaction Logs', 'Auto-attachments', 'Season Sync'].map((tag) => (
                    <span key={tag} className="text-[9px] font-mono text-text-muted border border-border-custom px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </section>


        {/* Pricing Tiers Grid */}
        <section id="pricing" className="mb-28">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-text-secondary font-mono text-xs uppercase tracking-widest font-bold">// PRICING</span>
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-text-primary mt-4">Predictable, Flat Monthly Pricing</h2>
            <p className="text-text-secondary text-xs font-mono mt-4">No hidden setup fees. Start syncing rosters immediately.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-3xl mx-auto">
            {PRICING_TIERS.map(tier => (
              <div 
                key={tier.name} 
                className={`border rounded-xl p-6 flex flex-col justify-between relative transition-all bg-bg-surface ${
                  tier.highlighted 
                    ? 'border-accent shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                    : 'border-border-custom hover:border-accent/50'
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute top-0 right-6 translate-y-[-50%] bg-emerald-500 text-black text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded">
                    Recommended
                  </span>
                )}
                <div>
                  <div className="font-mono text-xs text-text-secondary uppercase tracking-widest mb-2">{tier.name}</div>
                  <div className="flex items-baseline gap-1 my-4">
                    <span className="text-4xl font-bold text-text-primary tracking-tight font-mono">{tier.price}</span>
                    <span className="text-xs text-text-muted font-mono">/mo</span>
                  </div>
                  <p className="text-text-secondary text-xs font-mono min-h-[48px] border-b border-border-custom pb-4 mb-4">{tier.desc}</p>
                  
                  <ul className="space-y-3">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] font-mono text-text-secondary">
                        <span className="text-emerald-500 font-bold shrink-0">&bull;</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link 
                  href={`/signup?tier=${tier.name.toLowerCase()}`}
                  className="mt-6 w-full py-2 text-xs uppercase tracking-wider font-mono font-bold transition-all rounded-md border bg-text-primary text-bg-primary border-text-primary hover:opacity-90 block text-center"
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="mb-0">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-text-secondary font-mono text-xs uppercase tracking-widest font-bold">// FAQ</span>
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-text-primary mt-4">Frequent Questions</h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border border-border-custom rounded-lg overflow-hidden bg-bg-surface transition-all hover:border-accent">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 font-mono text-sm text-left text-text-primary hover:bg-bg-primary/50 transition-colors"
                >
                  <span>{item.q}</span>
                  <span className={`text-emerald-400 transform transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 font-mono text-xs text-text-secondary leading-relaxed border-t border-border-custom pt-4 animate-fade-in">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border-custom bg-bg-surface/90 py-5 fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-semibold tracking-tight">[R] rostersync</span>
            <span className="text-text-muted font-mono text-xs">v2.0</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsContactOpen(true)}
              className="text-text-secondary hover:text-text-primary font-mono text-[11px] transition-colors cursor-pointer"
            >
              Contact
            </button>
            <div className="w-[1px] h-3 bg-border-custom" />
            <a href="https://x.com/rostersync" target="_blank" rel="noopener noreferrer" aria-label="X (formerly Twitter)" className="text-text-secondary hover:text-text-primary transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/ryanroettele/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-text-secondary hover:text-text-primary transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-bg-surface border border-border-custom p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => {
                setIsContactOpen(false);
                setSendSuccess(false);
                setContactEmail('');
                setContactMessage('');
              }}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors text-sm"
              aria-label="Close modal"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-text-primary mb-1 uppercase tracking-wider font-mono">Contact Support</h3>
            <p className="text-[11px] text-text-muted mb-6 font-mono">// Send a message to our RosterSync engineers.</p>
            
            {sendSuccess ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-accent/10 border border-accent flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent font-bold text-lg font-mono">✓</span>
                </div>
                <h4 className="text-sm font-bold text-text-primary mb-1 uppercase tracking-wider font-mono">Message Sent!</h4>
                <p className="text-[11px] text-text-secondary font-mono">We will get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                setIsSending(true);
                setTimeout(() => {
                  setIsSending(false);
                  setSendSuccess(true);
                }, 1000);
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-1.5">// Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-bg-primary border border-border-custom px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors font-mono"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-1.5">// Message</label>
                  <textarea 
                    required 
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full bg-bg-primary border border-border-custom px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors font-mono resize-none"
                    placeholder="How can we help your team?"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSending}
                  className="w-full bg-text-primary text-bg-primary hover:opacity-90 disabled:opacity-50 text-xs font-mono font-bold uppercase tracking-wider py-2.5 transition-all shadow-md mt-2"
                >
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
