# Difficulty, Code Quality, and Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two larger/harder boards, enforce ESLint and Prettier, and deploy every successful `main` build to GitHub Pages.

**Architecture:** Extract difficulty configuration into a tested module so grid detail, mine count, labels, and marker scale remain synchronized. Add ESLint 9 flat configuration with TypeScript-aware rules and Prettier as the formatting authority. Use a two-job GitHub Pages workflow: quality/build uploads `dist`, then deployment publishes only after all checks pass.

**Tech Stack:** TypeScript, Three.js, Vitest, ESLint 9, typescript-eslint, Prettier, GitHub Actions, GitHub Pages

**Spec:** Approved in chat on 2026-11-10: add 362/78 and 642/154 difficulty tiers; format with Prettier + ESLint; deploy pushes to `main` to GitHub Pages.

## Global Constraints

- Preserve all existing gameplay and rendering behavior.
- GitHub Pages URL target is `https://typeofnan.github.io/3D-Minesweeper/`.
- Deployment must not run unless format check, lint, tests, and production build all pass.
- Use pnpm with a frozen lockfile in CI.

## Review Focus

- Five difficulty buttons must remain usable at desktop and narrow widths.
- Higher detail grids must not accidentally reduce mine count or exceed the first-click-safe capacity.
- ESLint must type-check browser and test source without conflicting with Prettier.
- Vite asset URLs must resolve beneath the repository Pages subpath.
- Deployment permissions and build/deploy job dependency must match current GitHub Pages requirements.

---

### Task 1: Five tested difficulty tiers

**Files:**

- Create: `src/game/difficulties.ts`
- Create: `src/game/difficulties.test.ts`
- Modify: `src/main.ts`
- Modify: `index.html`

- [ ] Write failing tests for ordered labels, details, cell counts, mine counts, and strictly increasing density.
- [ ] Implement the shared difficulty configuration and consume it from the renderer/UI.
- [ ] Add `噩梦` and `深渊` controls and responsive five-button styling.
- [ ] Run focused tests and production build.

### Task 2: ESLint and Prettier

**Files:**

- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Format: source, tests, HTML, JSON, Markdown, YAML

- [ ] Install compatible ESLint, typescript-eslint, Prettier, and eslint-config-prettier dev dependencies.
- [ ] Add `lint`, `format`, `format:check`, and `check` scripts.
- [ ] Format the repository and resolve every lint finding without weakening correctness rules.
- [ ] Run `pnpm check` and confirm clean output.

### Task 3: GitHub Pages build and deployment

**Files:**

- Create: `.github/workflows/pages.yml`
- Modify: `vite.config.ts`
- Modify: `README.md`

- [ ] Set Vite base to `/3D-Minesweeper/` for production while preserving `/` in development.
- [ ] Add a `main` push/manual workflow using current official Pages actions and required permissions.
- [ ] Run the exact local quality/build commands used by CI and inspect `dist/index.html` asset paths.
- [ ] Validate workflow syntax and document the Pages URL and one-time repository Pages source requirement.
