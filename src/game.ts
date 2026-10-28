import type { Assets } from "./assets";
import {
  BG_COUNT,
  BG_H,
  BG_STRIP_W,
  DIFFICULTY,
  GROUND_Y,
  INVINCIBLE_SEC,
  JUMP,
  MAX_HITS,
  PLAYER,
  PUDDLE,
  PUDDLE_BASE_Y,
  SPEED,
  SPRITE,
  UNITS_PER_METER,
} from "./config";

export type Mode = "title" | "playing" | "dying" | "result";

interface Puddle {
  x: number;
  /** 被弾してからの経過秒。未被弾は -1 */
  hitAge: number;
}

const lerp = (pair: readonly [number, number], t: number) => pair[0] + (pair[1] - pair[0]) * t;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

export class Game {
  mode: Mode = "title";
  onHit: (hits: number) => void = () => {};
  /** 泣きアニメが終わったとき(メートルを渡す) */
  onOver: (meters: number) => void = () => {};

  private ctx: CanvasRenderingContext2D;
  private cssW = 0;
  private cssH = 0;
  private scale = 1;
  private visW = 0;

  private scroll = 0;
  private dist = 0;
  private startDist = 0;
  private speed = SPEED;
  private puddles: Puddle[] = [];
  private nextPuddleX = DIFFICULTY.firstPuddle;

  private hits = 0;
  private invincible = 0;
  private jumpT = -1;
  private lastTapAt = -Infinity;
  private runClock = 0;
  private dyingClock = 0;
  private overFired = false;
  private clock = 0;
  private autoJumped: Puddle | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private assets: Assets,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D が使えません");
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  get meters(): number {
    return Math.max(0, Math.floor((this.dist - this.startDist) / UNITS_PER_METER));
  }

  start(): void {
    this.startDist = this.dist;
    this.hits = 0;
    this.invincible = 0;
    this.jumpT = -1;
    this.speed = SPEED;
    this.overFired = false;
    this.autoJumped = null;
    // 目の前の水たまりは消して、最初の1つまで余裕を持たせる
    this.puddles = this.puddles.filter((p) => p.x < this.dist - 300 || p.x > this.dist + 700);
    this.nextPuddleX = Math.max(this.nextPuddleX, this.dist + DIFFICULTY.firstPuddle);
    this.mode = "playing";
  }

  jump(): void {
    if (this.mode !== "playing") return;
    this.lastTapAt = this.clock;
    if (this.jumpT < 0) this.beginJump();
  }

  /** 入力ロジックを持たないタイトル用のデモ走行に戻す */
  showTitle(): void {
    this.mode = "title";
    this.hits = 0;
    this.speed = SPEED;
    this.jumpT = -1;
    this.invincible = 0;
  }

  frame(dtRaw: number): void {
    const dt = Math.max(0, Math.min(dtRaw, 1 / 20));
    this.clock += dt;
    this.update(dt);
    this.render();
  }

  private beginJump(): void {
    this.jumpT = 0;
  }

  private difficulty(): number {
    return Math.min(1, this.meters / DIFFICULTY.rampMeters);
  }

  private spawn(limit: number): void {
    const t = this.mode === "title" ? 0.3 : this.difficulty();
    while (this.nextPuddleX < limit) {
      const x = this.nextPuddleX;
      this.puddles.push({ x, hitAge: -1 });
      let next = x + rand(lerp(DIFFICULTY.gapMin, t), lerp(DIFFICULTY.gapMax, t));
      if (Math.random() < lerp(DIFFICULTY.pairChance, t)) {
        this.puddles.push({ x: x + DIFFICULTY.pairGap, hitAge: -1 });
        next += DIFFICULTY.pairGap;
      }
      this.nextPuddleX = next;
    }
  }

  private update(dt: number): void {
    if (this.mode === "dying") {
      this.speed *= Math.exp(-dt * 7);
      this.dyingClock += dt;
      const cryDur = 16 / SPRITE.cryFps + SPRITE.cryHold;
      if (this.dyingClock >= cryDur && !this.overFired) {
        this.overFired = true;
        this.mode = "result";
        this.onOver(this.meters);
      }
    } else if (this.mode === "result") {
      this.speed = 0;
    }

    const move = this.speed * dt;
    this.scroll += move;
    this.dist += move;
    this.runClock += dt;
    this.invincible = Math.max(0, this.invincible - dt);

    const playerX = this.playerX();
    this.spawn(this.dist + (this.visW - playerX) + 400);
    this.puddles = this.puddles.filter((p) => p.x > this.dist - playerX - 400);
    for (const p of this.puddles) if (p.hitAge >= 0) p.hitAge += dt;

    if (this.mode === "title") this.demoAutoJump();
    this.updateJump(dt);
    if (this.mode === "playing") this.checkHits();

  }

  /** タイトル背景のデモ: 水たまりが近づいたら自動でジャンプ */
  private demoAutoJump(): void {
    if (this.jumpT >= 0) return;
    const next = this.puddles.find((p) => p.x - this.dist > 0 && p !== this.autoJumped);
    if (next && next.x - this.dist <= 175) {
      this.autoJumped = next;
      this.beginJump();
    }
  }

  private updateJump(dt: number): void {
    if (this.jumpT < 0) return;
    this.jumpT += dt;
    if (this.jumpT >= JUMP.duration) {
      this.jumpT = -1;
      // 着地直前に押されていたら続けてジャンプ
      if (this.mode === "playing" && this.clock - this.lastTapAt <= JUMP.buffer) this.beginJump();
    }
  }

  private height(): number {
    if (this.jumpT < 0) return 0;
    const u = this.jumpT / JUMP.duration;
    return 4 * JUMP.height * u * (1 - u);
  }

  private checkHits(): void {
    if (this.invincible > 0 || this.height() >= PLAYER.safeHeight) return;
    const reach = PUDDLE.halfW + PLAYER.halfW;
    const p = this.puddles.find((q) => q.hitAge < 0 && Math.abs(q.x - this.dist) < reach);
    if (!p) return;
    p.hitAge = 0;
    this.hits++;
    this.onHit(this.hits);
    if (this.hits >= MAX_HITS) {
      this.mode = "dying";
      this.dyingClock = 0;
      this.jumpT = -1;
    } else {
      this.invincible = INVINCIBLE_SEC;
    }
  }

  // ---- 描画 ----

  private portrait(): boolean {
    return this.cssW < this.cssH;
  }

  private playerX(): number {
    return this.visW * (this.portrait() ? 0.18 : 0.2);
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.cssW = window.innerWidth;
    this.cssH = window.innerHeight;
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    // 縦長・横長とも背景の高さに合わせる(横は画面幅に応じて見える範囲が変わる)
    this.scale = this.cssH / BG_H;
    this.visW = this.cssW / this.scale;
    const k = dpr * this.scale;
    this.ctx.setTransform(k, 0, 0, k, 0, 0);
    this.ctx.imageSmoothingQuality = "high";
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.visW, BG_H);
    this.drawBackground();
    this.drawActors();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const first = Math.floor(this.scroll / BG_STRIP_W);
    for (let i = first, x = first * BG_STRIP_W - this.scroll; x < this.visW; i++, x += BG_STRIP_W) {
      // 1px 重ねて継ぎ目の隙間を防ぐ
      ctx.drawImage(this.assets.bg[((i % BG_COUNT) + BG_COUNT) % BG_COUNT], x, 0, BG_STRIP_W + 1, BG_H);
    }
  }

  private drawActors(): void {
    const playerX = this.playerX();
    const screenX = (p: Puddle) => playerX + p.x - this.dist;
    // 泣いているときはキャラを水たまりより手前に出す
    const crying = this.mode === "dying" || this.mode === "result";
    for (const p of this.puddles) if (crying || p.hitAge < 0) this.drawPuddle(p, screenX(p));
    this.drawPlayer(playerX);
    // 通常時は被弾した水たまりのしぶきを手前に出す
    if (!crying) for (const p of this.puddles) if (p.hitAge >= 0) this.drawPuddle(p, screenX(p));
  }

  private drawPuddle(p: Puddle, x: number): void {
    const frames = this.assets.puddleFrames;
    const idx = p.hitAge < 0 ? 0 : Math.min(frames.length - 1, Math.floor(p.hitAge * PUDDLE.fps));
    const f = frames[idx];
    const s = PUDDLE.scale;
    this.ctx.drawImage(
      this.assets.puddle,
      f.x, f.y, f.w, f.h,
      x - f.ax * s, PUDDLE_BASE_Y - f.ay * s, f.w * s, f.h * s,
    );
  }

  private drawPlayer(x: number): void {
    const ctx = this.ctx;
    const h = this.height();

    // 影(ジャンプ中は小さく薄く)
    const shadow = 1 - Math.min(1, h / (JUMP.height * 1.3)) * 0.5;
    ctx.fillStyle = `rgba(0,0,0,${0.22 * shadow})`;
    ctx.beginPath();
    ctx.ellipse(x, GROUND_Y + 6, 46 * shadow, 9 * shadow, 0, 0, Math.PI * 2);
    ctx.fill();

    const { sheet, frame } = this.currentFrame();
    const k = PLAYER.size / 256;
    const sx = (frame % 4) * 256;
    const sy = Math.floor(frame / 4) * 256;
    const blink = this.invincible > 0 && Math.floor(this.clock * 14) % 2 === 0;
    ctx.globalAlpha = blink ? 0.4 : 1;
    ctx.drawImage(sheet, sx, sy, 256, 256, x - PLAYER.size / 2, GROUND_Y - PLAYER.footY * k - h, PLAYER.size, PLAYER.size);
    ctx.globalAlpha = 1;
  }

  private currentFrame(): { sheet: HTMLImageElement; frame: number } {
    if (this.mode === "dying" || this.mode === "result") {
      if (this.hits >= MAX_HITS) {
        return { sheet: this.assets.cry, frame: Math.min(15, Math.floor(this.dyingClock * SPRITE.cryFps)) };
      }
    }
    const sheet = this.hits === 0 ? this.assets.run : this.assets.mud[Math.min(this.hits, 3) - 1];
    if (this.jumpT >= 0) {
      // 8..15 がジャンプ(踏切→上昇→頂点→下降→着地)
      return { sheet, frame: 8 + Math.min(7, Math.floor((this.jumpT / JUMP.duration) * 8)) };
    }
    const run = SPRITE.runFrames;
    return { sheet, frame: run[Math.floor(this.runClock * SPRITE.runFps) % run.length] };
  }
}
