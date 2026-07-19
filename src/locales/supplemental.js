import * as ar from './supplemental/ar.js';
import * as hi from './supplemental/hi.js';
import * as ja from './supplemental/ja.js';
import * as ko from './supplemental/ko.js';
import * as ptBr from './supplemental/pt-br.js';
import * as zhHans from './supplemental/zh-hans.js';

/** @type {Readonly<Record<string, {privacy: object, journal: Readonly<Record<string, string>>, setupLabels: readonly string[]}>>} */
const SUPPLEMENTAL = Object.freeze({
  ar,
  hi,
  ja,
  ko,
  'pt-br': ptBr,
  'zh-hans': zhHans,
});

/** @param {string} locale */
export function supplementalPrivacy(locale) {
  return SUPPLEMENTAL[locale]?.privacy;
}

/** @param {string} locale */
export function supplementalJournal(locale) {
  return SUPPLEMENTAL[locale]?.journal;
}

/** @param {string} locale */
export function supplementalSetupLabels(locale) {
  return SUPPLEMENTAL[locale]?.setupLabels;
}
