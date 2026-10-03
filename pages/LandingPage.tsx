import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import GenderChart from '../components/charts/GenderChart';
import OccupationChart from '../components/charts/OccupationChart';
import SupportChart from '../components/charts/SupportChart';
import Leaderboard from '../components/Leaderboard';
import Rewards from '../components/Rewards';
import OrgMarquee from '../components/ui/OrgMarquee';
import VolunteerMarquee from '../components/ui/VolunteerMarquee';
import CountUp from '../components/ui/CountUp';
import { supabase } from '../supabase/client';
import { Member, Organisation, Role } from '../types';
import { 
  Users, 
  Activity, 
  Building2, 
  Compass, 
  Layers, 
  Target, 
  UserPlus, 
  Share2, 
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  HeartHandshake,
  Sparkles,
  Phone,
  Radio,
  User,
  Heart,
  Briefcase,
  Award,
  LogIn
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [orgsDataRaw, setOrgsDataRaw] = useState<Organisation[]>([]);
  const [volsDataRaw, setVolsDataRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, oRes, pRes] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('organisations').select('*'),
        supabase.from('profiles').select('*, organisations(name)')
      ]);

      if (mRes.error) console.error("LandingPage members query failed:", mRes.error);
      if (oRes.error) console.error("LandingPage organisations query failed:", oRes.error);
      if (pRes.error) console.error("LandingPage profiles query failed:", pRes.error);

      if (mRes.data) setMembers(mRes.data as Member[]);
      if (oRes.data) setOrgsDataRaw(oRes.data as Organisation[]);
      if (pRes.data) {
        setVolsDataRaw((pRes.data as any[]).filter(p => String(p.role || '').toLowerCase() === 'volunteer'));
      }
    } catch (err) {
      console.error("LandingPage Sync Failure:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Process and de-duplicate lists
  const { organisations, volunteers } = useMemo(() => {
    const seenOrgIdentities = new Set<string>();

    const uniqueOrgs: Organisation[] = [];
    (orgsDataRaw || []).forEach(o => {
      const nameKey = (o.name || '').toLowerCase().trim();
      const secretaryKey = (o.secretary_name || '').toLowerCase().trim();
      const mobileKey = (o.mobile || '').trim();
      
      const footprint = `${secretaryKey}-${mobileKey}`;
      if (seenOrgIdentities.has(footprint)) return;
      
      uniqueOrgs.push(o);
      seenOrgIdentities.add(footprint);
      seenOrgIdentities.add(`${nameKey}-${mobileKey}`);
    });

    const enrollmentMap = members.reduce((acc, m) => {
      if (m.volunteer_id) acc[m.volunteer_id] = (acc[m.volunteer_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueVols: any[] = [];
    const volDedupeSet = new Set<string>();

    (volsDataRaw || []).forEach(v => {
      const nameKey = (v.name || '').toLowerCase().trim();
      const mobileKey = (v.mobile || '').trim();
      const footprint = `${nameKey}-${mobileKey}`;

      if (volDedupeSet.has(footprint)) return;

      uniqueVols.push({
        id: v.id,
        name: v.name || 'Anonymous',
        email: v.email,
        role: Role.Volunteer,
        organisationId: v.organisation_id,
        organisationName: v.organisations?.name || 'Independent',
        mobile: v.mobile,
        enrollments: enrollmentMap[v.id] || 0,
        profile_photo_url: v.profile_photo_url, 
      });

      volDedupeSet.add(footprint);
    });

    return { 
      organisations: uniqueOrgs.reverse(),
      volunteers: uniqueVols.reverse() 
    };
  }, [orgsDataRaw, volsDataRaw, members]);

  // Derive gender count totals for modern KPI cards without modifying underlying data
  const { maleCount, femaleCount } = useMemo(() => {
    let males = 0;
    let females = 0;
    (members || []).forEach(m => {
      const g = String(m.gender || '').toLowerCase();
      if (g === 'male') males++;
      else if (g === 'female') females++;
    });
    return { maleCount: males, femaleCount: females };
  }, [members]);

  return (
    <div className="bg-[#F5F7FB] text-slate-900 min-h-screen selection:bg-saffron-500/20 overflow-x-hidden font-sans relative">
      {/* Extremely subtle ambient lighting across canvas */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none">
        <div className="absolute top-12 left-1/4 w-96 h-96 bg-saffron-500/[0.03] rounded-full blur-3xl"></div>
        <div className="absolute top-24 right-1/4 w-96 h-96 bg-saffron-400/[0.03] rounded-full blur-3xl"></div>
      </div>

      <Header isLandingPage />

      {/* Hero Section */}
      <section className="pt-8 sm:pt-12 md:pt-16 pb-12 sm:pb-16 px-4 sm:px-6 relative z-10">
        <div className="max-w-[1200px] mx-auto text-center">
          
          {/* Main Community Intelligence Surface */}
          <div className="max-w-4xl mx-auto bg-transparent border-none shadow-none p-6 sm:p-10 md:p-12 mb-12 sm:mb-16 text-left relative overflow-hidden">
            {/* Subtle Saffron Glow in top right */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-saffron-500/[0.05] via-saffron-400/[0.03] to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            {/* Header & Subtitle */}
            <div className="pb-6 sm:pb-8 mb-6 sm:mb-8 relative z-10 flex flex-col items-center text-center mx-auto max-w-3xl">
              
              {/* Premium SSK Samaj Heritage Centerpiece: Decorative Shimmer Line with Waving Saffron Om Flag */}
              <div className="w-full flex items-center justify-center gap-2 sm:gap-3.5 mb-5 select-none relative animate-badge-slide">
                
                {/* Left Decorative Shimmer Line */}
                <div className="flex-1 max-w-[80px] sm:max-w-[140px] md:max-w-[200px] h-[1.5px] rounded-full animate-line-shimmer relative">
                  {/* Subtle golden particle on left line */}
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#F59E0B]" />
                </div>

                {/* Saffron Hindu Flag with Om Symbol */}
                <div className="flex items-center -mr-1 z-20">
                  {/* Slim Golden/Brass Flagpole */}
                  <div className="w-[2.5px] h-8 sm:h-9 bg-gradient-to-b from-amber-200 via-amber-500 to-amber-800 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.5)] shrink-0" />
                  
                  {/* Waving Fabric Cloth Flag */}
                  <div className="animate-flag-breeze origin-left -ml-[0.5px]">
                    <svg 
                      width="38" 
                      height="22" 
                      viewBox="0 0 38 22" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="drop-shadow-[0_2px_7px_rgba(255,138,0,0.65)] filter"
                    >
                      {/* Triangular Saffron Flag Fabric */}
                      <path d="M0 0 L36 10 L0 20 Z" fill="url(#heroFlagSaffronGrad)" />
                      {/* Golden border piping along flag edges */}
                      <path d="M0 0 L36 10 L0 20" stroke="#FEF3C7" strokeWidth="0.8" fill="none" opacity="0.9" />
                      {/* Sacred OM (ॐ) Symbol */}
                      <text 
                        x="6" 
                        y="13" 
                        fill="#FFFBEB" 
                        fontSize="9.5" 
                        fontWeight="bold" 
                        fontFamily="serif" 
                        className="drop-shadow-[0_0_2px_rgba(255,255,255,0.7)] select-none"
                      >
                        ॐ
                      </text>

                      <defs>
                        <linearGradient id="heroFlagSaffronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FF8A00" />
                          <stop offset="55%" stopColor="#EA580C" />
                          <stop offset="100%" stopColor="#C2410C" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                {/* Centered SSK SAMAJ INTELLIGENCE Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 border border-amber-300/80 shadow-[0_2px_12px_-2px_rgba(255,138,0,0.18)] backdrop-blur-xs relative z-10 transition-transform duration-300 hover:scale-[1.02]">
                  <span className="h-2 w-2 rounded-full bg-[#FF8A00] animate-pulse shadow-[0_0_6px_#FF8A00]" />
                  <Activity size={13} className="text-[#FF8A00]" />
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#0B1020]">
                    SSK Samaj Intelligence
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                </div>

                {/* Right Decorative Shimmer Line */}
                <div className="flex-1 max-w-[80px] sm:max-w-[140px] md:max-w-[200px] h-[1.5px] rounded-full animate-line-shimmer relative">
                  {/* Subtle golden particle on right line */}
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#F59E0B]" />
                </div>

              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight text-center">
                A Live Community Registry for a Stronger SSK Samaj
              </h1>

              <div className="flex items-center justify-center mt-4 bg-transparent border-none shadow-none text-center">
                <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium tracking-normal text-center max-w-2xl leading-relaxed">
                  SSK PEOPLE brings verified community information together in one place.<br className="hidden sm:inline" />
                  Understand members, identify needs, and connect people with the right support.<br className="hidden sm:inline" />
                  Building a stronger, connected, and better-supported SSK Samaj.
                </p>
              </div>

              {/* Direct Sign In CTA */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-[#FF8A00] to-[#E87500] hover:from-[#E87500] hover:to-[#C65E00] text-white text-sm font-extrabold rounded-xl shadow-[0_4px_16px_rgba(255,138,0,0.35)] hover:shadow-[0_6px_22px_rgba(255,138,0,0.45)] transition-all active:scale-95 cursor-pointer"
                >
                  <LogIn size={18} />
                  <span>Sign In to Registry</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Action Creed & Closing */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center text-center space-y-4 relative z-10">
              <div className="w-full flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold">
                  <UserPlus size={14} className="text-saffron-600" />
                  <span>Register</span>
                </div>
                <ArrowRight size={12} className="text-slate-400 hidden sm:block" />

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Verify</span>
                </div>
                <ArrowRight size={12} className="text-slate-400 hidden sm:block" />

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold">
                  <Compass size={14} className="text-saffron-600" />
                  <span>Understand</span>
                </div>
                <ArrowRight size={12} className="text-slate-400 hidden sm:block" />

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold">
                  <Share2 size={14} className="text-saffron-600" />
                  <span>Connect</span>
                </div>
                <ArrowRight size={12} className="text-slate-400 hidden sm:block" />

                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#FF8A00] to-[#E87500] text-black text-xs sm:text-sm font-bold shadow-sm">
                  <HeartHandshake size={14} />
                  <span>Support</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 max-w-lg mx-auto pt-1 text-center">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
                  Together, we can build a more connected, transparent and responsive SSK community.
                </p>
              </div>
            </div>
          </div>

          {/* Deity / Heritage Reference - Immersive Mythological Storytelling Environment */}
          <div className="relative flex items-center justify-center mt-6 sm:mt-8 md:mt-10 px-2 sm:px-4 max-w-7xl mx-auto overflow-hidden sm:overflow-visible">
            
            {/* Ambient Aura Background */}
            <div className="absolute inset-0 max-w-5xl mx-auto flex items-center justify-center pointer-events-none overflow-hidden">
              {/* Central radial warm glow matching the artwork's golden aura */}
              <div className="w-[320px] sm:w-[500px] md:w-[680px] h-[320px] sm:h-[500px] md:h-[540px] rounded-full bg-gradient-to-tr from-amber-500/20 via-[#FF8A00]/25 to-yellow-400/20 blur-3xl animate-divine-glow" />
              {/* Subtle sunray shimmer */}
              <div className="absolute w-[260px] sm:w-[420px] h-[260px] sm:h-[420px] rounded-full bg-gradient-to-b from-amber-400/15 via-orange-500/10 to-transparent blur-2xl animate-ray-shimmer" />
            </div>

            {/* Connecting Golden Light Trails & Constellation Lines (Left & Right to Center) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="storyGoldLeft" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
                  <stop offset="60%" stopColor="#FF8A00" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="storyGoldRight" x1="100%" y1="50%" x2="0%" y2="50%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
                  <stop offset="60%" stopColor="#FF8A00" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {/* Left light trail flowing toward main artwork */}
              <path d="M 80 140 Q 220 180, 360 210" fill="none" stroke="url(#storyGoldLeft)" strokeWidth="1.5" className="animate-trail-flow" />
              <path d="M 110 320 Q 240 290, 380 270" fill="none" stroke="url(#storyGoldLeft)" strokeWidth="1" strokeDasharray="6 4" opacity="0.5" />
              
              {/* Right light trail flowing toward main artwork */}
              <path d="M 920 150 Q 780 190, 640 220" fill="none" stroke="url(#storyGoldRight)" strokeWidth="1.5" className="animate-trail-flow" />
              <path d="M 890 330 Q 760 300, 620 280" fill="none" stroke="url(#storyGoldRight)" strokeWidth="1" strokeDasharray="6 4" opacity="0.5" />
            </svg>

            {/* ━━━ LEFT SIDE: Mythological Storytelling Wing ━━━ */}
            {/* Features Ancient Royal Palace, Sacred Narmada River & Sahyadri Mountains, Kshatriya Warrior Silhouette, Bow/Arrow/Sword */}
            <div className="hidden lg:flex flex-col items-end justify-center w-56 xl:w-72 pr-6 xl:pr-10 pointer-events-none select-none z-10 space-y-6">
              
              {/* 1. Ancient Royal Palace & Temple Architecture Motif */}
              <div className="flex flex-col items-end animate-palace-float">
                <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/15 border border-amber-300/40 backdrop-blur-xs shadow-xs text-right max-w-[210px]">
                  <div className="flex items-center justify-end gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00] animate-ping" />
                    <span>Mahishmati Kingdom</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold leading-tight mt-0.5">
                    Ancient Royal Capital &amp; Sacred Sthalam
                  </div>
                </div>

                {/* Palace Silhouette Illustration SVG */}
                <div className="mt-2 pr-1 opacity-85">
                  <svg width="150" height="52" viewBox="0 0 150 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Palace domes & kalash pinnacles */}
                    <path d="M75 4 L76 10 L84 18 L66 18 L74 10 Z" fill="#D97706" opacity="0.9" />
                    <line x1="75" y1="1" x2="75" y2="5" stroke="#F59E0B" strokeWidth="1.5" />
                    <circle cx="75" cy="1" r="1.5" fill="#FBBF24" />
                    {/* Central dome */}
                    <path d="M64 18 Q75 10 86 18 L88 34 L62 34 Z" fill="#0B1020" opacity="0.75" />
                    {/* Left & right shikharas */}
                    <path d="M40 14 Q48 10 56 16 L58 36 L38 36 Z" fill="#0B1020" opacity="0.6" />
                    <line x1="48" y1="7" x2="48" y2="11" stroke="#F59E0B" strokeWidth="1" />
                    <path d="M94 16 Q102 10 110 14 L112 36 L92 36 Z" fill="#0B1020" opacity="0.6" />
                    <line x1="102" y1="7" x2="102" y2="11" stroke="#F59E0B" strokeWidth="1" />
                    {/* Fortress wall & river ghat steps */}
                    <rect x="25" y="34" width="100" height="8" rx="1" fill="#1E293B" opacity="0.7" />
                    <line x1="15" y1="45" x2="135" y2="45" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
                    <path d="M10 50 Q75 46 140 50" stroke="#0284C7" strokeWidth="1.5" opacity="0.5" />
                  </svg>
                </div>
              </div>

              {/* 2. Warrior Silhouettes & Kshatriya Lineage Stance */}
              <div className="flex items-center gap-3 animate-warrior-float">
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70 inline-block">
                    Kshatriya Veer
                  </span>
                  <div className="text-[9px] text-slate-500 font-medium">Invincible Valour</div>
                </div>

                {/* Royal Bow & Sacred Mace Silhouette */}
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/20 border border-amber-400/40 flex items-center justify-center text-amber-700 shadow-xs animate-weapon-gleam">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    {/* Bow & Arrow */}
                    <path d="M4 12 Q12 4 20 12" />
                    <line x1="4" y1="12" x2="20" y2="12" strokeDasharray="1 1" />
                    <line x1="12" y1="4" x2="12" y2="20" stroke="#FF8A00" strokeWidth="2" />
                    <path d="M9 7 L12 4 L15 7" fill="#FF8A00" />
                  </svg>
                </div>
              </div>

              {/* 3. Golden Particles & Sacred Heritage Inscription */}
              <div className="flex items-center gap-2 pr-2 animate-particle-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#F59E0B]" />
                <span className="text-[10px] font-bold text-amber-800/80 tracking-widest uppercase">
                  कार्तवीर्य अर्जुन • सहस्रभुज
                </span>
                <span className="w-8 xl:w-16 h-px bg-gradient-to-l from-amber-400/50 to-transparent" />
              </div>

            </div>

            {/* ━━━ CENTER: Sacred God Sahasrarjuna Central Artwork (Unchanged & Main Focus) ━━━ */}
            <div className="relative z-20 w-full max-w-[340px] xs:max-w-[380px] sm:max-w-sm md:max-w-md animate-float-hero shrink-0 px-2 sm:px-0">
              {/* Soft decorative shadow below artwork */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4/5 h-6 bg-amber-950/20 blur-xl rounded-full pointer-events-none" />
              
              <div className="relative rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_-10px_rgba(255,138,0,0.32),0_4px_20px_-4px_rgba(15,23,42,0.15)] border border-amber-200/60 bg-gradient-to-b from-amber-500/10 via-white/40 to-amber-900/10 backdrop-blur-[2px] transition-transform duration-500 hover:scale-[1.01] p-1 sm:p-1.5">
                <img 
                  src="https://baetdjjzfqupdzsoecph.supabase.co/storage/v1/object/public/Fing/ChatGPT%20Image%20Sep%2027,%202026,%2010_20_55%20PM.png" 
                  alt="Somavamsha Sahasrarjuna Kshatriya" 
                  className="w-full h-auto block rounded-xl sm:rounded-2xl object-contain mx-auto drop-shadow-sm select-none"
                  style={{ maxHeight: 'min(70vh, 520px)' }}
                  loading="eager"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.retried) {
                      target.dataset.retried = '1';
                      target.src = "https://baetdjjzfqupdzsoecph.supabase.co/storage/v1/object/public/Fing/ChatGPT%20Image%20Sep%2027%2C%202026%2C%2010_20_55%20PM.png";
                    }
                  }}
                />
              </div>

              {/* Devotional Caption Pill */}
              <div className="mt-3 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1 rounded-full bg-white/95 backdrop-blur-sm border border-amber-200/90 text-[10px] sm:text-[11px] font-black text-amber-900 shadow-xs tracking-wide text-center">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FF8A00] animate-pulse shrink-0" />
                  <span>भगवान श्री सहस्रार्जुन महाराज • Somavamsha Sahasrarjuna Kshatriya</span>
                </span>
              </div>
            </div>

            {/* ━━━ RIGHT SIDE: Devotional Storytelling Wing ━━━ */}
            {/* Features Fluttering Saffron Hindu Flags with Sacred Om Symbol, Glowing Diya with Animated Flame, Sacred Light Rays */}
            <div className="hidden lg:flex flex-col items-start justify-center w-56 xl:w-72 pl-6 xl:pr-10 pointer-events-none select-none z-10 space-y-6">
              
              {/* 1. Saffron Hindu Flag with Om Symbol Fluttering in Gentle Wind */}
              <div className="flex items-center gap-3">
                {/* Flagpole and Fluttering Saffron Banner */}
                <div className="relative flex items-center">
                  {/* Brass Flagpole */}
                  <div className="w-1 h-14 bg-gradient-to-b from-amber-300 via-amber-600 to-amber-900 rounded-full shadow-xs" />
                  
                  {/* Fluttering Triangular Saffron Dhwaja */}
                  <div className="animate-flag-flutter-1 origin-left">
                    <svg width="78" height="42" viewBox="0 0 78 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_2px_8px_rgba(255,138,0,0.5)]">
                      {/* Triangular flag cloth */}
                      <path d="M0 0 L76 18 L0 36 Z" fill="url(#flagSaffronGrad)" />
                      {/* Gold border piping */}
                      <path d="M0 0 L76 18 L0 36" stroke="#FDE68A" strokeWidth="1.2" fill="none" />
                      {/* Sacred OM Symbol in gold inside flag */}
                      <text x="14" y="23" fill="#FFFBEB" fontSize="13" fontWeight="bold" fontFamily="serif" opacity="0.95">ॐ</text>
                      
                      <defs>
                        <linearGradient id="flagSaffronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FF8A00" />
                          <stop offset="50%" stopColor="#EA580C" />
                          <stop offset="100%" stopColor="#C2410C" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#C65E00]">
                    <span>Dharma Dhwaja</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-semibold leading-tight">
                    Sacred Saffron Ensign
                  </div>
                </div>
              </div>

              {/* 2. Glowing Brass Diya with Flickering Flame & Deep Devotional Glow */}
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/15 to-transparent border border-amber-300/40 flex items-center justify-center shadow-xs">
                  {/* Diya SVG with Animated Flickering Flame */}
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Glowing Aura Behind Flame */}
                    <circle cx="12" cy="7" r="5" fill="#FEF08A" opacity="0.4" className="animate-pulse" />
                    
                    {/* Diya Flame */}
                    <path 
                      d="M12 2 Q14 6 13 8 Q12 10 11 8 Q10 6 12 2 Z" 
                      fill="url(#diyaFlameGrad)" 
                      className="animate-diya-flame"
                    />
                    
                    {/* Brass Diya Bowl */}
                    <path d="M5 14 Q12 20 19 14 Q18 17 12 18 Q6 17 5 14 Z" fill="#D97706" />
                    <path d="M4 13 Q12 16 20 13 L19 14 Q12 17 5 14 Z" fill="#F59E0B" />
                    {/* Diya Stand */}
                    <rect x="10" y="18" width="4" height="2" rx="0.5" fill="#B45309" />
                    <path d="M8 20 L16 20 L17 21 L7 21 Z" fill="#92400E" />

                    <defs>
                      <linearGradient id="diyaFlameGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                        <stop offset="0%" stopColor="#FEF08A" />
                        <stop offset="45%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#EA580C" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="text-left">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70 inline-block">
                    Akhanda Jyoti
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium">Eternal Devotion</div>
                </div>
              </div>

              {/* 3. Golden Shimmer Particles & Sacred Light Stream */}
              <div className="flex items-center gap-2 pl-2 animate-particle-2">
                <span className="w-8 xl:w-16 h-px bg-gradient-to-r from-amber-400/50 to-transparent" />
                <span className="text-[10px] font-bold text-amber-800/80 tracking-widest uppercase">
                  श्री दत्त कृपा • चिरंजीवी
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_#F59E0B]" />
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Modern Registry Marquees - The "Announcement Slider" */}
      <section className="border-t border-slate-200/80 pt-10 sm:pt-14">
        <div className="container mx-auto px-4 md:px-6 mb-6">
           <div className="flex flex-col items-center text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-saffron-600 mb-1">Affiliated Network</span>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">In Association With</h2>
           </div>
        </div>
        
        <OrgMarquee organisations={organisations} />
      </section>

      {/* Analytics Section - SSK Samaj Community Intelligence Dashboard */}
      <main className="container mx-auto px-4 md:px-6 py-12 md:py-20 border-t border-amber-200/50 relative overflow-hidden bg-[#FAF9F5]/45 rounded-3xl my-6">
        
        {/* Subtle Decorative Indian-Inspired Heritage Pattern & Ambient Devotional Atmosphere */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50 select-none">
          {/* Central soft golden sunlight glow */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[850px] h-[380px] bg-gradient-to-b from-orange-400/8 via-amber-300/6 to-transparent blur-3xl rounded-full" />
          
          {/* Very faint rotating sacred solar ray halo */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] pointer-events-none opacity-20 animate-solar-ray">
            <svg viewBox="0 0 400 400" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="200" cy="200" r="180" stroke="#F59E0B" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.3" />
              <circle cx="200" cy="200" r="140" stroke="#FF8A00" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.25" />
              {[...Array(12)].map((_, i) => (
                <line
                  key={i}
                  x1="200"
                  y1="200"
                  x2={200 + 175 * Math.cos((i * Math.PI) / 6)}
                  y2={200 + 175 * Math.sin((i * Math.PI) / 6)}
                  stroke="#F59E0B"
                  strokeWidth="0.5"
                  strokeDasharray="2 8"
                  opacity="0.25"
                />
              ))}
            </svg>
          </div>

          {/* Faint mythological warrior silhouettes & weapons drifting in background */}
          <div className="absolute top-8 left-8 hidden lg:block animate-silhouette-drift">
            <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Bow and arrow emblem silhouette */}
              <path d="M20 70 Q55 20 90 70" stroke="#92400E" strokeWidth="1.2" fill="none" opacity="0.6" />
              <line x1="20" y1="70" x2="90" y2="70" stroke="#B45309" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
              <line x1="55" y1="20" x2="55" y2="75" stroke="#D97706" strokeWidth="1.5" opacity="0.7" />
              <path d="M52 28 L55 20 L58 28" fill="#F59E0B" opacity="0.7" />
              {/* Royal palace shikhara silhouette */}
              <path d="M95 85 L95 65 L102 55 L109 65 L109 85 Z" fill="#78350F" opacity="0.5" />
            </svg>
          </div>

          <div className="absolute bottom-10 right-8 hidden lg:block animate-silhouette-drift" style={{ animationDelay: '4s' }}>
            <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Sacred mace (Gada) and royal shield silhouette */}
              <circle cx="45" cy="45" r="22" stroke="#92400E" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" fill="none" />
              <circle cx="45" cy="45" r="14" stroke="#B45309" strokeWidth="0.8" opacity="0.4" fill="none" />
              <line x1="20" y1="75" x2="80" y2="15" stroke="#D97706" strokeWidth="1.5" opacity="0.5" />
              <circle cx="80" cy="15" r="5" fill="#F59E0B" opacity="0.4" />
            </svg>
          </div>

          {/* Floating golden specks */}
          <div className="absolute top-20 left-[15%] w-1.5 h-1.5 rounded-full bg-amber-400/40 shadow-[0_0_8px_#F59E0B] animate-drift-slow" />
          <div className="absolute top-60 right-[12%] w-2 h-2 rounded-full bg-[#FF8A00]/30 shadow-[0_0_10px_#FF8A00] animate-drift-slow" style={{ animationDelay: '2.5s' }} />
          <div className="absolute bottom-32 left-[25%] w-1.5 h-1.5 rounded-full bg-yellow-400/40 shadow-[0_0_8px_#FBBF24] animate-drift-slow" style={{ animationDelay: '4s' }} />
          <div className="absolute bottom-20 right-[28%] w-1 h-1 rounded-full bg-amber-300/50 shadow-[0_0_6px_#F59E0B] animate-drift-slow" style={{ animationDelay: '1.2s' }} />
        </div>

        <section id="analytics" className="relative space-y-8 sm:space-y-10">
          
          {/* 1. Header: Premium Community Analytics Header with SSK Samaj Heritage Accent */}
          <div className="relative p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden reveal-card analytics-card-elevated heritage-corner-accent">
            {/* Extremely subtle mandala-inspired watermark in background */}
            <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full border border-amber-400/10 pointer-events-none" />
            <div className="absolute -right-6 -top-6 w-48 h-48 rounded-full border border-amber-500/10 pointer-events-none" />
            
            {/* Very slow golden light sweep along top border */}
            <div className="absolute top-0 left-0 right-0 h-1 golden-border-sweep" />

            {/* Small decorative waving saffron Om Flag in top corner */}
            <div className="absolute top-4 right-5 sm:right-6 pointer-events-none hidden sm:flex items-center gap-1.5 opacity-80 animate-flag-wave-slow">
              <div className="w-0.5 h-8 bg-gradient-to-b from-amber-400 to-amber-800 rounded-full" />
              <svg width="34" height="20" viewBox="0 0 34 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0 L32 10 L0 20 Z" fill="url(#hdrFlagGrad)" />
                <path d="M0 0 L32 10 L0 20" stroke="#FEF3C7" strokeWidth="0.7" fill="none" />
                <text x="5" y="13" fill="#FFFBEB" fontSize="8" fontWeight="bold" fontFamily="serif">ॐ</text>
                <defs>
                  <linearGradient id="hdrFlagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF8A00" />
                    <stop offset="100%" stopColor="#C2410C" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#C65E00] text-[11px] font-black uppercase tracking-widest shadow-2xs">
                    <Radio size={12} className="text-[#FF8A00] animate-pulse" />
                    LIVE COMMUNITY INSIGHTS
                  </span>
                  <span className="text-xs text-amber-700/60 font-semibold hidden sm:inline">•</span>
                  <span className="text-xs text-slate-500 font-bold hidden sm:inline tracking-wide">
                    SSK Samaj Registry Network
                  </span>
                </div>
                
                <h2 className="text-2xl sm:text-4xl font-black text-[#0B1020] tracking-tight">
                  Community Live Analytics
                </h2>

                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  Real-time insights from the SSK Samaj community.
                </p>
              </div>

              {/* Refined Live Uplink Status Pill */}
              <div className="flex items-center gap-3 self-start md:self-auto px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs transition-all duration-300 hover:border-amber-300">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </div>
                <div className="text-left">
                  <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                    Live Uplink
                  </div>
                  <div className="text-xs font-black text-[#0B1020] tabular-nums">
                    {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. KPI Section: 5 Executive-Style Metric Cards with Staggered Entrance & Count-up */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            
            {/* Total Verified Members */}
            <div 
              className="p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm analytics-card-elevated heritage-corner-accent relative overflow-hidden group flex flex-col justify-between reveal-card"
              style={{ animationDelay: '50ms' }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF8A00] to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Total Verified Members
                </span>
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#FF8A00] shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-110">
                  <Users size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-[#0B1020] tracking-tight tabular-nums">
                  <CountUp end={members.length} duration={1200} />
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Enrolled members</span>
                </div>
              </div>
            </div>

            {/* Male Members */}
            <div 
              className="p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm analytics-card-elevated heritage-corner-accent relative overflow-hidden group flex flex-col justify-between reveal-card"
              style={{ animationDelay: '150ms' }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF8A00] to-[#E87500] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Male Members
                </span>
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#FF8A00] shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-110">
                  <User size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-[#0B1020] tracking-tight tabular-nums">
                  <CountUp end={maleCount} duration={1200} />
                </p>
                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-semibold">
                  <span>Demographic share</span>
                  <span className="font-black text-[#0B1020] bg-orange-50 px-1.5 py-0.5 rounded text-[10px]">
                    {members.length > 0 ? Math.round((maleCount / members.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Female Members */}
            <div 
              className="p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm analytics-card-elevated heritage-corner-accent relative overflow-hidden group flex flex-col justify-between reveal-card"
              style={{ animationDelay: '250ms' }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0B1020] to-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Female Members
                </span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#0B1020] shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-110">
                  <Heart size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-[#0B1020] tracking-tight tabular-nums">
                  <CountUp end={femaleCount} duration={1200} />
                </p>
                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-semibold">
                  <span>Demographic share</span>
                  <span className="font-black text-[#0B1020] bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                    {members.length > 0 ? Math.round((femaleCount / members.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Field Volunteers */}
            <div 
              className="p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm analytics-card-elevated heritage-corner-accent relative overflow-hidden group flex flex-col justify-between reveal-card"
              style={{ animationDelay: '350ms' }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Field Volunteers
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-110">
                  <UserCheck size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-[#0B1020] tracking-tight tabular-nums">
                  <CountUp end={volunteers.length} duration={1200} />
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Active registrars</span>
                </div>
              </div>
            </div>

            {/* Samaj Organisations */}
            <div 
              className="p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm analytics-card-elevated heritage-corner-accent relative overflow-hidden group col-span-2 sm:col-span-1 flex flex-col justify-between reveal-card"
              style={{ animationDelay: '450ms' }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Samaj Organisations
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs transition-transform duration-300 group-hover:scale-110">
                  <Building2 size={18} />
                </div>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-[#0B1020] tracking-tight tabular-nums">
                  <CountUp end={organisations.length} duration={1200} />
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Affiliated chapters</span>
                </div>
              </div>
            </div>

          </div>

          {/* 3 & 4. Primary Chart Row: Gender Distribution & Professional Demographics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Gender Distribution Card */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[380px] relative overflow-hidden analytics-card-elevated reveal-card" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-[#0B1020] tracking-tight">
                    Gender Distribution
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Verified community gender breakdown
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-50 text-[#C65E00] border border-orange-200/80">
                  Demographic
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <GenderChart members={members} />
              </div>
            </div>

            {/* Professional Profile Card */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[380px] relative overflow-hidden analytics-card-elevated reveal-card" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-[#0B1020] tracking-tight">
                    Professional Profile
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Member career &amp; vocation distribution
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                  Careers
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <OccupationChart members={members} />
              </div>
            </div>

          </div>

          {/* 5 & 6. Secondary Row: Community Support Needs & Community Network Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Community Support Needs - The Main Visual Section */}
            <div className="lg:col-span-8 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[400px] relative overflow-hidden analytics-card-elevated reveal-card" style={{ animationDelay: '350ms' }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-[#0B1020] tracking-tight">
                    Community Support Needs
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                    Priority areas identified across the SSK Samaj community.
                  </p>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-50 text-[#C65E00] border border-orange-200">
                  Actionable Priorities
                </span>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <SupportChart members={members} />
              </div>
            </div>

            {/* Community Network Activity Panel with Heritage Interconnected Constellation */}
            <div className="lg:col-span-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between min-h-[400px] relative overflow-hidden analytics-card-elevated reveal-card" style={{ animationDelay: '450ms' }}>
              
              {/* Animated Connected Community Constellation Background: MEMBERS → VOLUNTEERS → ORGANISATIONS → COMMUNITY */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-55">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="netGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF8A00" stopOpacity="0.35" />
                      <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0B1020" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>
                  
                  {/* Subtle Interconnected Network Flow Paths with traveling pulse */}
                  <line x1="22%" y1="28%" x2="78%" y2="35%" stroke="url(#netGrad)" strokeWidth="1.2" className="animate-network-flow" />
                  <line x1="78%" y1="35%" x2="50%" y2="72%" stroke="url(#netGrad)" strokeWidth="1.2" className="animate-network-flow" />
                  <line x1="50%" y1="72%" x2="22%" y2="28%" stroke="url(#netGrad)" strokeWidth="1.2" className="animate-network-flow" />
                  <line x1="22%" y1="28%" x2="70%" y2="82%" stroke="url(#netGrad)" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />
                  
                  {/* Glowing Interconnected Constellation Nodes */}
                  <circle cx="22%" cy="28%" r="4" fill="#FF8A00" className="animate-constellation-node" />
                  <circle cx="78%" cy="35%" r="4" fill="#6366F1" className="animate-constellation-node" style={{ animationDelay: '1.2s' }} />
                  <circle cx="50%" cy="72%" r="4.5" fill="#10B981" className="animate-constellation-node" style={{ animationDelay: '2.4s' }} />
                  <circle cx="70%" cy="82%" r="3" fill="#F59E0B" opacity="0.5" />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-black text-[#0B1020] tracking-tight">
                      Community Network
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Operational footprint &amp; team
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Connected
                  </span>
                </div>

                <div className="space-y-3.5 my-auto py-1">
                  {/* Field Volunteers Tile */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between hover:border-amber-300 hover:bg-orange-50/20 transition-all duration-300 group">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200/90 flex items-center justify-center text-[#FF8A00] shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        <UserCheck size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                          Field Volunteers
                        </div>
                        <div className="text-xs text-slate-500 font-medium">On-ground registrars</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl sm:text-3xl font-black text-[#0B1020] tabular-nums">
                        <CountUp end={volunteers.length} duration={1200} />
                      </p>
                    </div>
                  </div>

                  {/* Samaj Organisations Tile */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between hover:border-indigo-300 hover:bg-indigo-50/20 transition-all duration-300 group">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                          Samaj Organisations
                        </div>
                        <div className="text-xs text-slate-500 font-medium">Verified institutions</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl sm:text-3xl font-black text-[#0B1020] tabular-nums">
                        <CountUp end={organisations.length} duration={1200} />
                      </p>
                    </div>
                  </div>

                  {/* Verified Members Enrolled Tile */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between hover:border-emerald-300 hover:bg-emerald-50/20 transition-all duration-300 group">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        <Award size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                          Active Registrations
                        </div>
                        <div className="text-xs text-slate-500 font-medium">Verified family nodes</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl sm:text-3xl font-black text-[#0B1020] tabular-nums">
                        <CountUp end={members.length} duration={1200} />
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status footer inside card */}
              <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs relative z-10">
                <span className="text-slate-500 font-medium">Network Status</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  CONNECTED COMMUNITY
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* Hall of Fame */}
        <section className="mt-14 sm:mt-20">
           <Rewards members={members} volunteers={volunteers} organisations={organisations} />
        </section>

        {/* Leaderboard */}
        <section className="mt-14 sm:mt-20">
           <Leaderboard members={members} organisations={organisations} volunteers={volunteers} />
        </section>

        {/* Join Registry CTA */}
        <section className="text-center pt-10 sm:pt-16 md:pt-20 pb-8 px-3 sm:px-6">
          <div className="max-w-4xl mx-auto py-8 sm:py-12 md:py-14 px-4 sm:px-8 md:px-12 bg-gradient-to-br from-[#0B1020] via-[#0E1528] to-[#111827] text-white border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden group">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-saffron-500/20 to-saffron-400/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-saffron-300 border border-white/10 text-[11px] sm:text-xs font-semibold mb-3">
                <Sparkles size={13} className="text-saffron-400 shrink-0" />
                <span>Community Direct Channel</span>
              </span>
              <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2 sm:mb-3 px-2">
                Join the SSK Registry
              </h2>
              <p className="text-slate-300 font-normal text-xs sm:text-sm md:text-base mb-6 sm:mb-8 max-w-lg mx-auto leading-relaxed px-2">
                Become a verified contributor or register your family with the global SSK community database.
              </p>
              <div className="w-full flex justify-center px-1">
                <a 
                  href="tel:+918884449689" 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 sm:gap-3 px-4 xs:px-6 sm:px-10 md:px-12 py-3.5 sm:py-4 bg-gradient-to-r from-[#FF8A00] to-[#E87500] hover:from-[#E87500] hover:to-[#C65E00] rounded-xl sm:rounded-2xl text-black transition-all shadow-[0_10px_30px_rgba(255,138,0,0.35)] active:scale-[0.98] group/btn"
                >
                  <Phone size={18} className="shrink-0 text-black fill-black/10 group-hover/btn:rotate-12 transition-transform duration-200 sm:w-5 sm:h-5" />
                  <div className="flex flex-col xs:flex-row items-center justify-center gap-0.5 xs:gap-1.5 sm:gap-2 leading-tight">
                    <span className="text-xs sm:text-base md:text-lg font-bold tracking-tight opacity-90 xs:opacity-100 whitespace-nowrap">
                      Call Helpline:
                    </span>
                    <span className="text-sm xs:text-base sm:text-lg md:text-lg font-extrabold tracking-normal whitespace-nowrap tabular-nums font-mono xs:font-sans">
                      +91 888 444 9689
                    </span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Volunteer Announcement Bar */}
        <section className="pb-12 md:pb-16">
          <div className="container mx-auto px-4 md:px-6 mb-4 mt-6">
             <div className="flex flex-col items-center text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-saffron-600 mb-1">Our Dedicated Personnel</span>
                <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 tracking-tight">Active Field Volunteers</h2>
             </div>
          </div>
          <VolunteerMarquee volunteers={volunteers} />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
