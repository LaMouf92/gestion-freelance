import type { Activity, Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  full_name: '',
  trade_name: '',
  address: '',
  siret: '',
  email: '',
  phone: '',
  iban: '',
  bic: '',
  website: '',
  tva_enabled: false,
  tva_rate: 20,
  tva_number: '',
  invoice_prefix: 'GA',
  quote_prefix: 'DA',
  quote_validity_days: 30,
  payment_terms_days: 30,
  payment_terms: 'Paiement à 30 jours par virement bancaire.',
  late_penalty_text:
    "En cas de retard de paiement, des pénalités au taux de 3 fois le taux d'intérêt légal seront exigibles, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (clients professionnels).",
  footer_note: '',
  micro_threshold: 77700,
  logo_path: null,
}

/** Taux 2026 indicatifs — à vérifier sur autoentrepreneur.urssaf.fr */
export const CATEGORY_PRESETS: Record<Activity['category'], { label: string; rate: number; cfp: number }> = {
  BNC: { label: 'Prestations libérales (BNC)', rate: 26.1, cfp: 0.2 },
  BIC_services: { label: 'Prestations de services commerciales (BIC)', rate: 21.2, cfp: 0.1 },
  BIC_vente: { label: 'Vente de marchandises (BIC)', rate: 12.3, cfp: 0.1 },
}

export const DEFAULT_ACTIVITIES: Omit<Activity, 'id'>[] = [
  { name: 'Graphisme', color: '#0203e9', category: 'BNC', contribution_rate: 26.1, cfp_rate: 0.2, notes: '', archived: false },
  {
    name: 'Sudal Care',
    color: '#00a37a',
    category: 'BNC',
    contribution_rate: 26.1,
    cfp_rate: 0.2,
    notes: "Catégorie à confirmer avec l'Urssaf (BNC ou BIC selon la nature de la vente de l'app).",
    archived: false,
  },
]
