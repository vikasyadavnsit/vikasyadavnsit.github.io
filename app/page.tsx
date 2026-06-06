import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import BentoGrid from "@/components/sections/BentoGrid";
import Projects from "@/components/sections/Projects";
import Experience from "@/components/sections/Experience";
import EducationAndAwards from "@/components/sections/EducationAndAwards";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30 overflow-x-hidden relative">
      <Navbar />
      <Hero />
      <BentoGrid />
      <Experience />
      <EducationAndAwards />
      <Projects />
      <Contact />
    </main>
  );
}
