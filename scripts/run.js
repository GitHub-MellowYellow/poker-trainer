// scripts/run.js — CLI simulation harness for poker-trainer
// Runs hands via Node.js; no browser required.
//
// Usage:
//   node scripts/run.js                           10 random hands
//   node scripts/run.js --hands 50                50 random hands
//   node scripts/run.js --seed abc1234d           replay exact hand
//   node scripts/run.js --hands 100 --csv         CSV batch export
//   node scripts/run.js --hands 50 --summary      readable + aggregate stats
//   node scripts/run.js --table 3                 3-handed game

import {
  genScenario, evalPre, evalPost,
  encodeSeed, decodeSeed,
  hn, cstr, classify,
  debugRun, debugToCSV, debugSummary,
} from '../src/poker-engine.js';

import { P6, P3 } from '../src/poker-data.js';

// ── Arg parsing ──────────────────────────────────────────────────────────────

var args = process.argv.slice(2);
var opts = { hands: 10, seed: null, table: 6, summary: false, csv: false };

for (var i = 0; i < args.length; i++) {
  var a = args[i];
  if ((a === '--hands' || a === '-n') && args[i + 1]) {
    opts.hands = Math.max(1, parseInt(args[++i]) || 10);
  } else if (a === '--seed' && args[i + 1]) {
    opts.seed = args[++i];
    opts.hands = 1;
  } else if (a === '--table' && args[i + 1]) {
    opts.table = parseInt(args[++i]) === 3 ? 3 : 6;
  } else if (a === '--summary') {
    opts.summary = true;
  } else if (a === '--csv') {
    opts.csv = true;
  }
}

var positions = opts.table === 3 ? P3 : P6;

// ── CSV mode: delegate to existing debugRun + debugToCSV ─────────────────────

if (opts.csv) {
  if (opts.seed) {
    process.stderr.write('Note: --seed is ignored in --csv mode (use human mode for seed replay).\n');
  }
  var csvResults = debugRun(opts.hands, opts.table);
  if (opts.summary) process.stderr.write(debugSummary(csvResults) + '\n');
  process.stdout.write(debugToCSV(csvResults) + '\n');
  process.exit(0);
}

// ── Terminal colours ─────────────────────────────────────────────────────────

var BOLD   = '\x1b[1m';
var GREEN  = '\x1b[32m';
var YELLOW = '\x1b[33m';
var RED    = '\x1b[31m';
var DIM    = '\x1b[2m';
var RESET  = '\x1b[0m';
var LINE   = '═'.repeat(58);

function rc(rating)   { return rating === 'green' ? GREEN : rating === 'yellow' ? YELLOW : RED; }
function icon(rating) { return rating === 'green' ? '✓' : rating === 'yellow' ? '~' : '✗'; }
function pct(v)       { return (v * 100).toFixed(1) + '%'; }
function bb(v)        { var n = parseFloat(v); return (n >= 0 ? '+' : '') + n.toFixed(1) + ' BB'; }

// Word-wrap text to maxWidth, prepending indent on continuation lines.
function wrap(text, indent, maxWidth) {
  var words = text.split(' ');
  var lines = [];
  var cur = '';
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    if (cur.length && cur.length + 1 + w.length > maxWidth) {
      lines.push(cur);
      cur = indent + w;
    } else {
      cur = cur.length ? cur + ' ' + w : w;
    }
  }
  if (cur.length) lines.push(cur);
  return lines.join('\n');
}

// ── Summary rows (collected when --summary) ──────────────────────────────────

var summaryRows = [];

// ── Per-hand runner ──────────────────────────────────────────────────────────

function runHand(handNum, seedCode) {
  var seed = seedCode ? decodeSeed(seedCode) : undefined;
  var sc = genScenario(positions, seed);
  var actualSeed = encodeSeed(sc.seed);
  var nota = hn(sc.playerHand[0], sc.playerHand[1]);
  var isPre = sc.street === 'preflop';
  var boardStr = sc.board.length ? sc.board.map(cstr).join(' ') : '--';

  // Available actions — mirror debugRun logic exactly
  var acts;
  if (isPre) {
    if (sc.preflopSit === 'vs_raise') acts = ['Fold', 'Call', '3-Bet'];
    else if (sc.pos === 'BB')         acts = ['Check', 'Raise'];
    else                              acts = ['Fold', 'Raise'];
  } else {
    acts = sc.betSize > 0 ? ['Fold', 'Call', 'Raise'] : ['Check', 'Bet'];
  }

  // Evaluate each action — each call returns action-specific narrative.
  // showPct=true surfaces equity numbers when available.
  var evals = {};
  for (var j = 0; j < acts.length; j++) {
    var act = acts[j];
    if (isPre) {
      evals[act] = evalPre(act, nota, sc.pos, sc.preflopSit, true);
    } else {
      evals[act] = evalPost(
        act, sc.playerHand, sc.board,
        sc.potSize, sc.betSize,
        sc.opp, sc.street, sc.postflopSit, true
      );
    }
  }

  // Authoritative reference: use first action's eval for best/debug fields.
  var ref = evals[acts[0]];
  var bestAction = ref.best;
  var dbg = ref.debug || {};

  // Postflop hand classification
  var cls = isPre ? null : classify(sc.playerHand, sc.board);

  // ── Header ────────────────────────────────────────────────────
  var streetLabel = sc.street.charAt(0).toUpperCase() + sc.street.slice(1);
  var oopLabel = sc.playerIsOOP ? '[OOP]' : '[IP]';
  console.log('\n' + LINE);
  console.log(
    BOLD + 'Hand #' + handNum + RESET +
    '  Seed: ' + BOLD + actualSeed + RESET +
    '  ' + streetLabel +
    '  ' + sc.pos + ' ' + DIM + oopLabel + RESET +
    '  vs  ' + sc.oppPos +
    '  ' + DIM + sc.opp.name + RESET
  );

  // Cards + board
  var cardsLine = 'Cards: ' + BOLD + nota + RESET;
  if (!isPre) cardsLine += '  ' + DIM + '(' + sc.playerHand.map(cstr).join(' ') + ')' + RESET;
  if (sc.board.length) cardsLine += '   Board: ' + BOLD + boardStr + RESET;
  console.log(cardsLine);

  // Situation + pot
  var sit = isPre ? (sc.preflopSit || 'open') : (sc.postflopSit || '--');
  var sitLine = 'Sit: ' + sit;
  if (!isPre) {
    sitLine += '   Pot: ' + sc.potSize.toFixed(1) + ' BB';
    if (sc.betSize > 0) sitLine += '   Bet: ' + sc.betSize.toFixed(1) + ' BB';
  }
  console.log(sitLine);

  // Postflop: hand strength + equity
  if (cls) {
    var drawList = cls.draws.length ? cls.draws.map(function(d) { return d.desc; }).join(', ') : 'none';
    console.log(
      'Hand: ' + cls.category + ' | ' + cls.handDesc +
      ' | Str: ' + cls.strength.toFixed(3)
    );
    console.log(
      'Texture: ' + (cls.boardTexture ? cls.boardTexture.texture || '--' : '--') +
      '   Draws: ' + drawList +
      '   Outs: ' + (cls.drawOuts || 0)
    );
    if (dbg.mcEq != null) {
      var gap = dbg.mcEq - (dbg.potOdds || 0);
      var gapStr = (gap >= 0 ? '+' : '') + (gap * 100).toFixed(1) + 'pp';
      console.log(
        'Equity: ' + pct(dbg.mcEq) +
        '   PotOdds: ' + (dbg.potOdds != null ? pct(dbg.potOdds) : '--') +
        '   Gap: ' + gapStr
      );
    }
    // Range sizes
    var rp = [];
    if (dbg.betRangeSize   != null) rp.push('bet='   + dbg.betRangeSize);
    if (dbg.checkRangeSize != null) rp.push('chk='   + dbg.checkRangeSize);
    if (dbg.callRangeSize  != null) rp.push('call='  + dbg.callRangeSize);
    if (rp.length) {
      var fb = dbg.rangeFallback ? 'L' + dbg.rangeFallbackLevel : 'no';
      console.log('Ranges: ' + rp.join('  ') + '   fallback=' + fb);
    }
  }

  // ── Actions ───────────────────────────────────────────────────
  console.log('');
  for (var k = 0; k < acts.length; k++) {
    var action = acts[k];
    var ev = evals[action];
    var isBest = action === bestAction;
    var colour = rc(ev.rating);
    var ratingLabel = ev.rating.toUpperCase().padEnd(6);
    var bestMark = isBest ? '  ' + DIM + '← BEST' + RESET : '';

    console.log(
      '  ' + colour + icon(ev.rating) + ' ' + BOLD + action.padEnd(6) + RESET +
      '  ' + colour + ratingLabel + RESET +
      '  ' + bb(ev.evDiff) +
      bestMark
    );

    if (ev.explanation) {
      var first = '    "' + ev.explanation;
      console.log(wrap(first, '     ', 80) + '"');
    }
    console.log('');
  }

  // ── Collect for --summary ─────────────────────────────────────
  if (opts.summary) {
    var row = {
      hand: handNum,
      seed: actualSeed,
      street: sc.street,
      pos: sc.pos,
      oppPos: sc.oppPos,
      oppType: sc.opp.id,
      cards: nota,
      board: boardStr,
      potSize: sc.potSize,
      betSize: sc.betSize,
      situation: sit,
      playerIsOOP: sc.playerIsOOP ? 'OOP' : 'IP',
      availableActions: acts.join('/'),
      bestAction: bestAction,
      acceptable: ref.acceptable.join('/'),
      handCategory: cls ? cls.category : '--',
      handDesc: cls ? cls.handDesc : '--',
      handStrength: cls ? cls.strength.toFixed(3) : '--',
      draws: cls ? (cls.draws.map(function(d) { return d.desc; }).join(', ') || 'none') : '--',
      drawOuts: cls ? cls.drawOuts : '--',
      boardTexture: cls ? (cls.boardTexture ? cls.boardTexture.texture || '--' : '--') : '--',
      mcEquity: dbg.mcEq != null ? dbg.mcEq.toFixed(3) : '--',
      rangeFallback: dbg.rangeFallback ? 'L' + dbg.rangeFallbackLevel : 'no',
      betRangeSize: dbg.betRangeSize != null ? dbg.betRangeSize : '--',
      checkRangeSize: dbg.checkRangeSize != null ? dbg.checkRangeSize : '--',
      callRangeSize: dbg.callRangeSize != null ? dbg.callRangeSize : '--',
      evBest: (evals[bestAction] ? evals[bestAction].evDiff : 0).toFixed(1),
      explanation: ref.explanation ? ref.explanation.substring(0, 120) : '--',
      fullExplanation: ref.explanation || '--',
    };
    for (var a2 = 0; a2 < acts.length; a2++) {
      var ar = acts[a2];
      row['rating_' + ar] = evals[ar].rating;
      row['ev_' + ar] = evals[ar].evDiff.toFixed(1);
    }
    summaryRows.push(row);
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────

console.log(
  DIM + 'poker-trainer sim  ' + opts.hands + ' hand' + (opts.hands !== 1 ? 's' : '') +
  '  table=' + opts.table + 'max' +
  (opts.seed ? '  seed=' + opts.seed : '') +
  RESET
);

if (opts.seed) {
  runHand(1, opts.seed);
} else {
  for (var h = 0; h < opts.hands; h++) {
    runHand(h + 1, null);
  }
}

if (opts.summary && summaryRows.length > 0) {
  console.log('\n' + '─'.repeat(58));
  console.log(debugSummary(summaryRows));
}
