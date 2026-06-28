import {
  setOffer,
  setAnswer,
  addIceCandidate,
  listenForAnswer,
  listenForOffer,
  listenForIceCandidates,
  deleteSignaling,
} from '@/firebase/firestore'
import type { SignalOffer, SignalAnswer } from '@/types'
import type { Unsubscribe } from 'firebase/firestore'

export class SignalingManager {
  private unsubscribers: Unsubscribe[] = []

  // ─── Offer side ────────────────────────────────────────────────────────────

  async publishOffer(roomId: string, pc: RTCPeerConnection, peerId: string): Promise<void> {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const signal: SignalOffer = {
      sdp: offer.sdp!,
      offerId: peerId,
      timestamp: Date.now(),
    }
    await setOffer(roomId, signal)
  }

  waitForAnswer(roomId: string, cb: (answer: SignalAnswer) => void): void {
    const unsub = listenForAnswer(roomId, cb)
    this.unsubscribers.push(unsub)
  }

  sendOfferIceCandidate(roomId: string, candidate: RTCIceCandidateInit): Promise<void> {
    return addIceCandidate(roomId, 'offer', candidate)
  }

  listenForAnswerCandidates(roomId: string, cb: (c: RTCIceCandidateInit) => void): void {
    const unsub = listenForIceCandidates(roomId, 'answer', cb)
    this.unsubscribers.push(unsub)
  }

  // ─── Answer side ───────────────────────────────────────────────────────────

  waitForOffer(roomId: string, cb: (offer: SignalOffer) => void): void {
    const unsub = listenForOffer(roomId, cb)
    this.unsubscribers.push(unsub)
  }

  async publishAnswer(roomId: string, pc: RTCPeerConnection, peerId: string): Promise<void> {
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    const signal: SignalAnswer = {
      sdp: answer.sdp!,
      answerId: peerId,
      timestamp: Date.now(),
    }
    await setAnswer(roomId, signal)
  }

  sendAnswerIceCandidate(roomId: string, candidate: RTCIceCandidateInit): Promise<void> {
    return addIceCandidate(roomId, 'answer', candidate)
  }

  listenForOfferCandidates(roomId: string, cb: (c: RTCIceCandidateInit) => void): void {
    const unsub = listenForIceCandidates(roomId, 'offer', cb)
    this.unsubscribers.push(unsub)
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  stopListening(): void {
    this.unsubscribers.forEach((u) => u())
    this.unsubscribers = []
  }

  async cleanup(roomId: string): Promise<void> {
    this.stopListening()
    await deleteSignaling(roomId)
  }
}
