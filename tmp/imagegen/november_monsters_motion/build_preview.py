from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[3]
MONSTER_DIR = ROOT / "public" / "img" / "monster"
OUTPUT_DIR = Path(__file__).resolve().parent
GIF_DIR = OUTPUT_DIR / "gifs"


MONSTERS = {
    107: ("november_egg", "sway"),
    108: ("momiji_pon", "walk"),
    109: ("yukemuri_petit", "walk"),
    110: ("oke_neko", "walk"),
    111: ("momiji_guide_fairy", "walk"),
    112: ("travel_mini_beast", "walk"),
    113: ("yukemuri_nekomata", "walk"),
    114: ("momiji_white_deer", "walk"),
    115: ("akikaze_tanuki_musha", "walk"),
    116: ("onsen_dragon", "walk"),
    117: ("yumori_neko_gami", "walk"),
    118: ("momiji_shinroku", "walk"),
    119: ("akiarashi_bakedanuki_oh", "walk"),
    120: ("yukemuri_ryujin", "walk"),
}


def sheet_path(monster_id: int, slug: str, motion: str) -> Path:
    return MONSTER_DIR / f"monster_renewal_{monster_id}_{slug}_{motion}_4f.png"


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
        if frame.getchannel("A").getbbox() is None:
            raise ValueError(f"{path.name}: frame {index} is empty")
    if all(ImageChops.difference(frames[0], frame).getbbox() is None for frame in frames[1:]):
        raise ValueError(f"{path.name}: all four frames are identical")


def save_gif(path: Path, frames: list[Image.Image], duration: int) -> None:
    rendered = []
    for frame in frames:
        frame.thumbnail((480, 480), Image.Resampling.NEAREST)
        preview = Image.new("RGBA", (480, 480), (0, 0, 0, 0))
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


def main() -> None:
    GIF_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    for monster_id, (slug, travel_motion) in MONSTERS.items():
        for motion in (travel_motion, "happy"):
            path = sheet_path(monster_id, slug, motion)
            frames = frames_from_sheet(path)
            validate_frames(path, frames)
            if monster_id >= 117:
                duration = 850
            else:
                duration = 800 if motion == "sway" else 700 if motion == "happy" else 600
            save_gif(GIF_DIR / f"{path.stem}.gif", frames, duration)
            count += 1
    print(f"validated and rendered {count} sprite sheets")


if __name__ == "__main__":
    main()
