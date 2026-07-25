"use client";
import { motion } from "framer-motion";
import { ExternalLink, Sparkles, Code2, Github, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const projects = [
  {
    title: "Smart Agriculture Solution",
    category: "AI & IoT",
    description: "Winner of IEEE Hardware Hackathon. IoT-driven solution using Random Forests to predict crop health with real-time sensor data streaming and 2D visualization.",
    tech: ["Python", "IoT", "Random Forests", "Data Viz"],
    link: "#",
    type: "technical",
    impact: "1st Prize @ IEEE"
  },
  {
    title: "Smart Manhole Cover",
    category: "Infrastructure",
    description: "Winner of TATA Power Hackathon. Urban safety monitoring framework using a decentralized mesh network of ESP32 devices for real-time updates.",
    tech: ["ESP32", "Mesh Networks", "Real-time Diagnostics"],
    link: "#",
    type: "technical",
    impact: "3rd Prize @ TATA Power"
  },
  {
    title: "Professional Portfolio",
    category: "Web Engineering",
    description: "High-performance personal site built with Next.js and Framer Motion, showcasing complex work history with a focus on UX and interactivity.",
    tech: ["Next.js 14", "TypeScript", "Tailwind CSS", "Framer Motion"],
    link: "https://github.com/vikasyadavnsit",
    type: "technical",
    impact: "Modern Stack"
  },
];

export default function Projects() {
  return (
    <section id="work" className="py-24 md:py-32 bg-background px-6 relative transition-colors duration-700">
       <div className="absolute inset-0 transition-all duration-700" style={{ background: 'radial-gradient(circle at 100% 0%, hsla(var(--primary), 0.03), transparent 50%)' }} />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 md:mb-32 text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
             <div className="h-px w-12 transition-colors duration-700" style={{ backgroundColor: 'hsla(var(--primary), 0.5)' }} />
             <span className="font-bold uppercase tracking-[0.3em] text-xs transition-colors duration-700 text-primary">Featured Projects</span>
             <div className="h-px w-12 transition-colors duration-700" style={{ backgroundColor: 'hsla(var(--primary), 0.5)' }} />
          </div>
          <h2 className="text-4xl md:text-7xl font-bold text-foreground tracking-tighter mb-8">
            Technical <span className="text-muted-foreground">Creations</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-2xl max-w-3xl mx-auto leading-relaxed font-medium transition-colors duration-700">
            A selection of projects ranging from enterprise engineering to award-winning hackathon solutions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {projects.map((project, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative h-full"
            >
              <div className="relative h-full p-8 md:p-10 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl flex flex-col hover:bg-foreground/[0.02] hover:border-primary/20 transition-all duration-500 shadow-xl shadow-black/5">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-4 rounded-2xl bg-muted border border-border text-foreground shadow-inner group-hover:scale-110 transition-transform duration-500">
                    {project.type === 'creative' ? <Sparkles className="w-6 h-6 text-accent" /> : <Code2 className="w-6 h-6 text-primary" />}
                  </div>
                  <div className="flex gap-3">
                    <a href={project.link} className="p-3 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all">
                      <Github className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">{project.category}</span>
                       <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 transition-all duration-700">{project.impact}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-500">
                      {project.title}
                    </h3>
                  </div>

                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-8 group-hover:text-foreground transition-all duration-700">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {project.tech.map((t) => (
                      <span key={t} className="px-3 py-1 bg-muted border border-border rounded-lg text-[10px] text-muted-foreground font-mono group-hover:text-foreground transition-colors">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <a href={project.link} className="mt-auto group/btn flex items-center justify-center gap-2 w-full py-4 bg-primary text-white border border-primary/20 rounded-2xl font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all duration-500 shadow-lg shadow-primary/20">
                   View Project
                   <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center"
        >
          <Link
            href="/projects"
            className="group flex items-center gap-3 px-10 py-5 bg-foreground text-background font-bold rounded-2xl hover:scale-105 transition-all duration-500 shadow-xl shadow-black/10"
          >
            <span>Explore More Projects</span>
            <div className="p-2 bg-background/10 rounded-lg group-hover:rotate-45 transition-transform duration-500">
              <ExternalLink className="w-5 h-5" />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
