from pathlib import Path
import shutil

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[3]
GENERATED = Path("/Users/apple/.codex/generated_images/019deb05-ac39-7340-afc7-3eeffe1f0a17")
OUTPUT_DIR = Path(__file__).resolve().parent

ASSETS = {
    GENERATED / "exec-d6a9b934-a3f9-4b71-844b-970719a943e6.png": ROOT / "public/img/background/bg_october_halloween_fair_01.png",
    GENERATED / "exec-f2e3d645-1249-4614-995b-4a53e5f4c955.png": ROOT / "public/img/background/bg_october_halloween_night_01.png",
    GENERATED / "exec-01e95ccd-f3e3-403c-889e-a98c9571b1ed.png": ROOT / "public/img/deco_frame/frame_october_pumpkin_01.png",
    GENERATED / "exec-bf222e11-7c6f-4855-9551-882f2a5e9931.png": ROOT / "public/img/deco_frame/frame_october_halloween_01.png",
    GENERATED / "exec-443f5426-af25-4b38-a6cb-272e6bcb2113.png": ROOT / "public/img/decoration/october_ghost_parade.png",
}


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for source, destination in ASSETS.items():
        image = Image.open(source)
        if destination.parent.name == "background":
            image = image.convert("RGB").resize((1920, 960), Image.Resampling.LANCZOS)
        else:
            image = image.convert("RGBA")
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination)

    egg_source = ROOT / "public/img/monster/monster_renewal_93_halloween_egg_01.png"
    egg_destination = ROOT / "public/img/monster/event_october_halloween_egg_01.png"
    shutil.copy2(egg_source, egg_destination)

    paths = [egg_destination, *ASSETS.values()]
    tile_w, tile_h, label_h = 480, 300, 34
    contact = Image.new("RGB", (tile_w * 2, (tile_h + label_h) * 3), "#dce6ef")
    draw = ImageDraw.Draw(contact)
    for index, path in enumerate(paths):
        row, col = divmod(index, 2)
        image = Image.open(path).convert("RGBA")
        image.thumbnail((tile_w - 24, tile_h - 24), Image.Resampling.LANCZOS)
        x = col * tile_w + (tile_w - image.width) // 2
        y = row * (tile_h + label_h) + (tile_h - image.height) // 2
        contact.paste(image, (x, y), image)
        draw.text((col * tile_w + 8, row * (tile_h + label_h) + tile_h + 8), path.name, fill="#15202b")
    contact.save(OUTPUT_DIR / "october_items_contact_sheet.png")

    for path in paths:
        image = Image.open(path)
        alpha = image.getchannel("A") if image.mode == "RGBA" else None
        if alpha is not None and alpha.getbbox() is None:
            raise ValueError(f"{path.name}: transparent asset is empty")
        print(f"{path.relative_to(ROOT)}: {image.size} {image.mode}")


if __name__ == "__main__":
    main()
