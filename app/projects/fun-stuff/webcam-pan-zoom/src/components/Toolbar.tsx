interface ToolbarProps {
  scale: number
}

export function Toolbar({ scale }: ToolbarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2.5 bg-black/50 backdrop-blur-sm border-b border-white/10">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <span className="text-white font-semibold text-sm tracking-tight">Webcam Pan &amp; Zoom</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-white/50 text-xs">Zoom</span>
        <span className="bg-violet-500/20 text-violet-300 text-xs px-2.5 py-1 rounded-full font-mono tabular-nums border border-violet-500/30">
          {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  )
}
