#!/usr/bin/env python3
"""assets-src/ の元画像からゲーム用アセットを public/assets/ に生成する。

- スプライトシート: 緑背景をクロマキーして透過 WebP (ロスレス) にする
- 背景: A→B→C→A の境目をクロスフェードで焼き込んだ 1280px 幅のストリップにする
使い方: python3 scripts/process_assets.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
OUT = ROOT / "public" / "assets"

SHEETS = ["char_run", "char_mud1", "char_mud2", "char_mud3", "char_cry", "puddle"]
BGS = ["bg_a", "bg_b", "bg_c"]
FADE = 96  # 背景の境目をなじませる幅(px)


def chroma_key(path: Path) -> Image.Image:
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    greenness = g - np.maximum(r, b)
    lo, hi = 25.0, 120.0
    alpha = np.clip(1.0 - (greenness - lo) / (hi - lo), 0.0, 1.0)
    # 縁に残る緑のにじみを抑える(despill)
    g = np.minimum(g, np.maximum(r, b) + 8.0 * alpha)
    out = np.dstack([r, g, b, alpha * 255.0]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def puddle_anchors(img: Image.Image, cols: int = 4, rows: int = 5) -> list[dict]:
    """水たまり各コマの接地基準点(本体の下端中央)を求める。コマごとに高さがずれているため。"""
    alpha = np.asarray(img)[..., 3] > 128
    cw, ch = img.width / cols, img.height / rows
    frames = []
    for r in range(rows):
        for c in range(cols):
            x0, y0 = round(c * cw), round(r * ch)
            x1, y1 = round((c + 1) * cw), round((r + 1) * ch)
            cell = alpha[y0:y1, x0:x1]
            body = np.where(cell.sum(axis=1) > 60)[0]  # 水しぶきの粒を除いた本体の行
            ys = np.where(cell.any(axis=1))[0]
            xs = np.where(cell[body.min() : body.max() + 1].any(axis=0))[0]
            frames.append(
                {
                    "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0,
                    "ax": round(float((xs.min() + xs.max()) / 2)),
                    "ay": int(body.max()),
                    "top": int(ys.min()),
                }
            )
    return frames


def smoothstep(t: np.ndarray) -> np.ndarray:
    return t * t * (3 - 2 * t)


def build_bg_strips() -> None:
    imgs = [np.asarray(Image.open(SRC / f"{n}.jpg").convert("RGB")).astype(np.float32) for n in BGS]
    for i, cur in enumerate(imgs):
        nxt = imgs[(i + 1) % len(imgs)]
        w = cur.shape[1]
        out = cur.copy()
        t = smoothstep((np.arange(FADE, dtype=np.float32) + 1) / FADE)[None, :, None]
        out[:, w - FADE :] = cur[:, w - FADE :] * (1 - t) + nxt[:, :FADE] * t
        strip = out[:, FADE:]  # 前の画像との境目に使われる左端は捨てる
        Image.fromarray(strip.clip(0, 255).astype(np.uint8)).save(
            OUT / f"bg{i}.webp", quality=88, method=6
        )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in SHEETS:
        img = chroma_key(SRC / f"{name}.jpg")
        img.save(OUT / f"{name}.webp", lossless=True, method=6)
        if name == "puddle":
            (OUT / "puddle.json").write_text(json.dumps(puddle_anchors(img)))
    build_bg_strips()
    print("done:", ", ".join(sorted(p.name for p in OUT.iterdir())))


if __name__ == "__main__":
    main()
