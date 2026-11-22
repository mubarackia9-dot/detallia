import { useEffect, useState } from 'react'
import { db } from '../data'
import { money, fechaCorta, ESTADOS, ganancia } from '../lib'
import { Loading, Empty, Badge } from '../components/ui'

const FILTROS = [['activos', 'Activos'], ['cotizado', 'Cotizados'], ['confirmado', 'Confirmados'], ['entregado', 'Entregados'], ['todos', 'Todos']]

export default function Pedidos({ notify }) {
  const [pedidos, setPedidos] = useState(null)
  const [filtro, setFiltro] = useState('activos')
  const [q, setQ] = useState('')
  useEffect(() => { db.pedidos().then(setPedidos).catch((e) => notify(e.message, 'error')) }, [])
  if (!pedidos) return <Loading />

  const lista = pedidos
    .filter((p) => filtro === 'todos' || (filtro === 'activos' ? ['cotizado', 'confirmado'].includes(p.estado) : p.estado === filtro))
    .filter((p) => !q || `${p.titulo} ${p.clientes?.nombre || ''}`.toLowerCase().includes(q.toLowerCase()))
  if (filtro === 'entregado' || filtro === 'todos') lista.sort((a, b) => (b.fecha_entrega || '').localeCompare(a.fecha_entrega || ''))

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Pedidos</h1>
        <a className="btn btn-primary" href="#/pedidos/nuevo">＋ Nuevo</a>
      </div>
      <input className="search" placeholder="Buscar por pedido o cliente" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        {FILTROS.map(([k, l]) => <button key={k} className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)}>{l}</button>)}
      </div>
      {lista.length === 0 ? (
        <Empty icon="📦" title="No hay pedidos aquí" text="Crea un pedido cada vez que un cliente te escriba para cotizar un regalo." action={<a className="btn btn-primary" href="#/pedidos/nuevo">Crear pedido</a>} />
      ) : (
        <ul className="list">
          {lista.map((p) => (
            <li key={p.id}><a className="list-item" href={`#/pedidos/${p.id}`}>
              <div className="date-chip"><b>{fechaCorta(p.fecha_entrega)}</b><span>{p.hora_entrega || ''}</span></div>
              <div className="grow">
                <strong>{p.titulo}</strong>
                <span className="muted">{p.clientes?.nombre || 'Sin cliente'} · {p.pedido_items.length} componentes</span>
              </div>
              <div className="right">
                <strong>{money(p.precio_venta)}</strong>
                <span className={ganancia(p) < 0 ? 'neg small' : 'pos small'}>gana {money(ganancia(p))}</span>
                <Badge tone={ESTADOS[p.estado].tone}>{ESTADOS[p.estado].label}</Badge>
              </div>
            </a></li>
          ))}
        </ul>
      )}
    </div>
  )
}
