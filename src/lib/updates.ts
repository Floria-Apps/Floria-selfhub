import type { ClientOptions } from '@tauri-apps/plugin-http'
import { isTauri } from './http'

const LATEST_RELEASE_URL = 'https://api.github.com/repos/Floria-Apps/Floria-selfhub/releases/latest'

function versionParts(version: string): { core: number[]; prerelease: string[] } | null {
  const match = version.trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/)
  if (!match) return null

  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split('.') ?? [],
  }
}

export function isNewerVersion(candidate: string, current: string): boolean {
  const next = versionParts(candidate)
  const installed = versionParts(current)
  if (!next || !installed) return false

  for (let index = 0; index < next.core.length; index++) {
    if (next.core[index] !== installed.core[index]) {
      return next.core[index] > installed.core[index]
    }
  }

  if (!next.prerelease.length) return installed.prerelease.length > 0
  if (!installed.prerelease.length) return false

  for (let index = 0; index < Math.max(next.prerelease.length, installed.prerelease.length); index++) {
    const nextPart = next.prerelease[index]
    const installedPart = installed.prerelease[index]
    if (nextPart === undefined) return false
    if (installedPart === undefined) return true
    if (nextPart === installedPart) continue

    const nextNumber = /^\d+$/.test(nextPart) ? Number(nextPart) : null
    const installedNumber = /^\d+$/.test(installedPart) ? Number(installedPart) : null
    if (nextNumber !== null && installedNumber !== null) return nextNumber > installedNumber
    if (nextNumber !== null) return false
    if (installedNumber !== null) return true
    return nextPart > installedPart
  }

  return false
}

export async function fetchLatestReleaseVersion(): Promise<string> {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  let response: Response

  if (isTauri()) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')
    response = await tauriFetch(LATEST_RELEASE_URL, {
      headers,
      connectTimeout: 8_000,
      maxRedirections: 2,
    } satisfies RequestInit & ClientOptions)
  } else {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)
    try {
      response = await fetch(LATEST_RELEASE_URL, { headers, signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }
  }

  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`)

  const release: unknown = await response.json()
  if (!release || typeof release !== 'object' || !('tag_name' in release)
    || typeof release.tag_name !== 'string' || !versionParts(release.tag_name)) {
    throw new Error('GitHub returned an invalid release version')
  }

  return release.tag_name.replace(/^v/i, '')
}
