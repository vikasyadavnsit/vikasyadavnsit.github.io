'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Globe, AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPage() {
  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="z-10 flex flex-col items-center text-center px-6 max-w-2xl"
      >
        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
            y: [0, -10, 0]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8"
        >
          <div className="relative">
             <Globe className="w-24 h-24 text-blue-500 opacity-50" />
             <motion.div
               className="absolute inset-0 flex items-center justify-center"
             >
               <AlertTriangle className="w-12 h-12 text-amber-500" />
             </motion.div>
          </div>
        </motion.div>

        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
          Oops! <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-500">Compatibility</span> Issue
        </h1>

        <p className="text-gray-400 text-lg md:text-xl mb-8 font-light max-w-md">
          It seems your current browser environment doesn't support the premium experience we've built.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/">
            <button className="flex items-center justify-center gap-2 px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all active:scale-95">
              <Home size={18} />
              Try Home
            </button>
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-8 py-3 border border-white/10 bg-white/5 rounded-full text-gray-300 hover:bg-white/10 transition-all"
          >
            <RefreshCw size={18} />
            Refresh Page
          </button>
        </div>
      </motion.div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
    </div>
  );
}
