import { useEffect, useState } from 'react'
import { db } from '../data'
import { money, MESES, OCASIONES, diasHasta, waLink } from '../lib'
import { Loading, Empty, Sheet, Field, WaButton, Badge } from '../components/ui'

export default function Clientes({ notify, negocio }) {
  const [cls, setCls] = useState(null)
  const [edit, setEdit] = useState(null)
  const [nuevaFecha, setNuevaFecha] = useState({ ocasion: 'Cumpleaños', para_quien: '', fecha: '' })
  const [q, setQ] = useState('')

  const load = async () => { const c = await db.clientes(); setCls(c); if (edit?.id) setEdit((e) => ({ ...e, ...c.find((x) => x.id === e.id) })) }
  useEffect(() => { load().catch((e) => notify(e.message, 'error')) }, [])
  if (!cls) return <Loading />

  async function guardar() {
    if (!edit.nombre.trim()) return notify('Escribe el nombre', 'error')
    try { const c = await db.guardarCliente(edit); setEdit({ ...edit, ...c, fechas_especiales: edit.fechas_especiales || [], pedidos: edit.pedidos || [] }); await load(); notify('Cliente guardado') } catch (e) { notify(e.message, 'error') }
  }
  async function agregarFecha() {
    if (!nuevaFecha.fecha) return notify('Elige la fecha', 'error')
    const d = new Date(nuevaFecha.fecha + 'T12:00:00')
    try {
      const f = await db.agregarFecha({ cliente_id: edit.id, ocasion: nuevaFecha.ocasion, para_quien: nuevaFecha.para_quien, mes: d.getMonth() + 1, dia: d.getDate() })
      setEdit({ ...edit, fechas_especiales: [...(edit.fechas_especiales || []), f] })
      setNuevaFecha({ ocasion: 'Cumpleaños', para_quien: '', fecha: '' }); load(); notify('Fecha guardada')
    } catch (e) { notify(e.message, 'error') }
  }

  const lista = cls.filter((c) => !q || `${c.nombre} ${c.telefono || ''}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Clientes</h1>
        <button className="btn btn-primary" onClick={() => setEdit({ nombre: '', telefono: '', notas: '', fechas_especiales: [], pedidos: [] })}>＋ Cliente</button>
      </div>
      {cls.length === 0 ? (
        <Empty icon="💌" title="Aún no tienes clientes" text="Guarda a quienes te compran y sus fechas especiales: Detallia te recordará escribirles antes de cada cumpleaños o aniversario." />
      ) : (
        <>
          <input className="search" placeholder="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="list">
            {lista.map((c) => {
              const entregados = c.pedidos.filter((p) => p.estado === 'entregado')
              const prox = c.fechas_especiales.map((f) => ({ ...f, d: diasHasta(f.mes, f.dia) })).sort((a, b) => a.d - b.d)[0]
              return (
                <li key={c.id} className="list-item">
                  <button className="grow text-left" onClick={() => setEdit({ ...c })}>
                    <strong>{c.nombre}</strong>
                    <span className="muted">{entregados.length} compra(s) · {money(entregados.reduce((s, p) => s + Number(p.precio_venta), 0))}</span>
                    {prox && <span className="small">{prox.ocasion} en {prox.d} días</span>}
                  </button>
                  {entregados.length >= 2 && <Badge tone="ok">Frecuente</Badge>}
                  {c.telefono && <WaButton small href={waLink(c.telefono, `¡Hola ${c.nombre.split(' ')[0]}! Te saluda ${negocio.nombre} 🎁`)}>Escribir</WaButton>}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {edit && (
        <Sheet title={edit.id ? edit.nombre || 'Cliente' : 'Nuevo cliente'} onClose={() => setEdit(null)} footer={
          <div className="row-gap">
            {edit.id && <button className="btn btn-ghost danger" onClick={() => confirm('¿Eliminar este cliente y sus fechas?') && db.borrarCliente(edit.id).then(() => { setEdit(null); load(); notify('Cliente eliminado') })}>Eliminar</button>}
            <button className="btn btn-primary grow" onClick={guardar}>Guardar datos</button>
          </div>}>
          <Field label="Nombre"><input value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} /></Field>
          <Field label="Celular (WhatsApp)"><input inputMode="tel" value={edit.telefono || ''} onChange={(e) => setEdit({ ...edit, telefono: e.target.value })} placeholder="3001234567" /></Field>
          <Field label="Notas y gustos"><textarea rows={2} value={edit.notas || ''} onChange={(e) => setEdit({ ...edit, notas: e.target.value })} /></Field>
          {edit.id ? (
            <div className="subcard">
              <h3>Fechas especiales</h3>
              {(edit.fechas_especiales || []).length === 0 && <p className="muted small">Sin fechas registradas.</p>}
              <ul className="checklist">
                {(edit.fechas_especiales || []).map((f) => (
                  <li key={f.id}><span>{f.ocasion}{f.para_quien ? ` (${f.para_quien})` : ''} · {f.dia} de {MESES[f.mes - 1]}</span>
                    <button className="icon-btn" aria-label="Eliminar fecha" onClick={() => db.borrarFecha(f.id).then(() => { setEdit({ ...edit, fechas_especiales: edit.fechas_especiales.filter((x) => x.id !== f.id) }); load() })}>✕</button></li>
                ))}
              </ul>
              <div className="grid3">
                <Field label="Ocasión"><select value={nuevaFecha.ocasion} onChange={(e) => setNuevaFecha({ ...nuevaFecha, ocasion: e.target.value })}>{OCASIONES.map((o) => <option key={o}>{o}</option>)}</select></Field>
                <Field label="¿Para quién?"><input value={nuevaFecha.para_quien} onChange={(e) => setNuevaFecha({ ...nuevaFecha, para_quien: e.target.value })} placeholder="Su mamá" /></Field>
                <Field label="Fecha"><input type="date" value={nuevaFecha.fecha} onChange={(e) => setNuevaFecha({ ...nuevaFecha, fecha: e.target.value })} /></Field>
              </div>
              <button className="btn btn-sm" onClick={agregarFecha}>＋ Agregar fecha</button>
            </div>
          ) : <p className="muted small">Guarda el cliente para poder agregar sus fechas especiales.</p>}
        </Sheet>
      )}
    </div>
  )
}
