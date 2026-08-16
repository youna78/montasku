from collections import Counter
from pathlib import Path
import shutil

import numpy as np
from PIL import Image
from scipy.ndimage import binary_propagation, label


ROOT = Path(__file__).resolve().parents[3]
MOTION_DIR = Path(__file__).resolve().parent
MONSTER_DIR = ROOT / "public" / "img" / "monster"
BACKUP_DIR = MOTION_DIR / "pre_alpha_repair"
HEART_PATH = MONSTER_DIR / "480_F_772497713_6TvfnoFWIWBgfCYLVNUboLBoFd8Htkqk.png"
TARGET_SIZE = (2048, 2048)
KEY_TOLERANCE = 40


def output_name(source: Path) -> str:
    return source.name.replace("_revision_source", "")


def sample_key_color(image: Image.Image) -> tuple[int, int, int]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    border = []
    for x in range(width):
        border.append(pixels[x, 0])
        border.append(pixels[x, height - 1])
    for y in range(height):
        border.append(pixels[0, y])
        border.append(pixels[width - 1, y])
    return Counter(border).most_common(1)[0][0]


def remove_key_without_color_damage(source: Path) -> Image.Image:
    image = Image.open(source).convert("RGB")
    pixels = np.asarray(image).astype(np.int16)
    key = np.asarray(sample_key_color(image), dtype=np.int16)
    background = np.max(np.abs(pixels - key), axis=2) <= KEY_TOLERANCE
    red, green, blue = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2]
    magenta_candidate = (
        (red > 60)
        & (blue > 60)
        & (red > green * 1.4)
        & (blue > green * 1.2)
        & (np.abs(red - blue) < 120)
    )
    background = binary_propagation(background, mask=background | magenta_candidate)

    pixels[background] = 0
    alpha = np.where(background, 0, 255).astype(np.uint8)
    rgba = np.dstack((pixels.astype(np.uint8), alpha))
    result = Image.fromarray(rgba)
    return result.resize(TARGET_SIZE, Image.Resampling.NEAREST)


def add_exact_hearts(sheet: Image.Image, heart: Image.Image) -> None:
    for quadrant_x, quadrant_y in ((0, 0), (1024, 0), (0, 1024), (1024, 1024)):
        frame = sheet.crop((quadrant_x, quadrant_y, quadrant_x + 1024, quadrant_y + 1024))
        alpha = np.asarray(frame.getchannel("A"))
        components, count = label(alpha > 0)
        if count == 0:
            raise ValueError("empty happy frame")
        sizes = np.bincount(components.ravel())[1:]
        component = int(np.argmax(sizes)) + 1
        component_y, component_x = np.where(components == component)
        left, top, right = (
            int(component_x.min()),
            int(component_y.min()),
            int(component_x.max()) + 1,
        )

        def clamp(point: tuple[int, int]) -> tuple[int, int]:
            x, y = point
            return (
                max(20, min(1024 - heart.width - 20, x)),
                max(20, min(1024 - heart.height - 20, y)),
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
        heart_mask = np.asarray(heart.getchannel("A")) > 0
        x, y = min(
            candidates,
            key=lambda point: int(
                alpha[
                    point[1] : point[1] + heart.height,
                    point[0] : point[0] + heart.width,
                ][heart_mask].sum()
            ),
        )
        sheet.alpha_composite(heart, (quadrant_x + x, quadrant_y + y))


def clear_quadrant_edges(sheet: Image.Image, margin: int = 8) -> None:
    pixels = np.asarray(sheet).copy()
    for x, y in ((0, 0), (1024, 0), (0, 1024), (1024, 1024)):
        pixels[y : y + margin, x : x + 1024] = 0
        pixels[y + 1024 - margin : y + 1024, x : x + 1024] = 0
        pixels[y : y + 1024, x : x + margin] = 0
        pixels[y : y + 1024, x + 1024 - margin : x + 1024] = 0
    sheet.paste(Image.fromarray(pixels))


def main() -> None:
    sources = {
        output_name(path): path
        for path in MOTION_DIR.glob("monster_renewal_*_revision_source.png")
    }
    sources["monster_renewal_79_moon_viewing_egg_sway_4f.png"] = (
        MOTION_DIR / "monster_renewal_79_moon_viewing_egg_sway_4f_source.png"
    )
    sources["monster_renewal_83_mochi_tanuki_happy_4f.png"] = (
        MOTION_DIR / "monster_renewal_83_mochi_tanuki_happy_4f_alpha_fix_source.png"
    )
    sources["monster_renewal_92_moon_shadow_white_deer_happy_4f.png"] = (
        MOTION_DIR / "monster_renewal_92_moon_shadow_white_deer_happy_4f_alpha_fix_source.png"
    )

    if len(sources) != 28:
        raise ValueError(f"expected 28 September motion sources, found {len(sources)}")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    heart = Image.open(HEART_PATH).convert("RGBA")

    for name, source in sorted(sources.items()):
        destination = MONSTER_DIR / name
        backup = BACKUP_DIR / name
        if not backup.exists():
            shutil.copy2(destination, backup)

        sheet = remove_key_without_color_damage(source)
        clear_quadrant_edges(sheet)
        if "_happy_4f" in name:
            add_exact_hearts(sheet, heart)
        sheet.save(destination)

    print(f"repaired alpha for {len(sources)} September sprite sheets")


if __name__ == "__main__":
    main()
