import { CONTENT_DATES } from './content-dates.js';

// Static English teaching resource, served without mounting the experiment app.
export const EDUCATION_RESOURCE_PATH = '/education/browser-reaction-time/';
export const EDUCATION_RESOURCE = Object.freeze({
  path: EDUCATION_RESOURCE_PATH,
  lastModified: CONTENT_DATES.education,
});
