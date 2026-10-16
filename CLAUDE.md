# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server with HMR
- `npm run build` — `tsc -b && vite build` (type-check is part of the build)
- `npm run lint` — ESLint (flat config in `eslint.config.js`)
- `npm run preview` — serve the production build

There is no test runner configured.

## Project

PLAD frontend: a Brazilian-Portuguese (UI copy, identifiers and comments are in pt-BR) mental-health platform connecting users with volunteer psychologists. Stack: React 19, TypeScript, Vite, React Router v7, Tailwind CSS v4 (via `@tailwindcss/vite`, enabled with a single `@import "tailwindcss"` in `src/index.css`), `lucide-react` icons, `date-fns` (with the `ptBR` locale).

## Architecture

- **Routing** is centralized in `src/App.tsx` (`BrowserRouter` + flat `Routes`, one page component per route). Pages live in `src/pages/`, one file each, with types, constants and sub-components co-located in the same file — there is no shared component library or layout component.
- **Route paths are inconsistent in casing** (`/criar-conta`, `/psicologoSolicita`, `/Triagem`, `/Calendario`), and React Router matching is case-insensitive by default. Keep this in mind when adding links.
- **`Calendario.tsx` sidebar links point to routes that don't exist yet** (`/painel`, `/reuniao`, `/comunidade`); only `/calendario` is registered. The sidebar and the footer social icons are duplicated per page rather than shared (the footer icons in `Calendario.tsx` reuse the same assets as `home.tsx`).
- **Styling** is Tailwind utility classes inline in JSX. `src/App.css` is empty and unused. Image assets are imported from `src/assets/`.

## TypeScript constraints (tsconfig.app.json)

`verbatimModuleSyntax` (use `import type` for type-only imports), `erasableSyntaxOnly` (no `enum`, namespaces or constructor parameter properties), `noUnusedLocals` and `noUnusedParameters` (unused code fails `npm run build`).

## Backend API

Lives in a separate repo (local path: `C:\Users\josh\Desktop\demo`).

- Base URL from env var (e.g. `VITE_API_URL`), dev: `http://localhost:8080`
- Auth: `Authorization: Bearer <jwt>` from `POST /auth/login`
- JSON is **snake_case** in both directions
- Errors come as `{ "message": string, "timestamp": string }`
- Never invent endpoints or fields; check the backend code or ask me.
- 
## UI rules

- The Figma prototype is the source of truth for layout, spacing, colors and typography.
  Always ask for the Figma frame link before building or changing a screen.
- Reuse existing components in `src/components`; don't create a new one if a similar one exists.
- Never change styles, layout or components outside the scope of the current task.
- Don't add UI libraries or change the styling approach without asking.