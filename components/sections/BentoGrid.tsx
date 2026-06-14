"use client";
import React, { useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Code2, Cpu, Database, Server, Zap, Cloud,
  ShieldCheck, Activity, Eye, Layers, CreditCard,
  ArrowUpRight, Terminal, Network, Share2, Globe, Search,
  Lock, Wallet, BarChart3, LineChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeContext";

const FeatureCard = ({ card, index }: { card: any; index: number }) => {
  const { mode } = useTheme();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const glowBackground = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, hsla(var(--primary), ${mode === 'dark' ? '0.15' : '0.1'}), transparent 80%)`
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative p-8 md:p-10 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl flex flex-col overflow-hidden transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5",
        card.className
      )}
    >
      {/* Texture Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
        <svg width="100%" height="100%">
          <pattern id={`pattern-${index}`} width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="currentColor" className="text-foreground" />
          </pattern>
          <rect width="100%" height="100%" fill={`url(#pattern-${index})`} />
        </svg>
      </div>

      {/* Interactive Glow Overlay */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition duration-300"
        style={{ background: glowBackground }}
      />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-8">
          <div className="p-4 rounded-2xl bg-muted border border-border text-foreground shadow-sm group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-500">
            {React.createElement(card.icon, { className: "w-6 h-6" })}
          </div>
          <div className="flex flex-col items-end gap-2">
            {card.stats && (
              <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 transition-all duration-700 uppercase tracking-wider">
                {card.stats}
              </span>
            )}
            <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="mb-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-2 block group-hover:text-primary transition-colors duration-700">
              {card.subtitle}
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">
              {card.title}
            </h3>
          </div>

          <p className="text-muted-foreground text-sm md:text-lg leading-relaxed mb-10 group-hover:text-foreground transition-colors max-w-2xl">
            {card.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-10">
            {card.skills.map((skill: string) => (
              <span key={skill} className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground group-hover:text-foreground group-hover:border-primary/20 transition-all">
                {skill}
              </span>
            ))}
          </div>

          {card.diagram && <div className="mt-auto w-full pt-10 border-t border-border/50">{card.diagram}</div>}
        </div>
      </div>
    </motion.div>
  );
};

const BackendMesh = () => (
  <div className="relative w-full h-48 rounded-2xl bg-muted/30 border border-border p-8 flex items-center justify-around overflow-hidden group/diagram">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsla(var(--primary),0.02),transparent_70%)]" />

    {[Network, Server, Share2].map((Icon, i) => (
      <motion.div
        key={i}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, delay: i * 1.3 }}
        className="relative z-10 flex flex-col items-center gap-2"
      >
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xl group-hover/diagram:border-primary/50 transition-colors">
          <Icon className={cn("w-6 h-6", i === 0 ? 'text-blue-400' : i === 1 ? 'text-purple-400' : 'text-emerald-400')} />
        </div>
        <div className="h-1.5 w-12 bg-border rounded-full overflow-hidden mt-2">
           <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }} className="h-full w-full bg-primary/30" />
        </div>
      </motion.div>
    ))}

    {/* Animated Flow Paths */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
      <motion.path
        d="M 20% 50% L 50% 50% L 80% 50%"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
        strokeDasharray="10 20"
        animate={{ strokeDashoffset: [-100, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  </div>
);

const KafkaStream = () => (
  <div className="relative w-full h-40 rounded-2xl bg-muted/30 border border-border p-6 flex flex-col justify-center overflow-hidden">
    <div className="flex gap-4 items-center">
      <Zap className="w-5 h-5 text-purple-400" />
      <div className="flex-1 h-px bg-white/10 relative">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={{ left: ["0%", "100%"], opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full blur-[2px]"
          />
        ))}
      </div>
      <Database className="w-5 h-5 text-emerald-400" />
    </div>
    <div className="mt-8 flex justify-around">
       {[...Array(5)].map((_, i) => (
         <motion.div
           key={i}
           animate={{ height: [10, 30, 10] }}
           transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
           className="w-1.5 bg-purple-500/20 rounded-full"
         />
       ))}
    </div>
  </div>
);

const SecurityDefense = () => (
  <div className="relative w-full aspect-video rounded-2xl bg-muted/30 border border-border flex items-center justify-center overflow-hidden">
    <div className="relative">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="w-48 h-48 rounded-full border border-dashed border-emerald-500/20"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 rounded-full border border-emerald-500/10"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <Lock className="w-10 h-10 text-emerald-400 animate-pulse" />
        <span className="text-[8px] font-mono font-bold text-emerald-500/50 uppercase tracking-[0.3em]">System Encrypted</span>
      </div>
    </div>
    {/* Scanning Sweep */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      className="absolute w-[200%] h-[200%] origin-center pointer-events-none"
      style={{ backgroundImage: 'conic-gradient(from 0deg, transparent, hsla(var(--primary), 0.1), transparent 30deg)' }}
    />
  </div>
);

const CloudCluster = () => (
  <div className="relative w-full h-40 rounded-2xl bg-muted/30 border border-border p-6 overflow-hidden">
    <div className="grid grid-cols-3 gap-4 h-full items-center">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          className="aspect-square rounded-xl bg-card border border-border flex items-center justify-center relative shadow-lg"
        >
          <Cloud className="w-6 h-6 text-sky-400/50" />
          <motion.div
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.7 }}
            className="absolute top-2 right-2 w-2 h-2 bg-sky-400 rounded-full"
          />
        </motion.div>
      ))}
    </div>
  </div>
);

const DataVisualizer = () => (
  <div className="relative w-full h-40 rounded-2xl bg-muted/30 border border-border p-6 flex flex-col justify-between overflow-hidden">
    <div className="flex justify-between items-end h-24 gap-1">
      {[40, 70, 45, 90, 65, 80, 50, 85, 30].map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          transition={{ duration: 1.5, delay: i * 0.1 }}
          className="flex-1 bg-rose-500/20 border-t border-rose-500/40 rounded-t-sm"
        />
      ))}
    </div>
    <div className="flex justify-between items-center text-rose-500/50">
       <BarChart3 className="w-4 h-4" />
       <div className="flex-1 mx-4 h-px bg-white/5" />
       <Search className="w-4 h-4" />
    </div>
  </div>
);

const ObsDashboard = () => (
  <div className="relative w-full h-40 rounded-2xl bg-muted/30 border border-border p-6 flex flex-col justify-around overflow-hidden">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex items-center gap-3">
        <Activity className={cn("w-4 h-4", i === 0 ? "text-indigo-400" : i === 1 ? "text-blue-400" : "text-sky-400")} />
        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: [`${30 + i * 20}%`, `${60 + i * 10}%`, `${30 + i * 20}%`] }}
            transition={{ duration: 4, repeat: Infinity, delay: i * 1.2 }}
            className={cn("h-full", i === 0 ? "bg-indigo-500/40" : i === 1 ? "bg-blue-500/40" : "bg-sky-500/40")}
          />
        </div>
      </div>
    ))}
    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/[0.02] to-transparent pointer-events-none" />
  </div>
);

const WalletFlow = () => (
  <div className="relative w-full h-48 rounded-2xl bg-muted/30 border border-border p-8 flex items-center justify-around overflow-hidden">
     <div className="flex flex-col items-center gap-3">
        <Wallet className="w-10 h-10 text-amber-400" />
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Source</span>
     </div>

     <div className="flex-1 flex flex-col items-center gap-4 relative">
        <div className="w-full h-px bg-white/10" />
        <motion.div
          animate={{ x: ["-100%", "100%"], opacity: [0, 1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 -translate-y-1/2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/40"
        >
          <CreditCard className="w-5 h-5 text-amber-500" />
        </motion.div>
        <span className="text-[8px] font-bold text-amber-500/50 uppercase tracking-widest">Settling Transaction</span>
     </div>

     <div className="flex flex-col items-center gap-3">
        <Globe className="w-10 h-10 text-amber-400" />
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Global</span>
     </div>
  </div>
);

const cards = [
  {
    title: "Backend Core",
    subtitle: "Distributed Architectures",
    description: "Architecting mission-critical systems processing 10B+ monthly transactions. Expert in high-performance Java ecosystems and orchestration.",
    skills: ["Java 21", "Spring Boot 3", "Netflix Conductor", "Microservices", "GRPC"],
    icon: Code2,
    className: "md:col-span-2 md:row-span-2",
    diagram: <BackendMesh />,
    stats: "SLA 99.99% • 10B+ Txns"
  },
  {
    title: "Event Streaming",
    subtitle: "Real-time Messaging",
    description: "Engineering decoupled, highly resilient asynchronous pipelines for massive scale.",
    skills: ["Apache Kafka", "RQueue", "Pub/Sub", "Event-Driven"],
    icon: Zap,
    className: "md:col-span-1 md:row-span-1",
    diagram: <KafkaStream />
  },
  {
    title: "Security & IAM",
    subtitle: "Identity & Governance",
    description: "Hardening enterprise platforms with mTLS, OAuth2, and Keycloak integration at global scale.",
    skills: ["OAuth2", "Keycloak", "mTLS", "Kong", "RBAC", "PCI DSS"],
    icon: ShieldCheck,
    className: "md:col-span-1 md:row-span-2",
    diagram: <SecurityDefense />,
    stats: "Zero-Trust Ready"
  },
  {
    title: "Cloud Native",
    subtitle: "Cluster Orchestration",
    description: "Modernizing deployments with AWS, EKS, and fully automated CI/CD GitOps pipelines.",
    skills: ["AWS", "Kubernetes", "Docker", "Terraform", "Helm", "GitOps"],
    icon: Cloud,
    className: "md:col-span-1 md:row-span-1",
    diagram: <CloudCluster />
  },
  {
    title: "Data Strategy",
    subtitle: "High-Speed Analytics",
    description: "Sub-second insights leveraging Trino and Redis for complex financial data processing.",
    skills: ["Trino", "Redis", "PostgreSQL", "NoSQL", "MapReduce"],
    icon: Database,
    className: "md:col-span-1 md:row-span-1",
    diagram: <DataVisualizer />
  },
  {
    title: "Observability",
    subtitle: "SRE & Health",
    description: "Reducing incident resolution by 60% through deep telemetry and automated monitoring.",
    skills: ["Prometheus", "Grafana", "Loki", "Jaeger", "ELK Stack"],
    icon: Eye,
    className: "md:col-span-1 md:row-span-1",
    diagram: <ObsDashboard />
  },
  {
    title: "Fintech Domain",
    subtitle: "Payments & Wallets",
    description: "Building mission-critical wallet systems, P2P engines, and cross-border settlement frameworks (ISO8583).",
    skills: ["Wallets", "Settlements", "ISO8583", "P2P", "Bulk Transfers", "KYC/AML"],
    icon: CreditCard,
    className: "md:col-span-2 md:row-span-1",
    diagram: <WalletFlow />
  }
];

export default function BentoGrid() {
  return (
    <section id="expertise" className="py-24 md:py-40 bg-background px-6 relative overflow-hidden transition-colors duration-700">
      {/* Immersive Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,hsla(var(--primary),0.08),transparent_60%)] transition-all duration-700" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] brightness-100 contrast-150 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-24 md:mb-40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-4 mb-8">
               <div className="h-px w-12 transition-colors duration-700" style={{ backgroundColor: 'hsla(var(--primary), 0.5)' }} />
               <span className="font-bold uppercase tracking-[0.4em] text-xs transition-colors duration-700 text-primary">Technical Ecosystem</span>
            </div>
            <h2 className="text-5xl md:text-8xl font-bold text-foreground mb-10 tracking-tighter leading-none transition-colors duration-700">
              Architecting <span className="text-muted-foreground">the Future.</span>
            </h2>
            <p className="text-muted-foreground text-xl md:text-3xl leading-relaxed max-w-3xl font-medium transition-colors duration-700">
              A masterclass in distributed systems, real-time data, and high-security financial infrastructure.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {cards.map((card, i) => (
            <FeatureCard key={i} card={card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
