#!/usr/bin/env python3
"""Pack a generated 2x2 walk sheet using the Game Studio normalization pipeline."""
import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--work-dir", type=Path, required=True)
    parser.add_argument("--skill-scripts", type=Path, required=True)
    parser.add_argument("--content-size", type=int, required=True)
    args = parser.parse_args()
    if not 1 <= args.content_size <= 224:
        parser.error("Content must fit within a 256px cell with a transparent margin.")
    args.work_dir.mkdir(parents=True, exist_ok=True)

    raw = Image.open(args.input).convert("RGBA")
    if raw.getchannel("A").getextrema()[0] != 0:
        raise ValueError("The generated sheet does not have transparent background pixels.")
    if raw.width != raw.height or raw.width % 2:
        raise ValueError("Expected a square 2x2 sheet with even dimensions.")
    cell_size = raw.width // 2
    strip = Image.new("RGBA", (cell_size * 4, cell_size))
    for index in range(4):
        left, top = (index % 2) * cell_size, (index // 2) * cell_size
        frame = raw.crop((left, top, left + cell_size, top + cell_size))
        bounds = frame.getchannel("A").point(lambda alpha: 255 if alpha > 8 else 0).getbbox()
        if not bounds or min(bounds[:2]) <= 1 or max(bounds[2:]) >= cell_size - 1:
            raise ValueError(f"Frame {index + 1} is empty or touches its cell edge; inspect the generated art.")
        strip.alpha_composite(frame, (index * cell_size, 0))
    strip_path = args.work_dir / "strip.png"
    strip.save(strip_path)

    normalized_dir = args.work_dir / "normalized"
    subprocess.run([
        "python3", str(args.skill_scripts / "normalize_sprite_strip.py"),
        "--input", str(strip_path), "--out-dir", str(normalized_dir),
        "--frames", "4", "--frame-size", str(args.content_size)
    ], check=True)

    packed_dir = args.work_dir / "frames"
    packed_dir.mkdir(exist_ok=True)
    sheet = Image.new("RGBA", (512, 512))
    frames = []
    for index in range(4):
        content = Image.open(normalized_dir / f"{index + 1:02d}.png").convert("RGBA")
        frame = Image.new("RGBA", (256, 256))
        frame.alpha_composite(content, ((256 - args.content_size) // 2, 240 - args.content_size))
        frame.save(packed_dir / f"{index + 1:02d}.png")
        sheet.alpha_composite(frame, ((index % 2) * 256, (index // 2) * 256))
        frames.append(frame)
    unique_frames = len({frame.tobytes() for frame in frames})
    if unique_frames < 3:
        raise ValueError("Fewer than three distinct poses; inspect the gait before adoption.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)
    frames[0].save(args.work_dir / "walk.gif", save_all=True, append_images=frames[1:], duration=400, loop=0, disposal=2)
    subprocess.run([
        "python3", str(args.skill_scripts / "render_sprite_preview_sheet.py"),
        "--frames-dir", str(packed_dir), "--out", str(args.work_dir / "preview.png"), "--columns", "4"
    ], check=True)
    report = {"output": str(args.output), "sheet": [512, 512], "frames": 4,
              "uniqueFrames": unique_frames, "contentSize": args.content_size,
              "baseline": 240, "alphaRange": sheet.getchannel("A").getextrema()}
    (args.work_dir / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
