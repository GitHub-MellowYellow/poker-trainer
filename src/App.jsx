import { useState, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════

const T = {
  font: "Helvetica, Arial, sans-serif",
  weight: 700,
  maxW: 480,
  pagePad: 14,

  bg: "#f0e8d8",
  panel: "#faf6ee",
  table: "#2b3a52",
  tableBorder: "#3a506a",
  gold: "#c49a2a",
  goldDark: "#a67e18",
  text: "#2b2b24",
  textMid: "#5c5a50",
  textDim: "#8a8878",
  cream: "#faf6ee",
  creamBorder: "#e8e0d0",
  border: "#d8d0c0",
  green: "#4a8a5a",
  red: "#b84a3a",

  spade: "#2a6aaa",
  heart: "#c0443a",
  diamond: "#d4882a",
  club: "#2a7a5a",

  pos: { UTG:"#c0553a", MP:"#d48a2a", CO:"#3a8a7a", BTN:"#c49a2a", SB:"#2a6aaa", BB:"#9a5a8a" },
  oppTight: "#3a7a9a",
  oppNeutral: "#6b7b6b",
  oppAggro: "#c0553a",

  headerPad: 18,
  headerR: 14,
  bankrollFont: 34,

  gapToTable: 36,
  gapNarrToHand: 14,

  tableR: 55,
  tablePadX: 24,
  betRowH: 36,
  boardRowH: 100,
  potRowH: 36,
  innerGap: 12,
  tableTopPad: 50,
  tableBotPad: 45,

  seat: 52,
  seatBorder: 3,
  seatLabel: 12,

  bcW: 72,
  bcH: 100,
  bcR: 8,
  bcRank: 48,
  bcSuit: 22,
  bcGap: 7,

  cardH: 196,
  cardW: 140,
  cardR: 10,
  cardRank: 100,
  cardRank10: 100,
  cardSuit: 34,
  cardSplit: 0.63,
  cardGap: 10,

  btnR: 16,
  btnPadY: 11,
  btnFont: 13,

  narrH: 220,
  narrR: 12,
  narrFont: 15,
  narrLineH: 1.75,

  chip: 28,
  chipHeader: 34,
  chipPot: 22,
  chipInline: 18,

  pillR: 20,
  pillPX: 18,
  pillPY: 6,
  potFont: 19,
  betFont: 16,
};

var TABLE_H = T.tableTopPad + T.betRowH + T.innerGap + T.boardRowH + T.innerGap + T.potRowH + T.tableBotPad;

var SC = {};
SC["♠"] = T.spade;
SC["♥"] = T.heart;
SC["♦"] = T.diamond;
SC["♣"] = T.club;

var SUITS = ["♠","♥","♦","♣"];
var RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
var RV = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,T:10,J:11,Q:12,K:13,A:14};
var RD = {T:"10",J:"J",Q:"Q",K:"K",A:"A"};
var RN = {2:"deuce",3:"three",4:"four",5:"five",6:"six",7:"seven",8:"eight",9:"nine",T:"ten",J:"jack",Q:"queen",K:"king",A:"ace"};
var P6 = ["UTG","MP","CO","BTN","SB","BB"];
var P3 = ["BTN","SB","BB"];
var SN = { preflop:"Preflop", flop:"Flop", turn:"Turn", river:"River" };

// Post-flop acting order (lower index = acts first = OOP)
var POSTFLOP_ORDER = { SB:0, BB:1, UTG:2, MP:3, CO:4, BTN:5 };

var OPP = [
  { id:"tight", name:"Careful", emoji:"🛡️", color:T.oppTight },
  { id:"neutral", name:"Regular", emoji:"⚖️", color:T.oppNeutral },
  { id:"aggro", name:"Aggro", emoji:"🔥", color:T.oppAggro },
];

// ═══════════════════════════════════════════════════════════════
// PREFLOP RANGES
// ═══════════════════════════════════════════════════════════════

var OPEN = {
  UTG: new Set(["AA","KK","QQ","JJ","TT","99","88","77","AKs","AQs","AJs","ATs","A5s","A4s","AKo","AQo","KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s"]),
  MP: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","A5s","A4s","A3s","AKo","AQo","AJo","KQs","KJs","KTs","K9s","QJs","QTs","Q9s","JTs","J9s","T9s","98s","87s"]),
  CO: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","KTo","QJs","QTs","Q9s","Q8s","QJo","QTo","JTs","J9s","J8s","JTo","T9s","T8s","98s","97s","87s","76s","65s"]),
  BTN: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","Q7s","QJo","QTo","JTs","J9s","J8s","J7s","JTo","T9s","T8s","T7s","98s","97s","96s","87s","86s","76s","75s","65s","64s","54s"]),
  SB: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","KQo","KJo","KTo","QJs","QTs","Q9s","QJo","JTs","J9s","T9s","98s","87s"]),
};
var BB_VS = { threebet: new Set(["AA","KK","QQ","JJ","AKs","AKo","AQs","A5s","A4s"]), call: new Set(["TT","99","88","77","66","55","44","33","22","AJs","ATs","A9s","A8s","A7s","A6s","A3s","A2s","AQo","AJo","KQs","KJs","KTs","K9s","KQo","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","97s","87s","76s","65s","54s"]) };
var SB_VS = { threebet: new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs"]), call: new Set(["99","88","77","ATs","A9s","AQo","KQs","KJs","QJs","JTs","T9s"]) };

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════

function shuffle(a){var r=a.slice();for(var i=r.length-1;i>0;i--){var j=0|Math.random()*(i+1);var t=r[i];r[i]=r[j];r[j]=t;}return r;}
function mkDeck(){var d=[];for(var i=0;i<SUITS.length;i++)for(var j=0;j<RANKS.length;j++)d.push({rank:RANKS[j],suit:SUITS[i]});return d;}
function cstr(c){return(RD[c.rank]||c.rank)+c.suit;}
function hn(c1,c2){var v1=RV[c1.rank],v2=RV[c2.rank];var hi=v1>=v2?c1:c2,lo=v1>=v2?c2:c1;if(hi.rank===lo.rank)return hi.rank+lo.rank;return hi.rank+lo.rank+(hi.suit===lo.suit?"s":"o");}
function sortH(h){return h.slice().sort(function(a,b){return RV[b.rank]-RV[a.rank];});}

// ═══════════════════════════════════════════════════════════════
// HAND EVALUATOR
// ═══════════════════════════════════════════════════════════════

function combos(arr,k){if(k===0)return[[]];if(arr.length<k)return[];var f=arr[0],r=arr.slice(1);return combos(r,k-1).map(function(c){return[f].concat(c);}).concat(combos(r,k));}

function eval5(cards){
  var vals=cards.map(function(c){return RV[c.rank];}).sort(function(a,b){return b-a;});
  var suits=cards.map(function(c){return c.suit;});
  var fl=suits.every(function(s){return s===suits[0];});
  var st=false,sh=0;
  var uSet={};vals.forEach(function(v){uSet[v]=1;});var u=Object.keys(uSet).map(Number).sort(function(a,b){return b-a;});
  if(u.length===5&&u[0]-u[4]===4){st=true;sh=u[0];}
  if(u.length===5&&u[0]===14&&u[1]===5&&u[2]===4&&u[3]===3&&u[4]===2){st=true;sh=5;}
  var freq={};vals.forEach(function(v){freq[v]=(freq[v]||0)+1;});
  var g=Object.keys(freq).map(function(v){return{v:+v,c:freq[v]};}).sort(function(a,b){return b.c-a.c||b.v-a.v;});
  var S=function(r,s){return r*1e10+s;};
  if(fl&&st)return sh===14?{rank:9,name:"Royal Flush",score:S(9,14)}:{rank:8,name:"Straight Flush",score:S(8,sh)};
  if(g[0].c===4)return{rank:7,name:"Four of a Kind",score:S(7,g[0].v*100+g[1].v)};
  if(g[0].c===3&&g.length>1&&g[1].c===2)return{rank:6,name:"Full House",score:S(6,g[0].v*100+g[1].v)};
  if(fl)return{rank:5,name:"Flush",score:S(5,vals[0]*1e8+vals[1]*1e6+vals[2]*1e4+vals[3]*100+vals[4])};
  if(st)return{rank:4,name:"Straight",score:S(4,sh)};
  if(g[0].c===3)return{rank:3,name:"Three of a Kind",score:S(3,g[0].v*1e4+(g.length>1?g[1].v:0)*100+(g.length>2?g[2].v:0))};
  if(g[0].c===2&&g.length>1&&g[1].c===2){var hi=Math.max(g[0].v,g[1].v),lo=Math.min(g[0].v,g[1].v);return{rank:2,name:"Two Pair",score:S(2,hi*1e4+lo*100+(g.length>2?g[2].v:0))};}
  if(g[0].c===2)return{rank:1,name:"Pair",score:S(1,g[0].v*1e6+(g.length>1?g[1].v:0)*1e4+(g.length>2?g[2].v:0)*100+(g.length>3?g[3].v:0))};
  return{rank:0,name:"High Card",score:S(0,vals[0]*1e8+vals[1]*1e6+vals[2]*1e4+vals[3]*100+vals[4])};
}

function evalH(cards){
  if(cards.length<5)return{rank:-1,name:"--",score:-1};
  var c=combos(cards,5);var b={rank:-1,score:-1};
  for(var i=0;i<c.length;i++){var e=eval5(c[i]);if(e.score>b.score)b=e;}
  return b;
}

// ═══════════════════════════════════════════════════════════════
// DRAWS
// ═══════════════════════════════════════════════════════════════

function detectDraws(hole,board){
  var all=hole.concat(board);var dr=[];
  var hv=hole.map(function(c){return RV[c.rank];});
  var hs=hole.map(function(c){return c.suit;});
  var sc={};all.forEach(function(c){sc[c.suit]=(sc[c.suit]||0)+1;});
  Object.keys(sc).forEach(function(s){if(sc[s]===4&&hs.indexOf(s)!==-1)dr.push({type:"flush draw",outs:9,desc:"flush draw"});});
  var avSet={};all.forEach(function(c){avSet[RV[c.rank]]=1;});var av=Object.keys(avSet).map(Number);
  if(av.indexOf(14)!==-1)av.push(1);av.sort(function(a,b){return a-b;});
  var best=null;
  for(var s=1;s<=10;s++){
    var w=[];for(var v=s;v<s+5;v++)if(av.indexOf(v)!==-1)w.push(v);
    if(w.length===4){
      var hc=hv.some(function(v){return w.indexOf(v)!==-1;})||(hv.indexOf(14)!==-1&&w.indexOf(1)!==-1);
      if(!hc)continue;
      var f=[s,s+1,s+2,s+3,s+4];var m=f.filter(function(v){return av.indexOf(v)===-1;});
      if(m.length===1){if(m[0]===s||m[0]===s+4){if(!best||best.type!=="OESD")best={type:"OESD",outs:8,desc:"open-ended straight draw"};}else{if(!best)best={type:"gutshot",outs:4,desc:"gutshot straight draw"};}}
    }
  }
  if(best)dr.push(best);return dr;
}

function totalOuts(dr){if(!dr.length)return 0;var t=0;for(var i=0;i<dr.length;i++)t+=dr[i].outs;if(dr.some(function(d){return d.type==="flush draw";})&&dr.some(function(d){return d.type==="OESD"||d.type==="gutshot";}))t-=2;return Math.max(t,0);}
function outsEq(outs,st){if(st==="flop")return Math.min(outs*4-Math.max(outs-8,0),80)/100;return Math.min(outs*2,50)/100;}
function potOdds(pot,bet){return bet<=0?0:bet/(pot+bet);}

// ═══════════════════════════════════════════════════════════════
// BOARD TEXTURE ANALYSIS
// ═══════════════════════════════════════════════════════════════

function analyzeBoard(board){
  if(!board||board.length===0)return{texture:"none",desc:""};
  var bv=board.map(function(c){return RV[c.rank];}).sort(function(a,b){return b-a;});
  var bs=board.map(function(c){return c.suit;});

  // Flush potential: count max same suit
  var suitCounts={};bs.forEach(function(s){suitCounts[s]=(suitCounts[s]||0)+1;});
  var maxSuit=Math.max.apply(null,Object.values(suitCounts));
  var flushDraw=maxSuit>=3;
  var monotone=maxSuit>=4||(board.length===3&&maxSuit===3);

  // Straight potential: count consecutive/near cards
  var unique=[];var seen={};bv.forEach(function(v){if(!seen[v]){unique.push(v);seen[v]=1;}});
  unique.sort(function(a,b){return a-b;});
  if(seen[14])unique.unshift(1);
  var maxConn=1,cur=1;
  for(var i=1;i<unique.length;i++){
    if(unique[i]-unique[i-1]<=2)cur++;else cur=1;
    if(cur>maxConn)maxConn=cur;
  }
  var connected=maxConn>=3;

  // Paired board
  var rankCounts={};bv.forEach(function(v){rankCounts[v]=(rankCounts[v]||0)+1;});
  var paired=Object.values(rankCounts).some(function(c){return c>=2;});

  // High cards on board
  var highCards=bv.filter(function(v){return v>=10;}).length;
  var highBoard=highCards>=2;

  // Determine texture
  var wetFactors=0;
  if(flushDraw)wetFactors+=2;
  if(monotone)wetFactors+=1;
  if(connected)wetFactors+=2;
  if(highBoard)wetFactors+=1;
  if(paired)wetFactors-=1;

  var texture,desc;
  if(wetFactors>=3){
    texture="wet";
    var reasons=[];
    if(monotone)reasons.push("monotone suits");
    else if(flushDraw)reasons.push("flush possible");
    if(connected)reasons.push("connected cards");
    if(highBoard)reasons.push("high cards");
    desc="Wet board ("+reasons.join(", ")+") — many draws possible, strong hands vulnerable to being outdrawn.";
  }else if(wetFactors<=0){
    texture="dry";
    var reasons2=[];
    if(paired)reasons2.push("paired");
    if(!connected)reasons2.push("disconnected");
    if(!flushDraw)reasons2.push("rainbow");
    desc="Dry board ("+reasons2.join(", ")+") — few draws available, made hands are more stable.";
  }else{
    texture="medium";
    desc="Mixed board texture — some draws possible but not highly coordinated.";
  }
  return{texture:texture,desc:desc,flushDraw:flushDraw,monotone:monotone,connected:connected,paired:paired,highBoard:highBoard};
}

// ═══════════════════════════════════════════════════════════════
// CLASSIFY HAND STRENGTH
// ═══════════════════════════════════════════════════════════════

function classify(hole,board){
  var all=hole.concat(board);var ev=evalH(all);
  var bv=board.map(function(c){return RV[c.rank];}).sort(function(a,b){return b-a;});
  var hv=hole.map(function(c){return RV[c.rank];}).sort(function(a,b){return b-a;});
  var dr=detectDraws(hole,board);var dO=totalOuts(dr);
  var cat="trash",str=0,desc=ev.name;

  if(ev.rank>=4){
    var be=board.length>=5?evalH(board):{rank:-1};
    if(be.rank>=ev.rank){cat="marginal";str=0.25;desc=ev.name+" (mostly on board)";}
    else{cat="monster";str=0.85+ev.rank*0.015;}
  }else if(ev.rank===3){cat="strong";str=0.65;desc="Three of a Kind";}
  else if(ev.rank===2){cat="good";str=0.55;desc="Two Pair";}
  else if(ev.rank===1){
    var af={};all.forEach(function(c){var v=RV[c.rank];af[v]=(af[v]||0)+1;});
    var pv=0;Object.keys(af).forEach(function(k){if(af[k]===2)pv=+k;});
    var bf={};bv.forEach(function(v){bf[v]=(bf[v]||0)+1;});
    var bp=Object.values(bf).some(function(c){return c>=2;});
    if(bp&&hv.indexOf(pv)===-1){cat="trash";str=0.1;desc="High card (board is paired)";}
    else if(hv[0]===hv[1]&&hv[0]>bv[0]){cat="strong";str=0.55;desc="Overpair ("+RN[hole[0].rank]+"s)";}
    else if(hv[0]===hv[1]){if(hv[0]>=bv[bv.length-1]){cat="marginal";str=0.22;desc="Pocket pair below top card";}else{cat="weak";str=0.15;desc="Low pocket pair (underpair)";}}
    else if(pv===bv[0]&&hv.indexOf(pv)!==-1){var k=hv[0]!==pv?hv[0]:hv[1];if(k>=11){cat="good";str=0.45;desc="Top pair, strong kicker";}else if(k>=8){cat="marginal";str=0.32;desc="Top pair, medium kicker";}else{cat="marginal";str=0.28;desc="Top pair, weak kicker";}}
    else if(hv.indexOf(pv)!==-1){if(bv.length>=2&&pv===bv[1]){cat="weak";str=0.2;desc="Middle pair";}else{cat="weak";str=0.14;desc="Bottom pair";}}
    else{cat="trash";str=0.1;desc="Board pair (no connection)";}
  }else{
    if(hv[0]===14){cat="weak";str=0.12;desc="Ace high";}
    else if(hv[0]>bv[0]&&hv[1]>bv[0]){cat="weak";str=0.1;desc="Overcards";}
    else if(hv[0]>bv[0]){cat="trash";str=0.08;desc="One overcard";}
    else{cat="trash";str=0.06;desc="Nothing";}
  }

  var db=0;
  if(dr.some(function(d){return d.type==="flush draw";}))db+=0.12;
  if(dr.some(function(d){return d.type==="OESD";}))db+=0.10;
  if(dr.some(function(d){return d.type==="gutshot";}))db+=0.05;
  var boardTex=analyzeBoard(board);
  return{category:cat,strength:Math.min(str+db,1),handDesc:desc,draws:dr,drawOuts:dO,ev:ev,holeVals:hv,boardVals:bv,boardTexture:boardTex};
}

// ═══════════════════════════════════════════════════════════════
// POSITION HELPERS
// ═══════════════════════════════════════════════════════════════

function isOOP(playerPos,oppPos){
  return POSTFLOP_ORDER[playerPos]<POSTFLOP_ORDER[oppPos];
}

// ═══════════════════════════════════════════════════════════════
// MONTE CARLO ENGINE
// ═══════════════════════════════════════════════════════════════

// Build all 2-card combos from a deck array
function allPairs(deck){
  var pairs=[];
  for(var i=0;i<deck.length;i++)
    for(var j=i+1;j<deck.length;j++)
      pairs.push([deck[i],deck[j]]);
  return pairs;
}

// Get opponent range filtered by type and action against a board
// action: "bet", "check", "call"
// Returns array of [card, card] pairs
function getRange(oppType,action,board,heroHole){
  var known={};
  board.forEach(function(c){known[c.rank+c.suit]=1;});
  heroHole.forEach(function(c){known[c.rank+c.suit]=1;});
  var deck=mkDeck().filter(function(c){return !known[c.rank+c.suit];});
  var pairs=allPairs(deck);

  return pairs.filter(function(hand){
    var info=classify(hand,board);
    var cat=info.category;
    var hasPair=info.ev.rank>=1;
    var bigDraw=info.drawOuts>=8;
    var anyDraw=info.drawOuts>=4;
    var str=info.strength;

    if(oppType==="tight"){
      if(action==="bet"){
        // Top pair good kicker+, overpairs, sets+, nut draws
        return cat==="monster"||cat==="strong"||
               (cat==="good"&&str>=0.45)||
               (bigDraw&&info.drawOuts>=9);
      }
      if(action==="call"){
        // Calls with good+, strong draws
        return cat==="monster"||cat==="strong"||cat==="good"||bigDraw;
      }
      // "check" — everything they'd have that isn't in their bet range
      return !(cat==="monster"||cat==="strong"||
               (cat==="good"&&str>=0.45)||
               (bigDraw&&info.drawOuts>=9));
    }

    if(oppType==="aggro"){
      if(action==="bet"){
        // Any pair, any draw, plus broadway air (bluffs)
        return hasPair||anyDraw||info.holeVals[0]>=10;
      }
      if(action==="call"){
        // Calls with any pair, any draw
        return hasPair||anyDraw;
      }
      // "check" — complete air, no pair, no draw, no broadway
      return !hasPair&&!anyDraw&&info.holeVals[0]<10;
    }

    // neutral/regular
    if(action==="bet"){
      return cat==="monster"||cat==="strong"||cat==="good"||bigDraw;
    }
    if(action==="call"){
      return cat==="monster"||cat==="strong"||cat==="good"||cat==="marginal"||anyDraw;
    }
    // "check" — not in bet range
    return !(cat==="monster"||cat==="strong"||cat==="good"||bigDraw);
  });
}

// Monte Carlo equity: hero hole cards vs opponent range, given board
// Returns equity as 0-1
function mcEquity(hole,board,oppRange,trials){
  if(!oppRange||!oppRange.length)return 0.5;
  trials=trials||500;
  var wins=0,ties=0,ran=0;

  // Known cards to exclude
  var knownSet={};
  hole.forEach(function(c){knownSet[c.rank+c.suit]=1;});
  board.forEach(function(c){knownSet[c.rank+c.suit]=1;});

  // Remaining deck for board runout
  var baseDeck=mkDeck().filter(function(c){return !knownSet[c.rank+c.suit];});
  var need=5-board.length;

  for(var t=0;t<trials;t++){
    // Pick random opponent hand
    var opp=oppRange[0|Math.random()*oppRange.length];

    // Exclude opponent cards from runout deck
    var oSet={};
    opp[0]&&(oSet[opp[0].rank+opp[0].suit]=1);
    opp[1]&&(oSet[opp[1].rank+opp[1].suit]=1);
    var runDeck=need>0?baseDeck.filter(function(c){return !oSet[c.rank+c.suit];}):null;

    // Deal remaining board cards
    var fullBoard=board;
    if(need>0){
      var sh=shuffle(runDeck);
      fullBoard=board.concat(sh.slice(0,need));
    }

    // Evaluate both hands
    var hScore=evalH(hole.concat(fullBoard)).score;
    var oScore=evalH(opp.concat(fullBoard)).score;

    if(hScore>oScore)wins++;
    else if(hScore===oScore)ties++;
    ran++;
  }
  return ran>0?(wins+ties*0.5)/ran:0.5;
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO GENERATOR
// ═══════════════════════════════════════════════════════════════

function genScenario(positions){
  var sw=[{s:"preflop",w:0.3},{s:"flop",w:0.35},{s:"turn",w:0.25},{s:"river",w:0.1}];
  var r=Math.random(),c=0,street="flop";
  for(var i=0;i<sw.length;i++){c+=sw[i].w;if(r<c){street=sw[i].s;break;}}
  var pos=positions[0|Math.random()*positions.length];
  var opp=OPP[0|Math.random()*OPP.length];
  var op=positions.filter(function(p){return p!==pos;});
  var oppPos=op[0|Math.random()*op.length]||"BTN";

  // Post-flop: determine IP/OOP relationship and scenario type
  // playerIsOOP = player acts first, so no opponent action before them
  var playerIsOOP=false;
  var postflopSit="ip_vs_check"; // default: opponent acted first and checked

  if(street!=="preflop"){
    playerIsOOP=isOOP(pos,oppPos);
    if(playerIsOOP){
      // Player acts first. Two sub-scenarios:
      // (a) Player is first to act (check or bet) — 50%
      // (b) Player checked, opponent then bet, back to player — 50%
      if(Math.random()<0.5){
        postflopSit="oop_first_to_act";
      }else{
        postflopSit="oop_check_then_opp_bets";
      }
    }else{
      // Player is IP — opponent acted first
      if(Math.random()<0.5){
        postflopSit="ip_vs_bet";
      }else{
        postflopSit="ip_vs_check";
      }
    }
  }

  var pH,oH,board,att=0;
  while(att<20){
    att++;var d=shuffle(mkDeck());pH=[d[0],d[1]];oH=[d[2],d[3]];
    var bc=street==="flop"?3:street==="turn"?4:street==="river"?5:0;
    board=d.slice(4,4+bc);
    if(bc===0)break;
    if(bc>=5&&evalH(board).rank>=4)continue;
    var bf={};board.forEach(function(x){bf[x.rank]=(bf[x.rank]||0)+1;});
    if(Object.values(bf).some(function(v){return v>=3;}))continue;
    if(bc===3){var sf={};board.forEach(function(x){sf[x.suit]=(sf[x.suit]||0)+1;});if(Object.values(sf).some(function(v){return v>=3;})&&Math.random()<0.7)continue;}
    break;
  }

  var potSize,betSize;
  if(street==="preflop"){
    var pfSit="open";
    if(pos==="BB"||pos==="SB")pfSit=Math.random()<0.5?"vs_raise":"open";
    else pfSit=Math.random()<0.25?"vs_raise":"open";
    if(pfSit==="vs_raise"){potSize=3.5;betSize=2.5;}
    else{potSize=1.5;betSize=0;}
    return{street:street,pos:pos,opp:opp,oppPos:oppPos,playerHand:pH,oppHand:oH,board:board,potSize:potSize,betSize:betSize,preflopSit:pfSit,postflopSit:null,playerIsOOP:false};
  }

  // Post-flop pot and bet sizing
  potSize=4+(0|Math.random()*12);
  if(postflopSit==="ip_vs_bet"||postflopSit==="oop_check_then_opp_bets"){
    // Opponent bet — generate a bet size
    var sz=[0.33,0.5,0.66,0.75][0|Math.random()*4];
    betSize=Math.max(2,Math.round(potSize*sz));
    potSize+=betSize;
  }else{
    // No bet — checked to player or player first to act
    betSize=0;
  }

  return{street:street,pos:pos,opp:opp,oppPos:oppPos,playerHand:pH,oppHand:oH,board:board,potSize:potSize,betSize:betSize,preflopSit:null,postflopSit:postflopSit,playerIsOOP:playerIsOOP};
}

// ═══════════════════════════════════════════════════════════════
// DEBUG HARNESS — generates N random hands with full evaluation
// ═══════════════════════════════════════════════════════════════

function debugRun(n,tableSize){
  n=n||100;
  var positions=tableSize===6?P6:P3;
  var results=[];

  for(var i=0;i<n;i++){
    var sc=genScenario(positions);
    var nota=hn(sc.playerHand[0],sc.playerHand[1]);
    var boardStr=sc.board.map(cstr).join(" ")||"--";

    // Determine available actions
    var acts;
    if(sc.street==="preflop"){
      if(sc.preflopSit==="vs_raise")acts=["Fold","Call","3-Bet"];
      else if(sc.pos==="BB")acts=["Check","Raise"];
      else acts=["Fold","Raise"];
    }else{
      acts=sc.betSize>0?["Fold","Call","Raise"]:["Check","Bet"];
    }

    // Evaluate each possible action
    var evals={};
    for(var a=0;a<acts.length;a++){
      var act=acts[a];
      var ev;
      if(sc.street==="preflop"){
        ev=evalPre(act,nota,sc.pos,sc.preflopSit,true);
      }else{
        ev=evalPost(act,sc.playerHand,sc.board,sc.potSize,sc.betSize,sc.opp,sc.street,sc.postflopSit,true);
      }
      evals[act]=ev;
    }

    // Pick the first action to get the "best" answer info
    var bestEv=evals[acts[0]];
    var bestAction=bestEv.best;

    // Classify info for postflop
    var classInfo=null;
    if(sc.street!=="preflop"){
      classInfo=classify(sc.playerHand,sc.board);
    }

    // Build row
    var row={
      hand:i+1,
      street:sc.street,
      pos:sc.pos,
      oppPos:sc.oppPos,
      oppType:sc.opp.id,
      cards:nota,
      board:boardStr,
      potSize:sc.potSize,
      betSize:sc.betSize,
      situation:sc.street==="preflop"?sc.preflopSit:(sc.postflopSit||"--"),
      playerIsOOP:sc.playerIsOOP?"OOP":"IP",
      availableActions:acts.join("/"),
      bestAction:bestAction,
      acceptable:bestEv.acceptable.join("/"),
      // Classification
      handCategory:classInfo?classInfo.category:"--",
      handDesc:classInfo?classInfo.handDesc:"--",
      handStrength:classInfo?classInfo.strength.toFixed(3):"--",
      draws:classInfo?(classInfo.draws.map(function(d){return d.desc;}).join(", ")||"none"):"--",
      drawOuts:classInfo?classInfo.drawOuts:"--",
      boardTexture:classInfo?(classInfo.boardTexture.texture||"--"):"--",
      // MC equity (if postflop)
      mcEquity:bestEv.info&&bestEv.info.strength?bestEv.info.strength.toFixed(3):"--",
      // EV rewards per action
      evBest:(evals[bestAction]?evals[bestAction].evDiff:0).toFixed(1),
      // Narrative (first 120 chars)
      explanation:bestEv.explanation?bestEv.explanation.substring(0,120):"--",
      // Full narrative
      fullExplanation:bestEv.explanation||"--",
    };

    // Add per-action ratings
    for(var a2=0;a2<acts.length;a2++){
      row["rating_"+acts[a2]]=evals[acts[a2]].rating;
      row["ev_"+acts[a2]]=evals[acts[a2]].evDiff.toFixed(1);
    }

    results.push(row);
  }
  return results;
}

function debugToCSV(results){
  if(!results.length)return"";
  // Collect all columns from all rows
  var colSet={};
  results.forEach(function(r){Object.keys(r).forEach(function(k){if(k!=="fullExplanation")colSet[k]=1;});});
  var cols=Object.keys(colSet);
  var lines=[cols.join(",")];
  for(var i=0;i<results.length;i++){
    var r=results[i];
    var vals=cols.map(function(c){
      var v=r[c]!=null?String(r[c]):"";
      if(v.indexOf(",")!==-1||v.indexOf('"')!==-1||v.indexOf("\n")!==-1)return'"'+v.replace(/"/g,'""')+'"';
      return v;
    });
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}

function debugSummary(results){
  var total=results.length;
  var byStreet={};var byOpp={};var byPos={};var byCat={};var actionDist={};
  var flags=[];

  for(var i=0;i<total;i++){
    var r=results[i];
    // By street
    if(!byStreet[r.street])byStreet[r.street]={n:0};
    byStreet[r.street].n++;
    // By opp
    if(!byOpp[r.oppType])byOpp[r.oppType]={n:0,actions:{}};
    byOpp[r.oppType].n++;
    byOpp[r.oppType].actions[r.bestAction]=(byOpp[r.oppType].actions[r.bestAction]||0)+1;
    // By pos
    if(!byPos[r.pos])byPos[r.pos]={n:0};
    byPos[r.pos].n++;
    // By category
    if(r.handCategory!=="--"){
      if(!byCat[r.handCategory])byCat[r.handCategory]={n:0,actions:{}};
      byCat[r.handCategory].n++;
      byCat[r.handCategory].actions[r.bestAction]=(byCat[r.handCategory].actions[r.bestAction]||0)+1;
    }
    // Action distribution
    actionDist[r.bestAction]=(actionDist[r.bestAction]||0)+1;

    // Flag suspicious patterns
    if(r.handCategory==="monster"&&r.bestAction==="Fold"){
      flags.push("#"+r.hand+": MONSTER hand ("+r.cards+" / "+r.handDesc+") told to Fold on "+r.board);
    }
    if(r.handCategory==="trash"&&r.bestAction==="Raise"&&r.street!=="preflop"){
      flags.push("#"+r.hand+": TRASH hand ("+r.cards+" / "+r.handDesc+") told to Raise on "+r.board);
    }
    if(r.handCategory==="strong"&&r.bestAction==="Fold"){
      flags.push("#"+r.hand+": STRONG hand ("+r.cards+" / "+r.handDesc+") told to Fold on "+r.board+", opp="+r.oppType+", sit="+r.situation);
    }
    if(r.handDesc==="Overcards"&&r.street!=="preflop"){
      // Verify overcards label: both hole cards should be above board high
      var hc=r.cards;
      // Quick parse: first two chars are ranks
      var hr1=RV[hc[0]]||0,hr2=RV[hc[1]]||0;
      var bc=r.board.split(" ").map(function(cs){return RV[cs[0]]||0;});
      var boardHigh=Math.max.apply(null,bc);
      if(hr1<=boardHigh||hr2<=boardHigh){
        flags.push("#"+r.hand+": OVERCARDS BUG — "+r.cards+" labeled overcards but board "+r.board+" has higher card");
      }
    }
    // Check narrative isn't empty
    if(!r.explanation||r.explanation==="--"||r.explanation.length<10){
      flags.push("#"+r.hand+": Empty/short explanation for "+r.cards+" on "+r.board);
    }
  }

  var lines=["=== DEBUG RUN: "+total+" hands ===",""];
  lines.push("STREET DISTRIBUTION:");
  Object.keys(byStreet).forEach(function(s){lines.push("  "+s+": "+byStreet[s].n);});
  lines.push("");
  lines.push("POSITION DISTRIBUTION:");
  Object.keys(byPos).forEach(function(p){lines.push("  "+p+": "+byPos[p].n);});
  lines.push("");
  lines.push("ACTION DISTRIBUTION (best action):");
  Object.keys(actionDist).forEach(function(a){lines.push("  "+a+": "+actionDist[a]+" ("+Math.round(actionDist[a]/total*100)+"%)");}); 
  lines.push("");
  lines.push("BY OPPONENT TYPE:");
  Object.keys(byOpp).forEach(function(o){
    var d=byOpp[o];lines.push("  "+o+" ("+d.n+" hands): "+Object.entries(d.actions).map(function(e){return e[0]+"="+e[1];}).join(", "));
  });
  lines.push("");
  lines.push("BY HAND CATEGORY (postflop):");
  Object.keys(byCat).forEach(function(c){
    var d=byCat[c];lines.push("  "+c+" ("+d.n+"): "+Object.entries(d.actions).map(function(e){return e[0]+"="+e[1];}).join(", "));
  });
  lines.push("");
  if(flags.length===0){
    lines.push("FLAGS: None — no suspicious patterns detected.");
  }else{
    lines.push("FLAGS ("+flags.length+" issues):");
    flags.forEach(function(f){lines.push("  ⚠ "+f);});
  }
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// OPPONENT INFLUENCE DESCRIPTIONS
// ═══════════════════════════════════════════════════════════════

function oppContext(opp, facingBet, street, bestAction){
  var id=opp.id;
  if(facingBet){
    if(id==="tight"){
      if(bestAction==="Fold")return "Against a Careful player, this bet almost always means a real hand.";
      if(bestAction==="Call")return "A Careful player rarely bluffs, but your hand is strong enough regardless.";
      if(bestAction==="Raise")return "Even against a Careful player, your hand is too strong not to raise for value.";
      return "A Careful player's bets are almost always for value.";
    }
    if(id==="aggro"){
      if(bestAction==="Fold")return "Even against an Aggro player, you have nothing to bluff-catch with here.";
      if(bestAction==="Call")return "Against an Aggro player who bluffs often, your hand works as a bluff-catcher.";
      if(bestAction==="Raise")return "Against an Aggro player, raising punishes their wide betting range.";
      return "An Aggro player's range is wide here.";
    }
    if(bestAction==="Fold")return "Against a balanced range, you don't have enough to continue.";
    if(bestAction==="Call")return "Against a balanced range, your hand has enough equity to call.";
    if(bestAction==="Raise")return "Against a balanced range, your hand is strong enough to raise.";
    return "Their betting range is balanced — a mix of value and some bluffs.";
  }else{
    if(id==="tight"){
      if(bestAction==="Bet")return "A Careful player checking signals weakness — good spot to take the pot.";
      if(bestAction==="Check")return "A Careful player checking means weakness, but your hand can't profit from betting either.";
      return "A Careful player checking usually means a weak or medium hand.";
    }
    if(id==="aggro"){
      if(bestAction==="Bet")return "An Aggro player checking signals genuine weakness — they'd bet anything decent.";
      if(bestAction==="Check")return "An Aggro player checking is unusual, but your hand isn't strong enough to exploit it.";
      return "An Aggro player's check signals genuine weakness.";
    }
    if(bestAction==="Bet")return "Their check could mean weakness — a good spot to bet.";
    if(bestAction==="Check")return "Their checking range is mixed, and your hand can't profit from betting.";
    return "A Regular player's check could mean a weak hand or a trap.";
  }
}

// Opponent modifier for decision thresholds
function oppMod(oppId){
  if(oppId==="tight")return{callThresh:0.08,bluffMore:true,trapLess:true};
  if(oppId==="aggro")return{callThresh:-0.08,bluffMore:false,trapLess:false};
  return{callThresh:0,bluffMore:false,trapLess:false};
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE BUILDER (post-flop explanations)
// ═══════════════════════════════════════════════════════════════

function buildNarr(best,info,opp,street,pot,bet,board,postflopSit,showPct,mcEq,closeSpot){
  var isR=street==="river",fb=bet>0;
  var ad=isR?[]:info.draws;
  var dt=ad.map(function(d){return d.desc;}).join(" and ");
  var ao=isR?0:info.drawOuts;
  var tex=info.boardTexture;
  var hd=info.handDesc;
  var eqPct=mcEq!=null?Math.round(mcEq*100):null;

  // Texture phrase — woven into description, not appended
  var texP="";
  if(tex&&tex.texture!=="none"){
    if(isR){
      if(tex.flushDraw)texP=" — board completed the flush draw";
      else if(tex.texture==="dry")texP=" on a dry runout";
    }else{
      if(tex.texture==="wet")texP=" on a wet board";
      else if(tex.texture==="dry")texP=" on a dry board";
    }
  }

  // Opponent context — action-aware, one phrase
  var oc=oppContext(opp,fb,street,best);

  if(fb){
    var needed=potOdds(pot,bet);
    var origPot=pot-bet;
    var pov=Math.round(needed*100);

    if(closeSpot){
      if(showPct)return hd+texP+" — roughly "+eqPct+"% equity, needing "+pov+"% to call "+bet+"BB into "+(origPot+bet)+"BB. Genuinely close. Both calling and folding are reasonable here.";
      return hd+texP+" — a genuinely close spot. Both calling and folding are reasonable here. "+oc;
    }

    if(best==="Fold"){
      if(ao>0){
        if(showPct)return hd+" plus "+dt+texP+" — roughly "+eqPct+"% equity. You need "+pov+"% to call "+bet+"BB into "+(origPot+bet)+"BB. Not enough. "+oc;
        return hd+" plus "+dt+texP+" — not enough equity to justify calling here. Your draws don't close the gap. "+oc;
      }
      if(isR)return hd+texP+" — not strong enough to beat what they're betting for value here. Nothing left to draw to. "+oc;
      if(showPct)return hd+" with no real draw"+texP+" — roughly "+eqPct+"% equity against this range. You'd need "+pov+"% to call. Nothing to work with. "+oc;
      return hd+" with no real draw"+texP+" — very little chance against this range. Nothing to work with here. "+oc;
    }

    if(best==="Call"){
      if(ao>=6){
        if(showPct)return hd+" plus "+dt+texP+" — roughly "+eqPct+"% equity. You're paying "+bet+"BB into "+(origPot+bet)+"BB, needing "+pov+"%. Your draws give you plenty of room. Call.";
        return hd+" plus "+dt+texP+" — your draws give you a solid edge over the price you're paying. Profitable call.";
      }
      if(showPct)return hd+texP+" — roughly "+eqPct+"% equity against their betting range, needing "+pov+"%. Enough to continue. "+oc+" Call.";
      return hd+texP+" — strong enough to continue against this bet. "+oc+" Call.";
    }

    if(best==="Raise"){
      if(showPct)return hd+texP+" — roughly "+eqPct+"% equity against their betting range. Very strong. Raise for value — build the pot. "+oc;
      return hd+texP+" — very strong. Raise for value, build the pot against hands that will call with worse. "+oc;
    }
  }else{
    if(closeSpot){
      return hd+texP+" — a borderline spot. Both betting and checking are fine here. "+oc;
    }

    if(best==="Bet"){
      if(ad.length>0&&["good","strong","monster"].indexOf(info.category)===-1){
        return hd+texP+" isn't much yet, but "+dt+" gives you outs if called. Good spot to take it down now or improve. Bet.";
      }
      if(showPct)return hd+texP+" — roughly "+eqPct+"% equity vs their checking range. Worse hands will call. "+oc+" Bet for value.";
      return hd+texP+" — solid against their checking range. Worse hands will call here. "+oc+" Bet for value.";
    }
    if(best==="Check"){
      if(isR)return hd+texP+" — betting only gets called by better. Take the showdown. "+oc;
      return hd+texP+" — betting only gets called by better hands. Take the free card. "+oc;
    }
  }
  return hd+". "+oc;
}

// ═══════════════════════════════════════════════════════════════
// POST-FLOP EVALUATOR
// ═══════════════════════════════════════════════════════════════

function evalPost(action,hole,board,pot,bet,opp,street,postflopSit,showPct){
  var info=classify(hole,board);
  var isR=street==="river";
  var best,acc,mcEq,closeSpot=false;

  if(bet>0){
    // Facing a bet — compute equity vs opponent's betting range
    var betRange=getRange(opp.id,"bet",board,hole);
    mcEq=mcEquity(hole,board,betRange,500);
    // Pot already includes opponent's bet (see genScenario)
    // To call bet into pot: need bet/(pot+bet) equity
    var needed=potOdds(pot,bet);
    var gap=mcEq-needed;

    if(mcEq>=0.62&&gap>0.08){
      // Very strong equity — raise for value
      best="Raise";acc=["Raise","Call"];
    }else if(gap>0.08){
      // Clear call
      best="Call";acc=["Call"];
    }else if(gap>0.04){
      // Call is best, fold acceptable
      best="Call";acc=["Call","Fold"];
    }else if(gap>-0.04){
      // Genuinely close spot — both green
      closeSpot=true;
      if(gap>=0){best="Call";acc=["Call","Fold"];}
      else{best="Fold";acc=["Fold","Call"];}
    }else if(gap>-0.08){
      // Fold is best, call acceptable
      best="Fold";acc=["Fold","Call"];
    }else{
      // Clear fold
      best="Fold";acc=["Fold"];
    }
  }else{
    // No bet — checked to player or first to act
    var checkRange=getRange(opp.id,"check",board,hole);
    var callRange=getRange(opp.id,"call",board,hole);

    var eqVsCheck=mcEquity(hole,board,checkRange,500);
    var eqVsCall=callRange.length>0?mcEquity(hole,board,callRange,500):0.5;
    mcEq=eqVsCheck;

    if(eqVsCall>0.55){
      // Clear value bet
      best="Bet";acc=["Bet"];
    }else if(eqVsCall>0.50){
      // Marginal value — bet preferred, check acceptable
      best="Bet";acc=["Bet","Check"];
    }else if(!isR&&info.drawOuts>=6&&eqVsCall>0.30){
      // Semi-bluff with draws
      best="Bet";acc=["Bet","Check"];
    }else if(eqVsCall>0.46){
      // Close spot — both green
      closeSpot=true;
      best="Check";acc=["Check","Bet"];
    }else{
      // Clear check
      best="Check";acc=["Check"];
    }
  }

  // Rating: closeSpot means both acceptable actions are green
  var rating;
  if(action===best){
    rating="green";
  }else if(closeSpot&&acc.indexOf(action)!==-1){
    rating="green";
  }else if(acc.indexOf(action)!==-1){
    rating="yellow";
  }else{
    rating="red";
  }

  // EV calculation
  var evDiff=0;
  if(rating==="green"){
    if(best==="Fold"||action==="Fold")evDiff=+Math.max(0.3,Math.round(pot*0.02*10)/10);
    else if(best==="Call"||action==="Call")evDiff=+Math.max(0.5,Math.round(pot*0.05*10)/10);
    else if(best==="Raise"||best==="Bet"||action==="Raise"||action==="Bet")evDiff=+Math.max(0.8,Math.round(pot*0.08*10)/10);
    else if(best==="Check"||action==="Check")evDiff=+Math.max(0.3,Math.round(pot*0.02*10)/10);
  }else if(rating==="red"){
    if(best==="Fold"&&action!=="Fold")evDiff=-(bet||Math.round(pot*0.5));
    else if(action==="Fold"&&best!=="Fold")evDiff=-Math.round(pot*0.15);
    else evDiff=-Math.round(pot*0.1);
  }else{
    evDiff=-Math.round(pot*0.03);
  }

  var explanation=buildNarr(best,info,opp,street,pot,bet,board,postflopSit,showPct,mcEq,closeSpot);
  return{rating:rating,best:best,acceptable:acc,explanation:explanation,evDiff:evDiff,info:info};
}

// ═══════════════════════════════════════════════════════════════
// PREFLOP EVALUATOR
// ═══════════════════════════════════════════════════════════════

// Approximate preflop equity categories for educational context
function preflopStrengthNote(nota,pos){
  var isPair=/^([AKQJT98765432])\1$/.test(nota);
  var isSuited=nota.length===3&&nota[2]==="s";
  var hi=nota[0],lo=nota.length>=2?nota[1]:"";
  var hiV=RV[hi]||0,loV=RV[lo]||0;

  if(isPair){
    if(hiV>=11)return nota+" is a premium pair — top ~3% of hands. Very strong in any position.";
    if(hiV>=8)return nota+" is a solid middle pair. Plays well from most positions but vulnerable to overcards.";
    return nota+" is a small pair. Main value comes from flopping a set (~12% of the time).";
  }
  if(hi==="A"){
    if(loV>=12)return nota+(isSuited?" (suited)":"")+" is a premium holding. Strong equity against most ranges.";
    if(loV>=9)return nota+(isSuited?" (suited)":"")+" is a solid Ace. Playable from most positions"+(isSuited?", and the suited draw adds ~3% equity.":".");
    if(isSuited)return nota+" is playable mainly for its suited quality — the flush potential adds ~3% equity over the offsuit version, but the kicker is weak.";
    return nota+" has a weak kicker. It may seem strong because of the Ace, but it often makes second-best hands that lose significant pots.";
  }
  if(hiV>=12&&loV>=11){
    return nota+(isSuited?" (suited)":"")+" is a strong broadway combo with good high-card equity.";
  }
  if(hiV>=10&&loV>=9&&Math.abs(hiV-loV)<=2){
    return nota+(isSuited?" (suited)":"")+" is a connected hand. Its value comes from making straights and"+(isSuited?" flushes":"")+" rather than high-card strength.";
  }
  if(isSuited&&Math.abs(hiV-loV)<=2)return nota+" is a suited connector. Playable in position for its straight and flush potential, but low raw equity.";
  if(hiV>=12)return nota+" has one strong card but a weak kicker. Often dominated by better hands in the same range.";
  return nota+" is a speculative hand. It needs a favorable position and loose table to be playable.";
}

function evalPre(action,nota,pos,sit,showPct){
  var best,acc,expl;
  var pl=P6.indexOf("BB")-P6.indexOf(pos);if(pl<0)pl+=P6.length;
  var strengthNote=preflopStrengthNote(nota,pos);

  if(sit==="open"){
    if(pos==="BB"){
      var bbRaiseRange=new Set(["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs","ATs","AQo","KQs","A5s","A4s"]);
      if(bbRaiseRange.has(nota)){
        best="Raise";acc=["Raise","Check"];
        expl=nota+" — strong enough to raise for value from BB. You have a free look but this hand builds the pot well.";
      }else{
        best="Check";acc=["Check"];
        expl=nota+" — free flop, no reason to raise. See what comes.";
      }
    }else{
      var range=OPEN[pos];if(!range)return{rating:"green",best:action,acceptable:[action],explanation:"",evDiff:0};
      if(range.has(nota)){
        best="Raise";acc=["Raise"];
        expl=nota+" is a standard open from "+pos+". "+strengthNote+" Raise.";
      }else{
        best="Fold";acc=["Fold"];
        expl=strengthNote+" Outside "+pos+" range with "+pl+" player"+(pl!==1?"s":"")+" behind.";
      }
    }
  }else{
    var ranges=pos==="BB"?BB_VS:pos==="SB"?SB_VS:null;
    if(ranges){
      if(ranges.threebet.has(nota)){
        best="3-Bet";acc=["3-Bet"];
        expl=nota+" — premium enough to 3-bet from "+pos+". "+strengthNote+" Build a bigger pot.";
      }else if(ranges.call.has(nota)){
        best="Call";acc=["Call"];
        expl=nota+" defends from "+pos+" by calling but isn't strong enough to 3-bet. "+strengthNote;
      }else{
        best="Fold";acc=["Fold"];
        expl=nota+" can't profitably defend from "+pos+" vs a raise. "+strengthNote;
      }
    }else{
      if(["AA","KK","QQ","JJ","AKs","AKo"].indexOf(nota)!==-1){
        best="3-Bet";acc=["3-Bet","Call"];
        expl=nota+" — premium. 3-bet to build the pot and isolate. "+strengthNote;
      }else if(OPEN[pos]&&OPEN[pos].has(nota)){
        best="Call";acc=["Call","Fold"];
        expl=nota+" is borderline vs a raise here. Calling is reasonable but folding isn't a big mistake. "+strengthNote;
      }else{
        best="Fold";acc=["Fold"];
        expl=nota+" is too weak to continue vs a raise from this position. "+strengthNote;
      }
    }
  }

  var rating=action===best?"green":acc.indexOf(action)!==-1?"yellow":"red";

  // EV: correct plays get +EV, mistakes get -EV
  var evDiff;
  if(rating==="green"){
    if(best==="Fold"||best==="Check")evDiff=+0.3;
    else if(best==="Call")evDiff=+0.5;
    else if(best==="3-Bet"||best==="Raise")evDiff=+1.0;
    else evDiff=+0.3;
  }else if(rating==="red"){
    if(best==="Fold"&&action!=="Fold")evDiff=-2.5;
    else if(best==="Check"&&action==="Raise")evDiff=-1.0;
    else evDiff=-1.5;
  }else{
    evDiff=-0.3;
  }

  return{rating:rating,best:best,acceptable:acc,explanation:expl,evDiff:evDiff};
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

var SK="poker-trainer-data";
var SETK="poker-trainer-settings";
function loadLocal(){try{var r=localStorage.getItem(SK);return r?JSON.parse(r):null;}catch(e){return null;}}
function saveLocal(d){try{if(d)localStorage.setItem(SK,JSON.stringify(d));else localStorage.removeItem(SK);}catch(e){}}
function loadSettings(){try{var r=localStorage.getItem(SETK);return r?JSON.parse(r):{showPct:false,showPreEq:false};}catch(e){return{showPct:false,showPreEq:false};}}
function saveSettings(s){try{localStorage.setItem(SETK,JSON.stringify(s));}catch(e){}}

// ═══════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Chip(props){
  var s=props.size||T.chip;
  return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:s,height:s,borderRadius:"50%",background:T.gold,color:"#fff",fontSize:s*0.36,fontWeight:800,lineHeight:1,verticalAlign:"middle",border:"2px solid "+T.goldDark,flexShrink:0}}>BB</span>;
}

function BV(props){
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,verticalAlign:"middle"}}>
    <span style={{fontSize:props.fs||15,fontWeight:T.weight,color:props.color||T.goldDark,fontVariantNumeric:"tabular-nums",fontFamily:T.font}}>{typeof props.value==="number"?props.value.toFixed(1):props.value}</span>
    <Chip size={props.cs||T.chipInline}/>
  </span>;
}

function PB(props){return <span style={{color:T.pos[props.pos]||T.gold,fontWeight:T.weight}}>{props.pos}</span>;}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE TEXT RENDERER
// ═══════════════════════════════════════════════════════════════

function NT(props){
  var text=props.text||"";
  var pats=[
    {re:/\b([AKQJT98765432]{2}[so])\b/g,t:"hand"},
    {re:/\b([AKQJT98765432])\1\b/g,t:"hand"},
    {re:/\b(UTG|MP|CO|BTN|SB|BB)\b/g,t:"pos"},
    {re:/(\d+\s*outs?\b)/gi,t:"hl"},
    {re:/(\d+%\s*equity|\d+%)/gi,t:"hl"},
    {re:/(×[24])/g,t:"hl"},
    {re:/(flush draw|straight draw|open-ended|gutshot|OESD)/gi,t:"hl"},
    {re:/(overpair|top pair|two pair|three of a kind|full house|flush|straight|bottom pair|middle pair|underpair|ace high|overcards|pocket pair|high card)/gi,t:"hl"},
    {re:/(semi-bluff|bluff-catcher|profitable|\+EV|value|pot odds)/gi,t:"hl"},
    {re:/\b(Fold|Call|Raise|3-Bet|Check|Bet)\b/g,t:"hl"},
    {re:/(Wet board|Dry board|Mixed board)/gi,t:"hl"},
  ];
  var parts=[{text:text,t:"plain"}];
  for(var pi=0;pi<pats.length;pi++){
    var pat=pats[pi];var next=[];
    for(var j=0;j<parts.length;j++){
      var p=parts[j];
      if(p.t!=="plain"){next.push(p);continue;}
      var last=0;var rc=new RegExp(pat.re.source,pat.re.flags);
      var match;while((match=rc.exec(p.text))!==null){
        if(match.index>last)next.push({text:p.text.slice(last,match.index),t:"plain"});
        next.push({text:match[0],t:pat.t});last=match.index+match[0].length;
      }
      if(last<p.text.length)next.push({text:p.text.slice(last),t:"plain"});
    }
    parts=next;
  }
  return <>{parts.map(function(p,i){
    if(p.t==="pos")return <PB key={i} pos={p.text}/>;
    if(p.t==="hand")return <span key={i} style={{background:T.bg,padding:"1px 5px",borderRadius:3,fontWeight:T.weight,color:T.text,border:"1px solid "+T.border}}>{p.text}</span>;
    if(p.t==="hl")return <span key={i} style={{color:T.goldDark,fontWeight:T.weight}}>{p.text}</span>;
    return <span key={i}>{p.text}</span>;
  })}</>;
}

// ═══════════════════════════════════════════════════════════════
// CARD COMPONENT (module-level to prevent animation replay)
// ═══════════════════════════════════════════════════════════════

function CCard(props){
  var card=props.card,isBoard=props.board,delay=props.animDelay||0;
  var col=SC[card.suit];var rank=RD[card.rank]||card.rank;
  var animStyle={animationDelay:delay+"ms"};
  if(isBoard){
    return <div className="board-anim" style={{width:T.bcW,height:T.bcH,borderRadius:T.bcR,background:T.cream,border:"1.5px solid "+T.creamBorder,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:T.font,boxShadow:"0 2px 8px rgba(0,0,0,0.15)",...animStyle}}>
      <span style={{fontSize:T.bcRank,fontWeight:800,color:col,lineHeight:1}}>{rank}</span>
      <span style={{fontSize:T.bcSuit,color:col,lineHeight:1,marginTop:2}}>{card.suit}</span>
    </div>;
  }
  return <div className="card-anim" style={{width:T.cardW,height:T.cardH,borderRadius:T.cardR,background:T.cream,border:"2px solid "+T.creamBorder,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:T.font,boxShadow:"0 4px 16px rgba(0,0,0,0.1)",gap:2,...animStyle}}>
    <span style={{fontSize:rank.length>1?T.cardRank10:T.cardRank,fontWeight:800,color:col,lineHeight:1}}>{rank}</span>
    <span style={{fontSize:T.cardSuit,color:col,lineHeight:1}}>{card.suit}</span>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

export default function PokerTrainer(){
  var [screen,setScreen]=useState("menu");
  var [tableSize,setTableSize]=useState(6);
  var [scenario,setSc]=useState(null);
  var [phase,setPhase]=useState("action");
  var [feedback,setFB]=useState(null);
  var [log,setLog]=useState([]);
  var [stack,setStack]=useState(100);
  var [handNum,setHN]=useState(0);
  var [copied,setCopied]=useState(false);
  var [csvCopied,setCsvCopied]=useState(false);
  var [lifetime,setLT]=useState(function(){return loadLocal()||{totalHands:0,greens:0,yellows:0,reds:0,totalEv:0,sessions:0};});
  var [confirmReset,setConfirmReset]=useState(false);
  var [settings,setSettings]=useState(loadSettings);
  var [animKey,setAnimKey]=useState(0);
  var [evPulse,setEvPulse]=useState(null);
  var [btnFlash,setBtnFlash]=useState(null);
  var [debugData,setDebugData]=useState(null);
  var fileRef=useRef(null);
  var positions=tableSize===6?P6:P3;
  var F={fontFamily:T.font,fontWeight:T.weight};

  var persist=useCallback(function(sl){
    if(!sl.length)return;
    setLT(function(p){var m={totalHands:p.totalHands+sl.length,greens:p.greens+sl.filter(function(e){return e.rating==="green";}).length,yellows:p.yellows+sl.filter(function(e){return e.rating==="yellow";}).length,reds:p.reds+sl.filter(function(e){return e.rating==="red";}).length,totalEv:p.totalEv+sl.reduce(function(s,e){return s+e.ev;},0),sessions:p.sessions+1};saveLocal(m);return m;});
  },[]);

  // Start preserves log if just changing table size
  var start=useCallback(function(keepSession){
    if(!keepSession&&log.length>0)persist(log);
    if(!keepSession){setLog([]);setStack(100);setHN(1);}
    else{setHN(function(h){return h+1;});}
    setSc(genScenario(positions));setPhase("action");setFB(null);setScreen("game");setAnimKey(function(k){return k+1;});setBtnFlash(null);
  },[positions,log,persist]);

  var goNext=useCallback(function(){setHN(function(h){return h+1;});setSc(genScenario(positions));setPhase("action");setFB(null);setAnimKey(function(k){return k+1;});setBtnFlash(null);},[positions]);

  var act=useCallback(function(action){
    if(!scenario)return;
    var n=hn(scenario.playerHand[0],scenario.playerHand[1]);
    var ev;
    if(scenario.street==="preflop")ev=evalPre(action,n,scenario.pos,scenario.preflopSit,settings.showPct);
    else ev=evalPost(action,scenario.playerHand,scenario.board,scenario.potSize,scenario.betSize,scenario.opp,scenario.street,scenario.postflopSit,settings.showPct);
    setFB(ev);setPhase("feedback");setStack(function(s){return s+ev.evDiff;});
    // Trigger animations
    setBtnFlash({action:action,rating:ev.rating});
    setEvPulse(ev.evDiff>=0?"green":"red");
    setTimeout(function(){setEvPulse(null);},600);
    setLog(function(p){return p.concat([{hand:handNum,pos:scenario.pos,cards:n,board:scenario.board.length>0?scenario.board.map(cstr).join(" "):"--",pot:scenario.potSize.toFixed(1),bet:scenario.betSize>0?scenario.betSize.toFixed(1):"--",street:SN[scenario.street],situation:scenario.street==="preflop"?scenario.preflopSit:(scenario.betSize>0?"vs bet":"checked to"),opp:scenario.opp.name,action:action,correct:ev.best,rating:ev.rating,ev:ev.evDiff}]);});
  },[scenario,handNum,settings.showPct]);

  var getActs=function(){
    if(!scenario)return[];
    if(scenario.street==="preflop"){
      if(scenario.preflopSit==="vs_raise")return["Fold","Call","3-Bet"];
      // Open situation: BB can check (already in the pot), others fold/raise
      if(scenario.pos==="BB")return["Check","Raise"];
      return["Fold","Raise"];
    }
    return scenario.betSize>0?["Fold","Call","Raise"]:["Check","Bet"];
  };

  var getStats=useCallback(function(){
    if(!log.length)return null;
    var total=log.length,greens=0,yellows=0,reds=0,totalEv=0;
    var byStreet={},byPos={},patterns={};
    for(var i=0;i<log.length;i++){
      var e=log[i];totalEv+=e.ev;
      if(e.rating==="green")greens++;else if(e.rating==="yellow")yellows++;else reds++;
      if(!byStreet[e.street])byStreet[e.street]={total:0,correct:0,mistakes:0,ev:0};
      byStreet[e.street].total++;if(e.rating==="green")byStreet[e.street].correct++;if(e.rating==="red")byStreet[e.street].mistakes++;byStreet[e.street].ev+=e.ev;
      if(!byPos[e.pos])byPos[e.pos]={total:0,mistakes:0};byPos[e.pos].total++;if(e.rating==="red")byPos[e.pos].mistakes++;
      if(e.rating==="red"){var pat="Should "+e.correct+", chose "+e.action;patterns[pat]=(patterns[pat]||0)+1;}
    }
    return{total:total,greens:greens,yellows:yellows,reds:reds,totalEv:totalEv,byStreet:byStreet,byPos:byPos,patterns:patterns};
  },[log]);

  var exportCSV=useCallback(function(){
    if(!log.length)return;
    var lines=["hand,pos,cards,board,pot,bet,street,situation,opp,action,correct,rating,ev"];
    for(var i=0;i<log.length;i++){var e=log[i];lines.push([e.hand,e.pos,e.cards,'"'+e.board+'"',e.pot,e.bet,e.street,e.situation,e.opp,e.action,e.correct,e.rating,e.ev.toFixed(1)].join(","));}
    navigator.clipboard.writeText(lines.join("\n")).catch(function(){});
    setCsvCopied(true);setTimeout(function(){setCsvCopied(false);},2000);
  },[log]);

  var importCSV=useCallback(function(ev){
    var file=ev.target.files&&ev.target.files[0];if(!file)return;
    var reader=new FileReader();
    reader.onload=function(e){
      var text=e.target&&e.target.result;if(!text)return;
      var lines=text.split("\n").slice(1).filter(function(l){return l.trim();});
      var imported=[];
      for(var i=0;i<lines.length;i++){
        var m=lines[i].match(/^(\d+),(\w+),(\w+),"?([^"]*)"?,([^,]+),([^,]+),(\w+),([^,]+),(\w+),([^,]+),([^,]+),(\w+),(.+)$/);
        if(m)imported.push({hand:+m[1],pos:m[2],cards:m[3],board:m[4],pot:m[5],bet:m[6],street:m[7],situation:m[8],opp:m[9],action:m[10],correct:m[11],rating:m[12],ev:+m[13]});
      }
      if(imported.length>0){setLog(function(p){return p.concat(imported);});alert("Imported "+imported.length+" hands");}
    };
    reader.readAsText(file);ev.target.value="";
  },[]);

  var resetStats=useCallback(function(){
    setLT({totalHands:0,greens:0,yellows:0,reds:0,totalEv:0,sessions:0});
    saveLocal(null);setLog([]);setStack(100);setHN(0);setConfirmReset(false);
  },[]);

  var exportMD=useCallback(function(){
    if(!log.length)return;
    var hd="| # | Pos | Hand | Board | Action | Correct | Grade | EV |\n|---|-----|------|-------|--------|---------|-------|----|\n";
    for(var i=0;i<log.length;i++){var e=log[i];var ic=e.rating==="green"?"OK":e.rating==="yellow"?"~":"X";hd+="| "+e.hand+" | "+e.pos+" | "+e.cards+" | "+e.board+" | "+e.action+" | "+e.correct+" | "+ic+" | "+(e.ev>0?"+":"")+e.ev.toFixed(1)+" |\n";}
    navigator.clipboard.writeText(hd).catch(function(){});setCopied(true);setTimeout(function(){setCopied(false);},2000);
  },[log]);

  // ═══════ MENU ═══════
  if(screen==="menu"){
    return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:T.bg,...F,padding:20}}>
      <div style={{maxWidth:T.maxW,width:"100%",textAlign:"center"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:8}}>
          <div style={{width:40,height:1,background:T.border}}/><div style={{width:5,height:5,background:T.gold,transform:"rotate(45deg)"}}/><div style={{width:40,height:1,background:T.border}}/>
        </div>
        <div style={{fontSize:11,letterSpacing:"0.3em",color:T.textDim,textTransform:"uppercase",marginBottom:4}}>Poker</div>
        <h1 style={{fontSize:36,fontWeight:T.weight,margin:"0 0 4px",color:T.text}}>TRAINER</h1>
        <div style={{width:50,height:2,background:T.gold,margin:"12px auto 28px"}}/>
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:28}}>
          {[3,6].map(function(n){return <button key={n} onClick={function(){setTableSize(n);}} style={{padding:"10px 28px",borderRadius:20,cursor:"pointer",border:tableSize===n?"2px solid "+T.gold:"2px solid "+T.border,background:tableSize===n?T.gold+"18":"transparent",color:tableSize===n?T.goldDark:T.textMid,...F,fontSize:14}}>{n}-max</button>;})}
        </div>
        <button onClick={function(){start(false);}} style={{padding:"16px 56px",borderRadius:24,border:"none",cursor:"pointer",background:T.gold,color:"#fff",...F,fontSize:16}}>DEAL</button>
        {log.length>0 && <button onClick={function(){persist(log);setScreen("stats");}} style={{display:"block",margin:"16px auto 0",padding:"8px 22px",borderRadius:16,border:"1.5px solid "+T.border,background:"transparent",color:T.textMid,...F,fontSize:12,cursor:"pointer"}}>{"Session Stats ("+log.length+") →"}</button>}
        {lifetime.totalHands>0 && <div style={{marginTop:24,fontSize:12,color:T.textDim,...F}}>{lifetime.totalHands+" hands · "+Math.round(lifetime.greens/lifetime.totalHands*100)+"% · "+lifetime.sessions+" sessions"}</div>}
        <button onClick={function(){setScreen("settings");}} style={{display:"block",margin:"20px auto 0",background:"none",border:"none",color:T.textDim,fontSize:12,cursor:"pointer",...F,letterSpacing:"0.06em"}}>{"⚙ SETTINGS"}</button>
        <button onClick={function(){var r=debugRun(100,tableSize);setDebugData(r);setScreen("debug");}} style={{display:"block",margin:"12px auto 0",background:"none",border:"none",color:T.textDim,fontSize:11,cursor:"pointer",...F,letterSpacing:"0.04em",opacity:0.5}}>{"DEBUG (100 hands)"}</button>
      </div>
    </div>;
  }

  // ═══════ STATS ═══════
  if(screen==="stats"){
    var st=getStats();
    var pnl={background:T.panel,borderRadius:10,padding:16,marginBottom:10,border:"1px solid "+T.border};
    return <div style={{minHeight:"100vh",background:T.bg,...F,padding:16,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={importCSV}/>
      <div style={{width:"100%",maxWidth:T.maxW}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button onClick={function(){setScreen("game");}} style={{background:"none",border:"none",color:T.textMid,fontSize:13,cursor:"pointer",...F}}>{"← Back"}</button>
          <span style={{fontSize:15,color:T.text,...F}}>SESSION REPORT</span>
          <div style={{width:40}}/>
        </div>
        {!st ? <p style={{color:T.textMid,textAlign:"center"}}>No data yet.</p> : <>
          <div style={pnl}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              {[{l:"Hands",v:st.total,c:T.text},{l:"Accuracy",v:Math.round(st.greens/st.total*100)+"%",c:T.green},{l:"EV",v:(st.totalEv>=0?"+":"")+st.totalEv.toFixed(1),c:st.totalEv>=0?T.green:T.red},{l:"Stack",v:stack.toFixed(1),c:stack>=100?T.green:T.red}].map(function(d,i){return <div key={i} style={{textAlign:"center"}}><div style={{fontSize:22,...F,color:d.c}}>{d.v}</div><div style={{fontSize:10,fontWeight:T.weight,color:T.textDim,textTransform:"uppercase"}}>{d.l}</div></div>;})}
            </div>
            <div style={{display:"flex",gap:2,height:3,borderRadius:2,overflow:"hidden",background:T.creamBorder}}>
              <div style={{width:st.greens/st.total*100+"%",background:T.green}}/>
              <div style={{width:st.yellows/st.total*100+"%",background:T.gold}}/>
              <div style={{width:st.reds/st.total*100+"%",background:T.red}}/>
            </div>
          </div>
          <div style={pnl}>
            <div style={{fontSize:10,fontWeight:T.weight,color:T.textDim,textTransform:"uppercase",marginBottom:8}}>By Street</div>
            {Object.entries(st.byStreet).map(function(entry){var s=entry[0],d=entry[1];return <div key={s} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+T.creamBorder,fontSize:13,...F}}><span>{s}</span><div style={{display:"flex",gap:14}}><span style={{color:T.textDim}}>{d.total}</span>{d.mistakes>0&&<span style={{color:T.red}}>{d.mistakes+" err"}</span>}<span style={{color:d.ev>=0?T.green:T.red,minWidth:45,textAlign:"right"}}>{(d.ev>=0?"+":"")+d.ev.toFixed(1)}</span></div></div>;})}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <button onClick={exportMD} style={{flex:1,padding:12,borderRadius:20,border:"1.5px solid "+T.border,cursor:"pointer",background:copied?T.green+"16":T.panel,color:copied?T.green:T.text,...F,fontSize:13}}>{copied?"✓ Copied MD":"Copy MD"}</button>
            <button onClick={exportCSV} style={{flex:1,padding:12,borderRadius:20,border:"1.5px solid "+T.border,cursor:"pointer",background:csvCopied?T.green+"16":T.panel,color:csvCopied?T.green:T.text,...F,fontSize:13}}>{csvCopied?"✓ Copied CSV":"Copy CSV"}</button>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <button onClick={function(){fileRef.current&&fileRef.current.click();}} style={{flex:1,padding:12,borderRadius:20,border:"1.5px solid "+T.border,cursor:"pointer",background:T.panel,color:T.text,...F,fontSize:13}}>Import CSV</button>
            <button onClick={function(){setScreen("game");goNext();}} style={{flex:1,padding:12,borderRadius:20,border:"none",cursor:"pointer",background:T.gold,color:"#fff",...F,fontSize:13}}>{"Continue →"}</button>
          </div>
          {!confirmReset ?
            <button onClick={function(){setConfirmReset(true);}} style={{width:"100%",padding:10,borderRadius:20,border:"1.5px solid "+T.red+"30",cursor:"pointer",background:"transparent",color:T.red,...F,fontSize:12,opacity:0.6}}>Reset All Stats</button>
          :
            <div style={{background:T.panel,borderRadius:10,padding:16,border:"1px solid "+T.red,textAlign:"center",marginBottom:10}}>
              <div style={{fontSize:13,color:T.red,fontWeight:T.weight,marginBottom:10}}>Delete all data permanently?</div>
              <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                <button onClick={function(){setConfirmReset(false);}} style={{padding:"8px 24px",borderRadius:16,border:"1.5px solid "+T.border,background:"transparent",color:T.textMid,...F,fontSize:12,cursor:"pointer"}}>Cancel</button>
                <button onClick={resetStats} style={{padding:"8px 24px",borderRadius:16,border:"none",background:T.red,color:"#fff",...F,fontSize:12,cursor:"pointer"}}>Yes, Reset</button>
              </div>
            </div>
          }
        </>}
      </div>
    </div>;
  }

  // ═══════ DEBUG ═══════
  if(screen==="debug"&&debugData){
    var summary=debugSummary(debugData);
    var csv=debugToCSV(debugData);
    var dbCopied=false;
    return <div style={{minHeight:"100vh",background:T.bg,...F,padding:16,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:"100%",maxWidth:T.maxW}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <button onClick={function(){setScreen("menu");}} style={{background:"none",border:"none",color:T.textMid,fontSize:13,cursor:"pointer",...F}}>{"← Menu"}</button>
          <span style={{fontSize:15,color:T.text,...F}}>DEBUG REPORT</span>
          <div style={{width:40}}/>
        </div>
        <div style={{background:T.panel,borderRadius:10,padding:14,marginBottom:10,border:"1px solid "+T.border}}>
          <pre style={{fontSize:11,lineHeight:1.6,fontFamily:"monospace",fontWeight:500,color:T.text,whiteSpace:"pre-wrap",overflowX:"auto",margin:0}}>{summary}</pre>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <button onClick={function(){navigator.clipboard.writeText(summary).catch(function(){});}} style={{flex:1,padding:12,borderRadius:20,border:"1.5px solid "+T.border,cursor:"pointer",background:T.panel,color:T.text,...F,fontSize:13}}>Copy Summary</button>
          <button onClick={function(){navigator.clipboard.writeText(csv).catch(function(){});}} style={{flex:1,padding:12,borderRadius:20,border:"1.5px solid "+T.border,cursor:"pointer",background:T.panel,color:T.text,...F,fontSize:13}}>Copy CSV</button>
        </div>
        <div style={{background:T.panel,borderRadius:10,padding:14,marginBottom:10,border:"1px solid "+T.border,maxHeight:400,overflow:"auto"}}>
          <div style={{fontSize:10,fontWeight:T.weight,color:T.textDim,textTransform:"uppercase",marginBottom:8}}>Sample Hands (first 20)</div>
          {debugData.slice(0,20).map(function(r,idx){
            var bgCol=r.bestAction==="Fold"?T.red+"10":r.bestAction==="Call"||r.bestAction==="Check"?T.gold+"10":T.green+"10";
            return <div key={idx} style={{padding:"8px 10px",marginBottom:4,borderRadius:6,background:bgCol,fontSize:11,lineHeight:1.5,fontFamily:"monospace",fontWeight:500}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:T.text}}>{"#"+r.hand+" "+r.street+" | "+r.pos+" vs "+r.oppPos+" ("+r.oppType+")"}</span>
                <span style={{color:T.goldDark,fontWeight:700}}>{r.bestAction}</span>
              </div>
              <div style={{color:T.textMid}}>
                {r.cards+" on "+r.board+" | "+r.handCategory+" ("+r.handDesc+") | pot="+r.potSize+" bet="+r.betSize}
              </div>
              <div style={{color:T.textDim,fontSize:10}}>{r.explanation}</div>
            </div>;
          })}
        </div>
        <button onClick={function(){var r=debugRun(100,tableSize);setDebugData(r);}} style={{width:"100%",padding:12,borderRadius:20,border:"1.5px solid "+T.border,cursor:"pointer",background:T.panel,color:T.text,...F,fontSize:13,marginBottom:8}}>Re-run (100 hands)</button>
      </div>
    </div>;
  }

  // ═══════ SETTINGS ═══════
  if(screen==="settings"){
    var toggleSetting=function(key){
      setSettings(function(prev){
        var next={};for(var k in prev)next[k]=prev[k];
        next[key]=!prev[key];
        saveSettings(next);return next;
      });
    };
    var toggleStyle={display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0",borderBottom:"1px solid "+T.creamBorder};
    var toggleBtn=function(on){return {width:44,height:24,borderRadius:12,background:on?T.gold:T.border,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s"};};
    var toggleDot=function(on){return {position:"absolute",top:2,left:on?22:2,width:20,height:20,borderRadius:10,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",transition:"left 0.2s"};};

    return <div style={{minHeight:"100vh",background:T.bg,...F,padding:16,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:"100%",maxWidth:T.maxW}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <button onClick={function(){setScreen(scenario?"game":"menu");}} style={{background:"none",border:"none",color:T.textMid,fontSize:13,cursor:"pointer",...F}}>{"← Back"}</button>
          <span style={{fontSize:15,color:T.text,...F}}>SETTINGS</span>
          <div style={{width:40}}/>
        </div>
        <div style={{background:T.panel,borderRadius:12,padding:"4px 18px",border:"1px solid "+T.border}}>
          <div style={toggleStyle}>
            <div>
              <div style={{fontSize:14,color:T.text,...F}}>Show percentages</div>
              <div style={{fontSize:12,color:T.textDim,fontWeight:500,marginTop:2}}>Display equity and pot odds numbers in feedback</div>
            </div>
            <button onClick={function(){toggleSetting("showPct");}} style={toggleBtn(settings.showPct)}>
              <div style={toggleDot(settings.showPct)}/>
            </button>
          </div>
          <div style={{...toggleStyle,borderBottom:"none"}}>
            <div>
              <div style={{fontSize:14,color:T.text,...F}}>Show hand strength before decision</div>
              <div style={{fontSize:12,color:T.textDim,fontWeight:500,marginTop:2}}>Shows approximate equity before you act</div>
            </div>
            <button onClick={function(){toggleSetting("showPreEq");}} style={toggleBtn(settings.showPreEq)}>
              <div style={toggleDot(settings.showPreEq)}/>
            </button>
          </div>
        </div>
        <div style={{marginTop:16,fontSize:12,color:T.textDim,textAlign:"center",lineHeight:1.6,fontWeight:500}}>
          These are display preferences — they don't change difficulty.
        </div>
      </div>
    </div>;
  }

  // ═══════ GAME ═══════
  if(!scenario)return null;

  var seats=[];
  var n=positions.length;var pi=positions.indexOf(scenario.pos);
  for(var i=1;i<n;i++)seats.push(positions[(pi+i)%n]);

  var actions=getActs();
  var dh=sortH(scenario.playerHand);
  var isR=scenario.street==="river";
  var nota=hn(dh[0],dh[1]);

  var halfSeat=T.seat/2;

  // Determine what the table "bet row" should display
  // Post-flop: depends on scenario type
  var showOppAction=false;
  var oppBetAmount=0;
  var oppChecked=false;
  if(scenario.street!=="preflop"){
    if(scenario.postflopSit==="ip_vs_bet"||scenario.postflopSit==="oop_check_then_opp_bets"){
      showOppAction=true;oppBetAmount=scenario.betSize;
    }else if(scenario.postflopSit==="ip_vs_check"){
      showOppAction=true;oppChecked=true;
    }else{
      // oop_first_to_act: no opponent action to show
      showOppAction=false;
    }
  }

  return <div style={{minHeight:"100vh",background:T.bg,...F,padding:T.pagePad+"px 16px",display:"flex",flexDirection:"column",alignItems:"center"}}>
    <div style={{width:"100%",maxWidth:T.maxW}}>

      {/* HEADER */}
      <div style={{background:T.panel,borderRadius:T.headerR,padding:T.headerPad+"px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,border:"1px solid "+T.border}}>
        <button onClick={function(){setScreen("menu");}} style={{background:"none",border:"none",color:T.textMid,fontSize:12,cursor:"pointer",...F,padding:0}}>{"◂ MENU"}</button>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {[3,6].map(function(sz){return <button key={sz} onClick={function(){if(sz!==tableSize){setTableSize(sz);}}} style={{background:tableSize===sz?T.gold+"22":"transparent",border:tableSize===sz?"1px solid "+T.gold:"1px solid transparent",borderRadius:10,padding:"2px 8px",fontSize:10,color:tableSize===sz?T.goldDark:T.textDim,cursor:"pointer",...F}}>{sz}</button>;})}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span className={evPulse==="green"?"ev-pulse-green":evPulse==="red"?"ev-pulse-red":""} style={{fontSize:T.bankrollFont,fontWeight:800,color:stack>=100?T.goldDark:T.red,fontVariantNumeric:"tabular-nums",lineHeight:1,fontFamily:T.font,display:"inline-block"}}>{stack.toFixed(1)}</span>
          <Chip size={T.chipHeader}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:12,color:T.textDim}}>{"#"+handNum}</span>
          <button onClick={function(){persist(log);setScreen("stats");}} style={{background:"none",border:"none",color:T.textMid,fontSize:12,cursor:"pointer",...F,padding:0}}>{"STATS ▸"}</button>
        </div>
      </div>

      <div style={{height:T.gapToTable}}/>

      {/* WRAPPER: seats + table */}
      <div style={{position:"relative",marginBottom:halfSeat+22}}>

        {/* Opponent seats */}
        <div style={{position:"absolute",top:0,left:0,right:0,display:"flex",justifyContent:"space-around",padding:"0 32px",zIndex:2}}>
          {seats.map(function(p){
            var isOpp=p===scenario.oppPos;
            var col=isOpp?scenario.opp.color:"#3a4e68";
            var bCol=isOpp?scenario.opp.color:"#4a6888";
            return <div key={p} style={{display:"flex",flexDirection:"column",alignItems:"center",marginTop:-halfSeat}}>
              <div style={{width:T.seat,height:T.seat,borderRadius:T.seat/2,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isOpp?22:14,color:"#e8e4dc",fontWeight:T.weight,border:T.seatBorder+"px solid "+bCol}}>{isOpp?scenario.opp.emoji:"·"}</div>
              <span style={{fontSize:T.seatLabel,fontWeight:T.weight,color:T.pos[p]||T.textDim,marginTop:4}}>{p}</span>
            </div>;
          })}
        </div>

        {/* TABLE */}
        <div style={{height:TABLE_H,background:T.table,borderRadius:T.tableR,border:"3px solid "+T.tableBorder,boxShadow:"0 4px 24px rgba(0,0,0,0.12),inset 0 0 40px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:T.tableTopPad,paddingBottom:T.tableBotPad,paddingLeft:T.tablePadX,paddingRight:T.tablePadX}}>

          {/* Row 1: Bet/Check pill or first-to-act indicator */}
          <div style={{height:T.betRowH,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {scenario.street!=="preflop" ? (
              showOppAction ? (
                oppBetAmount>0 ?
                  <div style={{background:"rgba(0,0,0,0.2)",borderRadius:T.pillR,padding:T.pillPY+"px "+T.pillPX+"px",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14}}>{scenario.opp.emoji}</span>
                    <BV value={oppBetAmount} fs={T.betFont} color="#e0c880" cs={T.chipPot}/>
                  </div>
                :
                  <div style={{background:"rgba(0,0,0,0.2)",borderRadius:T.pillR,padding:T.pillPY+"px "+T.pillPX+"px",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:14}}>{scenario.opp.emoji}</span>
                    <span style={{fontSize:T.betFont,fontWeight:T.weight,color:"#8a9aaa",fontFamily:T.font,letterSpacing:"0.08em"}}>CHECK</span>
                  </div>
              ) : (
                <div style={{background:"rgba(0,0,0,0.15)",borderRadius:T.pillR,padding:T.pillPY+"px "+T.pillPX+"px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:T.betFont-1,fontWeight:T.weight,color:"#a0b0c0",fontFamily:T.font,letterSpacing:"0.06em"}}>YOUR ACTION</span>
                </div>
              )
            ) : null}
          </div>

          <div style={{height:T.innerGap,flexShrink:0}}/>

          {/* Row 2: Board cards or PREFLOP */}
          <div style={{height:T.boardRowH,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {scenario.board.length>0 ?
              <div style={{display:"flex",gap:T.bcGap}}>{scenario.board.map(function(c,i){return <CCard key={animKey+"-b"+i} card={c} board={true} animDelay={i*60}/>;})}</div>
            :
              <span style={{color:"#ffffffcc",fontSize:40,fontWeight:T.weight,letterSpacing:"0.15em",position:"relative",top:"-10px"}}>PREFLOP</span>
            }
          </div>

          <div style={{height:T.innerGap,flexShrink:0}}/>

          {/* Row 3: Pot pill */}
          <div style={{height:T.potRowH,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <div style={{background:"rgba(0,0,0,0.2)",borderRadius:T.pillR,padding:T.pillPY+"px "+T.pillPX+"px",display:"flex",alignItems:"center"}}>
              <BV value={scenario.potSize} fs={T.potFont} color="#e8d090" cs={T.chipPot}/>
            </div>
          </div>
        </div>

        {/* YOU seat */}
        <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",marginBottom:-45,zIndex:2}}>
          <div style={{width:T.seat,height:T.seat,borderRadius:T.seat/2,background:T.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:800,border:T.seatBorder+"px solid "+T.goldDark}}>YOU</div>
          <span style={{fontSize:T.seatLabel,fontWeight:T.weight,color:T.pos[scenario.pos]||T.gold,marginTop:4}}>{scenario.pos}</span>
        </div>

      </div>

      {/* NARRATIVE */}
      <div style={{height:T.narrH,background:T.panel,borderRadius:T.narrR,border:"1px solid "+T.border,marginBottom:T.gapNarrToHand,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:"1 1 auto",padding:"14px 18px",fontSize:T.narrFont,lineHeight:T.narrLineH,color:T.text,fontWeight:600,fontFamily:T.font,overflowY:"auto"}}>
          {phase==="action" ? <div>{(function(){
            var pN=scenario.pos,oE=scenario.opp.emoji,oN=scenario.opp.name;
            var oD=scenario.opp.id==="tight"?"who plays tight — mostly strong hands":scenario.opp.id==="aggro"?"who plays loose and bluffs often":"who plays a balanced, standard game";
            var oP=scenario.oppPos;
            var hI="";
            if(scenario.board.length>0){
              var info=classify(scenario.playerHand,scenario.board);
              var dt=(!isR&&info.draws.length>0)?", plus "+info.draws.map(function(d){return d.desc;}).join(" and "):"";
              hI=" You're holding "+info.handDesc.toLowerCase()+dt+".";
            }else{hI=" You're holding "+nota+".";}

            // Pre-decision equity hint
            var preEqLine=null;
            if(settings.showPreEq&&scenario.board.length>0){
              var pInfo=classify(scenario.playerHand,scenario.board);
              var pEq=Math.round(pInfo.strength*100);
              preEqLine=<div style={{fontSize:12,color:T.textDim,marginTop:6,fontWeight:500,fontStyle:"italic"}}>{"Hand strength: ~"+pEq+"% vs estimated range"}</div>;
            }

            // Preflop narratives (unchanged logic)
            if(scenario.street==="preflop"){
              if(scenario.preflopSit==="vs_raise")return <span>{"You're at "}<PB pos={pN}/>{". A "}<span style={{color:scenario.opp.color,fontWeight:T.weight}}>{oE+" "+oN}</span>{" player "+oD+" raises to "}<BV value={2.5} fs={14} color={T.goldDark} cs={16}/>{" from "}<PB pos={oP}/>{"."}{hI}</span>;
              return <span>{scenario.pos==="UTG"?"You're first to act at ":"It folds to you at "}<PB pos={pN}/>{". A "}<span style={{color:scenario.opp.color,fontWeight:T.weight}}>{oE+" "+oN}</span>{" player "+oD+" sits at "}<PB pos={oP}/>{"."}{hI}</span>;
            }

            // Post-flop narratives — position-aware
            var sn=SN[scenario.street].toLowerCase();
            var sit=scenario.postflopSit;

            if(sit==="ip_vs_bet"){
              return <span>{"It's the "}<span style={{color:T.goldDark,fontWeight:T.weight}}>{sn}</span>{". You're at "}<PB pos={pN}/>{". The "}<span style={{color:scenario.opp.color,fontWeight:T.weight}}>{oE+" "+oN}</span>{" player "+oD+" at "}<PB pos={oP}/>{" bets "}<BV value={scenario.betSize} fs={14} color={T.goldDark} cs={16}/>{" into a "}<BV value={scenario.potSize-scenario.betSize} fs={14} color={T.goldDark} cs={16}/>{" pot."}{hI}{preEqLine}</span>;
            }
            if(sit==="ip_vs_check"){
              return <span>{"It's the "}<span style={{color:T.goldDark,fontWeight:T.weight}}>{sn}</span>{". The "}<span style={{color:scenario.opp.color,fontWeight:T.weight}}>{oE+" "+oN}</span>{" player "+oD+" at "}<PB pos={oP}/>{" checks to you and you close the action at "}<PB pos={pN}/>{"."}{hI}{preEqLine}</span>;
            }
            if(sit==="oop_first_to_act"){
              return <span>{"It's the "}<span style={{color:T.goldDark,fontWeight:T.weight}}>{sn}</span>{". You're first to act at "}<PB pos={pN}/>{". A "}<span style={{color:scenario.opp.color,fontWeight:T.weight}}>{oE+" "+oN}</span>{" player "+oD+" sits at "}<PB pos={oP}/>{"."}{hI}{preEqLine}</span>;
            }
            if(sit==="oop_check_then_opp_bets"){
              return <span>{"It's the "}<span style={{color:T.goldDark,fontWeight:T.weight}}>{sn}</span>{". You checked at "}<PB pos={pN}/>{", and the "}<span style={{color:scenario.opp.color,fontWeight:T.weight}}>{oE+" "+oN}</span>{" player "+oD+" at "}<PB pos={oP}/>{" bets "}<BV value={scenario.betSize} fs={14} color={T.goldDark} cs={16}/>{" into a "}<BV value={scenario.potSize-scenario.betSize} fs={14} color={T.goldDark} cs={16}/>{" pot."}{hI}{preEqLine}</span>;
            }
            // Fallback (shouldn't hit)
            return <span>{"It's the "}<span style={{color:T.goldDark,fontWeight:T.weight}}>{sn}</span>{". You're at "}<PB pos={pN}/>{"."}{hI}</span>;
          })()}</div>
          : <>
            <div className="badge-anim" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{display:"inline-block",padding:"4px 12px",borderRadius:4,background:feedback.rating==="green"?T.green:feedback.rating==="yellow"?T.gold:T.red,color:"#fff",fontWeight:T.weight,fontSize:13}}>
                {feedback.rating==="green"?"✓ Correct":feedback.rating==="yellow"?"≈ Acceptable":"✗ Mistake"}
              </span>
              {feedback.evDiff!==0 && <span style={{fontWeight:T.weight,fontSize:14,color:feedback.evDiff>=0?T.green:T.red}}>{(feedback.evDiff>=0?"+":"")+feedback.evDiff.toFixed(1)+" EV"}</span>}
            </div>
            {feedback.rating!=="green" && <div className="fb-anim" style={{fontSize:14,color:T.goldDark,fontWeight:T.weight,marginBottom:6}}>{"Best: "+feedback.best}</div>}
            <div className="fb-anim" style={{fontSize:13.5,lineHeight:1.7,fontWeight:500,animationDelay:"80ms"}}><NT text={feedback.explanation}/></div>
          </>}
        </div>
      </div>

      {/* HAND + ACTIONS */}
      <div style={{display:"flex",gap:T.cardGap,width:"100%",alignItems:"flex-start"}}>
        <div style={{flex:"0 0 "+T.cardSplit*100+"%",display:"flex",gap:T.cardGap,justifyContent:"center"}}>
          {dh.map(function(c,i){return <CCard key={animKey+"-h"+i} card={c} animDelay={200+i*80}/>;})}
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
          {phase==="action" ? actions.map(function(a){
            var passive=a==="Fold"||a==="Check";
            return <button key={a} onClick={function(){act(a);}} style={{padding:T.btnPadY+"px 4px",borderRadius:T.btnR,cursor:"pointer",border:passive?"2px solid "+T.border:"2px solid transparent",background:passive?"transparent":T.gold,color:passive?T.textMid:"#fff",...F,fontSize:T.btnFont,letterSpacing:"0.04em",transition:"transform 0.1s, background 0.2s, border-color 0.2s",...(btnFlash&&btnFlash.action===a?{background:btnFlash.rating==="green"?T.green:btnFlash.rating==="yellow"?T.gold:T.red,color:"#fff",borderColor:"transparent"}:{})}} onMouseDown={function(e){e.currentTarget.style.transform="scale(0.95)";}} onMouseUp={function(e){e.currentTarget.style.transform="scale(1)";}} onMouseLeave={function(e){e.currentTarget.style.transform="scale(1)";}}>{a.toUpperCase()}</button>;
          }) : <button onClick={goNext} style={{padding:"12px 4px",borderRadius:T.btnR,cursor:"pointer",border:"2px solid "+T.border,background:"transparent",color:T.text,...F,fontSize:T.btnFont}}>{"NEXT →"}</button>}
        </div>
      </div>

    </div>
    <style>{["*{box-sizing:border-box;margin:0;padding:0}","::-webkit-scrollbar{width:4px}","::-webkit-scrollbar-track{background:transparent}","::-webkit-scrollbar-thumb{background:"+T.border+";border-radius:2px}",
    "@keyframes cardIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}",
    "@keyframes boardIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}",
    "@keyframes fadeSlideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}",
    "@keyframes badgePop{0%{transform:scale(0.85)}60%{transform:scale(1.06)}100%{transform:scale(1)}}",
    "@keyframes evPulseGreen{0%{transform:scale(1)}50%{transform:scale(1.12);color:"+T.green+"}100%{transform:scale(1)}}",
    "@keyframes evPulseRed{0%{transform:scale(1)}50%{transform:scale(1.12);color:"+T.red+"}100%{transform:scale(1)}}",
    "@keyframes btnPress{0%{transform:scale(1)}50%{transform:scale(0.95)}100%{transform:scale(1)}}",
    ".card-anim{animation:cardIn 0.3s ease-out both}",
    ".board-anim{animation:boardIn 0.25s ease-out both}",
    ".fb-anim{animation:fadeSlideIn 0.3s ease-out both}",
    ".badge-anim{animation:badgePop 0.35s ease-out both}",
    ".ev-pulse-green{animation:evPulseGreen 0.5s ease-out}",
    ".ev-pulse-red{animation:evPulseRed 0.5s ease-out}",
    ".btn-press{animation:btnPress 0.15s ease-out}",
    ].join("")}</style>
  </div>;
}
