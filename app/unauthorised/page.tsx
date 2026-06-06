'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Lock, Home, Terminal } from 'lucide-react';
import Link from 'next/link';

export default function UnauthorisedPage() {
  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center text-center px-6 max-w-2xl"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8"
        >
          <div className="relative">
             <ShieldAlert className="w-24 h-24 text-red-500" />
             <motion.div
               animate={{ opacity: [0, 1, 0] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="absolute -top-2 -right-2"
             >
               <Lock className="w-8 h-8 text-blue-400" />
             </motion.div>
          </div>
        </motion.div>

        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
          Access <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-600">Denied</span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl mb-8 font-light max-w-md">
          Curiosity is great, but these blueprints are top secret!
          Let's stick to the visual experience, shall we?
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/">
            <button className="flex items-center justify-center gap-2 px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all active:scale-95">
              <Home size={18} />
              Return Home
            </button>
          </Link>

          <div className="flex items-center gap-2 px-8 py-3 border border-white/10 bg-white/5 rounded-full text-gray-300 italic text-sm">
            <Terminal size={16} />
            System: Smart move, but no.
          </div>
        </div>

        {/* Decorative Code Snippet */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 p-4 rounded-xl bg-black/50 border border-white/5 font-mono text-xs text-blue-400/60"
        >
          <p>{`> security_audit_status: FAILED`}</p>
          <p>{`> unauthorised_inspection_detected: true`}</p>
          <p>{`> action: REDIRECT_TO_SAFE_ZONE`}</p>
        </motion.div>
      </motion.div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
    </div>
  );
}
