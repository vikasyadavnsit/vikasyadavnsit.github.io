"use client";
import { motion } from "framer-motion";
import { ArrowDown, Github, Linkedin, Mail, User } from "lucide-react";
import { useTheme } from "@/components/ThemeContext";

export default function Hero() {
  const { mode } = useTheme();

  const FADE_UP_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-background py-24 px-4 transition-colors duration-700">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 blur-[150px] rounded-full animate-pulse transition-all duration-700" style={{ backgroundColor: 'hsla(var(--primary), 0.15)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 blur-[150px] rounded-full animate-pulse [animation-delay:2s] transition-all duration-700" style={{ backgroundColor: 'hsla(var(--accent), 0.15)' }} />

      <motion.div
        initial="hidden"
        animate="show"
        viewport={{ once: true }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1 } },
        }}
        className="relative z-10 text-center w-full max-w-5xl"
      >
        <motion.div
          variants={FADE_UP_ANIMATION_VARIANTS}
          className="mb-8 relative flex justify-center"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" style={{ backgroundImage: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))' }} />
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-foreground/10 p-1.5 bg-card flex items-center justify-center">
              <User className="w-16 h-16 text-muted-foreground" />
            </div>
            <div className="absolute bottom-2 right-2 w-5 h-5 md:w-6 md:h-6 bg-primary border-4 border-background rounded-full shadow-lg transition-all duration-700" style={{ backgroundColor: 'hsl(var(--primary))', boxShadow: '0 0 20px hsla(var(--primary), 0.5)' }} />
          </div>
        </motion.div>

        <motion.div variants={FADE_UP_ANIMATION_VARIANTS}>
          <span className="inline-block px-4 py-1.5 mb-8 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase border rounded-full border-primary/20 bg-primary/5 text-primary transition-all duration-700">
            Lead Software Engineer @ Cashfree
          </span>
        </motion.div>

        <motion.h1
          variants={FADE_UP_ANIMATION_VARIANTS}
          className="text-5xl sm:text-6xl md:text-9xl font-extrabold tracking-tighter text-foreground mb-8"
        >
          Vikas <span className="text-transparent bg-clip-text bg-gradient-to-r transition-all duration-700" style={{ backgroundImage: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))' }}>Yadav</span>
        </motion.h1>

        <motion.p
          variants={FADE_UP_ANIMATION_VARIANTS}
          className="max-w-2xl mx-auto text-lg md:text-2xl text-muted-foreground mb-12 leading-relaxed px-4 font-medium"
        >
          Building high-throughput <span className="text-foreground">fintech architectures</span> and scalable <span className="text-foreground">distributed systems</span> for millions of users.
        </motion.p>

        <motion.div variants={FADE_UP_ANIMATION_VARIANTS} className="flex flex-col sm:flex-row gap-4 justify-center px-6">
          <a href="#expertise" className="px-10 py-5 bg-foreground text-background font-bold rounded-full hover:scale-105 transition-all shadow-xl text-sm uppercase tracking-widest">
            Explore Expertise
          </a>
          <div className="flex gap-4 justify-center">
             <a href="https://github.com/vikasyadavnsit" target="_blank" className="p-5 bg-card text-foreground rounded-full border border-border hover:bg-muted transition-all">
                <Github className="w-5 h-5" />
             </a>
             <a href="https://www.linkedin.com/in/heyiamvikasyadav/" target="_blank" className="p-5 bg-card text-foreground rounded-full border border-border hover:bg-muted transition-all">
                <Linkedin className="w-5 h-5" />
             </a>
             <a href="mailto:vikasyadavtauruss@gmail.com" className="p-5 bg-card text-foreground rounded-full border border-border hover:bg-muted transition-all">
                <Mail className="w-5 h-5" />
             </a>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-muted-foreground animate-bounce"
      >
        <ArrowDown className="w-6 h-6" />
      </motion.div>
    </section>
  );
}
