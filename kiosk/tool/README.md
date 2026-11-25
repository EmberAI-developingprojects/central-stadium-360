# tool/ — developer scripts (not part of the app build)

One-off utilities for generating assets and deploying the kiosk. These are run
manually from a dev machine; they are **not** invoked by `flutter build`. Most
Python scripts use absolute paths and require [Pillow](https://pypi.org/project/Pillow/)
(`pip install pillow`) and [fontTools](https://pypi.org/project/fonttools/).

```
tool/
  assetgen/     Generate committed image assets from raw sources
    blur_bg.py      source/stadium_bg_source.jpg -> frontend/assets/brand/stadium_blur.jpg
    crop_host.py    crop the AI host character image
    cutout_host.py  background-cutout for the host character
    sample_logo.py  sample/derive brand logo colours
  fonts/        Inspect bundled fonts for glyph coverage
    check_glyphs.py   verify Cyrillic/Mongolian coverage in app fonts
    check_yubuyan.py  inspect frontend/assets/fonts/YubuyanBold.ttf
  kiosk/        Windows deployment
    build_windows.bat     build the release kiosk binary
    install_autostart.ps1 register the kiosk to launch on boot
  source/       Raw inputs for assetgen/ (kept for regeneration, not shipped)
    stadium_bg_source.jpg
    yubuyan-bold.ttf
    yubuyan-light.ttf
```
