import { useState } from 'react'
import { supabase } from '../supabase'
import { Field } from '../components/ui'

const RELACION = ['Tengo un emprendimiento de regalos o detalles', 'Tengo otro emprendimiento que vende por encargo', 'Compro regalos o anchetas', 'Otro']
const REGISTRO = ['Cuaderno', 'Notas del celular', 'Excel', 'WhatsApp', 'Una aplicación', 'De memoria']
const FUNCIONES = ['Precio y ganancia por pedido', 'Lista de compras', 'Recordatorios de clientes', 'Caja y resumen del mes', 'Cotización por WhatsApp']
const USARIA = ['Sí, definitivamente', 'Probablemente', 'No estoy seguro(a)', 'No']
const PAGARIA = ['Nada, solo la versión gratis', 'Menos de $20.000', 'Entre $20.000 y $40.000', 'Más de $40.000']

function Escala({ value, onChange, bajo, alto }) {
  return (
    <div>
      <div className="scale">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} className={value === n ? 'on' : ''} onClick={() => onChange(n)} aria-label={`${n} de 5`}>{n}</button>
        ))}
      </div>
      <div className="scale-legend"><span>{bajo}</span><span>{alto}</span></div>
    </div>
  )
}

function Opciones({ options, value, onChange, multi }) {
  const on = (o) => (multi ? value.includes(o) : value === o)
  const toggle = (o) => onChange(multi ? (on(o) ? value.filter((x) => x !== o) : [...value, o]) : o)
  return (
    <div className="options">
      {options.map((o) => (
        <button type="button" key={o} className={on(o) ? 'on' : ''} onClick={() => toggle(o)}>
          <span className={multi ? 'box' : 'dot'} aria-hidden />{o}
        </button>
      ))}
    </div>
  )
}

export default function Encuesta({ session }) {
  const [r, setR] = useState({ nombre: '', relacion: '', registro_actual: [], facilidad: 0, util_precio: 0, util_compras: 0, util_recordatorios: 0, funcion_favorita: '', usaria: '', pagaria: '', mejoras: '' })
  const [estado, setEstado] = useState('form')
  const [err, setErr] = useState('')
  const set = (k) => (v) => { setR({ ...r, [k]: v }); setErr('') }

  async function enviar(e) {
    e.preventDefault()
    const falta = !r.nombre.trim() ? 'tu nombre' : !r.relacion ? 'tu relación con el negocio' : !r.facilidad ? 'la facilidad de uso'
      : !r.util_precio || !r.util_compras || !r.util_recordatorios ? 'las calificaciones de utilidad' : !r.funcion_favorita ? 'la función favorita'
      : !r.usaria ? 'si la usarías' : !r.pagaria ? 'cuánto pagarías' : ''
    if (falta) return setErr(`Falta responder: ${falta}.`)
    setErr(''); setEstado('enviando')
    const { error } = await supabase.from('encuestas').insert({ ...r, nombre: r.nombre.trim(), mejoras: r.mejoras.trim() || null })
    if (error) { setErr('No se pudo enviar: ' + error.message); setEstado('form') } else setEstado('ok')
  }

  if (estado === 'ok') return (
    <div className="survey">
      <div className="card center stack-sm">
        <div className="empty-icon">💜</div>
        <h1>¡Gracias por tu opinión!</h1>
        <p className="muted">Tus respuestas nos ayudan a mejorar Detallia.</p>
        <a className="btn btn-primary" href={session ? '#/inicio' : '#/'}>Volver a la app</a>
      </div>
    </div>
  )

  return (
    <form className="survey stack" onSubmit={enviar}>
      <div className="survey-head">
        <img src="/icon.svg" alt="" width="48" height="48" />
        <h1>Tu opinión sobre Detallia</h1>
        <p className="muted">Encuesta académica · Politécnico Grancolombiano · 3 minutos. Si aún no la has probado, <a href="#/">crea una cuenta</a> y toca "Cargar datos de ejemplo".</p>
      </div>
      <section className="card stack-sm">
        <Field label="1. Tu nombre"><input value={r.nombre} onChange={(e) => set('nombre')(e.target.value)} maxLength={80} /></Field>
        <div className="q"><p className="q-t">2. ¿Cuál es tu relación con este tipo de negocio?</p><Opciones options={RELACION} value={r.relacion} onChange={set('relacion')} /></div>
        <div className="q"><p className="q-t">3. ¿Cómo llevas hoy (o cómo crees que se llevan) los pedidos, materiales y cuentas? <span className="muted">Puedes marcar varias.</span></p><Opciones multi options={REGISTRO} value={r.registro_actual} onChange={set('registro_actual')} /></div>
      </section>
      <section className="card stack-sm">
        <div className="q"><p className="q-t">4. ¿Qué tan fácil fue usar Detallia?</p><Escala value={r.facilidad} onChange={set('facilidad')} bajo="Muy difícil" alto="Muy fácil" /></div>
        <div className="q"><p className="q-t">5. ¿Qué tan útil es el cálculo automático del precio y la ganancia de cada pedido?</p><Escala value={r.util_precio} onChange={set('util_precio')} bajo="Nada útil" alto="Muy útil" /></div>
        <div className="q"><p className="q-t">6. ¿Qué tan útil es la lista de compras de materiales?</p><Escala value={r.util_compras} onChange={set('util_compras')} bajo="Nada útil" alto="Muy útil" /></div>
        <div className="q"><p className="q-t">7. ¿Qué tan útiles son los recordatorios de fechas especiales por WhatsApp?</p><Escala value={r.util_recordatorios} onChange={set('util_recordatorios')} bajo="Nada útil" alto="Muy útil" /></div>
      </section>
      <section className="card stack-sm">
        <div className="q"><p className="q-t">8. ¿Qué función te gustó más?</p><Opciones options={FUNCIONES} value={r.funcion_favorita} onChange={set('funcion_favorita')} /></div>
        <div className="q"><p className="q-t">9. Si tuvieras un negocio así, ¿usarías Detallia?</p><Opciones options={USARIA} value={r.usaria} onChange={set('usaria')} /></div>
        <div className="q"><p className="q-t">10. ¿Cuánto pagarías al mes por esta aplicación?</p><Opciones options={PAGARIA} value={r.pagaria} onChange={set('pagaria')} /></div>
        <Field label="11. ¿Qué mejorarías o qué le falta?"><textarea rows={3} maxLength={1500} value={r.mejoras} onChange={(e) => set('mejoras')(e.target.value)} /></Field>
      </section>
      {err && <p className="form-msg error">{err}</p>}
      <button className="btn btn-primary btn-block" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviar respuestas'}</button>
    </form>
  )
}
