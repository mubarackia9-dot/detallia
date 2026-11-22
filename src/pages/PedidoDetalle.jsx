import { useEffect, useState } from 'react'
import { db } from '../data'
import { money, fechaCorta, ESTADOS, MEDIOS_PAGO, waLink, ganancia, go } from '../lib'
import { Loading, Badge, Sheet, Field, WaButton } from '../components/ui'

export default function PedidoDetalle({ id, negocio, notify }) {
  const [p, setP] = useState(null)
  const [materiales, setMateriales] = useState([])
  const [entrega, setEntrega] = useState(null)
  const [fecha, setFecha] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const [ped, mats] = await Promise.all([db.pedido(id), db.materiales()])
    setP(ped); setMateriales(mats)
  }
  useEffect(() => { load().catch((e) => notify(e.message, 'error')) }, [id])
  if (!p) return <Loading />

  const estado = ESTADOS[p.estado]
  const faltantes = p.pedido_items.map((i) => {
    const m = materiales.find((x) => x.id === i.material_id)
    const stock = m ? Number(m.stock) : 0
    return { ...i, stock, falta: Math.max(0, Number(i.cantidad) - stock), unidad: m?.unidad || 'unidad' }
  })
  const porComprar = faltantes.filter((f) => f.falta > 0)
  const costoCompra = porComprar.reduce((s, f) => s + f.falta * f.costo_unitario, 0)

  const cliente = p.clientes
  const lineas = p.pedido_items.map((i) => `• ${i.cantidad > 1 ? i.cantidad + ' ' : ''}${i.nombre}`).join('\n')
  const cotizacion = `¡Hola${cliente ? ' ' + cliente.nombre.split(' ')[0] : ''}! 🎁 Te comparto la cotización de *${p.titulo}*:\n\n${lineas}\n\nEntrega: ${p.fecha_entrega ? fechaCorta(p.fecha_entrega) : 'por definir'}${p.hora_entrega ? ', ' + p.hora_entrega : ''}\nValor total: *${money(p.precio_venta)}* (incluye domicilio)\n\n¿Lo confirmamos? — ${negocio.nombre}`
  const listaTexto = `Lista de compras – ${p.titulo}\n` + porComprar.map((f) => `☐ ${f.falta} ${f.unidad} de ${f.nombre}`).join('\n')

  async function accion(fn, ok) {
    setBusy(true)
    try { await fn(); await load(); notify(ok) } catch (e) { notify(e.message, 'error') } finally { setBusy(false) }
  }

  function duplicar() {
    const { id: _a, user_id, created_at, clientes, pedido_items, estado: _e, pagado, medio_pago, ...rest } = p
    sessionStorage.setItem('detallia_duplicar', JSON.stringify({ pedido: { ...rest, titulo: rest.titulo + ' (copia)', estado: 'cotizado' }, items: pedido_items.map(({ material_id, nombre, cantidad, costo_unitario }) => ({ material_id, nombre, cantidad, costo_unitario })) }))
    go('pedidos/nuevo')
  }

  return (
    <div className="stack">
      <a href="#/pedidos" className="back">← Pedidos</a>
      <div className="page-head">
        <div>
          <h1>{p.titulo}</h1>
          <p className="muted">{p.ocasion} · {cliente?.nombre || 'Sin cliente'}</p>
        </div>
        <Badge tone={estado.tone}>{estado.label}</Badge>
      </div>

      <section className="card">
        <dl className="facts">
          <div><dt>Entrega</dt><dd>{fechaCorta(p.fecha_entrega)} {p.hora_entrega}</dd></div>
          <div><dt>Dirección</dt><dd>{p.direccion || '—'}</dd></div>
          <div><dt>Tarjeta</dt><dd>{p.mensaje_tarjeta || '—'}</dd></div>
          {p.pagado && <div><dt>Pago</dt><dd>{p.medio_pago}</dd></div>}
        </dl>
      </section>

      <section className="card">
        <h2 className="card-title">Componentes</h2>
        <table className="items read">
          <tbody>
            {p.pedido_items.map((i) => <tr key={i.id}><td>{i.cantidad} × {i.nombre}</td><td className="num">{money(i.cantidad * i.costo_unitario)}</td></tr>)}
          </tbody>
        </table>
        <div className="breakdown">
          <div><span>Materiales</span><b>{money(p.costo_materiales)}</b></div>
          <div><span>Domicilio</span><b>{money(p.domicilio)}</b></div>
          <div className="total"><span>Precio de venta</span><b>{money(p.precio_venta)}</b></div>
        </div>
        <div className={`profit ${ganancia(p) < 0 ? 'neg' : ''}`}><span>Ganancia de este pedido</span><strong>{money(ganancia(p))}</strong></div>
      </section>

      {p.estado !== 'entregado' && p.estado !== 'cancelado' && (
        <section className="card">
          <h2 className="card-title">Lista de compras</h2>
          {porComprar.length === 0 ? <p className="ok-text">✓ Tienes en inventario todo lo necesario.</p> : (
            <>
              <ul className="checklist">
                {porComprar.map((f) => <li key={f.id}><span>{f.falta} {f.unidad} · {f.nombre}</span><span className="muted small">tienes {f.stock}</span></li>)}
              </ul>
              <p className="muted small">Costo aproximado de la compra: <b>{money(costoCompra)}</b></p>
              <button className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(listaTexto).then(() => notify('Lista copiada'))}>Copiar lista</button>
            </>
          )}
        </section>
      )}

      <section className="actions">
        {cliente?.telefono && p.estado === 'cotizado' && <WaButton href={waLink(cliente.telefono, cotizacion)}>Enviar cotización</WaButton>}
        {p.estado === 'cotizado' && <button className="btn btn-primary" disabled={busy} onClick={() => accion(() => db.cambiarEstado(p.id, 'confirmado'), 'Pedido confirmado')}>Confirmar pedido</button>}
        {p.estado === 'confirmado' && <button className="btn btn-primary" disabled={busy} onClick={() => setEntrega({ medio: 'Nequi' })}>Entregado y cobrado</button>}
        {p.estado === 'entregado' && cliente && <button className="btn btn-primary" onClick={() => setFecha({ ocasion: p.ocasion || 'Cumpleaños', para_quien: '', fecha: p.fecha_entrega || '' })}>Guardar fecha para el próximo año</button>}
        {p.estado !== 'entregado' && <a className="btn" href={`#/pedidos/${p.id}/editar`}>Editar</a>}
        <button className="btn" onClick={duplicar}>Duplicar como plantilla</button>
        {['cotizado', 'confirmado'].includes(p.estado) && <button className="btn btn-ghost danger" disabled={busy} onClick={() => accion(() => db.cambiarEstado(p.id, 'cancelado'), 'Pedido cancelado')}>Cancelar pedido</button>}
        {p.estado === 'cancelado' && <button className="btn btn-ghost danger" onClick={() => confirm('¿Eliminar este pedido?') && db.borrarPedido(p.id).then(() => { notify('Pedido eliminado'); go('pedidos') })}>Eliminar</button>}
      </section>

      {entrega && (
        <Sheet title="Registrar entrega y pago" onClose={() => setEntrega(null)} footer={
          <button className="btn btn-primary btn-block" disabled={busy} onClick={() => accion(async () => { await db.entregar(p, entrega.medio, materiales); setEntrega(null) }, 'Venta registrada en caja')}>Confirmar {money(p.precio_venta)}</button>}>
          <p className="muted">Se registra la venta en caja y se descuentan los materiales usados del inventario.</p>
          <Field label="Medio de pago">
            <div className="chips chips-wrap">{MEDIOS_PAGO.map((m) => <button type="button" key={m} className={entrega.medio === m ? 'on' : ''} onClick={() => setEntrega({ medio: m })}>{m}</button>)}</div>
          </Field>
        </Sheet>
      )}
      {fecha && (
        <Sheet title="Fecha especial del cliente" onClose={() => setFecha(null)} footer={
          <button className="btn btn-primary btn-block" onClick={() => {
            if (!fecha.fecha) return notify('Elige la fecha', 'error')
            const d = new Date(fecha.fecha + 'T12:00:00')
            accion(async () => { await db.agregarFecha({ cliente_id: cliente.id, ocasion: fecha.ocasion, para_quien: fecha.para_quien, mes: d.getMonth() + 1, dia: d.getDate() }); setFecha(null) }, 'Te avisaremos antes de esa fecha')
          }}>Guardar recordatorio</button>}>
          <p className="muted">Detallia te recordará escribirle a {cliente.nombre} unos días antes, con un mensaje listo para WhatsApp.</p>
          <Field label="Ocasión"><input value={fecha.ocasion} onChange={(e) => setFecha({ ...fecha, ocasion: e.target.value })} /></Field>
          <Field label="¿Para quién?"><input value={fecha.para_quien} onChange={(e) => setFecha({ ...fecha, para_quien: e.target.value })} placeholder="Ej.: su mamá" /></Field>
          <Field label="Fecha"><input type="date" value={fecha.fecha} onChange={(e) => setFecha({ ...fecha, fecha: e.target.value })} /></Field>
        </Sheet>
      )}
    </div>
  )
}
