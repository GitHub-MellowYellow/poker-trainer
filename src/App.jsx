import { useState, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SUITS = ["♠","♥","♦","♣"];
const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
const RV = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,T:10,J:11,Q:12,K:13,A:14};
const RANK_DISPLAY = {T:"10",J:"J",Q:"Q",K:"K",A:"A"};
const RANK_NAME = {2:"deuce",3:"three",4:"four",5:"five",6:"six",7:"seven",8:"eight",9:"nine",T:"ten",J:"jack",Q:"queen",K:"king",A:"ace"};

const POS_6 = ["UTG","MP","CO","BTN","SB","BB"];
const POS_3 = ["BTN","SB","BB"];

const OPP_TYPES = [
  { id:"tight", name:"Careful", emoji:"🛡️", color:"#2b5a8a", desc:"Plays few hands, only bets strong" },
  { id:"neutral", name:"Regular", emoji:"⚖️", color:"#6b6b5b", desc:"Balanced, standard play" },
  { id:"aggro", name:"Aggro", emoji:"🔥", color:"#78040d", desc:"Bets wide, bluffs often" },
];

const STREET_NAMES = { preflop:"Preflop", flop:"Flop", turn:"Turn", river:"River" };

// ── Palette ──
const P = {
  bg:        "#f0e8d8",       // buff / warm cream
  bgDark:    "#e6dccc",       // slightly darker for panels
  navy:      "#2b3a52",       // police blue
  navyLight: "#3d5170",
  gold:      "#d4a030",       // marigold
  goldDark:  "#b8891a",
  red:       "#78040d",       // deep cherry
  green:     "#4a7a3a",       // olive leaf
  greenLight:"#6b9a50",
  text:      "#2b2b24",       // near-black warm
  textMid:   "#5c5a50",       // medium text
  textLight: "#8a8878",       // muted
  cream:     "#faf6ee",       // vanilla custard (card bg)
  white:     "#ffffff",
  boardBg:   "#2b3a52",       // navy for board strip
};

// ═══════════════════════════════════════════════════════════════
// PREFLOP RANGES
// ═══════════════════════════════════════════════════════════════

const OPEN = {
  UTG: new Set(["AA","KK","QQ","JJ","TT","99","88","77","AKs","AQs","AJs","ATs","A5s","A4s","AKo","AQo","KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s"]),
  MP: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","A5s","A4s","A3s","AKo","AQo","AJo","KQs","KJs","KTs","K9s","QJs","QTs","Q9s","JTs","J9s","T9s","98s","87s"]),
  CO: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","KTo","QJs","QTs","Q9s","Q8s","QJo","QTo","JTs","J9s","J8s","JTo","T9s","T8s","98s","97s","87s","76s","65s"]),
  BTN: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","Q7s","QJo","QTo","JTs","J9s","J8s","J7s","JTo","T9s","T8s","T7s","98s","97s","96s","87s","86s","76s","75s","65s","64s","54s"]),
  SB: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","KQo","KJo","KTo","QJs","QTs","Q9s","QJo","JTs","J9s","T9s","98s","87s"]),
};

const BB_VS = {
  threebet: new Set(["AA","KK","QQ","JJ","AKs","AKo","AQs","A5s","A4s"]),
  call: new Set(["TT","99","88","77","66","55","44","33","22","AJs","ATs","A9s","A8s","A7s","A6s","A3s","A2s","AQo","AJo","KQs","KJs","KTs","K9s","KQo","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","97s","87s","76s","65s","54s"]),
};

const SB_VS = {
  threebet: new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs"]),
  call: new Set(["99","88","77","ATs","A9s","AQo","KQs","KJs","QJs","JTs","T9s"]),
};

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s });
  return d;
}

function cardStr(c) { return (RANK_DISPLAY[c.rank] || c.rank) + c.suit; }

function handNotation(c1, c2) {
  const v1 = RV[c1.rank], v2 = RV[c2.rank];
  const hi = v1 >= v2 ? c1 : c2, lo = v1 >= v2 ? c2 : c1;
  if (hi.rank === lo.rank) return hi.rank + lo.rank;
  return hi.rank + lo.rank + (hi.suit === lo.suit ? "s" : "o");
}

// ═══════════════════════════════════════════════════════════════
// HAND EVALUATOR
// ═══════════════════════════════════════════════════════════════

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [...combinations(rest, k - 1).map(c => [first, ...c]), ...combinations(rest, k)];
}

function eval5(cards) {
  const vals = cards.map(c => RV[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  let isStraight = false, straightHi = 0;
  const unique = [...new Set(vals)].sort((a,b) => b-a);
  if (unique.length === 5 && unique[0] - unique[4] === 4) { isStraight = true; straightHi = unique[0]; }
  if (unique.length === 5 && unique[0]===14 && unique[1]===5 && unique[2]===4 && unique[3]===3 && unique[4]===2) { isStraight = true; straightHi = 5; }
  const freq = {};
  vals.forEach(v => freq[v] = (freq[v]||0) + 1);
  const groups = Object.entries(freq).map(([v,c]) => ({v:+v,c})).sort((a,b) => b.c-a.c || b.v-a.v);
  const sc = (rank, sub) => rank * 1e10 + sub;
  if (isFlush && isStraight) return straightHi===14 ? {rank:9,name:"Royal Flush",score:sc(9,14)} : {rank:8,name:"Straight Flush",score:sc(8,straightHi)};
  if (groups[0].c===4) return {rank:7,name:"Four of a Kind",score:sc(7,groups[0].v*100+groups[1].v)};
  if (groups[0].c===3 && groups[1]?.c===2) return {rank:6,name:"Full House",score:sc(6,groups[0].v*100+groups[1].v)};
  if (isFlush) return {rank:5,name:"Flush",score:sc(5,vals[0]*1e8+vals[1]*1e6+vals[2]*1e4+vals[3]*100+vals[4])};
  if (isStraight) return {rank:4,name:"Straight",score:sc(4,straightHi)};
  if (groups[0].c===3) return {rank:3,name:"Three of a Kind",score:sc(3,groups[0].v*1e4+groups[1].v*100+(groups[2]?.v||0))};
  if (groups[0].c===2 && groups[1]?.c===2) {
    const hi=Math.max(groups[0].v,groups[1].v), lo=Math.min(groups[0].v,groups[1].v);
    return {rank:2,name:"Two Pair",score:sc(2,hi*1e4+lo*100+(groups[2]?.v||0))};
  }
  if (groups[0].c===2) return {rank:1,name:"Pair",score:sc(1,groups[0].v*1e6+(groups[1]?.v||0)*1e4+(groups[2]?.v||0)*100+(groups[3]?.v||0))};
  return {rank:0,name:"High Card",score:sc(0,vals[0]*1e8+vals[1]*1e6+vals[2]*1e4+vals[3]*100+vals[4])};
}

function evalHand(cards) {
  if (cards.length < 5) return {rank:-1,name:"—",score:-1};
  const combos = combinations(cards, 5);
  let best = {rank:-1,score:-1};
  for (const c of combos) { const e = eval5(c); if (e.score > best.score) best = e; }
  return best;
}

// ═══════════════════════════════════════════════════════════════
// DRAW DETECTION
// ═══════════════════════════════════════════════════════════════

function detectDraws(hole, board) {
  const all = [...hole, ...board];
  const draws = [];
  const holeVals = hole.map(c => RV[c.rank]);
  const holeSuits = hole.map(c => c.suit);

  const sc = {};
  all.forEach(c => sc[c.suit] = (sc[c.suit]||0) + 1);
  for (const [suit, cnt] of Object.entries(sc)) {
    if (cnt === 4 && holeSuits.includes(suit)) {
      draws.push({ type:"flush draw", outs:9, desc:"flush draw" });
    }
  }

  const allVals = [...new Set(all.map(c => RV[c.rank]))];
  if (allVals.includes(14)) allVals.push(1);
  allVals.sort((a,b) => a-b);

  let bestStraightDraw = null;
  for (let start = 1; start <= 10; start++) {
    const window = [];
    for (let v = start; v < start + 5; v++) {
      if (allVals.includes(v)) window.push(v);
    }
    if (window.length === 4) {
      const holeContributes = holeVals.some(v => window.includes(v)) || (holeVals.includes(14) && window.includes(1));
      if (!holeContributes) continue;
      const full = [start,start+1,start+2,start+3,start+4];
      const missing = full.filter(v => !allVals.includes(v));
      if (missing.length === 1) {
        const m = missing[0];
        if (m === start || m === start+4) {
          if (!bestStraightDraw || bestStraightDraw.type !== "OESD") bestStraightDraw = { type:"OESD", outs:8, desc:"open-ended straight draw" };
        } else {
          if (!bestStraightDraw) bestStraightDraw = { type:"gutshot", outs:4, desc:"gutshot straight draw" };
        }
      }
    }
  }
  if (bestStraightDraw) draws.push(bestStraightDraw);
  return draws;
}

function totalDrawOuts(draws) {
  if (draws.length === 0) return 0;
  let total = 0;
  const hasFlush = draws.some(d => d.type === "flush draw");
  const hasStraight = draws.some(d => d.type === "OESD" || d.type === "gutshot");
  for (const d of draws) total += d.outs;
  if (hasFlush && hasStraight) total -= 2;
  return Math.max(total, 0);
}

function outsToEquity(outs, street) {
  if (street === "flop") return Math.min(outs * 4 - Math.max(outs - 8, 0), 80) / 100;
  return Math.min(outs * 2, 50) / 100;
}

function potOdds(pot, bet) {
  if (bet <= 0) return 0;
  return bet / (pot + bet);
}

// ═══════════════════════════════════════════════════════════════
// HAND CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

function classifyHand(hole, board) {
  const all = [...hole, ...board];
  const ev = evalHand(all);
  const boardVals = board.map(c => RV[c.rank]).sort((a,b) => b-a);
  const holeVals = hole.map(c => RV[c.rank]).sort((a,b) => b-a);
  const draws = detectDraws(hole, board);
  const drawOuts = totalDrawOuts(draws);

  let category = "trash", strength = 0, handDesc = ev.name;

  if (ev.rank >= 4) {
    const boardEv = board.length >= 5 ? evalHand(board) : { rank: -1 };
    if (boardEv.rank >= ev.rank) { category = "marginal"; strength = 0.25; handDesc = `${ev.name} (mostly on board)`; }
    else { category = "monster"; strength = 0.85 + ev.rank * 0.015; }
  } else if (ev.rank === 3) { category = "strong"; strength = 0.65; handDesc = "Three of a Kind"; }
  else if (ev.rank === 2) { category = "good"; strength = 0.55; handDesc = "Two Pair"; }
  else if (ev.rank === 1) {
    const allFreq = {};
    all.map(c=>RV[c.rank]).forEach(v => allFreq[v]=(allFreq[v]||0)+1);
    const pairVal = +Object.entries(allFreq).find(([,c]) => c===2)?.[0] || 0;
    const boardFreq = {};
    boardVals.forEach(v => boardFreq[v]=(boardFreq[v]||0)+1);
    const boardPaired = Object.values(boardFreq).some(c => c >= 2);

    if (boardPaired && !holeVals.includes(pairVal)) { category = "trash"; strength = 0.1; handDesc = "High card (board is paired)"; }
    else if (holeVals[0] === holeVals[1] && holeVals[0] > boardVals[0]) { category = "strong"; strength = 0.55; handDesc = `Overpair (${RANK_NAME[hole[0].rank]}s)`; }
    else if (holeVals[0] === holeVals[1]) {
      if (holeVals[0] >= boardVals[boardVals.length - 1]) { category = "marginal"; strength = 0.22; handDesc = "Pocket pair below top card"; }
      else { category = "weak"; strength = 0.15; handDesc = "Low pocket pair (underpair)"; }
    } else if (pairVal === boardVals[0] && holeVals.includes(pairVal)) {
      const kicker = holeVals.find(v => v !== pairVal) || 0;
      if (kicker >= 11) { category = "good"; strength = 0.45; handDesc = "Top pair, strong kicker"; }
      else if (kicker >= 8) { category = "marginal"; strength = 0.32; handDesc = "Top pair, medium kicker"; }
      else { category = "marginal"; strength = 0.28; handDesc = "Top pair, weak kicker"; }
    } else if (holeVals.includes(pairVal)) {
      if (boardVals.length >= 2 && pairVal === boardVals[1]) { category = "weak"; strength = 0.2; handDesc = "Middle pair"; }
      else { category = "weak"; strength = 0.14; handDesc = "Bottom pair"; }
    } else { category = "trash"; strength = 0.1; handDesc = "Board pair (no connection)"; }
  } else {
    if (holeVals[0] === 14) { category = "weak"; strength = 0.12; handDesc = "Ace high"; }
    else if (holeVals[0] >= 12) { category = "weak"; strength = 0.1; handDesc = "Overcards"; }
    else { category = "trash"; strength = 0.06; handDesc = "Nothing"; }
  }

  let drawBonus = 0;
  if (draws.some(d => d.type === "flush draw")) drawBonus += 0.12;
  if (draws.some(d => d.type === "OESD")) drawBonus += 0.10;
  if (draws.some(d => d.type === "gutshot")) drawBonus += 0.05;

  return { category, strength: Math.min(strength + drawBonus, 1), handDesc, draws, drawOuts, ev, holeVals, boardVals };
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO GENERATION
// ═══════════════════════════════════════════════════════════════

function generateScenario(positions) {
  const streetWeights = [{street:"preflop",w:0.3},{street:"flop",w:0.35},{street:"turn",w:0.25},{street:"river",w:0.1}];
  let r = Math.random(), cum = 0, street = "flop";
  for (const sw of streetWeights) { cum += sw.w; if (r < cum) { street = sw.street; break; } }

  const pos = positions[Math.floor(Math.random() * positions.length)];
  const opp = OPP_TYPES[Math.floor(Math.random() * OPP_TYPES.length)];
  const otherPos = positions.filter(p => p !== pos);
  const oppPos = otherPos[Math.floor(Math.random() * otherPos.length)] || "BTN";

  let playerHand, oppHand, board;
  let attempts = 0;
  while (attempts < 20) {
    attempts++;
    const deck = shuffle(createDeck());
    playerHand = [deck[0], deck[1]];
    oppHand = [deck[2], deck[3]];
    const boardCount = street === "flop" ? 3 : street === "turn" ? 4 : street === "river" ? 5 : 0;
    board = deck.slice(4, 4 + boardCount);
    if (boardCount === 0) break;
    if (boardCount >= 5) { const bEv = evalHand(board); if (bEv.rank >= 4) continue; }
    const bf = {}; board.forEach(c => bf[c.rank] = (bf[c.rank]||0)+1);
    if (Object.values(bf).some(v => v >= 3)) continue;
    if (boardCount === 3) { const sf = {}; board.forEach(c => sf[c.suit] = (sf[c.suit]||0)+1); if (Object.values(sf).some(v => v >= 3) && Math.random() < 0.7) continue; }
    break;
  }

  const usedSet = new Set([...playerHand, ...oppHand, ...board].map(c => c.rank+c.suit));
  const remaining = createDeck().filter(c => !usedSet.has(c.rank+c.suit));

  let preflopSit = "open";
  if (street === "preflop") {
    if (pos === "BB" || pos === "SB") preflopSit = Math.random() < 0.5 ? "vs_raise" : "open";
    else preflopSit = Math.random() < 0.25 ? "vs_raise" : "open";
  }

  let potSize, betSize, oppAction;
  if (street === "preflop") {
    if (preflopSit === "vs_raise") { potSize = 3.5; betSize = 2.5; oppAction = `${opp.emoji} ${oppPos} raises to 2.5bb`; }
    else { potSize = 1.5; betSize = 0; oppAction = ""; }
  } else {
    potSize = 4 + Math.floor(Math.random() * 12);
    const oppBets = Math.random() < 0.5;
    if (oppBets) {
      const sizing = [0.33,0.5,0.66,0.75][Math.floor(Math.random()*4)];
      betSize = Math.max(2, Math.round(potSize * sizing));
      potSize += betSize;
      oppAction = `${opp.emoji} bets ${betSize}bb`;
    } else { betSize = 0; oppAction = `${opp.emoji} checks`; }
  }

  return { street, pos, opp, oppPos, playerHand, oppHand, board, remaining, potSize, betSize, oppAction, preflopSit };
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE BUILDER
// ═══════════════════════════════════════════════════════════════

function buildNarrative(best, action, info, opp, street, pot, bet, drawOuts, draws, pos, oppPos, board) {
  const oppName = opp.name;
  const isRiver = street === "river";
  const facingBet = bet > 0;
  const boardText = board.map(c => cardStr(c)).join(" ");
  const drawText = draws.map(d => d.desc).join(" and ");

  const oppContext = opp.id === "tight"
    ? `${oppName} opponents rarely bluff — when they bet, they usually have a real hand.`
    : opp.id === "aggro"
    ? `${oppName} opponents bet frequently and bluff often, so their bets are less reliable.`
    : `${oppName} opponents play standard ranges — their bets usually mean something, but they occasionally bluff.`;

  let narrative = "";
  if (facingBet) {
    const potOddsVal = Math.round(bet / (pot + bet) * 100);
    const needText = `You need ${potOddsVal}% equity to justify a call (pot is ${pot}bb, bet is ${bet}bb).`;
    if (best === "Fold") {
      if (drawOuts > 0 && !isRiver) { const eq = Math.round(outsToEquity(drawOuts, street) * 100); narrative = `You have ${info.handDesc} with ${drawText} (${drawOuts} outs ≈ ${eq}% chance to improve). ${needText} The math doesn't quite work — you'd need more outs or better pot odds. ${oppContext} Fold is correct here.`; }
      else if (isRiver) { narrative = `On the river with ${info.handDesc} on [${boardText}]. No more cards to come. ${oppContext} At this strength, you're not beating enough of their betting range. Fold.`; }
      else { narrative = `You have ${info.handDesc} — a weak holding with no meaningful draw. ${needText} ${oppContext} Fold and save chips for a better spot.`; }
    } else if (best === "Call") {
      if (drawOuts >= 6 && !isRiver) { const eq = Math.round(outsToEquity(drawOuts, street) * 100); narrative = `You have ${info.handDesc} plus ${drawText} — ${drawOuts} outs giving roughly ${eq}% equity. ${needText} Your equity exceeds the price, making this a profitable call. ${oppContext}`; }
      else if (info.category === "marginal" || info.category === "good") { narrative = `${info.handDesc} is medium-strength on [${boardText}]. Not strong enough to raise for value, but beats enough of the opponent's range to call. ${oppContext}${opp.id==="aggro"?" Against this aggressive opponent, calling is especially profitable.":""}`; }
      else if (opp.id === "aggro") { narrative = `Normally ${info.handDesc} would be too weak to call, but ${oppName} opponents bluff frequently enough that your hand acts as a bluff-catcher. ${needText}`; }
      else { narrative = `${info.handDesc} is sufficient to call given the pot odds. ${needText} ${oppContext}`; }
    } else if (best === "Raise") {
      narrative = `You have ${info.handDesc} — a strong hand on [${boardText}]. Raising extracts more value from weaker hands. ${oppContext}${opp.id==="aggro"?" An aggressive opponent is likely to call with worse, making a raise especially profitable.":""}`;
    }
  } else {
    if (best === "Bet") {
      if (draws.length > 0 && !["good","strong","monster"].includes(info.category)) { narrative = `Opponent checked. You have ${info.handDesc} with ${drawText}. Good semi-bluff spot — your bet might take the pot immediately, and if called, you have ${drawOuts} outs to improve. ${oppContext}`; }
      else { narrative = `Opponent checked. You have ${info.handDesc} on [${boardText}] — strong enough to bet for value. Checking would leave money on the table. ${oppContext}`; }
    } else if (best === "Check") {
      narrative = `Opponent checked. You have ${info.handDesc} on [${boardText}]. Not strong enough to bet for value, not a good bluff candidate. ${isRiver?"On the river, c":"C"}hecking lets you see ${isRiver?"a showdown":"the next card"} for free. ${oppContext}`;
    }
  }
  return narrative;
}

// ═══════════════════════════════════════════════════════════════
// EVALUATORS
// ═══════════════════════════════════════════════════════════════

function evaluatePreflop(action, notation, pos, situation) {
  let best, acceptable, explanation;
  if (situation === "open") {
    const range = OPEN[pos];
    if (!range) return { rating:"green", best:action, acceptable:[action], explanation:"", evDiff:0 };
    if (range.has(notation)) { best = "Raise"; acceptable = ["Raise"]; explanation = `${notation} is within the ${pos} opening range. This hand has enough equity and playability to raise. Folding gives up a profitable open.`; }
    else { best = "Fold"; acceptable = ["Fold"]; explanation = `${notation} is outside the ${pos} opening range. There are still ${POS_6.indexOf("BB") - POS_6.indexOf(pos)} players left to act who could have strong hands.`; }
  } else {
    const ranges = pos === "BB" ? BB_VS : pos === "SB" ? SB_VS : null;
    if (ranges) {
      if (ranges.threebet.has(notation)) { best = "3-Bet"; acceptable = ["3-Bet"]; explanation = `${notation} is premium. Against a raise, 3-betting builds the pot with a strong equity advantage.`; }
      else if (ranges.call.has(notation)) { best = "Call"; acceptable = ["Call"]; explanation = `${notation} is strong enough to defend from ${pos}. Not premium enough to 3-bet — it plays better in smaller pots.`; }
      else { best = "Fold"; acceptable = ["Fold"]; explanation = `${notation} doesn't have enough equity to defend from ${pos} against a raise.`; }
    } else {
      if (["AA","KK","QQ","JJ","AKs","AKo"].includes(notation)) { best = "3-Bet"; acceptable = ["3-Bet","Call"]; explanation = `${notation} is premium. 3-betting preferred to build the pot and take initiative.`; }
      else if (OPEN[pos]?.has(notation)) { best = "Call"; acceptable = ["Call","Fold"]; explanation = `${notation} is borderline against a raise from ${pos}. Calling is acceptable, folding isn't a mistake.`; }
      else { best = "Fold"; acceptable = ["Fold"]; explanation = `${notation} is too weak against a raise from ${pos}.`; }
    }
  }
  const rating = action === best ? "green" : acceptable.includes(action) ? "yellow" : "red";
  const evDiff = rating === "red" ? (best==="Fold"&&action!=="Fold" ? -2.5 : -1.5) : rating === "yellow" ? -0.3 : 0;
  return { rating, best, acceptable, explanation, evDiff };
}

function evaluatePostflop(action, hole, board, pot, bet, opp, street, remaining) {
  const info = classifyHand(hole, board);
  const drawOuts = info.drawOuts;
  const equity = outsToEquity(drawOuts, street);
  const oddsNeeded = potOdds(pot, bet);
  const isRiver = street === "river";
  let best, acceptable;

  if (bet > 0) {
    if (info.strength >= 0.55) { best = "Raise"; acceptable = ["Raise","Call"]; }
    else if (info.strength >= 0.30) { best = "Call"; acceptable = ["Call"]; }
    else if (!isRiver && drawOuts >= 8 && (info.strength + equity * 0.6) >= oddsNeeded) { best = "Call"; acceptable = ["Call"]; }
    else if (!isRiver && drawOuts >= 4 && (info.strength + equity * 0.6) >= oddsNeeded) { best = "Call"; acceptable = ["Call","Fold"]; }
    else if (opp.id === "aggro" && isRiver && info.strength >= 0.18) { best = "Call"; acceptable = ["Call","Fold"]; }
    else { best = "Fold"; acceptable = ["Fold"]; }
  } else {
    if (info.strength >= 0.40) { best = "Bet"; acceptable = ["Bet","Check"]; }
    else if (!isRiver && info.draws.length > 0 && drawOuts >= 6) { best = "Bet"; acceptable = ["Bet","Check"]; }
    else { best = "Check"; acceptable = ["Check"]; }
  }

  const rating = action === best ? "green" : acceptable.includes(action) ? "yellow" : "red";
  let evDiff = 0;
  if (rating === "red") {
    if (best === "Fold" && action !== "Fold") evDiff = -(bet || Math.round(pot * 0.5));
    else if (action === "Fold" && best !== "Fold") evDiff = -Math.round(pot * 0.15);
    else evDiff = -Math.round(pot * 0.1);
  } else if (rating === "yellow") evDiff = -Math.round(pot * 0.03);

  const explanation = buildNarrative(best, action, info, opp, street, pot, bet, drawOuts, info.draws, "", "", board);
  return { rating, best, acceptable, explanation, evDiff, info };
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

const SK = "poker-trainer-data";
function loadLocal() { try { const r = localStorage.getItem(SK); return r ? JSON.parse(r) : null; } catch { return null; } }
function saveLocal(d) { try { localStorage.setItem(SK, JSON.stringify(d)); } catch {} }

// ═══════════════════════════════════════════════════════════════
// NARRATIVE RENDERER — highlights key terms in gold
// ═══════════════════════════════════════════════════════════════

function NarrativeText({ text }) {
  const patterns = [
    /(\d+\s*outs?\b)/gi,
    /(\d+%\s*(?:equity|chance))/gi,
    /(pot is \d+[\d.]*bb|bet is \d+[\d.]*bb|\d+%\s*equity)/gi,
    /(flush draw|straight draw|open-ended|gutshot|OESD)/gi,
    /(overpair|top pair|two pair|three of a kind|full house|flush|straight|bottom pair|middle pair|underpair)/gi,
    /(semi-bluff|bluff-catcher|profitable call|value)/gi,
    /\b(Fold|Call|Raise|3-Bet|Check|Bet)\b/g,
  ];

  let parts = [{ text, hl: false }];
  for (const re of patterns) {
    const next = [];
    for (const p of parts) {
      if (p.hl) { next.push(p); continue; }
      let last = 0;
      for (const m of [...p.text.matchAll(re)]) {
        if (m.index > last) next.push({ text: p.text.slice(last, m.index), hl: false });
        next.push({ text: m[0], hl: true });
        last = m.index + m[0].length;
      }
      if (last < p.text.length) next.push({ text: p.text.slice(last), hl: false });
    }
    parts = next;
  }

  return <>{parts.map((p, i) => p.hl
    ? <span key={i} style={{ color: P.gold, fontWeight: 700 }}>{p.text}</span>
    : <span key={i}>{p.text}</span>
  )}</>;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PokerTrainer() {
  const [screen, setScreen] = useState("menu");
  const [tableSize, setTableSize] = useState(6);
  const [scenario, setScenario] = useState(null);
  const [phase, setPhase] = useState("action");
  const [feedback, setFeedback] = useState(null);
  const [log, setLog] = useState([]);
  const [stack, setStack] = useState(100);
  const [handNum, setHandNum] = useState(0);
  const [copied, setCopied] = useState(false);
  const [lifetime, setLifetime] = useState(() => loadLocal() || { totalHands:0, greens:0, yellows:0, reds:0, totalEv:0, sessions:0 });

  const positions = tableSize === 6 ? POS_6 : POS_3;

  const persistSession = useCallback((sessionLog) => {
    if (sessionLog.length === 0) return;
    setLifetime(prev => {
      const m = {
        totalHands: prev.totalHands + sessionLog.length,
        greens: prev.greens + sessionLog.filter(e=>e.rating==="green").length,
        yellows: prev.yellows + sessionLog.filter(e=>e.rating==="yellow").length,
        reds: prev.reds + sessionLog.filter(e=>e.rating==="red").length,
        totalEv: prev.totalEv + sessionLog.reduce((s,e)=>s+e.ev, 0),
        sessions: prev.sessions + 1,
      };
      saveLocal(m);
      return m;
    });
  }, []);

  const startSession = useCallback(() => {
    if (log.length > 0) persistSession(log);
    setLog([]); setStack(100); setHandNum(1);
    setScenario(generateScenario(positions));
    setPhase("action"); setFeedback(null); setScreen("game");
  }, [positions, log, persistSession]);

  const nextScenario = useCallback(() => {
    setHandNum(h => h + 1);
    setScenario(generateScenario(positions));
    setPhase("action"); setFeedback(null);
  }, [positions]);

  const handleAction = useCallback((action) => {
    if (!scenario) return;
    let ev;
    if (scenario.street === "preflop") {
      const n = handNotation(scenario.playerHand[0], scenario.playerHand[1]);
      ev = evaluatePreflop(action, n, scenario.pos, scenario.preflopSit);
    } else {
      ev = evaluatePostflop(action, scenario.playerHand, scenario.board, scenario.potSize, scenario.betSize, scenario.opp, scenario.street, scenario.remaining);
    }
    setFeedback(ev); setPhase("feedback"); setStack(s => s + ev.evDiff);
    const n = handNotation(scenario.playerHand[0], scenario.playerHand[1]);
    setLog(prev => [...prev, {
      hand:handNum, pos:scenario.pos, cards:n,
      board:scenario.board.length>0?scenario.board.map(cardStr).join(" "):"—",
      pot:scenario.potSize.toFixed(1), bet:scenario.betSize>0?scenario.betSize.toFixed(1):"—",
      street:STREET_NAMES[scenario.street],
      situation:scenario.street==="preflop"?scenario.preflopSit:(scenario.betSize>0?"vs bet":"checked to"),
      opp:scenario.opp.name, action, correct:ev.best, rating:ev.rating, ev:ev.evDiff,
    }]);
  }, [scenario, handNum]);

  const getActions = () => {
    if (!scenario) return [];
    if (scenario.street === "preflop") return scenario.preflopSit === "vs_raise" ? ["Fold","Call","3-Bet"] : ["Fold","Raise"];
    return scenario.betSize > 0 ? ["Fold","Call","Raise"] : ["Check","Bet"];
  };

  const getStats = useCallback(() => {
    if (log.length === 0) return null;
    const total = log.length, greens = log.filter(e=>e.rating==="green").length, yellows = log.filter(e=>e.rating==="yellow").length, reds = log.filter(e=>e.rating==="red").length;
    const totalEv = log.reduce((s,e)=>s+e.ev, 0);
    const byStreet={}, byPos={}, bySit={}, handMistakes={}, patterns={};
    for (const e of log) {
      if(!byStreet[e.street])byStreet[e.street]={total:0,correct:0,mistakes:0,ev:0};
      byStreet[e.street].total++; if(e.rating==="green")byStreet[e.street].correct++; if(e.rating==="red")byStreet[e.street].mistakes++; byStreet[e.street].ev+=e.ev;
      if(!byPos[e.pos])byPos[e.pos]={total:0,mistakes:0}; byPos[e.pos].total++; if(e.rating==="red")byPos[e.pos].mistakes++;
      const sk=`${e.street} ${e.situation}`; if(!bySit[sk])bySit[sk]={total:0,mistakes:0}; bySit[sk].total++; if(e.rating==="red")bySit[sk].mistakes++;
      if(e.rating==="red"){handMistakes[e.cards]=(handMistakes[e.cards]||0)+1; const p=`Should ${e.correct}, chose ${e.action}`; patterns[p]=(patterns[p]||0)+1;}
    }
    return { total,greens,yellows,reds,totalEv,byStreet,byPos,bySit,handMistakes,patterns };
  }, [log]);

  const exportSession = useCallback(() => {
    if (log.length === 0) return;
    let md = "| # | Pos | Hand | Board | Pot | Bet | Street | Sit | Opp | Action | Correct | Grade | EV± |\n|---|-----|------|-------|-----|-----|--------|-----|-----|--------|---------|-------|-----|\n";
    for (const e of log) {
      const icon = e.rating==="green"?"🟢":e.rating==="yellow"?"🟡":"🔴";
      md += `| ${e.hand} | ${e.pos} | ${e.cards} | ${e.board} | ${e.pot} | ${e.bet} | ${e.street} | ${e.situation} | ${e.opp} | ${e.action} | ${e.correct} | ${icon} | ${e.ev>0?"+":""}${e.ev.toFixed(1)} |\n`;
    }
    navigator.clipboard.writeText(md).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }, [log]);

  // ─── CARD ──────────────────────────
  const Card = ({ card, small, board }) => {
    const isRed = card.suit === "♥" || card.suit === "♦";
    const col = isRed ? P.red : P.navy;
    const rank = RANK_DISPLAY[card.rank] || card.rank;

    if (board) {
      // Board cards: compact, on navy background
      return (
        <div style={{
          width: 52, height: 70, borderRadius: 5,
          background: P.cream, border: "1.5px solid #d0c8b8",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          fontFamily:"Helvetica, Arial, sans-serif",
        }}>
          <span style={{ fontSize:24, fontWeight:800, color:col, lineHeight:1 }}>{rank}</span>
          <span style={{ fontSize:15, color:col, lineHeight:1, marginTop:2 }}>{card.suit}</span>
        </div>
      );
    }

    // Player cards: large, centered rank + suit only
    const w = small ? 80 : 110;
    const h = small ? 116 : 156;
    return (
      <div style={{
        width:w, height:h, borderRadius:8, position:"relative",
        background: P.cream,
        border: "2px solid #d0c8b8",
        fontFamily:"Helvetica, Arial, sans-serif",
        boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        gap: 2,
      }}>
        <div style={{
          fontSize: small?44:64, fontWeight:800, color:col, lineHeight:1,
        }}>{rank}</div>
        <div style={{
          fontSize: small?22:30, color:col, lineHeight:1,
        }}>{card.suit}</div>
      </div>
    );
  };

  const FaceDown = () => (
    <div style={{
      width:44, height:60, borderRadius:4,
      background: `repeating-linear-gradient(45deg, ${P.navy}, ${P.navy} 2px, ${P.navyLight} 2px, ${P.navyLight} 4px)`,
      border:`1.5px solid ${P.navyLight}`,
    }}/>
  );

  const font = "Helvetica, Arial, sans-serif";

  // ═════════════ MENU ═════════════
  if (screen === "menu") {
    return (
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:P.bg, fontFamily:font, padding:20 }}>
        <div style={{ maxWidth:360, width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:11, letterSpacing:"0.25em", color:P.textLight, textTransform:"uppercase", marginBottom:6 }}>Poker</div>
          <h1 style={{ fontSize:32, fontWeight:700, margin:"0 0 4px", color:P.text, letterSpacing:"-0.01em" }}>Trainer</h1>
          <div style={{ width:40, height:2, background:P.gold, margin:"10px auto 20px" }}/>

          <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:24 }}>
            {[3,6].map(n => (
              <button key={n} onClick={() => setTableSize(n)} style={{
                padding:"10px 26px", borderRadius:20, cursor:"pointer",
                border: tableSize===n ? `2px solid ${P.gold}` : `2px solid #c8c0b0`,
                background: tableSize===n ? `${P.gold}18` : "transparent",
                color: tableSize===n ? P.goldDark : P.textMid,
                fontWeight:600, fontSize:14, fontFamily:font,
              }}>{n}-max</button>
            ))}
          </div>

          <button onClick={startSession} style={{
            padding:"14px 48px", borderRadius:24, border:"none", cursor:"pointer",
            background: P.gold, color:P.white, fontWeight:700, fontSize:15,
            fontFamily:font, letterSpacing:"0.02em",
          }}>DEAL</button>

          {log.length > 0 && (
            <button onClick={() => { persistSession(log); setScreen("stats"); }} style={{
              display:"block", margin:"14px auto 0", padding:"8px 20px", borderRadius:16,
              border:`1.5px solid #c8c0b0`, background:"transparent",
              color:P.textMid, fontSize:12, cursor:"pointer", fontFamily:font,
            }}>Session Stats ({log.length}) →</button>
          )}

          {lifetime.totalHands > 0 && (
            <div style={{ marginTop:24, fontSize:12, color:P.textLight }}>
              {lifetime.totalHands} hands · {Math.round(lifetime.greens/lifetime.totalHands*100)}% accuracy · {lifetime.sessions} sessions
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═════════════ STATS ═════════════
  if (screen === "stats") {
    const stats = getStats();
    const panel = { background:P.cream, borderRadius:10, padding:16, marginBottom:10, border:`1px solid #d8d0c0` };
    const lbl = { fontSize:10, fontWeight:600, color:P.textLight, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 };
    return (
      <div style={{ minHeight:"100vh", background:P.bg, fontFamily:font, padding:16, display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{ width:"100%", maxWidth:480 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <button onClick={() => setScreen("game")} style={{ background:"none", border:"none", color:P.textMid, fontSize:13, cursor:"pointer", fontFamily:font }}>← Back</button>
            <span style={{ fontSize:15, fontWeight:700, color:P.text }}>Session Report</span>
            <div style={{width:40}}/>
          </div>
          {!stats ? <p style={{color:P.textMid,textAlign:"center"}}>No data yet.</p> : (<>
            <div style={panel}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                {[
                  {l:"Hands",v:stats.total,c:P.text},
                  {l:"Accuracy",v:`${Math.round(stats.greens/stats.total*100)}%`,c:P.green},
                  {l:"EV",v:`${stats.totalEv>=0?"+":""}${stats.totalEv.toFixed(1)}`,c:stats.totalEv>=0?P.green:P.red},
                  {l:"Stack",v:stack.toFixed(1),c:stack>=100?P.green:P.red},
                ].map((d,i)=>(<div key={i} style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:d.c}}>{d.v}</div><div style={{...lbl,margin:0}}>{d.l}</div></div>))}
              </div>
              <div style={{ display:"flex", gap:2, height:3, borderRadius:2, overflow:"hidden", background:"#e0d8c8" }}>
                <div style={{width:`${stats.greens/stats.total*100}%`,background:P.green}}/>
                <div style={{width:`${stats.yellows/stats.total*100}%`,background:P.gold}}/>
                <div style={{width:`${stats.reds/stats.total*100}%`,background:P.red}}/>
              </div>
            </div>

            <div style={panel}><h3 style={lbl}>By Street</h3>
              {Object.entries(stats.byStreet).map(([st,d])=>(<div key={st} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e8e0d4",fontSize:13}}><span style={{color:P.text}}>{st}</span><div style={{display:"flex",gap:14}}><span style={{color:P.textLight}}>{d.total}</span>{d.mistakes>0&&<span style={{color:P.red}}>{d.mistakes} err</span>}<span style={{color:d.ev>=0?P.green:P.red,minWidth:45,textAlign:"right"}}>{d.ev>=0?"+":""}{d.ev.toFixed(1)}</span></div></div>))}
            </div>

            {Object.values(stats.byPos).some(d=>d.mistakes>0) && (
              <div style={panel}><h3 style={lbl}>Weak Positions</h3>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {Object.entries(stats.byPos).filter(([,d])=>d.mistakes>0).sort((a,b)=>b[1].mistakes-a[1].mistakes).map(([p,d])=>(
                    <span key={p} style={{background:`${P.red}16`,color:P.red,padding:"4px 10px",borderRadius:12,fontSize:12,fontWeight:600}}>{p} {d.mistakes}×</span>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(stats.patterns).length > 0 && (
              <div style={panel}><h3 style={lbl}>Error Patterns</h3>
                {Object.entries(stats.patterns).sort((a,b)=>b[1]-a[1]).map(([pat,cnt])=>(
                  <div key={pat} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e8e0d4",fontSize:13}}><span style={{color:P.text}}>{pat}</span><span style={{color:P.red,fontWeight:700}}>{cnt}×</span></div>
                ))}
              </div>
            )}

            <div style={{display:"flex",gap:8}}>
              <button onClick={exportSession} style={{flex:1,padding:12,borderRadius:20,border:`1.5px solid #c8c0b0`,cursor:"pointer",background:copied?`${P.green}16`:P.cream,color:copied?P.green:P.text,fontWeight:600,fontSize:13,fontFamily:font}}>{copied?"✓ Copied":"📋 Copy"}</button>
              <button onClick={()=>{setScreen("game");nextScenario();}} style={{flex:1,padding:12,borderRadius:20,border:"none",cursor:"pointer",background:P.gold,color:P.white,fontWeight:700,fontSize:13,fontFamily:font}}>Continue →</button>
            </div>
          </>)}
        </div>
      </div>
    );
  }

  // ═════════════ GAME ═════════════
  if (!scenario) return null;

  // Seat positions around board — flat row, labeled
  const seatOrder = (() => {
    const n = positions.length;
    const pi = positions.indexOf(scenario.pos);
    const others = [];
    for (let i = 1; i < n; i++) {
      const idx = (pi + i) % n;
      others.push(positions[idx]);
    }
    return others;
  })();

  const actions = getActions();

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:font, padding:"14px 18px", display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ width:"100%", maxWidth:460 }}>

        {/* ── TOP BAR ── */}
        <div style={{
          background:P.cream, borderRadius:12, padding:"12px 16px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:16, border:"1px solid #d8d0c0",
        }}>
          <button onClick={() => setScreen("menu")} style={{ background:"none", border:"none", color:P.textMid, fontSize:13, cursor:"pointer", fontFamily:font, padding:0 }}>← Menu</button>
          <div style={{ display:"flex", gap:16, fontSize:14, fontWeight:600 }}>
            <span style={{ color:P.textLight }}>#{handNum}</span>
            <span style={{ color:stack>=100?P.green:P.red }}>{stack.toFixed(1)} bb</span>
          </div>
          <button onClick={() => { persistSession(log); setScreen("stats"); }} style={{ background:"none", border:"none", color:P.textMid, fontSize:13, cursor:"pointer", fontFamily:font, padding:0 }}>Stats →</button>
        </div>

        {/* ── TABLE / BOARD AREA ── */}
        <div style={{
          position:"relative",
          background:P.boardBg,
          borderRadius:32,
          padding:"40px 20px 32px",
          marginBottom:16,
          minHeight:180,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        }}>
          {/* Seat circles */}
          <div style={{
            display:"flex", justifyContent:"space-around", width:"100%",
            position:"absolute", top:-16, left:0, right:0, padding:"0 24px",
          }}>
            {seatOrder.map(pos => {
              const isOpp = pos === scenario.oppPos;
              return (
                <div key={pos} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <div style={{
                    width:34, height:34, borderRadius:17,
                    background: isOpp ? scenario.opp.color : P.navyLight,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize: isOpp ? 14 : 10, color:P.cream, fontWeight:700,
                    border:`2.5px solid ${isOpp ? scenario.opp.color : "#4a6080"}`,
                  }}>{isOpp ? scenario.opp.emoji : ""}</div>
                  <span style={{ fontSize:10, fontWeight:700, color: isOpp ? P.gold : "#7a90a8", marginTop:3 }}>{pos}</span>
                </div>
              );
            })}
          </div>

          {/* Board cards */}
          {scenario.board.length > 0 ? (
            <div style={{ display:"flex", gap:4, marginTop:8 }}>
              {scenario.board.map((c,i) => <Card key={i} card={c} board/>)}
            </div>
          ) : (
            <div style={{ color:"#6a80a0", fontSize:13, fontWeight:600, letterSpacing:"0.05em" }}>PREFLOP</div>
          )}

          {/* Pot info inside table */}
          <div style={{ marginTop:12, textAlign:"center" }}>
            <span style={{ fontSize:17, fontWeight:700, color:P.gold }}>{scenario.potSize.toFixed(1)}bb</span>
            <span style={{ fontSize:11, color:"#7a90a8", marginLeft:6, textTransform:"uppercase" }}>{STREET_NAMES[scenario.street]}</span>
          </div>

          {/* Player seat indicator */}
          <div style={{
            position:"absolute", bottom:-16, left:"50%", transform:"translateX(-50%)",
            display:"flex", flexDirection:"column", alignItems:"center",
          }}>
            <div style={{
              width:34, height:34, borderRadius:17,
              background:P.gold, display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:10, color:P.white, fontWeight:800,
              border:`2.5px solid ${P.goldDark}`,
            }}>YOU</div>
            <span style={{ fontSize:10, fontWeight:700, color:P.gold, marginTop:3 }}>{scenario.pos} ★</span>
          </div>
        </div>

        {/* ── NARRATIVE / SITUATION BLOCK ── */}
        <div style={{
          background:P.cream, borderRadius:12, padding:"16px 18px",
          marginBottom:14, border:"1px solid #d8d0c0",
          fontSize:14, lineHeight:1.75, color:P.text,
          fontFamily:"Helvetica, Arial, sans-serif",
        }}>
          {phase === "action" ? (
            <div>
              {(() => {
                // Build a cohesive situational narrative
                const posName = scenario.pos;
                const oppEmoji = scenario.opp.emoji;
                const oppName = scenario.opp.name;
                const oppDesc = scenario.opp.id === "tight"
                  ? "who plays few hands and only bets with strong holdings"
                  : scenario.opp.id === "aggro"
                  ? "who bets wide and bluffs often"
                  : "who plays a balanced, standard game";
                const oppPosName = scenario.oppPos;

                let handInfo = "";
                if (scenario.board.length > 0) {
                  const info = classifyHand(scenario.playerHand, scenario.board);
                  const drawText = info.draws.length > 0 ? `, plus ${info.draws.map(d => d.desc).join(" and ")}` : "";
                  handInfo = ` You're holding ${info.handDesc.toLowerCase()}${drawText}.`;
                } else {
                  const n = handNotation(scenario.playerHand[0], scenario.playerHand[1]);
                  handInfo = ` You're holding ${n}.`;
                }

                if (scenario.street === "preflop") {
                  if (scenario.preflopSit === "vs_raise") {
                    return <span>You're at <span style={{color:P.gold, fontWeight:700}}>{posName}</span>. A <span style={{color:scenario.opp.color, fontWeight:700}}>{oppEmoji} {oppName}</span> player {oppDesc} raises to <span style={{color:P.gold, fontWeight:700}}>2.5bb</span> from {oppPosName}.{handInfo}</span>;
                  } else {
                    return <span>You're at <span style={{color:P.gold, fontWeight:700}}>{posName}</span>, first to act. A <span style={{color:scenario.opp.color, fontWeight:700}}>{oppEmoji} {oppName}</span> player {oppDesc} is sitting at {oppPosName}.{handInfo}</span>;
                  }
                } else {
                  const streetName = STREET_NAMES[scenario.street].toLowerCase();
                  if (scenario.betSize > 0) {
                    return <span>It's the <span style={{color:P.gold, fontWeight:700}}>{streetName}</span>. You're at <span style={{color:P.gold, fontWeight:700}}>{posName}</span> and a <span style={{color:scenario.opp.color, fontWeight:700}}>{oppEmoji} {oppName}</span> player {oppDesc} at {oppPosName} bets <span style={{color:P.gold, fontWeight:700}}>{scenario.betSize}bb</span> into a <span style={{color:P.gold, fontWeight:700}}>{scenario.potSize.toFixed(1)}bb</span> pot.{handInfo}</span>;
                  } else {
                    return <span>It's the <span style={{color:P.gold, fontWeight:700}}>{streetName}</span>. You're at <span style={{color:P.gold, fontWeight:700}}>{posName}</span>. A <span style={{color:scenario.opp.color, fontWeight:700}}>{oppEmoji} {oppName}</span> player {oppDesc} at {oppPosName} checks to you. Pot is <span style={{color:P.gold, fontWeight:700}}>{scenario.potSize.toFixed(1)}bb</span>.{handInfo}</span>;
                  }
                }
              })()}
            </div>
          ) : (
            <>
              {/* Feedback */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{
                  display:"inline-block", padding:"4px 12px", borderRadius:4,
                  background: feedback.rating==="green"?P.green : feedback.rating==="yellow"?P.gold : P.red,
                  color:P.white, fontWeight:700, fontSize:13,
                }}>
                  {feedback.rating==="green"?"✓ Correct":feedback.rating==="yellow"?"≈ Acceptable":"✗ Mistake"}
                </span>
                {feedback.evDiff !== 0 && (
                  <span style={{ fontWeight:700, fontSize:14, color:feedback.evDiff>=0?P.green:P.red }}>
                    {feedback.evDiff>=0?"+":""}{feedback.evDiff.toFixed(1)} EV
                  </span>
                )}
              </div>
              {feedback.rating !== "green" && (
                <div style={{ fontSize:14, color:P.gold, fontWeight:600, marginBottom:8 }}>Best: {feedback.best}</div>
              )}
              <div><NarrativeText text={feedback.explanation}/></div>
            </>
          )}
        </div>

        {/* ── PLAYER HAND + ACTIONS ── */}
        <div style={{
          display:"flex", alignItems:"stretch", gap:14,
        }}>
          {/* Cards — left side */}
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            {scenario.playerHand.map((c,i) => <Card key={i} card={c}/>)}
          </div>

          {/* Actions — right side, stacked vertically */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8, justifyContent:"center" }}>
            {phase === "action" ? actions.map(a => {
              const isPassive = a === "Fold" || a === "Check";
              return (
                <button key={a} onClick={() => handleAction(a)} style={{
                  padding:"14px 8px", borderRadius:22, cursor:"pointer",
                  border: isPassive ? `2px solid #c8c0b0` : "2px solid transparent",
                  background: isPassive ? "transparent" : P.gold,
                  color: isPassive ? P.textMid : P.white,
                  fontWeight:700, fontSize:15, fontFamily:font,
                  letterSpacing:"0.02em",
                  transition:"transform 0.1s",
                }}
                  onMouseDown={e => e.currentTarget.style.transform="scale(0.96)"}
                  onMouseUp={e => e.currentTarget.style.transform="scale(1)"}
                  onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
                >{a.toUpperCase()}</button>
              );
            }) : (
              <button onClick={nextScenario} style={{
                padding:"14px 8px", borderRadius:20, cursor:"pointer",
                border:`2px solid #c8c0b0`, background:"transparent",
                color:P.text, fontWeight:700, fontSize:14, fontFamily:font,
              }}>NEXT HAND →</button>
            )}
          </div>
        </div>

      </div>

      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>
    </div>
  );
}
