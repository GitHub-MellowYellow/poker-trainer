// ═══════════════════════════════════════════════════════════════
// NARRATIVE MODULE — decision-tree-based explanation builder
// Replaces the old linear buildNarr() with outcome-aware,
// reconciliation-aware, snappy narratives.
// ═══════════════════════════════════════════════════════════════

// ── Opener pools (rotated to avoid repetition) ──────────────

var CORRECT_OPENERS = ["Correct.", "Right call.", "Solid.", "Good read.", "Well played.", "Spot on.", "Sharp."];
var CORRECT_FOLD = ["Good fold.", "Right fold.", "Disciplined.", "Smart fold.", "Correct."];
var CORRECT_CHECK = ["Good check.", "Right check.", "Correct.", "Solid.", "Smart."];
var CORRECT_BET = ["Good bet.", "Right bet.", "Correct.", "Solid.", "Well played."];
var CORRECT_RAISE = ["Good raise.", "Solid.", "Correct.", "Right raise.", "Well played."];
var CLOSE_CORRECT_OPENERS = ["Edge case.", "Razor-thin.", "Close call.", "Marginal spot."];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function openerForCorrect(best) {
  if (best === "Fold") return pick(CORRECT_FOLD);
  if (best === "Check") return pick(CORRECT_CHECK);
  if (best === "Bet") return pick(CORRECT_BET);
  if (best === "Raise") return pick(CORRECT_RAISE);
  return pick(CORRECT_OPENERS);
}

// ── Helpers ──────────────────────────────────────────────────

function potOddsCalc(pot, bet) {
  return bet <= 0 ? 0 : bet / (pot + bet);
}

function eqWord(mcEq, needed) {
  // Intuitive equity descriptions (no numbers)
  var gap = mcEq - (needed || 0);
  if (mcEq >= 0.70) return "well ahead";
  if (mcEq >= 0.55) return "comfortably ahead";
  if (gap > 0.15) return "ahead with a good price";
  if (gap > 0.05) return "ahead of their range";
  if (gap > -0.03) return "roughly even";
  if (gap > -0.10) return "slightly behind";
  return "behind";
}

function sizingWord(bet, pot) {
  if (bet <= 0) return "";
  var ratio = bet / (pot - bet); // bet as fraction of original pot
  if (ratio >= 0.7) return "Big bet.";
  if (ratio >= 0.4) return "";  // standard, don't mention
  return "Small bet — good price.";
}

function texPhrase(tex, street) {
  if (!tex || tex.texture === "none") return "";
  var isR = street === "river";
  if (isR) {
    if (tex.flushComplete) return " — flush completed on board";
    if (tex.straightComplete) return " — straight possible on board";
    if (tex.texture === "dry") return " on a dry runout";
    return "";
  }
  if (tex.texture === "wet") {
    if (tex.straightPossible && tex.flushDraw) return " on a wet board (flush and straight draws)";
    if (tex.straightPossible) return " on a connected board";
    if (tex.flushDraw) return " on a wet board";
    return " on a wet board";
  }
  if (tex.texture === "dry") return " on a dry board";
  if (tex.straightPossible) return " on a connected board";
  return "";
}

function drawPhrase(info, street) {
  if (street === "river") return "";
  var draws = info.draws;
  if (!draws || !draws.length) return "";
  var descs = draws.map(function(d) { return d.desc; });
  return " with " + descs.join(" and ");
}

// ── Reconciliation detection ────────────────────────────────

function reconcile(category, mcEq, facingBet) {
  var absWeak = category === "trash" || category === "weak";
  var absStrong = category === "strong" || category === "good" || category === "monster";
  var eqStrong = facingBet ? mcEq >= 0.40 : mcEq >= 0.50;
  var eqWeak = facingBet ? mcEq < 0.25 : mcEq < 0.40;

  if (absWeak && eqStrong) return "weak_hand_strong_eq";
  if (absStrong && eqWeak) return "strong_hand_weak_eq";
  return "aligned";
}

// ── Opponent context fragments ──────────────────────────────

function oppNote(opp, facingBet, best) {
  var id = opp.id;
  if (facingBet) {
    if (id === "tight") {
      if (best === "Fold") return "Careful player — their bet means a real hand.";
      if (best === "Call") return "Careful player rarely bluffs, but you're strong enough.";
      if (best === "Raise") return "Even against a Careful player, too strong not to raise.";
      return "";
    }
    if (id === "aggro") {
      if (best === "Fold") return "Even against an Aggro player, nothing to bluff-catch with.";
      if (best === "Call") return "Aggro player bets wide — your hand works as a bluff-catcher.";
      if (best === "Raise") return "Aggro player's wide range — punish it with a raise.";
      return "";
    }
    if (best === "Fold") return ""; // main narrative already covers range assessment
    if (best === "Call") return "Enough equity to call against a balanced range.";
    if (best === "Raise") return "Strong enough to raise for value.";
    return "";
  } else {
    if (id === "tight") {
      if (best === "Bet") return "Careful player checking signals weakness — take the pot.";
      if (best === "Check") return "Careful player checked, but your hand can't profit from betting.";
      return "";
    }
    if (id === "aggro") {
      if (best === "Bet") return "Aggro player checking means genuine weakness.";
      if (best === "Check") return "Aggro player checked, but your hand isn't strong enough to exploit.";
      return "";
    }
    if (best === "Bet") return "Their check signals weakness.";
    if (best === "Check") return ""; // core already says "betting only gets called by better" — avoid duplication
    return "";
  }
}

// ── Reconciliation bridge phrases ───────────────────────────

function weakHandBridge(info, opp, mcEq, facingBet) {
  var hd = info.handDesc;
  if (facingBet) {
    if (opp.id === "aggro") return hd + " — weak in isolation, but ahead of an Aggro player's wide range.";
    if (opp.id === "tight") return hd + " — normally too weak, but the math says you have enough here.";
    return hd + " — looks weak, but performs well against their range.";
  }
  // not facing bet (value betting a "weak" hand)
  if (opp.id === "aggro") return hd + " — not much, but their checking range is weaker.";
  return hd + " — weak label, but ahead of what they're showing.";
}

function strongHandBridge(info, opp, mcEq, facingBet) {
  var hd = info.handDesc;
  if (facingBet) {
    return hd + " — looks strong, but their betting range has you beaten here.";
  }
  return hd + " — strong hand, but betting only gets called by better on this board.";
}

// ── Core narrative builders ─────────────────────────────────

function buildPostflop(ctx) {
  var best = ctx.bestAction;
  var rating = ctx.rating;
  var info = ctx.info;
  var opp = ctx.opp;
  var mcEq = ctx.mcEq;
  var street = ctx.street;
  var pot = ctx.pot;
  var bet = ctx.bet;
  var closeSpot = ctx.closeSpot;
  var showPct = ctx.showPct;
  var facingBet = bet > 0;
  var isR = street === "river";

  var hd = info.handDesc;
  var origHd = hd;
  var draws = isR ? [] : info.draws;
  var drawOuts = isR ? 0 : info.drawOuts;
  var dt = draws.map(function(d) { return d.desc; }).join(" and ");
  if (hd === "Nothing" && draws.length > 0) {
    hd = dt.charAt(0).toUpperCase() + dt.slice(1);
  }

  var tex = info.boardTexture;
  var tp = texPhrase(tex, street);
  var dp = drawPhrase(info, street);
  var recon = reconcile(info.category, mcEq, facingBet);

  // Equity display (only with showPct)
  var eqPct = mcEq != null ? Math.round(mcEq * 100) : null;
  var needed = facingBet ? potOddsCalc(pot, bet) : null;
  var pov = needed != null ? Math.round(needed * 100) : null;
  var origPot = facingBet ? pot - bet : pot;

  var eqStr = "";
  if (showPct && eqPct != null) {
    if (facingBet) {
      eqStr = " " + eqPct + "% equity, needing " + pov + "%.";
    } else {
      eqStr = " " + eqPct + "% equity vs their range.";
    }
  }

  var sizing = sizingWord(bet, pot);

  // ── CLOSE SPOT ────────────────────────────────────────────
  if (closeSpot) {
    var closeBase;
    if (facingBet) {
      if (opp.id === "tight" && best === "Fold") closeBase = hd + tp + " — marginal. Careful player's tight range tips it toward folding.";
      else if (opp.id === "tight" && best === "Call") closeBase = hd + tp + " — just enough to call. Careful player rarely bluffs, but the price is right.";
      else if (opp.id === "aggro" && best === "Call") closeBase = hd + tp + " — close, but Aggro player's wide range gives you enough to continue.";
      else if (opp.id === "aggro" && best === "Fold") closeBase = hd + tp + " — close, but even against a wide range you're just below breakeven.";
      else closeBase = hd + tp + " — genuinely close. Both calling and folding are reasonable.";
    } else {
      closeBase = hd + tp + " — borderline. Checking is slightly better but betting isn't wrong.";
    }
    return closeBase + eqStr;
  }

  // ── FACING BET ────────────────────────────────────────────
  if (facingBet) {
    // FOLD
    if (best === "Fold") {
      if (drawOuts > 0) {
        var foldCore = origHd === "Nothing" ? hd : origHd + " plus " + dt;
        return foldCore + tp + " — draws don't close the gap." + eqStr + " " + oppNote(opp, true, best);
      }
      if (isR) {
        return hd + tp + " — not strong enough to beat their value range. Nothing left to draw to. " + oppNote(opp, true, best);
      }
      if (recon === "strong_hand_weak_eq") {
        return strongHandBridge(info, opp, mcEq, true) + eqStr + " " + oppNote(opp, true, best);
      }
      return hd + tp + " — not enough against this range." + (sizing ? " " + sizing : "") + eqStr + " " + oppNote(opp, true, best);
    }

    // CALL
    if (best === "Call") {
      if (recon === "weak_hand_strong_eq") {
        return weakHandBridge(info, opp, mcEq, true) + (sizing ? " " + sizing : "") + eqStr;
      }
      if (drawOuts >= 6) {
        var callCore = origHd === "Nothing" ? hd : origHd + " plus " + dt;
        return callCore + tp + " — draws give you a solid edge over the price." + eqStr;
      }
      return hd + tp + " — " + eqWord(mcEq, needed) + "." + (sizing ? " " + sizing : "") + eqStr + " " + oppNote(opp, true, best);
    }

    // RAISE
    if (best === "Raise") {
      if (recon === "weak_hand_strong_eq") {
        return weakHandBridge(info, opp, mcEq, true) + " Raise for value." + eqStr;
      }
      return hd + tp + " — " + eqWord(mcEq, needed) + ". Raise for value." + eqStr + " " + oppNote(opp, true, best);
    }
  }

  // ── NOT FACING BET (check/bet decision) ───────────────────
  // BET
  if (best === "Bet") {
    if (draws.length > 0 && ["good", "strong", "monster"].indexOf(info.category) === -1) {
      // semi-bluff
      return hd + tp + (origHd !== "Nothing" ? dp : "") + " — not much yet, but outs if called. Take it down or improve.";
    }
    if (recon === "weak_hand_strong_eq") {
      return weakHandBridge(info, opp, mcEq, false) + " Worse hands will call." + eqStr;
    }
    return hd + tp + " — worse hands will call." + eqStr + " " + oppNote(opp, false, best);
  }

  // CHECK
  if (best === "Check") {
    if (isR) {
      return hd + tp + " — betting only gets called by better. Take the showdown. " + oppNote(opp, false, best);
    }
    if (recon === "strong_hand_weak_eq") {
      return strongHandBridge(info, opp, mcEq, false);
    }
    return hd + tp + " — betting only gets called by better. Take the free card. " + oppNote(opp, false, best);
  }

  return hd + ". " + oppNote(opp, facingBet, best);
}

// ── Outcome framing (wraps the core narrative) ──────────────

function frameCorrect(ctx, core) {
  return openerForCorrect(ctx.bestAction) + " " + core;
}

function frameAcceptable(ctx, core) {
  var best = ctx.bestAction;
  var user = ctx.userAction;
  return user + " is OK, but " + best.toLowerCase() + " is slightly better. " + core;
}

function frameMistake(ctx, core) {
  var best = ctx.bestAction;
  // Lead with the correct action directly
  return best + " here. " + core;
}

function frameCloseCorrect(ctx, core) {
  return pick(CLOSE_CORRECT_OPENERS) + " " + core;
}

function frameCloseAcceptable(ctx, core) {
  var best = ctx.bestAction;
  var user = ctx.userAction;
  return "Close enough. " + best + " is marginally better, but " + user + " works here. " + core;
}

function frameCloseMistake(ctx, core) {
  var best = ctx.bestAction;
  var user = ctx.userAction;
  // Non-facing-bet check close spot: avoid saying "Bet isn't one of the options"
  // right before the core that says "betting isn't wrong" — they contradict each other.
  if (!ctx.bet && best === "Check") {
    return "Close, but check is the cleaner play. " + core;
  }
  return best + " here — it's a close spot, but " + user + " isn't one of the options. " + core;
}

// ── Main entry point ────────────────────────────────────────

export function buildNarrative(ctx) {
  var core = buildPostflop(ctx);
  // Clean up double spaces
  core = core.replace(/  +/g, " ").trim();

  if (ctx.closeSpot) {
    if (ctx.rating === "green" && ctx.userAction === ctx.bestAction)
      return frameCloseCorrect(ctx, core);
    if (ctx.rating === "green")
      return frameCloseAcceptable(ctx, core);
    return frameCloseMistake(ctx, core);
  }

  if (ctx.rating === "green") return frameCorrect(ctx, core);
  if (ctx.rating === "yellow") return frameAcceptable(ctx, core);
  return frameMistake(ctx, core);
}

// ── Preflop narrative builder ───────────────────────────────

export function buildPreNarrative(ctx) {
  // ctx: { userAction, bestAction, rating, nota, pos, sit, strengthNote, playersLeft }
  var nota = ctx.nota;
  var pos = ctx.pos;
  var sit = ctx.sit;
  var best = ctx.bestAction;
  var rating = ctx.rating;
  var sn = ctx.strengthNote;
  var pl = ctx.playersLeft;

  // Strip praise that contradicts a fold recommendation
  if (best === "Fold" && sn) {
    sn = sn.replace(/\. Playable from most positions[^.]*\./, " — but not from this position.");
    sn = sn.replace(/Plays well from most positions[^.]*\./, "but not strong enough from " + pos + ".");
    sn = sn.replace(/Very strong in any position\./, "but position matters here.");
  }

  // Strip fold-context warnings that contradict a raise recommendation
  if (best === "Raise" && sn) {
    sn = sn.replace(/ Often dominated by better hands[^.]*\./, "");
  }

  var core;

  if (sit === "open") {
    if (pos === "BB") {
      if (best === "Raise") {
        core = nota + " — strong enough to raise for value from BB.";
      } else {
        core = nota + " — free flop, no reason to raise. See what comes.";
      }
    } else {
      if (best === "Raise") {
        core = nota + " is a standard open from " + pos + ". " + sn;
      } else {
        // Fold — lead with position, not hand praise
        core = "From " + pos + " with " + pl + " player" + (pl !== 1 ? "s" : "") + " behind, " + nota + " is outside the opening range. " + sn;
      }
    }
  } else {
    // vs_raise
    if (best === "3-Bet") {
      core = nota + " — premium. 3-bet to build the pot and isolate. " + sn;
    } else if (best === "Call") {
      core = nota + " defends from " + pos + " by calling. Not strong enough to 3-bet. " + sn;
    } else {
      // Fold vs raise — position-first
      core = nota + " can't profitably defend from " + pos + " vs a raise. " + sn;
    }
  }

  core = core.replace(/  +/g, " ").trim();

  if (rating === "green") {
    var opener = openerForCorrect(best);
    return opener + " " + core;
  }
  if (rating === "yellow") {
    return ctx.userAction + " is OK, but " + best.toLowerCase() + " is slightly better. " + core;
  }
  // mistake
  return best + " here. " + core;
}
