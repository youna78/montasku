from pathlib import Path

from PIL import Image


ROOT = Path("/Users/apple/Projects/taskgame")
GENERATED = Path(
    "/Users/apple/.codex/generated_images/019deb05-ac39-7340-afc7-3eeffe1f0a17"
)
OUTPUT = ROOT / "public/img/illustration"


def strengthen_pixel_art(image: Image.Image, colors: int = 96) -> Image.Image:
    width, height = image.size
    reduced = image.resize(
        (max(1, width // 2), max(1, height // 2)),
        Image.Resampling.NEAREST,
    )
    reduced = reduced.quantize(
        colors=colors,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    ).convert("RGB")
    return reduced.resize((width, height), Image.Resampling.NEAREST)
def build_shop_banner() -> None:
    source = GENERATED / "exec-aa57d2b4-2a83-40d1-9782-67c24011b516.png"
    image = strengthen_pixel_art(Image.open(source).convert("RGB"))
    image.save(OUTPUT / "banner_november_koyo_onsenshop_01.png", optimize=True)


def build_event_icatch() -> None:
    source = GENERATED / "exec-524b9cdc-c216-4140-a2cb-8af61e214523.png"
    image = strengthen_pixel_art(Image.open(source).convert("RGB"))
    image.save(OUTPUT / "icatch_november_koyo_onsen_01.png", optimize=True)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    build_shop_banner()
    build_event_icatch()
