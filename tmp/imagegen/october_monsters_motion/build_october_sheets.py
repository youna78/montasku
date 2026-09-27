from pathlib import Path
import math
import statistics

import numpy as np
from PIL import Image, ImageChops, ImageDraw
from scipy.ndimage import label


ROOT = Path(__file__).resolve().parents[3]
MONSTER_DIR = ROOT / "public" / "img" / "monster"
OUTPUT_DIR = Path(__file__).resolve().parent
SOURCE_DIR = OUTPUT_DIR / "sources"
GIF_DIR = OUTPUT_DIR / "gifs"
GENERATED_DIR = Path("/Users/apple/.codex/generated_images/019deb05-ac39-7340-afc7-3eeffe1f0a17")
HEART_PATH = MONSTER_DIR / "480_F_772497713_6TvfnoFWIWBgfCYLVNUboLBoFd8Htkqk.png"
FRAME_SIZE = 1024


MONSTERS = {
    93: ("halloween_egg", "egg", "sway", "exec-6e9b60b5-3427-458d-bf0d-f71847e8adc0.png", "exec-fbc3ccac-2efe-4541-901c-f6c89835b791.png"),
    94: ("pumpkin_petit", "baby", "walk", "exec-45c0a9be-7f7d-4721-9134-167c75496fd5.png", "exec-82775dbe-6ba9-48ec-aad6-e08411b62031.png"),
    95: ("candy_ghost", "baby", "walk", "exec-77040aa2-50d6-446e-998a-2977d256c204.png", "exec-d8d3816a-64fd-4a2a-819c-54a61fac7659.png"),
    96: ("apprentice_witch_fairy", "child", "walk", "exec-a59529ca-3ca4-487e-8e7b-cc9bb9f3c173.png", "exec-84058cf4-dc4b-4f97-8c8d-bcccb9a3d983.png"),
    97: ("black_cloak_mini_beast", "child", "walk", "exec-00bde55c-fbb9-47bb-be04-9f34ea39af0c.png", "exec-4cd36ab3-7650-4ce7-825b-19de80a58986.png"),
    98: ("pumpkin_dragon", "child", "walk", "exec-6d9dd6ab-ed7a-41de-ac23-8ed94cb5eec4.png", "exec-49169c2b-9738-464d-a72b-d8562f3fc236.png"),
    99: ("candle_witch", "adult", "walk", "exec-1bf4d9db-c95e-4237-9291-50f227582d9c.png", "exec-16ab7522-fac8-4fb3-b93c-8fe412075989.png"),
    100: ("shadow_fang", "adult", "walk", "exec-d0c23bd7-fe1d-4981-aed6-7bfd03a32ac7.png", "exec-f3223e0e-5d10-4df7-ad26-be04af59af68.png"),
    101: ("lantern_wyvern", "adult", "walk", "exec-3e48c12e-9ae8-40f7-b61c-1c0ae9fa3184.png", "exec-4940a044-92a0-4242-a0d9-be6a16da1957.png"),
    102: ("mummy_man", "adult", "walk", "exec-7f46bac7-d73b-4ecf-8798-312201af2232.png", "exec-667003a9-3a90-43b4-9685-4b8d934f2bc3.png"),
    103: ("halloween_queen", "final", "walk", "exec-d0b037fe-e6d4-41a1-9c4d-ba102d249492.png", "exec-35fbdba6-283a-4b41-95cb-f3c5f32742f2.png"),
    104: ("midnight_behemoth", "final", "walk", "exec-209bb01f-42ab-4340-a88d-9da5207005de.png", "exec-9e47b389-9d87-43bc-966c-61ca7c8932fe.png"),
    105: ("hyakki_pumpkin_lord", "final", "walk", "exec-8e43becc-923a-4451-82e8-59c4c254c7c5.png", "exec-a6e000e8-28a0-4f2f-86c5-c58a0ae8eb06.png"),
    106: ("sandstorm_mummy_king", "final", "walk", "exec-97695c32-f1b6-4660-9f39-2dbe34d21401.png", "exec-72e6e680-6707-4ba3-90c4-6d524e979e50.png"),
}

STAGE_SCALE = {"egg": 1.0, "baby": 1.0, "child": 1.15, "adult": 1.30, "final": 1.30}


def origins(size: int = FRAME_SIZE):
    return ((0, 0), (size, 0), (0, size), (size, size))


def component_area(frame: Image.Image) -> int:
    labels, count = label(np.asarray(frame.getchannel("A")) > 8)
    if count == 0:
        return 0
    return int(np.bincount(labels.ravel())[1:].max())


def reference_area() -> float:
    areas = []
    for name in ("monster_renewal_02_pink_slime_walk_4f.png", "monster_renewal_02_pink_slime_happy_4f.png"):
        sheet = Image.open(MONSTER_DIR / name).convert("RGBA")
        for x, y in origins():
            areas.append(component_area(sheet.crop((x, y, x + FRAME_SIZE, y + FRAME_SIZE))))
    return statistics.median(areas)


def split_source(path: Path) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    half_w, half_h = sheet.width // 2, sheet.height // 2
    return [sheet.crop((x, y, x + half_w, y + half_h)) for x, y in origins(half_w)]


def alpha_bbox(frame: Image.Image):
    alpha = np.asarray(frame.getchannel("A"))
    ys, xs = np.where(alpha > 8)
    if not len(xs):
        raise ValueError("empty generated frame")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def normalize(frames: list[Image.Image], target_area: float, motion: str, stage: str) -> list[Image.Image]:
    areas = [component_area(frame) for frame in frames]
    scale = math.sqrt(target_area / statistics.median(areas))
    boxes = [alpha_bbox(frame) for frame in frames]
    max_w = max(box[2] - box[0] for box in boxes)
    max_h = max(box[3] - box[1] for box in boxes)
    scale = min(scale, 880 / max_w, 840 / max_h)

    if motion != "happy" or stage == "final":
        bottoms = (930, 930, 930, 930)
    else:
        bottoms = (930, 850, 760, 930)

    result = []
    for frame, box, bottom in zip(frames, boxes, bottoms):
        crop = frame.crop(box)
        width = max(1, round(crop.width * scale))
        height = max(1, round(crop.height * scale))
        crop = crop.resize((width, height), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(crop, ((FRAME_SIZE - width) // 2, bottom - height))
        result.append(canvas)
    return result


def add_heart(frame: Image.Image, heart: Image.Image) -> None:
    left, top, right, bottom = alpha_bbox(frame)
    candidates = [
        (right - heart.width // 2, max(24, top - heart.height + 30)),
        (right - heart.width + 22, top + 10),
        (left - heart.width + 30, top + 10),
    ]
    alpha = np.asarray(frame.getchannel("A"))
    heart_mask = np.asarray(heart.getchannel("A")) > 8
    valid = []
    for x, y in candidates:
        x = max(20, min(FRAME_SIZE - heart.width - 20, x))
        y = max(20, min(FRAME_SIZE - heart.height - 20, y))
        overlap = int((alpha[y:y + heart.height, x:x + heart.width][heart_mask] > 8).sum())
        distance = abs((x + heart.width / 2) - (right + left) / 2)
        valid.append((overlap, distance, x, y))
    _, _, x, y = min(valid)
    frame.alpha_composite(heart, (x, y))


def save_sheet(frames: list[Image.Image], path: Path) -> None:
    sheet = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
    for frame, (x, y) in zip(frames, origins()):
        sheet.alpha_composite(frame, (x, y))
    sheet.save(path)


def validate(path: Path) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    if sheet.size != (2048, 2048):
        raise ValueError(f"{path.name}: wrong size {sheet.size}")
    frames = [sheet.crop((x, y, x + FRAME_SIZE, y + FRAME_SIZE)) for x, y in origins()]
    for index, frame in enumerate(frames, 1):
        box = alpha_bbox(frame)
        if min(box[0], box[1], FRAME_SIZE - box[2], FRAME_SIZE - box[3]) < 10:
            raise ValueError(f"{path.name}: frame {index} touches edge {box}")
    if all(ImageChops.difference(frames[0], frame).getbbox() is None for frame in frames[1:]):
        raise ValueError(f"{path.name}: identical frames")
    return frames


def save_gif(path: Path, frames: list[Image.Image], duration: int) -> None:
    previews = []
    for frame in frames:
        preview = Image.new("RGBA", (480, 480), (0, 0, 0, 0))
        sprite = frame.copy()
        sprite.thumbnail((460, 460), Image.Resampling.NEAREST)
        preview.alpha_composite(sprite, ((480 - sprite.width) // 2, (480 - sprite.height) // 2))
        previews.append(preview)
    previews[0].save(path, save_all=True, append_images=previews[1:], duration=duration, loop=0, disposal=2, transparency=0)


def save_contact_sheet(paths: list[Path]) -> None:
    tile, label_h = 330, 34
    contact = Image.new("RGBA", (tile * 4, (tile + label_h) * 7), "#e8eef5")
    draw = ImageDraw.Draw(contact)
    for index, path in enumerate(paths):
        row, col = divmod(index, 4)
        image = Image.open(path).convert("RGBA")
        image.thumbnail((tile - 18, tile - 18), Image.Resampling.NEAREST)
        x = col * tile + (tile - image.width) // 2
        y = row * (tile + label_h) + (tile - image.height) // 2
        contact.alpha_composite(image, (x, y))
        draw.text((col * tile + 7, row * (tile + label_h) + tile + 7), path.stem, fill="#17212b")
    contact.save(OUTPUT_DIR / "october_motion_contact_sheet.png")


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    GIF_DIR.mkdir(parents=True, exist_ok=True)
    heart = Image.open(HEART_PATH).convert("RGBA")
    baseline = reference_area()
    outputs = []

    for monster_id, (slug, stage, travel_motion, travel_file, happy_file) in MONSTERS.items():
        for motion, source_name in ((travel_motion, travel_file), ("happy", happy_file)):
            source = GENERATED_DIR / source_name
            if not source.exists():
                raise FileNotFoundError(source)
            local_source = SOURCE_DIR / f"{monster_id}_{motion}_{source.name}"
            local_source.write_bytes(source.read_bytes())
            frames = split_source(source)
            target = baseline * STAGE_SCALE[stage] ** 2
            frames = normalize(frames, target, motion, stage)
            if motion == "happy":
                for frame in frames:
                    add_heart(frame, heart)
            path = MONSTER_DIR / f"monster_renewal_{monster_id}_{slug}_{motion}_4f.png"
            save_sheet(frames, path)
            checked = validate(path)
            duration = 850 if motion == "sway" else 750 if motion == "happy" else 650
            save_gif(GIF_DIR / f"{path.stem}.gif", checked, duration)
            outputs.append(path)

    save_contact_sheet(outputs)
    print(f"built and validated {len(outputs)} October sprite sheets; baseline area={baseline}")


if __name__ == "__main__":
    main()
