# Floria SelfHub

<p align="center">
  <img src="src-tauri/icons/floria-selfhub/floria-selfhub-256.png" width="128" alt="Floria SelfHub logo">
</p>

<p align="center">
  <strong>Your services. One place.</strong><br>
  Monitor and organize self-hosted services from one desktop app.
</p>

<p align="center">
  <a href="https://github.com/Floria-Apps/Floria-selfhub/releases/latest">
    <img src="https://img.shields.io/github/v/release/Floria-Apps/Floria-selfhub?display_name=tag&style=flat-square&label=release" alt="Latest release">
  </a>
  <a href="https://github.com/Floria-Apps/Floria-selfhub/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/Floria-Apps/Floria-selfhub/ci.yml?branch=main&style=flat-square&label=CI" alt="CI status">
  </a>
  <a href="https://github.com/Floria-Apps/Floria-selfhub/blob/main/LICENSE.md">
    <img src="https://img.shields.io/github/license/Floria-Apps/Floria-selfhub?style=flat-square" alt="License">
  </a>
</p>

Floria SelfHub brings your self-hosted dashboards together. Manage services in tabs, organize them into groups, and see their status at a glance.

## Features

- Service health overview, filters, and availability history.
- Integrations for media, monitoring, DNS, containers, downloads, and more.
- Service groups, favorites, and drag-and-drop ordering.
- System tray, start on login, and light or dark themes.
- Local-first settings and data.

**Integrations:** Jellyfin, Navidrome, Uptime Kuma, Gatus, Speedtest Tracker, Cup, What's Up Docker, AdGuard Home, qBittorrent, Jellyseerr, Radarr, Sonarr, Lidarr, Immich, and Multi-scrobbler.

## Screenshots

<p align="center">
  <img src="gallery/1.png" width="49%" alt="Floria SelfHub dashboard in dark mode">
  <img src="gallery/11.png" width="49%" alt="Floria SelfHub in light mode">
</p>

## Download

Get the latest version from [GitHub Releases](https://github.com/Floria-Apps/Floria-selfhub/releases/latest).

Packages are available for Linux (`.deb`, `.rpm`, `.AppImage`, and Arch via `PKGBUILD`), Windows (`.exe`), and macOS (`.dmg`).

## Development

Requirements: Node.js 26+, pnpm 12+, Rust stable, and [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/).

```bash
pnpm install
pnpm tauri dev
```

Run checks before opening a pull request:

```bash
pnpm build
pnpm test run
cargo check --manifest-path src-tauri/Cargo.toml --locked
```

## Privacy

Floria SelfHub has no hosted service or user account. It sends requests to the service endpoints you configure; opening Settings also checks GitHub's public API for a newer release.

On desktop and iOS, credentials are stored in the operating system's credential store. On Android and in the browser, they are stored locally without app-level encryption. Exported configuration files omit the dedicated token, username, and password fields.

## License

Licensed under the [GNU General Public License v3.0 only](LICENSE.md) (`GPL-3.0-only`).

Issues and pull requests are welcome on [GitHub](https://github.com/Floria-Apps/Floria-selfhub).
