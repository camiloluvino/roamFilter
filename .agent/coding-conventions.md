# Coding Conventions - roamFilter

## 1. Versionado en Código

Siempre incluir al inicio del archivo principal:

```javascript
// Version: X.Y.Z
// Date: YYYY-MM-DD HH:MM
```

Esto permite identificar qué versión está corriendo en Roam Research.

## 2. Estructura de Archivos

```
src/
├── core/       # Lógica de negocio (queries, tree-builder, exporter)
├── ui/         # Componentes de interfaz (modals, notificaciones)
└── utils/      # Utilidades compartidas
```

## 3. Comentarios

- Comentar el **propósito** de funciones, no el **cómo**
- Usar `// TODO:` para mejoras pendientes
- Usar `// HACK:` para soluciones temporales

## 4. Manejo de Errores

- Siempre usar try/catch en funciones que interactúan con la API de Roam
- Mostrar notificaciones amigables al usuario
- Loguear errores técnicos en consola

## 5. Nomenclatura

- Funciones: `camelCase` - verbos (`findBlocksByTag`, `exportFilteredContent`)
- Constantes: `UPPER_SNAKE_CASE`
- Variables: `camelCase`
