import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { CheckCircle2, ShieldCheck, FileText, Info, HelpCircle, Activity, ChevronRight } from 'lucide-react';

// About Section Content
function AboutLinkSphereContent() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 text-slate-800 dark:text-white p-6 border border-slate-100 dark:border-slate-850 bg-white dark:bg-[#111726]">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">About LinkSphere Platform</h2>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          LinkSphere is a premium, real-time Link Intelligence Platform designed to shorten URLs, create custom campaign aliases, and deliver deep insights into audience behaviors. Securely scale campaigns with live Socket.IO logging and responsive dashboard metrics.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">High-Performance Gateway</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium mt-1">Redirects are processed instantly in the backend with low latency database lookup caching, ensuring minimal overhead and maximum throughput.</p>
          </div>
          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">Socket.IO Live Streaming</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium mt-1">Visitor clicks stream directly to the admin and user feeds in real-time, providing immediate visibility into campaign performance.</p>
          </div>
          <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">Hardened Security Guard</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium mt-1">Equipped with strict rate limiters, session tracking, token rotation, and robust authentication flow to prevent platform abuse.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}



// System Status Content
function SystemStatusContent() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-center gap-4 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 size={28} className="shrink-0" />
        <div className="text-left">
          <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-wide">All Systems Operational</h2>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 leading-normal font-semibold">We monitor platform uptime and redirection latency from 12 global regions. Everything is running at peak speed.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="flex flex-col gap-3 text-left">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Monthly Uptime</span>
          <span className="text-2xl font-extrabold text-emerald-500">99.98%</span>
          <span className="text-[10px] text-slate-400 leading-normal">Exceeds the LinkSphere SLA guarantee of 99.9% uptime.</span>
        </Card>
        <Card className="flex flex-col gap-3 text-left">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Redirection Latency</span>
          <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">14ms</span>
          <span className="text-[10px] text-slate-400 leading-normal">Average resolution time for short code URL lookups.</span>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 text-left">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Component Health Status</h3>
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { name: "Zero Latency Redirect Gateway", status: "Operational", desc: "Handles short code lookups and browser 302 redirects." },
            { name: "REST API Application Services", status: "Operational", desc: "Manages link registration, account profiles, and user sessions." },
            { name: "PostgreSQL Database Cluster", status: "Operational", desc: "Data replication, persistent visit logs, and transaction tables." },
            { name: "Socket.IO Live Streaming Service", status: "Operational", desc: "Pushes real-time dashboard events and click streams." }
          ].map((comp, idx) => (
            <div key={idx} className="py-3 flex justify-between items-center text-xs gap-4">
              <div className="text-left">
                <span className="font-bold text-slate-850 dark:text-slate-200">{comp.name}</span>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{comp.desc}</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                {comp.status}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Security Auditing Content
function SecurityAuditingContent() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">System Hardening</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          LinkSphere undergoes periodic threat-modeling assessments to safeguard redirection traffic and user identity keys. We implement advanced transport layers and rate-limit controls.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="flex flex-col gap-2.5 text-left">
          <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">Session Protection</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
            Bearer access keys rotate every 15 minutes, coupled with HttpOnly, secure, and SameSite refresh cookies that prevent Cross-Site Scripting (XSS) and CSRF attacks.
          </p>
        </Card>
        <Card className="flex flex-col gap-2.5 text-left">
          <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">Rate Limiting & Anti-abuse</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
            API endpoints are gated by strict rate limiters. Suspected traffic patterns or brute-force logins automatically trigger IP-level backoffs and suspension logs.
          </p>
        </Card>
        <Card className="flex flex-col gap-2.5 text-left">
          <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">Encryption standards</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
            User credentials are encrypted using salt-hashed Bcrypt. All network communications are conducted over Secure Sockets Layer (TLS 1.3 / HTTPS).
          </p>
        </Card>
        <Card className="flex flex-col gap-2.5 text-left">
          <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">Active Audit Trails</span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
            Admin actions (user suspensions, short-code deletions) generate persistent audit logs. Database lookup caching isolates redirects to prevent DB resource exhaustion.
          </p>
        </Card>
      </div>
    </div>
  );
}

// Policy Helper Content Layout
function PolicyContentLayout({ lastUpdated, paragraphs }) {
  return (
    <Card className="flex flex-col gap-4 text-left">
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Official Policy</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase">Last Updated: {lastUpdated}</span>
      </div>
      <div className="flex flex-col gap-4">
        {paragraphs.map((p, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            {p.heading && <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">{p.heading}</h3>}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {p.text}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Policy Specific paragraphs
const PRIVACY_PARAGRAPHS = [
  {
    heading: "1. Information We Collect",
    text: "We collect user accounts details (name, email, phone number) for profile setup, and visitor redirection metadata (IP addresses, user agents, referrers, and country) to provide real-time click metrics to link owners."
  },
  {
    heading: "2. How We Use Information",
    text: "Visitor redirection data is aggregated to compute analytical trends, browser usage, and geographic heatmaps. We do not sell, trade, or distribute visitor logs to third-party advertisers."
  },
  {
    heading: "3. Session Cookies",
    text: "We issue secure visitor identifier cookies to distinguish unique vs. returning clicks. These cookies are marked HttpOnly and are used strictly for analytics aggregation."
  }
];

const TERMS_PARAGRAPHS = [
  {
    heading: "1. Acceptable Platform Use",
    text: "LinkSphere is designed for marketing, campaign tracking, and short URL redirections. You agree not to shorten links directing visitors to phishing portals, malware hosts, copyright-infringing content, or spam campaigns."
  },
  {
    heading: "2. Account Deactivation & Suspensions",
    text: "Administrators reserve the right to review link logs and suspend user accounts or block custom codes immediately without notice if suspicious, malicious, or abusive activities are detected."
  },
  {
    heading: "3. Platform Warranties & SLA",
    text: "We strive to deliver high-availability, low-latency redirects. However, redirects are provided 'as is' without warranties of any kind regarding suitability for mission-critical industrial applications."
  }
];

const COOKIE_PARAGRAPHS = [
  {
    heading: "1. Strictly Necessary Cookies",
    text: "We utilize session refresh cookies to maintain active logins. These cookies do not store personal profiles and cannot be disabled without breaking auth controls."
  },
  {
    heading: "2. Analytics Cookies",
    text: "We utilize 'linksphere_visitor_id' cookies to determine unique traffic visitors. These cookies carry random UUIDs and do not track users across non-LinkSphere domains."
  },
  {
    heading: "3. Cookie Preferences",
    text: "You can configure your browser to block cookies. Note that blocking refresh cookies will require re-authenticating on every page reload."
  }
];

export default function StaticPagesHub({ activeSection }) {
  
  // Set window title according to selection
  const titleMap = {
    about: 'About LinkSphere',
    status: 'System Status Panel',
    security: 'Platform Security Audit',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    cookies: 'Cookie Policy',
  };
  useDocumentTitle(titleMap[activeSection] || 'Platform Info');

  const sectionsList = [
    { id: 'about', label: 'About Platform', path: '/about', icon: Info, category: 'General' },
    { id: 'status', label: 'System Status', path: '/status', icon: Activity, category: 'Developer & System' },
    { id: 'security', label: 'Security Audit', path: '/security', icon: ShieldCheck, category: 'Developer & System' },
    { id: 'privacy', label: 'Privacy Policy', path: '/privacy', icon: FileText, category: 'Legal & Policies' },
    { id: 'terms', label: 'Terms of Service', path: '/terms', icon: FileText, category: 'Legal & Policies' },
    { id: 'cookies', label: 'Cookie Policy', path: '/cookies', icon: FileText, category: 'Legal & Policies' },
  ];

  const categories = ['General', 'Developer & System', 'Legal & Policies'];

  const getActiveHeaderDetails = () => {
    switch(activeSection) {
      case 'about': return { title: 'About LinkSphere Platform', icon: Info };
      case 'status': return { title: 'System Uptime Status', icon: Activity };
      case 'security': return { title: 'Security Auditing & Protection', icon: ShieldCheck };
      case 'privacy': return { title: 'Privacy Policy', icon: FileText };
      case 'terms': return { title: 'Terms of Service', icon: FileText };
      case 'cookies': return { title: 'Cookie Policy', icon: FileText };
      default: return { title: 'Platform Information', icon: Info };
    }
  };

  const headerDetails = getActiveHeaderDetails();
  const HeaderIcon = headerDetails.icon;

  return (
    <div className="flex flex-col gap-6 text-left max-w-6xl mx-auto w-full py-4">
      {/* Top Banner Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="bg-primary/15 text-primary p-2.5 rounded-xl border border-primary/20">
          <HeaderIcon size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-850 dark:text-slate-50">{headerDetails.title}</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">LinkSphere Platform Documentation & Policies Hub</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sticky Sidebar Nav */}
        <div className="lg:col-span-3 col-span-full flex flex-col gap-4 bg-white dark:bg-[#111726] border border-slate-100 dark:border-slate-800/85 p-4 rounded-2xl shadow-sm sticky top-6">
          <div className="flex flex-col gap-4">
            {categories.map(cat => {
              const catSections = sectionsList.filter(s => s.category === cat);
              if (catSections.length === 0) return null;
              return (
                <div key={cat} className="flex flex-col gap-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2.5 pb-1">{cat}</span>
                  {catSections.map(s => {
                    const Icon = s.icon;
                    const isActive = activeSection === s.id;
                    return (
                      <Link
                        key={s.id}
                        to={s.path}
                        className={"flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all " + 
                          (isActive 
                            ? 'bg-primary/10 text-primary font-extrabold border border-primary/10' 
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-slate-800 dark:hover:text-slate-200')}
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={14} className={isActive ? "text-primary" : "text-slate-400"} />
                          <span>{s.label}</span>
                        </div>
                        <ChevronRight size={12} className={isActive ? "text-primary" : "text-slate-400 opacity-0 lg:block"} />
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Content Display */}
        <div className="lg:col-span-9 col-span-full flex flex-col gap-6">
          {activeSection === 'about' && <AboutLinkSphereContent />}
          {activeSection === 'status' && <SystemStatusContent />}
          {activeSection === 'security' && <SecurityAuditingContent />}
          {activeSection === 'privacy' && <PolicyContentLayout lastUpdated="June 2026" paragraphs={PRIVACY_PARAGRAPHS} />}
          {activeSection === 'terms' && <PolicyContentLayout lastUpdated="June 2026" paragraphs={TERMS_PARAGRAPHS} />}
          {activeSection === 'cookies' && <PolicyContentLayout lastUpdated="June 2026" paragraphs={COOKIE_PARAGRAPHS} />}
        </div>
      </div>
    </div>
  );
}

// Wrapper Page Component definitions mapping to the central hub
export function AboutLinkSphere() {
  return <StaticPagesHub activeSection="about" />;
}

export function SystemStatus() {
  return <StaticPagesHub activeSection="status" />;
}

export function SecurityAuditing() {
  return <StaticPagesHub activeSection="security" />;
}

export function PrivacyPolicy() {
  return <StaticPagesHub activeSection="privacy" />;
}

export function TermsOfService() {
  return <StaticPagesHub activeSection="terms" />;
}

export function CookiePolicy() {
  return <StaticPagesHub activeSection="cookies" />;
}
