# Roam Export Filter - Smart Export for Filtered Blocks

Plugin para Roam Research que exporta contenido filtrado usando consultas Datalog. Funciona incluso con bloques colapsados.

## Características

- **Smart Export**: Modal unificado con dos modos (por tag o por selección de ramas)
- **Selección de Ramas**: Interfaz visual con botón "Seleccionar todo" y **filtrado de sub-ramas** (poda el contenido que no coincide con el tag)
- **EPUB Export**: Exportación a formato EPUB con opciones de estilo
- **Quick Copy (Alt+Shift+C)**: Copia bloques visualmente seleccionados
- **ZIP automático**: Bundling cuando hay >5 archivos

## Comandos

| Comando | Activación | Descripción |
|---------|------------|-------------|
| **Smart Export** | Command Palette | Modal unificado de exportación |
| **Smart Copy Selected Blocks** | `Alt+Shift+C` | Copia bloques seleccionados (azules) |
| **Export by Root Blocks** | Command Palette | Cada bloque raíz como archivo separado |

## Instalación (CDN - Recomendada)

1. Ve a la página `[[roam/js]]` en tu grafo
2. Crea un bloque `{{[[roam/js]]}}`
3. Añade un code block con:

```javascript
var s = document.createElement('script');
s.src = 'https://camiloluvino.github.io/roamFilter/roam-filter.js?v=' + Date.now();
s.type = 'text/javascript';
document.head.appendChild(s);
```

4. Refresca la página

## Desinstalar

```javascript
window.roamExportFilterCleanup();
```

## Licencia

MIT - Camilo Luvino