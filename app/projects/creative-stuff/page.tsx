"use client";
import { motion } from "framer-motion";
import { ArrowRight, Pencil, MousePointer2, LogIn, Wifi, Scissors, ShieldCheck, LayoutDashboard, Gauge, LockKeyhole, KeyRound, FlaskConical, ToggleLeft, Workflow, Code2 } from "lucide-react";
import Link from "next/link";

const creativeProjects = [
  {
    title: "Digital Whiteboard",
    description: "A collaborative digital whiteboard where you can doodle anything with any shape or color. Shareable notebooks and real-time syncing.",
    link: "/projects/creative-stuff/whiteboard",
    icon: Pencil,
    color: "from-purple-500 to-indigo-500"
  },
  {
    title: "Scratchpad",
    description: "Web-based pad for drawing with mouse or touch. Powered by P5.js with millions of colors and astonishing undo/redo functionality.",
    link: "/projects/creative-stuff/scratchpad",
    icon: MousePointer2,
    color: "from-emerald-500 to-teal-500"
  },
  {
    title: "QR Based Remote Login",
    description: "Remotely login to accounts by scanning a QR code from a mobile device. A seamless cross-browser authentication experience.",
    link: "/projects/creative-stuff/qr-login",
    icon: LogIn,
    color: "from-amber-500 to-orange-500"
  },
  {
    title: "Global Chat Hub",
    description: "A real-time communication node. Join the global network instantly to broadcast messages and connect with active peers in an ephemeral space.",
    link: "/projects/creative-stuff/chat-application",
    icon: Wifi,
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "URL Shortener",
    description: "Shorten long URLs and store them in your browser. Share the short link — it works across any tab in this browser. No servers, fully local.",
    link: "/projects/creative-stuff/url-shortener",
    icon: Scissors,
    color: "from-violet-500 to-fuchsia-500"
  },
  {
    title: "TOTP Authenticator",
    description: "Two-factor authentication codes in your browser. Add accounts via QR scan, image upload, or secret key. Codes update every 30 seconds.",
    link: "/projects/creative-stuff/totp-authenticator",
    icon: ShieldCheck,
    color: "from-sky-500 to-blue-600"
  },
  {
    title: "Task Manager",
    description: "A Notion-like task manager in your browser. Multiple boards, Kanban + List + Table views, block editor descriptions. Fully local.",
    link: "/projects/creative-stuff/task-manager",
    icon: LayoutDashboard,
    color: "from-rose-500 to-pink-500"
  },
  {
    title: "File Encryptor",
    description: "Encrypt any file with a password using AES-256-GCM directly in your browser. Files never leave your device — pure SubtleCrypto API.",
    link: "/projects/creative-stuff/file-encryptor",
    icon: LockKeyhole,
    color: "from-green-500 to-teal-600"
  },
  {
    title: "Internet Speed Test",
    description: "Test your download, upload, ping, and jitter. History stored locally with date-wise charts to track performance over time.",
    link: "/projects/creative-stuff/internet-speed-test",
    icon: Gauge,
    color: "from-cyan-500 to-blue-500"
  },
  {
    title: "Password Vault",
    description: "AES-256 encrypted password manager. Master password never stored — only used to derive the key. Export encrypted backup. Fully local.",
    link: "/projects/creative-stuff/password-vault",
    icon: KeyRound,
    color: "from-yellow-400 to-amber-500"
  },
  {
    title: "RequestLab",
    description: "Browser-based API client. Send HTTP requests, inspect responses, manage collections with folders, import cURL commands, and export collections. Fully local.",
    link: "/projects/creative-stuff/request-lab",
    icon: FlaskConical,
    color: "from-indigo-500 to-violet-500"
  },
  {
    title: "Flagbase",
    description: "Feature flag management platform. Multi-environment flags, targeting strategies (rollout %, user allowlist), and a drop-in JS SDK. Like Unleash, but self-hosted.",
    link: "/projects/creative-stuff/flagbase",
    icon: ToggleLeft,
    color: "from-violet-500 to-purple-600"
  },
  {
    title: "Workflow Builder",
    description: "Visual no-code automation platform. Connect Trigger, HTTP, Transform, Notify, and Code nodes to build real workflows — like n8n or Zapier, running entirely in your browser.",
    link: "/projects/creative-stuff/workflow-builder",
    icon: Workflow,
    color: "from-emerald-500 to-cyan-500"
  },
  {
    title: "Algorithm Arena",
    description: "Interactive LeetCode-style IDE. Write and test solutions in JS, TS, Python, Java, C++, and Go. High-performance client-side execution with resizable panes.",
    link: "/projects/creative-stuff/algorithm-arena",
    icon: Code2,
    color: "from-indigo-600 to-violet-600"
  }
];

export default function CreativeStuffPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20"
        >
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            Back to Categories
          </Link>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter">
            Creative <span className="text-muted-foreground">Stuff</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            A sandbox for experimental algorithms, interactive canvases, and innovative utility tools.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {creativeProjects.map((project, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={project.link}
                className="group relative block h-full p-8 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl hover:border-primary/20 transition-all duration-500"
              >
                <ProjectCardContent project={project} />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}

function ProjectCardContent({ project }: { project: any }) {
  return (
    <>
      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${project.color} mb-8 group-hover:scale-110 transition-transform duration-500`}>
        <project.icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">
        {project.title}
      </h3>
      <p className="text-muted-foreground mb-8">
        {project.description}
      </p>
      <div className="flex items-center text-primary font-bold uppercase tracking-widest text-xs gap-2">
        Launch Project <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </>
  );
}
