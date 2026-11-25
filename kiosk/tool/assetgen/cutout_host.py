"""Cut the cream background out of the host character into a transparent PNG.

Uses a border flood-fill (not a global color key) so the light/cream trim that
sits *inside* the deel silhouette is preserved -- only background-connected
cream is removed. Edge is eroded 1px + softly feathered to kill the cream halo.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = r"C:\Users\bolly\Desktop\kiosk\character_deel_braid_00001_.png"
DST = r"C:\Users\bolly\Desktop\kiosk\frontend\assets\character\host.png"
SENTINEL = (255, 0, 255)
THRESH = 32  # cream tolerance for the flood fill

img = Image.open(SRC).convert("RGB")
w, h = img.size
print(f"source: {w}x{h}")

work = img.copy()
for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
    ImageDraw.floodfill(work, corner, SENTINEL, thresh=THRESH)

arr = np.array(work)
bg = np.all(arr == SENTINEL, axis=-1)  # True where background
alpha = np.where(bg, 0, 255).astype("uint8")
alpha_img = Image.fromarray(alpha, mode="L")

# Erode 1px (drop blended cream edge pixels), then feather slightly.
alpha_img = alpha_img.filter(ImageFilter.MinFilter(3))
alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(0.8))

out = img.convert("RGBA")
out.putalpha(alpha_img)
out.save(DST)

covered = int((np.array(alpha_img) > 16).sum())
print(f"subject pixels kept: {covered} ({covered / (w * h):.0%}) -> {DST}")
