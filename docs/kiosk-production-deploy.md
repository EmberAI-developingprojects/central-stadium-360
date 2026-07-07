# Stadium Kiosk — Production Deployment Runbook

How to take the kiosk to production on a **dedicated Windows box** and keep it
self-healing and unattended. Written for a single kiosk.

---

## 1. Architecture on the box

Three long-lived pieces, each a Scheduled Task that auto-restarts:

| Task | What it runs | Purpose |
|------|--------------|---------|
| `StadiumKioskBridge` | `node C:\Kiosk\current\bridge\dist\server.js` | Local hardware bridge on `127.0.0.1:7070` — card (Golomt REST), E‑Barimt, print, email |
| `StadiumKiosk` | `run_web_kiosk.ps1` | Serves the Flutter web build on `127.0.0.1:8080` and opens Chrome `--kiosk`; **relaunches the browser if it dies** |
| `StadiumKioskWatchdog` | `watchdog.ps1` every 1 min (as SYSTEM) | Restarts the bridge if `/health` stops answering; restarts the UI task if it stopped |

Files are laid out so updates are atomic and rollback is instant:

```
C:\Kiosk\
  ops\                    the tool\kiosk scripts (stable path, copied once)
  releases\<version>\
    web\                  Flutter web build
    bridge\               kiosk-bridge deploy (dist + node_modules + .env)
  current  --junction-->  releases\<version>
  logs\ui\kiosk.log
  logs\watchdog\watchdog.log
```

The tasks always point at `C:\Kiosk\current\...`, so deploying or rolling back is
just "repoint the `current` junction and restart the tasks" — handled by
`deploy_release.ps1`.

> **Why not a real Windows service (nssm)?** A public kiosk needs auto-logon
> anyway (for the full-screen browser), so `-AtLogOn` effectively fires at boot,
> and staying in the user session avoids the session‑0 printing problems a true
> service would introduce. For one box, Scheduled Tasks + a watchdog is the
> right amount of machinery.

---

## 2. Prerequisites on the kiosk box (one time)

- **Node.js** (v20+; v24 is fine) installed.
- **Google Chrome** (or Edge) installed.
- **Golomt GLMTPOS** service installed (`GLMTPOS.msi`) and registered — see
  `install_golomt_service.ps1`. It listens on `:8500` and owns the terminal COM
  port via its `DualConnector.xml`.
- **`SAClient.lic` valid for THIS machine.** The Golomt license is locked to the
  box's BIOS serial. A dev box with a placeholder serial ("To Be Filled By
  O.E.M.") will fail with `Invalid license: SerialNumberVolume`. Get a license
  issued for the real kiosk hardware.
- **E‑Barimt PosService 3.0** installed (fiscal), listening on `:7080`.
- **Receipt printer** installed; note its exact Windows spooler name.
- A **dedicated low-privilege kiosk Windows account** to auto-logon into.

---

## 3. Build on the dev PC (already automated)

```powershell
# Frontend (live cs360 backend defines)
C:\dev\flutter\bin\flutter.bat build web --release `
  --dart-define=KIOSK_API_BASE=https://cs360-backend-190017495951.asia-northeast1.run.app `
  --dart-define=KIOSK_ID=gate-1 `
  --dart-define=KIOSK_KEY=<the X-Kiosk-Key>

# Bridge deploy bundle
backend\scripts\build_deploy.ps1     # -> backend\deploy\kiosk-bridge.zip
```

Assemble a **handoff folder** (USB stick / share) with:

```
handoff\
  web\                 (copy of frontend\build\web)
  kiosk-bridge.zip     (backend\deploy\kiosk-bridge.zip)
  ops\                 (copy of tool\kiosk\)
```

---

## 4. First-time install on the kiosk box (as Administrator)

```powershell
# From the handoff folder. Registers all three tasks and goes live.
handoff\ops\deploy_release.ps1 -Version 2026-07-07 `
  -Web       handoff\web `
  -BridgeZip handoff\kiosk-bridge.zip `
  -OpsSource handoff\ops `
  -Install
```

This stages the release, points `current` at it, registers the bridge, UI, and
watchdog tasks, and starts them.

### 4a. Configure the bridge `.env`

The deploy seeds `C:\Kiosk\current\bridge\.env` from `.env.kiosk.example`.
**Edit it** and set at least:

- `GOLOMT_TERMINAL_ID` — the TID Golomt assigned to this kiosk (**required**).
- `PRINTER_NAME` — the exact spooler name of the receipt printer.
- `RESEND_API_KEY` — for real email delivery (leave blank = simulate).
- Confirm `KIOSK_ORIGIN=http://127.0.0.1:8080` matches the UI port.
- Confirm `POS_DRIVER=golomt`.

Then restart the bridge task:

```powershell
Restart-ScheduledTask -TaskName StadiumKioskBridge
```

### 4b. Harden the OS

```powershell
C:\Kiosk\ops\harden_kiosk.ps1 `
  -EnableAutoLogon -AutoLogonUser kiosk -AutoLogonPassword '<pw>' `
  -ActiveHoursStart 7 -ActiveHoursEnd 23
```

Sets: never sleep/blank, no screensaver/lock screen, no toast notifications,
Windows Update reboots constrained to off-hours, and auto-logon so the box boots
straight into the kiosk. (Auto-logon stores the password in the registry — use a
dedicated low-privilege account on a physically secured box.)

---

## 5. Verify

```powershell
curl http://127.0.0.1:7070/health      # bridge up
curl http://127.0.0.1:7070/pos/probe   # terminal reachable (POS_DRIVER=golomt)
```

- The kiosk screen should show the full-screen UI.
- Close the browser window — within ~5s the UI launcher relaunches it.
- Stop the bridge task — within ~1 min the watchdog restarts it (see
  `C:\Kiosk\logs\watchdog\watchdog.log`).
- **Reboot** and confirm the box comes up straight into the working kiosk.
- Run one real card sale end-to-end.

---

## 6. Updating a release (later)

Rebuild on the dev PC, refresh the handoff folder, then on the box:

```powershell
C:\Kiosk\ops\deploy_release.ps1 -Version 2026-08-01 `
  -Web handoff\web -BridgeZip handoff\kiosk-bridge.zip
```

No `-Install` (tasks already exist). The `.env` is carried forward from the
current release automatically. Old releases are pruned to the last 5.

## 7. Rollback (instant)

```powershell
C:\Kiosk\ops\deploy_release.ps1 -Rollback 2026-07-07
```

Repoints `current` at the named prior release and restarts the tasks.

---

## 8. Logs & recovery

- **UI**: `C:\Kiosk\logs\ui\kiosk.log` — launches and browser relaunches.
- **Watchdog**: `C:\Kiosk\logs\watchdog\watchdog.log` — what it restarted and when.
- Task Scheduler also auto-restarts the bridge/UI tasks on process crash
  (independent of the watchdog).

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| UI shows `ERR_CONNECTION_REFUSED` | UI task not running / port busy | `Start-ScheduledTask StadiumKiosk`; check `logs\ui` |
| Card sale fails, `/pos/probe` bad | GLMTPOS service down or wrong TID | Check `Golomt POS` service on `:8500`; verify `GOLOMT_TERMINAL_ID` |
| `Invalid license: SerialNumberVolume` | `SAClient.lic` not for this box | Get a license for this machine's BIOS serial |
| Card read but declined offline | Terminal not going online / test card | Terminal-side config with Golomt |
| Bridge rejects UI (CORS) | `KIOSK_ORIGIN` != served origin | Set `KIOSK_ORIGIN=http://127.0.0.1:8080` |
| No receipt prints | Wrong `PRINTER_NAME` | Set exact spooler name; restart bridge |
| Box sleeps / screen blanks | Hardening not applied | Re-run `harden_kiosk.ps1` |

---

## 10. Optional: maximum lockdown (Assigned Access)

For the strongest lockdown, configure Windows **Assigned Access / Shell Launcher**
so the account can only run the kiosk shell. This is heavier to set up and can
complicate the bridge+browser combo; the auto-logon + hardening above is
sufficient for most single-kiosk deployments. Add it only if the box is in a
fully public, unsupervised location.
