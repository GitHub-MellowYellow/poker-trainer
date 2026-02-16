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

  // Table — FIXED dimensions, never changes
  tableR: 55,
  tablePadX: 24,
  // Internal fixed heights for table rows (top to bottom):
  // [opponents overlap top edge]
  // row1: bet/check pill = 36px
  // gap1: 12px
  // row2: board cards = 100px
  // gap2: 12px
  // row3: pot pill = 36px
  // [YOU overlaps bottom edge]
  betRowH: 36,
  boardRowH: 100,
  potRowH: 36,
  innerGap: 12,
  // Derived: total inner = 36+12+100+12+36 = 196
  // Plus padding for circles: top 60, bottom 60
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

// Computed table height
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
var OPP = [
  { id:"tight", name:"Careful", emoji:"🛡️", color:T.oppTight },
  { id:"neutral", name:"Regular", emoji:"⚖️", color:T.oppNeutral },
  { id:"aggro", name:"Aggro", emoji:"🔥", color:T.oppAggro },
];

// Ranges
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
// EVALUATOR
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
// CLASSIFY
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
    else if(hv[0]>=12){cat="weak";str=0.1;desc="Overcards";}
    else{cat="trash";str=0.06;desc="Nothing";}
  }

  var db=0;
  if(dr.some(function(d){return d.type==="flush draw";}))db+=0.12;
  if(dr.some(function(d){return d.type==="OESD";}))db+=0.10;
  if(dr.some(function(d){return d.type==="gutshot";}))db+=0.05;
  return{category:cat,strength:Math.min(str+db,1),handDesc:desc,draws:dr,drawOuts:dO,ev:ev,holeVals:hv,boardVals:bv};
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO
// ═══════════════════════════════════════════════════════════════

function genScenario(positions){
  var sw=[{s:"preflop",w:0.3},{s:"flop",w:0.35},{s:"turn",w:0.25},{s:"river",w:0.1}];
  var r=Math.random(),c=0,street="flop";
  for(var i=0;i<sw.length;i++){c+=sw[i].w;if(r<c){street=sw[i].s;break;}}
  var pos=positions[0|Math.random()*positions.length];
  var opp=OPP[0|Math.random()*OPP.length];
  var op=positions.filter(function(p){return p!==pos;});
  var oppPos=op[0|Math.random()*op.length]||"BTN";
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
  var used={};pH.concat(oH,board).forEach(function(x){used[x.rank+x.suit]=1;});
  var rem=mkDeck().filter(function(x){return !used[x.rank+x.suit];});
  var pfSit="open";
  if(street==="preflop"){if(pos==="BB"||pos==="SB")pfSit=Math.random()<0.5?"vs_raise":"open";else pfSit=Math.random()<0.25?"vs_raise":"open";}
  var potSize,betSize;
  if(street==="preflop"){if(pfSit==="vs_raise"){potSize=3.5;betSize=2.5;}else{potSize=1.5;betSize=0;}}
  else{potSize=4+(0|Math.random()*12);if(Math.random()<0.5){var sz=[0.33,0.5,0.66,0.75][0|Math.random()*4];betSize=Math.max(2,Math.round(potSize*sz));potSize+=betSize;}else betSize=0;}
  return{street:street,pos:pos,opp:opp,oppPos:oppPos,playerHand:pH,oppHand:oH,board:board,remaining:rem,potSize:potSize,betSize:betSize,preflopSit:pfSit};
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE
// ═══════════════════════════════════════════════════════════════

function buildNarr(best,info,opp,street,pot,bet,board){
  var on=opp.name,isR=street==="river",fb=bet>0;
  var bt=board.map(cstr).join(" ");
  var ad=isR?[]:info.draws;
  var dt=ad.map(function(d){return d.desc;}).join(" and ");
  var ao=isR?0:info.drawOuts;
  var oc=opp.id==="tight"?on+" opponents rarely bluff.":opp.id==="aggro"?on+" opponents bluff often, so their bets are less reliable.":on+" opponents play standard ranges.";
  var n="";
  if(fb){
    var pov=Math.round(bet/(pot+bet)*100);
    var nt="You need "+pov+"% equity to call (pot "+pot+"BB, bet "+bet+"BB).";
    if(best==="Fold"){
      if(ao>0){var eq=Math.round(outsEq(ao,street)*100);n="You have "+info.handDesc+" with "+dt+" ("+ao+" outs, ~"+eq+"% equity). "+nt+" Not enough. "+oc+" Fold.";}
      else if(isR){n="River: "+info.handDesc+" on ["+bt+"]. No cards to come. "+oc+" Fold.";}
      else{n=info.handDesc+" with no draw. "+nt+" "+oc+" Fold.";}
    }else if(best==="Call"){
      if(ao>=6){var eq2=Math.round(outsEq(ao,street)*100);n=info.handDesc+" plus "+dt+" ("+ao+" outs, ~"+eq2+"% equity). "+nt+" Equity exceeds price. Profitable call. "+oc;}
      else if(info.category==="marginal"||info.category==="good"){n=info.handDesc+" is medium-strength on ["+bt+"]. Beats enough of their range to call. "+oc;}
      else if(opp.id==="aggro"){n=info.handDesc+" acts as a bluff-catcher vs "+on+" opponents. "+nt;}
      else{n=info.handDesc+" is sufficient to call. "+nt+" "+oc;}
    }else if(best==="Raise"){n=info.handDesc+" is strong on ["+bt+"]. Raise for value. "+oc;}
  }else{
    if(best==="Bet"){
      if(ad.length>0&&["good","strong","monster"].indexOf(info.category)===-1){n="Checked to you. "+info.handDesc+" with "+dt+". Good semi-bluff: take it now or improve with "+ao+" outs. "+oc;}
      else{n="Checked to you. "+info.handDesc+" on ["+bt+"] is strong enough to bet for value. "+oc;}
    }else if(best==="Check"){n="Checked to you. "+info.handDesc+" on ["+bt+"]. Too weak to bet for value. "+(isR?"Check and see showdown.":"Check and see next card free.")+" "+oc;}
  }
  return n;
}

// ═══════════════════════════════════════════════════════════════
// EVALUATORS
// ═══════════════════════════════════════════════════════════════

function evalPre(action,nota,pos,sit){
  var best,acc,expl;
  var pl=P6.indexOf("BB")-P6.indexOf(pos);
  if(sit==="open"){
    var range=OPEN[pos];if(!range)return{rating:"green",best:action,acceptable:[action],explanation:"",evDiff:0};
    if(range.has(nota)){best="Raise";acc=["Raise"];expl=nota+" is in "+pos+" opening range ("+pl+" players behind). Open-raise for value and initiative. Folding forfeits a +EV spot.";}
    else{best="Fold";acc=["Fold"];expl=nota+" is outside "+pos+" opening range. With "+pl+" players behind, risk is too high.";}
  }else{
    var ranges=pos==="BB"?BB_VS:pos==="SB"?SB_VS:null;
    if(ranges){
      if(ranges.threebet.has(nota)){best="3-Bet";acc=["3-Bet"];expl=nota+" is premium enough to 3-bet from "+pos+". Build a bigger pot with your equity advantage.";}
      else if(ranges.call.has(nota)){best="Call";acc=["Call"];expl=nota+" defends from "+pos+" but isn't premium enough to 3-bet. Call to see a flop.";}
      else{best="Fold";acc=["Fold"];expl=nota+" can't profitably defend from "+pos+" vs a raise.";}
    }else{
      if(["AA","KK","QQ","JJ","AKs","AKo"].indexOf(nota)!==-1){best="3-Bet";acc=["3-Bet","Call"];expl=nota+" is premium. 3-bet to build the pot.";}
      else if(OPEN[pos]&&OPEN[pos].has(nota)){best="Call";acc=["Call","Fold"];expl=nota+" is borderline vs a raise from "+pos+". Calling is fine.";}
      else{best="Fold";acc=["Fold"];expl=nota+" is too weak vs a raise from "+pos+".";}
    }
  }
  var rating=action===best?"green":acc.indexOf(action)!==-1?"yellow":"red";
  var evDiff=rating==="red"?(best==="Fold"&&action!=="Fold"?-2.5:-1.5):rating==="yellow"?-0.3:0;
  return{rating:rating,best:best,acceptable:acc,explanation:expl,evDiff:evDiff};
}

function evalPost(action,hole,board,pot,bet,opp,street){
  var info=classify(hole,board);var dO=info.drawOuts;
  var eq=outsEq(dO,street);var on=potOdds(pot,bet);
  var isR=street==="river";var best,acc;
  if(bet>0){
    if(info.strength>=0.55){best="Raise";acc=["Raise","Call"];}
    else if(info.strength>=0.30){best="Call";acc=["Call"];}
    else if(!isR&&dO>=8&&(info.strength+eq*0.6)>=on){best="Call";acc=["Call"];}
    else if(!isR&&dO>=4&&(info.strength+eq*0.6)>=on){best="Call";acc=["Call","Fold"];}
    else if(opp.id==="aggro"&&isR&&info.strength>=0.18){best="Call";acc=["Call","Fold"];}
    else{best="Fold";acc=["Fold"];}
  }else{
    if(info.strength>=0.40){best="Bet";acc=["Bet","Check"];}
    else if(!isR&&info.draws.length>0&&dO>=6){best="Bet";acc=["Bet","Check"];}
    else{best="Check";acc=["Check"];}
  }
  var rating=action===best?"green":acc.indexOf(action)!==-1?"yellow":"red";
  var evDiff=0;
  if(rating==="red"){if(best==="Fold"&&action!=="Fold")evDiff=-(bet||Math.round(pot*0.5));else if(action==="Fold"&&best!=="Fold")evDiff=-Math.round(pot*0.15);else evDiff=-Math.round(pot*0.1);}
  else if(rating==="yellow")evDiff=-Math.round(pot*0.03);
  var explanation=buildNarr(best,info,opp,street,pot,bet,board);
  return{rating:rating,best:best,acceptable:acc,explanation:explanation,evDiff:evDiff,info:info};
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

var SK="poker-trainer-data";
function loadLocal(){try{var r=localStorage.getItem(SK);return r?JSON.parse(r):null;}catch(e){return null;}}
function saveLocal(d){try{if(d)localStorage.setItem(SK,JSON.stringify(d));else localStorage.removeItem(SK);}catch(e){}}

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
    {re:/(\d+%\s*equity)/gi,t:"hl"},
    {re:/(flush draw|straight draw|open-ended|gutshot|OESD)/gi,t:"hl"},
    {re:/(overpair|top pair|two pair|three of a kind|full house|flush|straight|bottom pair|middle pair|underpair|ace high|overcards|pocket pair|high card)/gi,t:"hl"},
    {re:/(semi-bluff|bluff-catcher|profitable|\+EV)/gi,t:"hl"},
    {re:/\b(Fold|Call|Raise|3-Bet|Check|Bet)\b/g,t:"hl"},
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
  var fileRef=useRef(null);
  var positions=tableSize===6?P6:P3;
  var F={fontFamily:T.font,fontWeight:T.weight};

  var persist=useCallback(function(sl){
    if(!sl.length)return;
    setLT(function(p){var m={totalHands:p.totalHands+sl.length,greens:p.greens+sl.filter(function(e){return e.rating==="green";}).length,yellows:p.yellows+sl.filter(function(e){return e.rating==="yellow";}).length,reds:p.reds+sl.filter(function(e){return e.rating==="red";}).length,totalEv:p.totalEv+sl.reduce(function(s,e){return s+e.ev;},0),sessions:p.sessions+1};saveLocal(m);return m;});
  },[]);
  var start=useCallback(function(){if(log.length>0)persist(log);setLog([]);setStack(100);setHN(1);setSc(genScenario(positions));setPhase("action");setFB(null);setScreen("game");},[positions,log,persist]);
  var goNext=useCallback(function(){setHN(function(h){return h+1;});setSc(genScenario(positions));setPhase("action");setFB(null);},[positions]);

  var act=useCallback(function(action){
    if(!scenario)return;
    var n=hn(scenario.playerHand[0],scenario.playerHand[1]);
    var ev;
    if(scenario.street==="preflop")ev=evalPre(action,n,scenario.pos,scenario.preflopSit);
    else ev=evalPost(action,scenario.playerHand,scenario.board,scenario.potSize,scenario.betSize,scenario.opp,scenario.street);
    setFB(ev);setPhase("feedback");setStack(function(s){return s+ev.evDiff;});
    setLog(function(p){return p.concat([{hand:handNum,pos:scenario.pos,cards:n,board:scenario.board.length>0?scenario.board.map(cstr).join(" "):"--",pot:scenario.potSize.toFixed(1),bet:scenario.betSize>0?scenario.betSize.toFixed(1):"--",street:SN[scenario.street],situation:scenario.street==="preflop"?scenario.preflopSit:(scenario.betSize>0?"vs bet":"checked to"),opp:scenario.opp.name,action:action,correct:ev.best,rating:ev.rating,ev:ev.evDiff}]);});
  },[scenario,handNum]);

  var getActs=function(){
    if(!scenario)return[];
    if(scenario.street==="preflop")return scenario.preflopSit==="vs_raise"?["Fold","Call","3-Bet"]:["Fold","Raise"];
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

  // CSV export via clipboard (Blob not available in sandbox)
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

  // Card component
  function CCard(props){
    var card=props.card,isBoard=props.board;
    var col=SC[card.suit];var rank=RD[card.rank]||card.rank;
    if(isBoard){
      return <div style={{width:T.bcW,height:T.bcH,borderRadius:T.bcR,background:T.cream,border:"1.5px solid "+T.creamBorder,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:T.font,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
        <span style={{fontSize:T.bcRank,fontWeight:800,color:col,lineHeight:1}}>{rank}</span>
        <span style={{fontSize:T.bcSuit,color:col,lineHeight:1,marginTop:2}}>{card.suit}</span>
      </div>;
    }
    return <div style={{width:T.cardW,height:T.cardH,borderRadius:T.cardR,background:T.cream,border:"2px solid "+T.creamBorder,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:T.font,boxShadow:"0 4px 16px rgba(0,0,0,0.1)",gap:2}}>
      <span style={{fontSize:rank.length>1?T.cardRank10:T.cardRank,fontWeight:800,color:col,lineHeight:1}}>{rank}</span>
      <span style={{fontSize:T.cardSuit,color:col,lineHeight:1}}>{card.suit}</span>
    </div>;
  }

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
        <button onClick={start} style={{padding:"16px 56px",borderRadius:24,border:"none",cursor:"pointer",background:T.gold,color:"#fff",...F,fontSize:16}}>DEAL</button>
        {log.length>0 && <button onClick={function(){persist(log);setScreen("stats");}} style={{display:"block",margin:"16px auto 0",padding:"8px 22px",borderRadius:16,border:"1.5px solid "+T.border,background:"transparent",color:T.textMid,...F,fontSize:12,cursor:"pointer"}}>{"Session Stats ("+log.length+") →"}</button>}
        {lifetime.totalHands>0 && <div style={{marginTop:24,fontSize:12,color:T.textDim,...F}}>{lifetime.totalHands+" hands · "+Math.round(lifetime.greens/lifetime.totalHands*100)+"% · "+lifetime.sessions+" sessions"}</div>}
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

  // ═══════ GAME ═══════
  if(!scenario)return null;

  var seats=[];
  var n=positions.length;var pi=positions.indexOf(scenario.pos);
  for(var i=1;i<n;i++)seats.push(positions[(pi+i)%n]);

  var actions=getActs();
  var dh=sortH(scenario.playerHand);
  var isR=scenario.street==="river";
  var nota=hn(dh[0],dh[1]);

  // Table is fixed height. Circles are positioned OUTSIDE the table div.
  // Opponent circles: their center = table top edge
  // YOU circle: its center = table bottom edge
  var halfSeat=T.seat/2;

  return <div style={{minHeight:"100vh",background:T.bg,...F,padding:T.pagePad+"px 16px",display:"flex",flexDirection:"column",alignItems:"center"}}>
    <div style={{width:"100%",maxWidth:T.maxW}}>

      {/* HEADER */}
      <div style={{background:T.panel,borderRadius:T.headerR,padding:T.headerPad+"px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,border:"1px solid "+T.border}}>
        <button onClick={function(){setScreen("menu");}} style={{background:"none",border:"none",color:T.textMid,fontSize:12,cursor:"pointer",...F,padding:0}}>{"◂ MENU"}</button>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:T.bankrollFont,fontWeight:800,color:stack>=100?T.goldDark:T.red,fontVariantNumeric:"tabular-nums",lineHeight:1,fontFamily:T.font}}>{stack.toFixed(1)}</span>
          <Chip size={T.chipHeader}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:12,color:T.textDim}}>{"#"+handNum}</span>
          <button onClick={function(){persist(log);setScreen("stats");}} style={{background:"none",border:"none",color:T.textMid,fontSize:12,cursor:"pointer",...F,padding:0}}>{"STATS ▸"}</button>
        </div>
      </div>

      <div style={{height:T.gapToTable}}/>

      {/* WRAPPER: seats + table in one relative container */}
      <div style={{position:"relative",marginBottom:halfSeat+22}}>

        {/* Opponent seats — positioned above table, circle center on table top */}
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

        {/* TABLE — fixed height */}
        <div style={{height:TABLE_H,background:T.table,borderRadius:T.tableR,border:"3px solid "+T.tableBorder,boxShadow:"0 4px 24px rgba(0,0,0,0.12),inset 0 0 40px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:T.tableTopPad,paddingBottom:T.tableBotPad,paddingLeft:T.tablePadX,paddingRight:T.tablePadX}}>

          {/* Row 1: Bet/Check pill */}
          <div style={{height:T.betRowH,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {scenario.street!=="preflop" ? (
              scenario.betSize>0 ?
                <div style={{background:"rgba(0,0,0,0.2)",borderRadius:T.pillR,padding:T.pillPY+"px "+T.pillPX+"px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14}}>{scenario.opp.emoji}</span>
                  <BV value={scenario.betSize} fs={T.betFont} color="#e0c880" cs={T.chipPot}/>
                </div>
              :
                <div style={{background:"rgba(0,0,0,0.2)",borderRadius:T.pillR,padding:T.pillPY+"px "+T.pillPX+"px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14}}>{scenario.opp.emoji}</span>
                  <span style={{fontSize:T.betFont,fontWeight:T.weight,color:"#8a9aaa",fontFamily:T.font,letterSpacing:"0.08em"}}>CHECK</span>
                </div>
            ) : null}
          </div>

          <div style={{height:T.innerGap,flexShrink:0}}/>

          {/* Row 2: Board cards or PREFLOP */}
          <div style={{height:T.boardRowH,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {scenario.board.length>0 ?
              <div style={{display:"flex",gap:T.bcGap}}>{scenario.board.map(function(c,i){return <CCard key={i} card={c} board={true}/>;})}</div>
            :
              <span style={{color:"#ffffffcc",fontSize:40,fontWeight:T.weight,letterSpacing:"0.15em",position: "relative",top: "-10px"}}>PREFLOP</span>
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

        {/* YOU — positioned below table, circle center on table bottom */}
        <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",marginBottom:-45,zIndex:2}}>
          <div style={{width:T.seat,height:T.seat,borderRadius:T.seat/2,background:T.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:800,border:T.seatBorder+"px solid "+T.goldDark}}>YOU</div>
          <span style={{fontSize:T.seatLabel,fontWeight:T.weight,color:T.pos[scenario.pos]||T.gold,marginTop:4}}>{scenario.pos}</span>
        </div>

      </div>{/* end wrapper */}

      {/* NARRATIVE */}
      <div style={{height:T.narrH,background:T.panel,borderRadius:T.narrR,border:"1px solid "+T.border,marginBottom:T.gapNarrToHand,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:"1 1 auto",padding:"14px 18px",fontSize:T.narrFont,lineHeight:T.narrLineH,color:T.text,fontWeight:600,fontFamily:T.font,overflowY:"auto"}}>
          {phase==="action" ? <div>{(function(){
            var pN=scenario.pos,oE=scenario.opp.emoji,oN=scenario.opp.name;
            var oD=scenario.opp.id==="tight"?"who plays few hands":scenario.opp.id==="aggro"?"who bets wide and bluffs often":"who plays a balanced game";
            var oP=scenario.oppPos;
            var hI="";
            if(scenario.board.length>0){
              var info=classify(scenario.playerHand,scenario.board);
              var dt=(!isR&&info.draws.length>0)?", plus "+info.draws.map(function(d){return d.desc;}).join(" and "):"";
              hI=" You're holding "+info.handDesc.toLowerCase()+dt+".";
            }else{hI=" You're holding "+nota+".";}
            if(scenario.street==="preflop"){
              if(scenario.preflopSit==="vs_raise")return <span>{"You're at "}<PB pos={pN}/>{". A "}<span style={{color:scenario.opp.color,fontWeight:T.weight}}>{oE+" "+oN}</span>{" player "+oD+" raises to "}<BV value={2.5} fs={14} color={T.goldDark} cs={16}/>{" from "}<PB pos={oP}/>{"."}{hI}</span>;
              return <span>{"You're at "}<PB pos={pN}/>{", first to act. A "}<span style={{color:scenario.opp.color,fontWeight:T.weight}}>{oE+" "+oN}</span>{" player "+oD+" sits at "}<PB pos={oP}/>{"."}{hI}</span>;
            }
            var sn=SN[scenario.street].toLowerCase();
            if(scenario.betSize>0)return <span>{"It's the "}<span style={{color:T.goldDark,fontWeight:T.weight}}>{sn}</span>{". You're at "}<PB pos={pN}/>{" and a "}<span style={{color:scenario.opp.color,fontWeight:T.weight}}>{oE+" "+oN}</span>{" player "+oD+" at "}<PB pos={oP}/>{" bets "}<BV value={scenario.betSize} fs={14} color={T.goldDark} cs={16}/>{" into a "}<BV value={scenario.potSize} fs={14} color={T.goldDark} cs={16}/>{" pot."}{hI}</span>;
            return <span>{"It's the "}<span style={{color:T.goldDark,fontWeight:T.weight}}>{sn}</span>{". You're at "}<PB pos={pN}/>{". A "}<span style={{color:scenario.opp.color,fontWeight:T.weight}}>{oE+" "+oN}</span>{" player "+oD+" at "}<PB pos={oP}/>{" checks to you."}{hI}</span>;
          })()}</div>
          : <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{display:"inline-block",padding:"4px 12px",borderRadius:4,background:feedback.rating==="green"?T.green:feedback.rating==="yellow"?T.gold:T.red,color:"#fff",fontWeight:T.weight,fontSize:13}}>
                {feedback.rating==="green"?"✓ Correct":feedback.rating==="yellow"?"≈ Acceptable":"✗ Mistake"}
              </span>
              {feedback.evDiff!==0 && <span style={{fontWeight:T.weight,fontSize:14,color:feedback.evDiff>=0?T.green:T.red}}>{(feedback.evDiff>=0?"+":"")+feedback.evDiff.toFixed(1)+" EV"}</span>}
            </div>
            {feedback.rating!=="green" && <div style={{fontSize:14,color:T.goldDark,fontWeight:T.weight,marginBottom:6}}>{"Best: "+feedback.best}</div>}
            <div style={{fontSize:13.5,lineHeight:1.7,fontWeight:500}}><NT text={feedback.explanation}/></div>
          </>}
        </div>
      </div>

      {/* HAND + ACTIONS */}
      <div style={{display:"flex",gap:T.cardGap,width:"100%",alignItems:"flex-start"}}>
        <div style={{flex:"0 0 "+T.cardSplit*100+"%",display:"flex",gap:T.cardGap,justifyContent:"center"}}>
          {dh.map(function(c,i){return <CCard key={i} card={c}/>;})}
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
          {phase==="action" ? actions.map(function(a){
            var passive=a==="Fold"||a==="Check";
            return <button key={a} onClick={function(){act(a);}} style={{padding:T.btnPadY+"px 4px",borderRadius:T.btnR,cursor:"pointer",border:passive?"2px solid "+T.border:"2px solid transparent",background:passive?"transparent":T.gold,color:passive?T.textMid:"#fff",...F,fontSize:T.btnFont,letterSpacing:"0.04em"}}>{a.toUpperCase()}</button>;
          }) : <button onClick={goNext} style={{padding:"12px 4px",borderRadius:T.btnR,cursor:"pointer",border:"2px solid "+T.border,background:"transparent",color:T.text,...F,fontSize:T.btnFont}}>{"NEXT →"}</button>}
        </div>
      </div>

    </div>
    <style>{["*{box-sizing:border-box;margin:0;padding:0}","::-webkit-scrollbar{width:4px}","::-webkit-scrollbar-track{background:transparent}","::-webkit-scrollbar-thumb{background:"+T.border+";border-radius:2px}"].join("")}</style>
  </div>;
}
