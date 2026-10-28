const KEY = "puddlerun.best.v1";

export function loadBest(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

export function saveBest(meters: number): void {
  try {
    localStorage.setItem(KEY, String(meters));
  } catch {
    // プライベートモード等で保存できなくても遊べるようにする
  }
}
