import { DurableObject } from 'cloudflare:workers';
import { newGame, play, markDead, markSeki, resume, score } from '../src/arena/GoRules.mjs';
import { chooseMove } from '../src/arena/GoAI.mjs';
import { capacity, capacityConfig, aiWeight, AI_LEASE_MS } from './go-capacity.mjs';

const MINUTE = 60000;
const fail = error => ({ error });
export class GoRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  read() { const rows = this.ctx.storage.sql.exec('SELECT value FROM room WHERE id=1').toArray(); return rows.length ? JSON.parse(rows[0].value) : null; }
  write(room) { this.ctx.storage.sql.exec('INSERT OR REPLACE INTO room VALUES(1, ?)', JSON.stringify(room)); }
  view(room, id) {
    // 19x19 clients reconstruct reviews from moves. Preserve the old 9x9
    // payload for already-open browser tabs during rolling deployment.
    const { history, ...compactGame } = room.game;
    const game = room.game.size === 19 ? compactGame : room.game;
    return { id: room.id, mode: room.mode, difficulty: room.difficulty, game, revision: room.revision,
      players: room.players.map(p => ({ name: p.name, avatar: p.avatar || '🌱', ready: p.ready })), seat: room.players.findIndex(p => p.id === id) + 1,
      family: room.family || null, rematchVotes: room.rematchVotes || [], nextRoom: room.nextReady ? room.nextRoom : null,
      phase: room.phase, remaining: room.remaining, turnAt: room.turnAt, expires: room.expires, now: Date.now() };
  }
  tick(room) {
    const now = Date.now();
    if (room.phase === 'playing') {
      const seat = room.game.turn - 1;
      if (room.remaining[seat] <= now - room.turnAt) { room.remaining[seat] = 0; room.game.result = { winner: 2 - seat, reason: 'timeout' }; room.game.phase = room.phase = 'finished'; room.revision++; }
    } else if (['waiting', 'ready', 'scoring'].includes(room.phase) && now >= room.expires) {
      room.phase = room.game.phase = 'expired'; room.revision++;
    }
  }
  async schedule(room) {
    const at = room.phase === 'playing' ? Math.min(room.turnAt + room.remaining[room.game.turn - 1], room.mode === 'ai' && room.game.turn === 2 ? Date.now() + 500 : Infinity)
      : ['waiting', 'ready', 'scoring'].includes(room.phase) ? room.expires : Date.now() + 24 * 60 * MINUTE;
    await this.ctx.storage.setAlarm(room.mode === 'ai' && !['finished', 'expired'].includes(room.phase) ? Math.min(at, Date.now() + 60000) : at);
    if (room.mode === 'ai' && ['finished', 'expired'].includes(room.phase)) {
      try { await capacity(this.env).releaseAI(room.id); } catch { /* Lease expiry bounds leaked reservations. */ }
    }
  }
  broadcast(room) {
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      try {
        if (a.expires <= Date.now()) { ws.close(4001, 'Session expired'); continue; }
        ws.send(JSON.stringify(this.view(room, a.id)));
      } catch { try { ws.close(1011, 'Reconnect'); } catch {} }
    }
  }
  async archive(room) {
    if (room.phase !== 'finished' || !this.env.DB) return;
    await this.env.DB.prepare(`INSERT INTO go_games(room_id, mode, black_user, white_user, result_json, game_json, finished_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(room_id) DO NOTHING`).bind(room.id, room.mode,
      room.players[0]?.userId || null, room.players[1]?.userId || null, JSON.stringify(room.game.result), JSON.stringify(room.game), Date.now()).run();
  }
  isOver() { const room = this.read(); if (!room) return true; this.tick(room); return ['finished','expired'].includes(room.phase); }
  async seed(data) {
    // Internal binding only. Idempotent after an interrupted family/rematch RPC.
    if (this.read()) return { ok: true };
    const room = { id: data.id, mode: 'invite', players: data.players.map(p => ({ ...p, ready: !!data.autoStart })), family: data.family || null,
      game: newGame(data.size, data.rules), revision: 0, remaining: [15 * MINUTE, 15 * MINUTE], turnAt: data.autoStart ? Date.now() : 0, phase: data.autoStart ? 'playing' : 'ready', expires: Date.now() + 30 * MINUTE };
    this.write(room); await this.schedule(room); return { ok: true };
  }
  async rematch(actor, accept) {
    let room = this.read();
    if (!room || !room.players.some(p => p.id === actor.id)) return fail('NOT_PLAYER');
    if (room.phase !== 'finished' || room.mode === 'ai') return fail('INVALID_ACTION');
    const seat = room.players.findIndex(p => p.id === actor.id) + 1;
    if (!room.nextRoom) {
      const votes = new Set(room.rematchVotes || []);
      if (accept) votes.add(seat); else votes.delete(seat);
      room.rematchVotes = [...votes]; room.revision++;
      if (votes.size === 2) room.nextRoom = crypto.randomUUID();
      this.write(room); this.broadcast(room);
    }
    if (room.nextRoom && !room.nextReady) {
      await this.archive(room);
      await this.env.GO_ROOMS.getByName(room.nextRoom).seed({ id: room.nextRoom, players: [...room.players].reverse(), size: room.game.size || 9, rules: room.game.rules || 'chinese', family: room.family, autoStart: true });
      if (room.family) await this.env.PLAYROOMS.getByName(`family:${room.family}`).advance(room.id, room.nextRoom, 'go');
      room = this.read(); room.nextReady = true; room.revision++; this.write(room); this.broadcast(room);
    }
    return this.view(room, actor.id);
  }
  async execute(actor, command) {
    let room = this.read();
    if (!room) {
      if (command.type !== 'create') return fail('ROOM_NOT_FOUND');
      room = { id: command.room, mode: command.mode, difficulty: command.difficulty, players: [{ ...actor, ready: false }],
        game: newGame(command.size ?? 9, command.rules ?? 'chinese'), revision: 0, remaining: [15 * MINUTE, 15 * MINUTE], turnAt: 0, phase: 'waiting', expires: Date.now() + 30 * MINUTE };
      if (room.mode === 'ai') { room.players.push({ id: 'computer', name: 'Computer', ready: true }); room.phase = 'ready'; }
    } else {
      this.tick(room);
      const seat = room.players.findIndex(p => p.id === actor.id);
      if (command.type === 'join' || command.type === 'create') {
        if (seat < 0) {
          if (room.phase !== 'waiting') return fail(room.phase === 'expired' ? 'ROOM_EXPIRED' : 'ROOM_FULL');
          room.players.push({ ...actor, ready: false }); room.phase = 'ready'; room.revision++;
        }
      } else if (seat < 0) return fail('NOT_PLAYER');
      else if (command.type !== 'get') {
        if (command.revision !== room.revision) return fail('STALE');
        if (command.type === 'ready' && room.phase === 'ready') {
          room.players[seat].ready = true;
          if (room.players.every(p => p.ready)) { room.phase = 'playing'; room.turnAt = Date.now(); }
        } else if (command.type === 'cancel' && ['waiting', 'ready'].includes(room.phase)) room.phase = room.game.phase = 'expired';
        else if (command.type === 'resign' && ['playing', 'scoring'].includes(room.phase)) {
          room.game.result = { winner: 2 - seat, reason: 'resign' }; room.phase = room.game.phase = 'finished';
        } else if (command.type === 'move' && room.phase === 'playing') {
          if (room.game.turn !== seat + 1) return fail('NOT_YOUR_TURN');
          try { room.game = play(room.game, command.point); } catch (e) { return fail(e.message); }
          room.remaining[seat] -= Date.now() - room.turnAt; room.turnAt = Date.now(); room.phase = room.game.phase;
          if (room.phase === 'scoring') room.expires = Date.now() + 30 * MINUTE;
        } else if (room.phase === 'scoring') {
          if (command.type === 'dead') { try { room.game = markDead(room.game, command.point); } catch (e) { return fail(e.message); } }
          else if (command.type === 'seki') { try { room.game = markSeki(room.game, command.point); } catch (e) { return fail(e.message); } }
          else if (command.type === 'resume') { room.game = resume(room.game); room.phase = 'playing'; room.turnAt = Date.now(); }
          else if (command.type === 'accept') {
            room.game.accepted = [...new Set([...room.game.accepted, seat + 1])];
            // Computer accepts the learner's proposed dead groups in practice mode.
            if (room.mode === 'ai') room.game.accepted = [1, 2];
            if (room.game.accepted.length === 2) { room.game.result = score(room.game); room.phase = room.game.phase = 'finished'; }
          } else return fail('INVALID_ACTION');
        } else return fail(room.phase === 'expired' ? 'ROOM_EXPIRED' : 'INVALID_ACTION');
        room.revision++;
      }
    }
    this.write(room); this.broadcast(room);
    await this.schedule(room);
    if (room.phase === 'finished') this.ctx.waitUntil(this.archive(room).catch(e => console.error('Go archive retry scheduled', e)));
    return this.view(room, actor.id);
  }
  async fetch(request) {
    // Only reached through the authenticated Worker binding, never a public route.
    const actor = JSON.parse(request.headers.get('x-go-actor') || 'null'), room = this.read();
    if (!actor || !room || !room.players.some(p => p.id === actor.id)) return new Response('Not a player', { status: 403 });
    if (this.ctx.getWebSockets().length >= 8) return new Response('Too many connections', { status: 429 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server); server.serializeAttachment(actor);
    server.send(JSON.stringify(this.view(room, actor.id)));
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, message) { if (message !== 'ping') ws.close(1008, 'Use authenticated actions'); }
  webSocketClose(ws, code, reason) { ws.close(code, reason); }
  webSocketError(ws) { ws.close(1011, 'Reconnect'); }
  async alarm() {
    let room = this.read(); if (!room) return;
    if (room.mode === 'ai' && !['finished', 'expired'].includes(room.phase)) {
      let renewed;
      try { renewed = await capacity(this.env).renewAI(room.id); }
      catch { await this.ctx.storage.setAlarm(Date.now() + 15000); return; }
      // RPC can yield to a concurrent resign/cancel/move. Read authoritative state again.
      room = this.read(); if (!room) return;
      if (!renewed && !['finished', 'expired'].includes(room.phase)) {
        room.phase = room.game.phase = 'expired'; room.revision++;
        this.write(room); this.broadcast(room); await this.schedule(room); return;
      }
    }
    if (['finished', 'expired'].includes(room.phase)) {
      await this.archive(room);
      for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'Room closed');
      await this.ctx.storage.deleteAll(); return;
    }
    this.tick(room);
    if (room.phase === 'playing' && room.mode === 'ai' && room.game.turn === 2) {
      const started = performance.now();
      const point = chooseMove(room.game, room.difficulty);
      const elapsed = performance.now() - started;
      this.ctx.waitUntil(capacity(this.env).reportAI(elapsed).catch(() => {}));
      room.game = play(room.game, point); room.remaining[1] -= Date.now() - room.turnAt;
      room.turnAt = Date.now(); room.phase = room.game.phase; room.revision++;
      if (room.phase === 'scoring') room.expires = Date.now() + 30 * MINUTE;
    }
    this.write(room); this.broadcast(room); await this.schedule(room); await this.archive(room);
  }
}

// The queue coordinates only matchmaking, never moves. Separate named instances
// provide per-IP request limits, without serializing game traffic globally.
export class GoLobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS entries (key TEXT PRIMARY KEY, value TEXT, expires REAL)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS ai_leases (room TEXT PRIMARY KEY, actor TEXT UNIQUE, weight INTEGER, expires REAL)');
  }
  acquireAI(room, actor, difficulty, size = 9) {
    const sql = this.ctx.storage.sql, now = Date.now(), config = capacityConfig(this.env);
    sql.exec('DELETE FROM ai_leases WHERE expires<=?', now);
    const existing = sql.exec('SELECT room FROM ai_leases WHERE actor=?', actor).toArray()[0];
    if (existing) return { error: 'AI_ALREADY_ACTIVE', roomId: existing.room };
    const cooldown = sql.exec("SELECT expires FROM entries WHERE key='ai-cooldown'").toArray()[0];
    const used = sql.exec('SELECT COUNT(*) AS rooms, COALESCE(SUM(weight),0) AS units FROM ai_leases').toArray()[0];
    const weight = aiWeight(difficulty, size);
    if (cooldown?.expires > now || used.rooms >= config.rooms || used.units + weight > config.units) return { error: 'AI_BUSY' };
    // No await between checking and reserving: all arrivals share this one DO.
    sql.exec('INSERT INTO ai_leases VALUES(?,?,?,?)', room, actor, weight, now + AI_LEASE_MS);
    return { ok: true };
  }
  renewAI(room) {
    const now = Date.now(), sql = this.ctx.storage.sql;
    const row = sql.exec('SELECT expires FROM ai_leases WHERE room=?', room).toArray()[0];
    if (!row || row.expires <= now) return false;
    sql.exec('UPDATE ai_leases SET expires=? WHERE room=?', now + AI_LEASE_MS, room); return true;
  }
  releaseAI(room) { this.ctx.storage.sql.exec('DELETE FROM ai_leases WHERE room=?', room); }
  reportAI(elapsed) {
    if (elapsed >= capacityConfig(this.env).slowMs) this.ctx.storage.sql.exec("INSERT OR REPLACE INTO entries VALUES('ai-cooldown','slow',?)", Date.now() + 60000);
  }
  limit() {
    const sql = this.ctx.storage.sql, now = Date.now();
    sql.exec('DELETE FROM entries WHERE expires < ?', now);
    const row = sql.exec("SELECT value FROM entries WHERE key='rate'").toArray()[0];
    const count = Number(row?.value || 0);
    if (count >= 90) return false;
    sql.exec("INSERT INTO entries VALUES('rate',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", String(count + 1), now + MINUTE);
    this.ctx.waitUntil(this.ctx.storage.setAlarm(now + 2 * MINUTE)); return true;
  }
  match(id) {
    const sql = this.ctx.storage.sql, now = Date.now(); sql.exec('DELETE FROM entries WHERE expires < ?', now);
    const own = sql.exec('SELECT value FROM entries WHERE key=? OR key=?', id, `paired:${id}`).toArray()[0];
    if (own) return JSON.parse(own.value);
    const waiting = sql.exec("SELECT key,value FROM entries WHERE key NOT LIKE 'paired:%' ORDER BY expires LIMIT 1").toArray()[0];
    let value;
    if (waiting) {
      value = { ...JSON.parse(waiting.value), paired: true };
      sql.exec('DELETE FROM entries WHERE key=?', waiting.key);
      sql.exec('INSERT OR REPLACE INTO entries VALUES(?,?,?)', `paired:${waiting.key}`, JSON.stringify(value), now + MINUTE);
      sql.exec('INSERT OR REPLACE INTO entries VALUES(?,?,?)', `paired:${id}`, JSON.stringify(value), now + MINUTE);
    } else { value = { room: crypto.randomUUID(), paired: false }; sql.exec('INSERT INTO entries VALUES(?,?,?)', id, JSON.stringify(value), now + 25000); }
    this.ctx.waitUntil(this.ctx.storage.setAlarm(now + 2 * MINUTE)); return value;
  }
  cancel(id) { this.ctx.storage.sql.exec('DELETE FROM entries WHERE key=? OR key=?', id, `paired:${id}`); }
  alarm() { this.ctx.storage.sql.exec('DELETE FROM entries WHERE expires < ?', Date.now()); }
}
