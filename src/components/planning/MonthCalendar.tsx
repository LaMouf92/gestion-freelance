import { useMemo, useState } from 'react'
import { toIso, today } from '../../lib/format'
import type { PlanningProject } from './model'

interface CalEvent {
  key: string
  projectId: string
  label: string
  color: string
  kind: 'debut' | 'rendu' | 'etape'
  done?: boolean
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** Calendrier mensuel : débuts, rendus et échéances de chaque projet. */
export function MonthCalendar({ items, onOpen, onCreateAt }: { items: PlanningProject[]; onOpen: (id: string) => void; onCreateAt: (iso: string) => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1, 12)
  })

  const days = useMemo(() => {
    const first = new Date(cursor)
    const shift = (first.getDay() + 6) % 7 // lundi = 0
    const startD = new Date(first.getFullYear(), first.getMonth(), 1 - shift, 12)
    const out: Date[] = []
    for (let i = 0; i < 42; i++) out.push(new Date(startD.getFullYear(), startD.getMonth(), startD.getDate() + i, 12))
    // n'affiche pas une 6e semaine entièrement dans le mois suivant
    return out[35].getMonth() !== cursor.getMonth() ? out.slice(0, 35) : out
  }, [cursor])

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    const push = (d: string | null, e: CalEvent) => {
      if (!d) return
      map.set(d, [...(map.get(d) ?? []), e])
    }
    for (const { project: p, color, milestones } of items) {
      push(p.start_date, { key: p.id + 's', projectId: p.id, label: p.title, color, kind: 'debut' })
      push(p.due_date, { key: p.id + 'd', projectId: p.id, label: p.title, color, kind: 'rendu', done: ['livre', 'paye', 'archive'].includes(p.status) })
      for (const m of milestones) push(m.date, { key: m.id, projectId: p.id, label: `${m.title} · ${p.title}`, color, kind: 'etape', done: m.done })
    }
    return map
  }, [items])

  const t = today()
  const move = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1, 12))

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', justifyContent: 'space-between' }}>
        <h2 style={{ textTransform: 'capitalize' }}>{cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn sm" onClick={() => move(-1)} aria-label="Mois précédent">‹</button>
          <button className="btn sm" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12))}>Aujourd'hui</button>
          <button className="btn sm" onClick={() => move(1)} aria-label="Mois suivant">›</button>
        </div>
      </div>
      <div className="cal">
        {WEEKDAYS.map((w) => <div key={w} className="cal-head">{w}</div>)}
        {days.map((d) => {
          const iso = toIso(d)
          const evs = byDay.get(iso) ?? []
          const out = d.getMonth() !== cursor.getMonth()
          return (
            <div key={iso} className={`cal-day${out ? ' out' : ''}${iso === t ? ' today' : ''}`} onClick={() => onCreateAt(iso)}>
              <span className="cal-num">{d.getDate()}</span>
              <div className="cal-events">
                {evs.map((e) => (
                  <button
                    key={e.key}
                    className={`cal-ev ${e.kind}${e.done ? ' done' : ''}`}
                    style={{ ['--c' as string]: e.color }}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onOpen(e.projectId)
                    }}
                    title={`${e.kind === 'rendu' ? 'Rendu' : e.kind === 'debut' ? 'Début' : 'Échéance'} : ${e.label}`}
                  >
                    {e.kind === 'rendu' ? '⚑ ' : e.kind === 'etape' ? '◆ ' : ''}{e.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="row small muted" style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', gap: 16 }}>
        <span>⚑ Rendu</span><span>◆ Échéance</span><span>Sans symbole : début du projet</span><span>Cliquez sur un jour pour créer un projet</span>
      </div>
    </div>
  )
}
