import { useEffect, useMemo, useRef, useState } from 'react'
import { dateFr, toIso } from '../../lib/format'
import { PROJECT_STATUS } from '../../lib/labels'
import { DAY, daysBetween, parseDay, projectRange, type PlanningProject } from './model'

const SPANS = [3, 6, 12] as const
const LABEL_W = typeof window !== 'undefined' && window.innerWidth < 600 ? 130 : 200
const DAY_WIDTH: Record<(typeof SPANS)[number], number> = { 3: 14, 6: 8, 12: 4 }

/** Frise chronologique : une ligne par projet, une barre de la date de début à la date de rendu. */
export function Timeline({ items, onOpen }: { items: PlanningProject[]; onOpen: (id: string) => void }) {
  const [span, setSpan] = useState<(typeof SPANS)[number]>(6)
  const [offset, setOffset] = useState(0) // décalage en mois
  const scroller = useRef<HTMLDivElement>(null)

  const { start, end, months } = useMemo(() => {
    const now = new Date()
    const s = new Date(now.getFullYear(), now.getMonth() - 1 + offset, 1, 12)
    const e = new Date(s.getFullYear(), s.getMonth() + span, 1, 12)
    const ms: Date[] = []
    for (let d = new Date(s); d < e; d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)) ms.push(d)
    return { start: s, end: e, months: ms }
  }, [span, offset])

  const dw = DAY_WIDTH[span]
  const totalDays = daysBetween(start, end)
  const width = totalDays * dw
  const x = (iso: string) => daysBetween(start, parseDay(iso)) * dw
  const todayX = daysBetween(start, new Date()) * dw

  const visible = items.filter(({ project }) => {
    const [a, b] = projectRange(project)
    return b >= toIso(start) && a < toIso(end)
  })

  // Centre la vue sur aujourd'hui au premier affichage
  useEffect(() => {
    if (scroller.current && offset === 0) scroller.current.scrollLeft = Math.max(0, todayX - 120)
  }, [todayX, offset])

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', justifyContent: 'space-between' }}>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn sm" onClick={() => setOffset((o) => o - span)} aria-label="Période précédente">‹</button>
          <button className="btn sm" onClick={() => setOffset(0)}>Aujourd'hui</button>
          <button className="btn sm" onClick={() => setOffset((o) => o + span)} aria-label="Période suivante">›</button>
        </div>
        <div className="segmented small">
          {SPANS.map((s) => (
            <button key={s} className={span === s ? 'active' : ''} onClick={() => setSpan(s)}>{s} mois</button>
          ))}
        </div>
      </div>

      <div className="timeline" ref={scroller}>
        <div style={{ width: width + LABEL_W, position: 'relative' }}>
          <div className="tl-months">
            <div className="tl-label-col" />
            {months.map((m) => {
              const next = new Date(m.getFullYear(), m.getMonth() + 1, 1, 12)
              return (
                <div key={m.toISOString()} className="tl-month" style={{ width: Math.round((next.getTime() - m.getTime()) / DAY) * dw }}>
                  {m.toLocaleDateString('fr-FR', { month: span === 12 ? 'short' : 'long', year: m.getMonth() === 0 || span !== 12 ? 'numeric' : undefined })}
                </div>
              )
            })}
          </div>

          <div className="tl-body">
            {todayX >= 0 && todayX <= width && <div className="tl-today" style={{ left: LABEL_W + todayX }} title="Aujourd'hui" />}
            {visible.length === 0 && <div className="muted small" style={{ padding: 24 }}>Aucun projet sur cette période.</div>}
            {visible.map(({ project: p, color, clientName, milestones }) => {
              const [a, b] = projectRange(p)
              const left = Math.max(0, x(a))
              const right = Math.min(width, x(b) + dw)
              return (
                <div key={p.id} className="tl-row">
                  <button className="tl-label-col tl-label" onClick={() => onOpen(p.id)} title={p.title}>
                    <span className="swatch" style={{ background: color }} />
                    <span className="tl-label-text">
                      <strong>{p.title}</strong>
                      <small>{clientName || PROJECT_STATUS[p.status].label}</small>
                    </span>
                  </button>
                  <div className="tl-track">
                    <button
                      className={`tl-bar status-${p.status}`}
                      style={{ left, width: Math.max(right - left, 8), background: color }}
                      onClick={() => onOpen(p.id)}
                      title={`${p.title} — ${dateFr(a)} → ${dateFr(b)}`}
                    >
                      {right - left > 90 && <span>{PROJECT_STATUS[p.status].label}</span>}
                    </button>
                    {milestones.map((m) => {
                      const mx = x(m.date)
                      if (mx < 0 || mx > width) return null
                      return <span key={m.id} className={`tl-milestone${m.done ? ' done' : ''}`} style={{ left: mx + dw / 2 }} title={`${m.title} — ${dateFr(m.date)}`} />
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
