from collections import deque
from pathlib import Path
import math
import sys

from PIL import Image


TRANSPARENT_DISTANCE = 18.0
OPAQUE_DISTANCE = 150.0


def main() -> None:
    source_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    source = Image.open(source_path).convert("RGB")
    width, height = source.size
    pixels = source.load()

    corners = [pixels[0, 0], pixels[width - 1, 0], pixels[0, height - 1], pixels[width - 1, height - 1]]
    key = tuple(round(sum(pixel[channel] for pixel in corners) / 4) for channel in range(3))

    def distance(x: int, y: int) -> float:
        pixel = pixels[x, y]
        return math.sqrt(sum((pixel[channel] - key[channel]) ** 2 for channel in range(3)))

    connected = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if connected[index] or distance(x, y) >= OPAQUE_DISTANCE:
            continue
        connected[index] = 1
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    output = Image.new("RGBA", source.size)
    output_pixels = output.load()
    for y in range(height):
        for x in range(width):
            if not connected[y * width + x]:
                output_pixels[x, y] = (*pixels[x, y], 255)
                continue

            chroma_distance = distance(x, y)
            if chroma_distance <= TRANSPARENT_DISTANCE:
                output_pixels[x, y] = (0, 0, 0, 0)
                continue

            alpha = round(
                255 * (chroma_distance - TRANSPARENT_DISTANCE) / (OPAQUE_DISTANCE - TRANSPARENT_DISTANCE)
            )
            replacement = None
            for radius in range(1, 5):
                for offset_y in range(-radius, radius + 1):
                    for offset_x in range(-radius, radius + 1):
                        nx, ny = x + offset_x, y + offset_y
                        if not (0 <= nx < width and 0 <= ny < height):
                            continue
                        if not connected[ny * width + nx]:
                            replacement = pixels[nx, ny]
                            break
                    if replacement is not None:
                        break
                if replacement is not None:
                    break

            if replacement is None:
                output_pixels[x, y] = (0, 0, 0, 0)
            else:
                output_pixels[x, y] = (*replacement, alpha)

    output.save(output_path)


if __name__ == "__main__":
    main()
