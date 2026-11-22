import { useEffect, useMemo, useState } from 'react'
import { db } from '../data'
import { money, precioSugerido, OCASIONES, today, go } from '../lib'
import { Loading, Field, Sheet } from '../components/ui'

const vacio = (n) => ({ titulo: '', cliente_id: '', ocasion: 'Cumpleaños', fecha_entrega: today(), hora_entrega: '', direccion: '', mensaje_tarjeta: '', mano_obra: n.mano_obra_defecto, domicilio: n.domicilio_defecto, margen: n.margen_defecto, precio_venta: 0, estado: 'cotizado' })

export default function PedidoForm({ negocio, notify, id }) {
  const [p, setP] = useState(null)
  const [items, setItems] = useState([])
  const [materiales, setMateriales] = useState([])
  const [clientes, setClientes] = useState([])
  const [buscar, setBuscar] = useState('')
  const [precioManual, setPrecioManual] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState(null)
  const [libre, setLibre] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      const [mats, cls] = await Promise.all([db.materiales(), db.clientes()])
      setMateriales(mats); setClientes(cls)
      if (id) {
        const ped = await db.pedido(id)
        setP({ ...ped, cliente_id: ped.cliente_id || '' })
        setItems(ped.pedido_items.map((i) => ({ ...i })))
        setPrecioManual(true)
      } else {
        const dup = sessionStorage.getItem('detallia_duplicar')
        if (dup) {
          sessionStorage.removeItem('detallia_duplicar')
          const d = JSON.parse(dup)
          setP({ ...vacio(negocio), ...d.pedido })
          setItems(d.items)
        } else setP(vacio(negocio))
      }
    })().catch((e) => notify(e.message, 'error'))
  }, [id])

  const costo = useMemo(() => items.reduce((s, i) => s + Number(i.cantidad) * Number(i.costo_unitario), 0), [items])
  const sugerido = p ? precioSugerido(costo, p.mano_obra, p.margen, p.domicilio) : 0
  const precio = precioManual ? Number(p?.precio_venta || 0) : sugerido
  const gana = precio - costo - Number(p?.domicilio || 0)
  const margenReal = precio > 0 ? Math.round((gana / precio) * 100) : 0

  if (!p) return <Loading />
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value })

  const agregar = (m) => {
    const ex = items.find((i) => i.material_id === m.id)
    if (ex) setItems(items.map((i) => (i === ex ? { ...i, cantidad: Number(i.cantidad) + 1 } : i)))
    else setItems([...items, { material_id: m.id, nombre: m.nombre, cantidad: 1, costo_unitario: m.costo_unitario }])
    setBuscar('')
  }
  const cambiar = (idx, k, v) => setItems(items.map((i, j) => (j === idx ? { ...i, [k]: v } : i)))
  const quitar = (idx) => setItems(items.filter((_, j) => j !== idx))
  const sugerencias = buscar ? materiales.filter((m) => m.nombre.toLowerCase().includes(buscar.toLowerCase())).slice(0, 6) : []

  async function guardar(e) {
    e.preventDefault()
    if (!p.titulo.trim()) return notify('Ponle un nombre al pedido', 'error')
    if (!items.length) return notify('Agrega al menos un componente', 'error')
    setBusy(true)
    try {
      const { id: _i, user_id, created_at, ...rest } = p
      const saved = await db.guardarPedido({ ...rest, id, cliente_id: p.cliente_id || null, costo_materiales: costo, precio_venta: precio, fecha_entrega: p.fecha_entrega || null }, items)
      notify(id ? 'Pedido actualizado' : 'Pedido guardado')
      go(`pedidos/${saved.id}`)
    } catch (err) { notify(err.message, 'error') } finally { setBusy(false) }
  }

  async function crearCliente() {
    if (!nuevoCliente.nombre.trim()) return
    try {
      const c = await db.guardarCliente(nuevoCliente)
      setClientes([...clientes, c]); setP({ ...p, cliente_id: c.id }); setNuevoCliente(null)
      notify('Cliente creado')
    } catch (err) { notify(err.message, 'error') }
  }

  return (
    <form className="stack" onSubmit={guardar}>
      <div className="page-head">
        <h1>{id ? 'Editar pedido' : 'Nuevo pedido'}</h1>
        <a className="btn btn-ghost" href={id ? `#/pedidos/${id}` : '#/pedidos'}>Cancelar</a>
      </div>

      <section className="card stack-sm">
        <h2 className="card-title">1. Cliente y entrega</h2>
        <Field label="Nombre del pedido"><input value={p.titulo} onChange={set('titulo')} placeholder="Ej.: Desayuno sorpresa con globos" required /></Field>
        <div className="grid2">
          <Field label="Cliente">
            <div className="row-gap">
              <select value={p.cliente_id} onChange={set('cliente_id')} className="grow">
                <option value="">Sin cliente</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button type="button" className="btn btn-sm" onClick={() => setNuevoCliente({ nombre: '', telefono: '' })}>＋</button>
            </div>
          </Field>
          <Field label="Ocasión">
            <select value={p.ocasion || ''} onChange={set('ocasion')}>{OCASIONES.map((o) => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="Fecha de entrega"><input type="date" value={p.fecha_entrega || ''} onChange={set('fecha_entrega')} /></Field>
          <Field label="Hora"><input value={p.hora_entrega || ''} onChange={set('hora_entrega')} placeholder="Ej.: 7:00 a. m." /></Field>
        </div>
        <Field label="Dirección de entrega"><input value={p.direccion || ''} onChange={set('direccion')} placeholder="Barrio, calle, referencia" /></Field>
        <Field label="Mensaje de la tarjeta"><textarea rows={2} value={p.mensaje_tarjeta || ''} onChange={set('mensaje_tarjeta')} /></Field>
      </section>

      <section className="card stack-sm">
        <h2 className="card-title">2. Arma el regalo</h2>
        <div className="autocomplete">
          <input className="search" placeholder="Busca un material: caja, globo, rosas…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          {sugerencias.length > 0 && (
            <ul className="ac-list">
              {sugerencias.map((m) => (
                <li key={m.id}><button type="button" onClick={() => agregar(m)}><span>{m.nombre}</span><span className="muted">{money(m.costo_unitario)} / {m.unidad}</span></button></li>
              ))}
            </ul>
          )}
          {buscar && sugerencias.length === 0 && <p className="muted small">No está en tu catálogo. <button type="button" className="link" onClick={() => setLibre({ nombre: buscar, cantidad: 1, costo_unitario: 0 })}>Agregarlo solo a este pedido</button></p>}
        </div>
        {materiales.length > 0 && !buscar && (
          <div className="chips chips-wrap">
            {materiales.slice(0, 10).map((m) => <button type="button" key={m.id} onClick={() => agregar(m)}>＋ {m.nombre}</button>)}
          </div>
        )}
        {materiales.length === 0 && <p className="muted small">Aún no tienes materiales. Puedes agregarlos en <a href="#/materiales">Materiales</a> o escribir uno nuevo arriba.</p>}

        {items.length > 0 && (
          <ul className="build">
            {items.map((i, idx) => (
              <li key={idx}>
                <div className="build-top"><strong>{i.nombre}</strong><button type="button" className="icon-btn" aria-label={`Quitar ${i.nombre}`} onClick={() => quitar(idx)}>✕</button></div>
                <div className="build-row">
                  <label><span>Cant.</span><input type="number" min="0.5" step="0.5" value={i.cantidad} onChange={(e) => cambiar(idx, 'cantidad', e.target.value)} /></label>
                  <span className="x">×</span>
                  <label><span>Costo unit.</span><input type="number" min="0" step="100" value={i.costo_unitario} onChange={(e) => cambiar(idx, 'costo_unitario', e.target.value)} /></label>
                  <b className="sub">{money(i.cantidad * i.costo_unitario)}</b>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack-sm">
        <h2 className="card-title">3. Precio</h2>
        <div className="grid3">
          <Field label="Mano de obra"><input type="number" min="0" step="1000" value={p.mano_obra} onChange={set('mano_obra')} /></Field>
          <Field label="Domicilio"><input type="number" min="0" step="1000" value={p.domicilio} onChange={set('domicilio')} /></Field>
          <Field label="Margen %"><input type="number" min="0" max="300" value={p.margen} onChange={set('margen')} /></Field>
        </div>
        <div className="breakdown">
          <div><span>Materiales</span><b>{money(costo)}</b></div>
          <div><span>Mano de obra</span><b>{money(p.mano_obra)}</b></div>
          <div><span>Margen ({p.margen}%)</span><b>{money((costo + Number(p.mano_obra)) * p.margen / 100)}</b></div>
          <div><span>Domicilio</span><b>{money(p.domicilio)}</b></div>
          <div className="total"><span>Precio sugerido</span><b>{money(sugerido)}</b></div>
        </div>
        <label className="check"><input type="checkbox" checked={precioManual} onChange={(e) => { setPrecioManual(e.target.checked); if (e.target.checked) setP({ ...p, precio_venta: sugerido }) }} /> Quiero cobrar otro precio</label>
        {precioManual && <Field label="Precio final"><input type="number" min="0" step="500" value={p.precio_venta} onChange={set('precio_venta')} /></Field>}
        <div className={`profit ${gana < 0 ? 'neg' : ''}`}>
          <span>Cobras {money(precio)} y te quedan</span>
          <strong>{money(gana)}</strong>
          <small>{margenReal}% del precio · después de materiales y domicilio</small>
        </div>
      </section>

      <div className="sticky-actions">
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Guardando…' : 'Guardar pedido'}</button>
      </div>

      {nuevoCliente && (
        <Sheet title="Nuevo cliente" onClose={() => setNuevoCliente(null)} footer={<button type="button" className="btn btn-primary btn-block" onClick={crearCliente}>Guardar cliente</button>}>
          <Field label="Nombre"><input autoFocus value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} /></Field>
          <Field label="Celular (WhatsApp)"><input inputMode="tel" value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} /></Field>
        </Sheet>
      )}
      {libre && (
        <Sheet title="Componente de este pedido" onClose={() => setLibre(null)} footer={<button type="button" className="btn btn-primary btn-block" onClick={() => { setItems([...items, { material_id: null, ...libre }]); setLibre(null); setBuscar('') }}>Agregar</button>}>
          <Field label="Nombre"><input value={libre.nombre} onChange={(e) => setLibre({ ...libre, nombre: e.target.value })} /></Field>
          <div className="grid2">
            <Field label="Cantidad"><input type="number" min="1" value={libre.cantidad} onChange={(e) => setLibre({ ...libre, cantidad: e.target.value })} /></Field>
            <Field label="Costo unitario"><input type="number" min="0" step="100" value={libre.costo_unitario} onChange={(e) => setLibre({ ...libre, costo_unitario: e.target.value })} /></Field>
          </div>
        </Sheet>
      )}
    </form>
  )
}
