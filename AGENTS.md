# Repository Guidelines

## Project Structure

- `src/App.tsx` and `src/App.css` contain application orchestration, page-level UI, and shared shell styles.
- `src/features/playground/` contains the component editor, typed component settings, preset storage, custom selects, exports, and editor styles.
- `src/features/tokens/` contains Design Token Studio, font catalog and picker, custom font storage, token types, persistence, and CSS/export helpers.
- `src/components/ui/` holds shared controls; `src/hooks/` and `src/utils/` hold reusable behavior and pure helpers.
- `src/index.css` defines global styles and semantic CSS variables. `public/` contains static assets and self-hosted font files. `tests/` contains Node.js tests; `tests/e2e/` contains Playwright browser tests. `playwright.config.ts` configures Chromium and starts a dedicated Vite server on port 4173 for E2E runs.

## Architecture and State

Use React function components and strict TypeScript types. Follow the existing two-space indentation, ES module conventions, `PascalCase` for components, and `camelCase` for functions and values. Keep feature logic in its existing feature folder; share controls from `src/components/ui/` instead of duplicating them. `App.tsx` owns application-level theme, preference, token draft, and page state. Playground component properties use the discriminated models in `editorTypes.ts`; presets use `presetStorage.ts`. Keep draft tokens isolated from applied root CSS variables until the explicit apply action.

Persist small settings and preset data through the existing storage helpers. Custom font binaries belong in IndexedDB, never `localStorage`. Handle storage failures through the existing user-facing feedback patterns.

## Styling

Use plain CSS and the existing semantic variables for color, typography, spacing, radius, and motion. Prefer the shared tokens over new literals. Keep feature styles in their feature stylesheet, use descriptive kebab-case class names, and respect reduced-motion behavior. Preserve dark/light theme compatibility and responsive container-query patterns.

## Commands and Testing

Use Node.js 22.12.0 or later. This satisfies Vite 8 and the TypeScript stripping flag used by the Node test runner. The project declares no independent npm version constraint. Run commands from the repository root:

- `npm ci` installs the lockfile dependencies.
- `npm run dev` starts Vite.
- `npm test` runs `tests/*.test.mjs` with Node's built-in test runner and TypeScript stripping.
- `npm run test:e2e` runs Playwright browser tests in Chromium. Install its browser with `npx playwright install chromium`; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` only when using an available system Chromium instead.
- `npm run lint` runs Oxlint.
- `npm run build` runs TypeScript project checks, then creates `dist/` with Vite.
- `npm run preview` serves the production build locally.

Add focused regression tests for pure logic and export/persistence helpers. A successful build does not replace browser checks for UI behavior.

## Commits and Pull Requests

Recent commits use Conventional Commit-style subjects such as `feat(playground): ...`. Keep commits scoped. Pull requests should explain the user-visible change, list test/lint/build results, link an issue when applicable, and include screenshots for visual changes when available.
