# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # Type-check (tsc -b) then Vite production build
npm run lint         # ESLint check
npm run preview      # Preview production build locally
npm run test:run     # Run tests once (CI-friendly)
npm run test         # Run tests in watch mode
npm run deploy       # Build + deploy to GitHub Pages (gh-pages -d dist)
```

## Working Rules

**After every code change, run `npm run build` to verify no TypeScript or build errors before considering the task done.**

## Architecture

This is a single-page React 19 + TypeScript app built with Vite, styled with Tailwind CSS 4, and routed with React Router 7. It is deployed to GitHub Pages at `https://wilsoniscoding.github.io/top_church/` — Vite base is set to `"./"` for relative asset paths.

**Domain**: Church activity management for the "1189第六屆" (1189 6th Session) — member payment tracking, activity registration, and habit tracking.

### Routing (`src/App.tsx`)

| Path | Page |
|------|------|
| `/top-church` | Main payment tracker (fetches from Google Sheets via Apps Script) |
| `/habits` | Member habit tracking |
| `/submit` | General activity submission form |
| `/sixthsubmit` | 6th-session registration form |

There is no root `/` route.

### Data Layer

Pages fetch data from Google Sheets via a Google Apps Script web app URL (hardcoded in `src/pages/top-church.tsx`). There is no backend or local state persistence — all data lives in the Google Sheet.

### Component Structure

- `src/components/ui/` — Generic, reusable primitives: `Button`, `Input`, `Checkbox`, `Modal`, `Alert`, `Select`. Exported via `index.ts`.
- `src/components/shared/` — Domain components tied to the member/payment model: `PersonCard`, `PersonTable`, `SearchInput`, `CheckboxGroup`, `EmptyState`. Exported via `index.ts`.
- `src/components/BibleVerseLoader.tsx` — Full-screen animated loading state shown while fetching data.
- `src/pages/` — Route-level components; each page is self-contained and may be large.

### Key Libraries

- **Framer Motion** — Used for animations (loading screens, transitions).
- **React Toastify** + **React Hot Toast** — Notification toasts (both are present; pick one when adding new notifications).
- **React Helmet** — SEO `<head>` metadata per page.
