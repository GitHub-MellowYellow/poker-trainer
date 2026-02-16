import { useState, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SUITS = ["♠","♥","♦","♣"];
const SUIT_COLORS = {"♠":"#c8d6e5","♥":"#ee5a24","♦":"#4a90d9","♣":"#2ecc71"};
const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
const RV = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,T:10,J:11,Q:12,K:13,A:14};
const RANK_DISPLAY = {T:"10",J:"J",Q:"Q",K:"K",A:"A"};
const RANK_NAME = {2:"deuce",3:"three",4:"four",5:"five",6:"six",7:"seven",8:"eight",9:"nine",T:"ten",J:"jack",Q:"queen",K:"king",A:"ace"};

const POS_6 = ["UTG","MP","CO","BTN","SB","BB"];
const POS_3 = ["BTN","SB","BB"];

const OPP_TYPES = [
  { id:"tight", name:"Careful", emoji:"🛡️", color:"#3b82f6", desc:"Plays few hands, only bets strong" },
  { id:"neutral", name:"Regular", emoji:"⚖️", color:"#a3a3a3", desc:"Balanced, standard play" },
  { id:"aggro", name:"Aggro", emoji:"🔥", color:"#ef4444", desc:"Bets wide, bluffs often" },
];

const STREET_NAMES = { preflop:"Preflop", flop:"Flop", turn:"Turn", river:"River" };

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
// DECK UTILITIES
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
function cardName(c) { return (RANK_NAME[c.rank] || c.rank) + c.suit; }

function handNotation(c1, c2) {
  const v1 = RV[c1.rank], v2 = RV[c2.rank];
  const hi = v1 >= v2 ? c1 : c2, lo = v1 >= v2 ? c2 : c1;
  if (hi.rank === lo.rank) return hi.rank + lo.rank;
  return hi.rank + lo.rank + (hi.suit === lo.suit ? "s" : "o");
}

function boardDescription(board) {
  const vals = board.map(c => RV[c.rank]).sort((a,b) => b-a);
  const suits = board.map(c => c.suit);
  const suitCount = {};
  suits.forEach(s => suitCount[s] = (suitCount[s]||0) + 1);
  const maxSuit = Math.max(...Object.values(suitCount));
  const highCard = RANK_NAME[board.find(c => RV[c.rank] === vals[0])?.rank] || "";

  const parts = [];
  if (vals[0] >= 12) parts.push(`${highCard}-high board`);
  else parts.push("low board");

  if (maxSuit >= 3) parts.push("flush-possible");
  const unique = [...new Set(vals)].sort((a,b) => a-b);
  let connected = false;
  for (let i = 0; i < unique.length-1; i++) {
    if (unique[i+1] - unique[i] === 1) { connected = true; break; }
  }
  if (connected) parts.push("connected");

  const freq = {};
  vals.forEach(v => freq[v] = (freq[v]||0)+1);
  if (Object.values(freq).some(c => c >= 2)) parts.push("paired");

  return parts.join(", ");
}

// ═══════════════════════════════════════════════════════════════
// HAND EVALUATOR
// ═══════════════════════════════════════════════════════════════

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map(c => [first, ...c]),
    ...combinations(rest, k)
  ];
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
// DRAW DETECTION (targeted — only real draws)
// ═══════════════════════════════════════════════════════════════

function detectDraws(hole, board) {
  const all = [...hole, ...board];
  const draws = [];
  const holeVals = hole.map(c => RV[c.rank]);
  const holeSuits = hole.map(c => c.suit);

  // Flush draw: 4 of same suit AND at least one hole card contributes
  const sc = {};
  all.forEach(c => sc[c.suit] = (sc[c.suit]||0) + 1);
  for (const [suit, cnt] of Object.entries(sc)) {
    if (cnt === 4 && holeSuits.includes(suit)) {
      draws.push({ type:"flush draw", outs:9, desc:"flush draw" });
    }
  }

  // Straight draws: check if hole cards participate
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
      // Check hole card participates
      const holeContributes = holeVals.some(v => window.includes(v)) ||
        (holeVals.includes(14) && window.includes(1));
      if (!holeContributes) continue;

      const full = [start,start+1,start+2,start+3,start+4];
      const missing = full.filter(v => !allVals.includes(v));
      if (missing.length === 1) {
        const m = missing[0];
        if (m === start || m === start+4) {
          if (!bestStraightDraw || bestStraightDraw.type !== "OESD") {
            bestStraightDraw = { type:"OESD", outs:8, desc:"open-ended straight draw" };
          }
        } else {
          if (!bestStraightDraw) {
            bestStraightDraw = { type:"gutshot", outs:4, desc:"gutshot straight draw" };
          }
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
  // Discount overlap if both flush and straight draw
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

  let category = "trash"; // trash | weak | marginal | good | strong | monster
  let strength = 0;
  let handDesc = ev.name;

  if (ev.rank >= 4) {
    // Check if the board itself makes most of the hand
    const boardEv = board.length >= 5 ? evalHand(board) : { rank: -1 };
    if (boardEv.rank >= ev.rank) {
      category = "marginal";
      strength = 0.25;
      handDesc = `${ev.name} (mostly on board)`;
    } else {
      category = "monster";
      strength = 0.85 + ev.rank * 0.015;
      handDesc = ev.name;
    }
  } else if (ev.rank === 3) {
    category = "strong"; strength = 0.65;
    handDesc = "Three of a Kind";
  } else if (ev.rank === 2) {
    category = "good"; strength = 0.55;
    handDesc = "Two Pair";
  } else if (ev.rank === 1) {
    const allFreq = {};
    all.map(c=>RV[c.rank]).forEach(v => allFreq[v]=(allFreq[v]||0)+1);
    const pairVal = +Object.entries(allFreq).find(([,c]) => c===2)?.[0] || 0;

    const boardFreq = {};
    boardVals.forEach(v => boardFreq[v]=(boardFreq[v]||0)+1);
    const boardPaired = Object.values(boardFreq).some(c => c >= 2);

    if (boardPaired && !holeVals.includes(pairVal)) {
      category = "trash"; strength = 0.1;
      handDesc = "High card (board is paired)";
    } else if (holeVals[0] === holeVals[1] && holeVals[0] > boardVals[0]) {
      category = "strong"; strength = 0.55;
      const pairName = RANK_NAME[hole[0].rank] || hole[0].rank;
      handDesc = `Overpair (${pairName}s)`;
    } else if (holeVals[0] === holeVals[1]) {
      if (holeVals[0] >= boardVals[boardVals.length - 1]) {
        category = "marginal"; strength = 0.22;
        handDesc = `Pocket pair below top card`;
      } else {
        category = "weak"; strength = 0.15;
        handDesc = `Low pocket pair (underpair)`;
      }
    } else if (pairVal === boardVals[0] && holeVals.includes(pairVal)) {
      const kicker = holeVals.find(v => v !== pairVal) || 0;
      if (kicker >= 11) { category = "good"; strength = 0.45; handDesc = `Top pair, strong kicker`; }
      else if (kicker >= 8) { category = "marginal"; strength = 0.32; handDesc = `Top pair, medium kicker`; }
      else { category = "marginal"; strength = 0.28; handDesc = `Top pair, weak kicker`; }
    } else if (holeVals.includes(pairVal)) {
      if (boardVals.length >= 2 && pairVal === boardVals[1]) {
        category = "weak"; strength = 0.2;
        handDesc = "Middle pair";
      } else {
        category = "weak"; strength = 0.14;
        handDesc = "Bottom pair";
      }
    } else {
      category = "trash"; strength = 0.1;
      handDesc = "Board pair (no connection)";
    }
  } else {
    const hasAceHigh = holeVals[0] === 14;
    if (hasAceHigh) {
      category = "weak"; strength = 0.12;
      handDesc = "Ace high";
    } else if (holeVals[0] >= 12) {
      category = "weak"; strength = 0.1;
      handDesc = "Overcards";
    } else {
      category = "trash"; strength = 0.06;
      handDesc = "Nothing";
    }
  }

  // Draw bonus for strength (but draws don't change the category label)
  let drawBonus = 0;
  if (draws.some(d => d.type === "flush draw")) drawBonus += 0.12;
  if (draws.some(d => d.type === "OESD")) drawBonus += 0.10;
  if (draws.some(d => d.type === "gutshot")) drawBonus += 0.05;

  return {
    category,
    strength: Math.min(strength + drawBonus, 1),
    handDesc,
    draws,
    drawOuts,
    ev,
    holeVals,
    boardVals,
  };
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO GENERATION
// ═══════════════════════════════════════════════════════════════

function generateScenario(positions) {
  const streetWeights = [
    { street:"preflop", w:0.3 },
    { street:"flop", w:0.35 },
    { street:"turn", w:0.25 },
    { street:"river", w:0.1 },
  ];
  let r = Math.random(), cum = 0, street = "flop";
  for (const sw of streetWeights) { cum += sw.w; if (r < cum) { street = sw.street; break; } }

  const pos = positions[Math.floor(Math.random() * positions.length)];
  const opp = OPP_TYPES[Math.floor(Math.random() * OPP_TYPES.length)];
  const otherPos = positions.filter(p => p !== pos);
  const oppPos = otherPos[Math.floor(Math.random() * otherPos.length)] || "BTN";

  // Deal with rejection loop for reasonable boards
  let playerHand, oppHand, board, remaining;
  let attempts = 0;

  while (attempts < 20) {
    attempts++;
    const deck = shuffle(createDeck());
    playerHand = [deck[0], deck[1]];
    oppHand = [deck[2], deck[3]];
    const boardCount = street === "flop" ? 3 : street === "turn" ? 4 : street === "river" ? 5 : 0;
    board = deck.slice(4, 4 + boardCount);

    if (boardCount === 0) break; // preflop, no board to validate

    // Reject: board alone makes straight+ (unrealistic feel)
    if (boardCount >= 5) {
      const bEv = evalHand(board);
      if (bEv.rank >= 4) continue;
    }

    // Reject: board has 3+ of same rank (boring)
    const bf = {};
    board.forEach(c => bf[c.rank] = (bf[c.rank]||0)+1);
    if (Object.values(bf).some(v => v >= 3)) continue;

    // Reject: 3+ suited on a 3-card flop (guaranteed flush possible)
    if (boardCount === 3) {
      const sf = {};
      board.forEach(c => sf[c.suit] = (sf[c.suit]||0)+1);
      if (Object.values(sf).some(v => v >= 3) && Math.random() < 0.7) continue;
    }

    break;
  }

  const usedSet = new Set([...playerHand, ...oppHand, ...board].map(c => c.rank+c.suit));
  remaining = createDeck().filter(c => !usedSet.has(c.rank+c.suit));

  let preflopSit = "open";
  if (street === "preflop") {
    if (pos === "BB" || pos === "SB") preflopSit = Math.random() < 0.5 ? "vs_raise" : "open";
    else preflopSit = Math.random() < 0.25 ? "vs_raise" : "open";
  }

  let potSize, betSize, oppAction;
  if (street === "preflop") {
    if (preflopSit === "vs_raise") {
      potSize = 3.5; betSize = 2.5;
      oppAction = `${opp.emoji} ${oppPos} raises to 2.5bb`;
    } else {
      potSize = 1.5; betSize = 0; oppAction = "";
    }
  } else {
    potSize = 4 + Math.floor(Math.random() * 12);
    const oppBets = Math.random() < 0.5;
    if (oppBets) {
      const sizings = [0.33, 0.5, 0.66, 0.75];
      const sizing = sizings[Math.floor(Math.random() * sizings.length)];
      betSize = Math.max(2, Math.round(potSize * sizing));
      potSize += betSize;
      oppAction = `${opp.emoji} bets ${betSize}bb`;
    } else {
      betSize = 0;
      oppAction = `${opp.emoji} checks`;
    }
  }

  return { street, pos, opp, oppPos, playerHand, oppHand, board, remaining, potSize, betSize, oppAction, preflopSit };
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE EXPLANATION BUILDER
// ═══════════════════════════════════════════════════════════════

function buildNarrative(best, action, info, opp, street, pot, bet, drawOuts, draws, pos, oppPos, board) {
  const oppName = opp.name;
  const isRiver = street === "river";
  const facingBet = bet > 0;

  const boardText = board.map(c => cardStr(c)).join(" ");
  const drawText = draws.map(d => d.desc).join(" and ");

  // Opponent behavior context
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
      if (drawOuts > 0 && !isRiver) {
        const eq = Math.round(outsToEquity(drawOuts, street) * 100);
        narrative = `You have ${info.handDesc} with ${drawText} (${drawOuts} outs ≈ ${eq}% chance to improve). ${needText} The math is close but doesn't quite work — you'd need more outs or better pot odds. ${oppContext} Fold is correct here.`;
      } else if (isRiver) {
        narrative = `On the river with ${info.handDesc} on [${boardText}]. No more cards to come, so this is purely about whether your hand beats what the opponent is likely to have. ${oppContext} At this strength, you're not beating enough of their betting range. Fold.`;
      } else {
        narrative = `You have ${info.handDesc} — a weak holding with no meaningful draw to improve. ${needText} Even getting good odds doesn't help when your hand has almost no chance of winning. ${oppContext} Fold and save your chips for a better spot.`;
      }
    } else if (best === "Call") {
      if (drawOuts >= 6 && !isRiver) {
        const eq = Math.round(outsToEquity(drawOuts, street) * 100);
        narrative = `You have ${info.handDesc} plus ${drawText} — that's ${drawOuts} outs giving you roughly ${eq}% equity. ${needText} Your equity exceeds the price, making this a profitable call over many repetitions. Even if you miss, the math justifies staying in. ${oppContext}`;
      } else if (info.category === "marginal" || info.category === "good") {
        narrative = `${info.handDesc} is a medium-strength hand on [${boardText}]. It's not strong enough to raise for value, but it beats enough of the opponent's range to justify a call. ${oppContext} ${opp.id === "aggro" ? "Against this aggressive opponent, calling is especially profitable since their betting range includes many weaker hands and bluffs." : ""}`;
      } else if (opp.id === "aggro") {
        narrative = `Normally ${info.handDesc} would be too weak to call, but ${oppName} opponents bluff frequently enough that your hand acts as a bluff-catcher. ${needText} Given their high bluff frequency, calling is profitable here.`;
      } else {
        narrative = `${info.handDesc} is sufficient to call given the pot odds. ${needText} ${oppContext}`;
      }
    } else if (best === "Raise") {
      narrative = `You have ${info.handDesc} — a strong hand on [${boardText}]. Rather than just calling, raising extracts more value from weaker hands the opponent might have. ${oppContext} ${opp.id === "aggro" ? "An aggressive opponent is likely to call or re-raise with weaker holdings, making a raise especially profitable." : opp.id === "tight" ? "Even a careful opponent has committed chips; raising puts pressure on their medium-strength hands." : "Raising builds the pot while you're ahead."}`;
    }
  } else {
    // Facing a check
    if (best === "Bet") {
      if (draws.length > 0 && info.category !== "good" && info.category !== "strong" && info.category !== "monster") {
        narrative = `The opponent checked, and you have ${info.handDesc} with ${drawText}. This is a good semi-bluff spot — your bet might take the pot immediately, and if called, you have ${drawOuts} outs to improve. ${oppContext} ${opp.id === "tight" ? "Careful opponents fold to pressure more often, making this semi-bluff even more effective." : ""}`;
      } else {
        narrative = `The opponent checked, and you have ${info.handDesc} on [${boardText}]. This is strong enough to bet for value — you want weaker hands to call and pay you off. ${oppContext} Checking would be leaving money on the table.`;
      }
    } else if (best === "Check") {
      narrative = `The opponent checked, and you have ${info.handDesc} on [${boardText}]. Your hand isn't strong enough to bet for value (better hands won't fold and worse hands won't call), and it's not a good bluff candidate either. ${isRiver ? "On the river, " : ""}Checking lets you see ${isRiver ? "a showdown" : "the next card"} for free. ${oppContext}`;
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
    if (range.has(notation)) {
      best = "Raise"; acceptable = ["Raise"];
      explanation = `${notation} is within the standard ${pos} opening range. From ${pos}, this hand has enough equity and playability to raise. Folding would mean giving up a profitable open.`;
    } else {
      best = "Fold"; acceptable = ["Fold"];
      explanation = `${notation} is outside the ${pos} opening range. From this position there are still ${POS_6.indexOf("BB") - POS_6.indexOf(pos)} players left to act who could have strong hands. Opening this would put you in difficult postflop situations too often.`;
    }
  } else {
    const ranges = pos === "BB" ? BB_VS : pos === "SB" ? SB_VS : null;
    if (ranges) {
      if (ranges.threebet.has(notation)) {
        best = "3-Bet"; acceptable = ["3-Bet"];
        explanation = `${notation} is a premium hand. Against a raise, 3-betting builds the pot while you have a strong equity advantage. Flat-calling allows the raiser to see a cheap flop with position, reducing your edge.`;
      } else if (ranges.call.has(notation)) {
        best = "Call"; acceptable = ["Call"];
        explanation = `${notation} is strong enough to defend from ${pos} — you've already invested a blind, so you need less equity to continue. But it's not premium enough to 3-bet; 3-betting would bloat the pot with a hand that plays better in smaller pots.`;
      } else {
        best = "Fold"; acceptable = ["Fold"];
        explanation = `${notation} doesn't have enough equity to profitably defend from ${pos} against a raise. Even though you've put in a blind, calling here leads to difficult postflop situations with a weak hand out of position.`;
      }
    } else {
      if (["AA","KK","QQ","JJ","AKs","AKo"].includes(notation)) {
        best = "3-Bet"; acceptable = ["3-Bet","Call"];
        explanation = `${notation} is a premium holding. Both 3-betting and calling are viable, but 3-betting is preferred to build the pot and take initiative.`;
      } else if (OPEN[pos]?.has(notation)) {
        best = "Call"; acceptable = ["Call","Fold"];
        explanation = `${notation} is borderline against a raise from ${pos}. Calling is acceptable if you're comfortable playing postflop, but folding isn't a mistake.`;
      } else {
        best = "Fold"; acceptable = ["Fold"];
        explanation = `${notation} is too weak to play against a raise from ${pos}.`;
      }
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
    if (info.strength >= 0.55) {
      best = "Raise"; acceptable = ["Raise","Call"];
    } else if (info.strength >= 0.30) {
      best = "Call"; acceptable = ["Call"];
    } else if (!isRiver && drawOuts >= 8 && (info.strength + equity * 0.6) >= oddsNeeded) {
      best = "Call"; acceptable = ["Call"];
    } else if (!isRiver && drawOuts >= 4 && (info.strength + equity * 0.6) >= oddsNeeded) {
      best = "Call"; acceptable = ["Call","Fold"];
    } else if (opp.id === "aggro" && isRiver && info.strength >= 0.18) {
      best = "Call"; acceptable = ["Call","Fold"];
    } else {
      best = "Fold"; acceptable = ["Fold"];
    }
  } else {
    if (info.strength >= 0.40) {
      best = "Bet"; acceptable = ["Bet","Check"];
    } else if (!isRiver && info.draws.length > 0 && drawOuts >= 6) {
      best = "Bet"; acceptable = ["Bet","Check"];
    } else {
      best = "Check"; acceptable = ["Check"];
    }
  }

  const rating = action === best ? "green" : acceptable.includes(action) ? "yellow" : "red";
  let evDiff = 0;
  if (rating === "red") {
    if (best === "Fold" && action !== "Fold") evDiff = -(bet || Math.round(pot * 0.5));
    else if (action === "Fold" && best !== "Fold") evDiff = -Math.round(pot * 0.15);
    else evDiff = -Math.round(pot * 0.1);
  } else if (rating === "yellow") {
    evDiff = -Math.round(pot * 0.03);
  }

  const explanation = buildNarrative(best, action, info, opp, street, pot, bet, drawOuts, info.draws, "", "", board);

  return { rating, best, acceptable, explanation, evDiff, info };
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
  const [copied, setCopied] = useState(false); // Moved to top level — fixes hooks bug

  const positions = tableSize === 6 ? POS_6 : POS_3;

  const startSession = useCallback(() => {
    setLog([]); setStack(100); setHandNum(1);
    setScenario(generateScenario(positions));
    setPhase("action"); setFeedback(null);
    setScreen("game");
  }, [positions]);

  const nextScenario = useCallback(() => {
    setHandNum(h => h + 1);
    setScenario(generateScenario(positions));
    setPhase("action"); setFeedback(null);
  }, [positions]);

  const handleAction = useCallback((action) => {
    if (!scenario) return;
    let ev;
    if (scenario.street === "preflop") {
      const notation = handNotation(scenario.playerHand[0], scenario.playerHand[1]);
      ev = evaluatePreflop(action, notation, scenario.pos, scenario.preflopSit);
    } else {
      ev = evaluatePostflop(action, scenario.playerHand, scenario.board, scenario.potSize, scenario.betSize, scenario.opp, scenario.street, scenario.remaining);
    }
    setFeedback(ev); setPhase("feedback");
    setStack(s => s + ev.evDiff);
    const notation = handNotation(scenario.playerHand[0], scenario.playerHand[1]);
    setLog(prev => [...prev, {
      hand:handNum, pos:scenario.pos, cards:notation,
      board: scenario.board.length > 0 ? scenario.board.map(cardStr).join(" ") : "—",
      pot:scenario.potSize.toFixed(1), bet:scenario.betSize > 0 ? scenario.betSize.toFixed(1) : "—",
      street:STREET_NAMES[scenario.street],
      situation: scenario.street==="preflop" ? scenario.preflopSit : (scenario.betSize > 0 ? "vs bet" : "checked to"),
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
    const total = log.length;
    const greens = log.filter(e => e.rating==="green").length;
    const yellows = log.filter(e => e.rating==="yellow").length;
    const reds = log.filter(e => e.rating==="red").length;
    const totalEv = log.reduce((s,e) => s + e.ev, 0);
    const byStreet = {}, byPos = {}, bySit = {}, handMistakes = {}, patterns = {};
    for (const e of log) {
      if (!byStreet[e.street]) byStreet[e.street] = {total:0,correct:0,mistakes:0,ev:0};
      byStreet[e.street].total++; if (e.rating==="green") byStreet[e.street].correct++; if (e.rating==="red") byStreet[e.street].mistakes++; byStreet[e.street].ev += e.ev;
      if (!byPos[e.pos]) byPos[e.pos] = {total:0,mistakes:0}; byPos[e.pos].total++; if (e.rating==="red") byPos[e.pos].mistakes++;
      const sk = `${e.street} ${e.situation}`; if (!bySit[sk]) bySit[sk] = {total:0,mistakes:0}; bySit[sk].total++; if (e.rating==="red") bySit[sk].mistakes++;
      if (e.rating==="red") { handMistakes[e.cards] = (handMistakes[e.cards]||0)+1; const p = `Should ${e.correct}, chose ${e.action}`; patterns[p] = (patterns[p]||0)+1; }
    }
    return { total, greens, yellows, reds, totalEv, byStreet, byPos, bySit, handMistakes, patterns };
  }, [log]);

  const exportSession = useCallback(() => {
    if (log.length === 0) return;
    let md = "| # | Pos | Hand | Board | Pot | Bet | Street | Sit | Opp | Action | Correct | Grade | EV± |\n";
    md += "|---|-----|------|-------|-----|-----|--------|-----|-----|--------|---------|-------|-----|\n";
    for (const e of log) {
      const icon = e.rating==="green"?"🟢":e.rating==="yellow"?"🟡":"🔴";
      md += `| ${e.hand} | ${e.pos} | ${e.cards} | ${e.board} | ${e.pot} | ${e.bet} | ${e.street} | ${e.situation} | ${e.opp} | ${e.action} | ${e.correct} | ${icon} | ${e.ev>0?"+":""}${e.ev.toFixed(1)} |\n`;
    }
    navigator.clipboard.writeText(md).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [log]);

  // ─── CARD COMPONENT ──────────────────────────
  const Card = ({ card, faceDown, small }) => {
    const w = small ? 36 : 50, h = small ? 52 : 72, fs = small ? 11 : 15;
    if (faceDown) return (<div style={{width:w,height:h,borderRadius:6,background:"linear-gradient(135deg,#1a3a2a,#0d2818)",border:"2px solid #2a5a3a",display:"flex",alignItems:"center",justifyContent:"center",color:"#2a5a3a",fontSize:fs+2,fontWeight:700}}>?</div>);
    return (
      <div style={{width:w,height:h,borderRadius:6,background:"linear-gradient(145deg,#1c1c2e,#12121f)",border:`2px solid ${SUIT_COLORS[card.suit]}33`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:0,boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}}>
        <span style={{fontSize:fs,fontWeight:700,color:SUIT_COLORS[card.suit],lineHeight:1}}>{RANK_DISPLAY[card.rank]||card.rank}</span>
        <span style={{fontSize:fs-3,color:SUIT_COLORS[card.suit],lineHeight:1,marginTop:1}}>{card.suit}</span>
      </div>
    );
  };

  const actionColors = {"Fold":"#6b7280","Call":"#2563eb","Raise":"#16a34a","3-Bet":"#7c3aed","Check":"#6b7280","Bet":"#16a34a"};

  const containerStyle = {
    minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",
    background:"radial-gradient(ellipse at 50% 30%, #0f2b1a 0%, #070f09 70%)",
    color:"#e8efe8",fontFamily:"'SF Pro Display',-apple-system,sans-serif",padding:16,
  };

  // ═════════════ MENU ═════════════
  if (screen === "menu") {
    return (
      <div style={containerStyle}>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",maxWidth:380,width:"100%"}}>
          <div style={{fontSize:36,marginBottom:6}}>♠♥♦♣</div>
          <h1 style={{fontSize:24,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.02em"}}>Poker Trainer</h1>
          <p style={{color:"#4a7a4a",fontSize:12,margin:"0 0 28px",textAlign:"center"}}>Preflop + Postflop · Opponent types · Chip tracker</p>
          <div style={{display:"flex",gap:10,marginBottom:24}}>
            {[3,6].map(n => (
              <button key={n} onClick={() => setTableSize(n)} style={{
                padding:"10px 22px",borderRadius:8,border:"2px solid",cursor:"pointer",
                borderColor:tableSize===n?"#22c55e":"#1e3a2a",background:tableSize===n?"#22c55e18":"transparent",
                color:tableSize===n?"#22c55e":"#4a7a4a",fontWeight:700,fontSize:14
              }}>{n}-max</button>
            ))}
          </div>
          <button onClick={startSession} style={{
            padding:"14px 40px",borderRadius:12,border:"none",cursor:"pointer",
            background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",fontWeight:700,fontSize:15,boxShadow:"0 4px 20px #16a34a44"
          }}>Start Session</button>
          {log.length > 0 && (
            <button onClick={() => setScreen("stats")} style={{marginTop:12,padding:"8px 18px",borderRadius:8,border:"1px solid #1e3a2a",background:"transparent",color:"#4a7a4a",fontSize:12,cursor:"pointer"}}>
              Session Stats ({log.length} decisions) →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ═════════════ STATS ═════════════
  if (screen === "stats") {
    const stats = getStats();
    return (
      <div style={containerStyle}>
        <div style={{width:"100%",maxWidth:480}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <button onClick={() => setScreen("game")} style={{background:"none",border:"none",color:"#4a7a4a",fontSize:12,cursor:"pointer",padding:0}}>← Back</button>
            <h2 style={{fontSize:17,fontWeight:700,margin:0}}>Session Stats</h2>
            <div style={{width:40}}/>
          </div>
          {!stats ? <p style={{color:"#4a7a4a",textAlign:"center"}}>No data yet. Play some hands first.</p> : (<>
            <div style={{background:"#0d1f14",borderRadius:11,padding:16,marginBottom:12,border:"1px solid #1a3a2a"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                {[
                  {l:"Decisions",v:stats.total,c:"#e8efe8"},
                  {l:"Accuracy",v:`${stats.total>0?Math.round(stats.greens/stats.total*100):0}%`,c:"#22c55e"},
                  {l:"EV (bb)",v:`${stats.totalEv>=0?"+":""}${stats.totalEv.toFixed(1)}`,c:stats.totalEv>=0?"#22c55e":"#ef4444"},
                  {l:"Stack",v:stack.toFixed(1),c:stack>=100?"#22c55e":"#ef4444"},
                ].map((d,i) => (<div key={i} style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:d.c}}>{d.v}</div><div style={{fontSize:9,color:"#4a7a4a"}}>{d.l}</div></div>))}
              </div>
              <div style={{display:"flex",gap:2,height:4,borderRadius:2,overflow:"hidden",background:"#1a2a1a"}}>
                {stats.total > 0 && (<>
                  <div style={{width:`${stats.greens/stats.total*100}%`,background:"#22c55e"}}/>
                  <div style={{width:`${stats.yellows/stats.total*100}%`,background:"#ca8a04"}}/>
                  <div style={{width:`${stats.reds/stats.total*100}%`,background:"#dc2626"}}/>
                </>)}
              </div>
            </div>

            {/* By Street */}
            <div style={{background:"#0d1f14",borderRadius:11,padding:16,marginBottom:12,border:"1px solid #1a3a2a"}}>
              <h3 style={{fontSize:11,fontWeight:700,color:"#4a7a4a",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:"0.05em"}}>By Street</h3>
              {Object.entries(stats.byStreet).map(([st,d]) => (
                <div key={st} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #152a1a",fontSize:12}}>
                  <span>{st}</span>
                  <div style={{display:"flex",gap:12}}>
                    <span style={{color:"#4a7a4a"}}>{d.total}</span>
                    {d.mistakes>0 && <span style={{color:"#ef4444"}}>{d.mistakes} err</span>}
                    <span style={{color:d.ev>=0?"#22c55e":"#ef4444",minWidth:45,textAlign:"right"}}>{d.ev>=0?"+":""}{d.ev.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* By Situation */}
            {Object.keys(stats.bySit).length > 0 && (
              <div style={{background:"#0d1f14",borderRadius:11,padding:16,marginBottom:12,border:"1px solid #1a3a2a"}}>
                <h3 style={{fontSize:11,fontWeight:700,color:"#4a7a4a",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:"0.05em"}}>By Situation</h3>
                {Object.entries(stats.bySit).sort((a,b)=>b[1].mistakes-a[1].mistakes).map(([sit,d]) => (
                  <div key={sit} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #152a1a",fontSize:12}}>
                    <span>{sit}</span>
                    <div style={{display:"flex",gap:12}}>
                      <span style={{color:"#4a7a4a"}}>{d.total}</span>
                      {d.mistakes>0 && <span style={{color:"#ef4444"}}>{d.mistakes} err</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Weakest Positions */}
            {Object.values(stats.byPos).some(d=>d.mistakes>0) && (
              <div style={{background:"#0d1f14",borderRadius:11,padding:16,marginBottom:12,border:"1px solid #1a3a2a"}}>
                <h3 style={{fontSize:11,fontWeight:700,color:"#4a7a4a",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Weakest Positions</h3>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {Object.entries(stats.byPos).filter(([,d])=>d.mistakes>0).sort((a,b)=>b[1].mistakes-a[1].mistakes).map(([p,d]) => (
                    <span key={p} style={{background:"#ef444422",color:"#fca5a5",padding:"3px 8px",borderRadius:5,fontSize:11,fontWeight:600}}>{p} {d.mistakes}×</span>
                  ))}
                </div>
              </div>
            )}

            {/* Error Patterns */}
            {Object.keys(stats.patterns).length > 0 && (
              <div style={{background:"#0d1f14",borderRadius:11,padding:16,marginBottom:12,border:"1px solid #1a3a2a"}}>
                <h3 style={{fontSize:11,fontWeight:700,color:"#4a7a4a",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Error Patterns</h3>
                {Object.entries(stats.patterns).sort((a,b)=>b[1]-a[1]).map(([pat,cnt]) => (
                  <div key={pat} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #152a1a",fontSize:12}}>
                    <span>{pat}</span><span style={{color:"#ef4444",fontWeight:700}}>{cnt}×</span>
                  </div>
                ))}
              </div>
            )}

            {/* Problem Hands */}
            {Object.keys(stats.handMistakes).length > 0 && (
              <div style={{background:"#0d1f14",borderRadius:11,padding:16,marginBottom:12,border:"1px solid #1a3a2a"}}>
                <h3 style={{fontSize:11,fontWeight:700,color:"#4a7a4a",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Problem Hands</h3>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {Object.entries(stats.handMistakes).sort((a,b)=>b[1]-a[1]).map(([h,c]) => (
                    <span key={h} style={{background:"#dc262622",color:"#fca5a5",padding:"3px 8px",borderRadius:5,fontSize:11,fontWeight:600}}>{h} {c}×</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:8}}>
              <button onClick={exportSession} style={{
                flex:1,padding:"11px",borderRadius:9,border:"1px solid #1e3a2a",cursor:"pointer",
                background:copied?"#16a34a22":"#0d1f14",color:copied?"#22c55e":"#e8efe8",fontWeight:600,fontSize:12
              }}>{copied ? "✓ Copied!" : "📋 Copy Report"}</button>
              <button onClick={() => { setScreen("game"); nextScenario(); }} style={{
                flex:1,padding:"11px",borderRadius:9,border:"none",cursor:"pointer",background:"#16a34a",color:"#fff",fontWeight:700,fontSize:12
              }}>Continue →</button>
            </div>
          </>)}
        </div>
      </div>
    );
  }

  // ═════════════ GAME ═════════════
  if (!scenario) return null;

  const seats = (() => {
    const arr = [];
    const n = positions.length;
    // Horizontal row layout (like original prototype)
    // Player at center-bottom, opponents spread across top
    const playerIdx = positions.indexOf(scenario.pos);

    for (let i = 0; i < n; i++) {
      const offset = (i - playerIdx + n) % n;
      const pos = positions[i];
      const isPlayer = pos === scenario.pos;
      const isOpp = pos === scenario.oppPos;

      // Distribute in a curved row
      let x, y;
      if (isPlayer) {
        x = 50; y = 88;
      } else {
        // Spread others across an arc at the top
        const otherCount = n - 1;
        const idx = offset - 1;
        const spread = Math.min(80, otherCount * 16);
        x = 50 + (idx - (otherCount-1)/2) * (spread / Math.max(otherCount-1, 1));
        y = 15 + Math.abs(idx - (otherCount-1)/2) * 5;
      }
      arr.push({ pos, x, y, isPlayer, isOpp });
    }
    return arr;
  })();

  return (
    <div style={containerStyle}>
      <div style={{width:"100%",maxWidth:480}}>
        {/* Top bar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,fontSize:11}}>
          <button onClick={() => setScreen("menu")} style={{background:"none",border:"none",color:"#4a7a4a",fontSize:11,cursor:"pointer",padding:0}}>← Menu</button>
          <div style={{display:"flex",gap:12,color:"#4a7a4a"}}>
            <span>#{handNum}</span>
            <span style={{color:stack>=100?"#22c55e":"#ef4444",fontWeight:600}}>{stack.toFixed(1)}bb</span>
          </div>
          <button onClick={() => setScreen("stats")} style={{background:"none",border:"none",color:"#4a7a4a",fontSize:11,cursor:"pointer",padding:0}}>Stats →</button>
        </div>

        {/* Table */}
        <div style={{position:"relative",width:"100%",paddingBottom:"55%",marginBottom:8}}>
          {/* Felt */}
          <div style={{
            position:"absolute",left:"8%",right:"8%",top:"8%",bottom:"8%",borderRadius:"45%",
            background:"radial-gradient(ellipse,#0f2b1a,#091a10)",border:"2.5px solid #1a3a2a",boxShadow:"0 0 20px #0a1f1233"
          }}/>
          {/* Pot */}
          <div style={{position:"absolute",left:"50%",top:"48%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>{scenario.potSize.toFixed(1)}bb</div>
            <div style={{fontSize:9,color:"#4a7a4a",marginTop:1}}>{STREET_NAMES[scenario.street]}</div>
          </div>
          {/* Seats */}
          {seats.map(s => (
            <div key={s.pos} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,transform:"translate(-50%,-50%)",textAlign:"center"}}>
              <div style={{
                width:30,height:30,borderRadius:"50%",margin:"0 auto 2px",
                background:s.isPlayer?"#16a34a33":s.isOpp?`${scenario.opp.color}33`:"#1a2a1a",
                border:`2px solid ${s.isPlayer?"#22c55e":s.isOpp?scenario.opp.color:"#2a3a2a"}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:s.isOpp?14:9,fontWeight:700,
                color:s.isPlayer?"#22c55e":s.isOpp?scenario.opp.color:"#3a5a3a",
              }}>
                {s.isOpp ? scenario.opp.emoji : s.isPlayer ? "You" : ""}
              </div>
              <div style={{fontSize:8,fontWeight:600,color:s.isPlayer?"#22c55e":s.isOpp?scenario.opp.color:"#3a5a3a",whiteSpace:"nowrap"}}>
                {s.pos}{s.isPlayer?" ★":""}
              </div>
            </div>
          ))}
        </div>

        {/* Opponent info bar */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"8px 12px",background:"#0d1f1488",borderRadius:9,border:"1px solid #1a3a2a",marginBottom:8,fontSize:12
        }}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:16}}>{scenario.opp.emoji}</span>
            <div>
              <span style={{fontWeight:600,color:scenario.opp.color}}>{scenario.opp.name}</span>
              <span style={{color:"#4a7a4a",marginLeft:5,fontSize:10}}>({scenario.oppPos})</span>
            </div>
          </div>
          <span style={{fontSize:10,color:"#4a7a4a"}}>{scenario.opp.desc}</span>
        </div>

        {/* Opponent action */}
        {scenario.oppAction && (
          <div style={{textAlign:"center",fontSize:11,color:"#94a3b8",marginBottom:8,padding:"6px",background:"#0d1f1488",borderRadius:7}}>
            {scenario.oppAction}
          </div>
        )}

        {/* Board */}
        {scenario.board.length > 0 && (
          <div style={{display:"flex",justifyContent:"center",gap:4,padding:12,marginBottom:6,background:"#0a1a0f",borderRadius:10,border:"1px solid #1a3a2a"}}>
            {scenario.board.map((c,i) => <Card key={i} card={c}/>)}
          </div>
        )}

        {/* Pot & bet */}
        <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:6,fontSize:11}}>
          <span style={{color:"#4a7a4a"}}>Pot: <strong style={{color:"#e8efe8"}}>{scenario.potSize.toFixed(1)}bb</strong></span>
          {scenario.betSize > 0 && <span style={{color:"#4a7a4a"}}>Bet: <strong style={{color:"#fbbf24"}}>{scenario.betSize.toFixed(1)}bb</strong></span>}
        </div>

        {/* Street indicator */}
        <div style={{display:"flex",justifyContent:"center",gap:3,marginBottom:10}}>
          {["preflop","flop","turn","river"].map(s => (
            <div key={s} style={{width:s===scenario.street?18:5,height:3,borderRadius:2,background:s===scenario.street?"#22c55e":"#1a3a2a",transition:"all 0.3s"}}/>
          ))}
        </div>

        {/* Player hand */}
        <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:4}}>
          {scenario.playerHand.map((c,i) => <Card key={i} card={c}/>)}
        </div>

        {/* Hand classification */}
        {scenario.board.length > 0 && (() => {
          const info = classifyHand(scenario.playerHand, scenario.board);
          const drawText = info.draws.length > 0 ? ` + ${info.draws.map(d=>d.desc).join(", ")}` : "";
          return <div style={{textAlign:"center",fontSize:11,color:"#4a7a4a",marginBottom:8}}>{info.handDesc}{drawText}</div>;
        })()}

        {/* Situation summary */}
        <div style={{textAlign:"center",fontSize:10,color:"#22c55e",marginBottom:12,fontWeight:600}}>
          {scenario.pos} · {scenario.street === "preflop"
            ? (scenario.preflopSit === "vs_raise" ? `Facing raise from ${scenario.oppPos}` : "First to act")
            : (scenario.betSize > 0 ? `Facing ${scenario.betSize}bb bet` : "Checked to you")}
        </div>

        {/* Feedback */}
        {phase === "feedback" && feedback && (
          <div style={{background:"#0d1f14",borderRadius:10,padding:14,marginBottom:10,border:"1px solid #1a3a2a",animation:"fadeIn 0.25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{
                display:"inline-flex",alignItems:"center",gap:4,
                background:feedback.rating==="green"?"#16a34a":feedback.rating==="yellow"?"#ca8a04":"#dc2626",
                color:"#fff",padding:"4px 10px",borderRadius:14,fontWeight:700,fontSize:11
              }}>
                {feedback.rating==="green"?"✓ Best move":feedback.rating==="yellow"?"≈ Acceptable":"✗ Mistake"}
              </div>
              {feedback.evDiff !== 0 && (
                <span style={{fontSize:11,fontWeight:600,color:feedback.evDiff>=0?"#22c55e":"#ef4444"}}>
                  {feedback.evDiff>=0?"+":""}{feedback.evDiff.toFixed(1)} EV
                </span>
              )}
            </div>
            {feedback.rating !== "green" && (
              <div style={{fontSize:11,color:"#fbbf24",marginBottom:6}}>Best: {feedback.best}</div>
            )}
            <div style={{fontSize:12,color:"#b8c8b8",lineHeight:1.6}}>{feedback.explanation}</div>
          </div>
        )}

        {/* Actions */}
        {phase === "action" && (
          <div style={{display:"flex",gap:7}}>
            {getActions().map(a => (
              <button key={a} onClick={() => handleAction(a)} style={{
                flex:1,padding:"12px 4px",borderRadius:9,border:"none",cursor:"pointer",
                background:actionColors[a],color:"#fff",fontWeight:700,fontSize:13,
                boxShadow:`0 3px 10px ${actionColors[a]}44`,transition:"transform 0.1s"
              }}
                onMouseDown={e => e.currentTarget.style.transform="scale(0.95)"}
                onMouseUp={e => e.currentTarget.style.transform="scale(1)"}
                onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
              >{a}</button>
            ))}
          </div>
        )}

        {phase === "feedback" && (
          <button onClick={nextScenario} style={{
            width:"100%",padding:"12px",borderRadius:9,border:"1px solid #1e3a2a",cursor:"pointer",
            background:"#0d1f14",color:"#e8efe8",fontWeight:600,fontSize:12,marginTop:6
          }}>Next →</button>
        )}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
