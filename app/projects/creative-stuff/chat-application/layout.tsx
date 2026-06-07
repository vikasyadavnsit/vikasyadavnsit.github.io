"use client";
import React from "react";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50">
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
