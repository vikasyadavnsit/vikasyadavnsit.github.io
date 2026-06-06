"use client";
import { motion } from "framer-motion";
import { GraduationCap, Award, Users, Star } from "lucide-react";

const education = [
  {
    institution: "Netaji Subhas Institute of Technology (NSIT / NSUT), Delhi",
    degree: "Bachelor of Engineering (B.E.) — Electronics & Communication",
    duration: "2014 – 2018",
    details: "Grade: Top 1% of class",
    icon: <GraduationCap className="w-5 h-5 text-blue-400" />
  },
  {
    institution: "Spring Meadows Public School, New Delhi",
    degree: "Higher Secondary (Class XII CBSE)",
    duration: "2007 – 2014",
    details: "Grade: 94.5% (School Topper)",
    icon: <Star className="w-5 h-5 text-amber-400" />
  },
];

const awards = [
  {
    title: "Outstanding Performance Certificates",
    organization: "Airtel Africa",
    description: "Received 4 consecutive yearly awards signed by the CEO and CIO for excellence in software leadership.",
    type: "Leadership"
  },
  {
    title: "1st Prize — IEEE Hardware Hackathon",
    organization: "Techweek 2017",
    description: "Developed an IoT and AI-driven smart agriculture solution predicting crop health.",
    type: "Innovation"
  },
  {
    title: "3rd Prize — TATA Power Hackathon",
    organization: "Smart Grid Forum",
    description: "Built a 'Smart Manhole Cover' framework using ESP32 mesh networks.",
    type: "Engineering"
  },
];

export default function EducationAndAwards() {
  return (
    <section id="about" className="py-24 md:py-32 bg-background px-6 relative transition-colors duration-700">
       <div className="absolute inset-0 transition-all duration-700" style={{ background: 'radial-gradient(circle at 50% 50%, hsla(var(--primary), 0.03), transparent 50%)' }} />

      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Education Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-4 mb-12">
             <div className="h-px w-12 bg-primary/50 transition-colors duration-700" style={{ backgroundColor: 'hsla(var(--primary), 0.5)' }} />
             <span className="text-primary font-bold uppercase tracking-[0.3em] text-xs transition-colors duration-700">Academic Roots</span>
          </div>
          <div className="space-y-6">
            {education.map((edu, i) => (
              <div key={i} className="group relative p-8 rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl hover:bg-foreground/[0.02] hover:border-primary/20 transition-all duration-500 shadow-xl shadow-black/5">
                <div className="flex items-start justify-between mb-6">
                   <div className="p-3 rounded-2xl bg-muted border border-border text-foreground shadow-inner group-hover:scale-110 transition-transform duration-500">
                      {edu.icon}
                   </div>
                   <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{edu.duration}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 leading-tight group-hover:text-primary transition-colors duration-500">{edu.institution}</h3>
                <p className="text-muted-foreground font-medium mb-4">{edu.degree}</p>
                <div className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg text-primary text-xs font-bold uppercase tracking-wider transition-all duration-700">
                  {edu.details}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Awards & Leadership */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4 mb-12">
             <div className="h-px w-12 bg-primary/50 transition-colors duration-700" style={{ backgroundColor: 'hsla(var(--primary), 0.5)' }} />
             <span className="text-primary font-bold uppercase tracking-[0.3em] text-xs transition-colors duration-700">Honors & Impact</span>
          </div>
          <div className="space-y-6">
            {awards.map((award, i) => (
              <div key={i} className="group p-6 md:p-8 rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl hover:bg-foreground/[0.02] hover:border-primary/20 transition-all duration-500 shadow-xl shadow-black/5">
                <div className="flex items-center justify-between mb-4">
                   <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 uppercase tracking-widest transition-all duration-700">{award.type}</span>
                   <Award className="w-5 h-5 text-primary/30 group-hover:text-primary transition-all duration-500" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 leading-tight group-hover:text-primary transition-colors duration-500">{award.title}</h3>
                <p className="text-primary text-xs font-semibold mb-3 transition-colors duration-700">{award.organization}</p>
                <p className="text-muted-foreground text-sm leading-relaxed group-hover:text-foreground transition-all duration-700">{award.description}</p>
              </div>
            ))}

            <div className="p-8 rounded-[2rem] border border-primary/10 bg-primary/5 hover:bg-primary/10 transition-all duration-500">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-primary transition-colors duration-700" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-[0.2em] transition-colors duration-700">Leadership & Mentorship</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed transition-colors duration-700">
                <span className="text-foreground font-bold transition-colors duration-700">Instructor @ TI-CEPD, NSIT:</span> Mentored over 100+ students and researchers in embedded systems and hardware architecture under the Texas Instruments University Program.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
