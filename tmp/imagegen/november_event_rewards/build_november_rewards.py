from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path("/Users/apple/Projects/taskgame")
GENERATED = Path(
    "/Users/apple/.codex/generated_images/019deb05-ac39-7340-afc7-3eeffe1f0a17"
)

SOURCES = {
    "kyoto": GENERATED / "exec-a124e93e-dbce-4ae1-900b-f30d2c1c5cc6.png",
    "onsen": GENERATED / "exec-5c5a23df-910d-48de-8cf3-1c511683f52e.png",
    "maple_frame": GENERATED / "exec-915cb64e-3da7-45ee-ba1b-ffdd11a3bbab.png",
    "onsen_frame": GENERATED / "exec-9df5d075-e473-4c9b-b7ce-be14e864e8c3.png",
    "duck_sprite": GENERATED / "exec-405d69a5-5b23-4c38-9083-cd787d39cc6b.png",
}


def resize_pixel_art(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return image.resize(size, Image.Resampling.NEAREST)


def save_background(source: Path, target: Path) -> None:
    image = Image.open(source).convert("RGB")
    if image.width * 1 != image.height * 2:
        image = ImageOps.fit(
            image,
            (image.height * 2, image.height),
            method=Image.Resampling.NEAREST,
            centering=(0.5, 0.5),
        )
    resize_pixel_art(image, (1920, 960)).save(target, optimize=True)


def save_frame(source: Path, target: Path) -> None:
    image = Image.open(source).convert("RGBA")
    if image.size != (1536, 1024):
        image = ImageOps.fit(
            image,
            (1536, 1024),
            method=Image.Resampling.NEAREST,
            centering=(0.5, 0.5),
        )
    image.save(target, optimize=True)


def save_duck_assets(source: Path, static_target: Path, sprite_target: Path) -> None:
    sprite = Image.open(source).convert("RGBA")
    if sprite.size != (2172, 724):
        sprite = ImageOps.fit(
            sprite,
            (2172, 724),
            method=Image.Resampling.NEAREST,
            centering=(0.5, 0.5),
        )
    sprite.save(sprite_target, optimize=True)

    first_frame = sprite.crop((0, 0, 724, 724))
    static_canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    enlarged = resize_pixel_art(first_frame, (1024, 1024))
    static_canvas.alpha_composite(enlarged)
    static_canvas.save(static_target, optimize=True)


def main() -> None:
    background_dir = ROOT / "public/img/background"
    frame_dir = ROOT / "public/img/deco_frame"
    decoration_dir = ROOT / "public/img/decoration"
    for directory in (background_dir, frame_dir, decoration_dir):
        directory.mkdir(parents=True, exist_ok=True)

    save_background(
        SOURCES["kyoto"], background_dir / "bg_november_kyoto_koyo_01.png"
    )
    save_background(
        SOURCES["onsen"], background_dir / "bg_november_onsen_01.png"
    )
    save_frame(
        SOURCES["maple_frame"], frame_dir / "frame_november_maple_01.png"
    )
    save_frame(
        SOURCES["onsen_frame"], frame_dir / "frame_november_onsen_01.png"
    )
    save_duck_assets(
        SOURCES["duck_sprite"],
        decoration_dir / "deco_november_duck_parade_01.png",
        decoration_dir / "deco_november_duck_parade_sprite_01.png",
    )


if __name__ == "__main__":
    main()
