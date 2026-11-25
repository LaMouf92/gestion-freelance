/**
 * Calculs financiers partagés (calendrier, tableau de bord, Urssaf).
 * En micro-entreprise, le CA déclaré à l'Urssaf est le CA HT ENCAISSÉ
 * (sommes réellement reçues dans le mois), pas le CA facturé.
 */
import type { Doc, Payment, Project } from './types'

/** "2026-11" pour une date ISO ou un objet Date */
export const monthKey = (d: string | Date) =>
  typeof d === 'string' ? d.slice(0, 7) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const ACTIVE_DOC = (d: Doc) => !['brouillon', 'annule', 'refuse'].includes(d.status)

/** Part HT d'un montant TTC encaissé sur une facture (identique si pas de TVA) */
function htShare(doc: Doc | undefined, amount: number) {
  if (!doc || !doc.total_ttc || doc.total_ttc === doc.total_ht) return amount
  return amount * (doc.total_ht / doc.total_ttc)
}

/** CA encaissé (HT) sur un mois = ce qu'il faut déclarer à l'Urssaf pour ce mois */
export function collectedInMonth(month: string, payments: Payment[], docs: Doc[], activityId?: string) {
  return payments
    .filter((p) => monthKey(p.paid_on) === month && (!activityId || p.activity_id === activityId))
    .reduce((s, p) => s + htShare(docs.find((d) => d.id === p.document_id), p.amount), 0)
}

/**
 * CA estimé d'un mois =
 *   CA déjà encaissé ce mois-ci
 * + factures émises non soldées dont l'échéance tombe ce mois-ci
 * + devis envoyés/acceptés pas encore facturés, rattachés au mois de rendu du projet
 * + montant estimé des projets en cours sans devis, au mois de rendu
 * Les mois passés n'affichent que l'encaissé (le reste est en retard, plus une prévision).
 */
export function estimatedForMonth(month: string, todayIso: string, projects: Project[], docs: Doc[], payments: Payment[]) {
  const collected = collectedInMonth(month, payments, docs)
  const currentMonth = monthKey(todayIso)
  if (month < currentMonth) return { total: collected, collected, pending: 0 }

  // Mois de référence : les sommes en retard sont reportées sur le mois en cours
  const targetMonth = (iso: string | null | undefined) => {
    if (!iso) return null
    const m = monthKey(iso)
    return m < currentMonth ? currentMonth : m
  }
  const paidOn = (docId: string) => payments.filter((p) => p.document_id === docId).reduce((s, p) => s + p.amount, 0)
  const projectById = new Map(projects.map((p) => [p.id, p]))
  let pending = 0

  // 1. Factures (et acomptes) émises, non soldées
  for (const d of docs) {
    if (d.kind === 'devis' || !ACTIVE_DOC(d) || d.status === 'paye') continue
    const remainingTtc = d.total_ttc - paidOn(d.id)
    if (remainingTtc <= 0.005) continue
    if (targetMonth(d.due_date ?? d.issue_date) === month) pending += htShare(d, remainingTtc)
  }

  // 2. Devis en cours, déduction faite de ce qui a déjà été facturé à partir d'eux
  const quotedProjects = new Set<string>()
  for (const q of docs) {
    if (q.kind !== 'devis' || !['envoye', 'accepte'].includes(q.status)) continue
    const project = q.project_id ? projectById.get(q.project_id) : undefined
    if (project) quotedProjects.add(project.id)
    if (project && ['paye', 'archive'].includes(project.status)) continue
    const invoiced = docs.filter((d) => d.parent_id === q.id && ACTIVE_DOC(d)).reduce((s, d) => s + d.total_ht, 0)
    const remaining = q.total_ht - invoiced
    if (remaining <= 0.005) continue
    if (targetMonth(project?.due_date ?? q.due_date ?? q.issue_date) === month) pending += remaining
  }

  // 3. Projets en cours sans devis, avec un montant estimé
  for (const p of projects) {
    if (quotedProjects.has(p.id) || !p.estimated_amount) continue
    if (!['devis', 'en_cours', 'livre'].includes(p.status)) continue
    if (docs.some((d) => d.project_id === p.id && d.kind !== 'devis' && ACTIVE_DOC(d))) continue
    if (targetMonth(p.due_date) === month) pending += p.estimated_amount
  }

  return { total: collected + pending, collected, pending }
}
