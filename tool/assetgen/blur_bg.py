"""Pre-blur the stadium photo into a soft background asset.

Heavy gaussian blur + slight desaturation/brighten so it reads as a calm
textured backdrop behind the light UI (a greige veil is added in-app on top).
"""
from PIL import Image, ImageFilter, ImageEnhance

SRC = r"C:\Users\bolly\Desktop\kiosk\tool\source\stadium_bg_source.jpg"
DST = r"C:\Users\bolly\Desktop\kiosk\frontend\assets\brand\stadium_blur.jpg"

im = Image.open(SRC).convert("RGB")
print("source:", im.size)

# Upscale so the result stays smooth when covered onto the tall portrait panel,
# then apply a gentle blur (less than before).
w, h = im.size
scale = max(1.0, 1200 / w)
if scale > 1.0:
    im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

im = im.filter(ImageFilter.GaussianBlur(14))
im = ImageEnhance.Color(im).enhance(0.60)      # desaturate (moodier)
im = ImageEnhance.Brightness(im).enhance(0.80) # darken — less bright
im = ImageEnhance.Contrast(im).enhance(1.04)
im.save(DST, quality=86)
print("saved:", DST, im.size)
