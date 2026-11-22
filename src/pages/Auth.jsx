import { useState } from 'react'
import { supabase } from '../supabase'
import { Field } from '../components/ui'

export default function Auth({ toast }) {
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [nombre, setNombre] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
      } else {
        try { localStorage.setItem('detallia_nombre', nombre.trim()) } catch {}
        const { data, error } = await supabase.auth.signUp({ email, password: pass })
        if (error) throw error
        if (!data.session) {
          setMsg({ tone: 'ok', text: 'Cuenta creada. Revisa tu correo para confirmarla y luego ingresa.' })
        }
      }
    } catch (err) {
      const t = err.message.includes('Invalid login') ? 'Correo o contraseña incorrectos.'
        : err.message.includes('already registered') ? 'Ese correo ya tiene cuenta. Ingresa con tu contraseña.'
        : err.message.includes('Password') ? 'La contraseña debe tener al menos 6 caracteres.'
        : err.message
      setMsg({ tone: 'error', text: t })
    } finally { setBusy(false) }
  }

  return (
    <div className="auth">
      <div className="auth-hero">
        <img src="/icon.svg" alt="" width="64" height="64" />
        <h1>Detallia</h1>
        <p>Tus pedidos personalizados con costo, precio justo y lista de compras en minutos.</p>
      </div>
      <form className="card auth-card" onSubmit={submit}>
        <div className="seg">
          <button type="button" className={modo === 'entrar' ? 'on' : ''} onClick={() => setModo('entrar')}>Ingresar</button>
          <button type="button" className={modo === 'registro' ? 'on' : ''} onClick={() => setModo('registro')}>Crear cuenta</button>
        </div>
        {modo === 'registro' && (
          <Field label="Nombre de tu negocio">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Momentos Mágicos" />
          </Field>
        )}
        <Field label="Correo electrónico">
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contraseña">
          <input type="password" required minLength={6} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} value={pass} onChange={(e) => setPass(e.target.value)} />
        </Field>
        {msg && <p className={`form-msg ${msg.tone}`}>{msg.text}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Un momento…' : modo === 'entrar' ? 'Ingresar' : 'Crear mi cuenta'}</button>
      </form>
      <p className="auth-foot">MVP académico · Politécnico Grancolombiano · 2026</p>
      {toast && <div className={`toast toast-${toast.tone}`}>{toast.msg}</div>}
    </div>
  )
}
