/**
 * Canonical evidence ledger for every public experiment source.
 *
 * A citation's role is part of the product claim. In particular, a related
 * paper or established instrument is not validation of the assembled Sense6
 * browser protocol. Keep `validation` empty until a study evaluates the exact,
 * versioned Sense6 method.
 */

/** @typedef {import('./contracts.js').ExamId} ExamId */
/** @typedef {'method' | 'boundary' | 'comparator' | 'validation'} SourceRole */
/** @typedef {{ id: string, role: SourceRole, label: string, href: string }} EvidenceSource */

export const SOURCE_ROLE_LABELS = Object.freeze({
  method: 'Method source',
  boundary: 'Interpretation boundary',
  comparator: 'Related instrument',
  validation: 'Sense6 validation',
});

/** @type {Readonly<Record<ExamId, readonly Readonly<EvidenceSource>[]>>} */
export const EXAM_SOURCES = Object.freeze({
  tetracromia: sources([
    source(
      'css-deok',
      'method',
      'W3C CSS Color 4: ΔEOK, OKLab, and OKLCH',
      'https://www.w3.org/TR/css-color-4/#color-difference-OK',
    ),
    source(
      'regan-cct',
      'comparator',
      'Regan, Reffin, and Mollon (1994): Cambridge Colour Test',
      'https://vision.psychol.cam.ac.uk/jdmollon/papers/ReganReffinMollonCambridgeColourTest.pdf',
    ),
    source(
      'levitt-staircase',
      'method',
      'Levitt (1971): transformed up-down methods',
      'https://doi.org/10.1121/1.1912375',
    ),
    source(
      'jordan-mollon-rgb',
      'boundary',
      'Jordan and Mollon (2019): tetrachromacy and ordinary RGB displays',
      'https://vision.psychol.cam.ac.uk/jdmollon/papers/JordanMollon2019Tetrachromacy.pdf',
    ),
    source(
      'xrite-fm100',
      'comparator',
      'X-Rite Farnsworth–Munsell 100 Hue Test',
      'https://www.xrite.com/fm-100-hue-test',
    ),
  ]),
  'color-blindness': sources([
    source(
      'srgb-lineage',
      'method',
      'IEC 61966-2-1: sRGB colour space',
      'https://webstore.iec.ch/en/publication/6169',
    ),
    source(
      'hpe-transform',
      'method',
      'Calabria and Fairchild (2001): Hunt–Pointer–Estévez transform',
      'https://repository.rit.edu/other/154/',
    ),
    source(
      'regan-cct',
      'comparator',
      'Regan, Reffin, and Mollon (1994): Cambridge Colour Test',
      'https://vision.psychol.cam.ac.uk/jdmollon/papers/ReganReffinMollonCambridgeColourTest.pdf',
    ),
    source(
      'levitt-staircase',
      'method',
      'Levitt (1971): transformed up-down methods',
      'https://doi.org/10.1121/1.1912375',
    ),
    source(
      'garcia-staircase',
      'method',
      'García-Pérez (1998): forced-choice staircase rules',
      'https://pubmed.ncbi.nlm.nih.gov/9797963/',
    ),
    // Same study as `regan-cct` above, cited here for a different claim and so
    // listed under its own id and role. As the Cambridge Colour Test it is a
    // comparator instrument; as the source of the luminance-noise method it is
    // the boundary on what a browser colour stimulus can isolate. Protan and
    // deutan confusion lines are not isoluminant, so a residual luminance cue is
    // inherent: a dichromat of the matching type sees a uniform intensity step
    // of roughly 5%-9%, several times the ring-mean dot noise. The noise masks
    // it for a non-ideal spatial integrator; it does not remove it, and no
    // luminance weighting can. The CCT's own remedy — randomizing target and
    // field mean luminance per trial — is not implemented here. See the
    // Luminance and Boundary notes in src/lib/daltonism.js.
    source(
      'regan-luminance-noise',
      'boundary',
      'Regan, Reffin, and Mollon (1994): luminance noise to suppress residual luminance cues',
      'https://doi.org/10.1016/0042-6989(94)90203-8',
    ),
  ]),
  riflessi: sources([
    source(
      'deary-rt',
      'comparator',
      'Deary, Liewald, and Nissan (2011): simple and four-choice response tasks',
      'https://doi.org/10.3758/s13428-010-0024-1',
    ),
    source(
      'basner-pvtb',
      'comparator',
      'Basner, Mollicone, and Dinges (2011): three-minute PVT-B',
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/',
    ),
    source(
      'bridges-timing',
      'boundary',
      'Bridges et al. (2020): browser experiment timing accuracy',
      'https://doi.org/10.7717/peerj.9414',
    ),
    source(
      'anwyl-irvine-timing',
      'boundary',
      'Anwyl-Irvine et al. (2021): online timing performance',
      'https://doi.org/10.3758/s13428-020-01501-5',
    ),
    source(
      'uievents-timestamp',
      'method',
      'DOM Standard: event timestamps',
      'https://dom.spec.whatwg.org/#dom-event-timestamp',
    ),
  ]),
  udito: sources([
    source(
      'woods-headphones',
      'method',
      'Woods et al. (2017): headphone screening for web experiments',
      'https://doi.org/10.3758/s13414-017-1361-2',
    ),
    source(
      'milne-huggins',
      'comparator',
      'Milne et al. (2021): Huggins-pitch online headphone screen',
      'https://doi.org/10.3758/s13428-020-01514-0',
    ),
    source(
      'levitt-staircase',
      'method',
      'Levitt (1971): transformed up-down methods',
      'https://doi.org/10.1121/1.1912375',
    ),
    source(
      'zhao-online-audio',
      'boundary',
      'Zhao et al. (2022): robust online psychoacoustic methods',
      'https://doi.org/10.1177/23312165221118792',
    ),
    source('web-audio', 'method', 'W3C Web Audio API', 'https://www.w3.org/TR/webaudio-1.0/'),
    source(
      'asha-screening',
      'boundary',
      'ASHA: adult hearing-screening guidance',
      'https://www.asha.org/practice-portal/professional-issues/adult-hearing-screening/',
    ),
  ]),
  acutezza: sources([
    source(
      'li-virtual-chinrest',
      'method',
      'Li et al. (2020): online screen and viewing-distance calibration',
      'https://www.nature.com/articles/s41598-019-57204-1',
    ),
    source(
      'iso-landolt',
      'boundary',
      'ISO 8596:2017 visual-acuity and Landolt optotype principles',
      'https://www.iso.org/standard/69042.html',
    ),
    source(
      'bach-fract',
      'comparator',
      'Bach (2025): FrACT acuity protocol evidence',
      'https://link.springer.com/article/10.1007/s00417-024-06638-z',
    ),
    source(
      'carkeet-pixels',
      'method',
      'Carkeet et al. (2021): pixelation and Landolt rendering',
      'https://pubmed.ncbi.nlm.nih.gov/34533231/',
    ),
    source(
      'zeri-low-contrast',
      'boundary',
      'Zeri et al. (2018): LCD Pelli–Robson contrast-sensitivity accuracy',
      'https://pubmed.ncbi.nlm.nih.gov/28639086/',
    ),
    source(
      'self-acuity-review',
      'boundary',
      'Thirunavukarasu et al. (2023): systematic review of self-administered visual-acuity testing',
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC10286971/',
    ),
    source(
      'urgent-eye-care',
      'boundary',
      'Merck Manual: warning signs in eye disorders',
      'https://www.merckmanuals.com/home/eye-disorders/symptoms-of-eye-disorders/eye-pain',
    ),
  ]),
});

/** @param {ExamId} examId */
export function sourcesFor(examId) {
  return EXAM_SOURCES[examId];
}

/** @param {ExamId} examId @param {SourceRole} role */
export function sourcesByRole(examId, role) {
  return EXAM_SOURCES[examId].filter((entry) => entry.role === role);
}

/** @param {EvidenceSource[]} entries */
function sources(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze(entry)));
}

/** @param {string} id @param {SourceRole} role @param {string} label @param {string} href */
function source(id, role, label, href) {
  return { id, role, label, href };
}
