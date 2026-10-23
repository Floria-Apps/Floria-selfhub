import { getJson, request } from '../lib/http'
import { fmtAgo, fmtNumber } from '../lib/format'
import { t } from '../lib/i18n'
import type { DetailItem, ServiceAdapter, ServiceConfig } from './types'

// Cup (sergi0g/cup): API v3, sem autenticação.
//
// Formato real observado em /api/v3/json:
//   {
//     images: [{
//       reference, in_use, server (null = host local, ou nome do agente), url, time,
//       parts: { registry, repository, tag },
//       result: {
//         error, has_update,
//         info: null
//             | { type: 'version', current_version, new_tag, new_version, version_update_type }
//             | { type: 'digest', local_digests, remote_digest }
//       }
//     }],
//     last_updated: ISO-8601,
//     metrics: { monitored_images, up_to_date, updates_available, unknown,
//                major_updates, minor_updates, patch_updates, other_updates }
//   }
//
// Tudo é lido de forma defensiva: o schema pode variar entre versões do Cup,
// e os totais são recalculados a partir de "images" quando faltam em "metrics".
// A mesma "reference" pode aparecer várias vezes (uma por servidor/agente),
// por isso o id de cada item inclui o servidor.

const hasUpdate = (i: any) => i?.result?.has_update === true
const isUnknown = (i: any) => i?.result?.has_update == null
const kindOf = (i: any): string | undefined => i?.result?.info?.version_update_type
const isDigest = (i: any) => hasUpdate(i) && i?.result?.info?.type === 'digest'

// Severidade para ordenar dentro do grupo "com atualização": major primeiro
const severity = (i: any): number => ({ major: 0, minor: 1, patch: 2 } as Record<string, number>)[kindOf(i) ?? ''] ?? 3

const rank = { warn: 0, idle: 1, down: 1, up: 2 } as const

export const cup = (c: ServiceConfig): ServiceAdapter => ({
  async snapshot() {
    const data = await getJson(c, '/api/v3/json')
    const images: any[] = Array.isArray(data?.images) ? data.images : []
    const m = data?.metrics ?? {}

    const monitored = m.monitored_images ?? images.length
    const updates = m.updates_available ?? m.update_available ?? images.filter(hasUpdate).length
    const upToDate = m.up_to_date ?? images.filter((i) => !hasUpdate(i) && !isUnknown(i)).length
    const unknown = m.unknown ?? images.filter(isUnknown).length

    const major = m.major_updates ?? images.filter((i) => hasUpdate(i) && kindOf(i) === 'major').length
    const minor = m.minor_updates ?? images.filter((i) => hasUpdate(i) && kindOf(i) === 'minor').length
    const patch = m.patch_updates ?? images.filter((i) => hasUpdate(i) && kindOf(i) === 'patch').length
    const digest = m.other_updates ?? images.filter(isDigest).length

    const items: DetailItem[] = images.map((img, idx) => {
      const info = img?.result?.info ?? {}

      // O subtítulo é truncado no painel lateral, então o que não pode se perder vem primeiro:
      // nome do agente (só quando não é o host local), depois a versão, depois "sem uso".
      const notInUse = img?.in_use === false ? t('upd.notInUse') : null

      let detail: string | undefined
      let trailing: string | undefined
      if (hasUpdate(img)) {
        if (info.type === 'digest') {
          detail = t('upd.digest')
          trailing = t('upd.digestShort')
        } else {
          // Usa a tag completa (ex.: "15-alpine" → "18-alpine"), não só o número da versão
          const from = img?.parts?.tag ?? info.current_version
          const to = info.new_tag ?? info.new_version
          detail = from && to ? t('upd.fromTo', { from, to }) : to ? t('upd.newVersion', { to }) : t('upd.availableOne')
          const kind = kindOf(img)
          if (kind === 'major' || kind === 'minor' || kind === 'patch') trailing = t(`upd.${kind}`)
        }
      }

      // Para imagens com problema, mostra o erro real do Cup quando existir
      const base = isUnknown(img) ? img?.result?.error || t('upd.cantCheck') : detail

      return {
        id: `${img?.reference ?? idx}@${img?.server ?? 'local'}`, // mesma regra de keyOf, definida abaixo
        title: String(img?.reference ?? '?'),
        subtitle: [img?.server, base, notInUse].filter(Boolean).join(' · ') || undefined,
        trailing,
        status: hasUpdate(img) ? 'warn' : isUnknown(img) ? 'idle' : 'up',
      }
    })

    // Ordem (igual à UI do Cup): host local primeiro, depois cada agente por nome.
    // Dentro de cada servidor: com atualização → desconhecidas → em dia.
    // Dentro de "com atualização", major antes de minor/patch/digest;
    // desempate por título para a lista ser previsível.
    const keyOf = (img: any, idx: number) => `${img?.reference ?? idx}@${img?.server ?? 'local'}`
    const sevById = new Map<string, number>(images.map((img, idx) => [keyOf(img, idx), severity(img)]))
    const serverById = new Map<string, string>(images.map((img, idx) => [keyOf(img, idx), img?.server ?? '']))
    items.sort(
      (a, b) =>
        (serverById.get(a.id) ?? '').localeCompare(serverById.get(b.id) ?? '') || // '' (local) vem primeiro
        rank[a.status as keyof typeof rank] - rank[b.status as keyof typeof rank] ||
        (sevById.get(a.id) ?? 3) - (sevById.get(b.id) ?? 3) ||
        a.title.localeCompare(b.title),
    )

    const checked = data?.last_updated ? fmtAgo(data.last_updated) : '-'

    // Detalhamento dos updates (só mostra os tipos que existem)
    const breakdown = [
      major > 0 ? `${major} ${t('upd.major')}` : null,
      minor > 0 ? `${minor} ${t('upd.minor')}` : null,
      patch > 0 ? `${patch} ${t('upd.patch')}` : null,
      digest > 0 ? `${digest} ${t('upd.digestShort')}` : null,
    ]
      .filter(Boolean)
      .join(' · ')

    return {
      health: 'ok',
      stats: [
        {
          label: t('upd.monitoredImages'), value: fmtNumber(monitored), icon: 'local_cafe', tone: 'primary',
          hint: checked !== '-' ? t('upd.checked', { ago: checked }) : undefined,
        },
        {
          label: t('upd.available'), value: fmtNumber(updates), icon: 'system_update_alt',
          tone: updates > 0 ? 'tertiary' : 'neutral',
          hint: breakdown || undefined,
        },
        { label: t('upd.upToDate'), value: fmtNumber(upToDate), icon: 'check_circle', tone: 'secondary' },
        { label: t('upd.unknown'), value: fmtNumber(unknown), icon: 'help', tone: 'neutral' },
      ],
      itemsTitle: t('upd.images'),
      emptyText: t('cup.empty'),
      items,
    }
  },
  actions: [
    {
      id: 'refresh',
      label: t('upd.checkNow'),
      icon: 'refresh',
      run: async () => {
        // A verificação consulta os registries e pode demorar.
        // A resposta é só "OK" em texto: não fazer parse como JSON.
        await request(c, '/api/v3/refresh', { timeoutMs: 120_000 })
        return t('upd.checkDone')
      },
    },
  ],
})