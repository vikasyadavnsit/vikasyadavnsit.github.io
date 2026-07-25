"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Zap, FolderOpen, ToggleLeft, Target, Code, FlaskConical,
  Check, Copy, ChevronRight, Info, Layers, Hash,
} from "lucide-react";

interface Props {
  accent: string;
  accentGlow: string;
}

const SECTIONS = [
  { id: "overview",     icon: BookOpen,    title: "Overview" },
  { id: "quickstart",   icon: Zap,         title: "Quick Start" },
  { id: "projects",     icon: FolderOpen,  title: "Projects & Environments" },
  { id: "flags",        icon: ToggleLeft,  title: "Feature Flags" },
  { id: "strategies",   icon: Target,      title: "Targeting Strategies" },
  { id: "sdk",          icon: Code,        title: "SDK Reference" },
  { id: "testing",      icon: FlaskConical,title: "Live Testing" },
  { id: "architecture", icon: Layers,      title: "How It Works" },
];

export default function DocsView({ accent, accentGlow }: Props) {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`doc-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 flex gap-10">
      {/* Sticky sidebar */}
      <aside className="hidden lg:block w-52 flex-shrink-0">
        <div className="sticky top-24 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 px-3">
            Contents
          </p>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left"
              style={
                activeSection === s.id
                  ? { background: accentGlow, color: accent }
                  : { color: undefined }
              }
            >
              <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
              {s.title}
            </button>
          ))}
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-16">

        {/* Overview */}
        <Section id="overview" title="Overview" icon={BookOpen} accent={accent} accentGlow={accentGlow}>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Flagbase</strong> is a self-hosted feature flag
            management platform — similar to{" "}
            <span className="text-foreground font-medium">Unleash</span> or{" "}
            <span className="text-foreground font-medium">LaunchDarkly</span>, but with zero
            infrastructure. It runs entirely in the browser using Firebase Realtime DB as the
            backend.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Feature flags let you decouple code deployments from feature releases. You ship code
            dark, then turn it on for specific environments or user segments — without redeployment.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { title: "Multi-environment", desc: "Separate flag state for dev, staging, prod" },
              { title: "Targeting strategies", desc: "On/off, rollout %, or user allowlist" },
              { title: "Drop-in SDK", desc: "30-line JS class, zero dependencies" },
            ].map((c) => (
              <div key={c.title} className="p-4 rounded-2xl border border-border bg-card/40">
                <p className="font-semibold text-sm mb-1">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Quick Start */}
        <Section id="quickstart" title="Quick Start" icon={Zap} accent={accent} accentGlow={accentGlow}>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Create a Project",
                desc: 'Click "New Project" on the Dashboard. Give it a name and define your environments (e.g. development, staging, production). A project groups all the flags for one application.',
              },
              {
                step: "2",
                title: "Create a Feature Flag",
                desc: 'Inside your project, click "New Flag". Enter a name — the key slug is auto-generated (e.g. "Dark Mode" → dark-mode). The flag starts disabled in all environments.',
              },
              {
                step: "3",
                title: "Enable & Configure",
                desc: "Click any flag to open its detail view. Toggle it on for your target environment, choose a strategy, and configure targeting. Use Live Test to verify before shipping.",
              },
              {
                step: "4",
                title: "Integrate the SDK",
                desc: 'Go to the "SDK & Docs" tab inside your project. Copy the Flagbase class and paste it into your app. Initialize with your project ID and start gating features.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
                  style={{ background: accentGlow, color: accent }}
                >
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold mb-1">{item.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Projects & Environments */}
        <Section id="projects" title="Projects & Environments" icon={FolderOpen} accent={accent} accentGlow={accentGlow}>
          <p className="text-muted-foreground leading-relaxed mb-6">
            A <strong className="text-foreground">project</strong> maps to one application or
            service. It contains all your feature flags and defines which environments exist.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">
            <strong className="text-foreground">Environments</strong> are independent contexts for
            the same flag. A flag can be enabled in <code className="code-tag">development</code>{" "}
            and disabled in <code className="code-tag">production</code> simultaneously — useful
            for testing before releasing.
          </p>
          <CalloutBox accent={accent} accentGlow={accentGlow} icon={Info}>
            You can define any environment names when creating a project (e.g.{" "}
            <code className="code-tag">canary</code>,{" "}
            <code className="code-tag">eu-prod</code>). Separate them by commas.
          </CalloutBox>
        </Section>

        {/* Feature Flags */}
        <Section id="flags" title="Feature Flags" icon={ToggleLeft} accent={accent} accentGlow={accentGlow}>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Each flag has a <strong className="text-foreground">name</strong> (display label) and a{" "}
            <strong className="text-foreground">key</strong> (used in your code). The key is a
            lowercase slug auto-generated from the name.
          </p>
          <CodeBlock
            accent={accent}
            accentGlow={accentGlow}
            code={`// Key examples:
"Dark Mode"           → dark-mode
"New Checkout Flow"   → new-checkout-flow
"Beta Dashboard"      → beta-dashboard`}
          />
          <p className="text-muted-foreground leading-relaxed mt-6 mb-4">
            Flags are <strong className="text-foreground">boolean</strong> — a flag either evaluates
            to <code className="code-tag">true</code> (enabled) or{" "}
            <code className="code-tag">false</code> (disabled) for a given user.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The flag table inside a project shows a toggle per environment. Flipping that toggle
            is a <strong className="text-foreground">master switch</strong> — it enables the flag
            for everyone matching the strategy, or disables it for everyone regardless of strategy.
          </p>
        </Section>

        {/* Targeting Strategies */}
        <Section id="strategies" title="Targeting Strategies" icon={Target} accent={accent} accentGlow={accentGlow}>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Each flag's environment config has a strategy that controls <em>who</em> sees it when
            the master toggle is on. Strategies are set per environment.
          </p>

          <StrategyCard
            accent={accent}
            accentGlow={accentGlow}
            name="Default"
            badge="on / off"
            desc="No targeting logic. When enabled, the flag returns true for every user. When disabled, false for everyone. Use this for simple global releases."
            code={`// Default strategy — flag is on for all users
const show = await client.isEnabled("maintenance-mode");
// → true if enabled, false if disabled`}
          />

          <StrategyCard
            accent={accent}
            accentGlow={accentGlow}
            name="Gradual Rollout"
            badge="0 – 100%"
            desc="Roll out to a percentage of users. Users are bucketed deterministically by user ID — the same user always gets the same result. Start at 5%, monitor, then increase."
            code={`// Rollout at 20% — 1 in 5 users see the flag
// Same userId → same result every time (deterministic)
const newUI = await client.isEnabled("new-dashboard", {
  userId: "user-abc123",
});`}
            extra={
              <CalloutBox accent={accent} accentGlow={accentGlow} icon={Hash}>
                Hashing: <code className="code-tag">hash(userId) % 100 &lt; rolloutPercentage</code>.
                A user ID that hashes to 17 will always be included in any rollout of 18% or more.
                This makes rollouts sticky and reproducible.
              </CalloutBox>
            }
          />

          <StrategyCard
            accent={accent}
            accentGlow={accentGlow}
            name="User Allowlist"
            badge="exact match"
            desc="Only specific user IDs see the flag. Enter a comma-separated list in the flag's detail view. Perfect for internal beta access or testing with real accounts."
            code={`// Allowlist: "alice, bob, charlie"
await client.isEnabled("secret-feature", { userId: "alice" });   // → true
await client.isEnabled("secret-feature", { userId: "dave" });    // → false`}
          />
        </Section>

        {/* SDK Reference */}
        <Section id="sdk" title="SDK Reference" icon={Code} accent={accent} accentGlow={accentGlow}>
          <p className="text-muted-foreground leading-relaxed mb-6">
            The Flagbase SDK is a self-contained JS class (~30 lines, no dependencies). Paste it
            directly into your codebase. Get the full snippet from the{" "}
            <strong className="text-foreground">SDK & Docs</strong> tab inside any project.
          </p>

          <h4 className="font-bold mb-3 mt-8">Constructor</h4>
          <CodeBlock
            accent={accent}
            accentGlow={accentGlow}
            code={`const client = new Flagbase({
  projectId:   "abc123",       // Your project ID from the Dashboard
  environment: "production",   // Must match one of your project's environments
  userId:      "user-42",      // Optional: default user for all checks
});`}
          />

          <h4 className="font-bold mb-3 mt-8">
            <code>isEnabled(key, context?)</code>
          </h4>
          <p className="text-muted-foreground text-sm mb-4">
            Returns a <code className="code-tag">Promise&lt;boolean&gt;</code>. Evaluates entirely
            client-side after the initial flags fetch.
          </p>
          <CodeBlock
            accent={accent}
            accentGlow={accentGlow}
            code={`// Use the default userId set in the constructor
const darkMode = await client.isEnabled("dark-mode");

// Override userId for this specific check
const betaUI  = await client.isEnabled("beta-ui", { userId: "power-user" });

// Check multiple flags from one client instance
const [showBanner, showBeta, newNav] = await Promise.all([
  client.isEnabled("promo-banner"),
  client.isEnabled("beta-features"),
  client.isEnabled("new-navigation"),
]);`}
          />

          <h4 className="font-bold mb-3 mt-8">React Hook Example</h4>
          <CodeBlock
            accent={accent}
            accentGlow={accentGlow}
            code={`import { useState, useEffect } from "react";

// Initialize once, outside the component
const flagbase = new Flagbase({
  projectId: "abc123",
  environment: process.env.NODE_ENV === "production" ? "production" : "development",
});

function useFlag(key, userId) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    flagbase.isEnabled(key, { userId }).then(setEnabled);
  }, [key, userId]);
  return enabled;
}

// In your component:
function Navbar({ userId }) {
  const showNewNav = useFlag("new-navigation", userId);
  return showNewNav ? <NewNavbar /> : <OldNavbar />;
}`}
          />

          <CalloutBox accent={accent} accentGlow={accentGlow} icon={Info} className="mt-6">
            The SDK fetches your project's flags once on init. To pick up flag changes at runtime,
            re-initialize the client or call{" "}
            <code className="code-tag">client._ready = client._load()</code> to refresh.
          </CalloutBox>
        </Section>

        {/* Live Testing */}
        <Section id="testing" title="Live Testing" icon={FlaskConical} accent={accent} accentGlow={accentGlow}>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Every flag has a <strong className="text-foreground">Live Evaluation Test</strong> panel.
            Use it to verify that your targeting strategy behaves correctly before relying on it in
            production.
          </p>
          <div className="space-y-4">
            {[
              { title: "Select an environment", desc: "Use the environment tabs at the top of the flag detail view to switch between dev, staging, and production configs." },
              { title: "Enter a User ID", desc: 'Type any user ID into the "Enter User ID" field. Leave it empty to simulate an anonymous user.' },
              { title: "Click Evaluate", desc: "The SDK evaluation engine runs with the current strategy and shows ENABLED or DISABLED. This is the exact same logic your production SDK will use." },
              { title: "Impressions are recorded", desc: "Each test click counts as an evaluation and increments the impressions counter for that environment. The bar chart updates in real time." },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: accentGlow, color: accent }}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <CalloutBox accent={accent} accentGlow={accentGlow} icon={Info} className="mt-6">
            Test a rollout strategy by trying the same user ID twice — the result should be
            identical. Then try different user IDs to see which bucket they fall into.
          </CalloutBox>
        </Section>

        {/* Architecture */}
        <Section id="architecture" title="How It Works" icon={Layers} accent={accent} accentGlow={accentGlow}>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Flagbase has no dedicated server. Everything is stored in{" "}
            <strong className="text-foreground">Firebase Realtime DB</strong> and evaluated
            client-side.
          </p>
          <CodeBlock
            accent={accent}
            accentGlow={accentGlow}
            code={`// Data flow:

// 1. Dashboard writes flag config to Firebase
flagbase/flags/{projectId}/{flagId}/environments/production → { enabled, strategy, ... }

// 2. SDK reads config via Firebase REST API (no auth required for reads)
GET https://...firebaseio.com/flagbase/flags/{projectId}.json

// 3. isEnabled() evaluates purely client-side
evaluate(envConfig, { userId }) → boolean`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {[
              { title: "No server needed", desc: "The SDK reads directly from Firebase REST API. No API gateway, no proxy, no backend to deploy." },
              { title: "Real-time in the dashboard", desc: "The dashboard uses Firebase SDK subscriptions — flag changes you make appear instantly without refresh." },
              { title: "Fully public workspace", desc: "This instance is shared and public (like the chat app). For a private deployment, add Firebase Auth rules to restrict writes." },
              { title: "Deterministic evaluation", desc: "The djb2 hash function ensures the same userId always maps to the same rollout bucket, making rollouts consistent and reversible." },
            ].map((c) => (
              <div key={c.title} className="p-4 rounded-2xl border border-border bg-card/40">
                <p className="font-semibold text-sm mb-1">{c.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function Section({
  id, title, icon: Icon, accent, accentGlow, children,
}: {
  id: string; title: string; icon: React.ElementType;
  accent: string; accentGlow: string; children: React.ReactNode;
}) {
  return (
    <motion.section
      id={`doc-${id}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className="scroll-mt-24"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl" style={{ background: accentGlow }}>
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function StrategyCard({
  accent, accentGlow, name, badge, desc, code, extra,
}: {
  accent: string; accentGlow: string; name: string; badge: string;
  desc: string; code: string; extra?: React.ReactNode;
}) {
  return (
    <div className="mb-8 p-6 rounded-[1.5rem] border border-border bg-card/40 backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="font-bold text-lg">{name}</h3>
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: accentGlow, color: accent }}
        >
          {badge}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
      <pre className="p-4 rounded-xl bg-muted/20 border border-border text-xs font-mono overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      {extra && <div className="mt-4">{extra}</div>}
    </div>
  );
}

function CodeBlock({
  code, accent, accentGlow,
}: { code: string; accent: string; accentGlow: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <button
        onClick={copy}
        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-xs font-semibold flex items-center gap-1"
        style={{ background: accentGlow, color: accent }}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="p-5 rounded-[1.25rem] bg-muted/20 border border-border text-xs font-mono overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function CalloutBox({
  children, accent, accentGlow, icon: Icon, className = "",
}: {
  children: React.ReactNode; accent: string; accentGlow: string;
  icon: React.ElementType; className?: string;
}) {
  return (
    <div
      className={`flex gap-3 p-4 rounded-xl border text-sm ${className}`}
      style={{ borderColor: `${accent}55`, background: accentGlow }}
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accent }} />
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
