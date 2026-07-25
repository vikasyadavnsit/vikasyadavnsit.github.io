import { useState } from 'react'
import { useUIStore } from '@/store/uiStore'

interface CopyLinkButtonProps {
  roomId: string
  className?: string
  label?: string
}

export function CopyLinkButton({ roomId, className = '', label = 'Copy Link' }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)
  const addToast = useUIStore((s) => s.addToast)

  const copy = async () => {
    // In the iframe: share the parent page URL with ?room= so recipients land on the
    // embedded view. In standalone (open in new tab): share the hash-routed URL.
    let url: string
    try {
      if (window.self !== window.top) {
        const parentUrl = new URL(window.parent.location.href)
        parentUrl.searchParams.set('room', roomId)
        url = parentUrl.toString()
      } else {
        url = `${window.location.origin}/open-meet/index.html#/meet/${roomId}`
      }
    } catch {
      url = `${window.location.origin}/open-meet/index.html#/meet/${roomId}`
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      addToast('Meeting link copied!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      addToast('Failed to copy link', 'error')
    }
  }

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-2 text-sm transition-colors ${className}`}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}
