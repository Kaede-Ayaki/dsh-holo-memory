"""Generate dark, premium background assets for the dsh-holo-memory deck."""
from __future__ import annotations

import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent
W, H = 1920, 1080


def gradient(stops):
    """Vertical gradient from (position, (r,g,b)) stops."""
    ys = np.arange(H, dtype=np.float64)[:, None]
    positions = np.array([s[0] for s in stops], dtype=np.float64)
    colors = np.array([s[1] for s in stops], dtype=np.float64)
    channels = []
    for c in range(3):
        channels.append(np.interp(ys / (H - 1), positions, colors[:, c]))
    arr = np.concatenate(channels, axis=1)
    arr = np.repeat(arr[:, None, :], W, axis=1)
    return arr


def add_radial(img: np.ndarray, cx: float, cy: float, radius: float, color, strength: float):
    yy, xx = np.mgrid[0:H, 0:W]
    dist = np.sqrt((xx - cx * W) ** 2 + (yy - cy * H) ** 2) / (radius * W)
    falloff = np.clip(1.0 - dist, 0.0, 1.0) ** 2.2
    for c in range(3):
        img[:, :, c] += color[c] * falloff * strength
    return img


def base_image(stops, glows):
    img = gradient(stops)
    for g in glows:
        img = add_radial(img, *g)
    return np.clip(img, 0, 255)


def add_grid_and_particles(img: np.ndarray, dot_alpha=11, seed=7):
    random.seed(seed)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # dot grid
    step = 32
    for x in range(0, W + step, step):
        for y in range(0, H + step, step):
            r = 1.0 if (x // step + y // step) % 2 == 0 else 0.7
            d.ellipse((x - r, y - r, x + r, y + r), fill=(150, 170, 220, dot_alpha))
    # sparse bright particles
    for _ in range(70):
        x, y = random.randrange(W), random.randrange(H)
        rr = random.choice([1, 1, 1.5, 2])
        a = random.randint(18, 48)
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(120, 180, 255, a))
    layer = layer.filter(ImageFilter.GaussianBlur(0.35))
    out = Image.fromarray(np.uint8(img)).convert("RGBA")
    out = Image.alpha_composite(out, layer)
    return np.array(out.convert("RGB")).astype(np.float64)


def content_bg():
    img = base_image(
        [(0.0, (5, 8, 15)), (0.45, (8, 13, 27)), (1.0, (6, 10, 21))],
        [
            (0.84, -0.08, 0.55, (76, 106, 254), 0.22),
            (0.02, 1.05, 0.55, (120, 90, 255), 0.10),
        ],
    )
    img = add_grid_and_particles(img, dot_alpha=10)
    Image.fromarray(np.uint8(np.clip(img, 0, 255))).save(OUT / "bg-content.png", optimize=True)


def cover_bg():
    img = base_image(
        [(0.0, (4, 6, 12)), (0.55, (7, 12, 25)), (1.0, (5, 8, 18))],
        [
            (0.72, 0.18, 0.62, (70, 100, 255), 0.42),
            (0.12, 0.95, 0.55, (140, 92, 255), 0.16),
            (0.5, 0.55, 0.9, (40, 210, 230), 0.06),
        ],
    )
    img = add_grid_and_particles(img, dot_alpha=9, seed=11)
    base = Image.fromarray(np.uint8(np.clip(img, 0, 255))).convert("RGBA")

    # concentric rings + arcs on the right
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = int(W * 0.78), int(H * 0.46)
    for i, r in enumerate([230, 330, 440, 560]):
        a = 42 - i * 7
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(90, 130, 255, max(a, 8)), width=2)
    for i, r in enumerate([390, 520]):
        d.arc(
            (cx - r, cy - r, cx + r, cy + r),
            start=205 + i * 25,
            end=315 + i * 18,
            fill=(90, 225, 240, 90),
            width=3,
        )
    # a soft center glow disc
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((cx - 150, cy - 150, cx + 150, cy + 150), fill=(70, 110, 255, 34))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    layer = Image.alpha_composite(layer, glow)

    out = Image.alpha_composite(base, layer)
    out.convert("RGB").save(OUT / "bg-cover.png", optimize=True)


def section_bg():
    """A quieter variant for divider / closing slides."""
    img = base_image(
        [(0.0, (4, 6, 12)), (0.6, (7, 11, 24)), (1.0, (6, 9, 18))],
        [(0.5, 0.4, 0.7, (70, 100, 255), 0.18)],
    )
    img = add_grid_and_particles(img, dot_alpha=8, seed=3)
    Image.fromarray(np.uint8(np.clip(img, 0, 255))).save(OUT / "bg-section.png", optimize=True)


if __name__ == "__main__":
    content_bg()
    cover_bg()
    section_bg()
    for name in ("bg-content.png", "bg-cover.png", "bg-section.png"):
        p = OUT / name
        print(name, p.stat().st_size)
