'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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
  { id: 'VIZRT',      name: 'Vizrt',          logoUrl: 'https://rddqcxfalrlmlvirjlca.supabase.co/storage/v1/object/public/logos/systems/vizrt-seeklogo.png' },
  { id: 'ROSS VIDEO', name: 'Ross Video',     logoUrl: 'https://rddqcxfalrlmlvirjlca.supabase.co/storage/v1/object/public/logos/systems/Ross-logo.png' },
  { id: 'CHYRON',     name: 'Chyron',         logoUrl: 'https://rddqcxfalrlmlvirjlca.supabase.co/storage/v1/object/public/logos/systems/chyron-corporation-seeklogo.png' },
  { id: 'ICONIK',     name: 'Iconik',         logoUrl: 'https://rddqcxfalrlmlvirjlca.supabase.co/storage/v1/object/public/logos/systems/iconik.png' },
  { id: 'CATDV',      name: 'CatDV',          logoUrl: 'https://rddqcxfalrlmlvirjlca.supabase.co/storage/v1/object/public/logos/systems/catdv.png' },
];

// Rich mockup data for top players from each major league
const MOCK_PLAYERS: Record<string, any> = {
  NFL: {
    endpoint: 'GET /v1/athletes/nfl-mahomes-15',
    response: {
      success: true,
      data: {
        id: "nfl-mahomes-15",
        first_name: "Patrick",
        last_name: "Mahomes",
        jersey: "15",
        position: "QB",
        team: {
          id: "35f7957c-2b22-44df-9d51-9efb27e8a94b",
          name: "Kansas City Chiefs",
          abbreviation: "KC",
          primary_color: "#E31837",
          secondary_color: "#FFB81C"
        },
        enrichment: {
          phonetic_name: "PAT-rik muh-HOHMZ",
          ipa_name: "/ˈpæt.rɪk məˈhoʊmz/",
          chinese_name: "马霍姆斯",
          hardware_safe_name: "Patrick Mahomes"
        },
        intelligence: {
          career_summary: "Three-time Super Bowl champion and MVP. Widely recognized for elite arm angles, no-look throws, and postseason clutch performances.",
          color_commentary: "Mahomes scrambling right, avoids the rush, throws off-balance downfield... Touchdown Chiefs! An absolute marvel of mechanical control.",
          stats_insight: "Holds the highest career postseason passer rating (105.8) in NFL history and has exceeded 5,000 yards passing in multiple regular seasons."
        }
      },
      meta: {
        request_id: "req_nfl_mahomes",
        timestamp: "2026-05-26T10:48:00Z",
        freshness: "active_sync"
      }
    }
  },
  NHL: {
    endpoint: 'GET /v1/athletes/nhl-mcdavid-97',
    response: {
      success: true,
      data: {
        id: "nhl-mcdavid-97",
        first_name: "Connor",
        last_name: "McDavid",
        jersey: "97",
        position: "C",
        team: {
          id: "8c7924ef-7a91-4c12-9bd1-ecf2711ab4ba",
          name: "Edmonton Oilers",
          abbreviation: "EDM",
          primary_color: "#FF4C00",
          secondary_color: "#002F6C"
        },
        enrichment: {
          phonetic_name: "CON-or mik-DAY-vid",
          ipa_name: "/ˈkɒnər məkˈdeɪvɪd/",
          chinese_name: "麦克戴维",
          hardware_safe_name: "Connor McDavid"
        },
        intelligence: {
          career_summary: "Widely regarded as the fastest skater and best puck-handler of the modern era. Multi-time Art Ross and Hart Trophy winner.",
          color_commentary: "McDavid gathers speed in the neutral zone, burns past the defenseman, goes forehand-backhand... Scores! Simply untouchable speed.",
          stats_insight: "Crossed the 150-point threshold in 2022-23 (64 goals, 89 assists) becoming the first player to do so since 1995-96."
        }
      },
      meta: {
        request_id: "req_nhl_mcdavid",
        timestamp: "2026-05-26T10:48:00Z",
        freshness: "active_sync"
      }
    }
  },
  MLB: {
    endpoint: 'GET /v1/athletes/mlb-ohtani-17',
    response: {
      success: true,
      data: {
        id: "mlb-ohtani-17",
        first_name: "Shohei",
        last_name: "Ohtani",
        jersey: "17",
        position: "DH",
        team: {
          id: "f4a02be1-081e-450a-8bfb-c8c38fab9a21",
          name: "Los Angeles Dodgers",
          abbreviation: "LAD",
          primary_color: "#005A9C",
          secondary_color: "#A5ACAF"
        },
        enrichment: {
          phonetic_name: "shoh-HAY oh-TAHN-ee",
          ipa_name: "/ˈʃoʊ.heɪ oʊˈtɑː.ni/",
          chinese_name: "大谷翔平",
          hardware_safe_name: "Shohei Ohtani"
        },
        intelligence: {
          career_summary: "Unprecedented two-way phenom. Multiple unanimous MVP selections. Transferred to the Dodgers in 2024 for a historic sports contract.",
          color_commentary: "Ohtani swings... high drive to deep right field! That ball is gone! 115 MPH exit velocity off the bat.",
          stats_insight: "Created the MLB '50-50' club in 2024, finishing the season with 54 Home Runs and 59 Stolen Bases."
        }
      },
      meta: {
        request_id: "req_mlb_ohtani",
        timestamp: "2026-05-26T10:48:00Z",
        freshness: "active_sync"
      }
    }
  },
  NBA: {
    endpoint: 'GET /v1/athletes/nba-james-23',
    response: {
      success: true,
      data: {
        id: "nba-james-23",
        first_name: "LeBron",
        last_name: "James",
        jersey: "23",
        position: "SF",
        team: {
          id: "0d9c12df-e1a5-4eb8-a006-ecfd711200ba",
          name: "Los Angeles Lakers",
          abbreviation: "LAL",
          primary_color: "#552583",
          secondary_color: "#FDB927"
        },
        enrichment: {
          phonetic_name: "luh-BRON JAYMZ",
          ipa_name: "/ləˈbrɒn ˈdʒeɪmz/",
          chinese_name: "詹姆斯",
          hardware_safe_name: "LeBron James"
        },
        intelligence: {
          career_summary: "The NBA's all-time leading scorer. Celebrated for elite court vision, durability across 22+ seasons, and 4 championship rings.",
          color_commentary: "James takes it left, drives down the lane, elevates and slams it down with authority! Still dominating the sky.",
          stats_insight: "Surpassed Kareem Abdul-Jacob in 2023 for most regular season points, now sitting alone as the only player in the 40,000-point club."
        }
      },
      meta: {
        request_id: "req_nba_james",
        timestamp: "2026-05-26T10:48:00Z",
        freshness: "active_sync"
      }
    }
  },
  MLS: {
    endpoint: 'GET /v1/athletes/mls-messi-10',
    response: {
      success: true,
      data: {
        id: "mls-messi-10",
        first_name: "Lionel",
        last_name: "Messi",
        jersey: "10",
        position: "F",
        team: {
          id: "3df72cba-8a1e-450a-9d91-ecfb7eab4201",
          name: "Inter Miami CF",
          abbreviation: "MIA",
          primary_color: "#F7B5CD",
          secondary_color: "#000000"
        },
        enrichment: {
          phonetic_name: "lee-oh-NEL MESS-ee",
          ipa_name: "/ljoˈnel ˈmesi/",
          chinese_name: "梅西",
          hardware_safe_name: "Lionel Messi"
        },
        intelligence: {
          career_summary: "Widely regarded as the greatest footballer in history. 8-time Ballon d'Or winner. Led Argentina to World Cup victory in 2022.",
          color_commentary: "Messi stands over the free-kick... bends it beautifully into the top-left corner! Absolute masterclass.",
          stats_insight: "Has recorded over 800 senior career goals and holds the record for most trophies won in football history (44)."
        }
      },
      meta: {
        request_id: "req_mls_messi",
        timestamp: "2026-05-26T10:48:00Z",
        freshness: "active_sync"
      }
    }
  }
};

const FAQ_ITEMS = [
  {
    q: 'Which sports leagues does RosterSync cover?',
    a: 'RosterSync covers 17 professional leagues including NFL, NHL, MLB, NBA, MLS, WNBA, NWSL, MiLB, USL, Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Liga MX, Eredivisie, and IPL. NCAA is intentionally excluded from our current dataset.'
  },
  {
    q: 'How fresh is the roster data?',
    a: 'Active-sync rosters are updated within minutes of official league transactions. Historical data (trades, cuts, retirements) is preserved permanently using status-driven tracking — no player is ever deleted, only deactivated.'
  },
  {
    q: 'What exactly is AI Phonetics and who needs it?',
    a: 'Our LinguistAgent generates broadcast-safe phonetic spellings (e.g. "muh-HOHMZ"), IPA notation, and Mandarin/Spanish translations for every athlete name. It is designed for play-by-play announcers, localization teams, and on-screen graphic operators who need accuracy under live production pressure.'
  },
  {
    q: 'What DAM platforms do you integrate with natively?',
    a: 'RosterSync ships native connectors for Iconik and CatDV. Any other platform can be reached via our generic Webhook delivery system. Credentials are AES-256 encrypted and scoped per-request — your keys never touch our logs.'
  },
  {
    q: 'Can I use RosterSync with an AI assistant like Claude or ChatGPT?',
    a: 'Yes. Sync and Studio tiers support automated Google Sheets sync and CSV downloads, which you can easily feed into any LLM. MCP Server access is planned for our upcoming Network and Enterprise tiers.'
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes — we offer a 14-day free trial of our Sync and Studio tiers. No credit card required. Cancel anytime.'
  },
  {
    q: 'How do rate limits work?',
    a: 'With RosterSync\'s DAM-only and broadcast push architecture, there are no API keys or rate limits to manage. Your broadcast polling URLs are fully optimized for continuous retrieval without threshold restrictions.'
  },
  {
    q: 'What support options are available?',
    a: 'Sync: email support with 24-hour response. Studio: priority email with 8-hour response. Enterprise plans include dedicated support with a named account engineer and 24/7 hotline support.'
  },
  {
    q: 'Does RosterSync track live play-by-play game statistics or coordinates?',
    a: 'No. We do not track live in-game telemetry, passing maps, or live betting stats. RosterSync is built exclusively to manage athlete identity, name pronunciation guides, translations, and roster legacy archives. By keeping the pipeline focused, we guarantee lightweight payloads and sub-300ms deliveries to broadcast systems.'
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

function colorizeJson(json: string) {
  const tokenPattern = /("(?:\\.|[^"\\])*"|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:]|\s+)/g;
  const tokens = json.match(tokenPattern) || [];

  return tokens.map((token, i) => {
    if (/^[{}\[\],:]$/.test(token.trim())) {
      return <span key={i}>{token}</span>;
    }
    if (/^"/.test(token)) {
      const next = tokens[i + 1];
      if (next && next.trim() === ':') {
        return <span key={i} className="text-cyan-400">{token}</span>;
      }
      return <span key={i} className="text-pink-400">{token}</span>;
    }
    if (/^(true|false|null)$/.test(token)) {
      return <span key={i} className="text-blue-400 font-bold">{token}</span>;
    }
    if (/^-?\d/.test(token)) {
      return <span key={i} className="text-amber-300">{token}</span>;
    }
    return <span key={i}>{token}</span>;
  });
}

export default function VercelStylePage() {
  const [activeTab, setActiveTab] = useState<string>('NFL');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Contact Modal States
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  
  // Spotter Board Live States
  const [simLeague, setSimLeague] = useState<string>('MLB');

  // Playground States
  const [explorerEndpoint, setExplorerEndpoint] = useState<string>('mlb-ohtani-17');
  const [explorerResult, setExplorerResult] = useState<any>(MOCK_PLAYERS.MLB.response);
  const [explorerLoading, setExplorerLoading] = useState<boolean>(false);
  const [explorerStatus, setExplorerStatus] = useState<number>(200);
  const [explorerTime, setExplorerTime] = useState<number>(14);

  const handleSendRequest = (endpointStr?: string) => {
    setExplorerLoading(true);
    const target = (endpointStr !== undefined ? endpointStr : explorerEndpoint).trim().toLowerCase();
    
    setTimeout(() => {
      let matchedKey = '';
      if (target.includes('mahomes')) matchedKey = 'NFL';
      else if (target.includes('mcdavid')) matchedKey = 'NHL';
      else if (target.includes('ohtani')) matchedKey = 'MLB';
      else if (target.includes('james')) matchedKey = 'NBA';
      else if (target.includes('messi')) matchedKey = 'MLS';
      
      if (matchedKey) {
        setExplorerResult(MOCK_PLAYERS[matchedKey].response);
        setExplorerStatus(200);
        setExplorerTime(Math.floor(Math.random() * 20) + 12);
      } else {
        setExplorerResult({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Athlete ID "${target}" not found. Try 'mlb-ohtani-17', 'nfl-mahomes-15', 'nhl-mcdavid-97', 'nba-james-23', or 'mls-messi-10'.`
          }
        });
        setExplorerStatus(404);
        setExplorerTime(Math.floor(Math.random() * 10) + 5);
      }
      setExplorerLoading(false);
    }, 450);
  };



  return (
    <div 
      className="min-h-screen text-neutral-100 selection:bg-white selection:text-black antialiased font-sans relative overflow-x-hidden"
      style={{
        backgroundColor: '#030303',
        backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.18) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.16) 0%, transparent 50%), radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.28) 0%, rgba(3, 3, 3, 1) 75%)'
      }}
    >
      
      {/* ─── BACKGROUND EFFECTS ─── */}
      {/* High-Intensity Vivid Ambient Side Glows */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[900px] h-[900px] rounded-full blur-[150px] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.24) 0%, rgba(20, 184, 166, 0.08) 50%, transparent 70%)' }}
      />
      <div 
        className="absolute top-[10%] right-[-10%] w-[900px] h-[900px] rounded-full blur-[150px] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.2) 0%, rgba(34, 197, 94, 0.06) 50%, transparent 70%)' }}
      />
      <div 
        className="absolute bottom-[-10%] left-[15%] w-[800px] h-[800px] rounded-full blur-[140px] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)' }}
      />

      <header className="border-b border-neutral-850 bg-black/60 fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/vercel-style" className="font-semibold tracking-tight text-white flex items-center gap-2 group">
              <svg className="w-5 h-5 text-white transition-transform group-hover:scale-105" viewBox="0 0 75 65" fill="currentColor">
                <path d="M37.59.25L75.02 65H.16L37.59.25z" />
              </svg>
              <span className="bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent font-bold text-base">rostersync</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium uppercase tracking-wider text-neutral-400">
              <span onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors cursor-pointer">Overview</span>
              <span onClick={() => document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors cursor-pointer">API Explorer</span>
              <span onClick={() => document.getElementById('spotter')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors cursor-pointer">Spotter Board</span>
              <span onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors cursor-pointer">Pricing</span>
              <span onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors cursor-pointer">FAQ</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-neutral-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer">Log in</Link>
            <Link href="/signup" className="bg-white text-black hover:bg-neutral-200 text-xs px-3.5 py-1.5 font-bold uppercase tracking-wider rounded-md transition-all shadow-[0_1px_10px_rgba(255,255,255,0.15)] hover:shadow-white/20 cursor-pointer">
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-neutral-900/80 border border-neutral-800 text-neutral-300 mb-6 shadow-inner hover:border-neutral-700 hover:bg-neutral-900 transition-all duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
            Real-time metadata pipeline
          </span>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-6">
            <span className="bg-gradient-to-b from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
              The Complete Roster Blueprint
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent italic">
              for Global Broadcasting.
            </span>
          </h1>
          
          <p className="mt-8 text-neutral-100 text-lg md:text-xl font-medium leading-relaxed max-w-3xl mx-auto">
            RosterSync syncs live rosters directly to your broadcast graphics engines and DAM — with phonetics, team colors, and translations baked in.
          </p>
          
          <p className="mt-4 text-neutral-400 text-xs md:text-sm leading-relaxed max-w-2xl mx-auto">
            Push real-time athlete metadata to Vizrt, Ross, Chyron, Iconik, and CatDV without writing custom glue code. No more copy-pasting lineups before every game.
          </p>
          
          <div className="mt-10 flex gap-3.5 justify-center">
            <button 
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-black hover:bg-neutral-200 text-sm px-6 py-2.5 font-bold uppercase tracking-wider rounded-md transition-all shadow-[0_2px_15px_rgba(255,255,255,0.1)] cursor-pointer"
            >
              Get API Access
            </button>
            <button 
              onClick={() => document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth' })}
              className="border border-neutral-800 bg-neutral-950/40 hover:border-neutral-700 hover:bg-neutral-900/60 text-sm px-6 py-2.5 font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer text-white"
            >
              Explore Explorer
            </button>
          </div>
        </div>



        {/* Integrations Ticker (Scrolls Left) */}
        <section className="mb-6 w-full overflow-hidden py-7 bg-transparent relative">
          <div className="animate-ticker flex items-center gap-16 select-none">
            {INTEGRATIONS.map((int) => (
              <div key={int.id} className="flex items-center gap-4 shrink-0">
                {int.logoUrl && (
                  <img 
                    src={int.logoUrl} 
                    alt={`${int.name} logo`} 
                    className="h-10 w-auto object-contain opacity-80 hover:opacity-100 transition-all duration-300"
                  />
                )}
              </div>
            ))}
            {/* Second Loop for Infinite scroll */}
            {INTEGRATIONS.map((int) => (
              <div key={`${int.id}-dup`} className="flex items-center gap-4 shrink-0">
                {int.logoUrl && (
                  <img 
                    src={int.logoUrl} 
                    alt={`${int.name} logo`} 
                    className="h-10 w-auto object-contain opacity-80 hover:opacity-100 transition-all duration-300"
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Platform Features Bento Grid */}
        <section id="features" className="mb-28">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-neutral-500 font-mono text-xs uppercase tracking-widest font-bold">// PLATFORM FEATURES</span>
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white mt-4">
              Engineered For High-Speed Production
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Bento Card 1 */}
            <div className="md:col-span-3 border border-neutral-800 rounded-xl p-8 bg-neutral-950/30 backdrop-blur-sm flex flex-col justify-between min-h-[260px] group hover:border-neutral-700 transition-all">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">01 &bull; Core Engine</span>
                  <span className="text-[9px] font-mono text-neutral-500 uppercase">latency &lt;300ms</span>
                </div>
                <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">Vocal Phonetics & IPA Keys</h3>
                <p className="text-neutral-400 text-sm mt-3 leading-relaxed max-w-xl">
                  Generates simplified phonetic guides (e.g. "shoh-HAY") for instant announcer readouts, paired with full International Phonetic Alphabet (IPA) keys for standardized pronunciation accuracy across global teams.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Simplified Phonetics', 'IPA Standard', 'Vocal Guides'].map(t => (
                  <span key={t} className="text-[9px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded uppercase">{t}</span>
                ))}
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="md:col-span-2 border border-neutral-800 rounded-xl p-8 bg-neutral-950/30 backdrop-blur-sm flex flex-col justify-between min-h-[260px] group hover:border-neutral-700 transition-all">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-6 block">02 &bull; Sync Pipeline</span>
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">DAM Connectors & Team Colors</h3>
                <p className="text-neutral-400 text-sm mt-3 leading-relaxed">
                  Push live athlete metadata—including primary and secondary hexadecimal team colors—directly into CatDV, Iconik, or webhooks for automated graphic template theme matching.
                </p>
              </div>
              <div className="mt-6 font-mono text-[9px] text-neutral-500 border-t border-neutral-900 pt-4">
                Vault Security: AES-256 Storage
              </div>
            </div>

            {/* Bento Card 3 */}
            <div className="md:col-span-2 border border-neutral-800 rounded-xl p-6 bg-neutral-950/30 backdrop-blur-sm flex flex-col justify-between min-h-[220px] group hover:border-neutral-700 transition-all">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-4">03 &bull; History</span>
                <h3 className="text-base font-bold text-white">3–5 Year Roster History</h3>
                <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                  Complete retrospective rosters spanning multiple seasons. No athlete data is ever deleted — trades, cuts, and retirements are tracked by status, not removal.
                </p>
              </div>
            </div>

            {/* Bento Card 4 */}
            <div className="md:col-span-2 border border-neutral-800 rounded-xl p-6 bg-neutral-950/30 backdrop-blur-sm flex flex-col justify-between min-h-[220px] group hover:border-neutral-700 transition-all">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-4">04 &bull; Performance</span>
                <h3 className="text-base font-bold text-white">Parallel Ingest Engine</h3>
                <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                  Processes league-wide sync jobs across multiple concurrent worker streams. Syncs rosters, headshots, and historical entries in seconds.
                </p>
              </div>
            </div>

            {/* Bento Card 5 */}
            <div className="md:col-span-1 border border-neutral-800 rounded-xl p-6 bg-neutral-950/30 backdrop-blur-sm flex flex-col justify-between min-h-[220px] group hover:border-neutral-700 transition-all">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-4">05 &bull; Security</span>
                <h3 className="text-base font-bold text-white">AES-256 Vault</h3>
                <p className="text-neutral-400 text-xs mt-2 leading-relaxed">
                  Encrypts all B2B DAM credentials and database endpoints. Scoped per-request to keep assets secure and audit logs green.
                </p>
              </div>
            </div>

          </div>

          {/* Scope Footer Badge */}
          <div className="mt-12 flex justify-center select-none">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-neutral-950 border border-neutral-900 text-neutral-500 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 animate-pulse"></span>
              Note: RosterSync delivers metadata & archives — we do not ingest live in-game statistics or telemetry.
            </span>
          </div>
        </section>

        {/* API Explorer Interactive Console */}
        <section className="mb-28">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-white">Interactive API Explorer</h2>
            <p className="text-xs text-neutral-400 mt-2">Test actual request endpoints and see real-time cache responses.</p>
          </div>
          
          <div id="explorer" className="w-full max-w-4xl mx-auto border border-neutral-800 rounded-xl bg-neutral-950/60 backdrop-blur-sm overflow-hidden shadow-2xl">
            
            {/* Terminal Title Bar */}
            <div className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
              </div>
              <div className="font-mono text-xs text-neutral-500 select-none">
                REST Client Playground
              </div>
              <div className="w-12"></div>
            </div>

            {/* Live REST Query Input Bar */}
            <div className="border-b border-neutral-800 p-4 bg-neutral-950/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0 bg-neutral-900 border border-neutral-800 rounded-md px-3 py-1.5 justify-center">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">GET</span>
              </div>
              <div className="flex-1 flex items-center bg-black border border-neutral-800 rounded-md px-3 py-1.5 font-mono text-xs text-neutral-300">
                <span className="text-neutral-600 select-none shrink-0">https://api.rostersync.com/v1/athletes/</span>
                <input
                  type="text"
                  value={explorerEndpoint}
                  onChange={(e) => setExplorerEndpoint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendRequest();
                  }}
                  className="flex-1 bg-transparent border-0 outline-none text-white ml-0.5 focus:ring-0 min-w-[120px]"
                  placeholder="athlete-id"
                />
              </div>
              <button
                onClick={() => handleSendRequest()}
                disabled={explorerLoading}
                className="bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-500 text-xs px-5 py-2 font-bold uppercase tracking-wider rounded-md transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5"
              >
                {explorerLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Sending</span>
                  </>
                ) : (
                  <span>Send</span>
                )}
              </button>
            </div>
            
            {/* Terminal Preset Tabs */}
            <div className="border-b border-neutral-800 bg-black/20 flex font-mono text-xs overflow-x-auto">
              <span className="px-4 py-3 text-neutral-500 font-bold border-r border-neutral-850 select-none shrink-0">PRESETS:</span>
              {[
                { label: 'MLB', value: 'mlb-ohtani-17', display: 'Ohtani' },
                { label: 'NFL', value: 'nfl-mahomes-15', display: 'Mahomes' },
                { label: 'NHL', value: 'nhl-mcdavid-97', display: 'McDavid' },
                { label: 'NBA', value: 'nba-james-23', display: 'LeBron' },
                { label: 'MLS', value: 'mls-messi-10', display: 'Messi' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setExplorerEndpoint(preset.value);
                    handleSendRequest(preset.value);
                  }}
                  className={`px-5 py-3 border-r border-neutral-850 hover:bg-neutral-900 hover:text-white transition-all shrink-0 ${
                    explorerEndpoint === preset.value
                      ? 'bg-neutral-900/50 text-white font-bold border-b-2 border-b-emerald-500'
                      : 'text-neutral-400'
                  }`}
                >
                  {preset.label} &bull; {preset.display}
                </button>
              ))}
            </div>

            {/* Response Headers Panel */}
            <div className="border-b border-neutral-900 bg-neutral-950 px-6 py-2.5 flex items-center justify-between font-mono text-[10px] text-neutral-500">
              <div className="flex items-center gap-4">
                <span>
                  STATUS: <span className={explorerStatus === 200 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{explorerStatus} {explorerStatus === 200 ? 'OK' : 'Not Found'}</span>
                </span>
                <span>
                  TIME: <span className="text-neutral-300 font-bold">{explorerTime}ms</span>
                </span>
              </div>
              <div>
                <span>SIZE: <span className="text-neutral-300 font-bold">{explorerStatus === 200 ? '1.17 KB' : '0.18 KB'}</span></span>
              </div>
            </div>

            {/* Terminal Code Content */}
            <div className="p-6 text-left font-mono text-xs bg-black text-yellow-300/90 leading-relaxed min-h-[220px] relative">
              {explorerLoading ? (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2">
                  <svg className="animate-spin h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono">Executing Agent query...</span>
                </div>
              ) : null}
              <pre className="whitespace-pre-wrap select-text">
                {colorizeJson(JSON.stringify(explorerResult, null, 2))}
              </pre>
            </div>
          </div>
        </section>

        {/* Real-time AI & Sync Pipeline Simulation */}
        <section className="mb-28">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-neutral-500 font-mono text-xs uppercase tracking-widest font-bold">// DATA IN MOTION</span>
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white mt-4">
              AI-to-Booth Pipeline
            </h2>
            <p className="text-neutral-400 text-sm mt-4 leading-relaxed">
              Witness how RosterSync agents automatically fetch raw game telemetry, enrich it with broadcast intelligence, and sync it across systems in under 300 milliseconds.
            </p>
          </div>

          <div className="w-full max-w-4xl mx-auto border border-neutral-800 rounded-xl bg-neutral-950/40 backdrop-blur-sm overflow-hidden p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Column: Interactive Simulation Control */}
              <div className="lg:col-span-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-2">Simulate Roster Milestones</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-6">
                    Select an athlete milestone or trivia update to trace the real-time ingest, AI enrichment, and final visual delivery path.
                  </p>
                  
                  <div className="space-y-2">
                    {[
                      { league: 'MLB', event: 'Ohtani Joins 50-50 Club', desc: 'Historic home run & steal season' },
                      { league: 'NFL', event: 'Mahomes Wins 3rd MVP', desc: 'Active postseason franchise leader' },
                      { league: 'NHL', event: 'McDavid Hits 150 Points', desc: 'Art Ross & Hart Trophy champion' },
                    ].map((sim) => (
                      <button
                        key={sim.league}
                        onClick={() => setSimLeague(sim.league)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          simLeague === sim.league
                            ? 'border-emerald-500 bg-emerald-950/15 text-white'
                            : 'border-neutral-800 hover:border-neutral-750 bg-neutral-950/30 text-neutral-400'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-neutral-500">{sim.league}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${simLeague === sim.league ? 'bg-emerald-400' : 'bg-transparent'}`} />
                        </div>
                        <div className="text-xs font-bold mt-1 text-neutral-200">{sim.event}</div>
                        <div className="text-[10px] mt-0.5 text-neutral-500 font-mono">{sim.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <span>LATENCY BUDGET: 300ms</span>
                  <span className="text-emerald-400 font-bold">ACTUAL: 224ms</span>
                </div>
              </div>

              {/* Right Column: Animated Steps & Logs */}
              <div className="lg:col-span-8 border border-neutral-900 rounded-lg bg-black/60 p-6 flex flex-col justify-between">
                
                {/* Pipeline Flow Visualizer */}
                <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-850">
                  
                  {/* Step 1 */}
                  <div className="flex gap-4 relative">
                    <div className="w-6 h-6 rounded-full bg-blue-950 border border-blue-500/30 flex items-center justify-center font-mono text-[10px] text-blue-400 shrink-0 z-10 bg-black">
                      1
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Step 1: Real-Time Sync Ingest</h4>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-blue-500/10 text-blue-400 uppercase tracking-widest border border-blue-500/20">active</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                        Raw roster coordinates and athlete metrics ingested via MLB/NFL statistics webhooks.
                      </p>
                      <div className="mt-2 font-mono text-[9px] text-neutral-500 bg-neutral-950/80 p-2 rounded border border-neutral-900">
                        {simLeague === 'MLB' && 'ScoutAgent detected roster sync: mlb 2026/LAD -> Ohtani jersey #17'}
                        {simLeague === 'NFL' && 'ScoutAgent detected roster sync: nfl 2026/KC -> Mahomes jersey #15'}
                        {simLeague === 'NHL' && 'ScoutAgent detected roster sync: nhl 2026/EDM -> McDavid jersey #97'}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 relative">
                    <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center font-mono text-[10px] text-emerald-400 shrink-0 z-10 bg-black">
                      2
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Step 2: AI Enrichment</h4>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-500/10 text-emerald-400 uppercase tracking-widest border border-emerald-500/20">completed</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                        LinguistAgent generates phonetic guides and name translations for every athlete.
                      </p>
                      <div className="mt-2 font-mono text-[9px] text-neutral-400 bg-neutral-950/80 p-2 rounded border border-neutral-900">
                        {simLeague === 'MLB' && (
                          <>
                            <span className="text-emerald-400">LinguistAgent:</span> Generated pronunciation "shoh-HAY oh-TAHN-ee" | <span className="text-emerald-400">Translations:</span> Mandarin "大谷翔平"
                          </>
                        )}
                        {simLeague === 'NFL' && (
                          <>
                            <span className="text-emerald-400">LinguistAgent:</span> Generated pronunciation "PAT-rik muh-HOHMZ" | <span className="text-emerald-400">Translations:</span> Spanish "Patrick Mahomes"
                          </>
                        )}
                        {simLeague === 'NHL' && (
                          <>
                            <span className="text-emerald-400">LinguistAgent:</span> Generated pronunciation "CON-or mik-DAY-vid" | <span className="text-emerald-400">Translations:</span> Mandarin "康纳·麦克戴维"
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 relative">
                    <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center font-mono text-[10px] text-cyan-400 shrink-0 z-10 bg-black">
                      3
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Step 3: Delivery</h4>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-cyan-500/10 text-cyan-400 uppercase tracking-widest border border-cyan-500/20">delivered</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                        Metadata synced to your graphics engine and DAM — ready for broadcast.
                      </p>
                      <div className="mt-2 font-mono text-[9px] text-neutral-500 bg-neutral-950/80 p-2 rounded border border-neutral-900">
                        {simLeague === 'MLB' && 'ConnectorAgent -> Synced Dodgers roster to Ross/Vizrt overlays & Iconik DAM (OK - 224ms)'}
                        {simLeague === 'NFL' && 'ConnectorAgent -> Synced Chiefs roster to Ross/Vizrt overlays & CatDV DAM (OK - 215ms)'}
                        {simLeague === 'NHL' && 'ConnectorAgent -> Synced Oilers roster to Ross/Vizrt overlays & Webhook (OK - 218ms)'}
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        </section>



        {/* Pricing Tiers Grid */}
        <section id="pricing" className="mb-28">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-neutral-500 font-mono text-xs uppercase tracking-widest font-bold">// PRICING</span>
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white mt-4">Predictable, Flat Monthly Tiers</h2>
            <p className="text-neutral-400 text-xs font-mono mt-4">No hidden setup fees. Upgrade, downgrade, or cancel at any time.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-3xl mx-auto">
            {PRICING_TIERS.map(tier => (
              <div 
                key={tier.name} 
                className={`border rounded-xl p-6 flex flex-col justify-between relative transition-all bg-neutral-950/40 backdrop-blur-sm ${
                  tier.highlighted 
                    ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-neutral-950/80' 
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute top-0 right-6 translate-y-[-50%] bg-emerald-500 text-black text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded">
                    Recommended
                  </span>
                )}
                <div>
                  <div className="font-mono text-xs text-neutral-400 uppercase tracking-widest mb-2">{tier.name}</div>
                  <div className="flex items-baseline gap-1 my-4">
                    <span className="text-4xl font-bold text-white tracking-tight font-mono">{tier.price}</span>
                    <span className="text-xs text-neutral-500 font-mono">/mo</span>
                  </div>
                  <p className="text-neutral-400 text-xs font-mono min-h-[48px] border-b border-neutral-900 pb-4 mb-4">{tier.desc}</p>
                  
                  <ul className="space-y-3">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] font-mono text-neutral-400">
                        <span className="text-emerald-500 font-bold shrink-0">&bull;</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  className={`mt-6 w-full py-2 text-xs uppercase tracking-wider font-mono font-bold transition-all rounded-md border ${
                    tier.highlighted 
                      ? 'bg-white text-black border-white hover:bg-neutral-200' 
                      : 'bg-transparent text-white border-neutral-800 hover:border-white'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Enterprise Upsell */}
          <div className="max-w-3xl mx-auto mt-8">
            <div className="border border-neutral-800 rounded-xl p-6 bg-neutral-950/30 backdrop-blur-sm text-center hover:border-neutral-700 transition-all">
              <div className="font-mono text-[11px] text-neutral-500 uppercase tracking-widest mb-1">Need more?</div>
              <h3 className="text-lg font-bold text-white tracking-tight">Network &amp; Enterprise Plans</h3>
              <p className="text-neutral-400 text-xs font-mono mt-2 max-w-lg mx-auto">
                Multi-studio deployments, MCP Server access, unlimited DAM connections, 
                Spotter Board, Booth Mode, 25-year archive, and 24/7 support.
              </p>
              <a 
                href="mailto:sales@rostersync.com" 
                className="inline-block mt-4 py-2 px-6 text-xs uppercase tracking-wider font-mono font-bold transition-all rounded-md border border-neutral-800 text-white hover:border-white bg-transparent"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="mb-0">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-neutral-500 font-mono text-xs uppercase tracking-widest font-bold">// FAQ</span>
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white mt-4">Frequent Questions</h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-950/30 backdrop-blur-sm transition-all hover:border-neutral-750">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 font-mono text-sm text-left text-neutral-200 hover:bg-neutral-900/40 transition-colors"
                >
                  <span>{item.q}</span>
                  <span className={`text-emerald-400 transform transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 font-mono text-xs text-neutral-400 leading-relaxed border-t border-neutral-900 pt-4 animate-fade-in">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-850 bg-black/80 py-5 fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold tracking-tight">[R] rostersync</span>
            <span className="text-neutral-500 font-mono text-xs">v2.0</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsContactOpen(true)}
              className="text-neutral-400 hover:text-white font-mono text-[11px] transition-colors cursor-pointer"
            >
              Contact
            </button>
            <div className="w-[1px] h-3 bg-neutral-800" />
            <a href="https://x.com/rostersync" target="_blank" rel="noopener noreferrer" aria-label="X (formerly Twitter)" className="text-neutral-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/ryanroettele/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-neutral-400 hover:text-white transition-colors">
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
          <div className="bg-neutral-950 border border-neutral-800 p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => {
                setIsContactOpen(false);
                setSendSuccess(false);
                setContactEmail('');
                setContactMessage('');
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors text-sm"
              aria-label="Close modal"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-wider font-mono">Contact Support</h3>
            <p className="text-[11px] text-neutral-500 mb-6 font-mono">// Send a message to our RosterSync engineers.</p>
            
            {sendSuccess ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-emerald-950 border border-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <span className="text-emerald-400 font-bold text-lg font-mono">✓</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wider font-mono">Message Sent!</h4>
                <p className="text-[11px] text-neutral-400 font-mono">We will get back to you shortly.</p>
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
                  <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5">// Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-black border border-neutral-850 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 transition-colors font-mono"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5">// Message</label>
                  <textarea 
                    required 
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full bg-black border border-neutral-850 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-500 transition-colors font-mono resize-none"
                    placeholder="How can we help your team?"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSending}
                  className="w-full bg-white hover:bg-neutral-200 disabled:bg-neutral-850 disabled:text-neutral-500 text-black text-xs font-mono font-bold uppercase tracking-wider py-2.5 transition-all shadow-md mt-2"
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
