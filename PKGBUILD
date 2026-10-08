pkgname=floria-selfhub
pkgver=1.0.1
pkgrel=1
pkgdesc="Desktop dashboard for self-hosted services"
arch=('x86_64')
url="https://github.com/FloriaApps/Floria-selfhub"
license=()
depends=(
  'gtk3'
  'webkit2gtk-4.1'
  'libappindicator-gtk3'
  'librsvg'
)

source=(
  'selfhub'
  '128x128.png'
)

sha256sums=(
  'SKIP'
  'SKIP'
)

package() {
  install -Dm755 "$srcdir/selfhub" \
    "$pkgdir/usr/bin/floria-selfhub"

  install -Dm644 "$srcdir/128x128.png" \
    "$pkgdir/usr/share/icons/hicolor/128x128/apps/floria-selfhub.png"

  install -Dm644 /dev/stdin \
    "$pkgdir/usr/share/applications/floria-selfhub.desktop" <<'EOF'
[Desktop Entry]
Name=Floria SelfHub
Comment=Desktop dashboard for self-hosted services
Exec=floria-selfhub
Icon=floria-selfhub
Terminal=false
Type=Application
Categories=Utility;
EOF
}