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

- **Routing** is centralized in `src/App.tsx` (`BrowserRouter` > `ToastProvider` > `SessaoProvider` > `BannerConexao` + flat `Routes`, one page component per route; protected pages sit under a `RotaProtegida` that lists the allowed roles; any unknown path renders `pages/naoEncontrada.tsx`, the 404, never a silent redirect). Pages live in `src/pages/`, one file each, with types, constants and page-specific sub-components co-located in the same file. Everything reused by more than one page lives in `src/components` (see "Shared components" below): **reuse before creating**.
- **`LayoutPainel`** is the shell of the pages with navigation (`/Calendario` and `/adminPsico`): as in the Figma exports the whole page is lilac (`plad-fundo`), the sidebar sits straight on it (no white column: "PLAD" top-left, 28 px icons with a 12 px label, the active item blue, the dots and the avatar at the bottom) and the content goes in a rounded white panel (`rounded-painel`, `shadow-painel`; 40 px above, 60 px to the right, 20 px below on desktop). `LayoutPainel` draws that panel and the page passes its own `<main id="conteudo" className="min-w-0 flex-1 ...">` inside it, followed by the shared `Rodape`. From `md` up the sidebar, below `md` a fixed bottom bar (Painel, Reunião, Gestão, Conta). The items depend on the role (dependente: Painel, Reunião; psicologo: Painel, Reunião, Gestão; admin: Gestão only). For the dependente "Reunião" links to `/minhas-reunioes`; for the psicologo it has no page, so it renders disabled with "em breve" (not a link); Calendar and Comunidade items stay hidden until their pages exist.
- **`MenuConta`** lives only in `LayoutPainel` (the three dots above the avatar circle on the sidebar, the "Conta" item of the bottom bar) and is the **only** place with Sair, Minha conta and the nickname swap. It opens the Figma panel (frame `1:166` of file `tabegYR6vvZ0HCo5P3dkPA`) as a drawer in a portal (`z-50`, backdrop, focus trapped, Esc closes, an X at the top-right to close) with the name (nickname for dependents, with a hover underline and swap icon, and the small "ninguém além dos psicólogos vê o seu nome real" note), then "configurações" (→ `/minha-conta`), "suporte" (disabled, "em breve": there is no page or endpoint) and "sair", each with its icon on the left; "sair" is red (`text-erro`: the Figma red darkened to pass AA contrast). Do not add it to other screens.
- **Route paths are inconsistent in casing** (`/criar-conta`, `/Triagem`, `/Calendario`, `/adminPsico`), and React Router matching is case-insensitive by default. Keep this in mind when adding links. The psychologist sign-up has no route of its own: it is `/criar-conta?tipo=psicologo&etapa=2` (the `etapa=2` entry is in the history, so the browser Back button returns to step 1 with what was typed; the step-1 data, password included, stays in memory only).
- **Styling** is Tailwind utility classes inline in JSX, using the tokens of `src/index.css` (see "Tokens"). `src/App.css` is empty and unused. Image assets are imported from `src/assets/`.

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
- `SessaoProvider` (`src/session/`) keeps the `GET /me` data in memory (`type_user`, `nickname`, `has_triage`, `consent_pending`...) and exposes `useSessao()`: `entrar`, `sair` (`POST /auth/logout`), `recarregarMe`, `atualizarMe`, `tentarNovamente`. The session is recovered (refresh + `GET /me`) on the first protected route, not on every page, because `/auth/refresh` is limited to 5/min per IP (so, when testing in a browser, navigate inside the app instead of reloading over and over).
- Recovery tells "no session" from "could not check": a 401/403 from the refresh is `anonimo` (→ `/login`, carrying `state.de`, the screen the person was on, which the login returns to); a network failure (status 0), 429 or 5xx is `indisponivel`, and `RotaProtegida` shows an `EstadoErro` with "Tentar de novo" instead of redirecting in silence. A session that ends mid-use sets `sessaoExpirada` and the login shows "Sua sessão terminou...". `/login` and `/criar-conta` send an already-logged-in person (`status === 'autenticado'`) to `destinoPorPapel`. A global `BannerConexao` shows "Sem conexão com o servidor" when a call fails with status 0 (`api/conexao.ts`, fed by `client.ts`) and hides when the server answers again.
- `PUT /me/password` ends every other session and answers with a new access token for this one: store it with `setToken`.

### Roles and routes

`RotaProtegida` takes the allowed roles and sends anyone else to their own first screen (`destinoPorPapel` in `src/session/SessaoContext.ts`): dependent without triage → `/Triagem`; dependent with triage → `/Calendario`; psychologist → `/Calendario`; admin → `/adminPsico` (the psychologist reaches `/adminPsico` through the "Gestão" sidebar item).

| Route | Roles |
|---|---|
| `/Triagem` | dependente |
| `/Calendario` | dependente, psicologo |
| `/minhas-reunioes` | dependente |
| `/adminPsico` (Gestão) | admin, psicologo |
| `/minha-conta` | any logged-in role (the delete-account section is hidden for admin: the backend answers 403) |

The psychologist's "Reunião" item stays disabled (no page for it); unknown paths are the 404.

**Meeting registration** (backend decisions 24 to 27, `src/api/meetings.ts`): a dependent registers with `POST /meetings/{id}/registration` and leaves with `DELETE` (no triage needed); both answer with the state the screen should show, so `Calendario` swaps the one meeting in its list instead of fetching the month again, and after an error it re-reads only that meeting (`getMeeting`). Leaving a meeting asks first (`ModalConfirmacao`, not red: it costs the seat, not data). `MEETING_FULL` and `MEETING_CAPACITY_TOO_LOW` have rows in `erros.ts`; a 409 `MEETING_CONFLICT` on registering or leaving is worded by `mensagemDeInscricao`. **Minhas reuniões** has no endpoint of its own: it reads `GET /meetings` (two windows of 61 days from 3 h ago, forward and back) and keeps `registered_by_me`, so a registration in a meeting more than two months away only shows up when it gets close. Frame: the "Reunião" PNG (`C:\Users\josh\Downloads\Sem título\reuniao.png`); left out on purpose: "Entrar"/"Chegar atrasado"/"Lembrete" (no room, RF005, and no reminders), the "Todas/Conteúdo" filters and the meeting type chip.

**The host's list of registered dependents** (`ListaInscritos` in `Calendario.tsx`) is the ONE screen where a dependent's real name appears (psychologist-only, decision 26). Every read of it is audited by the backend (one entry per dependent listed, which each of them sees in their access log), so it is fetched only when the psychologist clicks "Ver inscritos", never on opening the popup or in an effect; hiding and showing again reuses what was read; the names live only in that component's state (never a context, storage or the URL) and vanish when the popup closes. The notice that the access is logged is shown next to the button, before the click.

The `Calendario` meetings come from the API (`GET /meetings`, `src/api/meetings.ts`): on every month change it fetches from the first to the last day the grid shows (at most 42 days; the backend caps the window at 62), measured in `America/Sao_Paulo` (`inicioDoDiaEmSaoPaulo`), and shows the times in the browser's zone. Cancelled meetings are struck through and say "Reunião cancelada" in text; ended ones say "Reunião encerrada". A late response for a month already left is dropped. `/adminPsico` is still not connected to the API: it **starts empty** (with an `EstadoVazio`) and offers "Carregar dados demonstrativos", which loads clearly fictitious examples under a `FaixaDemonstrativa` ("dados demonstrativos (fictícios)") with a button to remove them. The sobriety counters of `Calendario` still show test values (`CONTADORES_TESTE`): leave them, F1/F4 redo them. Keep demo data out of the default state, and never show a dependent's real name in Gestão (only the nickname; real name is psychologist-only, backend decision 15). **There is no risk classification anywhere in the front** (backend decision 1, `docs/decisoes-para-revisao.md`): no low/moderate/high levels, no risk selector or badge, no "evaluated/not evaluated" state. A dependent who already sent the triage sees the current answers (from `GET /me/export`, the backend has no `GET /triage`) and updates them with `PUT /triage`.

### Triagem (health data)

- Layout as in the Figma: a 884 px grid with "Pergunta 03 de 05" (plain text, no progress bar) at its left edge, the title centered (size by length: short 34 px, medium 28 px, long 24 px), "Anterior" (arrow + black text) in the gutter at the left of the title from `xl` and above the title below it, 347 px option pills 8 px apart, a 375×140 px free-text box with the "Esta pergunta é opcional." and "0/1000" notes under it. After "Triagem enviada" or "Respostas atualizadas" the page goes to `/Calendario` by itself in 5 s (`useContagem`, with the countdown on screen and the button kept).
- One question per step, and each step is in the URL: `/Triagem?passo=N` (1-based). "Próximo" pushes `?passo=N+1` (with `state.interno`), "Anterior" goes back in the history when the previous entry came from the triage and otherwise replaces; the browser Back/Forward buttons walk between questions without unmounting the page, so the answers survive. A missing, non-numeric or out-of-range `passo` is corrected with `replace`.
- **Answers live only in memory** (the `answers` state of `Triagem.tsx`): never `localStorage`, `sessionStorage`, cookies or the URL. They are health data and the computer may be shared. They are cleared from memory as soon as the submit succeeds, and once something was answered the browser asks before the tab is reloaded or closed (`beforeunload`).
- The free-text limit is counted in code points (like the backend, `Array.from(texto).length`, not UTF-16 `maxLength`).

### Consent

Signing up sends `accepted_terms_version` and `accepted_privacy_version` from one constant (`VERSOES_CONSENTIMENTO` in `src/api/consentimento.ts`), which must follow `consent.terms-version` / `consent.privacy-version` of the backend's `application.properties`. When `GET /me` says `consent_pending`, `ModalConsentimento` (rendered by `RotaProtegida`, Figma frame `1:29`) opens as a pop-up over the blurred page, which is `inert` meanwhile; "Próximo" is enabled by the checkbox and calls `POST /me/consents`. The backend blocks nothing; "Recusar e sair" (after a `ModalConfirmacao`) is the way out for someone who does not accept. The Terms and Privacy texts do not exist yet: the pop-up and the sign-up checkbox say "texto em preparação" in a calm tone (`DOCUMENTOS`, `LinkDocumento`); no red.

## UI rules

- The Figma prototype is the source of truth for layout, spacing, colors and typography.
  Always ask for the Figma frame link before building or changing a screen.
- Reuse existing components in `src/components`; don't create a new one if a similar one exists.
- Never change styles, layout or components outside the scope of the current task.
- Don't add UI libraries or change the styling approach without asking.
- **Tokens, not loose values**: colors, radii and shadows come from the `@theme` tokens (`bg-plad`, `text-erro`, `rounded-cartao`, `shadow-rodape`); a hex or arbitrary value in a page is a bug. A new color used in more than one place becomes a token first.

### UX and accessibility rules

People arrive fragile: plain, welcoming Portuguese, no jargon, no English from the server (messages come from `api/erros.ts`).

- **Red is for real errors only** (`text-erro`, the field border, the delete-account flow, "sair" per the Figma). Notices, "em breve", "texto em preparação", offline and demo banners use the calm `aviso`/`plad-fundo` styles.
- **Every action gives feedback**: the button is `carregando` (disabled, spinner, `aria-busy`) while sending, and success shows a toast (`useToast().avisar`). Field errors sit next to the field (`Campo` `erro`), never wipe what was typed, and move the focus to the first invalid field. A 429 disables the button with a countdown (`useContagem`).
- **Destructive or irreversible actions ask first** with `ModalConfirmacao` (delete account, refuse the terms, replace the triage answers).
- **States, always the same components**: loading → `Carregando`; nothing to show → `EstadoVazio` with the next step; failed to load → `EstadoErro` with "Tentar de novo"; no network → the global `BannerConexao`. A page must never stay blank or redirect in silence.
- **WCAG AA**: a visible `<label>` on every field (`Campo`), text contrast ≥ 4.5:1 (use `text-texto-suave`, not `gray-400`; text is at least `text-xs`, 12 px), touch targets ≥ 44 px (`min-h-11`, buttons from `classeBotao`), a global `:focus-visible` outline, everything reachable by keyboard (modals and drawers trap focus and close with Esc via `useArmadilhaFoco`), errors and toasts in `aria-live`/`role="alert"`, a real `alt` on informative images (`alt=""` on decorative ones), a "Pular para o conteúdo" link in `LayoutPagina`/`LayoutPainel`, a tab title per page (`useTitulo`), and `prefers-reduced-motion` honored in `index.css`.
- **Mobile first, no horizontal scroll at 390 px**: check 390, 768 and 1440 px; every `<main>` next to a sidebar needs `min-w-0`.

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

| Group | Tokens (utilities) |
|---|---|
| Fonts | `--font-outfit` (headings, display buttons, the PLAD wordmark), `--font-roboto` (body; set on `body`) |
| Brand | `plad` `#4b64f9` (white text on it is 4.68:1, the minimum: never go lighter), `plad-hover`, `plad-active`, `plad-claro` `#6d85ff`, `plad-lilas` `#9993ff`, `plad-fundo` `#ebeaff`, `plad-rodape` `#19007b` (footer, meeting popup), `avatar` `#dca8ff` (measured in the Figma export) |
| Surfaces / text | `opcao` / `opcao-hover` (triage pills, `#ebebeb`), `borda-cartao` `#ebebeb` (card border), `borda-suave`, `texto-suave` `#4b5563` (secondary text, ≥ 4.5:1 even on `plad-fundo`). The page background of the sidebar pages is `plad-fundo`; there is no separate "painel" color anymore |
| States | `erro` `#b91c1c` / `erro-hover` / `erro-fundo`, `aviso` / `aviso-fundo` / `aviso-borda` (amber: offline, demo), `sucesso` / `sucesso-fundo` |
| Radii | `rounded-campo` 8 px (fields and the triage textarea), `rounded-botao` 8 px, `rounded-cartao` 18 px, `rounded-painel` 24 px |
| Shadows | `shadow-rodape` (fixed action footer), `shadow-cartao`, `shadow-painel` |

- Base layer in `index.css`: the global `:focus-visible` outline, `scroll-padding-bottom` (the fixed footer must not hide a focused field) and the `prefers-reduced-motion` block.
- There is **no spacing or type-scale token**: use Tailwind's default scale (text never below `text-xs`) and, when Figma needs it, a few arbitrary values (`max-w-[1114px]`, `lg:text-[76px]`).
- A Figma color that equals a token must use the token utility, not its hex. A new color that appears in more than one place goes into `@theme` first.
- **Status of the Figma values** (file `tabegYR6vvZ0HCo5P3dkPA`, read in 2026-11 through the MCP until the Starter plan's call limit was reached):
  - Confirmed in Figma: the primary color is `#4B64F9` (variable "top" = `plad`); a text style "body text" exists (Roboto Regular 18 px, line height 27.5; not yet applied: the pages still use 14–16 px body text); the geometry of the Desktop 1440 frames: fields 440 px wide and 50–52 px high with 20 px between them, the "Próximo" button and the option/answer column 375 px wide, option rows 41 px high, the consent pop-up 590×750 (`LayoutPagina` uses 440 px fields and a 375 px button/column for this reason).
  - Measured by pixel in the PNG exports of 2026-11 (`C:\Users\josh\Downloads\Sem título\`): `#4B64F9` (field border, button, seal), `#EBEAFF` (page, sidebar and menu background = `plad-fundo`), `#19007B` (footer = `plad-rodape`), `#EBEBEB` (triage pills, card border), `#DCA8FF` (avatar), `#1E1E1E` (calendar popup, not used: the popup stays `plad-rodape`); fields 440×51 px with 20 px between them, the triage pills 347 px wide and 44 px high with 8 px between them, the free-text box 375×140 px, 884 px content grid with the question counter at its left edge and "Anterior" in the left gutter.
  - **Not verified against Figma** (never read): `plad-hover`/`-active`, `plad-claro`, `plad-lilas`, heading sizes, shadows. They come from the previous pass, and the state colors (`erro*`, `aviso*`, `sucesso*`), `texto-suave` and `painel` were chosen in code for contrast. The old loose colors `#5271ff`, `#120063` and `#f73d3d` were folded into `plad`, `plad-rodape` and `erro` for contrast.
  - Figma sections: `/login-2` (1:29, consent), `/reuniao-3` (1:166, account menu), Início (4:68), `/calendario` (4:576), `/dashboard` (4:680), `/comunidade` (4:426), `/login` (4:702, sign-up form), `/login-2` (4:729), `/triagem3` (4:742), `/triagem3-2` (4:766), `/triagem2` (4:796). Frame screenshots and `get_design_context` were not read; to continue without paying for the MCP, export the frames as PNG and compare them (exact colors can be sampled from the PNG).
- Fonts come from Google Fonts in `index.html` (Outfit 500/600/700, Roboto 400–700); `<html lang="pt-BR">`.

### 2. Components

#### Shared components (`src/components/`) — reuse before creating

| Component | Use |
|---|---|
| `LayoutPagina` | Shell of form/flow screens: brand header, `<main id="conteudo">`, skip link, and the `acoes` footer (sticky, `shadow-rodape`) where the submit button goes. `largura` estreita/media/larga, `centralizar`, `titulo` (tab title) |
| `LayoutPainel` + `MenuConta` | Shell of the sidebar pages (see Architecture); the page passes its own `<main>` and a `titulo` |
| `Rodape` | The single footer (Home and panel pages); `id="contato"` is the Home link target |
| `Botao` (+ `classeBotao` in `estilos.ts` for `<Link>`s that look like buttons) | `variante` primario/secundario/texto/perigo/perigo-contorno, `carregando`, `bloco`; 44 px min height |
| `Campo` (render-prop: `{(c) => <input {...c} … />}`), `CampoSenha` | Label + control + help + error (`aria-invalid`/`aria-describedby`); the password one has show/hide. `rotuloOculto` keeps the label for screen readers (`sr-only`) and shows only the placeholder, as in the Figma sign-up/login (repeat the label text as the `placeholder`); the date field is a text input that becomes `type="date"` on focus. Minha conta keeps visible labels |
| `Card` | White card; `titulo` adds the blue seal of the counters |
| `ModalConfirmacao` | Portal dialog with focus trap, Esc, Enter submits; `perigo`, `carregando`, children for extra fields (password) |
| `ToastProvider` / `useToast` (`ToastContext.ts`) | `avisar(mensagem, 'sucesso' \| 'info' \| 'erro')`, in an `aria-live` region |
| `Carregando`, `EstadoVazio`, `EstadoErro` | The three state patterns (loading, empty with next step, error with retry); `tela` makes them full-screen |
| `BannerConexao` | Global offline notice (mounted once in `App.tsx`) |
| `FaixaDemonstrativa`, `ApelidoDestaque` | Demo-data notice with its remove button; the dependent's nickname highlight with the "ninguém além dos psicólogos vê o seu nome real" reminder and an X that hides it (kept in memory per user id, so it is back after a reload) |
| `RotaProtegida`, `ModalConsentimento`, `LinkDocumento`, `EscolhaTipoConta` | Route guard, consent pop-up, document link, profile choice |
| hooks `useArmadilhaFoco`, `useContagem`, `useTitulo` | Focus trap, countdown (429), tab title |

- Plain function components, `export default`, props typed with an inline `interface`, Tailwind classes in `className`, pt-BR names and comments. No component library, no Storybook, no test runner. A context and its hook go in a `.ts` file apart from the provider (like `SessaoContext.ts` / `ToastContext.ts`), or the `react-refresh/only-export-components` lint rule fails.
- Page-specific pieces stay in the page file (`CardContador`, `PopupReuniao`, `Secao` in `minhaConta.tsx`). Anything a second page needs moves to `src/components`.
- A form screen:

```tsx
<LayoutPagina titulo="Entrar" centralizar acoes={<Botao type="submit" form="login-form" bloco carregando={loading}>Entrar</Botao>}>
    <h1 className="font-outfit text-3xl font-semibold text-black text-center">Entrar na sua conta</h1>
    <form id="login-form" onSubmit={handleSubmit} className="w-full space-y-4">
        <Campo rotulo="Endereço de E-mail" rotuloOculto erro={erros.email}>{(c) => <input {...c} type="email" name="email" placeholder="Endereço de E-mail" required />}</Campo>
        <CampoSenha rotulo="Senha" rotuloOculto name="password" required />
    </form>
</LayoutPagina>
```

- Interactive states: the global `:focus-visible` outline covers focus; `hover:`, `active:`, `disabled:` come from `classeBotao`; the selected state of option pills uses `aria-pressed` plus a ring (not color alone).

### 3. Frameworks and build

React 19, TypeScript (`verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals/Parameters`: unused code fails the build), Vite with `@vitejs/plugin-react`, Tailwind CSS v4 through `@tailwindcss/vite`, React Router v7 (`react-router-dom`), `lucide-react`, `date-fns` (`ptBR`). `npm run build` = `tsc -b && vite build`; dev server on `5173` with `strictPort` because the backend CORS only allows that origin.

### 4. Assets

- Images live in `src/assets/` (PNG, lowercase Portuguese names without separators: `inicio.png`, `sobre.png`, `perfis.png`, `insta.png`, `casinhaazul.png`) and are imported as modules, so Vite fingerprints them:

```tsx
import inicioImg from '../assets/inicio.png'
<img src={inicioImg} alt="Uma pessoa sentada conversa por vídeo com uma psicóloga" className="w-full max-w-md lg:max-w-[460px] object-contain" />
```

- `public/` has only `favicon.svg` (linked from `index.html`) and `icons.svg` (a Vite template leftover, unused). There is no image optimization step and no CDN: keep exports small (2x at most) and give every `<img>` a real `alt` (`alt=""` plus `aria-hidden` for decoration).
- **Exported Figma assets must be saved into `src/assets/` and imported.** Do not point `src` at the temporary localhost/asset URLs the MCP returns.
- `perfis.png` is a sprite used as a CSS mask (`maskImage`/`maskSize`/`maskPosition` in `EscolhaTipoConta.tsx`) so the icon color follows the card state; copy that pattern for other single-color icons in a sprite.

### 5. Icons

- UI icons: `lucide-react`, named imports, sized by the `size` prop (16–20), colored by text classes, decorative ones with `aria-hidden="true"`. Map a Figma icon to the lucide icon with the same meaning (gear → `Settings`, exit → `LogOut`, swap → `RefreshCw`, three dots → `MoreHorizontal`) before exporting anything. Do not add another icon library or inline SVG sets.
- Brand and social icons are PNGs in `src/assets/` shown at `size-5 object-contain` inside the single `Rodape`. They have no destination yet, so they are decorative (`alt=""`, not links); the same goes for the footer text items.

### 6. Styling

- Tailwind utility classes inline in JSX; no CSS Modules, styled-components or Sass. `src/index.css` is the only global stylesheet (Tailwind import + `@theme`); `src/App.css` is empty and unused.
- Inline `style` is only for what utilities cannot express (the Home hero's radial gradients, the `EscolhaTipoConta` mask).
- Responsive design is mobile-first with Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`): single column by default, `lg:grid-cols-2` for hero sections, content wrappers `max-w-[1114px] mx-auto px-4 sm:px-8` (Home) and `max-w-md`/`max-w-3xl` (forms and Triagem, via `LayoutPagina`). The sidebar (`w-24 lg:w-28`) exists from `md` up; below it the bottom bar takes over. Check every screen at 390, 768 and 1440 px (no horizontal scroll at 390 px).
- The Calendar grid shrinks on phones (`gap-1`, `h-12`, `p-3` card) so each day stays ≥ 44 px; from `md` it goes back to the Figma spacing.
- Dates and numbers are formatted with `date-fns` (`ptBR`) and `toLocaleString('pt-BR')`.

### 7. Project structure

```
src/
  main.tsx            StrictMode + <App/>
  App.tsx             BrowserRouter > ToastProvider > SessaoProvider > BannerConexao + Routes (RotaProtegida per role, 404 at *)
  index.css           Tailwind import + @theme tokens + base layer (focus, reduced motion)
  api/                client.ts (apiRequest, ApiError), erros.ts (code → pt-BR), conexao.ts (offline state), token.ts, auth.ts, me.ts, triage.ts, consentimento.ts, meetings.ts
  session/            SessaoContext.ts (context, useSessao, destinoPorPapel), SessaoProvider.tsx
  components/         shared pieces (table above)
  pages/              one file per route: home, Login, criarConta (+ psicologoSolicita), Triagem, Calendario, minhasReunioes, adminPsico, minhaConta, naoEncontrada
  assets/             PNGs imported by pages
public/               favicon.svg
```

A new screen is a new file in `src/pages/` plus one `<Route>` in `src/App.tsx` (inside the `RotaProtegida` for the roles allowed); no per-feature folders. Route paths keep their existing casing (`/Triagem`, `/Calendario`) and new ones are lowercase kebab-case (`/minha-conta`).