/// <reference path="../pb_data/types.d.ts" />

// GET /api/pp/version { commit }: Commit der geladenen Hooks aus lib/build.js, das das Dockerfile schreibt; lokal leer.
routerAdd('GET', '/api/pp/version', (e) => {
  let commit = '';
  try {
    commit = `${require(`${__hooks}/lib/build.js`).commit || ''}`;
  } catch (_) {}
  return e.json(200, { commit });
});
