import { useEffect, useState } from 'react'
import { db } from '../data'
import { money, MESES, mesRango, today, MEDIOS_PAGO, ganancia } from '../lib'
import { Loading, Sheet, Field, Badge } from '../components/ui'

export default function Caja({ notify }) {
  const now = new Date()
  const [ym, setYm] = useState([now.getFullYear(), now.getMonth()])
  const [movs, setMovs] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [nuevo, setNuevo] = useState(null)
  const [ini, fin] = mesRango(...ym)

  const load = async () => { const [m, p] = await Promise.all([db.movimientos(ini, fin), db.pedidos()]); setMovs(m); setPedidos(p) }
  useEffect(() => { setMovs(null); load().catch((e) => notify(e.message, 'error')) }, [ym[0], ym[1]])

  const mover = (d) => { const dt = new Date(ym[0], ym[1] + d, 1); setYm([dt.getFullYear(), dt.getMonth()]) }

  async function guardar() {
    if (!(Number(nuevo.monto) > 0)) return notify('Escribe el valor', 'error')
    try { await db.agregarMovimiento(nuevo); setNuevo(null); await load(); notify('Movimiento registrado') } catch (e) { notify(e.message, 'error') }
  }

  const sum = (t) => (movs || []).filter((m) => t.includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0)
  const ventas = sum(['venta']), compras = sum(['compra']), gastos = sum(['gasto'])
  const entregados = pedidos.filter((p) => p.estado === 'entregado' && p.fecha_entrega >= ini && p.fecha_entrega <= fin)
  const porMedio = MEDIOS_PAGO.map((m) => [m, (movs || []).filter((x) => x.tipo === 'venta' && x.medio_pago === m).reduce((s, x) => s + Number(x.monto), 0)]).filter(([, v]) => v > 0)

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Caja</h1>
        <button className="btn btn-primary" onClick={() => setNuevo({ tipo: 'gasto', monto: '', descripcion: '', medio_pago: 'Efectivo', fecha: today() })}>＋ Movimiento</button>
      </div>
      <div className="month-nav">
        <button className="icon-btn" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
        <strong>{MESES[ym[1]]} {ym[0]}</strong>
        <button className="icon-btn" onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
      </div>
      {!movs ? <Loading /> : (
        <>
          <div className="kpis">
            <div className="kpi"><span>Ingresos por ventas</span><strong>{money(ventas)}</strong></div>
            <div className="kpi"><span>Compras de materiales</span><strong>{money(compras)}</strong></div>
            <div className="kpi"><span>Otros gastos</span><strong>{money(gastos)}</strong></div>
            <div className={`kpi kpi-accent ${ventas - compras - gastos < 0 ? 'neg' : ''}`}><span>Balance del mes</span><strong>{money(ventas - compras - gastos)}</strong></div>
          </div>
          {porMedio.length > 0 && <p className="muted small">Ventas por medio de pago: {porMedio.map(([m, v]) => `${m} ${money(v)}`).join(' · ')}</p>}

          <section className="card">
            <h2 className="card-title">Ganancia por pedido entregado</h2>
            {entregados.length === 0 ? <p className="muted">Sin pedidos entregados este mes.</p> : (
              <table className="items read">
                <thead><tr><th>Pedido</th><th className="num">Venta</th><th className="num">Costo</th><th className="num">Ganancia</th></tr></thead>
                <tbody>
                  {entregados.map((p) => <tr key={p.id}><td><a href={`#/pedidos/${p.id}`}>{p.titulo}</a></td><td className="num">{money(p.precio_venta)}</td><td className="num">{money(Number(p.costo_materiales) + Number(p.domicilio))}</td><td className={`num ${ganancia(p) < 0 ? 'neg' : 'pos'}`}>{money(ganancia(p))}</td></tr>)}
                </tbody>
                <tfoot><tr><td>Total</td><td className="num">{money(entregados.reduce((s, p) => s + Number(p.precio_venta), 0))}</td><td></td><td className="num pos">{money(entregados.reduce((s, p) => s + ganancia(p), 0))}</td></tr></tfoot>
              </table>
            )}
          </section>

          <section>
            <h2 className="group-title">Movimientos</h2>
            {movs.length === 0 ? <p className="muted">Sin movimientos este mes.</p> : (
              <ul className="list">
                {movs.map((m) => (
                  <li key={m.id} className="list-item">
                    <div className="grow"><strong>{m.descripcion || m.tipo}</strong><span className="muted">{m.fecha} · {m.medio_pago || '—'}</span></div>
                    <Badge tone={m.tipo === 'venta' ? 'ok' : 'neutral'}>{m.tipo}</Badge>
                    <strong className={m.tipo === 'venta' ? 'pos' : 'neg'}>{m.tipo === 'venta' ? '+' : '−'}{money(m.monto)}</strong>
                    {!m.pedido_id && <button className="icon-btn" aria-label="Eliminar" onClick={() => confirm('¿Eliminar este movimiento?') && db.borrarMovimiento(m.id).then(load)}>✕</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {nuevo && (
        <Sheet title="Nuevo movimiento" onClose={() => setNuevo(null)} footer={<button className="btn btn-primary btn-block" onClick={guardar}>Guardar</button>}>
          <div className="seg">
            {[['gasto', 'Gasto'], ['compra', 'Compra'], ['venta', 'Venta suelta']].map(([k, l]) => <button key={k} type="button" className={nuevo.tipo === k ? 'on' : ''} onClick={() => setNuevo({ ...nuevo, tipo: k })}>{l}</button>)}
          </div>
          <Field label="Valor"><input type="number" min="0" step="500" autoFocus value={nuevo.monto} onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })} /></Field>
          <Field label="Descripción"><input value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} placeholder="Ej.: Transporte, publicidad, venta de mostrador" /></Field>
          <div className="grid2">
            <Field label="Medio"><select value={nuevo.medio_pago} onChange={(e) => setNuevo({ ...nuevo, medio_pago: e.target.value })}>{MEDIOS_PAGO.map((m) => <option key={m}>{m}</option>)}</select></Field>
            <Field label="Fecha"><input type="date" value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} /></Field>
          </div>
        </Sheet>
      )}
    </div>
  )
}
