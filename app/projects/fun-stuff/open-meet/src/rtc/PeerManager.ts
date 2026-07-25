import { SignalingManager } from './SignalingManager'
import { DataChannelManager } from './DataChannelManager'
import type { ConnectionStatus, DataChannelMessage } from '@/types'

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export interface PeerManagerCallbacks {
  onConnectionStateChange: (status: ConnectionStatus) => void
  onRemoteStream: (stream: MediaStream) => void
  onDataChannelMessage: (message: DataChannelMessage) => void
  onIceCandidateError?: () => void
}

export class PeerManager {
  readonly pc: RTCPeerConnection
  readonly signalingManager: SignalingManager
  readonly dataChannelManager: DataChannelManager
  private callbacks: PeerManagerCallbacks

  constructor(callbacks: PeerManagerCallbacks) {
    this.callbacks = callbacks
    this.signalingManager = new SignalingManager()
    this.dataChannelManager = new DataChannelManager()

    this.pc = new RTCPeerConnection({ iceServers: STUN_SERVERS })
    this.wireEvents()
  }

  private wireEvents(): void {
    this.pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange(this.pc.connectionState as ConnectionStatus)
    }

    this.pc.ontrack = (event) => {
      if (event.streams[0]) {
        this.callbacks.onRemoteStream(event.streams[0])
      }
    }

    // Register incoming data channels (answerer side)
    this.pc.ondatachannel = (event) => {
      this.dataChannelManager.registerChannel(event.channel)
      event.channel.onopen = () => {
        // Notify via message handler
      }
    }

    this.dataChannelManager.onMessage((msg) => {
      this.callbacks.onDataChannelMessage(msg)
    })
  }

  addLocalStream(stream: MediaStream): void {
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream)
    })
  }

  // ─── Host flow ─────────────────────────────────────────────────────────────

  async startAsHost(roomId: string, localPeerId: string): Promise<void> {
    // Create data channels before offer
    this.dataChannelManager.createChannel(this.pc, 'meta')
    this.dataChannelManager.createChannel(this.pc, 'chat')

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.signalingManager.sendOfferIceCandidate(roomId, candidate.toJSON())
      }
    }

    await this.signalingManager.publishOffer(roomId, this.pc, localPeerId)

    // Listen for answer
    this.signalingManager.waitForAnswer(roomId, async (answer) => {
      if (this.pc.signalingState !== 'have-local-offer') return
      try {
        await this.pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp })
        this.signalingManager.listenForAnswerCandidates(roomId, (c) => {
          this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
        })
      } catch {
        // SDP mismatch — the answer was for a previous offer; wait for a fresh one
      }
    })
  }

  // ─── Guest flow ────────────────────────────────────────────────────────────

  async startAsGuest(roomId: string, localPeerId: string, offerSdp: string): Promise<void> {
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.signalingManager.sendAnswerIceCandidate(roomId, candidate.toJSON())
      }
    }

    await this.pc.setRemoteDescription({ type: 'offer', sdp: offerSdp })

    // Listen for host's ICE candidates
    this.signalingManager.listenForOfferCandidates(roomId, (c) => {
      this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
    })

    await this.signalingManager.publishAnswer(roomId, this.pc, localPeerId)
  }

  sendMessage(message: DataChannelMessage): void {
    this.dataChannelManager.broadcast(message)
  }

  close(roomId?: string): void {
    if (roomId) {
      this.signalingManager.cleanup(roomId)
    } else {
      this.signalingManager.stopListening()
    }
    this.dataChannelManager.close()
    this.pc.close()
  }
}
