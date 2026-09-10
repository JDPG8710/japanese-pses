import { Chess } from './vendor/chess.mjs';

export const START_FEN = new Chess().fen();
export function rebuild(game) {
  const chess = new Chess(game.startFen || undefined);
  for (const move of game.moves || []) chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
  return chess;
}
export function status(chess) {
  if (chess.isCheckmate()) return { winner: chess.turn() === 'w' ? 2 : 1, reason: 'checkmate' };
  if (chess.isStalemate()) return { winner: 0, reason: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { winner: 0, reason: 'insufficient' };
  if (chess.isThreefoldRepetition()) return { winner: 0, reason: 'repetition' };
  if (chess.isDrawByFiftyMoves()) return { winner: 0, reason: 'fifty' };
  return null;
}
export function createChessGame(startFen = START_FEN) {
  const chess = new Chess(startFen);
  return { startFen, fen: chess.fen(), moves: [], turn: chess.turn() === 'w' ? 1 : 2, check: chess.isCheck(), result: null, drawOffer: 0 };
}
export function playChess(game, from, to, promotion = 'q') {
  if (game.result) throw new Error('GAME_OVER');
  if (!/^[a-h][1-8]$/.test(from || '') || !/^[a-h][1-8]$/.test(to || '') || !['q','r','b','n'].includes(promotion)) throw new Error('INVALID_MOVE');
  const chess = rebuild(game);
  let move;
  try { move = chess.move({ from, to, promotion }); } catch { throw new Error('INVALID_MOVE'); }
  const next = { ...game, fen: chess.fen(), moves: [...game.moves, { from, to, promotion: move.promotion || null, san: move.san, captured: move.captured || null }], turn: chess.turn() === 'w' ? 1 : 2, check: chess.isCheck(), drawOffer: 0 };
  next.result = status(chess);
  return next;
}
export function legalMoves(game, from) {
  if (!/^[a-h][1-8]$/.test(from || '')) return [];
  return rebuild(game).moves({ square: from, verbose: true }).map(m => ({ to: m.to, promotion: m.promotion || null }));
}
export function chessPgn(game) {
  const chess = rebuild(game); return chess.pgn({ maxWidth: 80, newline: '\n' });
}
export function boardFromFen(fen) {
  const chess = new Chess(fen);
  return chess.board().flat().map(piece => piece ? { type: piece.type, color: piece.color } : null);
}
