import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import { notifyChange, useApp, useTable } from '../lib/store'
import { PROJECT_STATUS } from '../lib/labels'
import { dateFr, today } from '../lib/format'
import type { Project, ProjectStatus } from '../lib/types'
import { Badge, Field, confirmDelete, errorMessage, useToast } from '../components/ui'
import { Icon } from '../components/Icon'
import { ClientModal, EMPTY_CLIENT } from './Clients'

export function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { activities } = useApp()
  const { rows: projects, loading } = useTable('projects')
  const { rows: clients } = useTable('clients', { order: 'name' })
  const original = projects.find((p) => p.id === id)
  const [p, setP] = useState<Project | null>(null)
  const [dirty, setDirty] = useState(false)
  const [newClient, setNewClient] = useState(false)

  useEffect(() => {
    if (original && !dirty) setP(original)
  }, [original, dirty])

  if (!loading && !original) {
    return <div className="card"><p>Ce projet n'existe plus. <Link to="/projets">Retour aux projets</Link></p></div>
  }
  if (!p) return null

  const set = <K extends keyof Project>(k: K, v: Project[K]) => {
    setP((x) => (x ? { ...x, [k]: v } : x))
    setDirty(true)
  }

  const save = async () => {
    try {
      const { id: pid, created_at: _c, ...rest } = p
      void _c
      await db.update('projects', pid, rest)
      setDirty(false)
      notifyChange('projects')
      toast('Projet enregistré')
    } catch (e) {
      toast('Erreur : ' + errorMessage(e))
    }
  }

  const remove = async () => {
    if (!confirmDelete(`le projet « ${p.title} »`)) return
    await db.remove('projects', p.id)
    notifyChange('projects')
    navigate('/projets')
  }

  const st = PROJECT_STATUS[p.status]
  const revLeft = p.revisions_included - p.revisions_done

  return (
    <>
      <div className="page-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link to="/projets" className="small">← Projets</Link>
          <input
            className="title-input"
            value={p.title}
            onChange={(e) => set('title', e.target.value)}
            aria-label="Titre du projet"
          />
          <div className="row small muted">
            <Badge tone={st.tone}>{st.label}</Badge>
            {p.due_date && <span>Rendu le {dateFr(p.due_date)}</span>}
            {p.due_date && p.due_date < today() && ['prospect', 'devis', 'en_cours'].includes(p.status) && <Badge tone="danger">En retard</Badge>}
          </div>
        </div>
        <div className="row">
          <button className="btn danger ghost" onClick={remove}><Icon name="trash" /> Supprimer</button>
          <button className="btn primary" onClick={save} disabled={!dirty}>{dirty ? 'Enregistrer' : 'Enregistré'}</button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><h2>Informations</h2></div>
            <div className="grid grid-2">
              <Field label="Statut">
                <select className="input" value={p.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
                  {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Activité">
                <select className="input" value={p.activity_id ?? ''} onChange={(e) => set('activity_id', e.target.value || null)}>
                  <option value="">—</option>
                  {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Client">
                <div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                  <select className="input" value={p.client_id ?? ''} onChange={(e) => set('client_id', e.target.value || null)}>
                    <option value="">— Aucun —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" className="btn" title="Nouveau client" onClick={() => setNewClient(true)}><Icon name="plus" /></button>
                </div>
              </Field>
              <Field label="Temps passé (heures)">
                <input className="input" type="number" min={0} step={0.5} value={p.time_spent_hours} onChange={(e) => set('time_spent_hours', Number(e.target.value))} />
              </Field>
              <Field label="Début"><input className="input" type="date" value={p.start_date ?? ''} onChange={(e) => set('start_date', e.target.value || null)} /></Field>
              <Field label="Date de rendu"><input className="input" type="date" value={p.due_date ?? ''} onChange={(e) => set('due_date', e.target.value || null)} /></Field>
              <Field label="Livré le"><input className="input" type="date" value={p.delivered_date ?? ''} onChange={(e) => set('delivered_date', e.target.value || null)} /></Field>
              <Field label="Allers-retours" hint={revLeft >= 0 ? `${revLeft} restant${revLeft > 1 ? 's' : ''}` : `${-revLeft} au-delà du forfait`}>
                <div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                  <input className="input" type="number" min={0} value={p.revisions_done} onChange={(e) => set('revisions_done', Number(e.target.value))} aria-label="Effectués" />
                  <span className="muted">/</span>
                  <input className="input" type="number" min={0} value={p.revisions_included} onChange={(e) => set('revisions_included', Number(e.target.value))} aria-label="Inclus" />
                </div>
              </Field>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2>Brief</h2></div>
            <textarea className="input" rows={6} value={p.brief} onChange={(e) => set('brief', e.target.value)} placeholder="Contexte, objectifs, cible, contraintes…" />
          </div>
          <div className="card">
            <div className="card-head"><h2>Livrables</h2></div>
            <textarea className="input" rows={4} value={p.deliverables} onChange={(e) => set('deliverables', e.target.value)} placeholder="Logo (formats AI, PNG, SVG), charte graphique PDF…" />
          </div>
          <div className="card">
            <div className="card-head"><h2>Cession de droits</h2></div>
            <textarea className="input" rows={3} value={p.rights_assignment} onChange={(e) => set('rights_assignment', e.target.value)} placeholder="Supports, durée, territoire, exclusivité…" />
          </div>
          <div className="card">
            <div className="card-head"><h2>Notes</h2></div>
            <textarea className="input" rows={4} value={p.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <Milestones projectId={p.id} />
          <div className="card">
            <div className="card-head"><h2>Liens</h2></div>
            <Links links={p.links} onChange={(l) => set('links', l)} />
          </div>
          <Files projectId={p.id} />
          <div className="card">
            <div className="card-head"><h2>Devis & factures</h2></div>
            <p className="muted small">Les devis, factures et paiements de ce projet apparaîtront ici à l'étape 4.</p>
          </div>
        </div>
      </div>
      {newClient && <ClientModal client={{ ...EMPTY_CLIENT }} onClose={() => setNewClient(false)} onSaved={(c) => set('client_id', c.id)} />}
    </>
  )
}

function Milestones({ projectId }: { projectId: string }) {
  const { rows, reload } = useTable('milestones', { eq: { project_id: projectId }, order: 'date' })
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today())
  const toast = useToast()

  const add = async () => {
    if (!title.trim()) return
    try {
      await db.insert('milestones', { project_id: projectId, title: title.trim(), date, done: false })
      setTitle('')
      notifyChange('milestones')
    } catch (e) {
      toast('Erreur : ' + errorMessage(e))
    }
  }
  const toggle = async (id: string, done: boolean) => {
    await db.update('milestones', id, { done })
    notifyChange('milestones')
  }
  const remove = async (id: string) => {
    await db.remove('milestones', id)
    void reload()
    notifyChange('milestones')
  }

  return (
    <div className="card">
      <div className="card-head"><h2>Échéances</h2></div>
      <div className="stack" style={{ gap: 6 }}>
        {rows.length === 0 && <p className="muted small">Ajoutez les étapes clés : présentation des pistes, retours client, rendu final…</p>}
        {rows.map((m) => (
          <div key={m.id} className="row" style={{ flexWrap: 'nowrap' }}>
            <label className="check" style={{ flex: 1, minWidth: 0 }}>
              <input type="checkbox" checked={m.done} onChange={(e) => toggle(m.id, e.target.checked)} />
              <span style={{ textDecoration: m.done ? 'line-through' : 'none', color: m.done ? 'var(--text-3)' : undefined }}>{m.title}</span>
            </label>
            <span className="small" style={{ color: !m.done && m.date < today() ? 'var(--danger)' : 'var(--text-2)', whiteSpace: 'nowrap' }}>{dateFr(m.date, { day: 'numeric', month: 'short' })}</span>
            <button className="btn sm ghost" onClick={() => remove(m.id)} aria-label="Supprimer"><Icon name="trash" /></button>
          </div>
        ))}
      </div>
      <div className="stack" style={{ marginTop: 12, gap: 6 }}>
        <input className="input" placeholder="Nouvelle échéance" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date de l'échéance" />
          <button className="btn" onClick={add} aria-label="Ajouter"><Icon name="plus" /></button>
        </div>
      </div>
    </div>
  )
}

function Links({ links, onChange }: { links: Project['links']; onChange: (l: Project['links']) => void }) {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const add = () => {
    if (!url.trim()) return
    const u = /^https?:\/\//.test(url.trim()) ? url.trim() : `https://${url.trim()}`
    onChange([...(links ?? []), { label: label.trim() || u.replace(/^https?:\/\//, '').slice(0, 40), url: u }])
    setUrl('')
    setLabel('')
  }
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        {(links ?? []).length === 0 && <p className="muted small">Drive, WeTransfer, Figma, maquettes en ligne…</p>}
        {(links ?? []).map((l, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label}</a>
            <button className="btn sm ghost" onClick={() => onChange(links.filter((_, j) => j !== i))} aria-label="Retirer"><Icon name="trash" /></button>
          </div>
        ))}
      </div>
      <div className="stack" style={{ marginTop: 12, gap: 6 }}>
        <input className="input" placeholder="Adresse du lien" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input className="input" placeholder="Nom (facultatif)" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn" onClick={add} aria-label="Ajouter le lien"><Icon name="plus" /></button>
        </div>
      </div>
    </>
  )
}

function Files({ projectId }: { projectId: string }) {
  const { rows } = useTable('project_files', { eq: { project_id: projectId }, order: 'created_at' })
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const upload = async (files: FileList) => {
    setBusy(true)
    try {
      for (const f of Array.from(files)) {
        const safe = f.name.normalize('NFD').replace(/[^\w.-]+/g, '_')
        const path = await db.uploadFile(`projets/${projectId}/${Date.now()}-${safe}`, f)
        await db.insert('project_files', { project_id: projectId, name: f.name, path })
      }
      notifyChange('project_files')
    } catch (e) {
      toast('Erreur : ' + errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const open = async (path: string) => {
    const url = await db.fileUrl(path)
    if (url.startsWith('data:')) {
      const w = window.open()
      w?.document.write(`<iframe src="${url}" style="border:0;width:100%;height:100%"></iframe>`)
    } else window.open(url, '_blank')
  }
  const remove = async (id: string, path: string) => {
    if (!confirmDelete('ce fichier')) return
    await db.removeFile(path).catch(() => {})
    await db.remove('project_files', id)
    notifyChange('project_files')
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Fichiers</h2>
        <label className="btn sm">
          <Icon name="upload" /> {busy ? 'Envoi…' : 'Ajouter'}
          <input type="file" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
        </label>
      </div>
      {rows.length === 0 && <p className="muted small">Brief PDF, contrat signé, références…</p>}
      {rows.map((f) => (
        <div key={f.id} className="row" style={{ flexWrap: 'nowrap', padding: '4px 0' }}>
          <button className="btn ghost sm" style={{ flex: 1, justifyContent: 'flex-start', minWidth: 0, overflow: 'hidden' }} onClick={() => open(f.path)}>
            <Icon name="file" /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
          </button>
          <button className="btn sm ghost" onClick={() => remove(f.id, f.path)} aria-label="Supprimer"><Icon name="trash" /></button>
        </div>
      ))}
    </div>
  )
}
