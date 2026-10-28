"""Render the storefront icon (180x180 PNG) for the screenshot plugin."""
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 180
SCALE = 4
W = SIZE * SCALE

img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Rounded blue tile
d.rounded_rectangle((0, 0, W - 1, W - 1), radius=int(W * 0.22), fill=(43, 108, 176, 255))

# Camera body
body = (int(W * 0.16), int(W * 0.30), int(W * 0.84), int(W * 0.80))
d.rounded_rectangle(body, radius=int(W * 0.06), fill=(255, 255, 255, 255))

# Viewfinder hump
hump = (int(W * 0.33), int(W * 0.20), int(W * 0.55), int(W * 0.32))
d.rounded_rectangle(hump, radius=int(W * 0.03), fill=(255, 255, 255, 255))

# Lens: blue ring, white inner, blue pupil
cx, cy, r = W // 2, int(W * 0.57), int(W * 0.17)
d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(43, 108, 176, 255))
r2 = int(r * 0.62)
d.ellipse((cx - r2, cy - r2, cx + r2, cy + r2), fill=(255, 255, 255, 255))
r3 = int(r * 0.34)
d.ellipse((cx - r3, cy - r3, cx + r3, cy + r3), fill=(26, 79, 128, 255))

# Flash dot
fx, fy, fr = int(W * 0.76), int(W * 0.38), int(W * 0.03)
d.ellipse((fx - fr, fy - fr, fx + fr, fy + fr), fill=(255, 255, 255, 235))

out = Path(__file__).resolve().parent.parent / "assets" / "icon-180.png"
out.parent.mkdir(parents=True, exist_ok=True)
img.resize((SIZE, SIZE), Image.LANCZOS).save(out, "PNG")
print(out)
