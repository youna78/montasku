from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


OUTPUT_DIR = Path("/Users/apple/Projects/taskgame/tmp/ios_preview")
SOURCES = [
    Path("/Users/apple/Downloads/b321c48a-5ec3-449d-91b7-218c695039bd.png"),
    Path("/Users/apple/Downloads/3e23b737-2ebb-4f3a-b6ec-c178d4b32673.png"),
    Path("/Users/apple/Downloads/f0a7b298-80bc-4641-9c15-3358898c2844.png"),
]
TARGETS = {
    "iphone_1242x2688": (1242, 2688),
    "ipad_2064x2752": (2064, 2752),
}


def resize_cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def resize_contain(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    scale = min(size[0] / image.width, size[1] / image.height)
    return image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )


def build_preview(source: Path, target: tuple[int, int]) -> Image.Image:
    image = Image.open(source).convert("RGB")
    background = resize_cover(image, target)
    background = background.filter(ImageFilter.GaussianBlur(radius=36))
    background = ImageEnhance.Brightness(background).enhance(0.72)

    foreground = resize_contain(image, target)
    x = (target[0] - foreground.width) // 2
    y = (target[1] - foreground.height) // 2
    background.paste(foreground, (x, y))
    return background


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
for index, source in enumerate(SOURCES, start=1):
    for label, target in TARGETS.items():
        output = OUTPUT_DIR / f"ios_preview_{index:02d}_{label}.png"
        build_preview(source, target).save(output, optimize=True)
        print(f"{output.name}: {Image.open(output).size}")
