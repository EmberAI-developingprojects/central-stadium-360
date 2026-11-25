"""Capture a real screenshot of the running Flutter web app via Chrome DevTools
Protocol. Waits real wall-clock time so CanvasKit fully boots and paints
(one-shot --screenshot fires too early on virtual time)."""
import base64, json, subprocess, sys, time, urllib.request
import websocket  # websocket-client

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5599"
OUT = sys.argv[2] if len(sys.argv) > 2 else r"C:\Users\bolly\Desktop\kiosk\_chrome_home.png"
WAIT = float(sys.argv[3]) if len(sys.argv) > 3 else 18.0
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9222

proc = subprocess.Popen([
    CHROME, "--headless=new", f"--remote-debugging-port={PORT}",
    "--remote-allow-origins=*",
    "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    "--hide-scrollbars", "--force-device-scale-factor=1",
    "--window-size=1080,1920", "--user-data-dir=" + r"C:\Users\bolly\AppData\Local\Temp\chrome-shoot",
    URL,
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    # Wait for the devtools endpoint, then find the page target.
    ws_url = None
    for _ in range(40):
        try:
            data = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
            for t in data:
                if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                    ws_url = t["webSocketDebuggerUrl"]; break
            if ws_url:
                break
        except Exception:
            pass
        time.sleep(0.5)
    if not ws_url:
        print("ERROR: no devtools page target"); sys.exit(2)

    ws = websocket.create_connection(ws_url, max_size=64 * 1024 * 1024)
    def cmd(i, method, params=None):
        ws.send(json.dumps({"id": i, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == i:
                return msg

    cmd(1, "Page.enable")
    print(f"booting, waiting {WAIT}s for CanvasKit to paint...")
    time.sleep(WAIT)
    res = cmd(2, "Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
    b64 = res.get("result", {}).get("data")
    if not b64:
        print("ERROR: no screenshot data:", res); sys.exit(3)
    with open(OUT, "wb") as f:
        f.write(base64.b64decode(b64))
    print("saved:", OUT)
finally:
    proc.terminate()
