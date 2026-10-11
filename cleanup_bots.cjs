/**
 * Cleanup script — delete all bot players from a test room
 * Usage: node cleanup_bots.cjs <ROOM_PIN>
 */
'use strict';
const https = require('https');
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;
if (!FIREBASE_DB_URL) { console.error('Set FIREBASE_DB_URL (e.g. https://<project>-default-rtdb.firebaseio.com)'); process.exit(1); }
const ROOM_ID = process.argv[2];
if (!ROOM_ID) { console.error('Usage: node cleanup_bots.cjs <PIN>'); process.exit(1); }

function fbReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${FIREBASE_DB_URL}${path}.json`);
    const data = body !== undefined ? JSON.stringify(body) : null;
    const opts = { hostname: url.hostname, path: url.pathname, method,
      headers: { 'Content-Type':'application/json', ...(data?{'Content-Length':Buffer.byteLength(data)}:{}) } };
    const req = https.request(opts, res => {
      let raw=''; res.on('data',c=>raw+=c);
      res.on('end', () => { try { resolve(raw?JSON.parse(raw):null); } catch(e){ resolve(null); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function cleanup() {
  console.log(`Limpiando sala ${ROOM_ID}...`);
  const players = await fbReq('GET', `/rooms/${ROOM_ID}/players`);
  if (!players) { console.log('No hay jugadores. Nada que limpiar.'); return; }

  const ids = Object.keys(players).filter(id => id.startsWith('bot_'));
  console.log(`  Eliminando ${ids.length} bots...`);
  const BATCH = 50;
  for (let i = 0; i < ids.length; i += BATCH) {
    await Promise.allSettled(ids.slice(i, i+BATCH).map(id =>
      fbReq('DELETE', `/rooms/${ROOM_ID}/players/${id}`)
    ));
    process.stdout.write(`\r  ${Math.min(i+BATCH, ids.length)}/${ids.length} eliminados...`);
    await new Promise(r => setTimeout(r, 100));
  }
  await fbReq('DELETE', `/rooms/${ROOM_ID}/responses`);
  console.log('\n✅ Cleanup completo.');
}

cleanup().catch(e => { console.error('[ERROR]', e.message); process.exit(1); });
