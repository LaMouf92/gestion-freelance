import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { notifyChange, useTable } from '../lib/store'
import { PROJECT_STATUS } from '../lib/labels'
import type { Client } from '../lib/types'
import { Badge, Empty, Field, Modal, PageHead, confirmDelete, errorMessage, useToast } from '../components/ui'
import { Icon } from '../components/Icon'

export const EMPTY_CLIENT: Omit<Client, 'id'> = {
  type: 'pro', name: '', contact_name: '', email: '', phone: '', address: '', siret: '', tva_number: '', notes: '',
}

export function Clients() {
  const { rows: clients, loading } = useTable('clients', { order: 'name' })
  const { rows: projects } = useTable('projects')
  const [edit, setEdit] = useState<Partial<Client> | null>(null)
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? clients.filter((c) => [c.name, c.contact_name, c.email].some((v) => v?.toLowerCase().includes(s))) : clients
  }, [clients, q])

  return (
    <>
      <PageHead title="Clients" sub={`${clients.length} client${clients.length > 1 ? 's' : ''}`}>
        <button className="btn primary" onClick={() => setEdit({ ...EMPTY_CLIENT })}><Icon name="plus" /> Nouveau client</button>
      </PageHead>
      <div className="toolbar">
        <input className="input" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card" style={{ paddingTop: 6, paddingBottom: 6 }}>
        {!loading && filtered.length === 0 && (
          <Empty icon="users" title={clients.length ? 'Aucun résultat' : 'Aucun client pour l’instant'}>
            {!clients.length && 'Ajoutez votre premier client pour pouvoir lui rattacher des projets et des factures.'}
          </Empty>
        )}
        {filtered.map((c) => {
          const n = projects.filter((p) => p.client_id === c.id).length
          return (
            <div key={c.id} className="list-item" onClick={() => setEdit(c)}>
              <div className="grow">
                <div className="title">{c.name}</div>
                <div className="meta">{[c.contact_name, c.email, c.phone].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              <Badge tone={c.type === 'pro' ? 'brand' : ''}>{c.type === 'pro' ? 'Pro' : 'Particulier'}</Badge>
              <span className="small muted" style={{ minWidth: 64, textAlign: 'right' }}>{n} projet{n > 1 ? 's' : ''}</span>
            </div>
          )
        })}
      </div>
      {edit && <ClientModal client={edit} onClose={() => setEdit(null)} />}
    </>
  )
}

export function ClientModal({ client, onClose, onSaved }: { client: Partial<Client>; onClose: () => void; onSaved?: (c: Client) => void }) {
  const toast = useToast()
  const [c, setC] = useState(client)
  const { rows: projects } = useTable('projects')
  const linked = client.id ? projects.filter((p) => p.client_id === client.id) : []
  const set = <K extends keyof Client>(k: K, v: Client[K]) => setC((x) => ({ ...x, [k]: v }))

  const save = async () => {
    if (!c.name?.trim()) return toast('Le nom est obligatoire')
    try {
      const { id, created_at: _ca, ...rest } = c
      void _ca
      const saved = id ? await db.update('clients', id, rest) : await db.insert('clients', rest)
      notifyChange('clients')
      toast('Client enregistré')
      onSaved?.(saved)
      onClose()
    } catch (e) {
      toast('Erreur : ' + errorMessage(e))
    }
  }
  const remove = async () => {
    if (!c.id || !confirmDelete('ce client')) return
    await db.remove('clients', c.id)
    notifyChange('clients')
    onClose()
  }

  return (
    <Modal
      title={c.id ? c.name || 'Client' : 'Nouveau client'}
      onClose={onClose}
      footer={<>
        {c.id && <button className="btn danger ghost" onClick={remove} style={{ marginRight: 'auto' }}>Supprimer</button>}
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={save}>Enregistrer</button>
      </>}
    >
      <div className="stack">
        <div className="row">
          <label className="check"><input type="radio" checked={c.type === 'pro'} onChange={() => set('type', 'pro')} /> Professionnel</label>
          <label className="check"><input type="radio" checked={c.type === 'particulier'} onChange={() => set('type', 'particulier')} /> Particulier</label>
        </div>
        <Field label={c.type === 'pro' ? 'Raison sociale' : 'Nom et prénom'}>
          <input className="input" value={c.name ?? ''} onChange={(e) => set('name', e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-2">
          {c.type === 'pro' && <Field label="Contact"><input className="input" value={c.contact_name ?? ''} onChange={(e) => set('contact_name', e.target.value)} /></Field>}
          <Field label="Email"><input className="input" type="email" value={c.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Téléphone"><input className="input" type="tel" value={c.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          {c.type === 'pro' && <Field label="SIRET"><input className="input" value={c.siret ?? ''} onChange={(e) => set('siret', e.target.value)} /></Field>}
          {c.type === 'pro' && <Field label="N° TVA intracom."><input className="input" value={c.tva_number ?? ''} onChange={(e) => set('tva_number', e.target.value)} /></Field>}
        </div>
        <Field label="Adresse de facturation"><textarea className="input" rows={3} value={c.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field label="Notes"><textarea className="input" rows={2} value={c.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
        {linked.length > 0 && (
          <div>
            <h3 style={{ marginBottom: 6 }}>Projets</h3>
            {linked.map((p) => (
              <Link key={p.id} to={`/projets/${p.id}`} className="row" style={{ padding: '4px 0' }}>
                {p.title} <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
