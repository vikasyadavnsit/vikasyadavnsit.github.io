"use client";
import { motion } from "framer-motion";
import { ArrowRight, Cpu, Network, Zap } from "lucide-react";
import Link from "next/link";

const iotProjects = [
  {
    title: "IoT Bridge",
    description: "A similar setup like IFTTT. Create 'If This Then That' rules for your devices. Features simulation and live integration modes.",
    link: "/projects/iot/bridge",
    icon: Network,
    color: "from-blue-600 to-indigo-600"
  }
];

export default function IOTPage() {
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
            IOT <span className="text-muted-foreground">Solutions</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Connecting the physical and digital worlds through smart automation and real-time data orchestration.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {iotProjects.map((project, i) => (
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
