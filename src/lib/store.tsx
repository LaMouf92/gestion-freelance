import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { db, type ListOptions } from './db'
import type { Activity, Settings, TableName, Tables } from './types'

/* ---------- Session + paramètres globaux ---------- */

interface AppState {
  user: { id: string; email: string } | null
  loading: boolean
  settings: Settings | null
  activities: Activity[]
  refreshSettings(): Promise<void>
  refreshActivities(): Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppState['user']>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])

  const refreshSettings = useCallback(async () => setSettings(await db.getSettings()), [])
  const refreshActivities = useCallback(async () => setActivities(await db.list('activities', { order: 'name' })), [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      const u = await db.currentUser()
      if (!alive) return
      setUser(u)
      if (u) {
        const s = await db.getSettings()
        const a = await db.list('activities', { order: 'name' })
        if (!alive) return
        setSettings(s)
        setActivities(a)
      } else {
        setSettings(null)
        setActivities([])
      }
      setLoading(false)
    }
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
    const off = db.onAuthChange(() => void load())
    return () => {
      alive = false
      off()
    }
  }, [])

  return (
    <Ctx.Provider value={{ user, loading, settings, activities, refreshSettings, refreshActivities }}>
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp hors AppProvider')
  return v
}

/* ---------- Chargement d'une table, avec rechargement global ---------- */

const bus = new EventTarget()
/** Prévient tous les écrans qu'une table a changé */
export const notifyChange = (table: TableName) => bus.dispatchEvent(new Event(table))

export function useTable<T extends TableName>(table: T, opts?: ListOptions) {
  const [rows, setRows] = useState<Tables[T][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const key = JSON.stringify(opts ?? {})

  const reload = useCallback(async () => {
    try {
      setRows(await db.list(table, JSON.parse(key)))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [table, key])

  useEffect(() => {
    void reload()
    const h = () => void reload()
    bus.addEventListener(table, h)
    return () => bus.removeEventListener(table, h)
  }, [table, reload])

  return { rows, loading, error, reload }
}
