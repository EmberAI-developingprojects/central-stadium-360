Home-screen host character (Khulan).

PRIMARY — looping video:
    host.webm   (VP9 + alpha, transparent background, ~3s loop, 720x1280)

This plays muted and looped on the home screen and composites over the dark
background thanks to its alpha channel. It is the format the kiosk actually
uses now.

Regenerating host.webm from a source clip (Chrome needs VP9, NOT QuickTime
qtrle/.mov, and needs alpha for the transparent background):

    ffmpeg -y -i "tool/source/character/Sequence 01.mov" -an \
        -vf "crop=436:1280:140:0,format=yuva420p" \
        -c:v libvpx-vp9 -pix_fmt yuva420p -crf 30 -b:v 0 \
        -auto-alt-ref 0 host.webm

    # The crop tightens the loose 720x1280 source to the character's silhouette
    # (~428px wide) so she fills the column width like host.png did. Re-measure
    # the bbox if the source reframes (the CLI VP9 decoder drops alpha, so
    # measure from the .mov, not the .webm).

    # verify alpha survived: ffprobe should report  TAG:alpha_mode=1
    ffprobe -v error -show_entries stream_tags host.webm

Keep the heavy source .mov OUT of this folder (it lives in
tool/source/character/) — everything in assets/character/ is bundled into the
build, so a 100 MB source would bloat the app.

FALLBACK — still image:
    host.png    a friendly female stadium/event host, tall portrait, facing
                forward, transparent or soft background.

If host.webm can't be decoded (or while it loads), the app shows host.png with
a subtle procedural idle; if host.png is also missing, it falls back to the
built-in hand-drawn mascot. So the home screen always renders.
