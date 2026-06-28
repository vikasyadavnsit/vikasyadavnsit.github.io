'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Video, ExternalLink } from 'lucide-react';

export default function OpenMeetPage() {
  const [loaded, setLoaded] = useState(false);
  // Read room from query params so refresh and shared links land in the right room
  const [room, setRoom] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRoom(params.get('room'));

    // Also update when the iframe pushes a new ?room= into our URL
    const onPopState = () => {
      const p = new URLSearchParams(window.location.search);
      setRoom(p.get('room'));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const iframeSrc = room
    ? `/open-meet/index.html#/meet/${room}`
    : '/open-meet/index.html';

  const newTabHref = room
    ? `/open-meet/index.html#/meet/${room}`
    : '/open-meet/index.html';

  return (
    <div className="w-screen h-screen bg-[#0f0f0f] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/60 backdrop-blur-sm border-b border-white/10 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/projects/fun-stuff"
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Fun Stuff
          </Link>
          <span className="text-white/20">·</span>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center">
              <Video className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">OpenMeet</span>
          </div>
        </div>
        <a
          href={newTabHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs"
          title="Open in new tab"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Open in new tab</span>
        </a>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f0f]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-white/40 text-sm">Loading OpenMeet…</p>
            </div>
          </div>
        )}
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          className="w-full h-full border-0"
          title="OpenMeet"
          allow="camera; microphone; display-capture; fullscreen"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
