import { useState, type FormEvent } from 'react'
import { db } from '../lib/db'
import { Field, errorMessage } from '../components/ui'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await db.signIn(email.trim(), password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card stack" onSubmit={submit}>
        <div className="brand-mark">
          <span className="dot">G</span>
          <span>Gestion freelance</span>
        </div>
        {db.mode === 'demo' && (
          <p className="demo-banner" style={{ margin: 0 }}>
            Mode démo : saisissez n'importe quel email pour essayer l'app.
          </p>
        )}
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {db.mode === 'supabase' && (
          <Field label="Mot de passe">
            <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        )}
        {error && <div className="error-box">{error}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
    </div>
  )
}
