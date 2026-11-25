import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import { notifyChange, useApp, useTable } from '../lib/store'
import { PROJECT_STATUS } from '../lib/labels'
import { dateFr, today } from '../lib/format'
import type { Client, Project, ProjectStatus } from '../lib/types'
import { Badge, Empty, Field, Modal, PageHead, errorMessage, useToast } from '../components/ui'
import { Icon } from '../components/Icon'
import { ClientModal, EMPTY_CLIENT } from './Clients'

export const EMPTY_PROJECT: Omit<Project, 'id'> = {
  activity_id: null, client_id: null, title: '', status: 'prospect', start_date: null, due_date: null, delivered_date: null,
  brief: '', deliverables: '', revisions_included: 2, revisions_done: 0, time_spent_hours: 0, links: [], rights_assignment: '', notes: '',
}

export function Projects() {
  const { activities } = useApp()
  const { rows: projects, loading } = useTable('projects')
  const { rows: clients } = useTable('clients', { order: 'name' })
  const [status, setStatus] = useState<'actifs' | ProjectStatus | 'tous'>('actifs')
  const [activity, setActivity] = useState('')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? 'Sans client'
  const act = (id: string | null) => activities.find((a) => a.id === id)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return projects
      .filter((p) => (status === 'tous' ? true : status === 'actifs' ? !['paye', 'archive'].includes(p.status) : p.status === status))
      .filter((p) => !activity || p.activity_id === activity)
      .filter((p) => !s || p.title.toLowerCase().includes(s) || clientName(p.client_id).toLowerCase().includes(s))
      .sort((a, b) => (a.due_date ?? a.start_date ?? '9999').localeCompare(b.due_date ?? b.start_date ?? '9999'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, status, activity, q, clients])

  return (
    <>
      <PageHead title="Projets" sub="Tous vos projets, du premier contact au paiement.">
        <button className="btn primary" onClick={() => setCreating(true)}><Icon name="plus" /> Nouveau projet</button>
      </PageHead>
      <div className="toolbar">
        <input className="input" placeholder="Rechercher un projet ou un client…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="actifs">En cours (non payés)</option>
          <option value="tous">Tous les statuts</option>
          {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
          <option value="">Toutes les activités</option>
          {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
        {!loading && list.length === 0 && (
          <Empty icon="folder" title={projects.length ? 'Aucun projet ne correspond' : 'Aucun projet pour l’instant'}>
            {!projects.length && 'Créez votre premier projet pour le voir apparaître ici et dans le planning.'}
          </Empty>
        )}
        {list.map((p) => {
          const late = p.due_date && p.due_date < today() && ['prospect', 'devis', 'en_cours'].includes(p.status)
          return (
            <div key={p.id} className="list-item" onClick={() => navigate(`/projets/${p.id}`)}>
              <span className="swatch" style={{ background: act(p.activity_id)?.color ?? 'var(--text-3)', width: 12, height: 12 }} />
              <div className="grow">
                <div className="title">{p.title}</div>
                <div className="meta">{clientName(p.client_id)} · {act(p.activity_id)?.name ?? '—'}</div>
              </div>
              <div className="small" style={{ textAlign: 'right', color: late ? 'var(--danger)' : 'var(--text-2)' }}>
                {p.due_date ? <>Rendu {dateFr(p.due_date, { day: 'numeric', month: 'short' })}</> : '—'}
              </div>
              <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
            </div>
          )
        })}
      </div>
      {creating && <NewProjectModal clients={clients} onClose={() => setCreating(false)} onCreated={(p) => navigate(`/projets/${p.id}`)} />}
    </>
  )
}

export function NewProjectModal({ clients, onClose, onCreated, initialDate }: { clients: Client[]; onClose: () => void; onCreated: (p: Project) => void; initialDate?: string }) {
  const { activities } = useApp()
  const toast = useToast()
  const [p, setP] = useState<Omit<Project, 'id'>>({
    ...EMPTY_PROJECT,
    activity_id: activities.find((a) => !a.archived)?.id ?? null,
    start_date: initialDate ?? today(),
  })
  const [newClient, setNewClient] = useState(false)
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP((x) => ({ ...x, [k]: v }))

  const create = async () => {
    if (!p.title.trim()) return toast('Donnez un titre au projet')
    try {
      const created = await db.insert('projects', p)
      notifyChange('projects')
      onClose()
      onCreated(created)
    } catch (e) {
      toast('Erreur : ' + errorMessage(e))
    }
  }

  return (
    <>
      <Modal title="Nouveau projet" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={create}>Créer le projet</button></>}>
        <div className="stack">
          <Field label="Titre"><input className="input" autoFocus value={p.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex. Identité visuelle Boulangerie Martin" /></Field>
          <div className="grid grid-2">
            <Field label="Client">
              <div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                <select className="input" value={p.client_id ?? ''} onChange={(e) => set('client_id', e.target.value || null)}>
                  <option value="">— Choisir —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" className="btn" title="Nouveau client" onClick={() => setNewClient(true)}><Icon name="plus" /></button>
              </div>
            </Field>
            <Field label="Activité">
              <select className="input" value={p.activity_id ?? ''} onChange={(e) => set('activity_id', e.target.value || null)}>
                {activities.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Début"><input className="input" type="date" value={p.start_date ?? ''} onChange={(e) => set('start_date', e.target.value || null)} /></Field>
            <Field label="Date de rendu"><input className="input" type="date" value={p.due_date ?? ''} onChange={(e) => set('due_date', e.target.value || null)} /></Field>
          </div>
          <Field label="Statut">
            <select className="input" value={p.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
              {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
        </div>
      </Modal>
      {newClient && <ClientModal client={{ ...EMPTY_CLIENT }} onClose={() => setNewClient(false)} onSaved={(c) => set('client_id', c.id)} />}
    </>
  )
}
