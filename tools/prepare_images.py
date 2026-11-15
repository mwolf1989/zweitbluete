# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10"]
# ///
"""Turn the generated source images in images/ into app assets.

- Plant images: 512 px PNG with real transparency in app/assets/plants/.
  Sources that came back with a baked-in checkerboard instead of an alpha
  channel get that background removed by flood fill from the image border.
- App icon and Android foreground: 1024 px in app/assets/.

    uv run tools/prepare_images.py
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter  # noqa: I001

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "images"
PLANTS = ROOT / "app" / "assets" / "plants"
ASSETS = ROOT / "app" / "assets"

PLANT_SIZE = 512
LIGHT_BACKGROUND = (243, 245, 240, 255)  # theme.background, light
ICON_SIZE = 1024

# Source file name -> asset name, where they differ.
RENAMED = {"progess-4.png": "progress-4.png"}

NOT_PLANTS = {"icon.png", "android-icon-foreground.png", "welcome.png"}


def has_real_alpha(image: Image.Image) -> bool:
    return image.mode == "RGBA" and image.getchannel("A").getextrema()[0] < 255


def remove_checkerboard(image: Image.Image) -> Image.Image:
    """Make the bright, colourless area connected to the border transparent."""
    rgb = image.convert("RGB")
    red, green, blue = rgb.split()
    brightest = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    darkest = ImageChops.darker(ImageChops.darker(red, green), blue)
    colourless = ImageChops.subtract(brightest, darkest).point(lambda value: 255 if value < 14 else 0)
    bright = darkest.point(lambda value: 255 if value > 195 else 0)
    candidate = ImageChops.multiply(colourless, bright)

    background, marker = 128, 255
    width, height = candidate.size
    border = [(x, y) for x in range(0, width, 4) for y in (0, height - 1)]
    border += [(x, y) for y in range(0, height, 4) for x in (0, width - 1)]
    for point in border:
        if candidate.getpixel(point) == marker:
            ImageDraw.floodfill(candidate, point, background)

    # Gaps between leaves are checkerboard too but do not touch the border.
    # Unlike white petals, about half of a checker patch is light grey.
    grey_squares = brightest.point(lambda value: 255 if value < 242 else 0)
    probing, kept = 200, 64
    for x in range(0, width, 5):
        for y in range(0, height, 5):
            if candidate.getpixel((x, y)) != marker:
                continue
            ImageDraw.floodfill(candidate, (x, y), probing)
            region = candidate.point(lambda value: 255 if value == probing else 0)
            area = region.histogram()[255]
            grey = ImageChops.multiply(region, grey_squares).histogram()[255]
            is_checker = area >= 150 and grey / area > 0.25
            candidate.paste(background if is_checker else kept, mask=region)

    alpha = candidate.point(lambda value: 0 if value == background else 255)
    # Pull the edge in by a pixel and soften it so no checker fringe remains.
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def fade_pale_background(image: Image.Image) -> Image.Image:
    """For a scene with a soft glow painted over a checkerboard: bright pixels
    become transparent in proportion to how colourless they are, so the
    checkerboard vanishes and the pale yellow glow stays as a soft tint."""
    rgb = image.convert("RGB")
    red, green, blue = rgb.split()
    brightest = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    darkest = ImageChops.darker(ImageChops.darker(red, green), blue)
    colour = ImageChops.subtract(brightest, darkest).point(lambda value: min(255, value * 5))
    solid = darkest.point(lambda value: 255 if value < 185 else 0)
    alpha = ImageChops.lighter(colour, solid).filter(ImageFilter.GaussianBlur(0.6))
    # Pale pixels carry the white of the checkerboard, which shows as grey haze
    # on a dark screen. Give them the glow colour and let alpha do the fading.
    result = rgb.convert("RGBA")
    glow = Image.new("RGBA", rgb.size, (255, 232, 150, 255))
    result.paste(glow, mask=ImageChops.invert(solid))
    result.putalpha(alpha)
    return result


def main() -> None:
    PLANTS.mkdir(parents=True, exist_ok=True)
    for path in sorted(SOURCE.glob("*.png")):
        if path.name in NOT_PLANTS:
            continue
        image = Image.open(path)
        note = ""
        if not has_real_alpha(image):
            image = remove_checkerboard(image)
            note = "  (checkerboard removed)"
        image = image.convert("RGBA").resize((PLANT_SIZE, PLANT_SIZE), Image.LANCZOS)
        name = RENAMED.get(path.name, path.name)
        image.save(PLANTS / name, optimize=True)
        print(f"{path.name} -> assets/plants/{name}{note}")

    icon = Image.open(SOURCE / "icon.png").convert("RGB").resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)
    icon.save(ASSETS / "icon.png", optimize=True)
    foreground = Image.open(SOURCE / "android-icon-foreground.png").convert("RGBA")
    foreground.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS).save(
        ASSETS / "android-icon-foreground.png", optimize=True
    )
    print("icon.png, android-icon-foreground.png -> assets/")

    welcome = Image.open(SOURCE / "welcome.png")
    if not has_real_alpha(welcome):
        welcome = fade_pale_background(welcome)
    # The soft glow does not survive on a dark screen, so the scene is flattened
    # onto the app's light background and shown as a card in dark mode.
    card = Image.new("RGBA", welcome.size, LIGHT_BACKGROUND)
    card.alpha_composite(welcome.convert("RGBA"))
    card.convert("RGB").resize((900, round(900 * card.height / card.width)), Image.LANCZOS).save(
        ASSETS / "welcome.png", optimize=True
    )
    print("welcome.png -> assets/")


main()
