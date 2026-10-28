import "./fonts.css";
import "./style.css";
import { loadAssets } from "./assets";
import { MAX_HITS } from "./config";
import { Game } from "./game";
import { loadBest, saveBest } from "./storage";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** 泣きアニメ直後の誤タップでリザルトが飛ばないようにする時間(ms) */
const RESULT_LOCK_MS = 800;

const screens = {
  loading: $("loading"),
  title: $("title"),
  hud: $("hud"),
  result: $("result"),
};

function show(...names: (keyof typeof screens)[]): void {
  for (const [name, el] of Object.entries(screens)) {
    el.classList.toggle("show", names.includes(name as keyof typeof screens));
  }
}

const lives = $("hud-lives");
for (let i = 0; i < MAX_HITS; i++) {
  lives.insertAdjacentHTML(
    "beforeend",
    `<svg class="drop" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 2C16 2 3 18 3 26a13 13 0 0 0 26 0C29 18 16 2 16 2z"/><ellipse cx="11" cy="27" rx="3" ry="5" class="shine"/></svg>`,
  );
}

function updateLives(hits: number): void {
  lives.querySelectorAll(".drop").forEach((el, i) => el.classList.toggle("lost", i >= MAX_HITS - hits));
}

async function main(): Promise<void> {
  const assets = await loadAssets();
  const game = new Game($<HTMLCanvasElement>("stage"), assets);
  let best = loadBest();
  let tapLockedUntil = 0;

  const toTitle = () => {
    $("title-best").textContent = String(best);
    game.showTitle();
    show("title");
  };

  const startGame = () => {
    game.start();
    updateLives(0);
    $("hud-meter").textContent = "0";
    show("hud");
  };

  // 自動テスト用(ビルド時に VITE_EXPOSE_GAME=1 を付けたときだけ公開)
  if (import.meta.env.VITE_EXPOSE_GAME) (window as unknown as { __game: Game }).__game = game;

  game.onHit = updateLives;
  game.onOver = (meters) => {
    const isNew = meters > best;
    if (isNew) {
      best = meters;
      saveBest(best);
    }
    $("result-score").textContent = String(meters);
    $("result-best").textContent = String(best);
    $("result-new").classList.toggle("on", isNew);
    $("result-tap").classList.remove("ready");
    tapLockedUntil = performance.now() + RESULT_LOCK_MS;
    window.setTimeout(() => $("result-tap").classList.add("ready"), RESULT_LOCK_MS);
    show("result");
  };

  const onTap = () => {
    switch (game.mode) {
      case "title":
        startGame();
        break;
      case "playing":
        game.jump();
        break;
      case "result":
        if (performance.now() >= tapLockedUntil) startGame();
        break;
    }
  };

  // 画面のどこをタップしても操作できる
  window.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      onTap();
    },
    { passive: false },
  );
  window.addEventListener("keydown", (e) => {
    if (e.repeat || !["Space", "Enter", "ArrowUp"].includes(e.code)) return;
    e.preventDefault();
    onTap();
  });
  window.addEventListener("contextmenu", (e) => e.preventDefault());

  let meterShown = -1;
  let last = performance.now();
  const loop = (now: number) => {
    game.frame((now - last) / 1000);
    last = now;
    if (game.mode === "playing" && game.meters !== meterShown) {
      meterShown = game.meters;
      $("hud-meter").textContent = String(meterShown);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  toTitle();
}

main().catch((err) => {
  console.error(err);
  $("loading").innerHTML = "<p>読み込みに失敗しました。再読み込みしてください。</p>";
});
