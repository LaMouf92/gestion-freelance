/**
 * Planning : deux vues interchangeables (frise et calendrier).
 * Chaque vue est un composant indépendant qui reçoit les mêmes "événements",
 * ce qui permet de modifier facilement l'aspect de l'une sans toucher au reste.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, useTable } from '../lib/store'
import { PageHead } from '../components/ui'
import { Icon } from '../components/Icon'
import { Timeline } from '../components/planning/Timeline'
import { MonthCalendar } from '../components/planning/MonthCalendar'
import type { PlanningProject } from '../components/planning/model'
import { NewProjectModal } from './Projects'
import { collectedInMonth, estimatedForMonth, monthKey } from '../lib/finance'
import { money0, today } from '../lib/format'

type View = 'frise' | 'calendrier'
const VIEW_KEY = 'planning-view'

function readView(): View {
  try {
    return (localStorage.getItem(VIEW_KEY) as View) || 'frise'
  } catch {
    return 'frise'
  }
}

export function Planning() {
  const { activities } = useApp()
  const { rows: projects } = useTable('projects')
  const { rows: milestones } = useTable('milestones')
  const { rows: clients } = useTable('clients', { order: 'name' })
  const { rows: docs } = useTable('documents')
  const { rows: payments } = useTable('payments')
  const [view, setView] = useState<View>(readView)
  const [showArchived, setShowArchived] = useState(false)
  const [newAt, setNewAt] = useState<string | null>(null)
  const navigate = useNavigate()

  const changeView = (v: View) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* ignore */
    }
  }

  const items: PlanningProject[] = useMemo(
    () =>
      projects
        .filter((p) => showArchived || !['archive'].includes(p.status))
        .filter((p) => p.start_date || p.due_date)
        .map((p) => ({
          project: p,
          color: activities.find((a) => a.id === p.activity_id)?.color ?? '#8a8aa0',
          clientName: clients.find((c) => c.id === p.client_id)?.name ?? '',
          milestones: milestones.filter((m) => m.project_id === p.id),
        }))
        .sort((a, b) => (a.project.start_date ?? a.project.due_date ?? '').localeCompare(b.project.start_date ?? b.project.due_date ?? '')),
    [projects, milestones, clients, activities, showArchived],
  )

  const open = (id: string) => navigate(`/projets/${id}`)

  return (
    <>
      <PageHead title="Planning" sub="Vos projets dans le temps.">
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={view === 'frise'} className={view === 'frise' ? 'active' : ''} onClick={() => changeView('frise')}>Frise</button>
          <button role="tab" aria-selected={view === 'calendrier'} className={view === 'calendrier' ? 'active' : ''} onClick={() => changeView('calendrier')}>Calendrier</button>
        </div>
        <button className="btn primary" onClick={() => setNewAt('')}><Icon name="plus" /> Projet</button>
      </PageHead>

      <div className="row small" style={{ marginBottom: 12, gap: 16 }}>
        {activities.filter((a) => !a.archived).map((a) => (
          <span key={a.id} className="row" style={{ gap: 6 }}><span className="swatch" style={{ background: a.color }} />{a.name}</span>
        ))}
        <label className="check" style={{ marginLeft: 'auto' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Afficher les archivés
        </label>
      </div>

      {view === 'frise' ? (
        <Timeline items={items} onOpen={open} />
      ) : (
        <MonthCalendar
          items={items}
          onOpen={open}
          onCreateAt={(d) => setNewAt(d)}
          summary={(m) => {
            const key = monthKey(m)
            const est = estimatedForMonth(key, today(), projects, docs, payments)
            const toDeclare = collectedInMonth(key, payments, docs)
            const past = key < monthKey(today())
            return (
              <>
                <div className="pill-stat" title="Encaissé + factures à encaisser + devis en cours + montants estimés des projets, rattachés à leur mois de rendu">
                  <span>CA estimé du mois</span>
                  <strong>{money0(est.total)}</strong>
                  {!past && est.pending > 0 && <small>dont {money0(est.pending)} à venir</small>}
                </div>
                <div className="pill-stat brand" title="Sommes réellement encaissées ce mois-ci (HT). À déclarer à l'Urssaf avant la fin du mois suivant.">
                  <span>CA à déclarer</span>
                  <strong>{money0(toDeclare)}</strong>
                  <small>encaissé ce mois-ci</small>
                </div>
              </>
            )
          }}
        />
      )}

      {items.length === 0 && (
        <p className="muted small" style={{ marginTop: 12 }}>
          Les projets apparaissent ici dès qu'ils ont une date de début ou de rendu.
        </p>
      )}

      {newAt !== null && (
        <NewProjectModal clients={clients} initialDate={newAt || undefined} onClose={() => setNewAt(null)} onCreated={(p) => open(p.id)} />
      )}
    </>
  )
}
