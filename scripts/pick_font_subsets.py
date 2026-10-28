#!/usr/bin/env python3
"""UI で使う文字を含む Mochiy Pop One のサブセットだけを src/fonts/ にコピーし、src/fonts.css を生成する。

@fontsource のフォントは約 120 個の unicode-range 分割ファイルでできており、全部同梱すると重いので、
index.html の本文と src/ 配下のコードの文字列から必要なファイルだけを選ぶ。UI の文言を変えたら再実行すること。
使い方: npm i したうえで python3 scripts/pick_font_subsets.py
"""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PKG = ROOT / "node_modules" / "@fontsource" / "mochiy-pop-one"
OUT = ROOT / "src" / "fonts"


def used_codepoints() -> set[int]:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    text = re.sub(r"<!--.*?-->", "", html.split("<body>", 1)[1], flags=re.S)  # 画面に出る本文のみ
    for p in (ROOT / "src").rglob("*.ts"):
        code = p.read_text(encoding="utf-8")
        code = re.sub(r"/\*.*?\*/", "", code, flags=re.S)
        text += re.sub(r"(?m)^\s*//.*$|(?<=\s)//.*$", "", code)  # コメントは除く
    return {ord(c) for c in text if ord(c) > 0x7F} | set(range(0x20, 0x7F))


def parse_ranges(spec: str) -> list[tuple[int, int]]:
    out = []
    for part in spec.split(","):
        part = part.strip().removeprefix("U+")
        lo, _, hi = part.partition("-")
        out.append((int(lo, 16), int(hi or lo, 16)))
    return out


def main() -> None:
    css = (PKG / "index.css").read_text()
    blocks = re.findall(r"@font-face\s*\{(.*?)\}", css, re.S)
    need = used_codepoints()
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.woff2"):
        old.unlink()
    faces, covered = [], set()
    for b in blocks:
        woff2 = re.search(r"url\(\./files/([^)]+\.woff2)\)", b).group(1)
        ranges = parse_ranges(re.search(r"unicode-range:\s*([^;]+);", b).group(1))
        hit = {cp for cp in need if any(lo <= cp <= hi for lo, hi in ranges)}
        if not hit:
            continue
        covered |= hit
        shutil.copy(PKG / "files" / woff2, OUT / woff2)
        spec = ",".join(f"U+{lo:x}" + (f"-{hi:x}" if hi != lo else "") for lo, hi in ranges)
        faces.append(
            "@font-face {\n  font-family: 'Mochiy Pop One';\n  font-display: swap;\n  font-weight: 400;\n"
            f"  src: url(./fonts/{woff2}) format('woff2');\n  unicode-range: {spec};\n}}\n"
        )
    (ROOT / "src" / "fonts.css").write_text(
        "/* scripts/pick_font_subsets.py で生成 (Mochiy Pop One, SIL OFL) */\n" + "\n".join(faces)
    )
    missing = {chr(c) for c in need - covered}
    print(f"{len(faces)} subsets copied; chars not in font: {sorted(missing)}")


if __name__ == "__main__":
    main()
