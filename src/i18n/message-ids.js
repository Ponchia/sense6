/**
 * Stable IDs for shared interface and safety copy.
 *
 * Existing experiment prose remains source-keyed and migrates when touched.
 * Add reusable controls and boundaries here so wording changes do not silently
 * become catalog-key changes.
 */
export const MESSAGE_SOURCES = Object.freeze({
  'nav.allTests': 'All tests',
  'nav.about': 'About',
  'action.openTest': 'Open test',
  'action.seeMethod': 'See the method',
  'section.methodLimits': 'Method and limits',
  'section.researchTrail': 'Research trail',
  'gallery.testIncludes': 'What this test includes',
  'boundary.recreational':
    'Experimental perception tests for curiosity and fun—not medical tests or diagnoses.',
});

/** @typedef {keyof typeof MESSAGE_SOURCES} MessageId */

/** @param {MessageId} id @returns {string} */
export function messageSource(id) {
  if (!Object.hasOwn(MESSAGE_SOURCES, id)) throw new RangeError(`Unknown message ID: ${id}`);
  return MESSAGE_SOURCES[id];
}
