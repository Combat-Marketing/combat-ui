/**
 * Batteries-included entry point. Registers every Combat UI custom element and
 * ships the global utility stylesheet, for drop-in usage with no setup:
 *
 *   import "@combat-ui/core/auto";
 *
 * For tree-shakeable usage, import the classes you need from the package root
 * (`import { CuiButton } from "@combat-ui/core"`) or from the per-component
 * subpaths (`import "@combat-ui/core/button"`), and call `defineCombatUi()`
 * yourself if you want bulk registration. The root entry no longer
 * auto-registers or injects the global stylesheet.
 */
import "./index.css";
import { defineCombatUi } from "./index";

defineCombatUi();
