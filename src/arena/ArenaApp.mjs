const game=new URLSearchParams(location.search).get('game');
await import(game==='chess'?'./ChessApp.mjs':'./GoApp.mjs');
