from pathlib import Path
from collections import deque

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[3]
WORK = Path(__file__).resolve().parent
SOURCE_DIR = WORK / "left_sources"
GIF_PREVIEW_DIR = WORK / "left_gifs"
MONSTER_DIR = ROOT / "public/img/monster"

MONSTERS = [
    (108, "momiji_pon", "もみじポン"),
    (109, "yukemuri_petit", "湯けむりプチ"),
    (111, "momiji_guide_fairy", "紅葉バスガイドミニフェアリー"),
    (112, "travel_mini_beast", "旅するミニビースト"),
    (113, "yukemuri_nekomata", "湯けむり猫又"),
    (114, "momiji_white_deer", "紅葉ノ白鹿"),
    (115, "akikaze_tanuki_musha", "秋風タヌキ武者"),
    (116, "onsen_dragon", "温泉ドラゴン"),
    (117, "yumori_neko_gami", "湯守ノ猫神"),
    (118, "momiji_shinroku", "紅葉ノ神鹿"),
    (119, "akiarashi_bakedanuki_oh", "秋嵐ノ化狸王"),
    (120, "yukemuri_ryujin", "湯煙ノ龍神"),
]

FRAME_SIZE = 1024
RENDER_SIZE = 900
GROUND_LINE = 962
FRAME_DURATION_MS = 440


def split_frames(sheet: Image.Image) -> list[Image.Image]:
    if sheet.width % 2 or sheet.height % 2:
        raise ValueError(f"sheet must split evenly into 2x2 cells: {sheet.size}")
    cell_w, cell_h = sheet.width // 2, sheet.height // 2
    return [
        sheet.crop((0, 0, cell_w, cell_h)),
        sheet.crop((cell_w, 0, sheet.width, cell_h)),
        sheet.crop((0, cell_h, cell_w, sheet.height)),
        sheet.crop((cell_w, cell_h, sheet.width, sheet.height)),
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


def place_frame(source: Image.Image) -> Image.Image:
    rendered = source.resize((RENDER_SIZE, RENDER_SIZE), Image.Resampling.NEAREST)
    bbox = rendered.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("empty source frame")
    canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
    canvas.alpha_composite(rendered, ((FRAME_SIZE - RENDER_SIZE) // 2, GROUND_LINE - bbox[3]))
    return canvas


def validate(frames: list[Image.Image], stem: str) -> list[tuple[int, int, int, int]]:
    boxes = [frame.getchannel("A").getbbox() for frame in frames]
    if any(box is None for box in boxes):
        raise ValueError(f"{stem}: empty frame")
    if any(box[3] != GROUND_LINE for box in boxes if box is not None):
        raise ValueError(f"{stem}: inconsistent ground line {boxes}")
    if any(
        ImageChops.difference(frames[index], frames[(index + 1) % 4]).getbbox() is None
        for index in range(4)
    ):
        raise ValueError(f"{stem}: adjacent frames must differ")
    return boxes


def save_outputs(monster_id: int, slug: str, frames: list[Image.Image]) -> tuple[Path, Path]:
    stem = f"monster_renewal_{monster_id}_{slug}_walk_left_4f"
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
    preview_path = GIF_PREVIEW_DIR / gif_path.name
    preview_path.write_bytes(gif_path.read_bytes())
    return sheet_path, gif_path


def make_contact_sheet(gifs: list[tuple[str, Path]]) -> None:
    thumb = 256
    label_h = 38
    cols = 4
    rows = (len(gifs) + cols - 1) // cols
    contact = Image.new("RGBA", (cols * thumb, rows * (thumb + label_h)), "#18202a")
    draw = ImageDraw.Draw(contact)
    for index, (name, gif_path) in enumerate(gifs):
        frame = Image.open(gif_path).convert("RGBA").resize((thumb, thumb), Image.Resampling.NEAREST)
        x = (index % cols) * thumb
        y = (index // cols) * (thumb + label_h)
        contact.alpha_composite(frame, (x, y))
        draw.text((x + 8, y + thumb + 8), name, fill="white")
    contact.save(WORK / "november_left_walk_contact_sheet.png")


def main() -> None:
    GIF_PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    gifs: list[tuple[str, Path]] = []
    for monster_id, slug, name in MONSTERS:
        source_path = SOURCE_DIR / f"monster_renewal_{monster_id}_{slug}.png"
        source = Image.open(source_path).convert("RGBA")
        source_frames = split_frames(source)
        if monster_id == 113:
            source_frames = [keep_largest_component(frame) for frame in source_frames]
        frames = [place_frame(frame) for frame in source_frames]
        stem = f"monster_renewal_{monster_id}_{slug}"
        boxes = validate(frames, stem)
        sheet_path, gif_path = save_outputs(monster_id, slug, frames)
        gifs.append((f"{monster_id} {name}", gif_path))
        print(f"{monster_id}: sheet={sheet_path.name} gif={gif_path.name} boxes={boxes}")

    oke_gif = MONSTER_DIR / "monster_renewal_110_oke_neko_walk_left_4f.gif"
    (GIF_PREVIEW_DIR / oke_gif.name).write_bytes(oke_gif.read_bytes())
    gifs.insert(2, ("110 おけネコ", oke_gif))
    make_contact_sheet(gifs)
    print(f"duration_ms={FRAME_DURATION_MS}")
    print("order=top-left, top-right, bottom-left, bottom-right")


if __name__ == "__main__":
    main()
