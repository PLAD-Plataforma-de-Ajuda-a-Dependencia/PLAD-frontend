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

- **Routing** is centralized in `src/App.tsx` (`BrowserRouter` > `SessaoProvider` > flat `Routes`, one page component per route; protected pages sit under a `RotaProtegida` that lists the allowed roles). Pages live in `src/pages/`, one file each, with types, constants and sub-components co-located in the same file; the few shared pieces are in `src/components` (`RotaProtegida`, `LayoutPainel`, `MenuConta`, `ModalConsentimento`, `ErroCampo`, `LinkDocumento`, `EscolhaTipoConta`).
- **`LayoutPainel`** is the shell of the pages with a sidebar (`/Calendario` and `/adminPsico`): sidebar, the page's own `<main>` and the footer. The sidebar items depend on the role (dependente: Painel, Reunião; psicologo: Painel, Reunião, Gestão; admin: Gestão only).
- **`MenuConta`** lives only in that sidebar (the three dots above the avatar circle) and is the **only** place with Sair, Minha conta and the nickname swap: clicking the dots expands the Figma panel (frame `1:166` of file `tabegYR6vvZ0HCo5P3dkPA`) with the name (nickname for dependents, with a hover underline and swap icon), "configurações" (→ `/minha-conta`), "suporte" (disabled, "em breve": there is no page or endpoint) and "sair". Do not add it to other screens.
- **Route paths are inconsistent in casing** (`/criar-conta`, `/psicologoSolicita`, `/Triagem`, `/Calendario`), and React Router matching is case-insensitive by default. Keep this in mind when adding links.
- **The sidebar link "Reunião" points to a route that doesn't exist yet** (`/reuniao` falls back to Home); the Calendar and Comunidade items stay hidden until their pages exist. The footer social icons are duplicated between `LayoutPainel.tsx` and `home.tsx` (same assets).
- **Styling** is Tailwind utility classes inline in JSX. `src/App.css` is empty and unused. Image assets are imported from `src/assets/`.

## TypeScript constraints (tsconfig.app.json)

`verbatimModuleSyntax` (use `import type` for type-only imports), `erasableSyntaxOnly` (no `enum`, namespaces or constructor parameter properties), `noUnusedLocals` and `noUnusedParameters` (unused code fails `npm run build`).

## Backend API

Lives in a separate repo (path: `../PLAD-backend`). Its `docs/openapi.json` and controllers are the contract: never invent endpoints or fields; if something is missing, stop and ask me.

- Base URL from env var `VITE_API_URL`, dev: `http://localhost:8080`
- JSON is **snake_case** in both directions; the types in `src/api/` mirror the backend DTOs field by field (`UserType` includes `admin`, `MeResponseDTO`, `ErrorResponseDTO`...). Change them together with the backend DTOs.
- Every call goes through `apiRequest` (`src/api/client.ts`); screens never call `fetch`.

### Errors

The body is `{ code, message, timestamp, errors, trace }` (`ErrorResponseDTO`). `message` is English and is never shown. `ApiError` carries `code`, `errors`, `trace`, `retryAfterSeconds` (header `Retry-After`) and a `message` already in pt-BR.

- **One map** `code → pt-BR message` lives in `src/api/erros.ts` (`MENSAGENS_ERRO`). A new backend `ErrorCode` needs a row there. Codes Spring maps itself (`BAD_REQUEST`, `NOT_FOUND`...) fall back to a text by HTTP status.
- `VALIDATION_ERROR` fills `errors[] = {field, message}` (field in snake_case, e.g. `birth_date`). Forms show `errosPorCampo(err)` under each field; the field messages are English Bean Validation texts and `traduzirErroDeCampo` translates them by pattern (unknown ones become "Valor inválido.").
- `RATE_LIMITED` (429) and `SERVICE_UNAVAILABLE` (503) say when to try again, from `Retry-After`. `INTERNAL_ERROR` (500) shows `trace` as the code to give to support. The backend CORS exposes `Retry-After` and `X-Request-Id`, otherwise the browser would hide them.
- A 401 `INVALID_CREDENTIALS` (wrong password on login, `PUT /me/password`, `DELETE /me`) is a form error, not an expired session.

### Session

- The access token is a 15 min JWT kept **only in memory** (`src/api/token.ts`), never in `localStorage`/`sessionStorage`. Reloading the page loses it; the session comes back through the refresh cookie.
- The refresh token is an opaque 7-day cookie (`refresh_token`, `HttpOnly`, `SameSite=Strict`, `Path=/auth`) that JavaScript cannot read. `credentials: 'include'` goes **only** on `/auth/login`, `/auth/refresh`, `/auth/logout` and `/me/password` (the backend's `CREDENTIALED_PATHS`; on other routes the CORS answer would be discarded). Front and API must be on the same site (`localhost:5173` and `localhost:8080` are).
- On a 401 `UNAUTHORIZED` from a protected route, `apiRequest` calls `renovarSessao()` (one refresh in flight no matter how many requests fail at once; it also takes a Web Lock so two tabs do not collide) and repeats the request once. The backend rotates the cookie on every use and treats a second use of the same one as theft (it revokes every session of the user), so **never call `POST /auth/refresh` outside `renovarSessao`**. If the refresh fails with 401/403, the session ends and the user goes to `/login`.
- `SessaoProvider` (`src/session/`) keeps the `GET /me` data in memory (`type_user`, `nickname`, `has_triage`, `consent_pending`...) and exposes `useSessao()`: `entrar`, `sair` (`POST /auth/logout`), `recarregarMe`, `atualizarMe`. The session is recovered (refresh + `GET /me`) on the first protected route, not on every page, because `/auth/refresh` is limited to 5/min per IP.
- `PUT /me/password` ends every other session and answers with a new access token for this one: store it with `setToken`.

### Roles and routes

`RotaProtegida` takes the allowed roles and sends anyone else to their own first screen (`destinoPorPapel` in `src/session/SessaoContext.ts`): dependent without triage → `/Triagem`; dependent with triage → `/Calendario`; psychologist → `/Calendario`; admin → `/adminPsico` (the psychologist reaches `/adminPsico` through the "Gestão" sidebar item).

| Route | Roles |
|---|---|
| `/Triagem` | dependente |
| `/Calendario` | dependente, psicologo |
| `/adminPsico` (Gestão) | admin, psicologo |
| `/minha-conta` | any logged-in role (the delete-account section is hidden for admin: the backend answers 403) |

`/adminPsico` and the `Calendario` counters and meetings still show mock data. A dependent who already sent the triage sees the current answers (from `GET /me/export`, the backend has no `GET /triage`) and updates them with `PUT /triage`.

### Consent

Signing up sends `accepted_terms_version` and `accepted_privacy_version` from one constant (`VERSOES_CONSENTIMENTO` in `src/api/consentimento.ts`), which must follow `consent.terms-version` / `consent.privacy-version` of the backend's `application.properties`. When `GET /me` says `consent_pending`, `ModalConsentimento` (rendered by `RotaProtegida`, Figma frame `1:29`) opens as a pop-up over the blurred page, which is `inert` meanwhile; "Próximo" is enabled by the checkbox and calls `POST /me/consents`. The backend blocks nothing; "Recusar e sair" is the way out for someone who does not accept. The Terms and Privacy texts do not exist yet: the pop-up and the sign-up checkbox show a visible TODO (`DOCUMENTOS`, `LinkDocumento`).

## UI rules

- The Figma prototype is the source of truth for layout, spacing, colors and typography.
  Always ask for the Figma frame link before building or changing a screen.
- Reuse existing components in `src/components`; don't create a new one if a similar one exists.
- Never change styles, layout or components outside the scope of the current task.
- Don't add UI libraries or change the styling approach without asking.

## Figma → code (design system rules)

Read before turning a Figma frame into code. The Figma MCP output (React + Tailwind or raw CSS) is a **reference**: adapt it to the rules below instead of pasting it.

### Workflow

1. Ask for the frame link (rule above). Use `figma.com/design/...?node-id=` URLs: `figma.com/site/...` links (Figma Sites) are not supported by `get_design_context`/`get_screenshot`, and the file must be shared with the account the MCP uses (an access error means it is not).
2. `create_session`, then `get_design_context` for the node (plus `get_screenshot` to compare). Never guess a node id.
3. Reuse before creating: check `src/components` and the patterns below. Translate Figma values to Tailwind classes and to the tokens in `src/index.css`; never keep absolute positioning or pixel dumps from the generated code when a flex/grid layout does the same.
4. Compare the result with the screenshot at mobile and desktop widths, and run `npm run build` and `npm run lint`.

A frame that is a whole section/screen answers with sparse metadata: ask for its child nodes one by one (pass `excludeScreenshot` on those, you already have the frame's). The Figma Starter plan caps MCP calls (the limit was hit once while reading a frame), so request only the nodes that carry values you need.

### 1. Tokens

Only `src/index.css`, in Tailwind v4's CSS-first `@theme` block (there is no `tailwind.config.js`, no JSON tokens and no token pipeline such as Style Dictionary). Each `--color-*` / `--font-*` variable becomes utilities automatically.

```css
@import "tailwindcss";
@theme {
    --font-outfit: "Outfit", sans-serif;   /* headings, buttons with display weight, the PLAD wordmark */
    --font-roboto: "Roboto", sans-serif;   /* body text; set on each page root with font-roboto */
    --color-plad: #4b64f9;                 /* bg-plad, text-plad, border-plad/60, ring-plad */
    --color-plad-hover: #3a52e0;
    --color-plad-active: #2f45c8;
    --color-plad-fundo: #ebeaff;           /* light lilac background */
    --color-plad-rodape: #19007b;          /* Home footer */
}
```

- There are **no spacing, radius, shadow or type-scale tokens**: use Tailwind's default scale and, when Figma needs it, arbitrary values (`max-w-[1114px]`, `text-[17px]`, `leading-[1.2]`, `shadow-[0_-8px_16px_-6px_rgba(0,0,0,0.15)]`).
- A Figma color that equals a token above must use the token utility (`bg-plad`), not its hex. A new color that appears in more than one place goes into `@theme` (only when the task needs it, per the scope rule).
- Known hard-coded colors, left as they are: `Calendario.tsx` (`#5271ff` accent, `#8397ff` avatar, `#f4f5fd` background, `#120063` footer and popup, which is not `plad-rodape`), `home.tsx` gradients (`#6f82ff`, `#6d85ff`, `#9993ff`), `Triagem.tsx` option pills (`#ebebeb`, `#e0e0e0`), `EscolhaTipoConta.tsx` border `#dce6ff`. `adminPsico.tsx` (Gestão) was restyled to the Calendar's look (`#5271ff`, white cards, `font-outfit`) but is not from a Figma frame, and its data is still mock. The menu panel uses `#ebeaff` (= `plad-fundo`) with a white border, `#6d85ff` for the top button and `#f73d3d` for "sair" (frame `1:166`); `src/assets/avatar-placeholder.svg` is the frame's `#DCA8FF` avatar.
- Fonts come from Google Fonts in `index.html` (Outfit 500/600/700, Roboto 400–700); `<html lang="pt-BR">`.

### 2. Components

- `src/components/`: `RotaProtegida`, `LayoutPainel`, `MenuConta`, `ModalConsentimento`, `ErroCampo`, `LinkDocumento`, `EscolhaTipoConta`. Pages are in `src/pages/` and keep their sub-components in the same file (`TriagemLayout`, `Secao`, `CardContador`, `CardResumo`); `SidebarLink` is inside `LayoutPainel`.
- Plain function components, `export default`, props typed with an inline `interface`, Tailwind classes in `className`, pt-BR names and comments. No component library, no Storybook, no test runner.
- There is no shared layout component: the page shell is repeated per page (copy from `Login.tsx`/`Triagem.tsx`):

```tsx
<div className="min-h-screen flex flex-col bg-white text-gray-900 font-roboto">
    <header className="text-center pt-8 pb-4"><span className="font-outfit font-semibold text-xl text-black">PLAD</span></header>
    <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center items-center px-4 pb-8">…</main>
    <footer className="w-full bg-white shadow-[0_-8px_16px_-6px_rgba(0,0,0,0.15)] pt-5 pb-6 px-4">
        <div className="w-full max-w-sm mx-auto"><button className="w-full py-3.5 px-6 bg-plad hover:bg-plad-hover active:bg-plad-active text-white font-medium rounded-lg transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed">…</button></div>
    </footer>
</div>
```

- Form field: `w-full px-4 py-3.5 border border-plad/60 rounded-sm text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-plad transition bg-white`, with the validation message in `<ErroCampo mensagem={…} />` right below it. Form errors: `<p role="alert" className="… text-sm text-red-600">`.
- Interactive states are explicit classes (`hover:`, `active:`, `disabled:`, `focus-visible:outline-2 focus-visible:outline-plad`); selected state of option pills uses `aria-pressed`.

### 3. Frameworks and build

React 19, TypeScript (`verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals/Parameters`: unused code fails the build), Vite with `@vitejs/plugin-react`, Tailwind CSS v4 through `@tailwindcss/vite`, React Router v7 (`react-router-dom`), `lucide-react`, `date-fns` (`ptBR`). `npm run build` = `tsc -b && vite build`; dev server on `5173` with `strictPort` because the backend CORS only allows that origin.

### 4. Assets

- Images live in `src/assets/` (PNG, lowercase Portuguese names without separators: `inicio.png`, `sobre.png`, `perfis.png`, `insta.png`, `casinhaazul.png`) and are imported as modules, so Vite fingerprints them:

```tsx
import inicioImg from '../assets/inicio.png'
<img src={inicioImg} alt="Acolhimento Digital PLAD" className="w-full max-w-md lg:max-w-[460px] object-contain" />
```

- `public/` has only `favicon.svg` (linked from `index.html`) and `icons.svg` (a Vite template leftover, unused). There is no image optimization step and no CDN: keep exports small (2x at most) and give every `<img>` a real `alt` (`alt=""` plus `aria-hidden` for decoration).
- **Exported Figma assets must be saved into `src/assets/` and imported.** Do not point `src` at the temporary localhost/asset URLs the MCP returns.
- `perfis.png` is a sprite used as a CSS mask (`maskImage`/`maskSize`/`maskPosition` in `EscolhaTipoConta.tsx`) so the icon color follows the card state; copy that pattern for other single-color icons in a sprite.

### 5. Icons

- UI icons: `lucide-react`, named imports, sized by the `size` prop (16–20), colored by text classes, decorative ones with `aria-hidden="true"`. Map a Figma icon to the lucide icon with the same meaning (gear → `Settings`, exit → `LogOut`, swap → `RefreshCw`, three dots → `MoreHorizontal`) before exporting anything. Do not add another icon library or inline SVG sets.
- Brand and social icons are PNGs in `src/assets/` shown at `w-5 h-5 object-contain`; the same four files are reused by the `Home` and `Calendario` footers.

### 6. Styling

- Tailwind utility classes inline in JSX; no CSS Modules, styled-components or Sass. `src/index.css` is the only global stylesheet (Tailwind import + `@theme`); `src/App.css` is empty and unused.
- Inline `style` is only for what utilities cannot express (the Home hero's radial gradients, the `EscolhaTipoConta` mask).
- Responsive design is mobile-first with Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`): single column by default, `lg:grid-cols-2` for hero sections, `w-24 lg:w-28` for the Calendar sidebar, content wrappers `max-w-[1114px] mx-auto px-8` (Home) and `max-w-md`/`max-w-3xl` (forms and Triagem).
- Dates and numbers are formatted with `date-fns` (`ptBR`) and `toLocaleString('pt-BR')`.

### 7. Project structure

```
src/
  main.tsx            StrictMode + <App/>
  App.tsx             BrowserRouter > SessaoProvider > Routes (RotaProtegida per role)
  index.css           Tailwind import + @theme tokens
  api/                client.ts (apiRequest, ApiError), erros.ts (code → pt-BR), token.ts, auth.ts, me.ts, triage.ts, consentimento.ts
  session/            SessaoContext.ts (context, useSessao, destinoPorPapel), SessaoProvider.tsx
  components/         shared pieces (list above)
  pages/              one file per route: home, Login, criarConta (+ psicologoSolicita), Triagem, Calendario, adminPsico, minhaConta
  assets/             PNGs imported by pages
public/               favicon.svg
```

A new screen is a new file in `src/pages/` plus one `<Route>` in `src/App.tsx` (inside the `RotaProtegida` for the roles allowed); no per-feature folders. Route paths keep their existing casing (`/Triagem`, `/Calendario`) and new ones are lowercase kebab-case (`/minha-conta`).