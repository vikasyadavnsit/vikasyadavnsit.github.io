import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  getDocs,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { RoomDoc, SignalAnswer, SignalOffer, SignalIceCandidate } from '@/types'

// ─── Room ─────────────────────────────────────────────────────────────────────

export async function createRoom(roomId: string, hostId: string): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId)
  const data: RoomDoc = {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    hostId,
    participantCount: 1,
    status: 'waiting',
  }
  await setDoc(roomRef, data)
}

export async function roomExists(roomId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'rooms', roomId))
  return snap.exists()
}

export async function getRoom(roomId: string): Promise<RoomDoc | null> {
  const snap = await getDoc(doc(db, 'rooms', roomId))
  return snap.exists() ? (snap.data() as RoomDoc) : null
}

export async function deleteRoom(roomId: string): Promise<void> {
  await deleteSignaling(roomId)
  await deleteDoc(doc(db, 'rooms', roomId))
}

// ─── Offer ────────────────────────────────────────────────────────────────────

export async function setOffer(roomId: string, offer: SignalOffer): Promise<void> {
  await setDoc(doc(db, 'rooms', roomId, 'signals', 'offer'), offer)
}

export async function getOffer(roomId: string): Promise<SignalOffer | null> {
  const snap = await getDoc(doc(db, 'rooms', roomId, 'signals', 'offer'))
  return snap.exists() ? (snap.data() as SignalOffer) : null
}

export function listenForOffer(
  roomId: string,
  cb: (offer: SignalOffer) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'rooms', roomId, 'signals', 'offer'), (snap) => {
    if (snap.exists()) cb(snap.data() as SignalOffer)
  })
}

// ─── Answer ───────────────────────────────────────────────────────────────────

export async function setAnswer(roomId: string, answer: SignalAnswer): Promise<void> {
  await setDoc(doc(db, 'rooms', roomId, 'signals', 'answer'), answer)
}

export function listenForAnswer(
  roomId: string,
  cb: (answer: SignalAnswer) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'rooms', roomId, 'signals', 'answer'), (snap) => {
    if (snap.exists()) cb(snap.data() as SignalAnswer)
  })
}

// ─── ICE Candidates ───────────────────────────────────────────────────────────

export async function addIceCandidate(
  roomId: string,
  side: 'offer' | 'answer',
  candidate: RTCIceCandidateInit,
): Promise<void> {
  const data: SignalIceCandidate = {
    candidate: candidate.candidate ?? '',
    sdpMid: candidate.sdpMid ?? null,
    sdpMLineIndex: candidate.sdpMLineIndex ?? null,
    side,
    timestamp: Date.now(),
  }
  await addDoc(collection(db, 'rooms', roomId, 'signals', 'iceCandidates', side), data)
}

export function listenForIceCandidates(
  roomId: string,
  side: 'offer' | 'answer',
  cb: (candidate: RTCIceCandidateInit) => void,
): Unsubscribe {
  const col = collection(db, 'rooms', roomId, 'signals', 'iceCandidates', side)
  return onSnapshot(query(col), (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data() as SignalIceCandidate
        cb({ candidate: data.candidate, sdpMid: data.sdpMid, sdpMLineIndex: data.sdpMLineIndex })
      }
    })
  })
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

export async function deleteSignaling(roomId: string): Promise<void> {
  const signalsRef = collection(db, 'rooms', roomId, 'signals')
  const snap = await getDocs(signalsRef)

  // Delete offer, answer
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))

  // Delete ICE candidate sub-collections
  await Promise.all(
    ['offer', 'answer'].map(async (side) => {
      const icesnap = await getDocs(
        collection(db, 'rooms', roomId, 'signals', 'iceCandidates', side),
      )
      return Promise.all(icesnap.docs.map((d) => deleteDoc(d.ref)))
    }),
  )
}

// Timestamp helper for server-time fields
export { serverTimestamp }
