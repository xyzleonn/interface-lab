# Interface Lab

Interface Lab is a desktop-first creative workspace for exploring themes, editing design tokens, and prototyping reusable interface components. It is built as a personal UI experimentation tool and an open-source learning project.

## Features

- **Overview:** A workspace dashboard with theme shortcuts, current appearance details, and session-only theme activity.
- **Theme Studio:** Choose dark or light appearance and a preset or custom accent color.
- **Design Tokens:** Edit color, typography, spacing, shape, shadow, and effect tokens in an isolated draft preview. Apply, discard, reset, save token presets, and export CSS variables or JSON.
- **Component Playground:** Select and configure 11 components: Button, Card, Input, Toggle, Slider, Badge, Alert, Select, Modal, Tooltip, and Tabs. Available properties include variants, sizes, and appropriate interactive preview states.
- **Presets and exports:** Save, load, and delete component presets. Export the selected component as HTML, CSS, or React/TypeScript (TSX).
- **Typography:** Browse built-in fonts and use custom font files in WOFF2, WOFF, TTF, or OTF formats. Built-in Inter and DM Sans assets are self-hosted; Manrope currently uses an external Google Fonts stylesheet.

## Screenshots

Screenshots are not included yet. Add reviewed application screenshots here when they are available; no placeholder images are shipped with the repository.

## Technology

React 19, TypeScript, Vite 8, and plain CSS. The runtime application dependencies are React and React DOM; development tools include Vite, TypeScript, Oxlint, and Playwright Test for browser-level checks.

## Prerequisites

Use Node.js **22.12.0 or later**. This Node 22 LTS baseline satisfies Vite 8 and the built-in TypeScript stripping used by `npm test`. Use the npm version distributed with your Node.js installation; the repository has no separate npm version constraint.

## Install and run

```sh
npm ci
npm run dev
```

Vite prints the local development URL in the terminal. The app runs in the browser and does not require application secrets or a backend service.

## Development commands

```sh
npm test          # Run the Node.js test suite
npm run lint      # Run Oxlint
npm run build     # Run TypeScript project checks and create dist/
npm run preview   # Serve the production build locally
```

## Browser tests

Browser tests use Playwright Test and Chromium. Install the project dependencies and the matching Playwright browser once:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

The Playwright config starts a dedicated Vite server on `127.0.0.1:4173`. Tests run separately from `npm test` and cover workspace navigation, component previews, dropdown and modal interactions, and keyboard focus behavior. Screenshots and traces are retained for failures in `test-results/`. In environments that provide a system Chromium but cannot download Playwright's browser, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to that executable path when running `npm run test:e2e`.

## Local data and custom fonts

Theme choices, application preferences, design tokens and their presets, and component presets are stored in browser `localStorage`. Uploaded custom font binaries are stored in browser IndexedDB and loaded with the browser Font Loading API. Font files are not sent to an application server. Clearing site data removes these settings, presets, and uploaded fonts. Manrope requires a network connection unless a fallback font is used.

## Current limitations

- The workspace is local to one browser profile. There is no account system, cloud sync, or multi-user collaboration.
- Component HTML/CSS/TSX and token CSS/JSON are export formats only; Interface Lab does not import generated files or synchronize data between browsers.
- Uploaded fonts are available only in the browser profile where they were added. Back up important font files separately before clearing site data.
- Manrope is loaded from Google Fonts; other verified built-in font assets are self-hosted.
- The component library is a prototyping tool. Static HTML exports include notes where JavaScript is required for interaction.

## Contributing

Contributions are welcome. Start by reviewing [AGENTS.md](AGENTS.md), keep changes focused, and run `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e` before opening a pull request. Explain user-visible changes and include screenshots for visual changes when available. Recent project commits use Conventional Commit-style subjects, for example `feat(playground): improve component presets`.

## License

Interface Lab is distributed under the MIT License. See [LICENSE](LICENSE) for the copyright notice and complete license text.
