// Decode exactly one entity layer from generated HTML URL attributes.
const entities = Object.freeze({ amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' });
/** @param {string} value */
export function decodeAttribute(value) {
  return value.replace(/&(amp|quot|#39|lt|gt);/g, (match, name) => entities[name] ?? match);
}
