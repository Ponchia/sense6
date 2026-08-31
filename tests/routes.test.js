import assert from 'node:assert/strict';
import test from 'node:test';
import { createRouteMetadata } from '../src/routes.js';

test('route metadata derives one canonical and social identity record', () => {
  assert.deepEqual(
    createRouteMetadata({
      locale: 'it',
      route: 'acutezza',
      title: 'Acutezza',
      description: 'Descrizione',
      socialImage: '/social/acutezza.png',
      socialImageAlt: 'Anteprima Acutezza',
    }),
    {
      locale: 'it',
      route: 'acutezza',
      path: '/it/acutezza/',
      title: 'Acutezza',
      description: 'Descrizione',
      canonical: 'https://sense6.net/it/acutezza/',
      socialImage: 'https://sense6.net/social/acutezza.png',
      socialImageAlt: 'Anteprima Acutezza',
      indexable: true,
    },
  );
});
