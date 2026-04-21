# SIGAM Trazabilidad

Producto web **standalone** para trazabilidad individual del ganado. Primer módulo: **Movimientos** (egreso EO + ingreso ED + conciliación automática).

- **Principio rector:** toda sesión tiene `guia_nro`; toda lectura tiene `eid`. La relación guía ↔ EID es la columna vertebral.
- Independiente de SIGAM App y SIAP. No comparte schema, auth ni deploy.

## Stack

- React 18 + Vite 5 + TailwindCSS 3 + React Router 6
- `@supabase/supabase-js` v2
- `@zxing/browser` (scan QR)
- `papaparse` + `xlsx` (planillas del bastón)

## Setup local

```bash
npm install
cp .env.example .env   # completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

## Base de datos

Aplicar la migration una vez en el SQL Editor del proyecto Supabase:

```
supabase/migrations/P1_initial.sql
```

La migration crea:
- 4 dimensiones (`establecimientos`, `proprietarios`, `establecimiento_proprietarios`)
- 3 transaccionales (`guias`, `sesiones`, `sesion_lecturas`)
- 1 de conciliación (`conferencias`)
- RPC `buscar_eid_por_caravana(guia, terminacion)`
- RPC `conciliar(guia)` — idempotente
- Triggers en `sesiones` y `sesion_lecturas` que invocan `conciliar`
- Policies RLS "auth_all" en todas las tablas

## Flujo de operación

1. **Escanear** QR de la guía → se persisten guía + dimensiones.
2. **Abrir sesión** (EGRESO o INGRESO) con chapa, transportista, precintos.
3. **Subir planilla** del bastón Tru-Test (acepta hex, decimal, decimal2).
4. Si hubo `animales_sin_boton > 0`, **identificar por caravana** (terminación visual → EID completo vía RPC).
5. Al registrarse ambas sesiones, la conciliación corre automáticamente y produce el estado (`OK`, `DISCREPANCIA`, `PENDIENTE`, `RESUELTA`).
6. **Resolver** discrepancias con motivo y nota. Cuando todas están resueltas, marcá la conferencia como `RESUELTA`.

## Tipos de discrepancia

- `EID_FALTANTE` — EID de origen que no aparece en destino.
- `EID_EXTRA` — EID en destino que no estaba en origen.
- `BOTON_PERDIDO_TRANSITO` — EID de origen leído en destino por caravana (bóton caído).
- `CONTAGEM_FISICA_DIVERGENTE` — conteo físico (lecturas + sin-bóton) ≠ cantidad declarada en la guía.
- `PRECINTO_DIVERGENTE`, `CHAPA_DIVERGENTE`, `TRANSPORTISTA_DIVERGENTE`.

## Deploy

Vercel — sólo setear `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en las env vars del proyecto. `vercel.json` ya provee el rewrite para SPA.

## Branches

- `main` — versión clean del producto.
- `legacy-prototype` — backup de los prototipos previos (`/movimiento`, `/checkpoint`, `/mortalidade`).
