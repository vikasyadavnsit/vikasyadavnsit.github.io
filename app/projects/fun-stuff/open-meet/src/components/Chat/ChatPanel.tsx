import { useEffect, useRef, useState, memo } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { useMeetingStore } from '@/store/meetingStore'

interface ChatPanelProps {
  onSendChat: (text: string, senderId: string, senderName: string) => void
}

export const ChatPanel = memo(function ChatPanel({ onSendChat }: ChatPanelProps) {
  const messages = useChatStore((s) => s.messages)
  const markRead = useChatStore((s) => s.markRead)
  const isChatOpen = useUIStore((s) => s.isChatOpen)
  const { localParticipantId, localName } = useMeetingStore()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isChatOpen) {
      markRead()
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isChatOpen, messages, markRead])

  const send = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSendChat(trimmed, localParticipantId, localName)
    setText('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div
      className={`fixed right-0 top-0 bottom-0 w-80 glass-dark border-l border-white/10 flex flex-col z-20 transition-transform duration-300 ${
        isChatOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-white">In-call messages</h2>
        <span className="text-xs text-gray-400">disappear when call ends</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center mt-8">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === localParticipantId
          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              {!isOwn && (
                <span className="text-xs text-gray-400 mb-1 px-1">{msg.senderName}</span>
              )}
              <div
                className={`rounded-2xl px-3 py-2 text-sm max-w-[90%] break-words ${
                  isOwn
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-gray-200 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Send a message…"
            rows={1}
            className="flex-1 bg-white/10 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 max-h-24 overflow-y-auto"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
})
