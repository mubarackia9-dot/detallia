import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { db } from './data'
import Auth from './pages/Auth'
import Inicio from './pages/Inicio'
import Pedidos from './pages/Pedidos'
import PedidoForm from './pages/PedidoForm'
import PedidoDetalle from './pages/PedidoDetalle'
import Materiales from './pages/Materiales'
import Clientes from './pages/Clientes'
import Caja from './pages/Caja'
import Ajustes from './pages/Ajustes'
import Encuesta from './pages/Encuesta'
import { Loading } from './components/ui'

const TABS = [
  { path: 'inicio', label: 'Inicio', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { path: 'pedidos', label: 'Pedidos', icon: 'M4 8h16v12H4zM2 4h20v4H2zM12 4v16' },
  { path: 'materiales', label: 'Materiales', icon: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10' },
  { path: 'clientes', label: 'Clientes', icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6' },
  { path: 'caja', label: 'Caja', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' },
]

function useHashRoute() {
  const get = () => (window.location.hash.replace(/^#\/?/, '') || 'inicio').split('/')
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const f = () => { setRoute(get()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return route
}


export default function App() {
  const [session, setSession] = useState(undefined)
  const [negocio, setNegocio] = useState(null)
  const [toast, setToast] = useState(null)
  const route = useHashRoute()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) db.negocio().then(setNegocio).catch((e) => notify(e.message, 'error'))
    else setNegocio(null)
  }, [session])

  const notify = useCallback((msg, tone = 'ok') => {
    setToast({ msg, tone, id: Date.now() })
    setTimeout(() => setToast((t) => (t && Date.now() - t.id >= 2900 ? null : t)), 3000)
  }, [])

  if (session === undefined) return <div className="center-screen"><Loading /></div>
  if (route[0] === 'encuesta') return <Encuesta session={session} />
  if (!session) return <Auth notify={notify} toast={toast} />
  if (!negocio) return <div className="center-screen"><Loading /></div>

  const [page, id, sub] = route
  const ctx = { negocio, setNegocio, notify }
  let view
  if (page === 'pedidos' && id === 'nuevo') view = <PedidoForm {...ctx} />
  else if (page === 'pedidos' && id && sub === 'editar') view = <PedidoForm {...ctx} id={id} />
  else if (page === 'pedidos' && id) view = <PedidoDetalle {...ctx} id={id} />
  else if (page === 'pedidos') view = <Pedidos {...ctx} />
  else if (page === 'materiales') view = <Materiales {...ctx} tab={id} />
  else if (page === 'clientes') view = <Clientes {...ctx} />
  else if (page === 'caja') view = <Caja {...ctx} />
  else if (page === 'ajustes') view = <Ajustes {...ctx} />
  else view = <Inicio {...ctx} />

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/inicio" className="brand" aria-label="Detallia, inicio">
          <img src="/icon.svg" alt="" width="30" height="30" />
          <span>Detallia</span>
        </a>
        <span className="topbar-biz">{negocio.nombre}</span>
        <a href="#/ajustes" className="icon-btn" aria-label="Ajustes">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
        </a>
      </header>
      <main className="content">{view}</main>
      <nav className="tabbar" aria-label="Navegación principal">
        {TABS.map((t) => (
          <a key={t.path} href={`#/${t.path}`} className={page === t.path || (page === '' && t.path === 'inicio') ? 'active' : ''}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
      {toast && <div className={`toast toast-${toast.tone}`} role="status">{toast.msg}</div>}
    </div>
  )
}
