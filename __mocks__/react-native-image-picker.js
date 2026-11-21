/** Substitut Jest : aucun accès à la caméra ni à la galerie pendant les tests. */
module.exports = {
  launchCamera: jest.fn(async () => ({didCancel: true})),
  launchImageLibrary: jest.fn(async () => ({didCancel: true})),
};
