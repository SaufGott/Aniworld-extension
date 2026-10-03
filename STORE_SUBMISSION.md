# Store submission kit

Paste-ready fields for both stores. The package to upload is `dist/aniworld-helper_v1.1.0.zip`
(all files at the archive root, which is what both stores require).

---

## Chrome Web Store (Chrome Developer Dashboard)

**Item type:** Extension
**Upload:** `dist/aniworld-helper_v1.1.0.zip`

**Name** (max 45 characters)
```
AniWorld Helper - Auto-Next & Intro Skipper
```

**Short description** (max 128 characters)
```
Auto-next episode, auto-start playback and intro/outro skip for aniworld.to. Per-anime settings.
```

**Full description**
```
Enhances anime streaming on aniworld.to and s.to.

- Auto-Next Episode: continues with the next episode when the current one ends, with a
  5-second countdown you can cancel or skip. Continues into the first episode of the next
  season when a season ends.
- Auto-Start Playback: presses the player's play button for you, so you do not have to
  click it on every episode.
- Intro Skip: jumps past the opening credits to a per-anime timestamp.
- Outro Skip: starts the next episode early so you do not sit through the ending.
- Per-anime settings in the popup and in a panel embedded on the episode page.

No accounts, no tracking, no network requests. Everything is stored locally in the browser.

Open source: https://github.com/SaufGott/Aniworld-extension
```

**Category:** Productivity

**Privacy / data usage**
- No data is collected, transmitted or stored off-device.
- `chrome.storage.local` only: per-anime skip durations and the three toggles.
- No analytics, no cookies, no remote code.

**Permission justification** (the dashboard asks for these)
- `storage` — saves per-anime skip settings and the active anime key locally.
- `debugger` — dispatches one trusted click on the hoster play button. A click from a content
  script is not a user activation, so the browser's autoplay policy refuses to start playback;
  the debugger is the only way an extension can create a real user gesture. Used only while a
  hoster player is playing, and detached immediately after the click.
- `host_permissions <all_urls>` — the video players are embedded from hoster domains
  (VOE, Doodstream, Filemoon, Vidmoly), so the script must run inside those iframes.

**Store assets**
- Icon: `icons/icon128.png` (128x128, required).
- Screenshots: take one of the episode page with the settings panel open and one of the
  countdown overlay. 1280x800 is the size the dashboard expects.

---

## Microsoft Edge Add-ons (partners.microsoft.com)

Upload the same zip. Edge signs the package itself, which is what stops Edge from disabling
the extension on every start.

Use the same name, short description and full description as above. Edge additionally asks for:

- **Category:** Entertainment / Productivity
- **Contact email** for support
- **Privacy statement:** "No data is collected. Settings are stored only in the local browser storage."

Edge Add-ons review typically takes a few days. After approval, install once from the store —
the startup prompt is gone.

---

## Before uploading

1. `pwsh build.ps1` to regenerate the zip from the current source.
2. Check `manifest.json` version matches the release you are submitting.
3. Remove the `icons/` note: the store icon must be 128x128 PNG — `icons/icon128.png` is fine.
4. Do not include `build.ps1`, `README.md` or `.github/` in the uploaded zip (the build script
   already excludes them).
