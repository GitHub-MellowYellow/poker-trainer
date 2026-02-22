// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS — all visual constants in one place
// ═══════════════════════════════════════════════════════════════

export const T = {
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

  gapToTable: 27,
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

// Suit colour map
export var SC = {};
SC["♠"] = T.spade;
SC["♥"] = T.heart;
SC["♦"] = T.diamond;
SC["♣"] = T.club;

// ═══════════════════════════════════════════════════════════════
// CARD / POSITION CONSTANTS
// ═══════════════════════════════════════════════════════════════

export var SUITS = ["♠","♥","♦","♣"];
export var RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
export var RV = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,T:10,J:11,Q:12,K:13,A:14};
export var RD = {T:"10",J:"J",Q:"Q",K:"K",A:"A"};
export var RN = {2:"deuce",3:"three",4:"four",5:"five",6:"six",7:"seven",8:"eight",9:"nine",T:"ten",J:"jack",Q:"queen",K:"king",A:"ace"};

export var P6 = ["UTG","MP","CO","BTN","SB","BB"];
export var P3 = ["BTN","SB","BB"];
export var SN = { preflop:"Preflop", flop:"Flop", turn:"Turn", river:"River" };

// Post-flop acting order (lower index = acts first = OOP)
export var POSTFLOP_ORDER = { SB:0, BB:1, UTG:2, MP:3, CO:4, BTN:5 };

export var OPP = [
  { id:"tight",   name:"Careful", emoji:"🛡️", color:T.oppTight },
  { id:"neutral", name:"Regular", emoji:"⚖️", color:T.oppNeutral },
  { id:"aggro",   name:"Aggro",   emoji:"🔥", color:T.oppAggro },
];

// ═══════════════════════════════════════════════════════════════
// GLOSSARY — beginner-friendly tooltip definitions
// ═══════════════════════════════════════════════════════════════

export var GLOSSARY = {
  "Careful": "💡 The 'Rock.' This player only plays premium hands. If they are betting, they aren't kidding—they have something strong.",
  "Regular": "💡 A disciplined strategist. They play a balanced game, mixing strong hands with calculated bluffs to keep you guessing.",
  "Aggro": "💡 A high-pressure player who uses chips as a weapon. They win by making you uncomfortable enough to fold.",
  "UTG": "💡 Under the Gun. First to act with the whole table waiting to pounce. You need a powerhouse hand to survive crossfire.",
  "MP": "💡 Middle Position. Not good, not terrible. You need strong hands to have a chance since the best seats act after you.",
  "CO": "💡 Cut-Off. A prime seat to 'steal' the pot before the dealer gets a chance. Only two players left to act after you.",
  "BTN": "💡 The Button. The best seat in the house. You act last, getting a free look at everyone's moves before you make yours.",
  "SB": "💡 Small Blind. A forced bet in a tough spot. You act first after the flop, making it an uphill battle to win the hand.",
  "BB": "💡 Big Blind. Forced bet. You get a 'discount' to see the flop, but you'll be defending your territory from a difficult position later.",
  "BB_unit": "💡 The currency of poker strategy. It measures your stack size relative to the stakes rather than the dollar amount.",
  "preflop": "💡 The opening act. You only know your two private cards and the strength of your position.",
  "flop": "💡 The first three shared cards. This is where most hands are won, lost, or defined.",
  "turn": "💡 The fourth shared card. The plot thickens and the price of staying in the hand usually goes up.",
  "river": "💡 The fifth and final card. No more help is coming—it's time for the moment of truth.",
  "overpair": "💡 Your pocket pair is higher than any card on the board. A strong hand, but watch out for 'wet' boards.",
  "top pair": "💡 You paired the highest card on the table. A reliable hand, though its strength depends on your second card (the kicker).",
  "middle pair": "💡 One of your cards matches a middle card on the board. Vulnerable to anyone with the top pair; proceed with caution.",
  "bottom pair": "💡 You paired the lowest card on the table. Often a 'fold' waiting to happen unless you're catching a bluff.",
  "two pair": "💡 Strong if both pairs come from your hole cards, but riskier if one pair is shared by everyone on the board.",
  "three of a kind": "💡 A powerhouse hand that often stays hidden, ready to trap over-confident opponents.",
  "full house": "💡 Three of a kind plus a pair. A near-invincible hand that usually takes down the entire pot.",
  "flush": "💡 Five cards of the same suit. Strong and hard to beat, unless the board shows a pair for a possible full house.",
  "straight": "💡 Five cards in numerical order. A deceptive hand that can crush players holding high pairs.",
  "underpair": "💡 Your pocket pair is lower than everything on the board. You're looking for a miracle or a quick exit.",
  "ace high": "💡 No pair, just an Ace. Sometimes enough to win against a total bluff, but rarely enough to bet on.",
  "overcards": "💡 No pair yet, but both your cards are higher than the board. You're looking for a lucky catch on the next street.",
  "pocket pair": "💡 Two of the same card in your hand. A head start that can turn into a monster if you hit a third matching card.",
  "high card": "💡 The weakest possible hand. If you're here at the river, you're either bluffing or losing.",
  "flush draw": "💡 You have four cards of one suit and need one more. You have a ~35% chance to hit by the river.",
  "straight draw": "💡 You're one card short of a straight. A work-in-progress hand that needs the right card to become profitable.",
  "open-ended": "💡 Four cards in a row that can be completed at either end. With 8 possible 'outs,' you have a solid chance at glory.",
  "OESD": "💡 Open-Ended Straight Draw. You have 8 cards in the deck that can complete your hand. One of the best draws to have.",
  "gutshot": "💡 An 'inside' straight draw. You need one specific middle card to hit. A long shot, but it hits like a bolt of lightning.",
  "semi-bluff": "💡 Betting with a weak hand that has potential. You win by forcing a fold now or hitting your card later.",
  "bluff-catcher": "💡 A hand that can't beat a serious bet but crushes a lie. You're playing a game of 'I don't believe you.'",
  "pot odds": "💡 The price of the 'call' versus the size of the prize. Tells you if your draw is a smart investment or a bad gamble.",
  "+EV": "💡 Positive Expected Value. A move that makes money over the long run, even if this specific hand ends in disaster.",
  "value": "💡 Betting because you want to get paid. You believe you have the best hand and want the opponent to call with worse.",
  "profitable": "💡 A play that consistently adds to your stack over hundreds of sessions.",
  "Wet board": "💡 Coordinated cards where straights and flushes are lurking. Your strong hand might need an umbrella.",
  "Dry board": "💡 Disconnected and safe. If you have the best hand now, you'll likely have it on the river.",
  "Mixed board": "💡 Between wet and dry—some draws are possible, but the board isn't a total minefield yet.",
  "Fold": "💡 Releasing your cards. The most important move in poker—it saves you from losing chips you don't have to.",
  "Call": "💡 Matching the current bet. You're paying to see the next card or to reach the showdown.",
  "Raise": "💡 Increasing the price of admission. It forces your opponents to have a real hand or get out of the way.",
  "3-Bet": "💡 The first re-raise. It turns up the heat to build a pot with strong hands, seize control of the action, or pressure a weak raiser into folding.",
  "Check": "💡 A tactical pass. Use it to see a free card or to set a trap for an aggressive opponent.",
  "Bet": "💡 Being the first to put chips in. It takes the lead and puts the pressure on everyone else.",
  "range": "💡 The set of hands an opponent could be playing based on their actions and player type.",
};

// ═══════════════════════════════════════════════════════════════
// PREFLOP RANGES
// ═══════════════════════════════════════════════════════════════

export var OPEN = {
  UTG: new Set(["AA","KK","QQ","JJ","TT","99","88","77","AKs","AQs","AJs","ATs","A5s","A4s","AKo","AQo","KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s"]),
  MP:  new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","A5s","A4s","A3s","AKo","AQo","AJo","KQs","KJs","KTs","K9s","QJs","QTs","Q9s","JTs","J9s","T9s","98s","87s"]),
  CO:  new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","K7s","KQo","KJo","KTo","QJs","QTs","Q9s","Q8s","QJo","QTo","JTs","J9s","J8s","JTo","T9s","T8s","98s","97s","87s","76s","65s"]),
  BTN: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","KQo","KJo","KTo","K9o","QJs","QTs","Q9s","Q8s","Q7s","QJo","QTo","JTs","J9s","J8s","J7s","JTo","T9s","T8s","T7s","98s","97s","96s","87s","86s","76s","75s","65s","64s","54s"]),
  SB:  new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","AKo","AQo","AJo","ATo","A9o","KQs","KJs","KTs","K9s","K8s","KQo","KJo","KTo","QJs","QTs","Q9s","QJo","JTs","J9s","T9s","98s","87s"]),
};

export var BB_VS = {
  threebet: new Set(["AA","KK","QQ","JJ","AKs","AKo","AQs","A5s","A4s"]),
  call:     new Set(["TT","99","88","77","66","55","44","33","22","AJs","ATs","A9s","A8s","A7s","A6s","A3s","A2s","AQo","AJo","KQs","KJs","KTs","K9s","KQo","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","97s","87s","76s","65s","54s"]),
};

export var SB_VS = {
  threebet: new Set(["AA","KK","QQ","JJ","TT","AKs","AKo","AQs","AJs"]),
  call:     new Set(["99","88","77","ATs","A9s","AQo","KQs","KJs","QJs","JTs","T9s"]),
};
