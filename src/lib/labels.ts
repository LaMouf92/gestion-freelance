import type { DocKind, DocStatus, ProjectStatus } from './types'

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: string }> = {
  prospect: { label: 'Prospect', tone: '' },
  devis: { label: 'Devis envoyé', tone: 'warn' },
  en_cours: { label: 'En cours', tone: 'brand' },
  livre: { label: 'Livré', tone: 'ok' },
  paye: { label: 'Payé', tone: 'ok' },
  archive: { label: 'Archivé', tone: '' },
}

export const DOC_KIND: Record<DocKind, string> = {
  devis: 'Devis',
  facture: 'Facture',
  acompte: "Facture d'acompte",
}

export const DOC_STATUS: Record<DocStatus, { label: string; tone: string }> = {
  brouillon: { label: 'Brouillon', tone: '' },
  envoye: { label: 'Envoyé', tone: 'brand' },
  accepte: { label: 'Accepté', tone: 'ok' },
  refuse: { label: 'Refusé', tone: 'danger' },
  paye: { label: 'Payé', tone: 'ok' },
  annule: { label: 'Annulé', tone: '' },
}
