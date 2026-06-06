"use client";
import { motion } from "framer-motion";
import Navbar from "@/components/sections/Navbar";
import { ArrowRight, Pencil, MousePointer2, LogIn } from "lucide-react";
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
    link: "https://qr-login-9a688.web.app",
    external: true,
    icon: LogIn,
    color: "from-amber-500 to-orange-500"
  }
];

export default function CreativeStuffPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
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
              {project.external ? (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block h-full p-8 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl hover:border-primary/20 transition-all duration-500"
                >
                  <ProjectCardContent project={project} />
                </a>
              ) : (
                <Link
                  href={project.link}
                  className="group relative block h-full p-8 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl hover:border-primary/20 transition-all duration-500"
                >
                  <ProjectCardContent project={project} />
                </Link>
              )}
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
