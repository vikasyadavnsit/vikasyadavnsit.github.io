"use client";
import { motion } from "framer-motion";
import { Mail, Linkedin, Github, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/ThemeContext";

export default function Contact() {
  const { mode } = useTheme();

  return (
    <footer id="contact" className="relative py-24 md:py-40 bg-background px-6 overflow-hidden transition-colors duration-700">
       {/* Background Glow */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[150px] rounded-full pointer-events-none transition-all duration-700" style={{ backgroundColor: 'hsla(var(--primary), 0.1)' }} />

      <div className="max-w-7xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 md:mb-24"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
             <div className="h-px w-12 bg-border transition-colors duration-700" />
             <span className="text-muted-foreground font-bold uppercase tracking-[0.3em] text-xs transition-colors duration-700">Let&apos;s Connect</span>
             <div className="h-px w-12 bg-border transition-colors duration-700" />
          </div>
          <h2 className="text-5xl md:text-8xl font-extrabold text-foreground tracking-tighter mb-12 transition-colors duration-700">
            Have a <span className="text-muted-foreground italic transition-colors duration-700">Project</span> in Mind?
          </h2>
          <a
            href="mailto:vikasyadavtauruss@gmail.com"
            className="group relative inline-flex items-center gap-4 px-12 py-6 bg-foreground text-background font-extrabold text-lg md:text-2xl rounded-full hover:scale-105 transition-all shadow-2xl"
          >
            Say Hello
            <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-2" />
          </a>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 max-w-4xl mx-auto">
           {[
             { name: "LinkedIn", icon: <Linkedin />, href: "https://www.linkedin.com/in/heyiamvikasyadav/", label: "Professional Network" },
             { name: "GitHub", icon: <Github />, href: "https://github.com/vikasyadavnsit", label: "Open Source Work" },
             { name: "Email", icon: <Mail />, href: "mailto:vikasyadavtauruss@gmail.com", label: "Direct Communication" }
           ].map((item) => (
             <a
               key={item.name}
               href={item.href}
               target="_blank"
               className="group p-8 rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl hover:bg-foreground/[0.02] hover:border-primary/20 transition-all duration-500 flex flex-col items-center gap-4 shadow-xl shadow-black/5"
             >
               <div className="p-4 rounded-2xl bg-muted text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-500">
                  {item.icon}
               </div>
               <div>
                  <p className="text-foreground font-bold text-lg transition-colors duration-700">{item.name}</p>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1 transition-colors duration-700">{item.label}</p>
               </div>
             </a>
           ))}
        </div>

        <div className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6 transition-colors duration-700">
           <div className="text-muted-foreground text-xs font-mono uppercase tracking-[0.2em] transition-colors duration-700">
              © {new Date().getFullYear()} Vikas Yadav • Built with Focus & Precision
           </div>
           <div className="flex gap-8 text-muted-foreground text-[10px] font-bold uppercase tracking-widest transition-colors duration-700">
              <a href="#" className="hover:text-foreground transition-colors">Back to Top</a>
              <span className="text-border">/</span>
              <a href="#expertise" className="hover:text-foreground transition-colors">Expertise</a>
              <span className="text-border">/</span>
              <a href="#experience" className="hover:text-foreground transition-colors">Experience</a>
           </div>
        </div>
      </div>
    </footer>
  );
}
