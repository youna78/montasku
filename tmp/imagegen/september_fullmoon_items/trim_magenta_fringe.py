from pathlib import Path
import sys

from PIL import Image


def main() -> None:
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    image = Image.open(input_path).convert("RGBA")
    width, height = image.size

    for _ in range(2):
        pixels = image.load()
        remove = []
        for y in range(1, height - 1):
            for x in range(1, width - 1):
                red, green, blue, alpha = pixels[x, y]
                if alpha == 0 or min(red, blue) < 160 or green > 75 or abs(red - blue) > 80:
                    continue
                if any(
                    pixels[x + offset_x, y + offset_y][3] == 0
                    for offset_x, offset_y in ((-1, 0), (1, 0), (0, -1), (0, 1))
                ):
                    remove.append((x, y))
        for x, y in remove:
            pixels[x, y] = (0, 0, 0, 0)

    image.save(output_path)


if __name__ == "__main__":
    main()
