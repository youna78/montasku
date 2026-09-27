from pathlib import Path

from PIL import Image


ROOT = Path("/Users/apple/Projects/taskgame")
SOURCE = Path(
    "/Users/apple/.codex/generated_images/019deb05-ac39-7340-afc7-3eeffe1f0a17/"
    "exec-5b452d12-ef46-43f7-b415-cda9863fbd8c.png"
)
SPRITE = ROOT / "public/img/decoration/october_ghost_parade_sprite_01.png"
PREVIEW = ROOT / "tmp/imagegen/october_items/october_ghost_parade_preview.gif"


source = Image.open(SOURCE).convert("RGBA")
frame_size = source.height
frames = []
for index in range(3):
    frame = source.crop(
        (index * frame_size, 0, (index + 1) * frame_size, frame_size)
    )
    scaled = frame.resize((680, 680), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
    canvas.alpha_composite(scaled, ((frame_size - 680) // 2, (frame_size - 680) // 2))
    frames.append(canvas)

sheet = Image.new("RGBA", (frame_size * 3, frame_size), (0, 0, 0, 0))
for index, frame in enumerate(frames):
    sheet.alpha_composite(frame, (index * frame_size, 0))
sheet.save(SPRITE)

frames[0].save(
    PREVIEW,
    save_all=True,
    append_images=frames[1:],
    duration=360,
    loop=0,
    disposal=2,
    transparency=0,
)

print(f"sprite={sheet.size} mode={sheet.mode}")
for index, frame in enumerate(frames, start=1):
    print(f"frame_{index}_bbox={frame.getchannel('A').getbbox()}")
print(f"preview={PREVIEW}")
