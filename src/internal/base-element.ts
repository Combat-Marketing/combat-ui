const sheetCache = new Map<string, CSSStyleSheet>();

export type CombatStyles = CSSStyleSheet | CSSStyleSheet[] | string | string[];

export function supportsConstructableStyleSheets(): boolean {
  return (
    "adoptedStyleSheets" in Document.prototype &&
    "replaceSync" in CSSStyleSheet.prototype
  );
}

export function cssStyleSheet(cssText: string): CSSStyleSheet {
  let sheet = sheetCache.get(cssText);

  if (sheet === undefined) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    sheetCache.set(cssText, sheet);
  }

  return sheet;
}

function normalizeStyles(styles: CombatStyles): Array<CSSStyleSheet | string> {
  return Array.isArray(styles) ? styles : [styles];
}

export class CombatElement extends HTMLElement {
  static readonly styles: CombatStyles = [];

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  protected adoptStyles(): void {
    if (!this.shadowRoot || this.hasAdoptedStyles()) {
      return;
    }

    const styles = normalizeStyles(
      (this.constructor as typeof CombatElement).styles,
    );

    if (styles.length === 0) {
      return;
    }

    if (supportsConstructableStyleSheets()) {
      const sheets = styles.map((style) => {
        return typeof style === "string" ? cssStyleSheet(style) : style;
      });

      this.shadowRoot.adoptedStyleSheets = [
        ...this.shadowRoot.adoptedStyleSheets,
        ...sheets,
      ];

      return;
    }

    const style = document.createElement("style");
    style.dataset.combatUi = "styles";
    style.textContent = styles
      .map((style) => (typeof style === "string" ? style : ""))
      .join("\n");

    this.shadowRoot.prepend(style);
  }

  protected appendShadowTemplate(html: string): void {
    if (!this.shadowRoot) {
      return;
    }

    const template = document.createElement("template");
    template.innerHTML = html;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  private hasAdoptedStyles(): boolean {
    if (!this.shadowRoot) {
      return false;
    }

    return (
      this.shadowRoot.querySelector("style[data-combat-ui='styles']") !== null ||
      this.shadowRoot.adoptedStyleSheets.length > 0
    );
  }
}
