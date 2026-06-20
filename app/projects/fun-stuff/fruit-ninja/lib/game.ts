export type SlashPoint = { x: number; y: number; t: number };

export type SlashPart = {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  color: string;
  radius: number;
};

export type ScorePopup = {
  x: number; y: number;
  text: string;
  alpha: number;
  vy: number;
};

export type Fruit = {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  emoji: string;
  rotation: number;
  rotSpeed: number;
  slashed: boolean;   // fully destroyed
  cracked: boolean;   // hit once, can be hit again
  isBomb: boolean;
  parts: SlashPart[];
  spawnTime: number;
};

export const GRAVITY = 700; // px/s² — exported so GameCanvas stays in sync

const FRUITS = ['🍉', '🍊', '🍋', '🍇', '🍓', '🍑', '🥝', '🍍', '🫐'];

export const FRUIT_COLORS: Record<string, string> = {
  '🍉': '#ff4d6d', '🍊': '#ff8c00', '🍋': '#ffd166',
  '🍇': '#7209b7', '🍓': '#ef233c', '🍑': '#ffb347',
  '🥝': '#80b918', '🍍': '#f4a261', '🫐': '#4361ee',
};

let nextId = 0;

function makeFruit(w: number, h: number, level: number, x: number, angle: number, speed: number, emoji: string): Fruit {
  return {
    id: nextId++,
    x, y: h + 50,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: Math.max(65, Math.min(w, h) * 0.10),
    emoji,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 5,
    slashed: false,
    cracked: false,
    isBomb: false,
    parts: [],
    spawnTime: Date.now(),
  };
}

export function spawnFruit(w: number, h: number, level: number): Fruit {
  const x = w * 0.1 + Math.random() * w * 0.8;
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
  const targetH = h * (0.75 + Math.random() * 0.20);
  const speed = Math.sqrt(2 * GRAVITY * targetH) * (1 + level * 0.04);
  const emoji = FRUITS[Math.floor(Math.random() * FRUITS.length)];
  return makeFruit(w, h, level, x, angle, speed, emoji);
}

export function spawnBomb(w: number, h: number, level: number): Fruit {
  const f = spawnFruit(w, h, level);
  f.emoji = '💣';
  f.isBomb = true;
  return f;
}

export function spawnBunch(w: number, h: number, level: number, count: number): Fruit[] {
  const originX = w * 0.15 + Math.random() * w * 0.7;
  // Compute speed so fruits reach 75–95% of screen height, then scale with level
  const targetH = h * (0.75 + Math.random() * 0.20);
  const baseSpeed = Math.sqrt(2 * GRAVITY * targetH) * (1 + level * 0.04);
  const baseAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  const fruits: Fruit[] = [];
  let bombPlaced = false;

  for (let i = 0; i < count; i++) {
    const spreadX = originX + (Math.random() - 0.5) * Math.min(300, w * 0.3);
    const angleVar = baseAngle + (Math.random() - 0.5) * 0.5;
    const speedVar = baseSpeed * (0.9 + Math.random() * 0.2);
    // At most one bomb per bunch, 15% chance
    const isBomb = !bombPlaced && Math.random() < 0.15;
    if (isBomb) bombPlaced = true;
    const emoji = isBomb ? '💣' : FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const f = makeFruit(w, h, level, Math.max(80, Math.min(w - 80, spreadX)), angleVar, speedVar, emoji);
    f.isBomb = isBomb;
    fruits.push(f);
  }
  return fruits;
}

export function createCrackParts(fruit: Fruit): SlashPart[] {
  const color = FRUIT_COLORS[fruit.emoji] ?? '#ff6b6b';
  return Array.from({ length: 5 }, (_, i) => {
    const angle = (i / 5) * Math.PI * 2;
    const speed = 50 + Math.random() * 80;
    return { x: fruit.x, y: fruit.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40, alpha: 0.8, color, radius: 3 + Math.random() * 4 };
  });
}

export function createSlashParts(fruit: Fruit): SlashPart[] {
  const color = FRUIT_COLORS[fruit.emoji] ?? '#ff6b6b';
  return Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const speed = 100 + Math.random() * 200;
    return { x: fruit.x, y: fruit.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 80, alpha: 1, color, radius: 5 + Math.random() * 8 };
  });
}

export function lineCircleIntersects(
  x1: number, y1: number,
  x2: number, y2: number,
  cx: number, cy: number,
  r: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;
  if (a === 0) return false;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  let disc = b * b - 4 * a * c;
  if (disc < 0) return false;
  disc = Math.sqrt(disc);
  const t1 = (-b - disc) / (2 * a);
  const t2 = (-b + disc) / (2 * a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}
