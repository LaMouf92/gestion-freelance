import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { CATEGORY_PRESETS } from '../lib/defaults'
import { useApp } from '../lib/store'
import type { Activity, Settings as S, TableName } from '../lib/types'
import { Field, PageHead, errorMessage, useToast } from '../components/ui'
import { Icon } from '../components/Icon'
import { useLogoUrl } from '../components/Layout'

const TABS = ['Identité', 'Facturation', 'Activités', 'Sauvegarde'] as const

export function Settings() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Identité')
  return (
    <>
      <PageHead title="Paramètres" sub="Vos informations, vos réglages de facturation et vos activités." />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Identité' && <IdentityForm />}
      {tab === 'Facturation' && <BillingForm />}
      {tab === 'Activités' && <Activities />}
      {tab === 'Sauvegarde' && <Backup />}
    </>
  )
}

/* ---------- Formulaire générique sur les paramètres ---------- */
function useSettingsForm() {
  const { settings, refreshSettings } = useApp()
  const toast = useToast()
  const [form, setForm] = useState<S | null>(settings)
  const [saving, setSaving] = useState(false)
  useEffect(() => setForm(settings), [settings])
  const set = <K extends keyof S>(k: K, v: S[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const save = async () => {
    if (!form) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user_id, ...patch } = form
      await db.saveSettings(patch)
      await refreshSettings()
      toast('Paramètres enregistrés')
    } catch (e) {
      toast('Erreur : ' + errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return { form, set, save, saving }
}

function IdentityForm() {
  const { form, set, save, saving } = useSettingsForm()
  const { refreshSettings } = useApp()
  const toast = useToast()
  const logo = useLogoUrl()
  if (!form) return null
  const text = (k: keyof S, label: string, hint?: string, type = 'text') => (
    <Field label={label} hint={hint}>
      <input className="input" type={type} value={String(form[k] ?? '')} onChange={(e) => set(k, e.target.value as never)} />
    </Field>
  )

  const uploadLogo = async (file: File) => {
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = await db.uploadFile(`logo/logo-${Date.now()}.${ext}`, file)
      if (form.logo_path) await db.removeFile(form.logo_path).catch(() => {})
      await db.saveSettings({ logo_path: path })
      await refreshSettings()
      toast('Logo enregistré')
    } catch (e) {
      toast('Erreur : ' + errorMessage(e))
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card">
        <div className="card-head"><h2>Vous</h2></div>
        <div className="grid grid-2">
          {text('full_name', 'Nom et prénom', 'Apparaît sur vos devis et factures, suivi de « EI ».')}
          {text('trade_name', 'Nom commercial', 'Facultatif.')}
          {text('siret', 'SIRET')}
          {text('email', 'Email professionnel', undefined, 'email')}
          {text('phone', 'Téléphone', undefined, 'tel')}
          {text('website', 'Site web')}
        </div>
        <div style={{ marginTop: 16 }}>
          <Field label="Adresse">
            <textarea className="input" rows={3} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h2>Coordonnées bancaires</h2></div>
        <p className="muted small" style={{ marginBottom: 12 }}>Affichées sur vos factures pour le paiement par virement.</p>
        <div className="grid grid-2">
          {text('iban', 'IBAN')}
          {text('bic', 'BIC')}
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h2>Logo</h2></div>
        <div className="row">
          {logo ? <img src={logo} alt="Logo actuel" style={{ maxHeight: 64, maxWidth: 220, background: '#fff', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} /> : <span className="muted">Aucun logo pour l'instant.</span>}
          <label className="btn">
            <Icon name="upload" /> {logo ? 'Remplacer' : 'Ajouter un logo'}
            <input type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </label>
        </div>
        <p className="hint small muted" style={{ marginTop: 8 }}>PNG, JPG ou SVG. Il apparaîtra dans l'app et sur vos PDF.</p>
      </div>
      <div><button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </div>
  )
}

function BillingForm() {
  const { form, set, save, saving } = useSettingsForm()
  if (!form) return null
  const year = new Date().getFullYear()
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card">
        <div className="card-head"><h2>Numérotation</h2></div>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Vos factures Indy gardent leur propre numérotation. L'app utilise une série distincte, continue et sans trou,
          repartant à 001 chaque année.
        </p>
        <div className="grid grid-2">
          <Field label="Préfixe des factures" hint={`Exemple : ${form.invoice_prefix || 'GA'}-${year}-001`}>
            <input className="input" value={form.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
          </Field>
          <Field label="Préfixe des devis" hint={`Exemple : ${form.quote_prefix || 'DA'}-${year}-001`}>
            <input className="input" value={form.quote_prefix} onChange={(e) => set('quote_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
          </Field>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h2>TVA</h2></div>
        <label className="check">
          <input type="checkbox" checked={form.tva_enabled} onChange={(e) => set('tva_enabled', e.target.checked)} />
          <span>Je facture la TVA</span>
        </label>
        <p className="muted small" style={{ margin: '8px 0 12px' }}>
          {form.tva_enabled
            ? 'Vos documents afficheront le HT, la TVA et le TTC.'
            : 'Vos documents porteront la mention « TVA non applicable, art. 293 B du CGI ».'}
        </p>
        {form.tva_enabled && (
          <div className="grid grid-2">
            <Field label="Taux de TVA (%)">
              <input className="input" type="number" step="0.1" value={form.tva_rate} onChange={(e) => set('tva_rate', Number(e.target.value))} />
            </Field>
            <Field label="N° de TVA intracommunautaire">
              <input className="input" value={form.tva_number} onChange={(e) => set('tva_number', e.target.value)} />
            </Field>
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-head"><h2>Conditions par défaut</h2></div>
        <div className="grid grid-2">
          <Field label="Validité des devis (jours)">
            <input className="input" type="number" value={form.quote_validity_days} onChange={(e) => set('quote_validity_days', Number(e.target.value))} />
          </Field>
          <Field label="Délai de paiement (jours)">
            <input className="input" type="number" value={form.payment_terms_days} onChange={(e) => set('payment_terms_days', Number(e.target.value))} />
          </Field>
        </div>
        <div className="stack" style={{ marginTop: 16 }}>
          <Field label="Conditions de paiement">
            <textarea className="input" rows={2} value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} />
          </Field>
          <Field label="Pénalités de retard" hint="Mention obligatoire. L'indemnité de 40 € ne s'applique qu'aux clients professionnels.">
            <textarea className="input" rows={3} value={form.late_penalty_text} onChange={(e) => set('late_penalty_text', e.target.value)} />
          </Field>
          <Field label="Note de bas de page" hint="Facultatif, par exemple une mention sur la cession de droits.">
            <textarea className="input" rows={2} value={form.footer_note} onChange={(e) => set('footer_note', e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h2>Seuil de la micro-entreprise</h2></div>
        <Field label="Plafond de chiffre d'affaires annuel (€)" hint="77 700 € pour les prestations de services jusqu'en 2025. Vérifiez la valeur en vigueur en 2026.">
          <input className="input" type="number" value={form.micro_threshold} onChange={(e) => set('micro_threshold', Number(e.target.value))} />
        </Field>
      </div>
      <div><button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </div>
  )
}

function Activities() {
  const { activities, refreshActivities } = useApp()
  const toast = useToast()
  const [edit, setEdit] = useState<Partial<Activity> | null>(null)

  const save = async () => {
    if (!edit?.name?.trim()) return toast('Donnez un nom à l’activité')
    try {
      const { id, ...rest } = edit
      if (id) await db.update('activities', id, rest)
      else await db.insert('activities', rest)
      await refreshActivities()
      setEdit(null)
      toast('Activité enregistrée')
    } catch (e) {
      toast('Erreur : ' + errorMessage(e))
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Activités</h2>
        <button className="btn sm" onClick={() => setEdit({ name: '', color: '#e94f02', category: 'BNC', contribution_rate: 26.1, cfp_rate: 0.2, notes: '', archived: false })}>
          <Icon name="plus" /> Ajouter
        </button>
      </div>
      <p className="muted small" style={{ marginBottom: 12 }}>
        Chaque activité a son propre taux de cotisation. Les taux 2026 sont pré-remplis à titre indicatif : vérifiez-les sur
        autoentrepreneur.urssaf.fr.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Activité</th><th>Catégorie</th><th className="num">Cotisations</th><th className="num">CFP</th><th /></tr></thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id}>
                <td><span className="row" style={{ gap: 8 }}><span className="swatch" style={{ background: a.color }} />{a.name}{a.archived && <span className="badge">archivée</span>}</span>
                  {a.notes && <div className="small muted">{a.notes}</div>}</td>
                <td className="small">{CATEGORY_PRESETS[a.category]?.label}</td>
                <td className="num">{a.contribution_rate} %</td>
                <td className="num">{a.cfp_rate} %</td>
                <td className="num"><button className="btn sm ghost" onClick={() => setEdit(a)}>Modifier</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="stack" style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <h3>{edit.id ? 'Modifier l’activité' : 'Nouvelle activité'}</h3>
          <div className="grid grid-2">
            <Field label="Nom"><input className="input" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Couleur"><input className="input" type="color" value={edit.color ?? '#0203e9'} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></Field>
            <Field label="Catégorie">
              <select className="input" value={edit.category} onChange={(e) => {
                const c = e.target.value as Activity['category']
                setEdit({ ...edit, category: c, contribution_rate: CATEGORY_PRESETS[c].rate, cfp_rate: CATEGORY_PRESETS[c].cfp })
              }}>
                {Object.entries(CATEGORY_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-2">
              <Field label="Cotisations (%)"><input className="input" type="number" step="0.1" value={edit.contribution_rate ?? 0} onChange={(e) => setEdit({ ...edit, contribution_rate: Number(e.target.value) })} /></Field>
              <Field label="CFP (%)"><input className="input" type="number" step="0.1" value={edit.cfp_rate ?? 0} onChange={(e) => setEdit({ ...edit, cfp_rate: Number(e.target.value) })} /></Field>
            </div>
          </div>
          <Field label="Notes"><input className="input" value={edit.notes ?? ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
          {edit.id && (
            <label className="check"><input type="checkbox" checked={!!edit.archived} onChange={(e) => setEdit({ ...edit, archived: e.target.checked })} /> Archiver (masquée des nouveaux projets)</label>
          )}
          <div className="row">
            <button className="btn primary" onClick={save}>Enregistrer</button>
            <button className="btn" onClick={() => setEdit(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}

const ALL_TABLES: TableName[] = ['activities', 'clients', 'projects', 'milestones', 'documents', 'transactions', 'payments', 'urssaf_declarations', 'project_files']

function Backup() {
  const toast = useToast()
  const exportAll = async () => {
    try {
      const data: Record<string, unknown> = { exported_at: new Date().toISOString(), settings: await db.getSettings() }
      for (const t of ALL_TABLES) data[t] = await db.list(t)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `sauvegarde-gestion-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      toast('Erreur : ' + errorMessage(e))
    }
  }
  return (
    <div className="card">
      <div className="card-head"><h2>Sauvegarde</h2></div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Téléchargez une copie de toutes vos données (projets, clients, devis, factures, banque, Urssaf) dans un fichier.
        Les PDF et le logo ne sont pas inclus : ils restent dans votre espace de stockage.
      </p>
      <button className="btn primary" onClick={exportAll}>Télécharger une sauvegarde</button>
    </div>
  )
}
