from pathlib import Path

from PIL import Image


POSE_A = Path("/Users/apple/.codex/generated_images/019deb05-ac39-7340-afc7-3eeffe1f0a17/exec-04bd06f4-2717-4ecf-896b-5ba1b817e753.png")
POSE_B = Path("/Users/apple/.codex/generated_images/019deb05-ac39-7340-afc7-3eeffe1f0a17/exec-c84c0f8f-1ce3-44cd-b444-d6514a6634cd.png")
OUTPUT = Path(__file__).resolve().parent / "oke_neko_walk_fixed_preview.png"
GIF_OUTPUT = Path(__file__).resolve().parent / "oke_neko_walk_fixed_preview.gif"

CELL = 1024
UPPER_BODY_BOTTOM = 955


def fixed_body_opposite_step(body_pose: Image.Image, leg_pose: Image.Image) -> Image.Image:
    frame = leg_pose.copy()
    upper_body = body_pose.crop((0, 0, body_pose.width, UPPER_BODY_BOTTOM))
    frame.paste(Image.new("RGBA", upper_body.size), (0, 0))
    frame.alpha_composite(upper_body, (0, 0))
    return frame


def normalize(frame: Image.Image, y_offset: int = 0) -> Image.Image:
    bbox = frame.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("empty frame")
    sprite = frame.crop(bbox)
    sprite.thumbnail((880, 880), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (CELL, CELL))
    x = (CELL - sprite.width) // 2
    y = (CELL - sprite.height) // 2 + y_offset
    canvas.alpha_composite(sprite, (x, y))
    return canvas


def main() -> None:
    pose_a = Image.open(POSE_A).convert("RGBA")
    pose_b = fixed_body_opposite_step(pose_a, Image.open(POSE_B).convert("RGBA"))
    frames = [
        normalize(pose_a, 0),
        normalize(pose_b, -4),
        normalize(pose_a, -8),
        normalize(pose_b, -4),
    ]
    output = Image.new("RGBA", (CELL * 2, CELL * 2))
    for frame, position in zip(frames, ((0, 0), (CELL, 0), (0, CELL), (CELL, CELL))):
        output.alpha_composite(frame, position)
    output.save(OUTPUT)

    previews = [frame.resize((480, 480), Image.Resampling.NEAREST) for frame in frames]
    previews[0].save(
        GIF_OUTPUT,
        save_all=True,
        append_images=previews[1:],
        duration=480,
        loop=0,
        disposal=2,
        transparency=0,
    )
    print(OUTPUT)
    print(GIF_OUTPUT)


if __name__ == "__main__":
    main()
