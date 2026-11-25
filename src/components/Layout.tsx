import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { db } from '../lib/db'
import { useApp } from '../lib/store'
import { Icon } from './Icon'

const NAV = [
  { to: '/', label: 'Tableau de bord', short: 'Accueil', icon: 'dashboard', mobile: true },
  { to: '/planning', label: 'Planning', short: 'Planning', icon: 'calendar', mobile: true },
  { to: '/projets', label: 'Projets', short: 'Projets', icon: 'folder', mobile: true },
  { to: '/documents', label: 'Devis & factures', short: 'Factures', icon: 'file', mobile: true },
  { to: '/clients', label: 'Clients', short: 'Clients', icon: 'users', mobile: false },
  { to: '/banque', label: 'Banque', short: 'Banque', icon: 'bank', mobile: false },
  { to: '/urssaf', label: 'Urssaf', short: 'Urssaf', icon: 'shield', mobile: false },
  { to: '/parametres', label: 'Paramètres', short: 'Réglages', icon: 'settings', mobile: false },
]

export function useLogoUrl() {
  const { settings } = useApp()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!settings?.logo_path) return setUrl(null)
    db.fileUrl(settings.logo_path).then(setUrl, () => setUrl(null))
  }, [settings?.logo_path])
  return url
}

export function BrandMark() {
  const { settings } = useApp()
  const logo = useLogoUrl()
  if (logo) return <div className="brand-mark"><img src={logo} alt="Logo" /></div>
  const name = settings?.trade_name || settings?.full_name || 'Mon studio'
  return (
    <div className="brand-mark">
      <span className="dot">{name.charAt(0).toUpperCase()}</span>
      <span>{name}</span>
    </div>
  )
}

export function Layout() {
  const [moreOpen, setMoreOpen] = useState(false)
  return (
    <div className="shell">
      <aside className="sidebar">
        <BrandMark />
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className="nav-link">
            <Icon name={n.icon} /> {n.label}
          </NavLink>
        ))}
        <div className="spacer" />
        <button className="nav-link btn ghost" style={{ justifyContent: 'flex-start' }} onClick={() => db.signOut()}>
          <Icon name="logout" /> Déconnexion
        </button>
      </aside>

      <main className="main">
        {db.mode === 'demo' && (
          <div className="demo-banner">
            Mode démo : les données restent dans ce navigateur. Elles seront en ligne une fois Supabase connecté.
          </div>
        )}
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {NAV.filter((n) => n.mobile).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMoreOpen(false)}>
            <Icon name={n.icon} /> {n.short}
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
          <Icon name="more" /> Plus
        </button>
      </nav>
      {moreOpen && (
        <div className="more-sheet" onClick={() => setMoreOpen(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            {NAV.filter((n) => !n.mobile).map((n) => (
              <NavLink key={n.to} to={n.to} className="nav-link" onClick={() => setMoreOpen(false)}>
                <Icon name={n.icon} /> {n.label}
              </NavLink>
            ))}
            <button className="nav-link btn ghost" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => db.signOut()}>
              <Icon name="logout" /> Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
