from fontTools.ttLib import TTFont

# Mongolian-specific Cyrillic + a few common letters used in the UI.
TESTS = {
    "Үү": [0x04AE, 0x04AF],
    "Өө": [0x04E8, 0x04E9],
    "basic Cyr (А я)": [0x0410, 0x044F],
    "wght axis": None,
}

for path in [
    r"C:\Users\bolly\Desktop\kiosk\frontend\assets\fonts\PlayfairDisplay.ttf",
    r"C:\Users\bolly\Desktop\kiosk\frontend\assets\fonts\Manrope.ttf",
]:
    f = TTFont(path)
    cmap = f.getBestCmap()
    name = path.split("\\")[-1]
    print(f"\n=== {name} ===")
    for label, cps in TESTS.items():
        if label == "wght axis":
            axes = [a.axisTag for a in f["fvar"].axes] if "fvar" in f else []
            rng = ""
            if "fvar" in f:
                for a in f["fvar"].axes:
                    if a.axisTag == "wght":
                        rng = f" ({a.minValue}-{a.maxValue}, def {a.defaultValue})"
            print(f"  variable axes: {axes}{rng}")
            continue
        ok = all(cp in cmap for cp in cps)
        print(f"  {label:18} {'OK' if ok else 'MISSING'}")
