import { CombatElement, cssStyleSheet } from "../../internal/base-element";
import { installRemoteTrigger } from "../../internal/remote-trigger";
import controlStylesCss from "../../internal/styles/control-styles.css?inline";
import cookieBannerCss from "./cookie-banner.css?inline";

/** Optional consent categories. `necessary` is always granted and not listed. */
export type CuiCookieCategory = "analytics" | "marketing";

const OPTIONAL_CATEGORIES: readonly CuiCookieCategory[] = ["analytics", "marketing"];

/** Why a consent change fired — useful for analytics wiring. */
export type CuiCookieConsentReason =
  | "accept-all"
  | "decline-all"
  | "save"
  | "revoke"
  | "restore";

export interface CuiCookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp of when the choice was made. */
  timestamp: string;
}

export interface CuiCookieConsentChangeDetail {
  consent: CuiCookieConsent;
  reason: CuiCookieConsentReason;
}

const DEFAULT_COOKIE_NAME = "cui-cookie-consent";
const DEFAULT_COOKIE_EXPIRY = 365;

/**
 * Cookie consent banner. Renders a fixed bottom-anchored card with an
 * accept-all / necessary-only / settings flow, persists the choice in a
 * cookie, and emits a typed `cui-cookie-consent-change` event so the host
 * app can load (or block) analytics and marketing scripts. The component is
 * deliberately tracker-free — it manages consent and UI only; you wire the
 * actual scripts in response to the event.
 *
 * On connect it reads the stored cookie: when absent the banner opens; when
 * present it stays hidden and re-emits the saved consent with
 * `reason: "restore"` so consumers can re-apply it on every page load.
 *
 * All copy is provided through named slots with English defaults, so the
 * banner is fully translatable and brandable without touching the component.
 *
 * @element cui-cookie-banner
 *
 * @slot title - Banner heading. Default "Cookie settings".
 * @slot description - Intro paragraph explaining cookie use.
 * @slot accept-label - Accept-all button text. Default "Accept all".
 * @slot decline-label - Necessary-only button text. Default "Necessary only".
 * @slot settings-label - Open-settings button text. Default "Settings".
 * @slot save-label - Save-preferences button text. Default "Save preferences".
 * @slot necessary-label / necessary-description - Necessary category copy.
 * @slot analytics-label / analytics-description - Analytics category copy.
 * @slot marketing-label / marketing-description - Marketing category copy.
 * @slot policy - Cookie policy link. Default points to `/privacy-policy`.
 *
 * @attr {boolean} open - Reflects banner visibility. Set or remove to
 *   show/hide imperatively.
 * @attr {boolean} manual - When present, the banner does not auto-open on
 *   connect even without a stored choice. Call `show()` to open it yourself.
 * @attr {string} categories - Comma-separated optional categories to show
 *   (subset of `analytics,marketing`). Default shows both. `necessary` is
 *   always present and locked on.
 * @attr {string} cookie-name - Name of the consent cookie. Default
 *   `cui-cookie-consent`.
 * @attr {number} cookie-expiry - Cookie lifetime in days. Default `365`.
 *
 * @fires {CustomEvent<CuiCookieConsentChangeDetail>} cui-cookie-consent-change -
 *   Fires whenever consent is saved, revoked, or restored from the cookie.
 * @fires {CustomEvent} cui-cookie-banner-open - Fires after the banner opens.
 * @fires {CustomEvent} cui-cookie-banner-close - Fires after the banner closes.
 *
 * @example
 * <cui-cookie-banner></cui-cookie-banner>
 *
 * <script type="module">
 *   const banner = document.querySelector("cui-cookie-banner");
 *   banner.addEventListener("cui-cookie-consent-change", (event) => {
 *     if (event.detail.consent.analytics) loadAnalytics();
 *   });
 *   // Re-open later from a footer link:
 *   // <button data-cui-cookie-banner-target="...">Cookie settings</button>
 * </script>
 */
export class CuiCookieBanner extends CombatElement {
  static override tagName = "cui-cookie-banner";
  static override styles = [
    cssStyleSheet(controlStylesCss),
    cssStyleSheet(cookieBannerCss),
  ];
  static observedAttributes = ["open", "categories"];

  private abortController: AbortController | null = null;
  private consentState: CuiCookieConsent | null = null;

  connectedCallback(): void {
    this.render();
    this.bindEvents();

    installRemoteTrigger("data-cui-cookie-banner-target", (target, trigger) => {
      if (!(target instanceof CuiCookieBanner)) return;
      if (trigger.getAttribute("data-cui-cookie-banner-action") === "revoke") {
        target.revoke();
      } else {
        target.show();
      }
    });

    this.consentState = this.loadConsent();
    this.syncCategoryVisibility();

    if (this.consentState) {
      this.syncSwitches(this.consentState);
      this.emitConsent("restore");
    } else if (!this.hasAttribute("open") && !this.hasAttribute("manual")) {
      this.show();
    }
  }

  disconnectedCallback(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (!this.isConnected) return;
    if (name === "categories") {
      this.syncCategoryVisibility();
      return;
    }
    if (name !== "open" || oldValue === newValue) return;
    if (newValue !== null) {
      this.showSimpleView();
      this.dispatchEvent(
        new CustomEvent("cui-cookie-banner-open", { bubbles: true }),
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("cui-cookie-banner-close", { bubbles: true }),
      );
    }
  }

  /** Optional categories currently shown, derived from the `categories` attribute. */
  get categories(): CuiCookieCategory[] {
    const raw = this.getAttribute("categories");
    if (raw === null) return [...OPTIONAL_CATEGORIES];
    const requested = raw
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is CuiCookieCategory =>
        OPTIONAL_CATEGORIES.includes(value as CuiCookieCategory),
      );
    return requested;
  }

  get cookieName(): string {
    return this.getAttribute("cookie-name") || DEFAULT_COOKIE_NAME;
  }

  get cookieExpiry(): number {
    const value = Number(this.getAttribute("cookie-expiry"));
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_COOKIE_EXPIRY;
  }

  get isOpen(): boolean {
    return this.hasAttribute("open");
  }

  /** The current stored consent, or `null` when no choice has been made. */
  get consent(): CuiCookieConsent | null {
    return this.consentState;
  }

  getConsent(): CuiCookieConsent | null {
    return this.consentState;
  }

  hasConsent(category: CuiCookieCategory | "necessary"): boolean {
    if (category === "necessary") return true;
    return this.consentState?.[category] === true;
  }

  show(): void {
    if (this.isOpen) return;
    this.toggleAttribute("open", true);
  }

  hide(): void {
    if (!this.isOpen) return;
    this.removeAttribute("open");
  }

  acceptAll(): void {
    this.saveConsent({ analytics: true, marketing: true }, "accept-all");
    this.hide();
  }

  declineAll(): void {
    this.saveConsent({ analytics: false, marketing: false }, "decline-all");
    this.hide();
  }

  savePreferences(): void {
    const next: Record<CuiCookieCategory, boolean> = {
      analytics: false,
      marketing: false,
    };
    for (const category of this.categories) {
      const checkbox = this.shadowRoot?.querySelector<HTMLInputElement>(
        `input[data-category="${category}"]`,
      );
      next[category] = checkbox?.checked ?? false;
    }
    this.saveConsent(next, "save");
    this.hide();
  }

  /** Clear the stored choice and re-open the banner. */
  revoke(): void {
    this.deleteCookie(this.cookieName);
    this.consentState = null;
    this.dispatchEvent(
      new CustomEvent<CuiCookieConsentChangeDetail>(
        "cui-cookie-consent-change",
        {
          detail: {
            consent: {
              necessary: true,
              analytics: false,
              marketing: false,
              timestamp: "",
            },
            reason: "revoke",
          },
          bubbles: true,
        },
      ),
    );
    this.show();
  }

  showSettings(): void {
    const simple = this.shadowRoot?.querySelector(".simple");
    const settings = this.shadowRoot?.querySelector(".settings");
    simple?.toggleAttribute("hidden", true);
    settings?.toggleAttribute("hidden", false);
    if (this.consentState) this.syncSwitches(this.consentState);
  }

  private showSimpleView(): void {
    const simple = this.shadowRoot?.querySelector(".simple");
    const settings = this.shadowRoot?.querySelector(".settings");
    simple?.toggleAttribute("hidden", false);
    settings?.toggleAttribute("hidden", true);
  }

  private saveConsent(
    choices: Record<CuiCookieCategory, boolean>,
    reason: CuiCookieConsentReason,
  ): void {
    const consent: CuiCookieConsent = {
      necessary: true,
      analytics: choices.analytics,
      marketing: choices.marketing,
      timestamp: new Date().toISOString(),
    };
    this.consentState = consent;
    this.setCookie(this.cookieName, JSON.stringify(consent), this.cookieExpiry);
    this.syncSwitches(consent);
    this.emitConsent(reason);
  }

  private emitConsent(reason: CuiCookieConsentReason): void {
    if (!this.consentState) return;
    this.dispatchEvent(
      new CustomEvent<CuiCookieConsentChangeDetail>(
        "cui-cookie-consent-change",
        {
          detail: { consent: this.consentState, reason },
          bubbles: true,
        },
      ),
    );
  }

  private syncSwitches(consent: CuiCookieConsent): void {
    for (const category of OPTIONAL_CATEGORIES) {
      const checkbox = this.shadowRoot?.querySelector<HTMLInputElement>(
        `input[data-category="${category}"]`,
      );
      if (checkbox) checkbox.checked = consent[category];
    }
  }

  private syncCategoryVisibility(): void {
    const active = this.categories;
    for (const category of OPTIONAL_CATEGORIES) {
      const row = this.shadowRoot?.querySelector<HTMLElement>(
        `.category[data-category="${category}"]`,
      );
      row?.toggleAttribute("hidden", !active.includes(category));
    }
  }

  private bindEvents(): void {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.shadowRoot?.addEventListener(
      "click",
      (event) => {
        const action = (event.target as HTMLElement | null)
          ?.closest<HTMLElement>("[data-action]")
          ?.getAttribute("data-action");
        switch (action) {
          case "accept-all":
            this.acceptAll();
            break;
          case "decline-all":
            this.declineAll();
            break;
          case "show-settings":
            this.showSettings();
            break;
          case "save":
            this.savePreferences();
            break;
          default:
            break;
        }
      },
      { signal },
    );
  }

  private render(): void {
    this.renderTemplate(`
      <div class="banner" part="banner" role="dialog" aria-labelledby="cui-cookie-title">
        <div class="content" part="content">
          <h2 class="title" part="title" id="cui-cookie-title">
            <slot name="title">Cookie settings</slot>
          </h2>
          <p class="text" part="description">
            <slot name="description">We use cookies to improve your experience on our website. Some are necessary for the site to work; others help us improve it and remember your preferences.</slot>
          </p>

          <div class="simple" part="simple">
            <div class="actions">
              <button type="button" class="btn btn-primary" part="button accept-button" data-action="accept-all">
                <slot name="accept-label">Accept all</slot>
              </button>
              <button type="button" class="btn btn-outline" part="button decline-button" data-action="decline-all">
                <slot name="decline-label">Necessary only</slot>
              </button>
              <button type="button" class="btn btn-link" part="button settings-button" data-action="show-settings">
                <slot name="settings-label">Settings</slot>
              </button>
            </div>
          </div>

          <div class="settings" part="settings" hidden>
            <div class="category" part="category" data-category="necessary">
              <label class="switch">
                <input type="checkbox" data-category="necessary" checked disabled>
                <span class="switch-track" aria-hidden="true"></span>
                <span class="switch-text">
                  <strong><slot name="necessary-label">Necessary cookies</slot></strong>
                  <span class="category-desc">
                    <slot name="necessary-description">Essential for the website to function. These cannot be switched off.</slot>
                  </span>
                </span>
              </label>
            </div>

            <div class="category" part="category" data-category="analytics">
              <label class="switch">
                <input type="checkbox" data-category="analytics">
                <span class="switch-track" aria-hidden="true"></span>
                <span class="switch-text">
                  <strong><slot name="analytics-label">Analytics cookies</slot></strong>
                  <span class="category-desc">
                    <slot name="analytics-description">Help us understand how visitors use the website so we can improve it.</slot>
                  </span>
                </span>
              </label>
            </div>

            <div class="category" part="category" data-category="marketing">
              <label class="switch">
                <input type="checkbox" data-category="marketing">
                <span class="switch-track" aria-hidden="true"></span>
                <span class="switch-text">
                  <strong><slot name="marketing-label">Marketing cookies</slot></strong>
                  <span class="category-desc">
                    <slot name="marketing-description">Used to make advertising more relevant to you and your interests.</slot>
                  </span>
                </span>
              </label>
            </div>

            <div class="actions">
              <button type="button" class="btn btn-primary" part="button save-button" data-action="save">
                <slot name="save-label">Save preferences</slot>
              </button>
              <button type="button" class="btn btn-outline" part="button accept-button" data-action="accept-all">
                <slot name="accept-label">Accept all</slot>
              </button>
            </div>

            <p class="policy" part="policy">
              <slot name="policy"><a href="/privacy-policy" target="_blank" rel="noopener">Read our cookie policy</a></slot>
            </p>
          </div>
        </div>
      </div>
    `);
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() ?? null;
    }
    return null;
  }

  private setCookie(name: string, value: string, days: number): void {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Lax`;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;
  }

  private loadConsent(): CuiCookieConsent | null {
    const raw = this.getCookie(this.cookieName);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CuiCookieConsent>;
      return {
        necessary: true,
        analytics: parsed.analytics === true,
        marketing: parsed.marketing === true,
        timestamp: typeof parsed.timestamp === "string" ? parsed.timestamp : "",
      };
    } catch {
      return null;
    }
  }
}
