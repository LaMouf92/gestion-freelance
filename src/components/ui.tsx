import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </label>
  )
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <h3>{title}</h3>
      {children && <div className="muted small" style={{ marginTop: 6 }}>{children}</div>}
    </div>
  )
}

/* ---------- Petites notifications ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const show = useCallback((m: string) => {
    setMsg(m)
    window.setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 2600)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

export function errorMessage(e: unknown) {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

/* ---------- Fenêtre modale ---------- */
export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal card${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h2>{title}</h2>
          <button className="btn sm ghost" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot row">{footer}</div>}
      </div>
    </div>
  )
}

export function Badge({ tone, children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge ${tone ?? ''}`}>{children}</span>
}

/** Confirmation simple avant suppression */
export const confirmDelete = (what: string) => window.confirm(`Supprimer ${what} ? Cette action est définitive.`)
