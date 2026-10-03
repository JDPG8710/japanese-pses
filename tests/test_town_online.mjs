import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {startTownOnlinePreview} from '../scripts/preview-town-online.mjs';
const preview=await startTownOnlinePreview(),origin=preview.origin,sockets=[];let checks=0;
const check=(v,label)=>{assert.ok(v,label);console.log(`ok ${++checks} - ${label}`);};
async function api(body,headers={}){const r=await fetch(origin+'/api/town/rooms',{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':crypto.randomUUID(),...headers},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
async function connect(data){
 const ws=new WebSocket(origin.replace('http:','ws:')+`/api/town/rooms/${data.room}/socket?ticket=${data.ticket}`,{headers:{origin,'cf-connecting-ip':crypto.randomUUID()}}),messages=[];sockets.push(ws);
 ws.on('message',data=>messages.push(JSON.parse(data.toString())));
 const wait=async predicate=>{for(let i=0;i<150;i++){const index=messages.findIndex(predicate);if(index>=0)return messages.splice(index,1)[0];await new Promise(r=>setTimeout(r,20));}throw Error('Timed out waiting for socket message');};
 await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});const welcome=await wait(m=>m.type==='welcome');
 return {ws,messages,wait,welcome,send:m=>ws.send(JSON.stringify(m))};
}
async function closed(client){if(client.ws.readyState===WebSocket.CLOSED)return;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('socket did not close')),3000);client.ws.once('close',()=>{clearTimeout(timer);resolve();});});}
try{
 check((await api({mode:'invite'},{origin:'https://invalid.example'})).status===403,'foreign origin rejected');
 check((await api({mode:'public'})).data.error==='PARENTAL_GATE_REQUIRED','public admission requires existing guardian acknowledgment');
 check((await api({mode:'invite',room:'not-a-room'})).status===400,'invalid room rejected');
 const a=(await api({mode:'invite'})).data,b=(await api({mode:'invite',room:a.room})).data,c=(await api({mode:'invite'})).data;
 const A=await connect(a),B=await connect(b),C=await connect(c);
 check(A.welcome.self!==B.welcome.self&&B.welcome.peers.some(p=>p.id===a.self),'server creates identities and same-room membership');
 const presence={x:12,y:0,z:-10,heading:1,avatar:'robot',outfit:1,vehicle:'car',game:null,level:3,infiniteRound:0};
 A.send({type:'presence',presence});const seen=(await B.wait(m=>m.type==='peer'&&m.peer.vehicle==='car')).peer;
 check(seen.x===12&&seen.avatar==='robot'&&seen.id===a.self,'actual websocket broadcasts movement, appearance and vehicles');
 await new Promise(r=>setTimeout(r,150));check(!C.messages.some(m=>m.type==='peer'&&m.peer.id===a.self),'separate rooms never receive peer state');
 A.send({type:'emote',emote:'laugh'});check((await B.wait(m=>m.type==='peer'&&m.peer.emote==='laugh')).peer.emoteUntil>Date.now(),'fixed emotes reach companions');
 A.send({type:'invite',game:'bubble',level:3,infiniteRound:0});const invite=(await B.wait(m=>m.type==='challenge')).challenge;B.send({type:'accept',id:invite.id});const start=(await B.wait(m=>m.type==='start')).challenge;
 check(start.seed===invite.seed&&start.game==='bubble'&&!('math' in start)&&!('english' in start),'shared challenge carries a public seed without personal learning settings');
 const resumed=(await api({mode:'invite',room:a.room,resume:a.resume})).data,newA=await connect(resumed);await closed(A);
 check(newA.welcome.self===a.self,'reconnect retains identity and replaces old transport');
 newA.send({type:'leave'});await B.wait(m=>m.type==='left'&&m.id===a.self);await closed(newA);check(true,'leaving removes peer immediately');
 B.send({type:'presence',presence:{...presence,x:null,id:'forged'}});await closed(B);check(true,'invalid coordinates and identity injection close the sender');
 const large=(await api({mode:'invite'})).data,L=await connect(large);L.ws.send('x'.repeat(1025));await closed(L);check(true,'oversized websocket message rejected');
 const flood=(await api({mode:'invite'})).data,F=await connect(flood);for(let i=0;i<40;i++)F.send({type:'ping'});await closed(F);check(true,'message flood is bounded');
 const room=(await api({mode:'invite'})).data;for(let i=1;i<12;i++)assert.equal((await api({mode:'invite',room:room.room})).status,200);check((await api({mode:'invite',room:room.room})).data.error==='ROOM_FULL','room admission stops at twelve simultaneous leases');
 console.log(`Town online protocol: ${checks} checks passed`);
}finally{for(const ws of sockets)ws.terminate();await preview.close();}
