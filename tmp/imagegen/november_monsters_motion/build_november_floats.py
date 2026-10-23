from pathlib import Path
from collections import deque

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[3]
WORK = Path(__file__).resolve().parent
SOURCE_DIR = WORK / "float_sources"
PREVIEW_DIR = WORK / "left_gifs"
MONSTER_DIR = ROOT / "public/img/monster"

MONSTERS = [
    (109, "yukemuri_petit"),
    (116, "onsen_dragon"),
    (120, "yukemuri_ryujin"),
]

FRAME_SIZE = 1024
RENDER_SIZE = 900
BASELINE = 940
FRAME_DURATION_MS = 440


def split_frames(sheet: Image.Image) -> list[Image.Image]:
    if sheet.width % 2 or sheet.height % 2:
        raise ValueError(f"sheet must split evenly into 2x2 cells: {sheet.size}")
    width, height = sheet.width // 2, sheet.height // 2
    return [
        sheet.crop((0, 0, width, height)),
        sheet.crop((width, 0, sheet.width, height)),
        sheet.crop((0, height, width, sheet.height)),
        sheet.crop((width, height, sheet.width, sheet.height)),
    ]


def keep_largest_component(source: Image.Image) -> Image.Image:
    alpha = source.getchannel("A")
    alpha_data = alpha.tobytes()
    width, height = alpha.size
    pixels = alpha.load()
    visited = bytearray(width * height)
    largest: list[int] = []

    for y in range(height):
        for x in range(width):
            start = y * width + x
            if visited[start] or pixels[x, y] == 0:
                continue
            visited[start] = 1
            queue = deque([(x, y)])
            component: list[int] = []
            while queue:
                current_x, current_y = queue.popleft()
                component.append(current_y * width + current_x)
                for next_x, next_y in (
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x, current_y - 1),
                    (current_x, current_y + 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    index = next_y * width + next_x
                    if visited[index] or pixels[next_x, next_y] == 0:
                        continue
                    visited[index] = 1
                    queue.append((next_x, next_y))
            if len(component) > len(largest):
                largest = component

    mask_data = bytearray(width * height)
    for index in largest:
        mask_data[index] = alpha_data[index]
    cleaned = source.copy()
    cleaned.putalpha(Image.frombytes("L", (width, height), bytes(mask_data)))
    return cleaned


def place_frame(source: Image.Image, float_offset: int) -> Image.Image:
    rendered = source.resize((RENDER_SIZE, RENDER_SIZE), Image.Resampling.NEAREST)
    bbox = rendered.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("empty source frame")
    canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
    x = (FRAME_SIZE - RENDER_SIZE) // 2
    y = BASELINE - bbox[3] + float_offset
    canvas.alpha_composite(rendered, (x, y))
    return canvas


def main() -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    # Mid, rise, apex, return. Keep the movement calm and loopable.
    offsets = (0, -14, -28, -12)
    for monster_id, slug in MONSTERS:
        source_path = SOURCE_DIR / f"monster_renewal_{monster_id}_{slug}.png"
        source = Image.open(source_path).convert("RGBA")
        source_frames = [keep_largest_component(frame) for frame in split_frames(source)]
        frames = [place_frame(frame, offset) for frame, offset in zip(source_frames, offsets)]
        if any(
            ImageChops.difference(frames[index], frames[(index + 1) % 4]).getbbox() is None
            for index in range(4)
        ):
            raise ValueError(f"{monster_id}: adjacent frames must differ")

        stem = f"monster_renewal_{monster_id}_{slug}_float_4f"
        sheet_path = MONSTER_DIR / f"{stem}.png"
        gif_path = MONSTER_DIR / f"{stem}.gif"
        sheet = Image.new("RGBA", (FRAME_SIZE * 2, FRAME_SIZE * 2))
        for frame, position in zip(
            frames,
            ((0, 0), (FRAME_SIZE, 0), (0, FRAME_SIZE), (FRAME_SIZE, FRAME_SIZE)),
        ):
            sheet.alpha_composite(frame, position)
        sheet.save(sheet_path)

        previews = [frame.resize((512, 512), Image.Resampling.NEAREST) for frame in frames]
        previews[0].save(
            gif_path,
            save_all=True,
            append_images=previews[1:],
            duration=FRAME_DURATION_MS,
            loop=0,
            disposal=2,
            transparency=0,
        )
        (PREVIEW_DIR / gif_path.name).write_bytes(gif_path.read_bytes())
        print(f"{monster_id}: sheet={sheet_path} gif={gif_path}")

    print(f"duration_ms={FRAME_DURATION_MS}")
    print("order=top-left, top-right, bottom-left, bottom-right")


if __name__ == "__main__":
    main()
