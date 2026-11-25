import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { PageHead } from '../components/ui'
import { Icon } from '../components/Icon'

export function Dashboard() {
  const { settings, activities } = useApp()
  const firstName = settings?.full_name?.split(' ')[0]

  const checklist = [
    { done: !!(settings?.full_name && settings?.siret && settings?.address), label: 'Renseigner votre identité, votre SIRET et votre adresse', to: '/parametres' },
    { done: !!settings?.logo_path, label: 'Ajouter votre logo', to: '/parametres' },
    { done: !!(settings?.iban), label: 'Ajouter votre IBAN pour les factures', to: '/parametres' },
    { done: activities.length > 0, label: 'Vérifier vos activités et leurs taux de cotisation', to: '/parametres' },
  ]

  return (
    <>
      <PageHead title={firstName ? `Bonjour ${firstName}` : 'Bonjour'} sub="Voici où en est votre activité." />
      <div className="card">
        <div className="card-head"><h2>Pour bien démarrer</h2></div>
        <div className="stack" style={{ gap: 8 }}>
          {checklist.map((c) => (
            <Link key={c.label} to={c.to} className="row" style={{ color: c.done ? 'var(--text-3)' : 'var(--text)', gap: 12, flexWrap: 'nowrap' }}>
              <span className={`badge ${c.done ? 'ok' : 'brand'}`} style={{ width: 24, height: 24, padding: 0, justifyContent: 'center', flexShrink: 0 }}>
                {c.done ? <Icon name="check" size={14} /> : ''}
              </span>
              <span style={{ textDecoration: c.done ? 'line-through' : 'none' }}>{c.label}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="card">
        <p className="muted">Le tableau de bord complet (CA, seuil, cotisations, factures en attente) arrive à l'étape 6.</p>
      </div>
    </>
  )
}
