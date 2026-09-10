import { DurableObject } from 'cloudflare:workers';

const ONLINE = 70000, DAY = 86400000;
const fail = error => ({ error });
const person = a => ({ key: a.publicId, name: a.name, avatar: a.avatar });
// Each family is independent. The bounded public directory handles presence and
// invitations only; game actions never pass through it.
export class PlayroomSpace extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, json TEXT NOT NULL)');
  }
  read() { return JSON.parse(this.ctx.storage.sql.exec('SELECT json FROM state WHERE id=1').toArray()[0]?.json || 'null'); }
  save(s) {
    this.ctx.storage.sql.exec('INSERT OR REPLACE INTO state VALUES(1,?)', JSON.stringify(s));
    this.ctx.waitUntil(this.ctx.storage.setAlarm(Date.now() + (s.kind === 'public' ? ONLINE : 30 * DAY)));
  }
  async directory(actor, body) {
    const now = Date.now(), s = this.read() || { kind: 'public', people: {}, invites: [] };
    for (const [key, p] of Object.entries(s.people)) {
      p.tabs = Object.fromEntries(Object.entries(p.tabs).filter(([, t]) => t.at > now - ONLINE));
      if (!Object.keys(p.tabs).length) delete s.people[key];
    }
    s.invites = s.invites.filter(i => i.until > now);
    const key = actor.publicId;
    if (body.type === 'beat') {
      if (!actor.visible) delete s.people[key];
      else if (body.private) { if (s.people[key]) delete s.people[key].tabs[body.tab]; }
      else {
        if (!s.people[key] && Object.keys(s.people).length >= 500) return fail('DIRECTORY_FULL');
        const p = s.people[key] ||= { actor, tabs: {} };
        p.actor = actor;
        if (!p.tabs[body.tab] && Object.keys(p.tabs).length >= 8) delete p.tabs[Object.keys(p.tabs)[0]];
        p.tabs[body.tab] = { at: now, status: body.status, game:body.game||'go' };
      }
    } else if (body.type === 'invite') {
      const target = s.people[body.target], sender = s.people[key];
      if (!target || !sender || target.actor.id === actor.id || Object.values(target.tabs).some(t => t.status !== 'idle')) return fail('PLAYER_UNAVAILABLE');
      if (s.invites.some(i => i.from.id === actor.id && i.until > now - 90000)) return fail('TRY_LATER');
      s.invites.push({ id: crypto.randomUUID(), from: actor, to: target.actor.id, family: crypto.randomUUID(), until: now + 120000, accepted: false });
    } else if (body.type === 'decline' || body.type === 'accept') {
      const i = s.invites.find(i => i.id === body.invite && i.to === actor.id);
      if (!i) return fail('INVITE_EXPIRED');
      if (body.type === 'decline') s.invites = s.invites.filter(x => x !== i);
      else i.accepted = true;
    }
    this.save(s);
    if (body.type === 'accept') {
      const invite = s.invites.find(i => i.id === body.invite && i.to === actor.id);
      const family = this.env.PLAYROOMS.getByName(`family:${invite.family}`);
      await family.family(invite.from, { type: 'create', id: invite.family });
      await family.family(actor, { type: 'join' });
    }
    return {
      players: Object.values(s.people).filter(p => Object.keys(p.tabs).length).map(p => {const tabs=Object.values(p.tabs),active=tabs.find(t=>t.status==='playing')||tabs.find(t=>t.status==='waiting')||tabs[0];return {...person(p.actor),status:active.status,game:active.game||'go'};}),
      invites: s.invites.filter(i => i.to === actor.id || i.from.id === actor.id).map(i => ({ id: i.id, from: person(i.from), incoming: i.to === actor.id, accepted: i.accepted, family: i.accepted ? i.family : null }))
    };
  }
  view(s, actor) {
    return { id: s.id, revision: s.revision, host: s.members[0]?.publicId, self: actor.publicId, game: s.game || null, gameType:s.gameType||'go', size: s.size, rules: s.rules, seats: s.seats,
      members: s.members.map(m => ({ ...person(m), ready: !!m.ready, selected: s.seats.includes(m.publicId), online: Object.values(m.tabs || {}).some(at => at > Date.now() - ONLINE) })) };
  }
  family(actor, body) {
    let s = this.read();
    if (!s) {
      if (body.type !== 'create') return fail('FAMILY_NOT_FOUND');
      s = { kind: 'family', id: body.id, revision: 0, members: [], seats: [], gameType:'go', size: 9, rules: 'chinese', touched: Date.now() };
    }
    let m = s.members.find(p => p.id === actor.id);
    if (['create', 'join'].includes(body.type) && !m) {
      if (s.members.length >= 8) return fail('ROOM_FULL');
      m = { ...actor, ready: false, tabs: {} }; s.members.push(m);
      if (s.seats.length < 2 && !s.launching) s.seats.push(m.publicId);
      s.revision++;
    }
    if (!m) return fail('NOT_MEMBER');
    Object.assign(m, actor);
    if (body.type === 'beat' || body.type === 'join' || body.type === 'create') {
      m.tabs = Object.fromEntries(Object.entries(m.tabs || {}).filter(([,at]) => at > Date.now() - ONLINE));
      if (body.tab) m.tabs[body.tab] = Date.now();
      if (Object.keys(m.tabs).length > 8) delete m.tabs[Object.keys(m.tabs)[0]];
    }
    if (['ready','leave'].includes(body.type)) {
      if (s.launching) return fail('TRY_LATER');
      if (body.type !== 'leave' && body.revision !== s.revision) return fail('FAMILY_STALE');
      if (body.type === 'leave') { s.members = s.members.filter(p => p.id !== actor.id); s.seats = s.seats.filter(k => k !== actor.publicId); }
      if (body.type === 'ready') {
        if (!s.seats.includes(actor.publicId)) return fail('NOT_PLAYER');
        m.ready = !m.ready;
      }
      s.revision++;
    }
    s.touched = Date.now(); this.save(s);
    return body.type === 'leave' ? { ok: true } : this.view(s, actor);
  }
  async configure(actor, body) {
    let s=this.read();
    if(!s?.members.some(m=>m.id===actor.id))return fail('NOT_MEMBER');
    if(s.members[0].id!==actor.id)return fail('HOST_ONLY');
    if(s.launching)return fail('TRY_LATER');
    if(s.revision!==body.revision)return fail('FAMILY_STALE');
    if(!['go','chess'].includes(body.gameType)||![9,19].includes(body.size)||!['chinese','japanese'].includes(body.rules)||!Array.isArray(body.seats)||body.seats.length!==2||new Set(body.seats).size!==2||body.seats.some(key=>!s.members.some(p=>p.publicId===key)))return fail('INVALID_SETTINGS');
    if(s.game){
      const namespace=(s.gameType||'go')==='chess'?this.env.CHESS_ROOMS:this.env.GO_ROOMS;
      const done=await namespace.getByName(s.game).isOver();
      s=this.read();if(!s||s.revision!==body.revision)return fail('FAMILY_STALE');if(!done)return fail('GAME_ACTIVE');
    }
    s.gameType=body.gameType;s.size=body.size;s.rules=body.rules;s.seats=body.seats;s.members.forEach(p=>p.ready=false);s.revision++;s.touched=Date.now();this.save(s);return this.view(s,actor);
  }
  async start(actor, revision) {
    let s = this.read();
    if (!s?.members.some(m => m.id === actor.id)) return fail('NOT_MEMBER');
    if (s.members[0].id !== actor.id) return fail('HOST_ONLY');
    if (s.launching) return this.finishStart(actor, s);
    if (s.revision !== revision) return fail('FAMILY_STALE');
    if (s.game) {
      const namespace=(s.gameType||'go')==='chess'?this.env.CHESS_ROOMS:this.env.GO_ROOMS;
      const done = await namespace.getByName(s.game).isOver();
      s = this.read();
      if (s.revision !== revision) return fail('FAMILY_STALE');
      if (!done) return fail('GAME_ACTIVE');
    }
    const players = s.seats.map(k => s.members.find(m => m.publicId === k));
    if (players.length !== 2 || players.some(p => !p?.ready || !Object.values(p.tabs || {}).some(at => at > Date.now() - ONLINE))) return fail('NOT_READY');
    s.launching = { id: crypto.randomUUID(), gameType:s.gameType||'go', players: players.map(p => ({ ...p, ready: false })), size: s.size, rules: s.rules, family: s.id, autoStart: true };
    s.revision++; this.save(s);
    return this.finishStart(actor, s);
  }
  async finishStart(actor, s) {
    const launch = s.launching;
    const namespace=launch.gameType==='chess'?this.env.CHESS_ROOMS:this.env.GO_ROOMS;
    await namespace.getByName(launch.id).seed(launch);
    s = this.read();
    if (s.launching?.id === launch.id) {
      s.game = launch.id;s.gameType=launch.gameType; delete s.launching; s.members.forEach(p => p.ready = false); s.revision++; this.save(s);
    }
    return this.view(s, actor);
  }
  advance(oldId, nextId, gameType='go') { const s = this.read(); if (s?.game === oldId) { s.game = nextId;s.gameType=gameType; s.revision++; this.save(s); } }
  alarm() {
    const s = this.read();
    if (!s || s.kind === 'public' || s.touched < Date.now() - 30 * DAY) return this.ctx.storage.deleteAll();
    this.ctx.waitUntil(this.ctx.storage.setAlarm(s.touched + 30 * DAY));
  }
}
