import themeToggleStyles from "./theme-toggle.css?inline";

import {
  CombatElement,
  cssStyleSheet,
  type CombatStyles,
} from "../../internal/base-element";

const themes = ["auto", "light", "dark"] as const;
export type Theme = (typeof themes)[number];

export class CuiThemeToggle extends CombatElement {
  static readonly tagName = "cui-theme-toggle";

  static override styles = [cssStyleSheet(themeToggleStyles)];

  connectedCallback() {
    this.adoptStyles();
    this.render();
  }

  private render() {
    if (!this.shadowRoot?.querySelector("button")) {
      this.appendShadowTemplate(`
        <button part="button" type="button" aria-live="polite">
          <span part="icon" aria-hidden="true"></span>
          <span part="label"></span>
        </button>
      `);
      
      this.querySelector("button")?.addEventListener("click", () =>
        this.cycleTheme(),
      );
    }

    const theme = getTheme();
    const label = this.shadowRoot?.querySelector("[part='label']");
    const icon = this.shadowRoot?.querySelector("[part='icon']");

    if (label) {
      label.textContent = `Theme: ${theme}`;
    }
    if (icon) {
      icon.textContent = theme === "dark" ? "D" : theme === "light" ? "L" : "A";
    }
  }

  private cycleTheme() {
    const currentTheme = this.getAttribute("theme") as
      | (typeof themes)[number]
      | null;
    const currentIndex = themes.indexOf(currentTheme ?? "auto");
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    this.setAttribute("theme", nextTheme || "auto");
  }
}

export function getTheme() {
  return document.documentElement.dataset.theme ?? "auto";
}

export function setTheme(theme: Theme) {
  const normalizedTheme = themes.includes(theme) ? theme : "auto";

  if (normalizedTheme === "auto") {
    delete document.documentElement.dataset.theme;
    return;
  }

  document.documentElement.dataset.theme = normalizedTheme;
}

export function defineCuiThemeToggle(registry = customElements) {
  if (!registry.get("cui-theme-toggle")) {
    registry.define("cui-theme-toggle", CuiThemeToggle);
  }
}