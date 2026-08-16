from pathlib import Path
import sys

from PIL import Image


def main() -> None:
    source_path = Path(sys.argv[1])
    alpha_path = Path(sys.argv[2])
    output_path = Path(sys.argv[3])

    source = Image.open(source_path).convert("RGB")
    keyed = Image.open(alpha_path).convert("RGBA")
    output = Image.new("RGBA", keyed.size)

    source_pixels = source.load()
    keyed_pixels = keyed.load()
    output_pixels = output.load()
    width, height = keyed.size

    for y in range(height):
        for x in range(width):
            alpha = keyed_pixels[x, y][3]
            if alpha == 0:
                output_pixels[x, y] = (0, 0, 0, 0)
                continue
            if alpha == 255:
                output_pixels[x, y] = (*source_pixels[x, y], 255)
                continue

            replacement = source_pixels[x, y]
            for radius in range(1, 5):
                found = False
                for offset_y in range(-radius, radius + 1):
                    for offset_x in range(-radius, radius + 1):
                        nx, ny = x + offset_x, y + offset_y
                        if not (0 <= nx < width and 0 <= ny < height):
                            continue
                        if keyed_pixels[nx, ny][3] == 255:
                            replacement = source_pixels[nx, ny]
                            found = True
                            break
                    if found:
                        break
                if found:
                    break

            output_pixels[x, y] = (*replacement, alpha)
    output.save(output_path)


if __name__ == "__main__":
    main()
