"use client";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Baby, Sword, Heart, Users, Camera, Video, Globe } from "lucide-react";
import Link from "next/link";

const funProjects = [
  {
    title: "Talking Characters",
    description: "Pick a character — Tomcat, Dog, Parrot, Robot, or Ghost — speak into your mic and hear your own voice echoed back with their signature audio effect. 100% offline.",
    link: "/projects/fun-stuff/talking-characters",
    icon: MessageCircle,
    color: "from-indigo-500 to-purple-500"
  },
  {
    title: "AI Baby Monitor",
    description: "Browser-based baby monitoring using your webcam and on-device AI. Real-time detection, safe zones, cry detection, sleep tracking, and a full analytics dashboard. 100% private — nothing leaves your device.",
    link: "/projects/fun-stuff/baby-monitor",
    icon: Baby,
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "Fruit Ninja",
    description: "Slash fruits with your hand using your webcam. MediaPipe hand tracking detects swipes in real time. Avoid the bombs — 3 lives, infinite fun. 100% offline.",
    link: "/projects/fun-stuff/fruit-ninja",
    icon: Sword,
    color: "from-red-500 to-orange-500"
  },
  {
    title: "Eternal Journey",
    description: "A beautiful, interactive, multi-page proposal theme. Travel through a digital timeline of memories, reasons to love, and the big question. 100% personal.",
    link: "/projects/fun-stuff/eternal-journey",
    icon: Heart,
    color: "from-rose-500 to-purple-600"
  },
  {
    title: "Family Tree",
    description: "Build interactive family trees with photos, birth dates, and relationship maps. Create multiple trees, share via URL, and export as PNG. 100% offline — stored in your browser.",
    link: "/projects/fun-stuff/family-tree",
    icon: Users,
    color: "from-green-500 to-teal-500"
  },
  {
    title: "Webcam Pan & Zoom",
    description: "A modern webcam viewer with smooth pan and zoom. Mouse wheel to zoom, drag to pan, pinch on touch. Mirror toggle, fullscreen mode, and a floating control panel. 100% offline.",
    link: "/projects/fun-stuff/webcam-pan-zoom",
    icon: Camera,
    color: "from-violet-500 to-fuchsia-500"
  },
  {
    title: "OpenMeet",
    description: "Open-source Google Meet–style video calling built with WebRTC. No backend, no auth, no cloud functions. Firebase is used only for signaling — once peers connect, it goes silent. Chat, reactions, and presence flow over RTCDataChannel.",
    link: "/projects/fun-stuff/open-meet",
    icon: Video,
    color: "from-blue-500 to-sky-400"
  },
  {
    title: "3D Earth",
    description: "Interactive globe with selectable countries, city markers, rivers, and mountains. Zoom from space to street level. Procedurally generated terrain — 100% offline.",
    link: "/projects/fun-stuff/earth-3d",
    icon: Globe,
    color: "from-blue-500 to-cyan-400"
  }
];

export default function FunStuffPage() {
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
            Fun <span className="text-muted-foreground">Stuff</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Quirky, offline-first interactive toys and experiments built for the browser.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {funProjects.map((project, i) => (
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
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
