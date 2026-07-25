import { create } from 'zustand'
import type { DeviceInfo } from '@/types'

interface MediaStore {
  localStream: MediaStream | null
  screenStream: MediaStream | null
  isCameraOn: boolean
  isMicOn: boolean
  isScreenSharing: boolean
  isMirrored: boolean
  selectedCameraId: string | null
  selectedMicId: string | null
  videoDevices: DeviceInfo[]
  audioDevices: DeviceInfo[]

  setLocalStream: (s: MediaStream | null) => void
  setScreenStream: (s: MediaStream | null) => void
  setIsCameraOn: (v: boolean) => void
  setIsMicOn: (v: boolean) => void
  setIsScreenSharing: (v: boolean) => void
  setIsMirrored: (v: boolean) => void
  setSelectedCameraId: (id: string | null) => void
  setSelectedMicId: (id: string | null) => void
  setVideoDevices: (d: DeviceInfo[]) => void
  setAudioDevices: (d: DeviceInfo[]) => void
  reset: () => void
}

export const useMediaStore = create<MediaStore>((set) => ({
  localStream: null,
  screenStream: null,
  isCameraOn: true,
  isMicOn: true,
  isScreenSharing: false,
  isMirrored: true,
  selectedCameraId: null,
  selectedMicId: null,
  videoDevices: [],
  audioDevices: [],

  setLocalStream: (s) => set({ localStream: s }),
  setScreenStream: (s) => set({ screenStream: s }),
  setIsCameraOn: (v) => set({ isCameraOn: v }),
  setIsMicOn: (v) => set({ isMicOn: v }),
  setIsScreenSharing: (v) => set({ isScreenSharing: v }),
  setIsMirrored: (v) => set({ isMirrored: v }),
  setSelectedCameraId: (id) => set({ selectedCameraId: id }),
  setSelectedMicId: (id) => set({ selectedMicId: id }),
  setVideoDevices: (d) => set({ videoDevices: d }),
  setAudioDevices: (d) => set({ audioDevices: d }),
  reset: () =>
    set({
      localStream: null,
      screenStream: null,
      isCameraOn: true,
      isMicOn: true,
      isScreenSharing: false,
    }),
}))
