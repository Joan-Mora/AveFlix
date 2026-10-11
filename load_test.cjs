/**
 * Load Test: 400 concurrent Firebase players joining a room
 *
 * Simulates 400 browser clients simultaneously:
 *   1. Joining the room (writing to Firebase via REST API)
 *   2. Voting on a question
 *   3. Measuring response times and detecting errors
 *
 * Prerequisites:
 *   - Run: npm install node-fetch@2  (or use native fetch on Node 18+)
 *   - Set the FIREBASE_DB_URL environment variable and pass the room PIN.
 *   - The host room must be open (in LOBBY phase or QUESTION phase).
 *
 * Run: node load_test.cjs
 */

const https = require('https');
const http = require('http');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL; // Your Firebase RTDB URL
if (!FIREBASE_DB_URL) { console.error('Set FIREBASE_DB_URL (e.g. https://<project>-default-rtdb.firebaseio.com)'); process.exit(1); }
const ROOM_ID         = process.argv[2] || 'TESTROOM';  // Pass room PIN as arg: node load_test.cjs V9NHWG
const NUM_PLAYERS     = 400;
const BATCH_SIZE      = 50;   // Players per batch (to avoid overwhelming the event loop)
const BATCH_DELAY_MS  = 200;  // ms between batches
const VOTE_DELAY_MS   = 3000; // ms after joining before voting
// ───────────────────────────────────────────────────────────────────────────

const colors = { green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m' };
const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);

function firebaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${FIREBASE_DB_URL}${path}.json`);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(raw || 'null'));
        else reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function joinPlayer(playerId, name) {
  const t0 = Date.now();
  await firebaseRequest('PUT', `/rooms/${ROOM_ID}/players/${playerId}`, {
    name,
    score: 0,
    joinedAt: Date.now(),
    streak: 0,
    correctCount: 0,
    incorrectCount: 0,
  });
  return Date.now() - t0;
}

async function vote(playerId, choiceIndex) {
  const t0 = Date.now();
  await firebaseRequest('PUT', `/rooms/${ROOM_ID}/responses/${playerId}`, {
    choiceIndex,
    answeredAt: Date.now(),
    playerId,
  });
  return Date.now() - t0;
}

async function cleanupPlayers(playerIds) {
  log('\nLimpiando jugadores de prueba...', 'yellow');
  // Remove players in batches
  const batches = [];
  for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
    batches.push(playerIds.slice(i, i + BATCH_SIZE));
  }
  for (const batch of batches) {
    await Promise.all(batch.map(id => firebaseRequest('DELETE', `/rooms/${ROOM_ID}/players/${id}`).catch(() => {})));
    await new Promise(r => setTimeout(r, 100));
  }
  await firebaseRequest('DELETE', `/rooms/${ROOM_ID}/responses`).catch(() => {});
  log('Cleanup completo.', 'green');
}

async function runLoadTest() {
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(` LOAD TEST: ${NUM_PLAYERS} jugadores → Sala ${ROOM_ID}`, 'bold');
  log(`${'═'.repeat(60)}\n`, 'cyan');

  // Stats
  const joinTimes = [];
  const voteTimes = [];
  let joinErrors = 0;
  let voteErrors = 0;
  const playerIds = [];

  const players = Array.from({ length: NUM_PLAYERS }, (_, i) => ({
    id: `loadtest_player_${i + 1}_${Date.now()}`,
    name: `TestPlayer${i + 1}`,
    choice: i % 4, // spread votes across 4 options
  }));

  // ── Phase 1: JOIN ─────────────────────────────────────────────────────
  log(`[1/3] Uniendo ${NUM_PLAYERS} jugadores en lotes de ${BATCH_SIZE}...`, 'yellow');
  const joinStart = Date.now();

  const batches = [];
  for (let i = 0; i < players.length; i += BATCH_SIZE) {
    batches.push(players.slice(i, i + BATCH_SIZE));
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    process.stdout.write(`\r  Lote ${b + 1}/${batches.length} (${Math.min((b+1)*BATCH_SIZE, NUM_PLAYERS)}/${NUM_PLAYERS} jugadores)...`);

    const results = await Promise.allSettled(
      batch.map(p => joinPlayer(p.id, p.name).then(ms => { playerIds.push(p.id); joinTimes.push(ms); }))
    );
    results.forEach(r => { if (r.status === 'rejected') joinErrors++; });

    if (b < batches.length - 1) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }

  const joinDuration = Date.now() - joinStart;
  console.log(); // newline after progress

  log(`  ✓ Join completado en ${joinDuration}ms`, 'green');
  log(`  Éxitos: ${joinTimes.length}  Errores: ${joinErrors}`, joinErrors > 0 ? 'red' : 'green');
  if (joinTimes.length) {
    const avg = Math.round(joinTimes.reduce((a,b) => a+b,0) / joinTimes.length);
    const max = Math.max(...joinTimes);
    const p95 = joinTimes.sort((a,b)=>a-b)[Math.floor(joinTimes.length * 0.95)];
    log(`  Latencia → avg: ${avg}ms  p95: ${p95}ms  max: ${max}ms`, 'cyan');
  }

  // ── Phase 2: wait, then VOTE ──────────────────────────────────────────
  log(`\n[2/3] Esperando ${VOTE_DELAY_MS}ms, luego votando...`, 'yellow');
  await new Promise(r => setTimeout(r, VOTE_DELAY_MS));

  const voteStart = Date.now();
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    process.stdout.write(`\r  Lote ${b + 1}/${batches.length} votando...`);

    const results = await Promise.allSettled(
      batch.map(p => vote(p.id, p.choice).then(ms => voteTimes.push(ms)))
    );
    results.forEach(r => { if (r.status === 'rejected') voteErrors++; });

    if (b < batches.length - 1) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }
  const voteDuration = Date.now() - voteStart;
  console.log();

  log(`  ✓ Votaciones completadas en ${voteDuration}ms`, 'green');
  log(`  Éxitos: ${voteTimes.length}  Errores: ${voteErrors}`, voteErrors > 0 ? 'red' : 'green');
  if (voteTimes.length) {
    const avg = Math.round(voteTimes.reduce((a,b) => a+b,0) / voteTimes.length);
    const max = Math.max(...voteTimes);
    const p95 = voteTimes.sort((a,b)=>a-b)[Math.floor(voteTimes.length * 0.95)];
    log(`  Latencia → avg: ${avg}ms  p95: ${p95}ms  max: ${max}ms`, 'cyan');
  }

  // ── Phase 3: VERIFY Firebase state ───────────────────────────────────
  log('\n[3/3] Verificando estado en Firebase...', 'yellow');
  const roomData = await firebaseRequest('GET', `/rooms/${ROOM_ID}`);
  const playerCount = roomData?.players ? Object.keys(roomData.players).length : 0;
  const responseCount = roomData?.responses ? Object.keys(roomData.responses).length : 0;

  log(`  Jugadores en DB: ${playerCount}`, playerCount >= NUM_PLAYERS * 0.95 ? 'green' : 'red');
  log(`  Votos en DB:     ${responseCount}`, responseCount >= NUM_PLAYERS * 0.95 ? 'green' : 'red');

  // ── Summary ───────────────────────────────────────────────────────────
  log(`\n${'═'.repeat(60)}`, 'cyan');
  log(` RESUMEN DEL TEST`, 'bold');
  log(`${'═'.repeat(60)}`, 'cyan');
  log(` Jugadores simulados : ${NUM_PLAYERS}`);
  log(` Joins exitosos      : ${joinTimes.length} (${joinErrors} errores)`);
  log(` Votos exitosos      : ${voteTimes.length} (${voteErrors} errores)`);
  log(` Jugadores en DB     : ${playerCount}`);
  log(` Votos en DB         : ${responseCount}`);
  log(` Duración total      : ${((Date.now() - joinStart)/1000).toFixed(1)}s`);

  const overallOk = (joinErrors + voteErrors) < NUM_PLAYERS * 0.05;
  log(`\n RESULTADO: ${overallOk ? '✅  PAGINA AGUANTA 400 USUARIOS' : '❌  SE DETECTARON ERRORES'}`, overallOk ? 'green' : 'red');
  log(`${'═'.repeat(60)}\n`, 'cyan');

  // Cleanup test data
  await cleanupPlayers(players.map(p => p.id));
}

runLoadTest().catch(err => {
  log(`\n[FATAL] ${err.message}`, 'red');
  process.exit(1);
});
