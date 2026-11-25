"""Tight-crop host.png to the character's silhouette (alpha bounding box).

Removes the transparent margin around Khulan so she fills the hero frame when
scaled by width. Small symmetric padding is kept so edges don't touch the frame.
"""
import numpy as np
from PIL import Image

DST = r"C:\Users\bolly\Desktop\kiosk\frontend\assets\character\host.png"

im = Image.open(DST).convert("RGBA")
a = np.array(im)[:, :, 3]
ys, xs = np.where(a > 16)
x0, x1 = xs.min(), xs.max()
y0, y1 = ys.min(), ys.max()
pad = 8
x0 = max(0, x0 - pad)
y0 = max(0, y0 - pad)
x1 = min(im.width - 1, x1 + pad)
y1 = min(im.height - 1, y1 + pad)
cropped = im.crop((x0, y0, x1 + 1, y1 + 1))
cropped.save(DST)
print(f"cropped to {cropped.width}x{cropped.height} (ratio {cropped.width / cropped.height:.3f})")
