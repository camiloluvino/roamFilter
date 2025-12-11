# Roam Filter Export

## Propósito
Plugin para exportar contenido filtrado por tags de Roam Research usando queries Datalog.
Resuelve el problema de que el filtro visual no funciona cuando los bloques están colapsados.

## Arquitectura
```
src/
├── core/
│   ├── queries.js      # Queries Datalog para buscar bloques
│   ├── tree-builder.js # Construye árboles con ancestros/descendientes
│   └── exporter.js     # Genera Markdown y descarga archivo
```

## Entry Point
`extension.js` - Registra comando en Command Palette de Roam

## Decisiones de Diseño
- Datalog en lugar de DOM (funciona con bloques colapsados)
- Exporta a archivo Markdown (escala mejor que portapapeles)
- Prompt simple para ingresar tag a buscar

## API de Roam Usada
- `window.roamAlphaAPI.data.q()` - Queries Datalog
- `window.roamAlphaAPI.pull()` - Obtener datos estructurados
- `window.roamAlphaAPI.ui.commandPalette.addCommand()` - Registrar comandos
