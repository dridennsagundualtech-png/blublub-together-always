"""
Draws the Android app icon and splash screen from the app's own pixel mascot, so the phone
app does not ship with Capacitor's placeholder logo.

Run from the project folder (needs Python with Pillow, and bun):

    bun -e 'import {SPRITES,PALETTES,OVERLAY_PALETTE} from "./src/components/pixel-critters.ts";
            console.log(JSON.stringify({rows:SPRITES.cat.love,palette:{...PALETTES.cat,...OVERLAY_PALETTE}}))' \
      | python3 scripts/phone/make-android-art.py

It overwrites the PNG files under android/app/src/main/res/. Change MASCOT in the command
above (e.g. SPRITES.penguin.wave / PALETTES.penguin) or the colours below to restyle it.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

RES = Path("android/app/src/main/res")
ICON_BACKGROUND = "#FFC8DD"  # the app's "pastel petal" pink (also set in ic_launcher_background.xml)
SPLASH_BACKGROUND = "#FFF7FB"  # the app's page background, so the splash blends into the app

# Android screen densities and how many real pixels one "dp" is on each.
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def mascot(scale: int) -> Image.Image:
    """The sprite with every art pixel drawn `scale` real pixels wide (hard edges)."""
    rows, palette = SPRITE["rows"], SPRITE["palette"]
    img = Image.new("RGBA", (len(rows[0]) * scale, len(rows) * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in palette:
                draw.rectangle([x * scale, y * scale, (x + 1) * scale - 1, (y + 1) * scale - 1], fill=palette[ch])
    return img


def centred(canvas: Image.Image, art: Image.Image) -> Image.Image:
    canvas.alpha_composite(art, ((canvas.width - art.width) // 2, (canvas.height - art.height) // 2))
    return canvas


def icons() -> None:
    for name, d in DENSITIES.items():
        folder = RES / f"mipmap-{name}"
        # Adaptive icon (Android 8+): a 108dp layer of which only the middle 66dp is always visible.
        # A launcher may cut that layer to a circle, so the square sprite is kept to 48dp: its
        # corners (the little heart sits in one) then stay inside the circle.
        layer = int(108 * d)
        scale = max(1, int(48 * d) // 24)
        centred(Image.new("RGBA", (layer, layer), (0, 0, 0, 0)), mascot(scale)).save(folder / "ic_launcher_foreground.png")

        # Older Android: ready-made square (rounded) and round icons, 48dp.
        size = int(48 * d)
        art = mascot(max(1, int(34 * d) // 24))
        big = size * 4  # draw the shape large, then shrink it, for smooth corners
        for file, radius in (("ic_launcher.png", 0.22), ("ic_launcher_round.png", 0.5)):
            mask = Image.new("L", (big, big), 0)
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * radius), fill=255)
            plate = Image.new("RGBA", (size, size), ICON_BACKGROUND)
            plate.putalpha(mask.resize((size, size), Image.LANCZOS))
            centred(plate, art).save(folder / file)


def splashes() -> None:
    for file in sorted(RES.glob("drawable*/splash.png")):
        w, h = Image.open(file).size
        scale = max(2, round(min(w, h) * 0.3 / 24))
        centred(Image.new("RGBA", (w, h), SPLASH_BACKGROUND), mascot(scale)).convert("RGB").save(file)


SPRITE = json.load(sys.stdin)
icons()
splashes()
print("icon and splash art written to", RES)
