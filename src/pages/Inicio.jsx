import { useEffect, useState } from 'react'
import { db, cargarEjemplo } from '../data'
import { money, today, addDays, fechaCorta, diasHasta, waLink, mesRango, MESES, ganancia, go } from '../lib'
import { Loading, Empty, WaButton, Badge } from '../components/ui'

export default function Inicio({ negocio, notify }) {
  const [d, setD] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function load() {
    const now = new Date()
    const [ini, fin] = mesRango(now.getFullYear(), now.getMonth())
    const [pedidos, fechas, movs, materiales] = await Promise.all([db.pedidos(), db.fechas(), db.movimientos(ini, fin), db.materiales()])
    setD({ pedidos, fechas, movs, materiales, mes: MESES[now.getMonth()], ini, fin })
  }
  useEffect(() => { load().catch((e) => notify(e.message, 'error')) }, [])

  async function ejemplo() {
    setCargando(true)
    try { await cargarEjemplo(); await load(); notify('Datos de ejemplo cargados') }
    catch (e) { notify(e.message, 'error') }
    finally { setCargando(false) }
  }

  if (!d) return <Loading />
  const hoy = today()
  const ventas = d.movs.filter((m) => m.tipo === 'venta').reduce((s, m) => s + Number(m.monto), 0)
  const egresos = d.movs.filter((m) => m.tipo !== 'venta').reduce((s, m) => s + Number(m.monto), 0)
  const entregadosMes = d.pedidos.filter((p) => p.estado === 'entregado' && p.fecha_entrega >= d.ini && p.fecha_entrega <= d.fin)
  const gananciaPedidos = entregadosMes.reduce((s, p) => s + ganancia(p), 0)
  const proximas = d.pedidos.filter((p) => ['confirmado', 'cotizado'].includes(p.estado) && p.fecha_entrega && p.fecha_entrega >= hoy && p.fecha_entrega <= addDays(hoy, 7))
  const atrasados = d.pedidos.filter((p) => p.estado === 'confirmado' && p.fecha_entrega && p.fecha_entrega < hoy)
  const fechas = d.fechas.map((f) => ({ ...f, dias: diasHasta(f.mes, f.dia) })).filter((f) => f.dias <= 30).sort((a, b) => a.dias - b.dias)
  const bajos = d.materiales.filter((m) => Number(m.stock) <= 1).length
  const vacio = !d.pedidos.length && !d.materiales.length

  return (
    <div className="stack">
      <section>
        <p className="eyebrow">Resumen de {d.mes}</p>
        <div className="kpis">
          <div className="kpi"><span>Ventas</span><strong>{money(ventas)}</strong></div>
          <div className="kpi"><span>Compras y gastos</span><strong>{money(egresos)}</strong></div>
          <div className="kpi kpi-accent"><span>Ganancia de pedidos entregados</span><strong>{money(gananciaPedidos)}</strong><small>{entregadosMes.length} pedido{entregadosMes.length === 1 ? '' : 's'}</small></div>
        </div>
      </section>

      {vacio && (
        <Empty icon="🎁" title={`¡Bienvenida a Detallia${negocio.nombre !== 'Mi negocio' ? ', ' + negocio.nombre : ''}!`}
          text="Empieza registrando tus materiales y tu primer pedido, o carga datos de ejemplo para conocer la app."
          action={<div className="row-gap"><button className="btn btn-primary" onClick={() => go('pedidos/nuevo')}>Crear primer pedido</button><button className="btn" onClick={ejemplo} disabled={cargando}>{cargando ? 'Cargando…' : 'Cargar datos de ejemplo'}</button></div>} />
      )}

      <div className="quick">
        <button className="quick-main" onClick={() => go('pedidos/nuevo')}><span>＋</span> Nuevo pedido</button>
        <button onClick={() => go('materiales/compras')}>Lista de compras{bajos ? <Badge tone="danger">{bajos}</Badge> : null}</button>
      </div>

      <a className="card feedback" href="#/encuesta"><span>💬</span><span><b>¿Ya probaste Detallia?</b><br /><span className="muted small">Cuéntanos qué te parece en 3 minutos</span></span><span className="chev">›</span></a>

      {atrasados.length > 0 && (
        <section className="card alert">
          <strong>{atrasados.length} pedido(s) confirmado(s) con fecha vencida.</strong> Márcalos como entregados o cámbiales la fecha.
        </section>
      )}

      <section>
        <div className="section-head"><h2>Entregas de los próximos 7 días</h2><a href="#/pedidos">Ver todos</a></div>
        {proximas.length === 0 ? <p className="muted">No tienes entregas programadas esta semana.</p> : (
          <ul className="list">
            {proximas.map((p) => (
              <li key={p.id}><a href={`#/pedidos/${p.id}`} className="list-item">
                <div className="date-chip"><b>{fechaCorta(p.fecha_entrega)}</b><span>{p.hora_entrega || ''}</span></div>
                <div className="grow"><strong>{p.titulo}</strong><span className="muted">{p.clientes?.nombre || 'Sin cliente'} · {p.direccion || 'Sin dirección'}</span></div>
                <Badge tone={p.estado === 'confirmado' ? 'warn' : 'neutral'}>{p.estado === 'confirmado' ? 'Confirmado' : 'Por confirmar'}</Badge>
              </a></li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="section-head"><h2>Fechas especiales de tus clientes</h2><a href="#/clientes">Clientes</a></div>
        {fechas.length === 0 ? <p className="muted">Ninguna fecha en los próximos 30 días. Registra cumpleaños y aniversarios en cada cliente.</p> : (
          <ul className="list">
            {fechas.map((f) => (
              <li key={f.id} className="list-item">
                <div className="date-chip soft"><b>{f.dias === 0 ? 'Hoy' : `${f.dias} d`}</b><span>{f.dia} {MESES[f.mes - 1].slice(0, 3)}</span></div>
                <div className="grow"><strong>{f.ocasion}{f.para_quien ? ` · ${f.para_quien}` : ''}</strong><span className="muted">{f.clientes?.nombre}</span></div>
                {f.clientes?.telefono && <WaButton small href={waLink(f.clientes.telefono, `¡Hola ${f.clientes.nombre.split(' ')[0]}! 🎁 Se acerca el ${f.ocasion.toLowerCase()}${f.para_quien ? ' de ' + f.para_quien.toLowerCase() : ''} (${f.dia} de ${MESES[f.mes - 1]}). En ${negocio.nombre} te ayudamos a sorprender con una ancheta, desayuno o arreglo a tu gusto. ¿Te preparo una propuesta?`)}>Recordar</WaButton>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
