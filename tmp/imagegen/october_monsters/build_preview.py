from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path("/Users/apple/Projects/taskgame")
MONSTER_DIR = ROOT / "public/img/monster"
OUT = ROOT / "tmp/imagegen/october_monsters/october_monsters_preview.png"
FILES = [
    (93, "Halloween Egg", "monster_renewal_93_halloween_egg_01.png"),
    (94, "Pumpkin Petit", "monster_renewal_94_pumpkin_petit_01.png"),
    (95, "Candy Ghost", "monster_renewal_95_candy_ghost_01.png"),
    (96, "Apprentice Witch Fairy", "monster_renewal_96_apprentice_witch_fairy_01.png"),
    (97, "Black Cloak Mini Beast", "monster_renewal_97_black_cloak_mini_beast_01.png"),
    (98, "Pumpkin Dragon", "monster_renewal_98_pumpkin_dragon_01.png"),
    (99, "Candle Witch", "monster_renewal_99_candle_witch_01.png"),
    (100, "Shadow Fang", "monster_renewal_100_shadow_fang_01.png"),
    (101, "Lantern Wyvern", "monster_renewal_101_lantern_wyvern_01.png"),
    (102, "Mummy Man", "monster_renewal_102_mummy_man_01.png"),
    (103, "Halloween Queen", "monster_renewal_103_halloween_queen_01.png"),
    (104, "Midnight Behemoth", "monster_renewal_104_midnight_behemoth_01.png"),
    (105, "Hyakki Pumpkin Lord", "monster_renewal_105_hyakki_pumpkin_lord_01.png"),
    (106, "Sandstorm Mummy King", "monster_renewal_106_sandstorm_mummy_king_01.png"),
]


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    board = Image.new("RGBA", size, "white")
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#e8e8e8")
    return board


font = ImageFont.load_default(size=16)
card_w, card_h = 320, 360
preview = Image.new("RGB", (card_w * 4, card_h * 4), "#fff9ef")
draw = ImageDraw.Draw(preview)
problems = []

for index, (monster_id, name, filename) in enumerate(FILES):
    path = MONSTER_DIR / filename
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((1023, 0)), alpha.getpixel((0, 1023)), alpha.getpixel((1023, 1023))]
    if image.size != (1024, 1024) or bbox is None or any(corners):
        problems.append((monster_id, image.size, bbox, corners))

    thumb = image.copy()
    thumb.thumbnail((280, 280), Image.Resampling.NEAREST)
    tile = checkerboard((280, 280))
    tile.alpha_composite(thumb, ((280 - thumb.width) // 2, (280 - thumb.height) // 2))

    x = (index % 4) * card_w
    y = (index // 4) * card_h
    preview.paste(tile.convert("RGB"), (x + 20, y + 16))
    draw.text((x + 20, y + 306), f"ID {monster_id}  {name}", font=font, fill="#2a1d18")
    draw.text((x + 20, y + 330), filename, font=font, fill="#72584c")

OUT.parent.mkdir(parents=True, exist_ok=True)
preview.save(OUT)
print(f"checked={len(FILES)} problems={problems}")
print(OUT)
