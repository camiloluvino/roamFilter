# AI Context - roamFilter

## Propósito
Plugin de Roam Research para exportar contenido filtrado usando queries Datalog.
Funciona incluso con bloques colapsados.

## Características Actuales (v2.3.2)
- **Alt+Shift+C**: Copia bloques seleccionados visualmente (azules)
- **Export Filtered Content**: Busca por tag en página actual → descarga `.md`
- **Copy Filtered Content**: Busca por tag en página actual → copia al portapapeles
- Soporta formatos: `#tag`, `[[tag]]`, `#[[tag]]`
- Filtra por página actual (no todo el grafo)
- Preserva ordenamiento de bloques

## Stack Técnico
- Roam Alpha API (Datalog queries, pull)
- JavaScript vanilla (sin módulos ES)
- Clipboard API (text/plain + text/html)

## Decisiones de Diseño
- Todo inlineado en `extension.js` (Roam no soporta módulos)
- Recursión manual para obtener descendientes (no `...` en pull)
- Versionado con fecha/hora en header
