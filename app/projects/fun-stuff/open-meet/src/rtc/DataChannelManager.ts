import type { DataChannelMessage } from '@/types'

export type MessageHandler = (message: DataChannelMessage) => void

export class DataChannelManager {
  private channels: Map<string, RTCDataChannel> = new Map()
  private handlers: MessageHandler[] = []
  // Messages queued before any channel was open; flushed on first channel open
  private pendingBroadcasts: DataChannelMessage[] = []

  createChannel(pc: RTCPeerConnection, label: string): RTCDataChannel {
    const channel = pc.createDataChannel(label, { ordered: true })
    this.attachHandlers(channel)
    this.channels.set(label, channel)
    return channel
  }

  // Called on answerer side when channel is opened by offerer
  registerChannel(channel: RTCDataChannel): void {
    this.attachHandlers(channel)
    this.channels.set(channel.label, channel)
  }

  private flushPending(): void {
    if (this.pendingBroadcasts.length === 0) return
    const pending = this.pendingBroadcasts.splice(0)
    pending.forEach((msg) => this.broadcast(msg))
  }

  private attachHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => this.flushPending()

    // ondatachannel can fire after the channel is already open on the guest side;
    // in that case onopen will never fire again, so flush immediately.
    if (channel.readyState === 'open') {
      this.flushPending()
    }

    channel.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as DataChannelMessage
        this.handlers.forEach((h) => h(message))
      } catch {
        // Malformed message — ignore
      }
    }

    channel.onerror = (e) => {
      console.warn(`[DataChannel:${channel.label}] error`, e)
    }
  }

  send(label: string, message: DataChannelMessage): void {
    const channel = this.channels.get(label)
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify(message))
    }
  }

  broadcast(message: DataChannelMessage): void {
    let sent = false
    this.channels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(JSON.stringify(message))
        sent = true
      }
    })
    if (!sent) {
      this.pendingBroadcasts.push(message)
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.push(handler)
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler)
    }
  }

  close(): void {
    this.channels.forEach((c) => c.close())
    this.channels.clear()
    this.handlers = []
  }
}
