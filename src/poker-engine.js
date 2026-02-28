// ═══════════════════════════════════════════════════════════════
// POKER ENGINE — pure JS, no React dependency
// Hand evaluation, draws, board texture, classification,
// Monte Carlo equity, scenario generation, evaluators,
// narrative builder, and debug harness.
// ═══════════════════════════════════════════════════════════════

import { SUITS, RANKS, RV, RD, RN, P6, P3, SN, POSTFLOP_ORDER, OPP, OPEN, BB_VS, SB_VS } from "./poker-data.js";
import { buildNarrative, buildPreNarrative } from "./narrative.js";

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════

export function shuffle(a){var r=a.slice();for(var i=r.length-1;i>0;i--){var j=0|Math.random()*(i+1);var t=r[i];r[i]=r[j];r[j]=t;}return r;}
export function mkDeck(){var d=[];for(var i=0;i<SUITS.length;i++)for(var j=0;j<RANKS.length;j++)d.push({rank:RANKS[j],suit:SUITS[i]});return d;}
export function cstr(c){return(RD[c.rank]||c.rank)+c.suit;}
export function hn(c1,c2){var v1=RV[c1.rank],v2=RV[c2.rank];var hi=v1>=v2?c1:c2,lo=v1>=v2?c2:c1;if(hi.rank===lo.rank)return hi.rank+lo.rank;return hi.rank+lo.rank+(hi.suit===lo.suit?"s":"o");}
export function sortH(h){return h.slice().sort(function(a,b){return RV[b.rank]-RV[a.rank];});}

// seedable PRNG (mulberry32)
function mulberry32(seed){
  var s=seed|0;
  return function(){
    s=s+0x6D2B79F5|0;
    var t=Math.imul(s^(s>>>15),1|s);
    t=t+Math.imul(t^(t>>>7),61|t)^t;
    return((t^(t>>>14))>>>0)/4294967296;
  };
}
function seededShuffle(a,rng){var r=a.slice();for(var i=r.length-1;i>0;i--){var j=0|rng()*(i+1);var t=r[i];r[i]=r[j];r[j]=t;}return r;}
export function encodeSeed(seed){return(seed>>>0).toString(36).toUpperCase().padStart(7,"0");}
export function decodeSeed(code){return parseInt(code,36)|0;}

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

export function evalH(cards){
  if(cards.length<5)return{rank:-1,name:"--",score:-1};
  var c=combos(cards,5);var b={rank:-1,score:-1};
  for(var i=0;i<c.length;i++){var e=eval5(c[i]);if(e.score>b.score)b=e;}
  return b;
}

// ═══════════════════════════════════════════════════════════════
// DRAWS
// ═══════════════════════════════════════════════════════════════

export function detectDraws(hole,board){
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

export function totalOuts(dr){if(!dr.length)return 0;var t=0;for(var i=0;i<dr.length;i++)t+=dr[i].outs;if(dr.some(function(d){return d.type==="flush draw";})&&dr.some(function(d){return d.type==="OESD"||d.type==="gutshot";}))t-=2;return Math.max(t,0);}
export function outsEq(outs,st){if(st==="flop")return Math.min(outs*4-Math.max(outs-8,0),80)/100;return Math.min(outs*2,50)/100;}
export function potOdds(pot,bet){return bet<=0?0:bet/(pot+bet);}

// ═══════════════════════════════════════════════════════════════
// BOARD TEXTURE ANALYSIS
// ═══════════════════════════════════════════════════════════════

export function analyzeBoard(board){
  if(!board||board.length===0)return{texture:"none",desc:""};
  var bv=board.map(function(c){return RV[c.rank];}).sort(function(a,b){return b-a;});
  var bs=board.map(function(c){return c.suit;});

  var suitCounts={};bs.forEach(function(s){suitCounts[s]=(suitCounts[s]||0)+1;});
  var maxSuit=Math.max.apply(null,Object.values(suitCounts));
  var flushDraw=maxSuit>=3;
  var flushComplete=maxSuit>=5||(board.length>=5&&maxSuit>=3);
  var monotone=maxSuit>=4||(board.length===3&&maxSuit===3);

  var unique=[];var seen={};bv.forEach(function(v){if(!seen[v]){unique.push(v);seen[v]=1;}});
  unique.sort(function(a,b){return a-b;});
  if(seen[14])unique.unshift(1);
  var maxConn=1,cur=1;
  for(var i=1;i<unique.length;i++){
    if(unique[i]-unique[i-1]<=2)cur++;else cur=1;
    if(cur>maxConn)maxConn=cur;
  }
  var connected=maxConn>=3;

  // Straight detection: check if 3+ board cards fall within any 5-rank window
  var straightPossible=false,straightComplete=false;
  var consec=1,maxConsec=1;
  for(var si=1;si<unique.length;si++){
    if(unique[si]-unique[si-1]===1){consec++;if(consec>maxConsec)maxConsec=consec;}
    else{consec=1;}
  }
  if(maxConsec>=3)straightComplete=true;
  // Check for 3+ cards in a 5-rank window (straight possible even with gaps)
  for(var w=1;w<=10;w++){
    var cnt=0;
    for(var ui=0;ui<unique.length;ui++){if(unique[ui]>=w&&unique[ui]<w+5)cnt++;}
    if(cnt>=3){straightPossible=true;break;}
  }

  var rankCounts={};bv.forEach(function(v){rankCounts[v]=(rankCounts[v]||0)+1;});
  var paired=Object.values(rankCounts).some(function(c){return c>=2;});

  var highCards=bv.filter(function(v){return v>=10;}).length;
  var highBoard=highCards>=2;

  var wetFactors=0;
  if(flushDraw)wetFactors+=2;
  if(monotone)wetFactors+=1;
  if(connected)wetFactors+=2;
  if(straightComplete)wetFactors+=2;
  else if(straightPossible)wetFactors+=1;
  if(highBoard)wetFactors+=1;
  if(paired)wetFactors-=1;

  var texture,desc,reasons=[];
  if(wetFactors>=5){
    texture="very_wet";
    if(monotone)reasons.push("monotone");
    else if(flushDraw)reasons.push("flush possible");
    if(straightComplete)reasons.push("straight on board");
    else if(connected)reasons.push("connected");
    desc="Very wet board ("+reasons.join(", ")+") — flush and straight draws everywhere.";
  }else if(wetFactors>=3){
    texture="wet";
    if(flushDraw)reasons.push("flush possible");
    if(connected)reasons.push("connected");
    else if(straightPossible)reasons.push("straight possible");
    if(highBoard)reasons.push("high cards");
    desc="Wet board ("+reasons.join(", ")+") — draws present, strong hands need protection.";
  }else if(wetFactors>=1){
    texture="medium";
    if(flushDraw)reasons.push("flush possible");
    if(straightPossible)reasons.push("straight possible");
    if(connected)reasons.push("connected");
    if(highBoard&&!flushDraw&&!straightPossible&&!connected)reasons.push("broadway cards");
    desc="Mixed board"+(reasons.length?" ("+reasons.join(", ")+")":"")+" — some coordination, not dominant.";
  }else if(paired){
    texture="very_dry";
    reasons.push("paired");
    if(!connected&&!straightPossible)reasons.push("disconnected");
    if(!flushDraw)reasons.push("rainbow");
    desc="Very dry board ("+reasons.join(", ")+") — fortress, hands rarely change.";
  }else{
    texture="dry";
    if(!connected&&!straightPossible)reasons.push("disconnected");
    if(!flushDraw)reasons.push("rainbow");
    desc="Dry board ("+reasons.join(", ")+") — few draws, made hands are stable.";
  }
  return{texture:texture,desc:desc,flushDraw:flushDraw,flushComplete:flushComplete,monotone:monotone,connected:connected,straightPossible:straightPossible,straightComplete:straightComplete,paired:paired,highBoard:highBoard};
}

// ═══════════════════════════════════════════════════════════════
// CLASSIFY HAND STRENGTH
// ═══════════════════════════════════════════════════════════════

export function classify(hole,board){
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
  else if(ev.rank===2){
    var af2={};all.forEach(function(c){var v=RV[c.rank];af2[v]=(af2[v]||0)+1;});
    var pairVals2=[];Object.keys(af2).forEach(function(k){if(af2[k]>=2)pairVals2.push(+k);});
    pairVals2.sort(function(a,b){return b-a;});
    var holePairs2=pairVals2.filter(function(pv){return hv[0]===pv||hv[1]===pv;});
    if(holePairs2.length===0){
      var kick2=Math.max(hv[0],hv[1]);
      if(kick2>=13){var kr2=kick2===RV[hole[0].rank]?hole[0].rank:hole[1].rank;cat="marginal";str=0.25;desc="Two Pair (on board, "+RN[kr2]+" kicker)";}
      else{cat="trash";str=0.1;desc="Two Pair (on board)";}
    }else if(holePairs2.length===1){
      var bestHP=Math.max.apply(null,holePairs2);
      if(bestHP>=bv[0]){cat="good";str=0.40;desc="Two Pair (top + board pair)";}
      else if(bestHP>=bv[Math.min(1,bv.length-1)]){cat="marginal";str=0.25;desc="Two Pair (board-paired)";}
      else{cat="weak";str=0.18;desc="Two Pair (board-paired, weak)";}
    }else{
      var bestHP2=Math.max.apply(null,holePairs2);
      if(bestHP2>=bv[0]){cat="good";str=0.55;desc="Two Pair";}
      else if(bestHP2>=bv[Math.min(1,bv.length-1)]){cat="good";str=0.45;desc="Two Pair";}
      else{cat="marginal";str=0.35;desc="Two Pair (weak)";}
    }
  }
  else if(ev.rank===1){
    var af={};all.forEach(function(c){var v=RV[c.rank];af[v]=(af[v]||0)+1;});
    var pv=0;Object.keys(af).forEach(function(k){if(af[k]===2)pv=+k;});
    var bf={};bv.forEach(function(v){bf[v]=(bf[v]||0)+1;});
    var bp=Object.values(bf).some(function(c){return c>=2;});
    if(bp&&hv.indexOf(pv)===-1){var kick=Math.max(hv[0],hv[1]);cat="trash";str=0.1;desc=kick>=13?"Pair on board, "+RN[kick===hv[0]?hole[0].rank:hole[1].rank]+" kicker":"Pair on board";}
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

export function isOOP(playerPos,oppPos){
  return POSTFLOP_ORDER[playerPos]<POSTFLOP_ORDER[oppPos];
}

// ═══════════════════════════════════════════════════════════════
// MONTE CARLO ENGINE
// ═══════════════════════════════════════════════════════════════

function allPairs(deck){
  var pairs=[];
  for(var i=0;i<deck.length;i++)
    for(var j=i+1;j<deck.length;j++)
      pairs.push([deck[i],deck[j]]);
  return pairs;
}

export function getRange(oppType,action,board,heroHole){
  var known={};
  board.forEach(function(c){known[c.rank+c.suit]=1;});
  heroHole.forEach(function(c){known[c.rank+c.suit]=1;});
  var deck=mkDeck().filter(function(c){return !known[c.rank+c.suit];});
  var pairs=allPairs(deck);

  return pairs.filter(function(hand){
    var info=classify(hand,board);
    var cat=info.category;
    var isRiver=board.length>=5;
    var adjustedOuts=isRiver?0:info.drawOuts;
    var bigDraw=adjustedOuts>=8;
    var anyDraw=adjustedOuts>=4;
    var str=info.strength;

    if(oppType==="tight"){
      var bLen=board.length;
      if(action==="bet"){
        var goodQ=bLen<=3?(cat==="good"&&str>=0.45):
                  (cat==="good"&&str>=0.45&&(info.ev.rank>=2||info.boardTexture.texture!=="wet"));
        var drawQ=bLen<=3?(bigDraw&&adjustedOuts>=9):
                  bLen===4?(adjustedOuts>=9&&cat!=="trash"&&cat!=="weak"):false;
        return cat==="monster"||cat==="strong"||goodQ||drawQ;
      }
      if(action==="call"){
        var callDraw=bLen<=3?bigDraw:
                     bLen===4?(bigDraw&&cat!=="trash"):false;
        return cat==="monster"||cat==="strong"||cat==="good"||callDraw;
      }
      var checkGoodQ=bLen<=3?(cat==="good"&&str>=0.45):
                     (cat==="good"&&str>=0.45&&(info.ev.rank>=2||info.boardTexture.texture!=="wet"));
      var checkDrawQ=bLen<=3?(bigDraw&&adjustedOuts>=9):
                     bLen===4?(adjustedOuts>=9&&cat!=="trash"&&cat!=="weak"):false;
      return !(cat==="monster"||cat==="strong"||checkGoodQ||checkDrawQ);
    }

    if(oppType==="aggro"){
      var madeHand=cat!=="trash";
      if(action==="bet"){
        return madeHand||anyDraw||info.holeVals[0]>=12;
      }
      if(action==="call"){
        return madeHand||anyDraw;
      }
      return !madeHand&&!anyDraw&&info.holeVals[0]<12;
    }

    // neutral/regular
    if(action==="bet"){
      return cat==="monster"||cat==="strong"||cat==="good"||bigDraw;
    }
    if(action==="call"){
      return cat==="monster"||cat==="strong"||cat==="good"||cat==="marginal"||anyDraw;
    }
    return !(cat==="monster"||cat==="strong"||cat==="good"||bigDraw);
  });
}

export function getRangeWithFallback(oppType,action,board,heroHole,minSize){
  minSize=minSize||10;
  var range=getRange(oppType,action,board,heroHole);
  if(range.length>=minSize)return{range:range,fallback:false,fallbackLevel:0};
  if(oppType!=="neutral"){
    range=getRange("neutral",action,board,heroHole);
    if(range.length>=minSize)return{range:range,fallback:true,fallbackLevel:1};
  }
  if(action!=="call"){
    range=getRange(oppType,"call",board,heroHole);
    if(range.length>=minSize)return{range:range,fallback:true,fallbackLevel:2};
  }
  var known={};
  board.forEach(function(c){known[c.rank+c.suit]=1;});
  heroHole.forEach(function(c){known[c.rank+c.suit]=1;});
  var deck=mkDeck().filter(function(c){return !known[c.rank+c.suit];});
  range=allPairs(deck);
  return{range:range,fallback:true,fallbackLevel:3};
}

export function mcEquity(hole,board,oppRange,trials){
  if(!oppRange||!oppRange.length)return 0.5;
  trials=trials||500;
  var wins=0,ties=0,ran=0;

  var knownSet={};
  hole.forEach(function(c){knownSet[c.rank+c.suit]=1;});
  board.forEach(function(c){knownSet[c.rank+c.suit]=1;});

  var baseDeck=mkDeck().filter(function(c){return !knownSet[c.rank+c.suit];});
  var need=5-board.length;

  for(var t=0;t<trials;t++){
    var opp=oppRange[0|Math.random()*oppRange.length];

    var oSet={};
    opp[0]&&(oSet[opp[0].rank+opp[0].suit]=1);
    opp[1]&&(oSet[opp[1].rank+opp[1].suit]=1);
    var runDeck=need>0?baseDeck.filter(function(c){return !oSet[c.rank+c.suit];}):null;

    var fullBoard=board;
    if(need>0){
      var sh=shuffle(runDeck);
      fullBoard=board.concat(sh.slice(0,need));
    }

    var hScore=evalH(hole.concat(fullBoard)).score;
    var oScore=evalH(opp.concat(fullBoard)).score;

    if(hScore>oScore)wins++;
    else if(hScore===oScore)ties++;
    ran++;
  }
  return ran>0?(wins+ties*0.5)/ran:0.5;
}

// ═══════════════════════════════════════════════════════════════
// SUSPECT LINE — opponent hands that beat the hero
// ═══════════════════════════════════════════════════════════════

export function buildSuspectLine(oppRange,board,heroHole){
  if(!oppRange||!oppRange.length||!board||board.length<3)return null;
  // Sample if range is large
  var sample=oppRange;
  if(sample.length>60){
    var step=Math.ceil(sample.length/60);
    sample=[];for(var si=0;si<oppRange.length;si+=step)sample.push(oppRange[si]);
  }
  var heroScore=evalH(heroHole.concat(board)).score;
  var total=sample.length;
  var groups={};
  for(var i=0;i<sample.length;i++){
    var hand=sample[i];
    var score=evalH(hand.concat(board)).score;
    if(score<=heroScore)continue;
    var info=classify(hand,board);
    if(info.category==="trash")continue;
    var desc=info.handDesc;
    if(!groups[desc])groups[desc]={desc:desc,count:0,cards:hand};
    groups[desc].count++;
  }
  var arr=[];
  var keys=Object.keys(groups);
  for(var k=0;k<keys.length;k++)arr.push(groups[keys[k]]);
  arr.sort(function(a,b){return b.count-a.count;});
  var top=arr.slice(0,4);
  for(var j=0;j<top.length;j++)top[j].total=total;
  return top.length>0?top:null;
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO GENERATOR
// ═══════════════════════════════════════════════════════════════

export function genScenario(positions,seed){
  if(seed==null)seed=Date.now()^(Math.random()*0xFFFFFFFF)|0;
  var rng=mulberry32(seed);

  var sw=[{s:"preflop",w:0.3},{s:"flop",w:0.35},{s:"turn",w:0.25},{s:"river",w:0.1}];
  var r=rng(),c=0,street="flop";
  for(var i=0;i<sw.length;i++){c+=sw[i].w;if(r<c){street=sw[i].s;break;}}
  var pos=positions[0|rng()*positions.length];
  var opp=OPP[0|rng()*OPP.length];
  var op=positions.filter(function(p){return p!==pos;});
  var oppPos=op[0|rng()*op.length]||"BTN";

  var playerIsOOP=false;
  var postflopSit="ip_vs_check";

  var heroIsPFR=false,heroHasInitiative=false;

  if(street!=="preflop"){
    playerIsOOP=isOOP(pos,oppPos);
    if(playerIsOOP){
      if(rng()<0.5){
        postflopSit="oop_first_to_act";
      }else{
        postflopSit="oop_check_then_opp_bets";
      }
    }else{
      if(rng()<0.5){
        postflopSit="ip_vs_bet";
      }else{
        postflopSit="ip_vs_check";
      }
    }

    // PFR probability — IP players more likely to be the raiser
    var pfrProb=playerIsOOP?0.35:0.70;
    if(pos==="BTN")pfrProb+=0.10;
    else if(pos==="CO")pfrProb+=0.05;
    else if(pos==="UTG"||pos==="MP")pfrProb-=0.10;
    pfrProb=Math.max(0.15,Math.min(0.90,pfrProb));
    heroIsPFR=rng()<pfrProb;

    // Initiative decays across streets
    var initProb=heroIsPFR?0.70:0.25;
    if(street==="turn")initProb*=0.80;
    if(street==="river")initProb*=0.65;
    heroHasInitiative=rng()<initProb;
  }

  var pH,oH,board,att=0;
  while(att<20){
    att++;var d=seededShuffle(mkDeck(),rng);pH=[d[0],d[1]];oH=[d[2],d[3]];
    var bc=street==="flop"?3:street==="turn"?4:street==="river"?5:0;
    board=d.slice(4,4+bc);
    if(bc===0)break;
    if(bc>=5&&evalH(board).rank>=4)continue;
    var bf={};board.forEach(function(x){bf[x.rank]=(bf[x.rank]||0)+1;});
    if(Object.values(bf).some(function(v){return v>=3;}))continue;
    if(bc===3){var sf={};board.forEach(function(x){sf[x.suit]=(sf[x.suit]||0)+1;});if(Object.values(sf).some(function(v){return v>=3;})&&rng()<0.7)continue;}
    break;
  }

  var potSize,betSize;
  if(street==="preflop"){
    var pfSit="open";
    if(pos==="BB"||pos==="SB")pfSit=rng()<0.5?"vs_raise":"open";
    else pfSit=rng()<0.25?"vs_raise":"open";

    var preOrder=positions.length>=6?P6:P3;
    var pIdx=preOrder.indexOf(pos);
    if(pfSit==="open"){
      var behind=[];
      for(var bi=pIdx+1;bi<preOrder.length;bi++){if(positions.indexOf(preOrder[bi])!==-1)behind.push(preOrder[bi]);}
      if(behind.length>0)oppPos=behind[0|rng()*behind.length];
    }else{
      var before=[];
      for(var bfi=0;bfi<pIdx;bfi++){if(positions.indexOf(preOrder[bfi])!==-1)before.push(preOrder[bfi]);}
      if(pos==="BB"||pos==="SB")before=positions.filter(function(p){return p!==pos;});
      if(before.length>0)oppPos=before[0|rng()*before.length];
    }

    if(pfSit==="vs_raise"){potSize=3.5;betSize=2.5;}
    else{potSize=1.5;betSize=0;}
    return{seed:seed,street:street,pos:pos,opp:opp,oppPos:oppPos,playerHand:pH,oppHand:oH,board:board,potSize:potSize,betSize:betSize,preflopSit:pfSit,postflopSit:null,playerIsOOP:false,heroIsPFR:false,heroHasInitiative:false};
  }

  potSize=4+(0|rng()*12);
  if(postflopSit==="ip_vs_bet"||postflopSit==="oop_check_then_opp_bets"){
    var sz=[0.33,0.5,0.66,0.75][0|rng()*4];
    betSize=Math.max(2,Math.round(potSize*sz));
    potSize+=betSize;
  }else{
    betSize=0;
  }

  return{seed:seed,street:street,pos:pos,opp:opp,oppPos:oppPos,playerHand:pH,oppHand:oH,board:board,potSize:potSize,betSize:betSize,preflopSit:null,postflopSit:postflopSit,playerIsOOP:playerIsOOP,heroIsPFR:heroIsPFR,heroHasInitiative:heroHasInitiative};
}

export function oppMod(oppId){
  if(oppId==="tight")return{callThresh:0.08,bluffMore:true,trapLess:true};
  if(oppId==="aggro")return{callThresh:-0.08,bluffMore:false,trapLess:false};
  return{callThresh:0,bluffMore:false,trapLess:false};
}

// ═══════════════════════════════════════════════════════════════
// POST-FLOP EVALUATOR
// ═══════════════════════════════════════════════════════════════

export function evalPost(action,hole,board,pot,bet,opp,street,postflopSit,showPct,heroIsPFR,heroHasInitiative){
  var info=classify(hole,board);
  var isR=street==="river";
  var best,acc,mcEq,closeSpot=false;

  var dbg={mcEq:0,potOdds:null,gap:null,closeSpot:false,betRangeSize:null,checkRangeSize:null,callRangeSize:null,eqVsCheck:null,eqVsCall:null,rangeFallback:false,rangeFallbackLevel:0,foldEq:null,beFE_small:null,beFE_large:null,oppBetPct:null};

  if(bet>0){
    var betResult=getRangeWithFallback(opp.id,"bet",board,hole);
    var betRange=betResult.range;
    mcEq=mcEquity(hole,board,betRange,500);
    var needed=potOdds(pot,bet);
    var gap=mcEq-needed;
    dbg.betRangeSize=betRange.length;dbg.potOdds=needed;dbg.gap=gap;
    dbg.rangeFallback=betResult.fallback;dbg.rangeFallbackLevel=betResult.fallbackLevel;
    dbg.oppBetPct=bet/Math.max(pot-bet,1);

    var raiseWorthy=info.category==="good"||info.category==="strong"||info.category==="monster";
    if(mcEq>=0.62&&gap>0.08&&raiseWorthy){
      best="Raise";acc=["Raise","Call"];
    }else if(gap>0.08){
      best="Call";acc=["Call"];
    }else if(gap>0.04){
      best="Call";acc=["Call","Fold"];
    }else if(gap>-0.04){
      closeSpot=true;
      if(gap>=0){best="Call";acc=["Call","Fold"];}
      else{best="Fold";acc=["Fold","Call"];}
    }else if(gap>-0.08){
      best="Fold";acc=["Fold","Call"];
    }else{
      best="Fold";acc=["Fold"];
    }
  }else{
    var checkResult=getRangeWithFallback(opp.id,"check",board,hole);
    var callResult=getRangeWithFallback(opp.id,"call",board,hole);
    var checkRange=checkResult.range;
    var callRange=callResult.range;

    var eqVsCheck=mcEquity(hole,board,checkRange,500);
    var eqVsCall=mcEquity(hole,board,callRange,500);
    mcEq=eqVsCheck;
    dbg.checkRangeSize=checkRange.length;dbg.callRangeSize=callRange.length;
    dbg.eqVsCheck=eqVsCheck;dbg.eqVsCall=eqVsCall;
    var fb=checkResult.fallback||callResult.fallback;
    dbg.rangeFallback=fb;dbg.rangeFallbackLevel=Math.max(checkResult.fallbackLevel,callResult.fallbackLevel);

    // Fold equity calculations
    var foldEq=1-(callRange.length/Math.max(checkRange.length,1));
    foldEq=Math.max(0,Math.min(1,foldEq));
    var smallBetPct=0.33,largeBetPct=0.75;
    var beFE_small=smallBetPct/(1+smallBetPct);
    var beFE_large=largeBetPct/(1+largeBetPct);
    dbg.foldEq=foldEq;dbg.beFE_small=beFE_small;dbg.beFE_large=beFE_large;

    // Sizing decision from board texture
    var tex=info.boardTexture;
    var sizeUp=tex&&(tex.texture==="wet"||tex.texture==="very_wet");
    var isBluff=info.category==="trash"||info.category==="weak";
    var hasDraw=info.drawOuts>=6;

    // 1. Strong value
    if(eqVsCall>0.55){
      if(sizeUp){best="Bet Large";acc=["Bet Large","Bet Small"];}
      else{best="Bet Small";acc=["Bet Small","Bet Large"];}
    }
    // 2. Thin value
    else if(eqVsCall>0.50){
      best="Bet Small";acc=["Bet Small","Check"];
    }
    // 3. Semi-bluff (draws, not river)
    else if(!isR&&hasDraw&&eqVsCall>0.30){
      if(sizeUp&&foldEq>beFE_large){
        best="Bet Large";acc=["Bet Large","Bet Small"];
      }else if(foldEq>beFE_small){
        best="Bet Small";acc=["Bet Small","Check"];
      }else{
        best="Check";acc=["Check","Bet Small"];
      }
    }
    // 4. C-bet / barrel bluff (initiative + weak hand, not river)
    else if(heroHasInitiative&&isBluff&&!isR){
      if(!sizeUp&&foldEq>beFE_small){
        best="Bet Small";acc=["Bet Small","Check"];
      }else if(foldEq>beFE_large){
        best="Bet Large";acc=["Bet Large","Check"];
      }else{
        best="Check";acc=["Check"];
      }
    }
    // 5. No initiative, weak hand — no leverage to bluff
    else if(!heroHasInitiative&&isBluff){
      best="Check";acc=["Check"];
    }
    // 6. Marginal
    else if(eqVsCall>0.46){
      closeSpot=true;
      best="Check";acc=["Check","Bet Small"];
    }
    // 7. Default
    else{
      best="Check";acc=["Check"];
    }
  }

  // Rating: green = exact match or close-spot acceptable; yellow = acceptable or right-to-bet wrong size; red = wrong
  var userIsBet=action==="Bet Small"||action==="Bet Large";
  var bestIsBet=best==="Bet Small"||best==="Bet Large";
  var rating;
  if(action===best){
    rating="green";
  }else if(closeSpot&&acc.indexOf(action)!==-1){
    rating="green";
  }else if(userIsBet&&bestIsBet){
    rating="yellow";
  }else if(acc.indexOf(action)!==-1){
    rating="yellow";
  }else{
    rating="red";
  }

  var BET_LIKE=["Raise","Bet","Bet Small","Bet Large"];
  var evDiff=0;
  if(rating==="green"){
    if(best==="Fold"||action==="Fold")evDiff=+Math.max(0.3,Math.round(pot*0.02*10)/10);
    else if(best==="Call"||action==="Call")evDiff=+Math.max(0.5,Math.round(pot*0.05*10)/10);
    else if(BET_LIKE.indexOf(best)!==-1||BET_LIKE.indexOf(action)!==-1)evDiff=+Math.max(0.8,Math.round(pot*0.08*10)/10);
    else if(best==="Check"||action==="Check")evDiff=+Math.max(0.3,Math.round(pot*0.02*10)/10);
  }else if(rating==="red"){
    if(best==="Fold"&&action!=="Fold")evDiff=-(bet||Math.round(pot*0.5));
    else if(action==="Fold"&&best!=="Fold")evDiff=-Math.round(pot*0.15);
    else evDiff=-Math.round(pot*0.1);
  }else{
    // Yellow: sizing-specific penalty is lighter than generic yellow
    if(userIsBet&&bestIsBet){
      evDiff=-Math.min(0.2,Math.round(pot*0.01*10)/10);
    }else{
      evDiff=-Math.min(0.3,Math.round(pot*0.02*10)/10);
    }
  }

  dbg.mcEq=mcEq;dbg.closeSpot=closeSpot;
  var explanation=buildNarrative({
    userAction:action,bestAction:best,rating:rating,info:info,mcEq:mcEq,
    opp:opp,street:street,pot:pot,bet:bet,closeSpot:closeSpot,showPct:showPct,
    betRangeSize:dbg.betRangeSize,checkRangeSize:dbg.checkRangeSize,callRangeSize:dbg.callRangeSize,
    heroIsPFR:heroIsPFR||false,heroHasInitiative:heroHasInitiative||false,
    foldEq:dbg.foldEq||0,beFE_small:dbg.beFE_small||0,beFE_large:dbg.beFE_large||0,
    oppBetPct:dbg.oppBetPct||0,postflopSit:postflopSit
  });
  // Suspect line: only compute for mistakes and close spots
  var suspectLine=null;
  if(rating!=="green"||closeSpot){
    var slRange=bet>0?betRange:callRange;
    suspectLine=buildSuspectLine(slRange,board,hole);
  }
  return{rating:rating,best:best,acceptable:acc,explanation:explanation,evDiff:evDiff,info:info,debug:dbg,suspectLine:suspectLine};
}

// ═══════════════════════════════════════════════════════════════
// PREFLOP EVALUATOR
// ═══════════════════════════════════════════════════════════════

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
    return nota+(isSuited?" (suited)":"")+" is a connected hand. Its value comes from making straights"+(isSuited?" and flushes":"")+" rather than high-card strength.";
  }
  if(isSuited&&Math.abs(hiV-loV)<=2)return nota+" is a suited connector. Playable in position for its straight and flush potential, but low raw equity.";
  if(hiV>=12)return nota+" has one strong card but a weak kicker. Often dominated by better hands in the same range.";
  if(isSuited)return nota+" is a suited hand with a wide gap. Flush potential gives it some value in late position, but straight equity is too limited to rely on.";
  return nota+" is an unplayable hand. No suit advantage, poor connectivity, and easily dominated. Even from the BTN this hand can't realize enough equity to be profitable.";
}

export function evalPre(action,nota,pos,sit,showPct){
  var best,acc;
  var pl=P6.indexOf("BB")-P6.indexOf(pos);if(pl<0)pl+=P6.length;
  var strengthNote=preflopStrengthNote(nota,pos);

  if(sit==="open"){
    if(pos==="BB"){
      var bbRaiseRange=new Set(["AA","KK","QQ","JJ","TT","99","AKs","AKo","AQs","AJs","ATs","AQo","KQs","A5s","A4s"]);
      if(bbRaiseRange.has(nota)){
        best="Raise";acc=["Raise","Check"];
      }else{
        best="Check";acc=["Check"];
      }
    }else{
      var range=OPEN[pos];if(!range)return{rating:"green",best:action,acceptable:[action],explanation:"",evDiff:0};
      if(range.has(nota)){
        best="Raise";acc=["Raise"];
      }else{
        best="Fold";acc=["Fold"];
      }
    }
  }else{
    var ranges=pos==="BB"?BB_VS:pos==="SB"?SB_VS:null;
    if(ranges){
      if(ranges.threebet.has(nota)){
        best="3-Bet";acc=["3-Bet"];
      }else if(ranges.call.has(nota)){
        best="Call";acc=["Call"];
      }else{
        best="Fold";acc=["Fold"];
      }
    }else{
      if(["AA","KK","QQ","JJ","AKs","AKo"].indexOf(nota)!==-1){
        best="3-Bet";acc=["3-Bet","Call"];
      }else if(OPEN[pos]&&OPEN[pos].has(nota)){
        best="Call";acc=["Call","Fold"];
      }else{
        best="Fold";acc=["Fold"];
      }
    }
  }

  var rating=action===best?"green":acc.indexOf(action)!==-1?"yellow":"red";

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

  var expl=buildPreNarrative({
    userAction:action,bestAction:best,rating:rating,
    nota:nota,pos:pos,sit:sit,strengthNote:strengthNote,playersLeft:pl
  });

  return{rating:rating,best:best,acceptable:acc,explanation:expl,evDiff:evDiff};
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

var SK="poker-trainer-data";
var SETK="poker-trainer-settings";
export function loadLocal(){try{var r=localStorage.getItem(SK);return r?JSON.parse(r):null;}catch(e){return null;}}
export function saveLocal(d){try{if(d)localStorage.setItem(SK,JSON.stringify(d));else localStorage.removeItem(SK);}catch(e){}}
var SETTINGS_DEF={showPct:false,showPreEq:false,showHandInfo:false,showDebug:false,showOppHands:true};
export function loadSettings(){try{var r=localStorage.getItem(SETK);if(!r)return Object.assign({},SETTINGS_DEF);var s=JSON.parse(r);for(var k in SETTINGS_DEF)if(!(k in s))s[k]=SETTINGS_DEF[k];return s;}catch(e){return Object.assign({},SETTINGS_DEF);}}
export function saveSettings(s){try{localStorage.setItem(SETK,JSON.stringify(s));}catch(e){}}

// ═══════════════════════════════════════════════════════════════
// DEBUG HARNESS — generates N random hands with full evaluation
// ═══════════════════════════════════════════════════════════════

// Derive per-action rating/evDiff from an already-resolved evaluation,
// avoiding a second MC run that could produce a contradictory best action.
function perActionRating(act,firstEval,isPreflop,pot,bet){
  var best=firstEval.best;
  var acc=firstEval.acceptable;
  var cs=firstEval.debug?firstEval.debug.closeSpot:false;
  var userIsBet=act==="Bet Small"||act==="Bet Large";
  var bestIsBet=best==="Bet Small"||best==="Bet Large";
  var rating=act===best?"green"
    :(cs&&acc.indexOf(act)!==-1)?"green"
    :(userIsBet&&bestIsBet)?"yellow"
    :acc.indexOf(act)!==-1?"yellow":"red";
  var evDiff=0;
  if(isPreflop){
    if(rating==="green"){
      evDiff=(best==="Fold"||best==="Check")?0.3:best==="Call"?0.5:1.0;
    }else if(rating==="red"){
      evDiff=(best==="Fold"&&act!=="Fold")?-2.5:(best==="Check"&&act==="Raise")?-1.0:-1.5;
    }else{evDiff=-0.3;}
  }else{
    if(rating==="green"){
      if(best==="Fold"||act==="Fold")evDiff=+Math.max(0.3,Math.round(pot*0.02*10)/10);
      else if(best==="Call"||act==="Call")evDiff=+Math.max(0.5,Math.round(pot*0.05*10)/10);
      else if(["Raise","Bet","Bet Small","Bet Large"].indexOf(best)!==-1||["Raise","Bet","Bet Small","Bet Large"].indexOf(act)!==-1)
        evDiff=+Math.max(0.8,Math.round(pot*0.08*10)/10);
      else evDiff=+Math.max(0.3,Math.round(pot*0.02*10)/10);
    }else if(rating==="red"){
      if(best==="Fold"&&act!=="Fold")evDiff=-(bet||Math.round(pot*0.5));
      else if(act==="Fold"&&best!=="Fold")evDiff=-Math.round(pot*0.15);
      else evDiff=-Math.round(pot*0.1);
    }else{
      if(userIsBet&&bestIsBet)evDiff=-Math.min(0.2,Math.round(pot*0.01*10)/10);
      else evDiff=-Math.min(0.3,Math.round(pot*0.02*10)/10);
    }
  }
  return{rating:rating,evDiff:evDiff,best:best,acceptable:acc};
}

export function probeDifficulty(scenario){
  if(scenario.street==="preflop"){
    var nota=hn(scenario.playerHand[0],scenario.playerHand[1]);
    var ev=evalPre("Fold",nota,scenario.pos,scenario.preflopSit,false);
    return ev.acceptable.length===1?"easy":"medium";
  }
  var ev2=evalPost("Check",scenario.playerHand,scenario.board,
    scenario.potSize,scenario.betSize,scenario.opp,scenario.street,
    scenario.postflopSit,false,scenario.heroIsPFR,scenario.heroHasInitiative);
  var dbg=ev2.debug||{};
  if(dbg.closeSpot)return"hard";
  if(scenario.betSize>0){
    var gap=Math.abs(dbg.gap||0);
    if(gap>0.15)return"easy";
    if(gap>0.06)return"medium";
    return"hard";
  }
  var eq=dbg.eqVsCall;
  if(eq!=null){
    if(eq>0.60||eq<0.35)return"easy";
    if(eq>0.52||eq<0.42)return"medium";
    return"hard";
  }
  return"medium";
}

export function debugRun(n,tableSize){
  n=n||100;
  var positions=tableSize===6?P6:P3;
  var results=[];

  for(var i=0;i<n;i++){
    var sc=genScenario(positions);
    var nota=hn(sc.playerHand[0],sc.playerHand[1]);
    var boardStr=sc.board.map(cstr).join(" ")||"--";

    var acts;
    if(sc.street==="preflop"){
      if(sc.preflopSit==="vs_raise")acts=["Fold","Call","3-Bet"];
      else if(sc.pos==="BB")acts=["Check","Raise"];
      else acts=["Fold","Raise"];
    }else{
      acts=sc.betSize>0?["Fold","Call","Raise"]:["Check","Bet Small","Bet Large"];
    }

    // Evaluate once with acts[0] to determine best/acceptable/closeSpot via MC.
    // Derive all other per-action ratings from that single result to prevent
    // independent MC runs from producing contradictory bestAction/EV pairs.
    var firstEval;
    var isPre=sc.street==="preflop";
    if(isPre){
      firstEval=evalPre(acts[0],nota,sc.pos,sc.preflopSit,true);
    }else{
      firstEval=evalPost(acts[0],sc.playerHand,sc.board,sc.potSize,sc.betSize,sc.opp,sc.street,sc.postflopSit,true,sc.heroIsPFR,sc.heroHasInitiative);
    }
    var evals={};
    evals[acts[0]]=firstEval;
    for(var a=1;a<acts.length;a++){
      evals[acts[a]]=perActionRating(acts[a],firstEval,isPre,sc.potSize,sc.betSize);
    }

    var bestEv=evals[acts[0]];
    var bestAction=bestEv.best;

    var classInfo=null;
    if(sc.street!=="preflop"){
      classInfo=classify(sc.playerHand,sc.board);
    }

    var dbg=bestEv.debug||{};
    var row={
      hand:i+1,
      seed:encodeSeed(sc.seed),
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
      handCategory:classInfo?classInfo.category:"--",
      handDesc:classInfo?classInfo.handDesc:"--",
      handStrength:classInfo?classInfo.strength.toFixed(3):"--",
      draws:classInfo?(classInfo.draws.map(function(d){return d.desc;}).join(", ")||"none"):"--",
      drawOuts:classInfo?classInfo.drawOuts:"--",
      boardTexture:classInfo?(classInfo.boardTexture.texture||"--"):"--",
      mcEquity:dbg.mcEq!=null?dbg.mcEq.toFixed(3):(bestEv.info&&bestEv.info.strength?bestEv.info.strength.toFixed(3):"--"),
      rangeFallback:dbg.rangeFallback?"L"+dbg.rangeFallbackLevel:"no",
      betRangeSize:dbg.betRangeSize!=null?dbg.betRangeSize:"--",
      checkRangeSize:dbg.checkRangeSize!=null?dbg.checkRangeSize:"--",
      callRangeSize:dbg.callRangeSize!=null?dbg.callRangeSize:"--",
      foldEq:dbg.foldEq!=null?dbg.foldEq.toFixed(3):"--",
      heroIsPFR:sc.heroIsPFR?"PFR":"Caller",
      heroHasInitiative:sc.heroHasInitiative?"Init":"NoInit",
      evBest:(evals[bestAction]?evals[bestAction].evDiff:0).toFixed(1),
      explanation:bestEv.explanation?bestEv.explanation.substring(0,120):"--",
      fullExplanation:bestEv.explanation||"--",
    };

    for(var a2=0;a2<acts.length;a2++){
      row["rating_"+acts[a2]]=evals[acts[a2]].rating;
      row["ev_"+acts[a2]]=evals[acts[a2]].evDiff.toFixed(1);
    }

    results.push(row);
  }
  return results;
}

export function debugToCSV(results){
  if(!results.length)return"";
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

export function debugSummary(results){
  var total=results.length;
  var byStreet={};var byOpp={};var byPos={};var byCat={};var actionDist={};
  var initDist={PFR:0,Caller:0,Init:0,NoInit:0};
  var flags=[];

  for(var i=0;i<total;i++){
    var r=results[i];
    if(!byStreet[r.street])byStreet[r.street]={n:0};
    byStreet[r.street].n++;
    if(!byOpp[r.oppType])byOpp[r.oppType]={n:0,actions:{}};
    byOpp[r.oppType].n++;
    byOpp[r.oppType].actions[r.bestAction]=(byOpp[r.oppType].actions[r.bestAction]||0)+1;
    if(!byPos[r.pos])byPos[r.pos]={n:0};
    byPos[r.pos].n++;
    if(r.handCategory!=="--"){
      if(!byCat[r.handCategory])byCat[r.handCategory]={n:0,actions:{}};
      byCat[r.handCategory].n++;
      byCat[r.handCategory].actions[r.bestAction]=(byCat[r.handCategory].actions[r.bestAction]||0)+1;
    }
    actionDist[r.bestAction]=(actionDist[r.bestAction]||0)+1;
    if(r.heroIsPFR)initDist[r.heroIsPFR]=(initDist[r.heroIsPFR]||0)+1;
    if(r.heroHasInitiative)initDist[r.heroHasInitiative]=(initDist[r.heroHasInitiative]||0)+1;

    if(r.handCategory==="monster"&&r.bestAction==="Fold"){
      flags.push("#"+r.hand+": MONSTER hand ("+r.cards+" / "+r.handDesc+") told to Fold on "+r.board);
    }
    if(r.handCategory==="trash"&&(r.bestAction==="Raise"||r.bestAction==="Bet Large")&&r.street!=="preflop"&&r.heroHasInitiative!=="Init"){
      flags.push("#"+r.hand+": TRASH hand ("+r.cards+" / "+r.handDesc+") told to "+r.bestAction+" without initiative on "+r.board);
    }
    if(r.handCategory==="strong"&&r.bestAction==="Fold"){
      flags.push("#"+r.hand+": STRONG hand ("+r.cards+" / "+r.handDesc+") told to Fold on "+r.board+", opp="+r.oppType+", sit="+r.situation);
    }
    if(r.handDesc==="Overcards"&&r.street!=="preflop"){
      var hc=r.cards;
      var hr1=RV[hc[0]]||0,hr2=RV[hc[1]]||0;
      var bc=r.board.split(" ").map(function(cs){return RV[cs[0]]||0;});
      var boardHigh=Math.max.apply(null,bc);
      if(hr1<=boardHigh||hr2<=boardHigh){
        flags.push("#"+r.hand+": OVERCARDS BUG — "+r.cards+" labeled overcards but board "+r.board+" has higher card");
      }
    }
    if(!r.explanation||r.explanation==="--"||r.explanation.length<10){
      flags.push("#"+r.hand+": Empty/short explanation for "+r.cards+" on "+r.board);
    }
    if(r.rangeFallback&&r.rangeFallback!=="no"){
      flags.push("#"+r.hand+": RANGE FALLBACK "+r.rangeFallback+" on "+r.board+" opp="+r.oppType+" seed="+r.seed);
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
  lines.push("INITIATIVE DISTRIBUTION:");
  lines.push("  PFR: "+initDist.PFR+"  Caller: "+initDist.Caller+"  Initiative: "+initDist.Init+"  NoInit: "+initDist.NoInit);
  lines.push("");
  if(flags.length===0){
    lines.push("FLAGS: None — no suspicious patterns detected.");
  }else{
    lines.push("FLAGS ("+flags.length+" issues):");
    flags.forEach(function(f){lines.push("  ⚠ "+f);});
  }
  return lines.join("\n");
}
