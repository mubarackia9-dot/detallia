# Detallia

Aplicación web progresiva (PWA) para emprendimientos que venden regalos personalizados por encargo
(anchetas, desayunos sorpresa, arreglos florales). Producto Mínimo Viable del proyecto del módulo
*Emprendimiento de Base Tecnológica* – Politécnico Grancolombiano, 2026.

## Qué hace

- **Armador de pedidos con costeo:** el regalo se arma con componentes del catálogo y la app calcula
  costo de materiales, precio sugerido (materiales + mano de obra + margen + domicilio) y ganancia.
- **Cotización por WhatsApp:** envía al cliente el detalle y el valor con un toque.
- **Lista de compras:** por pedido y consolidada de todos los pedidos activos, descontando el inventario.
- **Inventario de materiales:** stock y costo unitario que se actualizan al registrar compras y entregas.
- **Clientes y fechas especiales:** recordatorios de cumpleaños y aniversarios con mensaje listo para WhatsApp.
- **Caja:** ventas, compras, gastos, ventas por medio de pago (Nequi, efectivo…) y ganancia por pedido.

## Tecnologías

React 18 + Vite 5 · Supabase (PostgreSQL, Auth, Row Level Security) · Vercel (hosting) · PWA (manifest + service worker).

## Ejecutar en local

```bash
npm install
npm run dev
```

Variables opcionales (`.env`): `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Si no se definen, se usa
el proyecto de Supabase de pruebas. La clave publicable es pública por diseño; la seguridad la dan las
políticas RLS, que limitan cada registro a la usuaria que lo creó.

## Modelo de datos

`negocios`, `materiales`, `clientes`, `fechas_especiales`, `pedidos`, `pedido_items`, `movimientos`.
