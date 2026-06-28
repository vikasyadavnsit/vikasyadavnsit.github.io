import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateRoomId } from '@/utils/roomId'
import { CopyLinkButton } from '@/components/Common/CopyLinkButton'

export function Home() {
  const navigate = useNavigate()
  const [joinId, setJoinId] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const newRoomId = useMemo(() => generateRoomId(), [])

  const createMeeting = () => navigate(`/meet/${newRoomId}`)

  const joinMeeting = () => {
    const id = joinId.trim()
    if (id) navigate(`/meet/${id}`)
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30">
            📹
          </div>
          <h1 className="text-3xl font-bold text-white">OpenMeet</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Open-source video meetings. No account needed.
        </p>
      </div>

      {/* Card */}
      <div className="glass rounded-3xl p-8 w-full max-w-md border border-white/10 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-2">Start or join a meeting</h2>
        <p className="text-gray-400 text-sm mb-6">
          Powered by WebRTC · Firebase signaling only
        </p>

        {/* New meeting */}
        <button
          onClick={createMeeting}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3 rounded-2xl transition-all shadow-lg shadow-blue-600/20 mb-3"
        >
          + New Meeting
        </button>

        {/* Copy link for new room */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs text-gray-500 font-mono">{newRoomId}</span>
          <CopyLinkButton
            roomId={newRoomId}
            label="Copy link"
            className="text-blue-400 hover:text-blue-300"
          />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-gray-500">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Join existing */}
        {showJoin ? (
          <div className="flex gap-2">
            <input
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinMeeting()}
              placeholder="Enter meeting ID…"
              autoFocus
              className="flex-1 bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={joinMeeting}
              disabled={!joinId.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              Join
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowJoin(true)}
            className="w-full border border-white/10 hover:bg-white/10 text-gray-300 font-medium py-3 rounded-2xl transition-all text-sm"
          >
            Join with a code
          </button>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-600 text-center max-w-xs">
        All conversations stay between participants. Nothing is stored after the call ends.
      </p>
    </div>
  )
}
