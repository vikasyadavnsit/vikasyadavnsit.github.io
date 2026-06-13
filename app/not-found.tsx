'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Compass, MapPin, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="z-10 flex flex-col items-center text-center px-6 max-w-2xl"
      >
        {/* Animated Icon */}
        <motion.div
          animate={{
            rotate: [0, 15, -15, 0],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="mb-8"
        >
          <div className="relative">
            <Compass className="w-24 h-24 text-blue-500 opacity-50" />
            <motion.div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-violet-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* 404 Number */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-8xl md:text-[10rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white/20 to-white/5 mb-2 select-none"
        >
          404
        </motion.p>

        <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
          Lost in{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-500">
            the Void
          </span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl mb-8 font-light max-w-md">
          The page you're looking for doesn't exist or may have been moved somewhere else.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/">
            <button className="flex items-center justify-center gap-2 px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all active:scale-95">
              <Home size={18} />
              Go Home
            </button>
          </Link>

          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 px-8 py-3 border border-white/10 bg-white/5 rounded-full text-gray-300 hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </motion.div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
    </div>
  );
}
