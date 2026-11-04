import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creditFromMetadata, fileFromThumbnail } from '../src/services/cityImages.js';

test('ricava file e progetto Wikimedia dalla miniatura', () => {
  assert.deepEqual(
    fileFromThumbnail('https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Evening_light_over_Barcelona.jpg/330px-Evening_light_over_Barcelona.jpg?utm_source=x'),
    { name: 'Evening_light_over_Barcelona.jpg', site: 'commons.wikimedia.org' }
  );
  assert.deepEqual(
    fileFromThumbnail('https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Catania_vista_dall%27alto.jpg/330px-x.jpg'),
    { name: "Catania_vista_dall'alto.jpg", site: 'en.wikipedia.org' }
  );
  assert.equal(fileFromThumbnail('https://example.com/foto.jpg'), null);
  assert.equal(fileFromThumbnail('non un url'), null);
});

test('attribuzione: autore in HTML ripulito, licenza e link alla pagina del file', () => {
  const credit = creditFromMetadata(
    { name: 'Torino Piazza Castello 11.jpg', site: 'commons.wikimedia.org' },
    {
      Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Esempio">Mario &amp; Anna</a>\n(Esempio)' },
      LicenseShortName: { value: 'CC BY-SA 4.0' },
      LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' }
    }
  );

  assert.deepEqual(credit, {
    author: 'Mario & Anna (Esempio)',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    source: 'Wikimedia Commons',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Torino_Piazza_Castello_11.jpg'
  });
});

test('attribuzione senza metadati: resta il link alla pagina del file, nessun campo inventato', () => {
  const credit = creditFromMetadata({ name: 'Foto.jpg', site: 'en.wikipedia.org' }, undefined);

  assert.equal(credit.author, '');
  assert.equal(credit.license, '');
  assert.equal(credit.licenseUrl, '');
  assert.equal(credit.source, 'Wikipedia');
  assert.equal(credit.pageUrl, 'https://en.wikipedia.org/wiki/File:Foto.jpg');
});
