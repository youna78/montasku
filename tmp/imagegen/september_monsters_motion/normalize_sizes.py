from pathlib import Path
import math
import shutil
import statistics

import numpy as np
from PIL import Image
from scipy.ndimage import label


ROOT = Path(__file__).resolve().parents[3]
MOTION_DIR = Path(__file__).resolve().parent
MONSTER_DIR = ROOT / "public" / "img" / "monster"
BACKUP_DIR = MOTION_DIR / "pre_size_normalization"
HEART_PATH = MONSTER_DIR / "480_F_772497713_6TvfnoFWIWBgfCYLVNUboLBoFd8Htkqk.png"
FRAME_SIZE = 1024


STAGES = {
    79: "egg",
    80: "baby",
    81: "baby",
    82: "child",
    83: "child",
    84: "child",
    85: "adult",
    86: "adult",
    87: "adult",
    88: "adult",
    89: "final",
    90: "final",
    91: "final",
    92: "final",
}

LINEAR_STAGE_SCALE = {
    "egg": 1.0,
    "baby": 1.0,
    "child": 1.15,
    "adult": 1.30,
    "final": 1.30,
}


def frame_origins() -> tuple[tuple[int, int], ...]:
    return ((0, 0), (1024, 0), (0, 1024), (1024, 1024))


def largest_component_area(frame: Image.Image) -> int:
    alpha = np.asarray(frame.getchannel("A")) > 0
    labels, count = label(alpha)
    if count == 0:
        return 0
    sizes = np.bincount(labels.ravel())[1:]
    return int(sizes.max())


def largest_component_bbox(frame: Image.Image) -> tuple[int, int, int, int]:
    alpha = np.asarray(frame.getchannel("A")) > 0
    labels, count = label(alpha)
    if count == 0:
        raise ValueError("empty sprite frame")
    sizes = np.bincount(labels.ravel())[1:]
    component = int(np.argmax(sizes)) + 1
    y, x = np.where(labels == component)
    return int(x.min()), int(y.min()), int(x.max()) + 1, int(y.max()) + 1


def reference_area() -> float:
    areas = []
    for name in (
        "monster_renewal_02_pink_slime_walk_4f.png",
        "monster_renewal_02_pink_slime_happy_4f.png",
    ):
        sheet = Image.open(MONSTER_DIR / name).convert("RGBA")
        for x, y in frame_origins():
            frame = sheet.crop((x, y, x + FRAME_SIZE, y + FRAME_SIZE))
            areas.append(largest_component_area(frame))
    return statistics.median(areas)


def remove_exact_heart(frame: Image.Image, heart: Image.Image) -> None:
    frame_pixels = np.asarray(frame).copy()
    components, count = label(frame_pixels[:, :, 3] > 0)
    best_component = None
    best_score = -1
    for component in range(1, count + 1):
        y, x = np.where(components == component)
        if not len(x):
            continue
        width = int(x.max() - x.min() + 1)
        height = int(y.max() - y.min() + 1)
        if width > 180 or height > 150:
            continue
        colors = frame_pixels[y, x, :3]
        red = int(((colors[:, 0] > 180) & (colors[:, 1] < 80) & (colors[:, 2] < 80)).sum())
        white = int((colors.min(axis=1) > 200).sum())
        black = int((colors.max(axis=1) < 60).sum())
        if red < 20 or white < 200 or black < 100:
            continue
        score = red + white + black
        if score > best_score:
            best_score = score
            best_component = component

    if best_component is None:
        raise ValueError("exact happy heart could not be located")
    frame_pixels[components == best_component] = 0
    frame.paste(Image.fromarray(frame_pixels))


def add_exact_heart(frame: Image.Image, heart: Image.Image) -> None:
    left, top, right, _ = largest_component_bbox(frame)

    def clamp(point: tuple[int, int]) -> tuple[int, int]:
        x, y = point
        return (
            max(20, min(FRAME_SIZE - heart.width - 20, x)),
            max(20, min(FRAME_SIZE - heart.height - 20, y)),
        )

    candidates = tuple(
        dict.fromkeys(
            clamp(point)
            for point in (
                (right - heart.width // 2, top - heart.height + 24),
                (right - heart.width + 12, top - heart.height - 8),
                (right + 12, top + 8),
                (left - heart.width - 12, top + 8),
            )
        )
    )
    alpha = np.asarray(frame.getchannel("A"))
    heart_mask = np.asarray(heart.getchannel("A")) > 0
    x, y = min(
        candidates,
        key=lambda point: int(
            alpha[point[1] : point[1] + heart.height, point[0] : point[0] + heart.width][
                heart_mask
            ].sum()
        ),
    )
    frame.alpha_composite(heart, (x, y))


def content_bbox(frame: Image.Image) -> tuple[int, int, int, int]:
    bbox = frame.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("empty sprite frame")
    return bbox


def normalized_frames(
    frames: list[Image.Image],
    target_area: float,
    motion: str,
    monster_id: int,
) -> list[Image.Image]:
    areas = [largest_component_area(frame) for frame in frames]
    scale = math.sqrt(target_area / statistics.median(areas))

    bboxes = [content_bbox(frame) for frame in frames]
    max_width = max(bbox[2] - bbox[0] for bbox in bboxes)
    max_height = max(bbox[3] - bbox[1] for bbox in bboxes)
    scale = min(scale, 900 / max_width, 850 / max_height)

    if motion in ("walk", "sway"):
        bottoms = (930, 930, 930, 930)
    elif monster_id >= 89:
        bottoms = (930, 930, 930, 930)
    else:
        bottoms = (930, 930, 800, 930)

    results = []
    for frame, bbox, bottom in zip(frames, bboxes, bottoms):
        content = frame.crop(bbox)
        width = max(1, round(content.width * scale))
        height = max(1, round(content.height * scale))
        content = content.resize((width, height), Image.Resampling.NEAREST)

        result = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        x = (FRAME_SIZE - width) // 2
        y = bottom - height
        result.alpha_composite(content, (x, y))
        results.append(result)
    return results


def main() -> None:
    baseline_area = reference_area()
    heart = Image.open(HEART_PATH).convert("RGBA")
    files = []
    for path in sorted(MONSTER_DIR.glob("monster_renewal_*_*_4f.png")):
        try:
            monster_id = int(path.name.split("_")[2])
        except (IndexError, ValueError):
            continue
        if monster_id in STAGES:
            files.append((path, monster_id))

    if len(files) != 28:
        raise ValueError(f"expected 28 September motion sheets, found {len(files)}")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    for path, monster_id in files:
        backup = BACKUP_DIR / path.name
        if not backup.exists():
            shutil.copy2(path, backup)

        sheet = Image.open(path).convert("RGBA")
        frames = [
            sheet.crop((x, y, x + FRAME_SIZE, y + FRAME_SIZE))
            for x, y in frame_origins()
        ]
        is_happy = "_happy_4f" in path.name
        if is_happy:
            for frame in frames:
                remove_exact_heart(frame, heart)

        motion = "happy" if is_happy else "sway" if "_sway_4f" in path.name else "walk"
        stage_scale = LINEAR_STAGE_SCALE[STAGES[monster_id]]
        target_area = baseline_area * stage_scale * stage_scale
        frames = normalized_frames(frames, target_area, motion, monster_id)

        if is_happy:
            for frame in frames:
                add_exact_heart(frame, heart)

        output = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
        for frame, (x, y) in zip(frames, frame_origins()):
            output.alpha_composite(frame, (x, y))
        output.save(path)

    print(f"normalized {len(files)} September sprite sheets from baby area {baseline_area}")


if __name__ == "__main__":
    main()
