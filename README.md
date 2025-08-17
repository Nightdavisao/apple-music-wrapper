# Apple Music (am-wrapper)

Unofficial, minimal Electron wrapper for Apple Music (and Apple Music Classical) with quality‑of‑life desktop integrations.

> Not affiliated with or endorsed by Apple Inc. Use at your own risk.

## ✨ Features

* Linux **MPRIS** support (media keys, tray controls, position, artwork, shuffle / repeat, loop status)
* **Discord Rich Presence** (current track, artwork, progress bar, pause / resume handling, reconnect logic)
* **Last.fm scrobbling** (Now Playing + automatic scrobble logic w/ half track or 4‑minute rule, ignores <30s)
* Switch between **Apple Music** and **Apple Music Classical**
* Tray menu with quick playback + visibility controls

## Download

Binary releases are published on the [Releases page](https://github.com/Nightdavisao/apple-music-wrapper/releases).

> Only Linux AppImage is provided currently. Feel free to contribute build configs for other platforms.

## Build from source

Prerequisites: Node.js 18+ (or recent LTS), npm.

```bash
git clone https://github.com/Nightdavisao/apple-music-wrapper.git
cd apple-music-wrapper
npm install
# Development (Wayland hint enabled automatically on Linux)
npm start

# Produce distribution artifacts (AppImage)
npm run app:dist
```

Artifacts will appear under `dist/` plus the packaged output directory created by `electron-builder`.

## Known Issues / Limitations

* Radio stations currently break the app (needs safer handling of stream metadata).
* Only Linux builds provided right now.
* No automatic updates.
* No tests (yet).
* Classical site artwork / metadata differences minimally handled.