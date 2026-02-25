// ═══════════════════════════════════════════════════════════════
// POKER TRAINER
//
// Not a GTO solver. Not a math lecture. Think of this as chess
// puzzles for poker — quick, snappy scenarios that build real
// intuition for beginners and intermediate players. Each hand
// teaches a concept through instant feedback and plain-English
// explanations. No solvers, no ranges grids, no equity trees.
// Just reps. Play a hand, get a read, get better.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from "react";
import { T, SC, P6, P3, SN, GLOSSARY, OPP } from "./poker-data.js";
import {
  shuffle, mkDeck, cstr, hn, sortH,
  classify, genScenario, evalPre, evalPost,
  debugRun, debugToCSV, debugSummary,
  loadLocal, saveLocal, loadSettings, saveSettings,
  encodeSeed, decodeSeed,
} from "./poker-engine.js";

var TABLE_H = T.tableTopPad + T.betRowH + T.innerGap + T.boardRowH + T.innerGap + T.potRowH + T.tableBotPad;

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

function PB(props){
  var gloss=GLOSSARY[props.pos]||"";
  var mkTip=gloss&&props.showTip?function(e){e.stopPropagation();props.showTip(e,gloss);}:null;
  return <span onMouseEnter={mkTip} onMouseLeave={props.showTip?function(){props.showTip(null);}:null} onClick={mkTip} style={{color:T.pos[props.pos]||T.gold,fontWeight:T.weight,cursor:gloss&&props.showTip?"help":undefined}}>{props.pos}</span>;
}

function StreetBadge(props){
  var gloss=GLOSSARY[props.street]||"";
  var mkTip=gloss&&props.showTip?function(e){e.stopPropagation();props.showTip(e,gloss);}:null;
  return <span onMouseEnter={mkTip} onMouseLeave={props.showTip?function(){props.showTip(null);}:null} onClick={mkTip} style={{color:T.goldDark,fontWeight:T.weight,cursor:gloss&&props.showTip?"help":undefined}}>{SN[props.street]}</span>;
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE TEXT RENDERER
// ═══════════════════════════════════════════════════════════════

function findGloss(txt){
  if(GLOSSARY[txt])return GLOSSARY[txt];
  var low=txt.toLowerCase();
  var keys=Object.keys(GLOSSARY);
  for(var i=0;i<keys.length;i++){if(keys[i].toLowerCase()===low)return GLOSSARY[keys[i]];}
  return null;
}

function NT(props){
  var text=props.text||"";
  var showTip=props.showTip;
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
    {re:/\b(preflop|flop|turn|river)\b/gi,t:"hl"},
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
    var gloss=p.t!=="plain"?findGloss(p.text):null;
    var mkTip=gloss&&showTip?function(e){e.stopPropagation();showTip(e,gloss);}:null;
    if(p.t==="pos")return <span key={i} onMouseEnter={mkTip} onMouseLeave={showTip?function(){showTip(null);}:null} onClick={mkTip} style={{color:T.pos[p.text]||T.gold,fontWeight:T.weight,cursor:gloss&&showTip?"help":undefined}}>{p.text}</span>;
    if(p.t==="hand")return <span key={i} style={{background:T.bg,padding:"1px 5px",borderRadius:3,fontWeight:T.weight,color:T.text,border:"1px solid "+T.border}}>{p.text}</span>;
    if(p.t==="hl")return <span key={i} onMouseEnter={mkTip} onMouseLeave={showTip?function(){showTip(null);}:null} onClick={mkTip} style={{color:T.goldDark,fontWeight:T.weight,cursor:gloss&&showTip?"help":undefined}}>{p.text}</span>;
    return <span key={i}>{p.text}</span>;
  })}</>;
}

// ═══════════════════════════════════════════════════════════════
// CARD COMPONENT (module-level to prevent animation replay)
// ═══════════════════════════════════════════════════════════════

function CCard(props){
  var card=props.card,isBoard=props.board,delay=props.animDelay||0;
  var col=SC[card.suit];var rank=card.rank==="T"?"10":card.rank;
  var animStyle={animationDelay:delay+"ms"};
  if(isBoard){
    var bw=props.bcW||T.bcW,bh=props.bcH||T.bcH,br=props.bcRank||T.bcRank,bsu=props.bcSuit||T.bcSuit;
    return <div className="board-anim" style={{width:bw,height:bh,borderRadius:T.bcR,background:T.cream,border:"1.5px solid "+T.creamBorder,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:T.font,boxShadow:"0 2px 8px rgba(0,0,0,0.15)",...animStyle}}>
      <span style={{fontSize:br,fontWeight:800,color:col,lineHeight:1}}>{rank}</span>
      <span style={{fontSize:bsu,color:col,lineHeight:1,marginTop:2}}>{card.suit}</span>
    </div>;
  }
  var cw=props.cardW||T.cardW,ch=props.cardH||T.cardH,cr=props.cardRank||T.cardRank,cs=props.cardSuit||T.cardSuit;
  return <div className="card-anim" style={{width:cw,height:ch,borderRadius:T.cardR,background:T.cream,border:"2px solid "+T.creamBorder,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:T.font,boxShadow:"0 4px 16px rgba(0,0,0,0.1)",gap:2,...animStyle}}>
    <span style={{fontSize:cr,fontWeight:800,color:col,lineHeight:1}}>{rank}</span>
    <span style={{fontSize:cs,color:col,lineHeight:1}}>{card.suit}</span>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// EQUITY METER — visual bar showing equity vs pot odds
// ═══════════════════════════════════════════════════════════════

function EqMeter(props){
  var eq=props.eq,needed=props.needed,showPct=props.showPct,showTip=props.showTip;
  if(eq==null)return null;
  var pct=Math.round(eq*100);
  var neededPct=needed!=null?Math.round(needed*100):null;
  // Color: red→orange→yellow→green based on equity
  var col=eq>=0.65?"#4a8a5a":eq>=0.50?"#7aa84a":eq>=0.35?"#c49a2a":"#b84a3a";
  return <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto",flexShrink:0,cursor:"default"}}
    onMouseEnter={showTip?function(e){showTip(e,"Your mathematical advantage. Hand strength vs. pot odds. When the bar crosses the threshold, it's a profitable play.");}:null}
    onMouseLeave={showTip?function(){showTip(null);}:null}
    onClick={showTip?function(e){e.stopPropagation();showTip(e,"Your mathematical advantage. Hand strength vs. pot odds. When the bar crosses the threshold, it's a profitable play.");}:null}
  >
    <span style={{fontSize:10,color:"#8a8472",fontWeight:600}}>Edge</span>
    <div style={{position:"relative",width:70,height:7,borderRadius:0,background:"#e0d8c8",overflow:"visible"}}>
      <div style={{width:Math.min(pct,100)+"%",height:"100%",borderRadius:0,background:col,transition:"width 0.4s ease"}}/>
      {neededPct!=null && <div style={{position:"absolute",left:Math.min(neededPct,100)+"%",top:-2,width:2,height:11,background:"#2b2b24",borderRadius:0,opacity:0.5}}/>}
    </div>
    {showPct && <span style={{fontSize:10,color:"#8a8472",fontWeight:600}}>{pct+"%"}</span>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// SUSPECT LINE — mini cards + probability bars
// ═══════════════════════════════════════════════════════════════

function MiniCard(props){
  var c=props.card;var col=SC[c.suit];var rank=c.rank==="T"?"10":c.rank;
  return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:18,height:24,borderRadius:3,background:T.cream,border:"1px solid "+T.creamBorder,fontSize:13,fontWeight:800,color:col,lineHeight:1,fontFamily:T.font}}>{rank}</span>;
}

function MiniCardPair(props){
  var cards=props.cards;
  if(!cards||cards.length<2)return null;
  return <span style={{display:"inline-flex",gap:2,alignItems:"center"}}><MiniCard card={cards[0]}/><MiniCard card={cards[1]}/></span>;
}

function Thermo(props){
  var ratio=Math.max(props.ratio||0,0.25);
  var r=Math.round(58+(208-58)*ratio);
  var g=Math.round(138+(64-138)*ratio);
  var b=Math.round(223+(64-223)*ratio);
  var col="rgb("+r+","+g+","+b+")";
  var glow=ratio>0.7?"0 0 6px "+col:"none";
  return <div style={{width:5,height:24,background:T.creamBorder,overflow:"hidden",flexShrink:0,position:"relative",borderRadius:0}}>
    <div style={{position:"absolute",bottom:0,width:"100%",height:Math.round(ratio*100)+"%",background:col,boxShadow:glow,borderRadius:0}}/>
  </div>;
}

function SuspectLine(props){
  var hands=props.hands,show=props.show,eq=props.eq,needed=props.needed,showPct=props.showPct,showTip=props.showTip;
  var hasHands=show&&hands&&hands.length>0;
  var hasEq=eq!=null;
  if(!hasHands&&!hasEq)return null;
  var display=hasHands?hands.slice(0,3):[];
  return <div style={{display:"flex",gap:10,marginTop:8,paddingTop:8,borderTop:"1px solid "+T.creamBorder,alignItems:"center"}}>
    {display.map(function(h,i){
      return <div key={i} style={{display:"flex",alignItems:"center",gap:4,cursor:"default"}}
        onMouseEnter={showTip?function(e){showTip(e,"Hands in their range that currently beat you. Taller bars mean high danger; low bars confirm a safer spot.");}:null}
        onMouseLeave={showTip?function(){showTip(null);}:null}
        onClick={showTip?function(e){e.stopPropagation();showTip(e,"Hands in their range that currently beat you. Taller bars mean high danger; low bars confirm a safer spot.");}:null}
      >
        <Thermo ratio={h.count/h.total}/>
        <MiniCardPair cards={h.cards}/>
      </div>;
    })}
    {hasEq && <EqMeter eq={eq} needed={needed} showPct={showPct} showTip={showTip}/>}
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
  var [oppThinking,setOppThinking]=useState(false);
  var [debugData,setDebugData]=useState(null);
  var [tipState,setTipState]=useState(null);
  var [showMistakesOnly,setShowMistakesOnly]=useState(false);
  var [replayQueue,setReplayQueue]=useState([]);
  var [replayMode,setReplayMode]=useState(false);
  var [replayTotal,setReplayTotal]=useState(0);
  var [mistakeMode,setMistakeMode]=useState(false);
  var [mistakeSeeds,setMistakeSeeds]=useState([]);
  var [mistakeResults,setMistakeResults]=useState([]);
  var [mistakeIndex,setMistakeIndex]=useState(0);
  var [mistakeBonus,setMistakeBonus]=useState(null);
  var [seedInput,setSeedInput]=useState("");
  var fileRef=useRef(null);
  var boardDoneRef=useRef(0);
  var positions=tableSize===6?P6:P3;
  var F={fontFamily:T.font,fontWeight:T.weight};

  var [screenH,setScreenH]=useState(typeof window!=="undefined"?window.innerHeight:900);
  var [screenW,setScreenW]=useState(typeof window!=="undefined"?window.innerWidth:480);
  var smallScreen=screenH<750;
  var effectiveMaxW=Math.min(T.maxW,screenW-T.pagePad*2);
  var tableInnerW=effectiveMaxW-T.tablePadX*2-6;
  var dynBcW=Math.min(T.bcW,Math.floor((tableInnerW-4*T.bcGap)/5));
  var dynBcH=Math.round(dynBcW*T.bcH/T.bcW);
  var dynBcRank=Math.round(dynBcW*T.bcRank/T.bcW);
  var dynBcSuit=Math.round(dynBcW*T.bcSuit/T.bcW);
  var dynHeaderPad=smallScreen?10:12;
  // Fixed vertical cost: pagePad*2 + header(approx) + headerMarginB + gapToTable + TABLE_H + tableWrapperMarginB + gapNarrToHand
  var fixedV=T.pagePad*2+(dynHeaderPad*2+13+2)+12+T.gapToTable+TABLE_H+(T.seat/2+22)+T.gapNarrToHand;
  var availV=Math.max(0,screenH-fixedV);
  // Card width from 65% rule, height from aspect ratio, then cap to available space
  var dynCardW=Math.round((effectiveMaxW*0.65-T.cardGap)/2);
  var dynCardH=Math.min(Math.round(dynCardW*T.cardH/T.cardW),Math.round(availV*0.55));
  dynCardH=Math.max(100,dynCardH);
  dynCardW=Math.round(dynCardH*T.cardW/T.cardH);
  var dynCardRank=Math.round(dynCardW*T.cardRank/T.cardW);
  var dynCardSuit=Math.round(dynCardW*T.cardSuit/T.cardH);
  // Narrative gets remaining space after cards, with floor and ceiling
  var dynNarrH=Math.min(T.narrH,Math.max(100,availV-dynCardH));

  function showTip(e,text){
    if(!e||!text){setTipState(null);return;}
    var rect=e.currentTarget.getBoundingClientRect();
    var x=rect.left+rect.width/2;
    var y=rect.top;
    var showBelow=y<120;
    var half=130,gap=8;
    var cx=Math.max(gap+half,Math.min(x,window.innerWidth-gap-half));
    setTipState({text:text,x:cx,y:showBelow?rect.bottom+6:y-6,below:showBelow});
  }

  var persist=useCallback(function(sl){
    if(!sl.length)return;
    setLT(function(p){var m={totalHands:p.totalHands+sl.length,greens:p.greens+sl.filter(function(e){return e.rating==="green";}).length,yellows:p.yellows+sl.filter(function(e){return e.rating==="yellow";}).length,reds:p.reds+sl.filter(function(e){return e.rating==="red";}).length,totalEv:p.totalEv+sl.reduce(function(s,e){return s+e.ev;},0),sessions:p.sessions+1};saveLocal(m);return m;});
  },[]);

  useEffect(function(){
    function onResize(){setScreenH(window.innerHeight);setScreenW(window.innerWidth);}
    window.addEventListener("resize",onResize);
    return function(){window.removeEventListener("resize",onResize);};
  },[]);

  // Opponent thinking delay — starts after board is fully dealt
  // oppThinking is set true eagerly on scenario load; this effect only schedules the turn-off
  useEffect(function(){
    if(!scenario||phase!=="action")return;
    var sit=scenario.postflopSit;
    var hasOppAction=scenario.street!=="preflop"&&(sit==="ip_vs_bet"||sit==="oop_check_then_opp_bets"||sit==="ip_vs_check");
    if(!hasOppAction){setOppThinking(false);return;}
    var thinkDur={tight:3000,neutral:1000,aggro:0}[scenario.opp.id]||0;
    if(thinkDur===0){setOppThinking(false);return;}
    var t=setTimeout(function(){setOppThinking(false);},boardDoneRef.current+thinkDur);
    return function(){clearTimeout(t);};
  },[animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mistake mode completion — check when all 5 done
  useEffect(function(){
    if(!mistakeMode||mistakeIndex<5)return;
    var allGreen=mistakeResults.every(function(r){return r==="green";});
    if(allGreen){
      var bonus=5+Math.floor(Math.random()*6);
      setMistakeBonus(bonus);
      setStack(function(s){return s+bonus;});
      setEvPulse("green");setTimeout(function(){setEvPulse(null);},600);
      var t=setTimeout(function(){
        setMistakeMode(false);setMistakeBonus(null);
        var sc2=genScenario(positions);
        setSc(sc2);setSeedInput(encodeSeed(sc2.seed));
        setPhase("action");setFB(null);setOppThinking(true);setAnimKey(function(k){return k+1;});setBtnFlash(null);
      },2500);
      return function(){clearTimeout(t);};
    }else{
      var t2=setTimeout(function(){
        setMistakeMode(false);
        var sc2=genScenario(positions);
        setSc(sc2);setSeedInput(encodeSeed(sc2.seed));
        setPhase("action");setFB(null);setOppThinking(true);setAnimKey(function(k){return k+1;});setBtnFlash(null);
      },1500);
      return function(){clearTimeout(t2);};
    }
  },[mistakeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  var start=useCallback(function(keepSession,seed){
    if(!keepSession&&log.length>0)persist(log);
    if(!keepSession){setLog([]);setStack(100);setHN(1);}
    else{setHN(function(h){return h+1;});}
    var sc=seed!=null?genScenario(positions,seed):genScenario(positions);
    setSc(sc);setSeedInput(encodeSeed(sc.seed));setPhase("action");setFB(null);setScreen("game");setOppThinking(true);setAnimKey(function(k){return k+1;});setBtnFlash(null);
  },[positions,log,persist]);

  var goNext=useCallback(function(){
    setHN(function(h){return h+1;});
    // Mistake mode: advance to next mistake or finish
    if(mistakeMode){
      var nextIdx=mistakeIndex+1;
      if(nextIdx>=5){
        setMistakeIndex(nextIdx);
        // Completion handled by useEffect
        return;
      }
      setMistakeIndex(nextIdx);
      var msc=genScenario(positions,mistakeSeeds[nextIdx]);
      setSc(msc);setSeedInput(encodeSeed(msc.seed));
      setPhase("action");setFB(null);setOppThinking(true);setAnimKey(function(k){return k+1;});setBtnFlash(null);setTipState(null);
      return;
    }
    // Replay mode: pop next seed from queue
    if(replayMode&&replayQueue.length>0){
      var next=replayQueue[0];
      setReplayQueue(function(q){return q.slice(1);});
      var sc=genScenario(positions,next);
      setSc(sc);setSeedInput(encodeSeed(sc.seed));
    }else{
      if(replayMode){setReplayMode(false);setReplayTotal(0);}
      var sc2=genScenario(positions);
      setSc(sc2);setSeedInput(encodeSeed(sc2.seed));
    }
    setPhase("action");setFB(null);setOppThinking(true);setAnimKey(function(k){return k+1;});setBtnFlash(null);setTipState(null);
  },[positions,replayMode,replayQueue,mistakeMode,mistakeIndex,mistakeSeeds]);

  var replaySeed=useCallback(function(code){
    if(!code||!code.trim())return;
    var seed=decodeSeed(code.trim());
    var sc=genScenario(positions,seed);
    setSc(sc);setSeedInput(encodeSeed(sc.seed));setPhase("action");setFB(null);setOppThinking(true);setAnimKey(function(k){return k+1;});setBtnFlash(null);setTipState(null);
  },[positions]);

  var startMistakeMode=useCallback(function(){
    var mistakes=log.filter(function(e){return e.rating==="red"&&!e.replayed&&e.seed!=null;});
    if(mistakes.length<5)return;
    var picked=mistakes.slice();
    for(var i=picked.length-1;i>0;i--){var j=0|Math.random()*(i+1);var t=picked[i];picked[i]=picked[j];picked[j]=t;}
    picked=picked.slice(0,5);
    var seeds=picked.map(function(e){return e.seed;});
    setMistakeSeeds(seeds);
    setMistakeResults([null,null,null,null,null]);
    setMistakeIndex(0);
    setMistakeMode(true);
    setMistakeBonus(null);
    var sc=genScenario(positions,seeds[0]);
    setSc(sc);setSeedInput(encodeSeed(sc.seed));setPhase("action");setFB(null);setScreen("game");setOppThinking(true);setAnimKey(function(k){return k+1;});setBtnFlash(null);
    setHN(function(h){return h+1;});
  },[log,positions]);

  var act=useCallback(function(action){
    if(!scenario)return;
    var n=hn(scenario.playerHand[0],scenario.playerHand[1]);
    var ev;
    if(scenario.street==="preflop")ev=evalPre(action,n,scenario.pos,scenario.preflopSit,settings.showPct);
    else ev=evalPost(action,scenario.playerHand,scenario.board,scenario.potSize,scenario.betSize,scenario.opp,scenario.street,scenario.postflopSit,settings.showPct);
    setFB(ev);setPhase("feedback");setStack(function(s){return s+ev.evDiff;});
    setBtnFlash({action:action,rating:ev.rating});
    setEvPulse(ev.evDiff>=0?"green":"red");
    setTimeout(function(){setEvPulse(null);},600);
    var logNarr=scenario.street==="preflop"
      ?(scenario.preflopSit==="vs_raise"
          ?scenario.opp.emoji+" "+scenario.opp.name+" player raises from "+scenario.oppPos+". You're at "+scenario.pos+"."
          :"You're at "+scenario.pos+".")
      :"It's the "+SN[scenario.street].toLowerCase()+". "+(scenario.betSize>0
          ?scenario.opp.emoji+" "+scenario.opp.name+" player bets "+scenario.betSize.toFixed(1)+"BB into a "+(scenario.potSize-scenario.betSize).toFixed(1)+"BB pot."
          :scenario.opp.emoji+" "+scenario.opp.name+" player checks.");
    var logEntry={hand:handNum,pos:scenario.pos,cards:n,cardsExact:cstr(scenario.playerHand[0])+" "+cstr(scenario.playerHand[1]),board:scenario.board.length>0?scenario.board.map(cstr).join(" "):"--",pot:scenario.potSize.toFixed(1),bet:scenario.betSize>0?scenario.betSize.toFixed(1):"--",street:SN[scenario.street],situation:scenario.street==="preflop"?scenario.preflopSit:(scenario.betSize>0?"vs bet":"checked to"),opp:scenario.opp.name,oppEmoji:scenario.opp.emoji,oppColor:scenario.opp.color,action:action,correct:ev.best,rating:ev.rating,ev:ev.evDiff,narrative:logNarr,explanation:ev.explanation,
      seed:scenario.seed||null,
      equity:ev.debug?ev.debug.mcEq:null,
      potOdds:ev.debug?ev.debug.potOdds:null,
      gap:ev.debug?ev.debug.gap:null,
      closeSpot:ev.debug?ev.debug.closeSpot:false,
      category:ev.info?ev.info.category:null,
      strength:ev.info?ev.info.strength:null,
      handDesc:ev.info?ev.info.handDesc:null,
      drawOuts:ev.info?ev.info.drawOuts:0,
      boardTexture:ev.info?ev.info.boardTexture:null,
      debugVars:ev.debug||null,
      replayed:false};
    setLog(function(p){return p.concat([logEntry]);});
    // If in replay mode and user got it right, mark original mistake as replayed
    if(replayMode&&ev.rating==="green"&&scenario.seed!=null){
      setLog(function(p){return p.map(function(e){
        if(e.seed===scenario.seed&&e.rating==="red"&&!e.replayed)return Object.assign({},e,{replayed:true});
        return e;
      });});
    }
    // Mistake mode: record result
    if(mistakeMode&&mistakeIndex<5){
      setMistakeResults(function(prev){var next=prev.slice();next[mistakeIndex]=ev.rating==="green"?"green":"red";return next;});
      if(ev.rating==="green"&&scenario.seed!=null){
        setLog(function(p){return p.map(function(e){
          if(e.seed===scenario.seed&&e.rating==="red"&&!e.replayed)return Object.assign({},e,{replayed:true});
          return e;
        });});
      }
    }
  },[scenario,handNum,settings.showPct,replayMode,mistakeMode,mistakeIndex]);

  var getActs=function(){
    if(!scenario)return[];
    if(scenario.street==="preflop"){
      if(scenario.preflopSit==="vs_raise")return["Fold","Call","3-Bet"];
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
    var lines=["hand,pos,cards,cardsExact,board,pot,bet,street,situation,opp,action,correct,rating,ev,seed"];
    for(var i=0;i<log.length;i++){var e=log[i];lines.push([e.hand,e.pos,e.cards,'"'+(e.cardsExact||"")+'"','"'+e.board+'"',e.pot,e.bet,e.street,e.situation,e.opp,e.action,e.correct,e.rating,e.ev.toFixed(1),e.seed!=null?encodeSeed(e.seed):""].join(","));}
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
    var hd="| # | Pos | Hand | Board | Action | Correct | Grade | BB |\n|---|-----|------|-------|--------|---------|-------|----|\n";
    for(var i=0;i<log.length;i++){var e=log[i];var ic=e.rating==="green"?"OK":e.rating==="yellow"?"~":"X";hd+="| "+e.hand+" | "+e.pos+" | "+e.cards+" | "+e.board+" | "+e.action+" | "+e.correct+" | "+ic+" | "+(e.ev>0?"+":"")+e.ev.toFixed(1)+" |\n";}
    navigator.clipboard.writeText(hd).catch(function(){});setCopied(true);setTimeout(function(){setCopied(false);},2000);
  },[log]);

  // ═══════ MENU ═══════
  if(screen==="menu"){
    return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",background:T.bg,...F,padding:20}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",maxWidth:T.maxW,width:"100%",textAlign:"center"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:8}}>
          <div style={{width:40,height:1,background:T.border}}/><div style={{width:5,height:5,background:T.gold,transform:"rotate(45deg)"}}/><div style={{width:40,height:1,background:T.border}}/>
        </div>
        <div style={{fontSize:11,letterSpacing:"0.3em",color:T.textDim,textTransform:"uppercase",marginBottom:4}}>Poker</div>
        <h1 style={{fontSize:36,fontWeight:T.weight,margin:"0 0 4px",color:T.text}}>TRAINER</h1>
        <div style={{width:50,height:2,background:T.gold,margin:"12px auto 32px"}}/>
        <button onClick={function(){start(false);}} style={{padding:"16px 56px",borderRadius:24,border:"none",cursor:"pointer",background:T.gold,color:"#fff",...F,fontSize:16,marginBottom:12}}>PLAY</button>
        <button onClick={function(){setScreen("settings");}} style={{padding:"12px 36px",borderRadius:20,border:"1.5px solid "+T.border,background:"transparent",color:T.textMid,cursor:"pointer",...F,fontSize:14}}>SETTINGS</button>
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
              {[{l:"Hands",v:st.total,c:T.text},{l:"Accuracy",v:Math.round(st.greens/st.total*100)+"%",c:T.green},{l:"BB",v:(st.totalEv>=0?"+":"")+st.totalEv.toFixed(1),c:st.totalEv>=0?T.green:T.red},{l:"Stack",v:stack.toFixed(1),c:stack>=100?T.green:T.red}].map(function(d,i){return <div key={i} style={{textAlign:"center"}}><div style={{fontSize:22,...F,color:d.c}}>{d.v}</div><div style={{fontSize:10,fontWeight:T.weight,color:T.textDim,textTransform:"uppercase"}}>{d.l}</div></div>;})}
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
          {log.length>0&&<>
            {/* Filter + Replay buttons */}
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <button onClick={function(){setShowMistakesOnly(!showMistakesOnly);}} style={{flex:1,padding:"8px 12px",borderRadius:16,border:"1.5px solid "+(showMistakesOnly?T.red+"40":T.border),cursor:"pointer",background:showMistakesOnly?T.red+"12":"transparent",color:showMistakesOnly?T.red:T.textMid,...F,fontSize:11}}>{showMistakesOnly?"Showing Mistakes":"Mistakes Only"}</button>
              {(function(){var mist=log.filter(function(e){return e.rating==="red"&&!e.replayed&&e.seed!=null;});return mist.length>=5?<button onClick={startMistakeMode} style={{flex:1,padding:"8px 12px",borderRadius:16,border:"1.5px solid "+T.red+"40",cursor:"pointer",background:T.red+"12",color:T.red,...F,fontSize:11}}>{"Mistakes Mode ("+mist.length+")"}</button>:null;})()}
            </div>
            {(function(){
              var displayLog=showMistakesOnly?log.filter(function(e){return e.rating==="red";}):log;
              var shown=displayLog.slice(-20).reverse();
              return shown.length>0&&<div style={pnl}>
                <div style={{fontSize:10,fontWeight:T.weight,color:T.textDim,textTransform:"uppercase",marginBottom:10}}>{showMistakesOnly?"Mistakes ("+displayLog.length+")":"Last "+shown.length+" Hands"}</div>
                {shown.map(function(e,i){
                  var rColor=e.rating==="green"?T.green:e.rating==="yellow"?T.gold:T.red;
                  var isCorrect=e.action===e.correct;
                  var isLast=i===shown.length-1;
                  var cardDisplay=e.cardsExact||e.cards;
                  return <div key={i} style={{borderLeft:"3px solid "+rColor,paddingLeft:10,marginBottom:isLast?0:12,paddingBottom:isLast?0:12,borderBottom:isLast?"none":"1px solid "+T.creamBorder}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"0 6px",alignItems:"baseline",marginBottom:3,...F,fontSize:12,fontWeight:700,color:T.text}}>
                      <span style={{color:T.textDim,fontWeight:500}}>{"#"+e.hand}</span>
                      <span style={{color:T.textDim}}>{"·"}</span>
                      <span>{e.street}</span>
                      <span style={{color:T.textDim}}>{"·"}</span>
                      <span style={{color:T.pos[e.pos]||T.gold}}>{e.pos}</span>
                      <span style={{color:T.textDim}}>{"·"}</span>
                      <span>{cardDisplay.split("").map(function(ch,ci){
                        if(ch==="\u2665"||ch==="\u2666")return <span key={ci} style={{color:"#c0392b"}}>{ch}</span>;
                        return <span key={ci}>{ch}</span>;
                      })}</span>
                      <span style={{color:T.textDim}}>{"·"}</span>
                      <span style={{color:T.textDim,fontWeight:500}}>{e.board}</span>
                      {e.boardTexture&&<span style={{fontSize:9,color:e.boardTexture.texture==="wet"?"#5dade2":e.boardTexture.texture==="dry"?"#e67e22":"#95a5a6",fontWeight:600,marginLeft:2}}>{e.boardTexture.texture}</span>}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"0 6px",alignItems:"baseline",marginBottom:4,...F,fontSize:11}}>
                      <span style={{color:e.oppColor||T.textMid}}>{(e.oppEmoji||"")+" "+(e.opp||"")+" player"}</span>
                      <span style={{color:T.textDim}}>{"·"}</span>
                      <span style={{color:isCorrect?T.green:T.red,fontWeight:700}}>{e.action}</span>
                      {!isCorrect&&<><span style={{color:T.textDim}}>{"→"}</span><span style={{color:T.green,fontWeight:700}}>{e.correct}</span></>}
                      <span style={{color:T.textDim}}>{"·"}</span>
                      <span style={{color:e.ev>=0?T.green:T.red,fontWeight:600}}>{(e.ev>=0?"+":"")+e.ev.toFixed(1)+" BB"}</span>
                      {e.closeSpot&&<span style={{fontSize:9,color:T.gold,fontWeight:700}}>{"CLOSE"}</span>}
                      {e.drawOuts>0&&<span style={{fontSize:9,color:"#5dade2",fontWeight:600}}>{e.drawOuts+" outs"}</span>}
                    </div>
                    {e.narrative&&<div style={{fontSize:11,color:T.textDim,fontStyle:"italic",marginBottom:3,lineHeight:1.5,fontWeight:500}}>{e.narrative}</div>}
                    {e.explanation&&<div style={{fontSize:11,color:T.textMid,lineHeight:1.55,fontWeight:500}}>{e.explanation}</div>}
                    {e.seed!=null&&<div style={{fontSize:9,color:"#7abfff",fontFamily:"monospace",marginTop:3,fontWeight:600,cursor:"pointer",display:"inline-block"}} onClick={function(){navigator.clipboard.writeText(encodeSeed(e.seed)).catch(function(){});}}>{encodeSeed(e.seed)}</div>}
                    {settings.showDebug&&e.debugVars&&<div style={{fontSize:10,color:T.textDim,fontFamily:"monospace",marginTop:4,lineHeight:1.7,background:T.bg,padding:"6px 8px",borderRadius:4}}>
                      {e.equity!=null&&<div>{"Equity: "+Math.round(e.equity*100)+"%"}</div>}
                      {e.potOdds!=null&&<div>{"Pot Odds: "+Math.round(e.potOdds*100)+"%"}</div>}
                      {e.gap!=null&&<div>{"Gap: "+(e.gap>=0?"+":"")+Math.round(e.gap*100)+"%"}</div>}
                      {e.category&&<div>{"Hand: "+e.category+(e.strength!=null?" ("+Math.round(e.strength*100)+"%)":"")+(e.handDesc?" — "+e.handDesc:"")}</div>}
                      {e.debugVars.betRangeSize!=null&&<div>{"Bet Range: "+e.debugVars.betRangeSize+" combos"}</div>}
                      {e.debugVars.checkRangeSize!=null&&<div>{"Check Range: "+e.debugVars.checkRangeSize+" combos"}</div>}
                      {e.debugVars.callRangeSize!=null&&<div>{"Call Range: "+e.debugVars.callRangeSize+" combos"}</div>}
                      {e.debugVars.rangeFallback&&<div style={{color:T.red}}>{"Range Fallback (level "+e.debugVars.rangeFallbackLevel+")"}</div>}
                    </div>}
                  </div>;
                })}
              </div>;
            })()}
          </>}
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
          <div style={toggleStyle}>
            <div>
              <div style={{fontSize:14,color:T.text,...F}}>Show hand strength before decision</div>
              <div style={{fontSize:12,color:T.textDim,fontWeight:500,marginTop:2}}>Shows approximate equity before you act</div>
            </div>
            <button onClick={function(){toggleSetting("showPreEq");}} style={toggleBtn(settings.showPreEq)}>
              <div style={toggleDot(settings.showPreEq)}/>
            </button>
          </div>
          <div style={toggleStyle}>
            <div>
              <div style={{fontSize:14,color:T.text,...F}}>Show hand info in narrative</div>
              <div style={{fontSize:12,color:T.textDim,fontWeight:500,marginTop:2}}>Appends "You're holding X, plus Y draw." to each scenario</div>
            </div>
            <button onClick={function(){toggleSetting("showHandInfo");}} style={toggleBtn(settings.showHandInfo)}>
              <div style={toggleDot(settings.showHandInfo)}/>
            </button>
          </div>
          <div style={toggleStyle}>
            <div>
              <div style={{fontSize:14,color:T.text,...F}}>Show opponent hands</div>
              <div style={{fontSize:12,color:T.textDim,fontWeight:500,marginTop:2}}>Display likely opponent hands on mistakes and close spots</div>
            </div>
            <button onClick={function(){toggleSetting("showOppHands");}} style={toggleBtn(settings.showOppHands)}>
              <div style={toggleDot(settings.showOppHands)}/>
            </button>
          </div>
          <div style={{...toggleStyle,borderBottom:"none"}}>
            <div>
              <div style={{fontSize:14,color:T.text,...F}}>Show debug variables</div>
              <div style={{fontSize:12,color:T.textDim,fontWeight:500,marginTop:2}}>Show internal engine data (equity, ranges, pot odds) in hand history</div>
            </div>
            <button onClick={function(){toggleSetting("showDebug");}} style={toggleBtn(settings.showDebug)}>
              <div style={toggleDot(settings.showDebug)}/>
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

  var showOppAction=false;
  var oppBetAmount=0;
  var oppChecked=false;
  if(scenario.street!=="preflop"){
    if(scenario.postflopSit==="ip_vs_bet"||scenario.postflopSit==="oop_check_then_opp_bets"){
      showOppAction=true;oppBetAmount=scenario.betSize;
    }else if(scenario.postflopSit==="ip_vs_check"){
      showOppAction=true;oppChecked=true;
    }else{
      showOppAction=false;
    }
  }

  return <div onClick={function(){setTipState(null);}} style={{minHeight:"100vh",background:T.bg,...F,padding:T.pagePad+"px 16px",display:"flex",flexDirection:"column",alignItems:"center"}}>
    <div style={{width:"100%",maxWidth:T.maxW}}>

      {/* TOOLTIP */}
      {tipState && <div style={{position:"fixed",left:tipState.x,top:tipState.y,transform:tipState.below?"translateX(-50%)":"translate(-50%,-100%)",width:260,boxSizing:"border-box",background:"#fff",border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",fontSize:12,lineHeight:1.55,color:T.text,fontWeight:500,fontFamily:T.font,boxShadow:"0 4px 20px rgba(0,0,0,0.14)",zIndex:200,pointerEvents:"none"}}>{tipState.text}</div>}

      {/* HEADER */}
      <div style={{background:T.panel,borderRadius:T.headerR,padding:dynHeaderPad+"px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,border:"1px solid "+T.border}}>
        <button onClick={function(){setScreen("menu");}} style={{background:"none",border:"none",color:T.textMid,fontSize:12,cursor:"pointer",...F,padding:0}}>{"◂ MENU"}</button>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span className={evPulse==="green"?"ev-pulse-green":evPulse==="red"?"ev-pulse-red":""} style={{fontSize:T.bankrollFont,fontWeight:800,color:stack>=100?T.goldDark:T.red,fontVariantNumeric:"tabular-nums",lineHeight:1,fontFamily:T.font,display:"inline-block"}}>{stack.toFixed(1)}</span>
          <span onMouseEnter={function(e){showTip(e,GLOSSARY["BB_unit"]);}} onMouseLeave={function(){setTipState(null);}} onClick={function(e){showTip(e,GLOSSARY["BB_unit"]);}} style={{cursor:"help"}}><Chip size={T.chipHeader}/></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {replayMode&&!mistakeMode&&<span style={{fontSize:10,color:"#7abfff",fontWeight:700,letterSpacing:"0.04em"}}>{"REPLAY "+(replayTotal-replayQueue.length)+"/"+replayTotal}</span>}
          {mistakeMode&&<span style={{fontSize:10,color:T.red,fontWeight:700,letterSpacing:"0.04em"}}>MISTAKES</span>}
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
            var seatGloss=GLOSSARY[p]||"";
            var seatTip=seatGloss?function(e){e.stopPropagation();showTip(e,seatGloss);}:null;
            return <div key={p} onClick={seatTip} onMouseEnter={seatTip} onMouseLeave={function(){setTipState(null);}} style={{display:"flex",flexDirection:"column",alignItems:"center",marginTop:-halfSeat,cursor:seatGloss?"help":"default"}}>
              <div style={{width:T.seat,height:T.seat,borderRadius:T.seat/2,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isOpp?22:14,color:"#e8e4dc",fontWeight:T.weight,border:T.seatBorder+"px solid "+bCol}}>{isOpp?scenario.opp.emoji:"·"}</div>
              <span style={{fontSize:T.seatLabel,fontWeight:T.weight,color:T.pos[p]||T.textDim,marginTop:4}}>{p}</span>
            </div>;
          })}
        </div>

        {/* TABLE */}
        <div style={{height:TABLE_H,background:T.table,borderRadius:T.tableR,border:"3px solid "+T.tableBorder,boxShadow:"0 4px 24px rgba(0,0,0,0.12),inset 0 0 40px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:T.tableTopPad,paddingBottom:T.tableBotPad,paddingLeft:T.tablePadX,paddingRight:T.tablePadX,position:"relative"}}>

          {/* Row 1: Bet/Check pill */}
          <div style={{height:T.betRowH,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {scenario.street!=="preflop" ? (
              showOppAction ? (
                oppThinking ?
                  <div style={{background:"rgba(0,0,0,0.2)",borderRadius:T.pillR,padding:T.pillPY+"px "+T.pillPX+"px",display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:16}}>🤔</span>
                    <span className="think-pulse" style={{fontSize:T.betFont,fontWeight:T.weight,color:"#8a9aaa",fontFamily:T.font,letterSpacing:"0.06em"}}>Thinking<span className="dot-1">.</span><span className="dot-2">.</span><span className="dot-3">.</span></span>
                  </div>
                : oppBetAmount>0 ?
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
          {(function(){var nc=scenario.board.length;boardDoneRef.current=nc>0?375+(nc-1)*125+200:0;})()}
          <div style={{height:T.boardRowH,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {scenario.board.length>0 ?
              <div style={{display:"flex",gap:T.bcGap}}>{scenario.board.map(function(c,i){return <CCard key={animKey+"-b"+i} card={c} board={true} animDelay={375+i*125} bcW={dynBcW} bcH={dynBcH} bcRank={dynBcRank} bcSuit={dynBcSuit}/>;})}</div>
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

          {/* Seed display — bottom-left of table */}
          <div style={{position:"absolute",bottom:6,left:T.tablePadX*2,display:"flex",alignItems:"center",gap:2}}>
            <input value={seedInput} onChange={function(e){setSeedInput(e.target.value.toUpperCase());}} onKeyDown={function(e){if(e.key==="Enter")replaySeed(seedInput);}} style={{background:"transparent",border:"none",color:"#7abfff",fontSize:9,fontFamily:"monospace",fontWeight:600,width:56,padding:0,outline:"none",letterSpacing:"0.06em"}} spellCheck="false"/>
            <button onClick={function(){replaySeed(seedInput);}} style={{background:"none",border:"none",color:"#7abfff",fontSize:10,cursor:"pointer",padding:0,lineHeight:1,opacity:0.8}}>{"▶"}</button>
          </div>

          {/* Mistake mode — 5 circles bottom-right */}
          {mistakeMode && <div style={{position:"absolute",bottom:8,right:T.tablePadX*2,display:"flex",alignItems:"center",gap:5}}>
            {mistakeResults.map(function(r,i){
              var bg=r==="green"?T.green:r==="red"?T.red:"rgba(255,255,255,0.15)";
              var bdr=i===mistakeIndex&&r==null?"2px solid rgba(255,255,255,0.6)":"2px solid transparent";
              return <div key={i} style={{width:10,height:10,borderRadius:5,background:bg,border:bdr,transition:"background 0.3s, border 0.3s"}}/>;
            })}
          </div>}

          {/* Mistake mode — flawless celebration overlay */}
          {mistakeBonus!=null && <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(74,138,90,0.95)",color:"#fff",padding:"14px 24px",borderRadius:10,fontSize:15,fontWeight:800,fontFamily:T.font,textAlign:"center",zIndex:100,boxShadow:"0 4px 24px rgba(0,0,0,0.3)"}}>
            {"Flawless! +"+mistakeBonus+" BB"}
          </div>}
        </div>

        {/* YOU seat */}
        {(function(){
          var youGloss=GLOSSARY[scenario.pos]||"";
          var youTip=youGloss?function(e){e.stopPropagation();showTip(e,youGloss);}:null;
          return <div onClick={youTip} onMouseEnter={youTip} onMouseLeave={function(){setTipState(null);}} style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",marginBottom:-45,zIndex:2,cursor:youGloss?"help":"default"}}>
            <div style={{width:T.seat,height:T.seat,borderRadius:T.seat/2,background:T.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:800,border:T.seatBorder+"px solid "+T.goldDark}}>YOU</div>
            <span style={{fontSize:T.seatLabel,fontWeight:T.weight,color:T.pos[scenario.pos]||T.gold,marginTop:4}}>{scenario.pos}</span>
          </div>;
        })()}

      </div>

      {/* NARRATIVE */}
      <div onClick={function(){setTipState(null);}} style={{height:dynNarrH,background:T.panel,borderRadius:T.narrR,border:"1px solid "+T.border,marginBottom:T.gapNarrToHand,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:"1 1 auto",padding:"14px 18px",fontSize:T.narrFont,lineHeight:T.narrLineH,color:T.text,fontWeight:600,fontFamily:T.font,overflowY:"auto"}}>
          {phase==="action" ? <div>{(function(){
            var pN=scenario.pos,oE=scenario.opp.emoji,oN=scenario.opp.name;
            var oP=scenario.oppPos;
            var oppGloss=GLOSSARY[oN]||"";
            var oppSpan=<span onMouseEnter={oppGloss?function(e){showTip(e,oppGloss);}:null} onMouseLeave={function(){setTipState(null);}} onClick={oppGloss?function(e){e.stopPropagation();showTip(e,oppGloss);}:null} style={{color:scenario.opp.color,fontWeight:T.weight,cursor:oppGloss?"help":"default"}}>{oE+" "+oN+" player"}</span>;
            var hI="";
            if(settings.showHandInfo){
              if(scenario.board.length>0){
                var info=classify(scenario.playerHand,scenario.board);
                var dt=(!isR&&info.draws.length>0)?", plus "+info.draws.map(function(d){return d.desc;}).join(" and "):"";
                hI=" You're holding "+info.handDesc.toLowerCase()+dt+".";
              }else{hI=" You're holding "+nota+".";}
            }

            var preEqLine=null;
            if(settings.showPreEq&&scenario.board.length>0){
              var pInfo=classify(scenario.playerHand,scenario.board);
              var pEq=Math.round(pInfo.strength*100);
              preEqLine=<div style={{fontSize:12,color:T.textDim,marginTop:6,fontWeight:500,fontStyle:"italic"}}>{"Hand strength: ~"+pEq+"% vs estimated range"}</div>;
            }

            if(scenario.street==="preflop"){
              if(scenario.preflopSit==="vs_raise")return <span>{oppSpan}{" raises to "}<BV value={2.5} fs={14} color={T.goldDark} cs={16}/>{" from "}<PB pos={oP} showTip={showTip}/>{". You're at "}<PB pos={pN} showTip={showTip}/>{"."}{hI}</span>;
              return <span>{"You're at "}<PB pos={pN} showTip={showTip}/>{"."}{hI}</span>;
            }

            var sit=scenario.postflopSit;
            var sp=oppThinking
              ?{filter:"blur(5px)",opacity:0.25,transition:"none",display:"inline"}
              :{filter:"blur(0px)",opacity:1,transition:"filter 0.5s ease-out, opacity 0.5s ease-out",display:"inline"};

            if(sit==="ip_vs_bet"){
              return <span>{"It's the "}<StreetBadge street={scenario.street} showTip={showTip}/>{". "}{oppSpan}{" at "}<PB pos={oP} showTip={showTip}/><span style={sp}>{" bets "}<BV value={scenario.betSize} fs={14} color={T.goldDark} cs={16}/>{" into a "}<BV value={scenario.potSize-scenario.betSize} fs={14} color={T.goldDark} cs={16}/>{" pot"}</span>{". You're at "}<PB pos={pN} showTip={showTip}/>{"."}{hI}{preEqLine}</span>;
            }
            if(sit==="ip_vs_check"){
              return <span>{"It's the "}<StreetBadge street={scenario.street} showTip={showTip}/>{". "}{oppSpan}{" at "}<PB pos={oP} showTip={showTip}/><span style={sp}>{" checks"}</span>{". You're at "}<PB pos={pN} showTip={showTip}/>{"."}{hI}{preEqLine}</span>;
            }
            if(sit==="oop_first_to_act"){
              return <span>{"It's the "}<StreetBadge street={scenario.street} showTip={showTip}/>{". You act first at "}<PB pos={pN} showTip={showTip}/>{". "}{oppSpan}{" at "}<PB pos={oP} showTip={showTip}/>{" acts after you."}{hI}{preEqLine}</span>;
            }
            if(sit==="oop_check_then_opp_bets"){
              return <span>{"It's the "}<StreetBadge street={scenario.street} showTip={showTip}/>{". You checked at "}<PB pos={pN} showTip={showTip}/>{". "}{oppSpan}{" at "}<PB pos={oP} showTip={showTip}/><span style={sp}>{" bets "}<BV value={scenario.betSize} fs={14} color={T.goldDark} cs={16}/>{" into a "}<BV value={scenario.potSize-scenario.betSize} fs={14} color={T.goldDark} cs={16}/>{" pot"}</span>{"."}{hI}{preEqLine}</span>;
            }
            return <span>{"It's the "}<StreetBadge street={scenario.street} showTip={showTip}/>{". You're at "}<PB pos={pN} showTip={showTip}/>{"."}{hI}</span>;
          })()}</div>
          : <>
            <div className="badge-anim" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{display:"inline-block",padding:"4px 12px",borderRadius:4,background:feedback.rating==="green"?T.green:feedback.rating==="yellow"?T.gold:T.red,color:"#fff",fontWeight:T.weight,fontSize:13}}>
                {feedback.rating==="green"?"✓ Correct":feedback.rating==="yellow"?"≈ Acceptable":"✗ Mistake"}
              </span>
              {feedback.evDiff!==0 && <span style={{fontWeight:T.weight,fontSize:14,color:feedback.evDiff>=0?T.green:T.red}}>{(feedback.evDiff>=0?"+":"")+feedback.evDiff.toFixed(1)+" BB"}</span>}
            </div>
            {feedback.rating!=="green" && <div className="fb-anim" style={{fontSize:14,color:T.goldDark,fontWeight:T.weight,marginBottom:6}}>{"Best: "+feedback.best}</div>}
            <div className="fb-anim" style={{fontSize:13.5,lineHeight:1.7,fontWeight:500,animationDelay:"80ms"}}><NT text={feedback.explanation} showTip={showTip}/></div>
            {((feedback.debug&&feedback.debug.mcEq!=null)||(feedback.suspectLine&&settings.showOppHands&&(feedback.rating!=="green"||feedback.debug.closeSpot))) && <div className="fb-anim" style={{animationDelay:"160ms"}}><SuspectLine hands={feedback.suspectLine} show={settings.showOppHands&&(feedback.rating!=="green"||(feedback.debug&&feedback.debug.closeSpot))} eq={feedback.debug?feedback.debug.mcEq:null} needed={feedback.debug?feedback.debug.potOdds:null} showPct={settings.showPct} showTip={showTip}/></div>}
          </>}
        </div>
      </div>

      {/* HAND + ACTIONS */}
      <div style={{display:"flex",gap:T.cardGap,width:"100%",alignItems:"flex-start"}}>
        <div style={{flex:"0 0 65%",display:"flex",gap:T.cardGap,justifyContent:"center"}}>
          {dh.map(function(c,i){return <CCard key={animKey+"-h"+i} card={c} animDelay={i*250} cardW={dynCardW} cardH={dynCardH} cardRank={dynCardRank} cardSuit={dynCardSuit}/>;})}
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
          {phase==="action" ? actions.map(function(a){
            var passive=a==="Fold"||a==="Check";
            return <button key={a} onClick={function(){act(a);}} style={{padding:T.btnPadY+"px 4px",borderRadius:T.btnR,cursor:"pointer",border:passive?"2px solid "+T.border:"2px solid transparent",background:passive?"transparent":T.gold,color:passive?T.textMid:"#fff",...F,fontSize:T.btnFont,letterSpacing:"0.04em",transition:"transform 0.1s, background 0.2s, border-color 0.2s",...(btnFlash&&btnFlash.action===a?{background:btnFlash.rating==="green"?T.green:btnFlash.rating==="yellow"?T.gold:T.red,color:"#fff",borderColor:"transparent"}:{})}} onMouseDown={function(e){e.currentTarget.style.transform="scale(0.95)";}} onMouseUp={function(e){e.currentTarget.style.transform="scale(1)";}} onMouseLeave={function(e){e.currentTarget.style.transform="scale(1)";}}>{a.toUpperCase()}</button>;
          }) : <button onClick={goNext} style={{padding:T.btnPadY+"px 4px",borderRadius:T.btnR,cursor:"pointer",border:"2px solid "+T.border,background:"transparent",color:T.text,...F,fontSize:T.btnFont}}>{"NEXT →"}</button>}
        </div>
      </div>

    </div>
    <style>{["*{box-sizing:border-box;margin:0;padding:0}","::-webkit-scrollbar{width:4px}","::-webkit-scrollbar-track{background:transparent}","::-webkit-scrollbar-thumb{background:"+T.border+";border-radius:2px}",
    "@keyframes cardIn{from{opacity:0;transform:translateY(40px) rotate(4deg)}to{opacity:1;transform:translateY(0) rotate(0deg)}}",
    "@keyframes boardIn{from{opacity:0;transform:translateY(-28px) rotate(-3deg)}to{opacity:1;transform:translateY(0) rotate(0deg)}}",
    "@keyframes fadeSlideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}",
    "@keyframes badgePop{0%{transform:scale(0.85)}60%{transform:scale(1.06)}100%{transform:scale(1)}}",
    "@keyframes evPulseGreen{0%{transform:scale(1)}50%{transform:scale(1.12);color:"+T.green+"}100%{transform:scale(1)}}",
    "@keyframes evPulseRed{0%{transform:scale(1)}50%{transform:scale(1.12);color:"+T.red+"}100%{transform:scale(1)}}",
    "@keyframes btnPress{0%{transform:scale(1)}50%{transform:scale(0.95)}100%{transform:scale(1)}}",
    "@keyframes dot1{0%,80%,100%{opacity:0.2}40%{opacity:1}}",
    "@keyframes dot2{0%,80%,100%{opacity:0.2}60%{opacity:1}}",
    "@keyframes dot3{0%,80%,100%{opacity:0.2}80%{opacity:1}}",
    "@keyframes thinkPulse{0%,100%{opacity:0.5}50%{opacity:1}}",
    ".dot-1{animation:dot1 1.2s infinite}",
    ".dot-2{animation:dot2 1.2s infinite}",
    ".dot-3{animation:dot3 1.2s infinite}",
    ".think-pulse{animation:thinkPulse 1.8s ease-in-out infinite}",
    "@keyframes narrIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}",
    ".narr-anim{animation:narrIn 0.4s ease-out both}",
    ".card-anim{animation:cardIn 0.25s ease-out both}",
    ".board-anim{animation:boardIn 0.2s ease-out both}",
    ".fb-anim{animation:fadeSlideIn 0.3s ease-out both}",
    ".badge-anim{animation:badgePop 0.35s ease-out both}",
    ".ev-pulse-green{animation:evPulseGreen 0.5s ease-out}",
    ".ev-pulse-red{animation:evPulseRed 0.5s ease-out}",
    ".btn-press{animation:btnPress 0.15s ease-out}",
    ].join("")}</style>
  </div>;
}
