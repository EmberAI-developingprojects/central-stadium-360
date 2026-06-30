from fontTools.ttLib import TTFont

f = TTFont(r"C:\Users\bolly\Desktop\kiosk\frontend\assets\fonts\YubuyanBold.ttf")
cmap = f.getBestCmap()
nm = f["name"]
print("family:", nm.getDebugName(1), "| subfamily:", nm.getDebugName(2))
tests = {
    "Latin A-Z a-z": [0x41, 0x5A, 0x61, 0x7A],
    "basic Cyrillic": [0x0410, 0x044F],
    "Uu (04AE/04AF)": [0x04AE, 0x04AF],
    "Oo (04E8/04E9)": [0x04E8, 0x04E9],
    "digits 0-9": [0x30, 0x39],
    "Tugrik 20AE": [0x20AE],
}
for label, cps in tests.items():
    ok = all(c in cmap for c in cps)
    print(f"  {label:16}", "OK" if ok else "MISSING")
print("axes:", [a.axisTag for a in f["fvar"].axes] if "fvar" in f else "static")
print("glyph count:", f["maxp"].numGlyphs)
