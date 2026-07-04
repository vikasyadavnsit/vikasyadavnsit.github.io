"use client";
import { motion } from "framer-motion";
import { ArrowRight, Brain } from "lucide-react";
import Link from "next/link";

const aiProjects: {
  title: string;
  description: string;
  link: string;
  icon: typeof Brain;
  color: string;
}[] = [];

export default function AIPage() {
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
            AI <span className="text-muted-foreground">Explorations</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Machine learning models and intelligent systems exploring data-driven decision making.
          </p>
        </motion.div>

        {aiProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {aiProjects.map((project, i) => (
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
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center py-24 rounded-[2.5rem] border border-dashed border-border bg-card/20"
          >
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 mb-8">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-4">More AI projects coming soon</h3>
            <p className="text-muted-foreground max-w-md">
              This section is being stocked with machine learning and intelligent systems work in progress.
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
