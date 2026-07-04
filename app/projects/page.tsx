"use client";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Code2, Cpu, Brain } from "lucide-react";
import Link from "next/link";

const categories = [
  {
    title: "Creative Stuff",
    description: "Pseudo game algorithms, snippets, and physics experiments built out of pure creativity.",
    link: "/projects/creative-stuff",
    icon: Sparkles,
    color: "from-pink-500 to-rose-500"
  },
  {
    title: "Fun Stuff",
    description: "Quirky, offline-first interactive toys and experiments built for the browser.",
    link: "/projects/fun-stuff",
    icon: Code2,
    color: "from-red-500 to-orange-500"
  },
  {
    title: "IOT",
    description: "Internet of Things projects exploring the interconnected world of possibilities.",
    link: "/projects/iot",
    icon: Cpu,
    color: "from-blue-500 to-cyan-500"
  },
  {
    title: "AI",
    description: "Machine learning models and intelligent systems exploring data-driven decision making.",
    link: "/projects/ai",
    icon: Brain,
    color: "from-purple-500 to-violet-500"
  }
];

export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter">
            Project <span className="text-muted-foreground">Archive</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Exploring the intersection of engineering, creativity, and modern web technologies.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((category, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={category.link}
                className="group relative block h-full p-8 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl hover:border-primary/20 transition-all duration-500"
              >
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${category.color} mb-8 group-hover:scale-110 transition-transform duration-500`}>
                  <category.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">
                  {category.title}
                </h3>
                <p className="text-muted-foreground mb-8 line-clamp-3">
                  {category.description}
                </p>
                <div className="flex items-center text-primary font-bold uppercase tracking-widest text-xs gap-2">
                  Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
