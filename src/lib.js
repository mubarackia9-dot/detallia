const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
export const money = (n) => cop.format(Math.round(Number(n) || 0))

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const ESTADOS = {
  cotizado: { label: 'Cotizado', tone: 'neutral' },
  confirmado: { label: 'Confirmado', tone: 'warn' },
  entregado: { label: 'Entregado', tone: 'ok' },
  cancelado: { label: 'Cancelado', tone: 'muted' },
}

export const MEDIOS_PAGO = ['Nequi', 'Efectivo', 'Transferencia', 'Daviplata']
export const OCASIONES = ['Cumpleaños', 'Aniversario', 'Amor y Amistad', 'Día de la Madre', 'Día del Padre', 'Grado', 'Navidad', 'Otro']
export const CATEGORIAS = ['Base y empaque', 'Comestibles', 'Flores', 'Decoración', 'Peluches y regalos', 'Otros']

export const today = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function fechaCorta(iso) {
  if (!iso) return 'Sin fecha'
  const d = new Date(iso + 'T12:00:00')
  const hoy = today()
  if (iso === hoy) return 'Hoy'
  if (iso === addDays(hoy, 1)) return 'Mañana'
  const t = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// Precio sugerido = (materiales + mano de obra) × (1 + margen) + domicilio, redondeado a $500
export function precioSugerido(materiales, manoObra, margen, domicilio) {
  const base = (Number(materiales) + Number(manoObra)) * (1 + Number(margen) / 100) + Number(domicilio)
  return Math.ceil(base / 500) * 500
}

export function ganancia(p) {
  return Number(p.precio_venta) - Number(p.costo_materiales) - Number(p.domicilio)
}

export function waLink(telefono, texto) {
  let t = String(telefono || '').replace(/\D/g, '')
  if (t.length === 10) t = '57' + t
  return `https://wa.me/${t}?text=${encodeURIComponent(texto)}`
}

// Días que faltan para la próxima ocurrencia de una fecha (mes/día)
export function diasHasta(mes, dia) {
  const hoy = new Date(today() + 'T12:00:00')
  let f = new Date(hoy.getFullYear(), mes - 1, dia, 12)
  if (f < hoy) f = new Date(hoy.getFullYear() + 1, mes - 1, dia, 12)
  return Math.round((f - hoy) / 86400000)
}

export function mesRango(year, month) {
  const ini = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const fin = new Date(year, month + 1, 0).getDate()
  return [ini, `${year}-${String(month + 1).padStart(2, '0')}-${String(fin).padStart(2, '0')}`]
}

export const go = (path) => { window.location.hash = '/' + path }
