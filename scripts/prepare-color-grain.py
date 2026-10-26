"""Compile pigment detail from the supplied color-chart reference into lossless WebP."""
import statistics
import sys
from array import array
from pathlib import Path

from PIL import Image, ImageFilter

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'assets/color-textures/grain-overlay.webp'
reference = Image.open(source).convert('L')
# Four central 64px patches from actual pigment squares, avoiding their edges.
# Normalize each patch's color/illumination so only its existing material remains.
centers = [(323, 140), (230, 240), (600, 140), (510, 440)]
details = []
for x, y in centers:
    patch = reference.crop((x - 32, y - 32, x + 32, y + 32))
    # Retain soft pigment mottling while suppressing JPEG-sized hard speckles.
    patch = patch.filter(ImageFilter.GaussianBlur(0.25))
    samples = list(patch.tobytes())
    mean = statistics.mean(samples)
    residual = [value - mean for value in samples]
    deviation = max(1, statistics.pstdev(residual))
    field = Image.new('F', (64, 64))
    field.putdata([value / deviation for value in residual])
    details.append(list(array('f', field.resize((128, 128), Image.Resampling.LANCZOS).tobytes())))

# Blend full material fields, rather than stitching patches with visible seams.
weights = (0.5, 0.25, 0.15, 0.1)
combined = [sum(value * weight for value, weight in zip(values, weights)) for values in zip(*details)]
combined_deviation = max(0.01, statistics.pstdev(combined))

# Preserve the reference's matte grain. Strong white speckles would wash out
# saturated colors; highlights therefore use less opacity than pigment shadows.
pixels = []
for y in range(128):
    for x in range(128):
        difference = combined[y * 128 + x] / combined_deviation
        highlight = difference >= 0
        # Deepen pigment deposits without increasing the white wash over the color.
        alpha = min(10 if highlight else 38, round(abs(difference) * (4 if highlight else 14)))
        tone = 255 if highlight else 0
        pixels.append((tone, tone, tone, alpha))
overlay = Image.new('RGBA', (128, 128))
overlay.putdata(pixels)
target.parent.mkdir(parents=True, exist_ok=True)
overlay.save(target, 'WEBP', lossless=True, method=6, exact=True)
print(f'{target.name}: {target.stat().st_size} bytes; RGBA lossless WebP')
