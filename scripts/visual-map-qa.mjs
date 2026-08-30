import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const port = Number(process.env.MANABI_CDP_PORT || 9223);
const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json());
const target = targets.find(item => item.type === 'page' && item.url.includes('127.0.0.1:4173')) || targets.find(item => item.type === 'page');
if (!target?.webSocketDebuggerUrl) throw new Error('Visual QA browser tab was not found.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 0;
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function send(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
  return result.result.value;
}

async function capture(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const output = path.join(os.tmpdir(), name);
  await writeFile(output, Buffer.from(data, 'base64'));
  return output;
}

const inspectLayout = `(() => {
  const rect = id => document.getElementById(id)?.getBoundingClientRect();
  const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
  const grade = rect('grade-tabs-container');
  const streak = document.getElementById('streak-counter')?.parentElement?.getBoundingClientRect();
  const routes = [...document.querySelectorAll('.map-unit-route')];
  const stageStops = [...document.querySelectorAll('.map-stage-stop')];
  return {
    viewport: [innerWidth, innerHeight, devicePixelRatio],
    defaultName: document.getElementById('current-user-name')?.textContent?.trim(),
    gradeStreakOverlap: overlaps(grade, streak),
    subjectRouteOverlap: overlaps(rect('subject-nav'), routes[0]?.getBoundingClientRect()),
    routeCount: routes.length,
    stageCount: stageStops.length,
    routeSubjects: routes.map(row => row.dataset.subject),
    firstAndLastStage: [stageStops.at(0)?.dataset.stage, stageStops.at(-1)?.dataset.stage],
    backgroundImage: getComputedStyle(document.querySelector('.cartoon-map-world')).backgroundImage,
    clippedRoutes: routes.filter(row => row.scrollWidth > row.clientWidth + row.querySelector('.map-stage-track')?.scrollWidth).length
  };
})()`;

await send('Page.enable');
await send('Runtime.enable');
await new Promise(resolve => setTimeout(resolve, 2500));
await evaluate(`document.getElementById('daily-brand-close')?.click(); document.getElementById('grade-first-mode-btn')?.click(); true`);
await new Promise(resolve => setTimeout(resolve, 100));
await evaluate(`document.querySelector('.grade-tab-btn[data-grade="4"]')?.click(); true`);
await new Promise(resolve => setTimeout(resolve, 700));

const desktop = await evaluate(inspectLayout);
const desktopScreenshot = await capture('manabi-map-desktop.png');

await send('Emulation.setDeviceMetricsOverride', {
  width: 375,
  height: 812,
  deviceScaleFactor: 2,
  mobile: true,
  screenWidth: 375,
  screenHeight: 812
});
await new Promise(resolve => setTimeout(resolve, 500));
const mobile = await evaluate(inspectLayout);
const mobileScreenshot = await capture('manabi-map-mobile.png');

const stageLaunchWorked = await evaluate(`(() => {
  document.querySelector('.map-stage-stop')?.click();
  return !document.getElementById('game-modal')?.classList.contains('hidden')
    || !document.getElementById('game-type-modal')?.classList.contains('hidden');
})()`);

console.log(JSON.stringify({ desktop, mobile, stageLaunchWorked, desktopScreenshot, mobileScreenshot }, null, 2));
socket.close();
