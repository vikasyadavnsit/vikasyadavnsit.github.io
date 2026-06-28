import { PeerManager, type PeerManagerCallbacks } from './PeerManager'
import { MediaManager } from './MediaManager'
import { getOffer } from '@/firebase/firestore'
import type { ConnectionStatus, DataChannelMessage } from '@/types'

export interface ConnectionCallbacks {
  onConnectionStateChange: (status: ConnectionStatus) => void
  onRemoteStream: (stream: MediaStream) => void
  onDataChannelMessage: (message: DataChannelMessage) => void
  /** Called at the start of every reconnect attempt — use to clear stale remote state. */
  onReconnecting?: () => void
}

export class ConnectionManager {
  private peer: PeerManager | null = null
  private roomId: string
  private localPeerId: string
  private callbacks: ConnectionCallbacks
  private localStream: MediaStream | null = null
  private wasHost = false
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isReconnecting = false

  constructor(roomId: string, localPeerId: string, callbacks: ConnectionCallbacks) {
    this.roomId = roomId
    this.localPeerId = localPeerId
    this.callbacks = callbacks
  }

  private clearDisconnectTimer(): void {
    if (this.disconnectTimer !== null) {
      clearTimeout(this.disconnectTimer)
      this.disconnectTimer = null
    }
  }

  private buildPeer(): PeerManager {
    const peerCallbacks: PeerManagerCallbacks = {
      onConnectionStateChange: (status) => {
        this.callbacks.onConnectionStateChange(status)
        if (status === 'connected') {
          this.clearDisconnectTimer()
          this.isReconnecting = false
        }
        if (status === 'disconnected') {
          // Give the peer 4 s to recover on its own before doing a full reconnect
          if (!this.isReconnecting) {
            this.disconnectTimer = setTimeout(() => this.reconnect(), 4000)
          }
        }
        if (status === 'failed') {
          this.clearDisconnectTimer()
          this.reconnect()
        }
      },
      onRemoteStream: this.callbacks.onRemoteStream,
      onDataChannelMessage: this.callbacks.onDataChannelMessage,
    }
    return new PeerManager(peerCallbacks)
  }

  async join(localStream: MediaStream, forceAsHost = false): Promise<void> {
    this.localStream = localStream
    this.peer = this.buildPeer()
    this.peer.addLocalStream(localStream)

    // forceAsHost: skip offer check and re-offer even if a stale one exists
    const existingOffer = forceAsHost ? null : await getOffer(this.roomId)
    this.wasHost = !existingOffer

    if (existingOffer) {
      await this.peer.startAsGuest(this.roomId, this.localPeerId, existingOffer.sdp)
    } else {
      await this.peer.startAsHost(this.roomId, this.localPeerId)
    }
  }

  private async reconnect(): Promise<void> {
    if (this.isReconnecting) return
    this.isReconnecting = true
    this.clearDisconnectTimer()

    // Notify caller so it can clear stale remote participants / stream
    this.callbacks.onReconnecting?.()

    const oldPeer = this.peer
    this.peer = null
    oldPeer?.close()

    if (!this.localStream) {
      this.isReconnecting = false
      return
    }

    this.peer = this.buildPeer()
    this.peer.addLocalStream(this.localStream)
    this.callbacks.onConnectionStateChange('connecting')

    try {
      if (this.wasHost) {
        await this.peer.startAsHost(this.roomId, this.localPeerId)
      } else {
        const offer = await getOffer(this.roomId)
        if (offer) {
          await this.peer.startAsGuest(this.roomId, this.localPeerId, offer.sdp)
        } else {
          // Host is gone — take over so the other peer can join as guest
          this.wasHost = true
          await this.peer.startAsHost(this.roomId, this.localPeerId)
        }
      }
    } catch {
      this.isReconnecting = false
    }
  }

  sendMessage(message: DataChannelMessage): void {
    this.peer?.sendMessage(message)
  }

  replaceVideoTrack(track: MediaStreamTrack): void {
    if (this.peer) {
      MediaManager.replaceVideoTrack(this.peer.pc, track)
    }
  }

  replaceAudioTrack(track: MediaStreamTrack): void {
    if (this.peer) {
      MediaManager.replaceAudioTrack(this.peer.pc, track)
    }
  }

  close(deleteRoom = false): void {
    this.clearDisconnectTimer()
    this.isReconnecting = false
    this.peer?.close(deleteRoom ? this.roomId : undefined)
    this.peer = null
  }
}
