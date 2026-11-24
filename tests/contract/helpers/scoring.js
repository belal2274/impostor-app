'use strict';
// Executable copy of the scoring rules in docs/TEST-CONTRACT.md (section 1).
// It is a spec model, not the server's code. Room tests compare server results to it.
// Constants come from tests/data/scoring.json so a rule change is a data change.
const RULES = require('../data/scoring.json').rules;

function roundScores(ids, impostor, votes) {
  const n = ids.length;
  const others = n - 1;
  const pts = {};
  let picks = 0;
  for (const id of ids) {
    if (id === impostor) continue;
    const v = votes[id];
    if (v === impostor) { pts[id] = RULES.pickImpostor; picks++; }
    else if (v === undefined || v === null) pts[id] = RULES.noVote;
    else pts[id] = RULES.pickOther;
  }
  const nonPick = others - picks;
  if (n >= RULES.bigRoomMinPlayers) pts[impostor] = nonPick - picks;
  else pts[impostor] = (picks === others ? 0 : RULES.smallRoomBase) - picks;
  return pts;
}

// Vote tally includes the impostor's own vote.
function tally(ids, votes) {
  const t = {};
  for (const id of ids) t[id] = 0;
  for (const id of ids) { const v = votes[id]; if (v !== undefined && v !== null && v in t) t[v]++; }
  return t;
}

function discovered(ids, impostor, votes) {
  const t = tally(ids, votes);
  const top = Math.max(...Object.values(t));
  const leaders = ids.filter((id) => t[id] === top);
  return top > 0 && leaders.length === 1 && leaders[0] === impostor;
}

function winners(totals) {
  const ids = Object.keys(totals);
  const max = Math.max(...ids.map((i) => totals[i]));
  return ids.filter((i) => totals[i] === max); // all equal (including all 0) means all win
}

const bonusFor = (winnerCount) => Math.floor(RULES.winnerBonusPool / winnerCount);

// Account balance after one claim: floor applies per claim, before the bonus.
const claimBalance = (pts, roundPoints, bonus) => Math.max(0, pts + roundPoints) + bonus;

module.exports = { roundScores, tally, discovered, winners, bonusFor, claimBalance };
