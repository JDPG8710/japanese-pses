const params = new URLSearchParams(location.search);
const game = params.get('game');
const room = params.get('room');

if (game === 'chess') {
  await import('./ChessApp.mjs');
} else if (game === 'go' || room) {
  await import('./GoApp.mjs');
} else {
  await import('./PlayroomHubApp.mjs');
}
