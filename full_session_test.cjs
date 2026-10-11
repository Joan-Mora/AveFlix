/**
 * Full Session Simulation: 400 bots × 20 preguntas
 * VERSIÓN 2 — sin auto-cleanup, sin doble-advance de fase
 *
 * Cambios v2:
 * - El script YA NO avanza las fases (VOTING_RESULTS / FEEDBACK_LOOP) manualmente
 *   porque HostView lo hace automáticamente cuando: (a) se acaba el tiempo, o
 *   (b) todos los jugadores respondieron (nuevo auto-advance por 100% votos).
 * - El script solo establece QUESTION + timer al inicio de cada pregunta y espera
 *   a que Firebase confirme la transición automática.
 * - Los bots NO se eliminan al final — el leaderboard queda visible en el podio.
 *   Ejecuta: node cleanup_bots.cjs <PIN>  para limpiarlos después.
 *
 * Usage: node full_session_test.cjs <ROOM_PIN>
 */

'use strict';
const https = require('https');

const FIREBASE_DB_URL      = process.env.FIREBASE_DB_URL;
if (!FIREBASE_DB_URL) { console.error('Set FIREBASE_DB_URL (e.g. https://<project>-default-rtdb.firebaseio.com)'); process.exit(1); }
const ROOM_ID              = process.argv[2];
if (!ROOM_ID) { console.error('Usage: node full_session_test.cjs <PIN>'); process.exit(1); }

const NUM_BOTS             = 400;
const QUESTION_DURATION_MS = 30_000;
const BATCH_SIZE           = 50;
const BATCH_DELAY_MS       = 150;

// ─── QUESTION CHAIN ─────────────────────────────────────────────────────────
const QUESTIONS = [
  { id: 'q1',  choices: ['q1_opt_a','q1_opt_b','q1_opt_c','q1_opt_d'],   correctId: 'q1_opt_b'  },
  { id: 'q2',  choices: ['q2_opt_a','q2_opt_b','q2_opt_c','q2_opt_d'],   correctId: 'q2_opt_b'  },
  { id: 'q3',  choices: ['q3_opt_a','q3_opt_b','q3_opt_c','q3_opt_d'],   correctId: 'q3_opt_b'  },
  { id: 'q4',  choices: ['q4_opt_a','q4_opt_b','q4_opt_c','q4_opt_d'],   correctId: 'q4_opt_d'  },
  { id: 'q5',  choices: ['q5_opt_a','q5_opt_b','q5_opt_c','q5_opt_d'],   correctId: 'q5_opt_c'  },
  { id: 'q6',  choices: ['q6_opt_a','q6_opt_b','q6_opt_c','q6_opt_d'],   correctId: 'q6_opt_c'  },
  { id: 'q7',  choices: ['q7_opt_a','q7_opt_b','q7_opt_c','q7_opt_d'],   correctId: 'q7_opt_c'  },
  { id: 'q8',  choices: ['q8_opt_a','q8_opt_b','q8_opt_c','q8_opt_d'],   correctId: 'q8_opt_b'  },
  { id: 'q9',  choices: ['q9_opt_a','q9_opt_b','q9_opt_c','q9_opt_d'],   correctId: 'q9_opt_c'  },
  { id: 'q10', choices: ['q10_opt_a','q10_opt_b','q10_opt_c','q10_opt_d'], correctId: 'q10_opt_a' },
  { id: 'q11', choices: ['q11_opt_a','q11_opt_b','q11_opt_c','q11_opt_d'], correctId: 'q11_opt_a' },
  { id: 'q12', choices: ['q12_opt_a','q12_opt_b','q12_opt_c','q12_opt_d'], correctId: 'q12_opt_b' },
  { id: 'q13', choices: ['q13_opt_a','q13_opt_b','q13_opt_c','q13_opt_d'], correctId: 'q13_opt_a' },
  { id: 'q14', choices: ['q14_opt_a','q14_opt_b','q14_opt_c','q14_opt_d'], correctId: 'q14_opt_c' },
  { id: 'q15', choices: ['q15_opt_a','q15_opt_b','q15_opt_c','q15_opt_d'], correctId: 'q15_opt_a' },
  { id: 'q16', choices: ['q16_opt_a','q16_opt_b','q16_opt_c','q16_opt_d'], correctId: 'q16_opt_b' },
  { id: 'q17', choices: ['q17_opt_a','q17_opt_b','q17_opt_c','q17_opt_d'], correctId: 'q17_opt_b' },
  { id: 'q18', choices: ['q18_opt_a','q18_opt_b','q18_opt_c','q18_opt_d'], correctId: 'q18_opt_b' },
  { id: 'q19', choices: ['q19_opt_a','q19_opt_b','q19_opt_c','q19_opt_d'], correctId: 'q19_opt_c' },
  { id: 'q20', choices: ['q20_opt_a','q20_opt_b','q20_opt_c','q20_opt_d'], correctId: 'q20_opt_d' },
];

// ─── BOT PERSONALITIES ────────────────────────────────────────────────────────
const PERSONALITIES = [
  { name: 'Experto',   accuracy: 1.00, minDelay: 500,   maxDelay: 5_000  },
  { name: 'Rapido',    accuracy: 0.85, minDelay: 300,   maxDelay: 8_000  },
  { name: 'Promedio',  accuracy: 0.70, minDelay: 3_000, maxDelay: 18_000 },
  { name: 'Lento',     accuracy: 0.55, minDelay: 10_000,maxDelay: 27_000 },
  { name: 'Aleatorio', accuracy: 0.25, minDelay: 1_000, maxDelay: 28_000 },
];
function assignPersonality(i) {
  const p = i / NUM_BOTS;
  if (p < 0.15) return PERSONALITIES[0];
  if (p < 0.35) return PERSONALITIES[1];
  if (p < 0.70) return PERSONALITIES[2];
  if (p < 0.90) return PERSONALITIES[3];
  return PERSONALITIES[4];
}

const C = { g:'\x1b[32m',r:'\x1b[31m',y:'\x1b[33m',c:'\x1b[36m',b:'\x1b[1m',x:'\x1b[0m',m:'\x1b[35m' };
const log = (msg, c='x') => console.log(`${C[c]}${msg}${C.x}`);

function fbReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const url  = new URL(`${FIREBASE_DB_URL}${path}.json`);
    const data = body !== undefined ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    };
    const req = https.request(opts, res => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => {
        try { const p = raw ? JSON.parse(raw) : null; res.statusCode < 300 ? resolve(p) : reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0,100)}`)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function calcScore(responseMs, streak) {
  const speedBonus = Math.max(0, Math.floor(500 - responseMs / 100));
  const mult = streak >= 3 ? 1.5 : streak === 2 ? 1.2 : 1;
  return Math.floor((1000 + speedBonus) * mult);
}

/** Wait for Firebase phase to become expected value (polling) */
async function waitForPhase(expectedPhase, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const data = await fbReq('GET', `/rooms/${ROOM_ID}/meta/phase`);
    if (data === expectedPhase) return true;
    await sleep(800);
  }
  return false;
}

async function main() {
  log(`\n${'═'.repeat(65)}`, 'c');
  log(` FULL SESSION TEST v2 | ${NUM_BOTS} bots × ${QUESTIONS.length} preguntas | Sala: ${ROOM_ID}`, 'b');
  log(` NOTA: Los bots NO se eliminan al final — el podio quedará visible.`, 'y');
  log(` Para limpiar después: node cleanup_bots.cjs ${ROOM_ID}`, 'y');
  log(`${'═'.repeat(65)}\n`, 'c');

  const sessionStart = Date.now();

  // Create bots
  const bots = Array.from({ length: NUM_BOTS }, (_, i) => {
    const p = assignPersonality(i);
    return { id:`bot_${i+1}_${Date.now()}`, name:`${p.name}Bot${i+1}`, personality:p,
             score:0, streak:0, correctCount:0, incorrectCount:0 };
  });

  // ── Phase 0: Join ────────────────────────────────────────────────────────
  log('[Phase 0] Uniendo 400 bots...', 'y');
  let joinOk = 0, joinFail = 0;
  for (let i = 0; i < bots.length; i += BATCH_SIZE) {
    const batch = bots.slice(i, i + BATCH_SIZE);
    const res = await Promise.allSettled(batch.map(b =>
      fbReq('PUT', `/rooms/${ROOM_ID}/players/${b.id}`, {
        name: b.name, score: 0, joinedAt: Date.now(),
        streak: 0, correctCount: 0, incorrectCount: 0, playerId: b.id,
      }).then(() => joinOk++)
    ));
    res.forEach(r => { if (r.status === 'rejected') joinFail++; });
    process.stdout.write(`\r  ${Math.min(i+BATCH_SIZE, NUM_BOTS)}/${NUM_BOTS} unidos...`);
    if (i + BATCH_SIZE < bots.length) await sleep(BATCH_DELAY_MS);
  }
  console.log();
  log(`  ✓ ${joinOk} unidos, ${joinFail} errores`, joinFail > 0 ? 'r' : 'g');

  // ── Questions loop ─────────────────────────────────────────────────────
  const qStats = [];

  for (let qi = 0; qi < QUESTIONS.length; qi++) {
    const q = QUESTIONS[qi];
    log(`\n[Q${qi+1}/20] ${q.id} — correcta: ${q.correctId}`, 'c');

    // HOST: set QUESTION phase and timer
    const startedAt = Date.now();
    const endsAt    = startedAt + QUESTION_DURATION_MS;

    await fbReq('PATCH', `/rooms/${ROOM_ID}`, {
      'meta/phase': 'QUESTION',
      'gameState/currentNodeId': q.id,
      'gameState/startedAt': startedAt,
      'gameState/endsAt': endsAt,
    });
    // Clear previous responses for this node
    await fbReq('PUT', `/rooms/${ROOM_ID}/responses/${q.id}`, {});

    // Bots vote asynchronously — HostView auto-advances when all voted
    log(`  Bots votando (velocidad acorde a su personalidad)...`, 'y');
    let vOk = 0, vFail = 0;

    const votePromises = bots.map(async bot => {
      const p = bot.personality;
      const delay = Math.min(rand(p.minDelay, p.maxDelay), QUESTION_DURATION_MS - 500);
      await sleep(delay);
      const isCorrect = Math.random() < p.accuracy;
      const choiceId  = isCorrect ? q.correctId :
        q.choices.filter(c => c !== q.correctId)[Math.floor(Math.random() * 3)];
      const responseMs = Math.floor(delay);

      try {
        await fbReq('PUT', `/rooms/${ROOM_ID}/responses/${q.id}/${bot.id}`, {
          choiceId, submittedAt: Date.now(), responseMs, playerId: bot.id,
        });
        if (isCorrect) { bot.streak++; bot.correctCount++; bot.score += calcScore(responseMs, bot.streak); }
        else           { bot.streak = 0; bot.incorrectCount++; }
        vOk++;
      } catch { vFail++; }
    });

    // Wait for all votes OR timer, whichever comes first
    await Promise.all([
      Promise.allSettled(votePromises),
      sleep(QUESTION_DURATION_MS + 1000), // safety net
    ]);

    const stored = await fbReq('GET', `/rooms/${ROOM_ID}/responses/${q.id}`);
    const storedCount = stored ? Object.keys(stored).length : 0;
    log(`  ✓ enviados: ${vOk} | err: ${vFail} | Firebase: ${storedCount}`, vFail > 0 ? 'r' : 'g');
    qStats.push({ id: q.id, vOk, vFail, storedCount });

    // Wait for HostView to auto-advance to VOTING_RESULTS (HostView detects all-voted or timer)
    log(`  Esperando transición automática a VOTING_RESULTS...`, 'y');
    const gotVR = await waitForPhase('VOTING_RESULTS', 8_000);
    if (!gotVR) {
      log(`  ⚠ Timeout esperando VOTING_RESULTS — avanzando manualmente`, 'r');
      await fbReq('PATCH', `/rooms/${ROOM_ID}`, { 'meta/phase': 'VOTING_RESULTS' });
    }
    await sleep(1500); // let UI show results briefly

    // HOST: FEEDBACK_LOOP (host button press)
    await fbReq('PATCH', `/rooms/${ROOM_ID}`, { 'meta/phase': 'FEEDBACK_LOOP' });
    await sleep(1500);
  }

  // ── Final: push to LEADERBOARD ─────────────────────────────────────────
  log('\n[Final] Publicando LEADERBOARD...', 'c');
  await fbReq('PATCH', `/rooms/${ROOM_ID}`, { 'meta/phase': 'LEADERBOARD' });
  await sleep(4000); // give HostView time to compute and save the leaderboard

  // ── Verify leaderboard ─────────────────────────────────────────────────
  const lb = await fbReq('GET', `/rooms/${ROOM_ID}/leaderboard`);
  const lbEntries = lb?.entries
    ? (Array.isArray(lb.entries) ? lb.entries : Object.values(lb.entries))
    : [];
  lbEntries.sort((a, b) => b.score - a.score);

  // ── Final Report ──────────────────────────────────────────────────────
  const totalOk   = qStats.reduce((s, q) => s + q.vOk,   0);
  const totalFail = qStats.reduce((s, q) => s + q.vFail,  0);
  const avgStored = Math.round(qStats.reduce((s, q) => s + q.storedCount, 0) / qStats.length);

  log(`\n${'═'.repeat(65)}`, 'c');
  log(' REPORTE FINAL', 'b');
  log(`${'═'.repeat(65)}`, 'c');
  log(` Bots unidos           : ${joinOk} / ${NUM_BOTS}`);
  log(` Votos totales OK      : ${totalOk} / ${NUM_BOTS * QUESTIONS.length}`);
  log(` Votos fallidos        : ${totalFail}`);
  log(` Promedio votos/pregunta: ${avgStored}`);
  log(` Entradas en leaderboard: ${lbEntries.length}`);
  log(` Duración total        : ${((Date.now()-sessionStart)/1000).toFixed(1)}s`);

  if (lbEntries.length > 0) {
    log('\n TOP 10 LEADERBOARD (Firebase):', 'b');
    log(` ${'Pos'.padEnd(4)} ${'Nombre'.padEnd(22)} ${'Score'.padEnd(10)} ${'Correctas'.padEnd(10)} Racha`, 'm');
    log(` ${'-'.repeat(55)}`, 'm');
    lbEntries.slice(0, 10).forEach((e, i) => {
      log(` ${String(i+1).padEnd(4)} ${e.name.padEnd(22)} ${String(e.score).padEnd(10)} ${String(e.correctCount??0).padEnd(10)} ${e.streak??0}`, i < 3 ? 'g' : 'x');
    });
  }

  // Personality breakdown
  const byP = {};
  PERSONALITIES.forEach(p => byP[p.name] = { total:0, correct:0, score:0 });
  bots.forEach(b => {
    const s = byP[b.personality.name]; if (!s) return;
    s.total++; s.correct += b.correctCount; s.score += b.score;
  });
  log('\n RENDIMIENTO POR PERSONALIDAD:', 'b');
  log(` ${'Tipo'.padEnd(12)} ${'Cant'.padEnd(6)} ${'Precisión'.padEnd(12)} ${'Score avg'}`, 'm');
  PERSONALITIES.forEach(p => {
    const s = byP[p.name]; if (!s||!s.total) return;
    const acc = ((s.correct/(s.total*QUESTIONS.length))*100).toFixed(1);
    log(` ${p.name.padEnd(12)} ${String(s.total).padEnd(6)} ${(acc+'%').padEnd(12)} ${Math.round(s.score/s.total)}`);
  });

  const allOk = totalFail < NUM_BOTS * QUESTIONS.length * 0.02;
  log(`\n RESULTADO: ${allOk ? '✅  SESIÓN COMPLETA OK — EL PODIO ESTÁ VISIBLE EN EL NAVEGADOR' : '⚠️  SE DETECTARON ERRORES'}`, allOk ? 'g' : 'r');
  log(` ℹ️  Para limpiar los bots: node cleanup_bots.cjs ${ROOM_ID}`, 'y');
  log(`${'═'.repeat(65)}\n`, 'c');
}

main().catch(e => { log(`\n[FATAL] ${e.message}`, 'r'); process.exit(1); });
