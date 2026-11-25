const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const eur0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export const money = (n: number | null | undefined) => eur.format(n ?? 0)
export const money0 = (n: number | null | undefined) => eur0.format(n ?? 0)

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Date ISO (AAAA-MM-JJ) → "25 nov. 2026" */
export function dateFr(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
  return d.toLocaleDateString('fr-FR', opts)
}

export function monthFr(iso: string) {
  return dateFr(iso, { month: 'long', year: 'numeric' })
}

/** Date locale du jour au format AAAA-MM-JJ */
export function today() {
  return toIso(new Date())
}

export function toIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toIso(d)
}
