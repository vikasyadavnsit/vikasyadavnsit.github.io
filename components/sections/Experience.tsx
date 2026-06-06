"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Building2, Calendar } from "lucide-react";

const experiences = [
  {
    company: "Cashfree Payments",
    role: "Software Development Lead",
    duration: "Apr 2026 – Present",
    description: "Leading engineering for high-throughput fintech and payment systems. Specializing in backend and distributed systems architecture.",
    skills: ["Java", "Spring Boot", "Microservices", "AWS"],
    current: true,
  },
  {
    company: "Airtel Africa Digital Labs",
    role: "Senior Lead Software Engineer",
    duration: "Jun 2025 – Apr 2026",
    description: "Led two independent engineering teams (20+ members). Delivered PayX and drove zero-downtime migration of the Developer Portal across 14 countries.",
    skills: ["Platform Engineering", "Payments", "Scalability", "DR Readiness"],
    current: false,
  },
  {
    company: "Airtel Africa Digital Labs",
    role: "Lead Software Engineer",
    duration: "Jul 2023 – Jun 2025",
    description: "Headed architecture modernization for Airtel Money. Built a No-Code API Integration Platform and high-throughput workflow engine using Netflix Conductor.",
    skills: ["Netflix Conductor", "Trino", "Kong", "Kafka"],
    current: false,
  },
  {
    company: "Airtel Africa Digital Labs",
    role: "Senior Software Engineer",
    duration: "Jun 2021 – Jul 2023",
    description: "Engineered core payment microservices and PCI DSS-compliant financial APIs. Built decoupled asynchronous architectures using Kafka and RQueue.",
    skills: ["Spring Cloud", "Keycloak", "RBAC", "Kafka"],
    current: false,
  },
  {
    company: "Publicis Sapient",
    role: "Associate, Technology L2",
    duration: "Dec 2020 – Jun 2021",
    description: "Optimized infrastructure scalability for a global hospitality client. Designed and built a custom Kubernetes shell plugin to automate configuration synchronization.",
    skills: ["Kubernetes", "Docker", "SRE"],
    current: false,
  },
  {
    company: "IFFCO Tokio General Insurance Co. Ltd.",
    role: "Software Engineer",
    duration: "Aug 2018 – Dec 2020",
    description: "Migrated legacy architecture to REST-based microservices. Developed responsive web portals and business automation utilities like optimized Bulk Upload engines.",
    skills: ["Spring Boot", "Angular", "Cordova", "Java"],
    current: false,
  },
];

export default function Experience() {
  return (
    <section id="experience" className="py-24 md:py-32 bg-background px-6 relative transition-colors duration-700">
       <div className="absolute inset-0 transition-all duration-700" style={{ background: 'radial-gradient(circle at 0% 50%, hsla(var(--primary), 0.03), transparent 50%)' }} />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 md:mb-28"
        >
          <div className="flex items-center gap-4 mb-6">
             <div className="h-px w-12 transition-colors duration-700" style={{ backgroundColor: 'hsla(var(--primary), 0.5)' }} />
             <span className="font-bold uppercase tracking-[0.3em] text-xs transition-colors duration-700 text-primary">Career Journey</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground tracking-tighter">
            Professional <span className="text-muted-foreground">Timeline</span>
          </h2>
        </motion.div>

        <div className="space-y-6 md:space-y-8">
          {experiences.map((exp, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative"
            >
              <div className="relative p-6 md:p-10 rounded-[2.5rem] border border-border bg-card/40 backdrop-blur-xl hover:bg-foreground/[0.02] hover:border-primary/20 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-black/5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                       <h3 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-500">
                         {exp.role}
                       </h3>
                       {exp.current && (
                         <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider transition-all duration-700">
                           <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                           Current
                         </span>
                       )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground transition-colors duration-700">
                       <Building2 className="w-4 h-4" />
                       <p className="font-semibold">{exp.company}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-xl text-muted-foreground text-xs font-mono uppercase tracking-wider transition-all duration-700">
                     <Calendar className="w-3.5 h-3.5" />
                     {exp.duration}
                  </div>
                </div>

                <p className="text-muted-foreground text-sm md:text-lg leading-relaxed mb-8 max-w-4xl group-hover:text-foreground transition-all duration-700">
                  {exp.description}
                </p>

                <div className="flex flex-wrap gap-2 pt-8 border-t border-border">
                  {exp.skills.map((skill) => (
                    <span key={skill} className="px-3 py-1 bg-muted border border-border rounded-lg text-[10px] md:text-xs text-muted-foreground font-mono group-hover:text-foreground group-hover:border-primary/20 transition-all duration-500">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
