from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[3]
MONSTER_DIR = ROOT / "public" / "img" / "monster"
OUTPUT_DIR = Path(__file__).resolve().parent
GIF_DIR = OUTPUT_DIR / "gifs"
FRAME_SIZE = 1024


MONSTERS = {
    79: ("moon_viewing_egg", "sway"),
    80: ("susuki_mini_rabbit", "walk"),
    81: ("dango_maker_mini_rabbit", "walk"),
    82: ("moon_viewing_flying_squirrel", "walk"),
    83: ("mochi_tanuki", "walk"),
    84: ("star_gathering_fox", "walk"),
    85: ("moonlight_owl", "walk"),
    86: ("cloud_walking_baku", "walk"),
    87: ("galaxy_rabbit_engineer", "walk"),
    88: ("starry_sky_deer", "walk"),
    89: ("tsukuyomi_white_wolf", "walk"),
    90: ("dream_walking_baku", "walk"),
    91: ("galaxy_railway_conductor", "walk"),
    92: ("moon_shadow_white_deer", "walk"),
}


def sheet_path(monster_id: int, slug: str, motion: str) -> Path:
    return MONSTER_DIR / f"monster_renewal_{monster_id:02d}_{slug}_{motion}_4f.png"


def frames_from_sheet(path: Path) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"{path.name}: expected 2048x2048, got {sheet.size}")
    return [
        sheet.crop((0, 0, 1024, 1024)),
        sheet.crop((1024, 0, 2048, 1024)),
        sheet.crop((0, 1024, 1024, 2048)),
        sheet.crop((1024, 1024, 2048, 2048)),
    ]


def validate_frames(path: Path, frames: list[Image.Image]) -> None:
    for index, frame in enumerate(frames, start=1):
        alpha = frame.getchannel("A")
        bbox = alpha.getbbox()
        if bbox is None:
            raise ValueError(f"{path.name}: frame {index} is empty")
        if bbox[0] == 0 or bbox[1] == 0 or bbox[2] == FRAME_SIZE or bbox[3] == FRAME_SIZE:
            raise ValueError(f"{path.name}: frame {index} touches a frame edge: {bbox}")

    if all(ImageChops.difference(frames[0], frame).getbbox() is None for frame in frames[1:]):
        raise ValueError(f"{path.name}: all four frames are identical")


def save_gif(path: Path, frames: list[Image.Image], duration: int) -> None:
    rendered = []
    for frame in frames:
        preview = Image.new("RGBA", (480, 480), (0, 0, 0, 0))
        frame.thumbnail((460, 460), Image.Resampling.NEAREST)
        preview.alpha_composite(frame, ((480 - frame.width) // 2, (480 - frame.height) // 2))
        rendered.append(preview)

    rendered[0].save(
        path,
        save_all=True,
        append_images=rendered[1:],
        duration=duration,
        loop=0,
        disposal=2,
        transparency=0,
    )


def save_contact_sheet(paths: list[Path]) -> None:
    tile_size = 360
    label_height = 36
    sheet = Image.new("RGBA", (tile_size * 4, (tile_size + label_height) * 7), "#efe7d4")
    draw = ImageDraw.Draw(sheet)

    for index, path in enumerate(paths):
        row, column = divmod(index, 4)
        image = Image.open(path).convert("RGBA")
        image.thumbnail((tile_size - 16, tile_size - 16), Image.Resampling.NEAREST)
        x = column * tile_size + (tile_size - image.width) // 2
        y = row * (tile_size + label_height) + (tile_size - image.height) // 2
        sheet.alpha_composite(image, (x, y))
        draw.text((column * tile_size + 8, row * (tile_size + label_height) + tile_size + 6), path.stem, fill="#251d15")

    sheet.save(OUTPUT_DIR / "september_motion_contact_sheet.png")


def main() -> None:
    GIF_DIR.mkdir(parents=True, exist_ok=True)
    processed = []

    for monster_id, (slug, walk_motion) in MONSTERS.items():
        for motion in (walk_motion, "happy"):
            path = sheet_path(monster_id, slug, motion)
            frames = frames_from_sheet(path)
            validate_frames(path, frames)
            duration = 850 if motion == "sway" else 750 if motion == "happy" else 650
            save_gif(GIF_DIR / f"{path.stem}.gif", frames, duration)
            processed.append(path)

    save_contact_sheet(processed)
    print(f"validated and rendered {len(processed)} sprite sheets")


if __name__ == "__main__":
    main()
