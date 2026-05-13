from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "img" / "social" / "x"

BRANDING = ROOT / "public" / "img" / "branding"
DOWNLOADS = Path("/Users/apple/Downloads")

ICATCH = BRANDING / "icatchi.png"
APP_ICON = BRANDING / "appicon512_512.png"
LOGO = BRANDING / "logo_title_main_01.png"
IPHONE = [
    DOWNLOADS / "iphone1.png",
    DOWNLOADS / "iphone2.png",
    DOWNLOADS / "iphone3.png",
    DOWNLOADS / "iphone4.png",
]
MONSTER_GROWTH = DOWNLOADS / "monster.png"

FONT_BOLD = Path("/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc")
FONT_HEAVY = Path("/System/Library/Fonts/ヒラギノ角ゴシック W9.ttc")
FONT_REGULAR = Path("/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc")


def font(size: int, heavy: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_HEAVY if heavy else FONT_BOLD), size)


def open_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def cover(img: Image.Image, size: tuple[int, int], focus: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    w, h = img.size
    tw, th = size
    scale = max(tw / w, th / h)
    nw, nh = round(w * scale), round(h * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    fx, fy = focus
    left = min(max(0, round((nw - tw) * fx)), nw - tw)
    top = min(max(0, round((nh - th) * fy)), nh - th)
    return resized.crop((left, top, left + tw, top + th))


def contain(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    w, h = img.size
    tw, th = size
    scale = min(tw / w, th / h)
    return img.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def paste_round(base: Image.Image, img: Image.Image, xy: tuple[int, int], radius: int) -> None:
    mask = rounded_mask(img.size, radius)
    base.paste(img, xy, mask)


def draw_text(
    d: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    size: int,
    fill: str = "#2a1709",
    heavy: bool = False,
    stroke: int = 0,
    stroke_fill: str = "#ffffff",
    anchor: str | None = None,
) -> None:
    d.text(xy, text, font=font(size, heavy), fill=fill, stroke_width=stroke, stroke_fill=stroke_fill, anchor=anchor)


def wrapped_lines(text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        trial = current + char
        if ImageDraw.Draw(Image.new("RGB", (1, 1))).textbbox((0, 0), trial, font=fnt)[2] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    d: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    size: int,
    max_width: int,
    fill: str = "#2a1709",
    line_gap: int = 12,
    heavy: bool = False,
    stroke: int = 0,
    stroke_fill: str = "#ffffff",
) -> int:
    fnt = font(size, heavy)
    y = xy[1]
    for line in wrapped_lines(text, fnt, max_width):
        d.text((xy[0], y), line, font=fnt, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)
        y += size + line_gap
    return y


def panel(base: Image.Image, box: tuple[int, int, int, int], fill: str = "#fff8e8", outline: str = "#a66b20") -> None:
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(box, radius=26, fill=fill, outline=outline, width=6)
    x1, y1, x2, y2 = box
    d.rounded_rectangle((x1 + 8, y1 + 8, x2 - 8, y2 - 8), radius=20, outline="#f3c35d", width=3)


def badge(d: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fill: str = "#1b91d8") -> None:
    x, y = xy
    fnt = font(30, True)
    bbox = d.textbbox((0, 0), text, font=fnt)
    w = bbox[2] - bbox[0] + 40
    h = 54
    d.rounded_rectangle((x, y, x + w, y + h), radius=18, fill=fill, outline="#ffffff", width=3)
    d.text((x + w // 2, y + h // 2 + 1), text, font=fnt, fill="#ffffff", anchor="mm")


def base_card(bg_focus: tuple[float, float] = (0.5, 0.45), darken: float = 0.84) -> Image.Image:
    bg = cover(open_rgba(ICATCH), (1200, 675), bg_focus)
    bg = ImageEnhance.Color(bg).enhance(1.05)
    overlay = Image.new("RGBA", bg.size, (255, 248, 224, int(255 * (1 - darken))))
    bg = Image.alpha_composite(bg, overlay)
    shade = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    ImageDraw.Draw(shade).rectangle((0, 0, 1200, 675), fill=(255, 255, 255, 88))
    return Image.alpha_composite(bg, shade)


def add_logo(base: Image.Image, xy: tuple[int, int], width: int) -> None:
    logo = contain(open_rgba(LOGO), (width, 9999))
    base.alpha_composite(logo, xy)


def add_app_icon(base: Image.Image, xy: tuple[int, int], size: int) -> None:
    icon = open_rgba(APP_ICON).resize((size, size), Image.Resampling.LANCZOS)
    base.alpha_composite(icon, xy)


def create_header() -> Path:
    img = cover(open_rgba(ICATCH), (1500, 500), (0.48, 0.34))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 1500, 500), outline="#d9982a", width=10)
    d.rectangle((16, 16, 1484, 484), outline="#fff0a8", width=3)
    d.rounded_rectangle((34, 346, 930, 462), radius=20, fill=(72, 37, 12, 222), outline="#f4d079", width=4)
    draw_text(d, (70, 368), "タスクが進むほど、モンスターも育つ。", 46, "#ffffff", True, 2, "#4a250a")
    draw_text(d, (72, 428), "Web版 / App Storeで配信中", 24, "#ffe89c", True)
    out = OUT / "x_header_1500x500.png"
    img.convert("RGB").save(out, quality=95)
    return out


def create_icon() -> Path:
    icon = open_rgba(APP_ICON).resize((512, 512), Image.Resampling.LANCZOS)
    out = OUT / "x_icon_512.png"
    icon.save(out)
    return out


def create_fixed_post() -> Path:
    img = base_card((0.5, 0.35), 0.72)
    d = ImageDraw.Draw(img)
    panel(img, (54, 54, 1146, 621), "#fff7e5")
    add_app_icon(img, (86, 86), 130)
    add_logo(img, (238, 70), 430)
    badge(d, (86, 244), "固定投稿")
    draw_text(d, (86, 320), "タスクが進むほど、", 56, "#3a1b08", True)
    draw_text(d, (86, 392), "モンスターも育つ。", 68, "#e45a16", True, 3, "#ffffff")
    draw_wrapped(d, (86, 492), "毎日の小さな達成をゲームみたいに楽しめるタスク管理アプリです。", 34, 620, "#2a1709", 10, True)
    phone = cover(open_rgba(IPHONE[0]), (258, 540), (0.5, 0.18))
    phone = ImageEnhance.Contrast(phone).enhance(1.04)
    paste_round(img, phone, (824, 80), 38)
    d.rounded_rectangle((812, 68, 1094, 632), radius=48, outline="#5b3512", width=8)
    out = OUT / "post_01_fixed_overview_1200x675.png"
    img.convert("RGB").save(out, quality=95)
    return out


def create_welcome_post() -> Path:
    img = base_card((0.55, 0.35), 0.8)
    d = ImageDraw.Draw(img)
    panel(img, (64, 72, 1136, 603), "#fff9ed")
    add_logo(img, (96, 88), 520)
    badge(d, (96, 320), "はじめまして")
    draw_text(d, (96, 394), "モンタスク公式です", 58, "#3a1b08", True)
    draw_wrapped(d, (96, 478), "案内役のミニフェアリーと一緒に、小さな達成をEXPにしていこう。", 36, 620, "#2a1709", 12, True)
    fairy = cover(open_rgba(ICATCH), (380, 500), (0.88, 0.42))
    paste_round(img, fairy, (716, 98), 28)
    out = OUT / "post_02_welcome_1200x675.png"
    img.convert("RGB").save(out, quality=95)
    return out


def create_howto_post() -> Path:
    img = base_card((0.42, 0.40), 0.78)
    d = ImageDraw.Draw(img)
    panel(img, (44, 42, 1156, 633), "#fff7e5")
    draw_text(d, (84, 78), "タスク達成で", 58, "#3a1b08", True)
    draw_text(d, (84, 150), "EXPがたまる", 74, "#e45a16", True, 3, "#ffffff")
    draw_wrapped(d, (84, 258), "小さなタスクでもOK。達成するほど、モンスターが少しずつ育ちます。", 34, 470, "#2a1709", 10, True)
    for i, path in enumerate(IPHONE[:3]):
        crop = cover(open_rgba(path), (180, 390), (0.5, 0.22))
        x = 600 + i * 178
        paste_round(img, crop, (x, 128), 26)
        d.rounded_rectangle((x - 8, 120, x + 188, 526), radius=34, outline="#5b3512", width=6)
    out = OUT / "post_03_howto_exp_1200x675.png"
    img.convert("RGB").save(out, quality=95)
    return out


def create_miniquest_post() -> Path:
    img = base_card((0.47, 0.45), 0.78)
    d = ImageDraw.Draw(img)
    panel(img, (78, 58, 1122, 617), "#fff9ed")
    badge(d, (118, 96), "今日のミニクエスト")
    draw_text(d, (118, 178), "1つだけでEXP", 72, "#e45a16", True, 3, "#ffffff")
    quests = ["机の上のものを1つ戻す", "水を飲む", "通知を1つ片付ける"]
    y = 314
    for q in quests:
        d.rounded_rectangle((128, y - 10, 792, y + 58), radius=22, fill="#fff0c2", outline="#c38323", width=4)
        d.ellipse((148, y + 2, 194, y + 48), fill="#39b96d", outline="#1f7842", width=3)
        d.line((160, y + 28, 171, y + 39, 188, y + 13), fill="#ffffff", width=7, joint="curve")
        draw_text(d, (218, y + 6), q, 34, "#2a1709", True)
        y += 88
    add_app_icon(img, (860, 130), 170)
    draw_text(d, (840, 336), "全部じゃなくてOK。", 31, "#2a1709", True)
    draw_text(d, (840, 386), "できたら、", 31, "#2a1709", True)
    draw_text(d, (840, 436), "ちゃんと達成だよ。", 31, "#2a1709", True)
    out = OUT / "post_04_miniquest_1200x675.png"
    img.convert("RGB").save(out, quality=95)
    return out


def create_monster_intro_post() -> Path:
    img = base_card((0.5, 0.43), 0.82)
    d = ImageDraw.Draw(img)
    panel(img, (58, 58, 1142, 617), "#fff8e8")
    badge(d, (94, 96), "モンスター紹介")
    draw_text(d, (94, 178), "ミニフェアリー", 70, "#3a1b08", True)
    draw_wrapped(d, (94, 292), "小さな羽を持つ案内役。トレーナーさんの頑張りを見つけるのが得意です。", 36, 560, "#2a1709", 12, True)
    phone = cover(open_rgba(IPHONE[2]), (320, 520), (0.5, 0.12))
    paste_round(img, phone, (760, 82), 36)
    d.rounded_rectangle((748, 70, 1092, 614), radius=46, outline="#5b3512", width=8)
    out = OUT / "post_05_monster_intro_1200x675.png"
    img.convert("RGB").save(out, quality=95)
    return out


def create_event_post() -> Path:
    img = base_card((0.45, 0.45), 0.78)
    d = ImageDraw.Draw(img)
    panel(img, (54, 54, 1146, 621), "#fff6e6")
    badge(d, (92, 96), "イベント")
    draw_text(d, (92, 182), "スプリングイースター", 60, "#e45a8b", True, 3, "#ffffff")
    draw_text(d, (92, 266), "開催中", 80, "#3a1b08", True)
    draw_wrapped(d, (92, 386), "タスクを達成して、限定モンスターやアイテムを集めよう。", 36, 560, "#2a1709", 12, True)
    phone = cover(open_rgba(IPHONE[3]), (360, 520), (0.5, 0.10))
    paste_round(img, phone, (726, 82), 34)
    d.rounded_rectangle((714, 70, 1098, 614), radius=46, outline="#5b3512", width=8)
    out = OUT / "post_06_event_1200x675.png"
    img.convert("RGB").save(out, quality=95)
    return out


def create_growth_post() -> Path:
    img = Image.new("RGBA", (1200, 675), "#fffaf0")
    d = ImageDraw.Draw(img)
    bg = cover(open_rgba(ICATCH), (1200, 675), (0.48, 0.42)).filter(ImageFilter.GaussianBlur(3))
    bg = ImageEnhance.Brightness(bg).enhance(1.08)
    img = Image.alpha_composite(bg, Image.new("RGBA", (1200, 675), (255, 250, 240, 172)))
    d = ImageDraw.Draw(img)
    panel(img, (54, 54, 1146, 621), "#fffaf0")
    growth = contain(open_rgba(MONSTER_GROWTH), (760, 430))
    img.alpha_composite(growth, ((1200 - growth.width) // 2, 166))
    draw_text(d, (600, 100), "達成するほど、育っていく", 56, "#3a1b08", True, 2, "#ffffff", "mm")
    draw_text(d, (600, 578), "小さなタスクも、ちゃんとEXP。", 38, "#e45a16", True, 2, "#ffffff", "mm")
    out = OUT / "post_07_growth_1200x675.png"
    img.convert("RGB").save(out, quality=95)
    return out


def create_all() -> list[Path]:
    OUT.mkdir(parents=True, exist_ok=True)
    return [
        create_header(),
        create_icon(),
        create_fixed_post(),
        create_welcome_post(),
        create_howto_post(),
        create_miniquest_post(),
        create_monster_intro_post(),
        create_event_post(),
        create_growth_post(),
    ]


def write_manifest(paths: Iterable[Path]) -> Path:
    manifest = OUT / "README.md"
    lines = [
        "# X Social Assets",
        "",
        "Generated from existing Montask brand and screenshot assets.",
        "",
    ]
    for path in paths:
        lines.append(f"- `{path.name}`")
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    created = create_all()
    manifest = write_manifest(created)
    for path in [*created, manifest]:
        print(path)
