from collections import Counter
from PIL import Image

im = Image.open(r"C:\Users\bolly\Desktop\kiosk\frontend\assets\brand\logo.png").convert("RGBA")
w, h = im.size
px = im.load()
blues = Counter()
navies = Counter()
for y in range(0, h, 3):
    for x in range(0, w, 3):
        r, g, b, a = px[x, y]
        if a < 200:
            continue
        # vivid royal blue: strong blue, low-ish red/green
        if b > 120 and b - r > 60 and b - g > 50 and g < 120:
            blues[(r // 8 * 8, g // 8 * 8, b // 8 * 8)] += 1
        # deep navy: dark, blue dominant
        if b > 50 and b < 130 and r < 70 and g < 70 and b - r > 20:
            navies[(r // 8 * 8, g // 8 * 8, b // 8 * 8)] += 1


def top(c, label):
    print(f"\n{label}:")
    for (r, g, b), n in c.most_common(5):
        print(f"  #{r:02X}{g:02X}{b:02X}  ({n})")


top(blues, "Royal blue (dome)")
top(navies, "Navy (wordmark)")
