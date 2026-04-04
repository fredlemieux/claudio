# Releasing Claudio

## Versioning

Claudio follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (`1.0.0`) — breaking changes, major UI overhauls
- **MINOR** (`0.5.0`) — new features, new panels, new integrations
- **PATCH** (`0.4.1`) — bug fixes, performance improvements

The version lives in three places that must stay in sync:

| File                        | Field     |
| --------------------------- | --------- |
| `package.json`              | `version` |
| `src-tauri/Cargo.toml`      | `version` |
| `src-tauri/tauri.conf.json` | `version` |

## How to Cut a Release

### 1. Update version numbers

```bash
# Update all three files to the new version
# package.json, src-tauri/Cargo.toml, src-tauri/tauri.conf.json
```

### 2. Commit and tag

```bash
git add -A
git commit -m "release: v0.5.0"
git tag v0.5.0
git push origin main --tags
```

### 3. CI builds automatically

Pushing the tag triggers the **Release** workflow which:

1. Builds the app on macOS (arm64 + x86_64), Linux, and Windows
2. Produces platform-specific installers
3. Generates SHA256 checksums for every artifact
4. Creates a **draft** GitHub Release with all artifacts attached

### 4. Review and publish

1. Go to [GitHub Releases](../../releases)
2. Review the draft release — edit notes if needed
3. Click **Publish release**

## What Gets Built

| Platform          | Artifacts                          |
| ----------------- | ---------------------------------- |
| macOS (arm64)     | `.dmg`, `.app.tar.gz`              |
| macOS (x86_64)    | `.dmg`, `.app.tar.gz`              |
| Linux (x86_64)    | `.deb`, `.AppImage`                |
| Windows (x86_64)  | `.msi`, `.exe` (NSIS installer)    |

All artifacts include SHA256 checksums in `SHA256SUMS.txt`.

## Installing Claudio

### macOS

1. Download `Claudio_x.y.z_aarch64.dmg` (Apple Silicon) or `Claudio_x.y.z_x64.dmg` (Intel)
2. Open the `.dmg` and drag Claudio to Applications
3. First launch: right-click > Open (required for unsigned apps)

### Windows

1. Download `Claudio_x.y.z_x64-setup.exe` (recommended) or `.msi`
2. Run the installer — follow the prompts
3. Windows SmartScreen may warn about unsigned apps — click "More info" > "Run anyway"

### Linux

**Debian/Ubuntu:**
```bash
sudo dpkg -i claudio_x.y.z_amd64.deb
```

**AppImage (any distro):**
```bash
chmod +x Claudio_x.y.z_amd64.AppImage
./Claudio_x.y.z_amd64.AppImage
```

## CI Pipeline Overview

### On every push to `main` and every PR

The **CI** workflow runs two parallel job groups:

- **Frontend checks** (macOS, Linux, Windows): TypeScript type check, Vite build, Storybook build
- **Rust checks** (macOS, Linux, Windows): `cargo check`, `cargo clippy`

### On push to `main` (when src/ or .storybook/ changes)

The **Storybook** workflow builds and deploys Storybook to GitHub Pages.

### On tag push (`v*`)

The **Release** workflow builds platform installers and creates a draft GitHub Release.

## Code Signing (Future)

Currently, installers are **unsigned**. Users will see security warnings on first launch.

### Apple Notarization (planned)

Requires:
- Apple Developer account ($99/year)
- Developer ID certificate
- GitHub secrets: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
- Tauri supports notarization natively via `tauri.conf.json` bundle config

### Windows Code Signing (planned)

Requires:
- Code signing certificate (EV or standard)
- GitHub secret: `WINDOWS_CERTIFICATE` (base64 PFX)
- Eliminates SmartScreen warnings

## Auto-Update (Future)

Tauri includes a built-in updater plugin (`@tauri-apps/plugin-updater`) that can:

1. Check a JSON endpoint for new versions
2. Download and apply updates in-app
3. Supports differential updates (only downloads changed bytes)

To enable:
1. Add `tauri-plugin-updater` to `src-tauri/Cargo.toml`
2. Add `@tauri-apps/plugin-updater` to `package.json`
3. Configure update endpoint in `tauri.conf.json`
4. Host the update JSON (GitHub Releases works as the backend)
5. The release workflow already produces `.tar.gz` + `.sig` files needed for updates
