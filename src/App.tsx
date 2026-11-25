import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './lib/store'
import { ToastProvider } from './components/ui'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Settings } from './pages/Settings'
import { Placeholder } from './pages/Placeholder'
import { Clients } from './pages/Clients'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { Planning } from './pages/Planning'

function Routed() {
  const { user, loading, settings } = useApp()
  if (loading || (user && !settings)) return <div className="login-wrap muted">Chargement…</div>
  if (!user) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="planning" element={<Planning />} />
        <Route path="projets" element={<Projects />} />
        <Route path="projets/:id" element={<ProjectDetail />} />
        <Route path="clients" element={<Clients />} />
        <Route path="documents" element={<Placeholder title="Devis & factures" icon="file" step="étape 4" />} />
        <Route path="banque" element={<Placeholder title="Banque" icon="bank" step="étape 5" />} />
        <Route path="urssaf" element={<Placeholder title="Urssaf" icon="shield" step="étape 6" />} />
        <Route path="parametres" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <Routed />
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
