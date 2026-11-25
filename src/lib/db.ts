/**
 * Couche d'accès aux données.
 * - Mode "supabase" : données en ligne, accessibles depuis tous vos appareils.
 * - Mode "démo" : données stockées dans ce navigateur uniquement (pour essayer l'app
 *   avant que Supabase soit configuré). Activé automatiquement si les variables
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY sont absentes.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Settings, TableName, Tables } from './types'
import { DEFAULT_SETTINGS, DEFAULT_ACTIVITIES } from './defaults'

type Row<T extends TableName> = Tables[T]
type Filters = Record<string, string | number | boolean | null>

export interface ListOptions {
  eq?: Filters
  order?: string
  ascending?: boolean
}

export interface Backend {
  mode: 'supabase' | 'demo'
  currentUser(): Promise<{ id: string; email: string } | null>
  onAuthChange(cb: () => void): () => void
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  list<T extends TableName>(table: T, opts?: ListOptions): Promise<Row<T>[]>
  insert<T extends TableName>(table: T, row: Partial<Row<T>>): Promise<Row<T>>
  insertMany<T extends TableName>(table: T, rows: Partial<Row<T>>[], ignoreDuplicatesOn?: string): Promise<number>
  update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<Row<T>>
  remove(table: TableName, id: string): Promise<void>
  getSettings(): Promise<Settings>
  saveSettings(patch: Partial<Settings>): Promise<Settings>
  nextNumber(series: string): Promise<number>
  uploadFile(path: string, file: Blob): Promise<string>
  fileUrl(path: string): Promise<string>
  removeFile(path: string): Promise<void>
}

/* ------------------------------------------------------------------ */
/* Supabase                                                            */
/* ------------------------------------------------------------------ */

class SupabaseBackend implements Backend {
  mode = 'supabase' as const
  private sb: SupabaseClient
  constructor(url: string, key: string) {
    this.sb = createClient(url, key)
  }
  private async uid() {
    const u = await this.currentUser()
    if (!u) throw new Error('Non connecté')
    return u.id
  }
  async currentUser() {
    const { data } = await this.sb.auth.getSession()
    const u = data.session?.user
    return u ? { id: u.id, email: u.email ?? '' } : null
  }
  onAuthChange(cb: () => void) {
    const { data } = this.sb.auth.onAuthStateChange(() => cb())
    return () => data.subscription.unsubscribe()
  }
  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message)
  }
  async signOut() {
    await this.sb.auth.signOut()
  }
  async list<T extends TableName>(table: T, opts: ListOptions = {}) {
    let q = this.sb.from(table).select('*')
    for (const [k, v] of Object.entries(opts.eq ?? {})) q = v === null ? q.is(k, null) : q.eq(k, v)
    if (opts.order) q = q.order(opts.order, { ascending: opts.ascending ?? true })
    const { data, error } = await q
    if (error) throw error
    return data as Row<T>[]
  }
  async insert<T extends TableName>(table: T, row: Partial<Row<T>>) {
    const { data, error } = await this.sb.from(table).insert(row as never).select().single()
    if (error) throw error
    return data as Row<T>
  }
  async insertMany<T extends TableName>(table: T, rows: Partial<Row<T>>[], ignoreDuplicatesOn?: string) {
    if (!rows.length) return 0
    const q = ignoreDuplicatesOn
      ? this.sb.from(table).upsert(rows as never, { onConflict: `user_id,${ignoreDuplicatesOn}`, ignoreDuplicates: true }).select('id')
      : this.sb.from(table).insert(rows as never).select('id')
    const { data, error } = await q
    if (error) throw error
    return data?.length ?? 0
  }
  async update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>) {
    const { data, error } = await this.sb.from(table).update(patch as never).eq('id', id).select().single()
    if (error) throw error
    return data as Row<T>
  }
  async remove(table: TableName, id: string) {
    const { error } = await this.sb.from(table).delete().eq('id', id)
    if (error) throw error
  }
  async getSettings() {
    const uid = await this.uid()
    const { data, error } = await this.sb.from('settings').select('*').eq('user_id', uid).maybeSingle()
    if (error) throw error
    if (data) return { ...DEFAULT_SETTINGS, ...data } as Settings
    // Première connexion : on crée les paramètres et les activités par défaut
    const { data: created, error: e2 } = await this.sb.from('settings').insert({}).select().single()
    if (e2) throw e2
    await this.sb.from('activities').insert(DEFAULT_ACTIVITIES)
    return { ...DEFAULT_SETTINGS, ...created } as Settings
  }
  async saveSettings(patch: Partial<Settings>) {
    const uid = await this.uid()
    const { data, error } = await this.sb
      .from('settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', uid)
      .select()
      .single()
    if (error) throw error
    return { ...DEFAULT_SETTINGS, ...data } as Settings
  }
  async nextNumber(series: string) {
    const { data, error } = await this.sb.rpc('next_number', { p_series: series })
    if (error) throw error
    return data as number
  }
  async uploadFile(path: string, file: Blob) {
    const full = `${await this.uid()}/${path}`
    const { error } = await this.sb.storage.from('files').upload(full, file, { upsert: true })
    if (error) throw error
    return full
  }
  async fileUrl(path: string) {
    const { data, error } = await this.sb.storage.from('files').createSignedUrl(path, 60 * 60)
    if (error) throw error
    return data.signedUrl
  }
  async removeFile(path: string) {
    await this.sb.storage.from('files').remove([path])
  }
}

/* ------------------------------------------------------------------ */
/* Démo (stockage local du navigateur)                                 */
/* ------------------------------------------------------------------ */

interface DemoStore {
  user: { id: string; email: string } | null
  settings: Settings | null
  series: Record<string, number>
  tables: Partial<Record<TableName, Record<string, unknown>[]>>
}

const DEMO_KEY = 'gestion-freelance-demo'

class DemoBackend implements Backend {
  mode = 'demo' as const
  private listeners = new Set<() => void>()
  private read(): DemoStore {
    try {
      const raw = localStorage.getItem(DEMO_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* stockage indisponible */
    }
    return { user: null, settings: null, series: {}, tables: {} }
  }
  private write(s: DemoStore) {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(s))
    } catch {
      throw new Error('Stockage du navigateur plein ou indisponible.')
    }
  }
  private rows(s: DemoStore, t: TableName) {
    return (s.tables[t] ??= [])
  }
  async currentUser() {
    return this.read().user
  }
  onAuthChange(cb: () => void) {
    this.listeners.add(cb)
    return () => {
      this.listeners.delete(cb)
    }
  }
  async signIn(email: string) {
    const s = this.read()
    s.user = { id: 'demo-user', email: email || 'demo@exemple.fr' }
    this.write(s)
    this.listeners.forEach((l) => l())
  }
  async signOut() {
    const s = this.read()
    s.user = null
    this.write(s)
    this.listeners.forEach((l) => l())
  }
  async list<T extends TableName>(table: T, opts: ListOptions = {}) {
    let rows = [...this.rows(this.read(), table)]
    for (const [k, v] of Object.entries(opts.eq ?? {})) rows = rows.filter((r) => (r[k] ?? null) === v)
    if (opts.order) {
      const k = opts.order
      const dir = opts.ascending === false ? -1 : 1
      rows.sort((a, b) => String(a[k] ?? '').localeCompare(String(b[k] ?? '')) * dir)
    }
    return rows as unknown as Row<T>[]
  }
  async insert<T extends TableName>(table: T, row: Partial<Row<T>>) {
    const s = this.read()
    const full = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row }
    this.rows(s, table).push(full)
    this.write(s)
    return full as unknown as Row<T>
  }
  async insertMany<T extends TableName>(table: T, rows: Partial<Row<T>>[], ignoreDuplicatesOn?: string) {
    const s = this.read()
    const existing = this.rows(s, table)
    let n = 0
    for (const r of rows) {
      const rec = r as Record<string, unknown>
      if (ignoreDuplicatesOn && existing.some((e) => e[ignoreDuplicatesOn] === rec[ignoreDuplicatesOn])) continue
      existing.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...rec })
      n++
    }
    this.write(s)
    return n
  }
  async update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>) {
    const s = this.read()
    const rows = this.rows(s, table)
    const i = rows.findIndex((r) => r.id === id)
    if (i < 0) throw new Error('Élément introuvable')
    rows[i] = { ...rows[i], ...patch }
    this.write(s)
    return rows[i] as unknown as Row<T>
  }
  async remove(table: TableName, id: string) {
    const s = this.read()
    s.tables[table] = this.rows(s, table).filter((r) => r.id !== id)
    this.write(s)
  }
  async getSettings() {
    const s = this.read()
    if (!s.settings) {
      s.settings = { ...DEFAULT_SETTINGS }
      s.tables.activities = DEFAULT_ACTIVITIES.map((a) => ({ id: crypto.randomUUID(), ...a }))
      this.write(s)
    }
    return { ...DEFAULT_SETTINGS, ...s.settings }
  }
  async saveSettings(patch: Partial<Settings>) {
    const s = this.read()
    s.settings = { ...DEFAULT_SETTINGS, ...s.settings, ...patch }
    this.write(s)
    return s.settings
  }
  async nextNumber(series: string) {
    const s = this.read()
    s.series[series] = (s.series[series] ?? 0) + 1
    this.write(s)
    return s.series[series]
  }
  async uploadFile(path: string, file: Blob) {
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = () => rej(r.error)
      r.readAsDataURL(file)
    })
    try {
      localStorage.setItem(`${DEMO_KEY}:file:${path}`, dataUrl)
    } catch {
      throw new Error('Fichier trop lourd pour le mode démo.')
    }
    return path
  }
  async fileUrl(path: string) {
    return localStorage.getItem(`${DEMO_KEY}:file:${path}`) ?? ''
  }
  async removeFile(path: string) {
    localStorage.removeItem(`${DEMO_KEY}:file:${path}`)
  }
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const db: Backend = url && key ? new SupabaseBackend(url, key) : new DemoBackend()
