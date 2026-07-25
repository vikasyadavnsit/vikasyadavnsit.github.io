import { useUIStore } from '@/store/uiStore'
import { useChatStore } from '@/store/chatStore'

export function ChatButton() {
  const { isChatOpen, toggleChat } = useUIStore()
  const unreadCount = useChatStore((s) => s.unreadCount)

  return (
    <div className="relative">
      <button
        onClick={toggleChat}
        className={`p-3 rounded-xl transition-all ${
          isChatOpen ? 'bg-blue-500/30 text-blue-400' : 'bg-white/10 hover:bg-white/20 text-white'
        }`}
        title="Chat"
      >
        💬
      </button>
      {unreadCount > 0 && !isChatOpen && (
        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  )
}
