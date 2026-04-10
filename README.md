# SIGAM Tools

Herramientas operativas para trazabilidad y gestión ganadera.

## Estructura

```
/                  → Hub de herramientas
/movimiento        → Conferencia de movimiento interno (EO/ED)
```

## Deploy

Conectado a Vercel via integración GitHub. Cada push a `main` hace deploy automático.

## Capas de acceso

- **Abierto** — sin login, cualquier persona con el link
- **Login SIGAM** — autenticación Supabase del SIGAM principal
