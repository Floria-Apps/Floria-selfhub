# Maintainer: Floria Apps <contato@floriaapps.com.br>
# Contributor: talona <talona@example.com>

pkgname=floria-selfhub
pkgver=1.4.1
pkgrel=1
pkgdesc="Painel em abas para as APIs dos seus apps self-host"
arch=('x86_64')
url="https://github.com/FloriaApps/Floria-selfhub"
license=()
depends=(
  'gtk3'
  'webkit2gtk-4.1'
  'libappindicator-gtk3'
  'librsvg'
  'libxdo'
  'libssl'
  'cairo'
  'pango'
  'atk'
  'libgtk-3'
  'dbus'
  'xdg-utils'
)

makedepends=(
  'cargo'
  'pkgconf'
  'cmake'
  'libgtk-3-dev'
  'webkit2gtk-4.1-dev'
  'libappindicator-gtk3-dev'
  'librsvg2-dev'
  'libssl-dev'
  'libxdo-dev'
)

source=(
  "selfhub-$pkgver.tar.gz::https://github.com/FloriaApps/Floria-selfhub/archive/refs/tags/v$pkgver.tar.gz"
  'selfhub.png::https://raw.githubusercontent.com/FloriaApps/Floria-selfhub/main/src-tauri/icons/selfhub/64x64.png'
)

sha256sums=(
  'SKIP'
  'SKIP'
)

package() {
  install -Dm755 "$srcdir/selfhub-$pkgver/src-tauri/target/release/selfhub" \
    "$pkgdir/usr/bin/floria-selfhub"

  install -Dm644 "$srcdir/selfhub.png" \
    "$pkgdir/usr/share/icons/hicolor/128x128/apps/floria-selfhub.png"

  install -Dm644 /dev/stdin \
    "$pkgdir/usr/share/applications/floria-selfhub.desktop" <<'EOF'
[Desktop Entry]
Name=Floria SelfHub
Comment=Painel em abas para as APIs dos seus apps self-host
GenericName=Self-Host Dashboard
Exec=floria-selfhub
Icon=floria-selfhub
Terminal=false
Type=Application
Categories=Utility;Development;Network;
Keywords=self-host;dashboard;api;monitor;
EOF
}