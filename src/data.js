import { supabase } from './supabase'
import { today, addDays } from './lib'

const check = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

export const db = {
  async negocio() {
    const r = check(await supabase.from('negocios').select('*').maybeSingle())
    if (r) return r
    let nombre = ''
    try { nombre = localStorage.getItem('detallia_nombre') || ''; localStorage.removeItem('detallia_nombre') } catch {}
    return check(await supabase.from('negocios').insert(nombre ? { nombre } : {}).select().single())
  },
  async guardarNegocio(v) {
    return check(await supabase.from('negocios').update(v).eq('user_id', v.user_id).select().single())
  },
  async materiales() {
    return check(await supabase.from('materiales').select('*').order('categoria').order('nombre'))
  },
  async guardarMaterial(m) {
    const { id, ...rest } = m
    if (id) return check(await supabase.from('materiales').update(rest).eq('id', id).select().single())
    return check(await supabase.from('materiales').insert(rest).select().single())
  },
  async borrarMaterial(id) {
    check(await supabase.from('materiales').delete().eq('id', id))
  },
  // Compra: actualiza costo unitario, suma stock y registra el egreso en caja
  async registrarCompra(material, cantidad, total, medio_pago) {
    const costo = cantidad > 0 ? total / cantidad : material.costo_unitario
    check(await supabase.from('materiales').update({ stock: Number(material.stock) + Number(cantidad), costo_unitario: Math.round(costo) }).eq('id', material.id))
    check(await supabase.from('movimientos').insert({ tipo: 'compra', monto: total, descripcion: `Compra: ${cantidad} ${material.unidad} de ${material.nombre}`, medio_pago, fecha: today() }))
  },
  async clientes() {
    return check(await supabase.from('clientes').select('*, fechas_especiales(*), pedidos(id, precio_venta, estado)').order('nombre'))
  },
  async guardarCliente(c) {
    const { id, fechas_especiales, pedidos, ...rest } = c
    if (id) return check(await supabase.from('clientes').update(rest).eq('id', id).select().single())
    return check(await supabase.from('clientes').insert(rest).select().single())
  },
  async borrarCliente(id) {
    check(await supabase.from('clientes').delete().eq('id', id))
  },
  async agregarFecha(f) {
    return check(await supabase.from('fechas_especiales').insert(f).select().single())
  },
  async borrarFecha(id) {
    check(await supabase.from('fechas_especiales').delete().eq('id', id))
  },
  async fechas() {
    return check(await supabase.from('fechas_especiales').select('*, clientes(id, nombre, telefono)'))
  },
  async pedidos() {
    return check(await supabase.from('pedidos').select('*, clientes(id, nombre, telefono), pedido_items(*)').order('fecha_entrega', { ascending: true, nullsFirst: false }))
  },
  async pedido(id) {
    return check(await supabase.from('pedidos').select('*, clientes(id, nombre, telefono), pedido_items(*)').eq('id', id).single())
  },
  async guardarPedido(p, items) {
    const { id, clientes, pedido_items, ...rest } = p
    let saved
    if (id) {
      saved = check(await supabase.from('pedidos').update(rest).eq('id', id).select().single())
      check(await supabase.from('pedido_items').delete().eq('pedido_id', id))
    } else {
      saved = check(await supabase.from('pedidos').insert(rest).select().single())
    }
    if (items.length) {
      check(await supabase.from('pedido_items').insert(items.map((i) => ({ pedido_id: saved.id, material_id: i.material_id || null, nombre: i.nombre, cantidad: i.cantidad, costo_unitario: i.costo_unitario }))))
    }
    return saved
  },
  async cambiarEstado(id, estado) {
    return check(await supabase.from('pedidos').update({ estado }).eq('id', id).select().single())
  },
  // Entrega: marca el pedido, descuenta materiales del inventario y registra la venta
  async entregar(pedido, medio_pago, materiales) {
    check(await supabase.from('pedidos').update({ estado: 'entregado', pagado: true, medio_pago }).eq('id', pedido.id))
    for (const it of pedido.pedido_items) {
      const m = materiales.find((x) => x.id === it.material_id)
      if (m) check(await supabase.from('materiales').update({ stock: Number(m.stock) - Number(it.cantidad) }).eq('id', m.id))
    }
    check(await supabase.from('movimientos').insert({ tipo: 'venta', monto: pedido.precio_venta, descripcion: `Venta: ${pedido.titulo}`, medio_pago, pedido_id: pedido.id, fecha: today() }))
  },
  async borrarPedido(id) {
    check(await supabase.from('pedidos').delete().eq('id', id))
  },
  async movimientos(desde, hasta) {
    return check(await supabase.from('movimientos').select('*').gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false }).order('created_at', { ascending: false }))
  },
  async agregarMovimiento(m) {
    return check(await supabase.from('movimientos').insert(m).select().single())
  },
  async borrarMovimiento(id) {
    check(await supabase.from('movimientos').delete().eq('id', id))
  },
}

// Datos de ejemplo para probar la app sin empezar en blanco
export async function cargarEjemplo() {
  const mats = check(await supabase.from('materiales').insert([
    { nombre: 'Caja de madera mediana', categoria: 'Base y empaque', unidad: 'unidad', costo_unitario: 12000, stock: 3 },
    { nombre: 'Bandeja para desayuno', categoria: 'Base y empaque', unidad: 'unidad', costo_unitario: 8000, stock: 4 },
    { nombre: 'Papel celofán', categoria: 'Base y empaque', unidad: 'pliego', costo_unitario: 1500, stock: 10 },
    { nombre: 'Cinta satinada', categoria: 'Decoración', unidad: 'metro', costo_unitario: 800, stock: 20 },
    { nombre: 'Globo metalizado', categoria: 'Decoración', unidad: 'unidad', costo_unitario: 4500, stock: 2 },
    { nombre: 'Tarjeta personalizada', categoria: 'Decoración', unidad: 'unidad', costo_unitario: 2000, stock: 15 },
    { nombre: 'Chocolates Ferrero x8', categoria: 'Comestibles', unidad: 'caja', costo_unitario: 18000, stock: 1 },
    { nombre: 'Jugo natural', categoria: 'Comestibles', unidad: 'unidad', costo_unitario: 3500, stock: 0 },
    { nombre: 'Fruta picada', categoria: 'Comestibles', unidad: 'porción', costo_unitario: 4000, stock: 0 },
    { nombre: 'Sándwich o croissant', categoria: 'Comestibles', unidad: 'unidad', costo_unitario: 5000, stock: 0 },
    { nombre: 'Rosas rojas', categoria: 'Flores', unidad: 'unidad', costo_unitario: 2500, stock: 12 },
    { nombre: 'Girasol', categoria: 'Flores', unidad: 'unidad', costo_unitario: 4000, stock: 0 },
    { nombre: 'Peluche pequeño', categoria: 'Peluches y regalos', unidad: 'unidad', costo_unitario: 15000, stock: 2 },
    { nombre: 'Taza personalizada', categoria: 'Peluches y regalos', unidad: 'unidad', costo_unitario: 12000, stock: 1 },
  ]).select())
  const M = Object.fromEntries(mats.map((m) => [m.nombre, m]))
  const cls = check(await supabase.from('clientes').insert([
    { nombre: 'Laura Gómez', telefono: '3001234567', notas: 'Prefiere colores pastel' },
    { nombre: 'Andrés Restrepo', telefono: '3109876543', notas: 'Cliente frecuente' },
    { nombre: 'Marcela Ríos', telefono: '3205551234', notas: '' },
  ]).select())
  const C = Object.fromEntries(cls.map((c) => [c.nombre, c]))
  const hoy = today()
  const en = (n) => new Date(addDays(hoy, n) + 'T12:00:00')
  check(await supabase.from('fechas_especiales').insert([
    { cliente_id: C['Laura Gómez'].id, ocasion: 'Cumpleaños', para_quien: 'Su mamá', mes: en(6).getMonth() + 1, dia: en(6).getDate() },
    { cliente_id: C['Andrés Restrepo'].id, ocasion: 'Aniversario', para_quien: 'Su esposa', mes: en(18).getMonth() + 1, dia: en(18).getDate() },
    { cliente_id: C['Marcela Ríos'].id, ocasion: 'Cumpleaños', para_quien: 'Ella misma', mes: en(120).getMonth() + 1, dia: en(120).getDate() },
  ]))
  const it = (n, c) => ({ material_id: M[n].id, nombre: n, cantidad: c, costo_unitario: M[n].costo_unitario })
  const pedidos = [
    { cliente: 'Andrés Restrepo', titulo: 'Ancheta de aniversario', ocasion: 'Aniversario', fecha: addDays(hoy, -3), estado: 'entregado', items: [it('Caja de madera mediana', 1), it('Chocolates Ferrero x8', 1), it('Rosas rojas', 6), it('Cinta satinada', 2), it('Tarjeta personalizada', 1)], precio: 85000, medio: 'Nequi' },
    { cliente: 'Laura Gómez', titulo: 'Desayuno sorpresa', ocasion: 'Cumpleaños', fecha: addDays(hoy, 1), estado: 'confirmado', items: [it('Bandeja para desayuno', 1), it('Jugo natural', 1), it('Fruta picada', 1), it('Sándwich o croissant', 2), it('Globo metalizado', 1), it('Tarjeta personalizada', 1)], precio: 75000 },
    { cliente: 'Marcela Ríos', titulo: 'Arreglo de girasoles con peluche', ocasion: 'Grado', fecha: addDays(hoy, 4), estado: 'cotizado', items: [it('Girasol', 5), it('Peluche pequeño', 1), it('Papel celofán', 2), it('Cinta satinada', 2)], precio: 70000 },
  ]
  for (const p of pedidos) {
    const costo = p.items.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0)
    const saved = check(await supabase.from('pedidos').insert({
      cliente_id: C[p.cliente].id, titulo: p.titulo, ocasion: p.ocasion, fecha_entrega: p.fecha, hora_entrega: '9:00 a. m.',
      direccion: 'Calle principal, Hispania', mensaje_tarjeta: '¡Feliz día!', mano_obra: 10000, domicilio: 5000, margen: 35,
      costo_materiales: costo, precio_venta: p.precio, estado: p.estado, pagado: p.estado === 'entregado', medio_pago: p.medio || null,
    }).select().single())
    check(await supabase.from('pedido_items').insert(p.items.map((i) => ({ ...i, pedido_id: saved.id }))))
    if (p.estado === 'entregado') {
      check(await supabase.from('movimientos').insert({ tipo: 'venta', monto: p.precio, descripcion: `Venta: ${p.titulo}`, medio_pago: p.medio, pedido_id: saved.id, fecha: p.fecha }))
    }
  }
  check(await supabase.from('movimientos').insert([
    { tipo: 'compra', monto: 36000, descripcion: 'Compra: 3 cajas de madera', medio_pago: 'Efectivo', fecha: addDays(hoy, -5) },
    { tipo: 'gasto', monto: 12000, descripcion: 'Transporte a la ciudad por materiales', medio_pago: 'Efectivo', fecha: addDays(hoy, -5) },
  ]))
}
