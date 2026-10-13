/**
 * Inspect a finite snapshot of text nodes. Keep DOM discovery separate from
 * range/layout reads so a live cursor cannot revisit nodes during inspection.
 * This function is serialized into the browser by locator.evaluate.
 * @param {Element} root
 */
export function findOverfragmentedWords(root) {
  const nodes = [root, ...root.querySelectorAll('*')].flatMap((parent) =>
    [...parent.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE),
  );
  const offenders = [];
  const range = document.createRange();
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest('.sr-only') || getComputedStyle(parent).display === 'none') continue;
    for (const match of node.textContent.matchAll(/[\p{L}\p{N}][\p{L}\p{N}-]{5,}/gu)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const fragments = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
      // Hyphens and inline fragments can produce several rectangles on the
      // same visual line. Count lines, not rectangles, without relaxing the
      // three-line bound used to detect vertical letter columns.
      const lineTops = new Set(fragments.map((rect) => Math.round(rect.top)));
      if (lineTops.size > 3) offenders.push(`${match[0]} (${lineTops.size} lines)`);
    }
  }
  return offenders;
}
