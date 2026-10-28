// 座標はすべて背景画像基準のワールド単位(背景の高さ=768)

/** 背景ストリップ1枚の幅と高さ。scripts/process_assets.py の出力に合わせる */
export const BG_STRIP_W = 1280;
export const BG_H = 768;
export const BG_COUNT = 3;
/** 画面上端の空色(背景画像の上端と同色)。縦長画面で上を延長するのに使う */
export const SKY_COLOR = "#54b3f4";
export const SKY_COLOR_TOP = "#3a97e6";

/** 縦長画面で横方向に見せるワールド幅 */
export const PORTRAIT_VIEW_W = 720;

/** 足元の高さ(道路の上) */
export const GROUND_Y = 700;
/** 水たまり本体の下端(足元より少し手前の路面) */
export const PUDDLE_BASE_Y = 718;

/** 走行速度(ワールド単位/秒)。難易度は水たまりの密度だけで上げる */
export const SPEED = 560;
export const UNITS_PER_METER = 50;

export const MAX_HITS = 4;
/** 被弾後の無敵時間(秒)。最短の水たまり間隔(GAP_FLOOR)より短くしておく */
export const INVINCIBLE_SEC = 0.8;

export const JUMP = {
  duration: 0.72,
  height: 170,
  /** 着地直前のタップを受け付ける秒数 */
  buffer: 0.1,
};

export const PLAYER = {
  /** スプライト1コマの描画サイズ */
  size: 240,
  /** 1コマ内での足元の位置(256px基準) */
  footY: 245,
  halfW: 28,
  /** この高さ未満なら水たまりに触れる */
  safeHeight: 45,
};

export const PUDDLE = {
  scale: 0.62,
  halfW: 55,
  /** 被弾アニメの速度(コマ/秒) */
  fps: 30,
};

export const SPRITE = {
  runFps: 12,
  cryFps: 9,
  /** 泣きアニメ後、リザルトへ移るまでの余韻(秒) */
  cryHold: 0.5,
};

/** 水たまりの間隔(ワールド単位)。0〜RAMP_METERS で易→難へ */
export const DIFFICULTY = {
  rampMeters: 800,
  gapMin: [780, 480] as const,
  gapMax: [1500, 800] as const,
  /** 一回のジャンプで越えられる近接ペアの出現率と間隔 */
  pairChance: [0, 0.3] as const,
  pairGap: 80,
  firstPuddle: 1300,
};
