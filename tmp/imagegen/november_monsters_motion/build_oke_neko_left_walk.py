from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(__file__).resolve().parent / "oke_neko_left_source_transparent.png"
SHEET_OUTPUT = ROOT / "public/img/monster/monster_renewal_110_oke_neko_walk_left_4f.png"
GIF_OUTPUT = ROOT / "public/img/monster/monster_renewal_110_oke_neko_walk_left_4f.gif"

SOURCE_CELL = 627
FRAME_SIZE = 1024
RENDER_SIZE = 900
GROUND_LINE = 962
FRAME_DURATION_MS = 440


def source_frames(sheet: Image.Image) -> list[Image.Image]:
    return [
        sheet.crop((0, 0, SOURCE_CELL, SOURCE_CELL)),
        sheet.crop((SOURCE_CELL, 0, SOURCE_CELL * 2, SOURCE_CELL)),
        sheet.crop((0, SOURCE_CELL, SOURCE_CELL, SOURCE_CELL * 2)),
        sheet.crop((SOURCE_CELL, SOURCE_CELL, SOURCE_CELL * 2, SOURCE_CELL * 2)),
    ]


def upper_body_anchor_x(rendered: Image.Image) -> float:
    # Anchor on the green iris. It is unchanged by the walk cycle and avoids
    # the moving arms, feet and tail affecting horizontal registration.
    pixels = rendered.load()
    total = weighted_x = 0
    for y in range(rendered.height):
        for x in range(rendered.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0 or green < 55 or green <= red + 8 or green <= blue + 8:
                continue
            value = alpha
            total += value
            weighted_x += x * value
    if total == 0:
        raise ValueError("upper-body anchor is empty")
    return weighted_x / total


def place_frame(rendered: Image.Image, target_anchor_x: float) -> Image.Image:
    # Every source quadrant uses the same fixed crop and scale. Only the vertical
    # offset is corrected so every planted foot meets the same ground line.
    bbox = rendered.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("empty source frame")
    canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
    x = round(target_anchor_x - upper_body_anchor_x(rendered))
    canvas.alpha_composite(rendered, (x, GROUND_LINE - bbox[3]))
    return canvas


def validate(frames: list[Image.Image]) -> None:
    boxes = [frame.getchannel("A").getbbox() for frame in frames]
    if any(box is None for box in boxes):
        raise ValueError("one or more frames are empty")
    if any(box[3] != GROUND_LINE for box in boxes if box is not None):
        raise ValueError(f"ground lines differ: {boxes}")
    if any(
        ImageChops.difference(frames[index], frames[(index + 1) % len(frames)]).getbbox() is None
        for index in range(len(frames))
    ):
        raise ValueError("adjacent frames must be different")


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    if source.size != (SOURCE_CELL * 2, SOURCE_CELL * 2):
        raise ValueError(f"unexpected source size: {source.size}")

    rendered = [
        frame.resize((RENDER_SIZE, RENDER_SIZE), Image.Resampling.NEAREST)
        for frame in source_frames(source)
    ]
    target_anchor_x = 62 + upper_body_anchor_x(rendered[0])
    frames = [place_frame(frame, target_anchor_x) for frame in rendered]
    validate(frames)

    sheet = Image.new("RGBA", (FRAME_SIZE * 2, FRAME_SIZE * 2))
    for frame, position in zip(
        frames,
        ((0, 0), (FRAME_SIZE, 0), (0, FRAME_SIZE), (FRAME_SIZE, FRAME_SIZE)),
    ):
        sheet.alpha_composite(frame, position)
    sheet.save(SHEET_OUTPUT)

    previews = [frame.resize((512, 512), Image.Resampling.NEAREST) for frame in frames]
    previews[0].save(
        GIF_OUTPUT,
        save_all=True,
        append_images=previews[1:],
        duration=FRAME_DURATION_MS,
        loop=0,
        disposal=2,
        transparency=0,
    )

    print(f"sheet={SHEET_OUTPUT}")
    print(f"gif={GIF_OUTPUT}")
    print(f"frame_size={FRAME_SIZE}x{FRAME_SIZE}")
    print("order=top-left, top-right, bottom-left, bottom-right")
    print(f"duration_ms={FRAME_DURATION_MS}")
    print(f"boxes={[frame.getchannel('A').getbbox() for frame in frames]}")


if __name__ == "__main__":
    main()
