# Tasklane

Plataforma de gestión de proyectos y colaboración en tiempo real estructurada mediante tableros, listas y tarjetas.

## Tabla de Contenidos

- [Acerca del Proyecto](#acerca-del-proyecto)
- [Funcionalidades](#funcionalidades)
- [Modelo de Dominio](#modelo-de-dominio)
- [Stack Tecnológico](#stack-tecnológico)
- [Decisiones de Arquitectura](#decisiones-de-arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Guía de Inicio Rápido](#guía-de-inicio-rápido)
  - [Prerrequisitos](#prerrequisitos)
  - [Variables de Entorno](#variables-de-entorno)
  - [Instalación y Ejecución](#instalación-y-ejecución)
  - [Comandos Disponibles](#comandos-disponibles)

## Acerca del Proyecto

Tasklane es una aplicación web de gestión visual del trabajo diseñada para equipos de alto rendimiento. Su objetivo central es ofrecer una experiencia de colaboración fluida e instantánea: cualquier cambio realizado por un miembro (mover tarjetas, editar descripciones, asignar etiquetas o publicar comentarios) se refleja de forma inmediata en las pantallas de todos los usuarios conectados sin necesidad de recargar la página.

## Funcionalidades

- **Identidad**: registro, inicio y cierre de sesión con email y contraseña mediante Clerk.
- **Dashboard**: vista de todos los Boards que un usuario posee o a los que pertenece, con creación de Boards y estados vacíos guiados.
- **Boards, Lists y Cards**: CRUD completo con reordenamiento _drag & drop_ (listas y tarjetas), movimiento entre listas y edición en línea.
- **Detalle de Card**: descripción con Markdown, etiquetas de la paleta del Board, fecha límite con estado de vencimiento, asignación de miembros y hilo cronológico de comentarios.
- **Paleta de Labels**: gestión por el Owner de hasta 8 etiquetas (crear, renombrar, recolorar, eliminar); el cambio se propaga a todas las tarjetas.
- **Archivo y restauración**: las tarjetas archivadas salen del tablero activo sin destruirse jamás.
- **Miembros y permisos**: el Owner invita y remueve miembros por email; los permisos se verifican en Convex (no solo en la UI).
- **Ciclo de vida del Board**: el Owner puede renombrar y eliminar permanentemente un Board, con confirmación destructiva explícita y borrado en cascada.
- **Feed de Actividad**: registro cronológico inverso de cada verbo de actividad, en vivo y con avatar y hora relativa por actor.
- **Presence en tiempo real**: franja de avatares con indicador verde de los miembros que están viendo el Board, actualizada por latidos y depuración automática.

## Modelo de Dominio

El proyecto sigue un lenguaje ubicuo estricto para garantizar consistencia entre el código, la base de datos y la interfaz de usuario:

| Término      | Definición                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **User**     | Persona registrada en la plataforma con sesión gestionada por Clerk.                                                          |
| **Board**    | Espacio de trabajo colaborativo perteneciente a un Owner, quien puede invitar a Members.                                      |
| **Member**   | Usuario con permisos de lectura y edición dentro de un Board específico.                                                      |
| **Owner**    | Creador del Board; posee facultades exclusivas de administración (renombrar, eliminar e invitar/remover miembros).            |
| **List**     | Columna vertical dentro de un Board que agrupa tarjetas en un orden secuencial.                                               |
| **Card**     | Unidad atómica de trabajo dentro de una List. Contiene título, descripción, etiquetas, fecha límite, asignados y comentarios. |
| **Label**    | Marcador con nombre y color perteneciente a una paleta fija de 8 tonos por Board.                                             |
| **Due date** | Fecha y hora límite opcional en una Card. No posee estados de completado; su vigencia se calcula dinámicamente.               |
| **Comment**  | Mensaje cronológico adjunto a una Card, editable y eliminable únicamente por su autor.                                        |
| **Archive**  | Estado de eliminación lógica (soft-delete). Las tarjetas archivadas no se destruyen y pueden ser restauradas.                 |
| **Activity** | Registro de auditoría cronológico inverso de las acciones ejecutadas en el Board.                                             |
| **Presence** | Indicador en tiempo real de los miembros activos visualizando el Board mediante latidos (heartbeats).                         |

## Stack Tecnológico

- **Frontend**: [TanStack Start](https://tanstack.com/start) (React 19 con renderizado en servidor y enrutamiento completamente tipado).
- **Diseño y Componentes**: [Tailwind CSS v4](https://tailwindcss.com/) y [shadcn/ui](https://ui.shadcn.com/) (primitivas accesibles basadas en Radix UI).
- **Backend y Base de Datos Reactiva**: [Convex](https://www.convex.dev/) (base de datos en tiempo real, funciones serverless y mutaciones optimistas).
- **Identidad y Autenticación**: [Clerk](https://clerk.com/) (validación de tokens JWT en el backend de Convex).
- **Validación**: [Zod](https://zod.dev/) y validadores nativos de esquema en Convex.
- **Testing**: [Vitest](https://vitest.dev/) con `convex-test` para pruebas unitarias en memoria contra base de datos aislada.
- **Gestor de Paquetes**: [pnpm](https://pnpm.io/).

## Decisiones de Arquitectura

El desarrollo se fundamenta en Registros de Decisiones Arquitectónicas (ADRs) documentados en `docs/adr/`:

1. **ADR 0001 (Stack Unificado)**: Convex centraliza persistencia, funciones de servidor y suscripciones reactivas eliminando la necesidad de capas ORM o servidores Socket.io dedicados.
2. **ADR 0002 (Autenticación Delegada)**: Clerk gestiona el ciclo de vida de las credenciales. Convex verifica la firma JWT contra el endpoint JWKS de Clerk en cada invocación de consulta o mutación.
3. **ADR 0003 (Tiempo Real y Ordenamiento)**: Las lecturas de tableros son consultas reactivas en vivo. El reordenamiento de listas y tarjetas utiliza un modelo basado en anclas posicionales resueltas en el servidor para evitar condiciones de carrera. La presencia se implementa mediante una tabla de latidos periódicos depurada automáticamente.

## Estructura del Proyecto

```text
├── .agents/          # Habilidades y flujos de automatización para agentes
├── CONTEXT.md        # Glosario del lenguaje ubicuo (Board, Card, Member, ...)
├── docs/             # Documentación, especificaciones y ADRs arquitectónicos
│   └── adr/          # Architecture Decision Records (0001-0003)
└── app/              # Aplicación TanStack Start
    ├── convex/       # Esquema, funciones serverless y configuración de Convex
    │   ├── schema.ts        # Definición completa del esquema relacional
    │   ├── auth_helpers.ts  # Utilidad de autorización (member/owner)
    │   ├── constants.ts     # Paleta de 8 colores y verbos de actividad
    │   ├── users.ts         # Sincronización y consultas de usuarios
    │   ├── boards.ts        # Creación, listado, rename y delete (Owner)
    │   ├── lists.ts         # CRUD y reordenamiento de listas
    │   ├── cards.ts         # CRUD, archivo/restauración, vencimiento y movimiento
    │   ├── labels.ts        # Paleta de etiquetas y adjuntos a tarjetas
    │   ├── assignees.ts     # Asignación de miembros a tarjetas
    │   ├── comments.ts      # Hilo cronológico de comentarios
    │   ├── members.ts       # Invitación y remoción de miembros
    │   ├── activity.ts      # Feed de actividad con perfil de actor
    │   ├── presence.ts      # Latidos de presencia y depuración de inactivos
    │   ├── cron.ts          # Depuración programada de presence
    │   └── *_generated/     # Tipos generados por Convex
    ├── src/
    │   ├── routes/          # Rutas basadas en archivos (/, /home, /boards/$boardId)
    │   ├── components/
    │   │   ├── board/       # Header, canvas, listas, tarjetas, modal y sheets
    │   │   ├── dashboard/   # Vista de Boards del usuario
    │   │   ├── ui/          # Sistema de diseño shadcn/ui (Radix + Tailwind)
    │   │   └── prototype/   # Prototipos estáticos de referencia (no en producción)
    │   └── hooks/           # Hooks compartidos (useBoardPresence, useIsMobile)
    └── package.json
```

## Guía de Inicio Rápido

### Prerrequisitos

- Node.js (versión 20 o superior recomendada).
- pnpm instalado globalmente (`npm install -g pnpm` o vía corepack).

### Variables de Entorno

Cree un archivo `.env.local` dentro del directorio `app/` con las siguientes variables:

```env
# Despliegue de Convex
CONVEX_DEPLOYMENT=dev:tu-nombre-de-despliegue
VITE_CONVEX_URL=https://tu-despliegue.convex.cloud
VITE_CONVEX_SITE_URL=https://tu-despliegue.convex.site

# Clave pública de Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

En el panel de control de Convex (o mediante su CLI), configure la variable de entorno del backend:

```text
CLERK_JWT_ISSUER_DOMAIN=https://tu-instancia.clerk.accounts.dev
```

### Instalación y Ejecución

1. Navegue al directorio de la aplicación e instale las dependencias:

```bash
cd app
pnpm install
```

2. En una terminal, inicie el entorno de desarrollo de Convex:

```bash
pnpm convex:dev
```

3. En una segunda terminal, inicie el servidor de desarrollo local:

```bash
pnpm dev
```

4. Abra [http://localhost:3000](http://localhost:3000) en su navegador.

### Comandos Disponibles

Todos los comandos deben ejecutarse desde la carpeta `app/`:

| Comando                | Descripción                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`             | Inicia el servidor de desarrollo local en el puerto 3000.                     |
| `pnpm convex:dev`      | Inicia el backend de Convex y sincroniza esquemas y funciones en tiempo real. |
| `pnpm build`           | Compila la aplicación para producción.                                        |
| `pnpm preview`         | Previsualiza el bundle de producción localmente.                              |
| `pnpm test`            | Ejecuta la suite de pruebas unitarias en memoria con Vitest.                  |
| `pnpm typecheck`       | Comprueba tipos de TypeScript sin emitir archivos (`tsc --noEmit`).           |
| `pnpm lint`            | Analiza el código con ESLint.                                                 |
| `pnpm check`           | Verifica el formato del código con Prettier.                                  |
| `pnpm format`          | Aplica correcciones automáticas de formato y reglas de linting.               |
| `pnpm generate-routes` | Regenera el árbol de rutas tipado de TanStack Router.                         |
