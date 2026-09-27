from pathlib import Path

from PIL import Image


ROOT = Path("/Users/apple/Projects/taskgame/public/img/monster")
ASSETS = {
    93: ("monster_renewal_93_halloween_egg_01.png", 640),
    94: ("monster_renewal_94_pumpkin_petit_01.png", 580),
    95: ("monster_renewal_95_candy_ghost_01.png", 580),
    96: ("monster_renewal_96_apprentice_witch_fairy_01.png", 690),
    97: ("monster_renewal_97_black_cloak_mini_beast_01.png", 690),
    98: ("monster_renewal_98_pumpkin_dragon_01.png", 690),
    99: ("monster_renewal_99_candle_witch_01.png", 790),
    100: ("monster_renewal_100_shadow_fang_01.png", 790),
    101: ("monster_renewal_101_lantern_wyvern_01.png", 790),
    102: ("monster_renewal_102_mummy_man_01.png", 790),
    103: ("monster_renewal_103_halloween_queen_01.png", 850),
    104: ("monster_renewal_104_midnight_behemoth_01.png", 850),
    105: ("monster_renewal_105_hyakki_pumpkin_lord_01.png", 850),
    106: ("monster_renewal_106_sandstorm_mummy_king_01.png", 850),
}


for monster_id, (filename, target_extent) in ASSETS.items():
    path = ROOT / filename
    source = Image.open(path).convert("RGBA")
    solid_alpha = source.getchannel("A").point(lambda value: 255 if value >= 8 else 0)
    bbox = solid_alpha.getbbox()
    if bbox is None:
        raise RuntimeError(f"ID {monster_id} has no visible pixels")

    sprite = source.crop(bbox)
    scale = min(target_extent / sprite.width, target_extent / sprite.height)
    size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
    sprite = sprite.resize(size, Image.Resampling.NEAREST)

    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    x = (1024 - sprite.width) // 2
    y = (1024 - sprite.height) // 2
    canvas.alpha_composite(sprite, (x, y))
    canvas.save(path)

print(f"normalized={len(ASSETS)}")
