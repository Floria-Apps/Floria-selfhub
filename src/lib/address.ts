/** Endereço sem protocolo e sem caminho, ex.: http://192.168.0.10:8096/x vira 192.168.0.10:8096 */
export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
  }
}
