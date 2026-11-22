import { useEffect, useState } from 'react'
import { db } from '../data'
import { money, CATEGORIAS, MEDIOS_PAGO } from '../lib'
import { Loading, Empty, Sheet, Field, Badge } from '../components/ui'

const nuevo = () => ({ nombre: '', categoria: 'Base y empaque', unidad: 'unidad', costo_unitario: 0, stock: 0 })

export default function Materiales({ notify, tab }) {
  const [mats, setMats] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [edit, setEdit] = useState(null)
  const [compra, setCompra] = useState(null)
  const [q, setQ] = useState('')
  const vista = tab === 'compras' ? 'compras' : 'inventario'

  const load = async () => { const [m, p] = await Promise.all([db.materiales(), db.pedidos()]); setMats(m); setPedidos(p) }
  useEffect(() => { load().catch((e) => notify(e.message, 'error')) }, [])
  if (!mats) return <Loading />

  async function guardar() {
    if (!edit.nombre.trim()) return notify('Escribe el nombre', 'error')
    try { await db.guardarMaterial(edit); setEdit(null); await load(); notify('Material guardado') } catch (e) { notify(e.message, 'error') }
  }
  async function comprar() {
    const cant = Number(compra.cantidad), total = Number(compra.total)
    if (!(cant > 0) || !(total >= 0)) return notify('Revisa cantidad y valor', 'error')
    try { await db.registrarCompra(compra.material, cant, total, compra.medio); setCompra(null); await load(); notify('Compra registrada: stock y costo actualizados') } catch (e) { notify(e.message, 'error') }
  }

  // Lista de compras consolidada de los pedidos activos
  const activos = pedidos.filter((p) => ['cotizado', 'confirmado'].includes(p.estado))
  const necesidad = {}
  for (const p of activos) for (const i of p.pedido_items) {
    if (!i.material_id) continue
    necesidad[i.material_id] ??= { confirmado: 0, cotizado: 0 }
    necesidad[i.material_id][p.estado] += Number(i.cantidad)
  }
  const aComprar = mats.map((m) => {
    const n = necesidad[m.id] || { confirmado: 0, cotizado: 0 }
    return { m, ...n, falta: Math.max(0, n.confirmado - Number(m.stock)), faltaTodo: Math.max(0, n.confirmado + n.cotizado - Number(m.stock)) }
  }).filter((x) => x.faltaTodo > 0)

  const filtrados = mats.filter((m) => !q || m.nombre.toLowerCase().includes(q.toLowerCase()))
  const grupos = CATEGORIAS.map((c) => [c, filtrados.filter((m) => m.categoria === c)]).filter(([, l]) => l.length)

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Materiales</h1>
        <button className="btn btn-primary" onClick={() => setEdit(nuevo())}>＋ Material</button>
      </div>
      <div className="seg">
        <a href="#/materiales" className={vista === 'inventario' ? 'on' : ''}>Inventario</a>
        <a href="#/materiales/compras" className={vista === 'compras' ? 'on' : ''}>Por comprar {aComprar.length ? `(${aComprar.length})` : ''}</a>
      </div>

      {vista === 'inventario' && (mats.length === 0 ? (
        <Empty icon="🧺" title="Tu catálogo está vacío" text="Registra los materiales que usas en tus regalos con su costo. Así Detallia calcula el precio de cada pedido." action={<button className="btn btn-primary" onClick={() => setEdit(nuevo())}>Agregar material</button>} />
      ) : (
        <>
          <input className="search" placeholder="Buscar material" value={q} onChange={(e) => setQ(e.target.value)} />
          {grupos.map(([cat, lista]) => (
            <section key={cat}>
              <h2 className="group-title">{cat}</h2>
              <ul className="list">
                {lista.map((m) => (
                  <li key={m.id} className="list-item">
                    <button className="grow text-left" onClick={() => setEdit({ ...m })}>
                      <strong>{m.nombre}</strong>
                      <span className="muted">{money(m.costo_unitario)} por {m.unidad}</span>
                    </button>
                    <Badge tone={Number(m.stock) <= 0 ? 'danger' : Number(m.stock) <= 1 ? 'warn' : 'ok'}>{m.stock} en stock</Badge>
                    <button className="btn btn-sm" onClick={() => setCompra({ material: m, cantidad: 1, total: m.costo_unitario, medio: 'Efectivo' })}>Compré</button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      ))}

      {vista === 'compras' && (
        aComprar.length === 0 ? <Empty icon="✅" title="No necesitas comprar nada" text="Con tu inventario actual cubres los pedidos cotizados y confirmados." /> : (
          <section className="card">
            <p className="muted small">Calculado a partir de {activos.length} pedido(s) activos menos lo que tienes en inventario.</p>
            <ul className="checklist">
              {aComprar.map(({ m, falta, faltaTodo, confirmado, cotizado }) => (
                <li key={m.id}>
                  <span><b>{faltaTodo} {m.unidad}</b> · {m.nombre}<br /><span className="muted small">{falta > 0 ? `${falta} urgente(s) para pedidos confirmados · ` : ''}necesitas {confirmado + cotizado}, tienes {m.stock}</span></span>
                  <button className="btn btn-sm" onClick={() => setCompra({ material: m, cantidad: faltaTodo, total: faltaTodo * m.costo_unitario, medio: 'Efectivo' })}>Compré</button>
                </li>
              ))}
            </ul>
            <p className="total-line">Total aproximado: <b>{money(aComprar.reduce((s, x) => s + x.faltaTodo * x.m.costo_unitario, 0))}</b></p>
          </section>
        )
      )}

      {edit && (
        <Sheet title={edit.id ? 'Editar material' : 'Nuevo material'} onClose={() => setEdit(null)} footer={
          <div className="row-gap">
            {edit.id && <button className="btn btn-ghost danger" onClick={() => confirm('¿Eliminar este material?') && db.borrarMaterial(edit.id).then(() => { setEdit(null); load(); notify('Material eliminado') })}>Eliminar</button>}
            <button className="btn btn-primary grow" onClick={guardar}>Guardar</button>
          </div>}>
          <Field label="Nombre"><input autoFocus value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} placeholder="Ej.: Globo metalizado" /></Field>
          <Field label="Categoría"><select value={edit.categoria} onChange={(e) => setEdit({ ...edit, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <div className="grid3">
            <Field label="Unidad"><input value={edit.unidad} onChange={(e) => setEdit({ ...edit, unidad: e.target.value })} /></Field>
            <Field label="Costo unitario"><input type="number" min="0" step="100" value={edit.costo_unitario} onChange={(e) => setEdit({ ...edit, costo_unitario: e.target.value })} /></Field>
            <Field label="En stock"><input type="number" step="0.5" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: e.target.value })} /></Field>
          </div>
        </Sheet>
      )}
      {compra && (
        <Sheet title={`Compra de ${compra.material.nombre}`} onClose={() => setCompra(null)} footer={<button className="btn btn-primary btn-block" onClick={comprar}>Registrar compra</button>}>
          <p className="muted small">Se suma al inventario, se actualiza el costo unitario y queda el egreso en caja.</p>
          <div className="grid2">
            <Field label={`Cantidad (${compra.material.unidad})`}><input type="number" min="0.5" step="0.5" value={compra.cantidad} onChange={(e) => setCompra({ ...compra, cantidad: e.target.value })} /></Field>
            <Field label="Valor total pagado"><input type="number" min="0" step="100" value={compra.total} onChange={(e) => setCompra({ ...compra, total: e.target.value })} /></Field>
          </div>
          <p className="muted small">Nuevo costo unitario: <b>{money(compra.cantidad > 0 ? compra.total / compra.cantidad : 0)}</b></p>
          <Field label="Pagado con"><select value={compra.medio} onChange={(e) => setCompra({ ...compra, medio: e.target.value })}>{MEDIOS_PAGO.map((m) => <option key={m}>{m}</option>)}</select></Field>
        </Sheet>
      )}
    </div>
  )
}
