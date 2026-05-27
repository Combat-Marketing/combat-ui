export function staticTagNamePlugin() {
  return {
    name: "static-tag-name",
    analyzePhase({ ts, node, moduleDoc }) {
      if (!ts.isClassDeclaration(node) || !node.name) return;

      const tagName = readStaticTagName(ts, node);
      if (!tagName) return;

      const className = node.name.getText();
      const decl = moduleDoc.declarations?.find(
        (d) => d.kind === "class" && d.name === className,
      );
      if (!decl) return;

      decl.tagName = tagName;
      decl.customElement = true;

      // Also surface as a module-level custom-element export so CEM emits it in `customElements.json` -> `customElements: [...]`.
      moduleDoc.exports = moduleDoc.exports ?? [];
      const hasExport = moduleDoc.exports.some(
        (e) => e.kind === "custom-element-definition" && e.name === tagName,
      );
      if (!hasExport) {
        moduleDoc.exports.push({
          kind: "custom-element-definition",
          name: tagName,
          declaration: { name: className, module: moduleDoc.path },
        });
      }
    },
  };
}

function readStaticTagName(ts, classNode) {
  for (const member of classNode.members) {
    if (!ts.isPropertyDeclaration(member)) continue;

    const isStatic = member.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.StaticKeyword,
    );
    if (!isStatic) continue;

    if (!member.name || member.name.getText() !== "tagName") continue;

    const init = member.initializer;
    if (init && ts.isStringLiteral(init)) return init.text;
  }
  return null;
}
