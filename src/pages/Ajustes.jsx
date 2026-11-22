import { useState } from 'react'
import { supabase } from '../supabase'
import { db } from '../data'
import { Field } from '../components/ui'

export default function Ajustes({ negocio, setNegocio, notify }) {
  const [v, setV] = useState({ ...negocio })
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  async function guardar(e) {
    e.preventDefault()
    try { const n = await db.guardarNegocio(v); setNegocio(n); notify('Ajustes guardados') } catch (err) { notify(err.message, 'error') }
  }
  return (
    <form className="stack" onSubmit={guardar}>
      <h1>Ajustes del negocio</h1>
      <section className="card stack-sm">
        <Field label="Nombre del negocio"><input value={v.nombre} onChange={set('nombre')} /></Field>
        <Field label="Celular del negocio"><input value={v.telefono || ''} onChange={set('telefono')} inputMode="tel" /></Field>
      </section>
      <section className="card stack-sm">
        <h2 className="card-title">Valores por defecto de cada pedido</h2>
        <div className="grid3">
          <Field label="Margen %" hint="Ganancia sobre materiales y mano de obra"><input type="number" min="0" value={v.margen_defecto} onChange={set('margen_defecto')} /></Field>
          <Field label="Mano de obra"><input type="number" min="0" step="1000" value={v.mano_obra_defecto} onChange={set('mano_obra_defecto')} /></Field>
          <Field label="Domicilio"><input type="number" min="0" step="1000" value={v.domicilio_defecto} onChange={set('domicilio_defecto')} /></Field>
        </div>
      </section>
      <button className="btn btn-primary btn-block">Guardar</button>
      <button type="button" className="btn btn-ghost btn-block" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      <p className="muted small center">Detallia MVP v1.0 · Proyecto de Emprendimiento de Base Tecnológica</p>
    </form>
  )
}
