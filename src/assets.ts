import { BG_COUNT } from "./config";

export interface PuddleFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 本体の下端中央(コマ内座標) */
  ax: number;
  ay: number;
}

export interface Assets {
  bg: HTMLImageElement[];
  run: HTMLImageElement;
  /** 泥1〜3段階 */
  mud: HTMLImageElement[];
  cry: HTMLImageElement;
  puddle: HTMLImageElement;
  puddleFrames: PuddleFrame[];
}

const base = `${import.meta.env.BASE_URL}assets/`;

function loadImage(name: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`画像を読み込めませんでした: ${name}`));
    img.src = base + name;
  });
}

export async function loadAssets(): Promise<Assets> {
  const [bg, run, mud, cry, puddle, puddleFrames] = await Promise.all([
    Promise.all(Array.from({ length: BG_COUNT }, (_, i) => loadImage(`bg${i}.webp`))),
    loadImage("char_run.webp"),
    Promise.all([1, 2, 3].map((n) => loadImage(`char_mud${n}.webp`))),
    loadImage("char_cry.webp"),
    loadImage("puddle.webp"),
    fetch(`${base}puddle.json`).then((r) => r.json() as Promise<PuddleFrame[]>),
  ]);
  return { bg, run, mud, cry, puddle, puddleFrames };
}
