export class MediaManager {
  // Returns a combined video+audio stream so the peer connection gets both tracks.
  // audioDeviceId is optional — pass it when the user switches mic.
  static async getCamera(videoDeviceId?: string, audioDeviceId?: string): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      video: videoDeviceId
        ? { deviceId: { exact: videoDeviceId } }
        : { width: 1280, height: 720 },
      audio: audioDeviceId
        ? { deviceId: { exact: audioDeviceId }, echoCancellation: true, noiseSuppression: true }
        : { echoCancellation: true, noiseSuppression: true },
    })
  }

  static async getScreenShare(): Promise<MediaStream> {
    return navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
    })
  }

  static async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices()
  }

  static replaceVideoTrack(pc: RTCPeerConnection, newTrack: MediaStreamTrack): void {
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
    if (sender) sender.replaceTrack(newTrack)
  }

  static replaceAudioTrack(pc: RTCPeerConnection, newTrack: MediaStreamTrack): void {
    const sender = pc.getSenders().find((s) => s.track?.kind === 'audio')
    if (sender) sender.replaceTrack(newTrack)
  }

  static stopStream(stream: MediaStream | null): void {
    stream?.getTracks().forEach((t) => t.stop())
  }

  static muteTrack(stream: MediaStream, kind: 'audio' | 'video', muted: boolean): void {
    stream.getTracks().filter((t) => t.kind === kind).forEach((t) => {
      t.enabled = !muted
    })
  }
}
