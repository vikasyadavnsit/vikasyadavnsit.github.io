const ADJECTIVES = [
  'brave', 'clever', 'daring', 'eager', 'fancy', 'gentle', 'happy',
  'jolly', 'kind', 'lucky', 'merry', 'noble', 'proud', 'quiet', 'swift',
  'tidy', 'vivid', 'witty', 'zesty', 'agile', 'bold', 'calm', 'deft',
]

const NOUNS = [
  'falcon', 'river', 'comet', 'ember', 'grove', 'harbor', 'island',
  'jungle', 'knight', 'lantern', 'meadow', 'nebula', 'orbit', 'peak',
  'quest', 'ridge', 'storm', 'tundra', 'valley', 'wave', 'zenith',
]

export function generateRoomId(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 9000 + 1000)
  return `${adj}-${noun}-${num}`
}

export function isValidRoomId(id: string): boolean {
  return /^[a-z]+-[a-z]+-\d{4}$/.test(id)
}
