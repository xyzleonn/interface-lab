# Repository Guidelines

## Project Structure & Module Organization

This repository is a small React 19 and TypeScript application built with Vite. Application code and styles live in `src/`: `main.tsx` mounts the app, `App.tsx` contains the primary interface, and `App.css` / `index.css` hold component and global styles. Put imported images and other bundled assets in `src/assets/`; files served directly should go in `public/`. Keep UI code close to the components that use it.

## Build, Test, and Development Commands

Use the package scripts from the repository root:

- `npm install` installs dependencies from `package-lock.json`.
- `npm run dev` starts the Vite development server with hot reload.
- `npm run build` runs TypeScript project checks and creates the production bundle in `dist/`.
- `npm run preview` serves the built bundle locally for a production-style review.
- `npm run lint` runs Oxlint using `.oxlintrc.json`.

There is currently no dedicated test script or test framework configured.

## Coding Style & Naming Conventions

Write UI in TypeScript and React function components. Follow the existing two-space indentation and the repository's TypeScript/ES module conventions. Use `PascalCase` for component names and component files, `camelCase` for variables and functions, and descriptive kebab-case class names in CSS. Keep styles in the existing CSS files unless a component-specific stylesheet improves organization. Run `npm run lint` and `npm run build` before submitting changes.

## Testing Guidelines

No automated tests are configured yet. For UI changes, run the lint and build commands, then check the affected screen with `npm run dev` in a browser. If adding tests, first introduce a test framework and script, and name test files after the covered module (for example, `App.test.tsx`).

## Commit & Pull Request Guidelines

The repository has no commit history yet, so no established commit message convention can be inferred. Use short, imperative commit subjects (for example, `Add responsive navigation`). Pull requests should explain the user-visible change, note validation commands and results, and include screenshots for visual changes. Link a related issue when one exists.

## Configuration

Keep environment-specific values and secrets out of source control. Review `.gitignore` before adding generated output or local configuration files.
