export type UUID = string

export interface Settings {
  user_id?: UUID
  full_name: string
  trade_name: string
  address: string
  siret: string
  email: string
  phone: string
  iban: string
  bic: string
  website: string
  tva_enabled: boolean
  tva_rate: number
  tva_number: string
  invoice_prefix: string
  quote_prefix: string
  quote_validity_days: number
  payment_terms_days: number
  payment_terms: string
  late_penalty_text: string
  footer_note: string
  micro_threshold: number
  logo_path: string | null
}

export type ActivityCategory = 'BNC' | 'BIC_services' | 'BIC_vente'

export interface Activity {
  id: UUID
  name: string
  color: string
  category: ActivityCategory
  contribution_rate: number
  cfp_rate: number
  notes: string
  archived: boolean
}

export interface Client {
  id: UUID
  type: 'pro' | 'particulier'
  name: string
  contact_name: string
  email: string
  phone: string
  address: string
  siret: string
  tva_number: string
  notes: string
  created_at?: string
}

export type ProjectStatus = 'prospect' | 'devis' | 'en_cours' | 'livre' | 'paye' | 'archive'

export interface Project {
  id: UUID
  activity_id: UUID | null
  client_id: UUID | null
  title: string
  status: ProjectStatus
  start_date: string | null
  due_date: string | null
  delivered_date: string | null
  brief: string
  deliverables: string
  revisions_included: number
  revisions_done: number
  time_spent_hours: number
  estimated_amount: number | null
  links: { label: string; url: string }[]
  rights_assignment: string
  notes: string
  created_at?: string
}

export interface Milestone {
  id: UUID
  project_id: UUID
  title: string
  date: string
  done: boolean
}

export interface DocLine {
  description: string
  qty: number
  unit: string
  unit_price: number
}

export type DocKind = 'devis' | 'facture' | 'acompte'
export type DocStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'paye' | 'annule'

export interface Doc {
  id: UUID
  kind: DocKind
  source: 'app' | 'indy'
  number: string | null
  status: DocStatus
  project_id: UUID | null
  client_id: UUID | null
  activity_id: UUID | null
  parent_id: UUID | null
  issue_date: string
  due_date: string | null
  title: string
  lines: DocLine[]
  deposit_percent: number | null
  deposits_deducted: { document_id: UUID; number: string; amount: number }[]
  tva_rate: number
  total_ht: number
  total_tva: number
  total_ttc: number
  notes: string
  client_snapshot: Partial<Client> | null
  issuer_snapshot: Partial<Settings> | null
  file_path: string | null
  created_at?: string
}

export interface Transaction {
  id: UUID
  date: string
  label: string
  amount: number
  category: string
  activity_id: UUID | null
  notes: string
  import_hash: string | null
  raw: Record<string, string> | null
}

export interface Payment {
  id: UUID
  activity_id: UUID | null
  document_id: UUID | null
  transaction_id: UUID | null
  amount: number
  paid_on: string
  method: string
  notes: string
}

export interface UrssafDeclaration {
  id: UUID
  period: string
  activity_id: UUID | null
  declared_revenue: number
  contribution_amount: number
  declared_on: string | null
  paid_amount: number
  paid_on: string | null
  notes: string
}

export interface ProjectFile {
  id: UUID
  project_id: UUID | null
  name: string
  path: string
  created_at?: string
}

export interface Tables {
  activities: Activity
  clients: Client
  projects: Project
  milestones: Milestone
  documents: Doc
  transactions: Transaction
  payments: Payment
  urssaf_declarations: UrssafDeclaration
  project_files: ProjectFile
}

export type TableName = keyof Tables
