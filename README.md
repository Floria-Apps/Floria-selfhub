# Floria SelfHub

<p align="center">
  <img src="src-tauri/icons/floria-selfhub/floria-selfhub-background.svg" width="160" alt="Floria SelfHub logo">
</p>

<p align="center">
  <strong>Your services. One place.</strong><br>
  A fast desktop dashboard for self-hosted services.
</p>

<p align="center">
  <a href="https://github.com/FloriaApps/Floria-selfhub/releases">
    <img src="https://img.shields.io/github/v/release/FloriaApps/Floria-selfhub?style=flat-square" alt="Latest release">
  </a>
  <a href="https://github.com/FloriaApps/Floria-selfhub/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/FloriaApps/Floria-selfhub/ci.yml?branch=main&style=flat-square&label=CI" alt="CI status">
  </a>
  <a href="https://github.com/FloriaApps/Floria-selfhub/blob/main/LICENSE.md">
    <img src="https://img.shields.io/github/license/FloriaApps/Floria-selfhub?style=flat-square" alt="License">
  </a>
</p>

Floria SelfHub brings the services in your homelab or self-hosted environment together in one focused application. Keep your Jellyfin, Navidrome, Docker, DNS, monitoring and other dashboards organized without maintaining dozens of browser tabs.

## Highlights

- **Unified dashboard** for self-hosted services.
- **Tabbed workspace** with one view for each service.
- **Service groups and ordering** shared across the dashboard, sidebar and settings.
- **Health and availability history** to identify services that need attention.
- **Service-specific integrations** for sessions, libraries, monitors, DNS, containers and more.
- **System tray support** to keep the application running in the background.
- **Start on login** option for desktop environments that support autostart.
- **Dark and light themes** with localized interface text.
- **Local-first storage** for services, preferences and configuration data.

## Supported services

| Service | Integration |
| --- | --- |
| Jellyfin | Sessions and library information |
| Navidrome | Now playing and library information |
| Uptime Kuma | Monitor status |
| Gatus | Endpoint health |
| Speedtest Tracker | Internet speed history |
| Cup | Container image updates |
| What's Up Docker | Container updates |
| AdGuard Home | DNS and blocking information |
| qBittorrent | Download information |
| Jellyseerr | Media requests |
| Radarr / Sonarr / Lidarr | Arr ecosystem information |
| Immich | Photo service information |
| Multi-scrobbler | Media scrobbling information |

> More integrations are planned. Service availability may depend on the API version and permissions configured on your instance.

## Screenshots

### Dark mode

<p align="center">
  <img src="gallery/1.png" width="49%" alt="Floria SelfHub dark mode dashboard">
  <img src="gallery/2.png" width="49%" alt="Floria SelfHub dark mode service view">
</p>

<p align="center">
  <img src="gallery/3.png" width="49%" alt="Floria SelfHub dark mode settings">
  <img src="gallery/4.png" width="49%" alt="Floria SelfHub dark mode history">
</p>

### Light mode

<p align="center">
  <img src="gallery/11.png" width="49%" alt="Floria SelfHub light mode">
</p>

## Installation

Download the latest release from the [GitHub Releases page](https://github.com/FloriaApps/Floria-selfhub/releases).

### Linux

Available packages include:

- **Debian/Ubuntu:** `.deb`
- **Fedora/openSUSE:** `.rpm`
- **Portable Linux:** `.AppImage`
- **Arch Linux:** build with the included `PKGBUILD`

For Debian-based distributions:

```bash
sudo dpkg -i SelfHub_<version>_amd64.deb
```

For Arch Linux, build the package from the repository root:

```bash
makepkg -si
```

### Windows

Download and run the `.exe` NSIS installer from the release assets.

### macOS

Download the `.dmg`, open it, and drag **Floria SelfHub** to the Applications folder. Builds are produced for the macOS runner architecture configured in the release workflow.

## Development

### Requirements

- Node.js 26 or newer
- pnpm 12 or newer
- Rust stable toolchain
- Tauri v2 system dependencies

Install the JavaScript dependencies:

```bash
pnpm install
```

Start the frontend development server:

```bash
pnpm dev
```

Start the Tauri desktop application in development mode:

```bash
pnpm tauri dev
```

### Useful commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm tauri dev` | Run the desktop application in development |
| `pnpm build` | Type-check and build the frontend |
| `pnpm test` | Run the Vitest test suite |
| `pnpm tauri build` | Build the desktop application and bundles |
| `cargo check --locked` | Check the Rust backend |
| `cargo test --locked` | Run Rust tests |
| `cargo fmt --all -- --check` | Validate Rust formatting |
| `cargo clippy --all-targets --all-features` | Run Rust lint checks |

## Project structure

```text
.
├── src/                       # Vue frontend
├── public/                    # Frontend static assets
├── src-tauri/
│   ├── src/                   # Rust/Tauri backend
│   ├── icons/floria-selfhub/  # Application logos and platform icons
│   ├── Cargo.toml             # Rust package and dependencies
│   └── tauri.conf.json        # Tauri application and bundle settings
├── .github/workflows/         # CI and release workflows
├── PKGBUILD                   # Arch Linux package recipe
└── package.json               # Frontend scripts and dependencies
```

## Data and privacy

Service configuration, preferences and local application data are stored on the device. Floria SelfHub does not provide a hosted service and does not require an account. Network requests are made to the service endpoints configured by the user.

In desktop and iOS builds, API tokens, usernames and passwords are stored in the operating system's credential store (Secret Service on Linux, Keychain on macOS/iOS and Credential Manager on Windows). Credentials saved by older versions are migrated to the system store on first launch. Android and browser builds keep credentials in local storage without app-level encryption.

Exported configuration files omit the dedicated token, username and password fields. Treat service addresses and exported configuration files as sensitive, and do not commit them.

## Releases

Releases are created from version tags such as `v1.4.1`. GitHub Actions builds the release assets for Linux, Windows and macOS and attaches them to the corresponding GitHub Release.

The project uses:

- `pnpm` for frontend dependencies;
- Cargo for the Rust/Tauri backend;
- Dependabot for dependency update proposals;
- Release Please for changelog and version management.

## Contributing

Issues and pull requests are welcome. Before opening a pull request, run the relevant checks locally:

```bash
pnpm build
pnpm test run
cargo check --locked
```

Please describe the operating system, package format and steps to reproduce when reporting a platform-specific problem.

## License

See [LICENSE.md](LICENSE.md) for the project license.

<p align="center">
  <strong>Floria SelfHub</strong><br>
  <em>Your services. One place.</em><br><br>
  Built by <a href="https://github.com/FloriaApps">FloriaApps</a>
</p>
