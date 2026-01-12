# Combat UI

Combat UI is a small web component and CSS framework for building responsive interfaces on modern Baseline browser standards. It combines tokenized CSS, layout primitives, and framework-agnostic custom elements. We strive for a dependency free library, with the exception of the necessary development dependencies. It is based on our company's real world use cases.

The package is currently in an early-stage.

## What Is Included

- CSS reset, design tokens, layout primitives, and utility classes.
- Custom elements for buttons, navigation, and theme switching.
- TypeScript source with generated declarations for package builds.
- Vite-based library and docs builds.
- Stylelint and HTML lint checks for project conventions.

## Browser Target

Combat UI targets Baseline 2025 browsers with downstream support, as declared in `package.json`.

The CSS and components assume modern platform features such as custom elements, shadow DOM, CSS custom properties, CSS nesting, OKLCH colors, and `color-mix()`.

## Installation

This package is private right now, so install it from the repository or workspace where it is available.

```sh
npm install
```

## Development

```sh
npm run dev
```

Starts the Vite development server for the library project.

```sh
npm run dev:docs
```

Starts the docs site from the `docs` directory.

```sh
npm run build
```

Runs clean, typecheck, library build, and docs build.

```sh
npm run check
```

Runs TypeScript, CSS, and HTML checks.

## Package Exports

The main package export provides the JavaScript custom elements and generated types:

```ts
import {
  CuiButton,
  CuiNavbar,
  CuiThemeToggle,
  defineCombatUi,
  defineCuiButton,
  defineCuiNavbar,
  defineCuiThemeToggle,
  getTheme,
  setTheme,
  type Theme,
} from "@combat-ui/core";
```

The stylesheet export is intended to expose the built CSS bundle:

```ts
import "@combat-ui/core/styles";
```

## Basic Usage

Import the package once in your application entry:

```ts
import "@combat-ui/core";
```

The package auto-registers the current custom elements through `defineCombatUi()`.

Use the elements in HTML:

```html
<cui-navbar sticky>
  <a slot="brand" href="/">Combat UI</a>
  <a slot="nav" href="/" aria-current="page">Overview</a>
  <a slot="nav" href="/components">Components</a>
  <div slot="actions">
    <cui-theme-toggle></cui-theme-toggle>
  </div>
</cui-navbar>

<main class="cui-page cui-stack">
  <header class="cui-page-header">
    <h1>Combat UI</h1>
    <p class="cui-text-muted">Responsive web primitives and custom elements.</p>
  </header>

  <section class="cui-cluster">
    <cui-button variant="primary">Primary action</cui-button>
    <cui-button href="/docs">Read docs</cui-button>
  </section>
</main>
```

## Components

### `cui-button`

Renders as a native `<button>` by default and as an `<a>` when `href` is present.

Supported attributes:

- `variant="primary"` for the primary treatment.
- `full` for full-width layout.
- `disabled` to disable interaction.
- `href`, `target`, `rel`, and `download` for link mode.
- `type="button" | "submit" | "reset"` for button mode.

The inner control exposes `part="button"` for styling.

### `cui-navbar`

Provides a responsive navbar shell with named slots:

- `brand` for the product or site link.
- `nav` for navigation links.
- `actions` for controls such as theme toggles.

Supported attributes:

- `sticky` to pin the navbar.
- `expanded` to control mobile disclosure state.
- `sticky-offset` and `sticky-z-index` for sticky positioning.

Navigation links slotted directly as `a[slot="nav"]` receive default styling and can be configured with CSS custom properties such as `--cui-navbar-link-color`, `--cui-navbar-link-hover-bg`, and `--cui-navbar-link-current-bg`.

### `cui-theme-toggle`

Cycles the document theme between `auto`, `light`, and `dark` by writing to `document.documentElement.dataset.theme`.

Use the helpers when setting theme from code:

```ts
import { getTheme, setTheme } from "@combat-ui/core";

setTheme("dark");
console.log(getTheme());
```

Multiple toggles stay synchronized through a shared theme-change event.

Labels can be customized per instance for i18n:

```html
<cui-theme-toggle
  label-auto="Thema: automatisch"
  label-light="Thema: licht"
  label-dark="Thema: donker"
  aria-label-auto="Huidig thema: automatisch. Wijzig thema."
  aria-label-light="Huidig thema: licht. Wijzig thema."
  aria-label-dark="Huidig thema: donker. Wijzig thema."
></cui-theme-toggle>
```

## CSS

The framework CSS is composed from:

- `reset.css` for baseline element defaults.
- `tokens.css` for design tokens and theme variables.
- `utilities.css` for small utility classes.
- `website.css` for page/content helpers.
- `layout.css` for layout primitives.

Common classes include:

- `cui-page`, `cui-page-narrow`, `cui-page-wide`
- `cui-stack`, `cui-cluster`, `cui-grid`, `cui-split`
- `cui-shell`, `cui-app`
- `cui-page-header`, `cui-content`, `cui-center`, `cui-cover`
- `cui-text-muted`, `cui-text-balance`, `cui-visually-hidden`
- `cui-size-sm`, `cui-size-lg`, `cui-density-compact`, `cui-density-comfortable`

## Theming

Combat UI uses CSS custom properties with the `--cui-` prefix. The active theme is controlled with `data-theme` on the root element:

```html
<html data-theme="dark">
```

Remove `data-theme` or call `setTheme("auto")` to return to system preference.

Component-local custom properties use the `--_-` prefix internally. Public customization points should use `--cui-` names.

## Project Structure

```text
src/
  components/
    button/
    navbar/
    theme-toggle/
  styles/
  internal/
docs/
examples/
```

## Build Output

The library build writes to `dist`. The docs build writes to `dist-docs`.

```sh
npm run build:lib
npm run build:docs
```

## License

MIT
