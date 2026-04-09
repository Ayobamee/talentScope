// ─── Pure logic functions for TalentScope ────────────────────
// These are extracted here so they can be unit tested independently
// of the React component and Supabase connection.

/**
 * Returns the letter grade for a given score.
 * A: 70–100, B: 60–69, C: 50–59, D: 40–49, F: 0–39
 */
export const gradeOf = (s) =>
  s >= 70 ? "A" : s >= 60 ? "B" : s >= 50 ? "C" : s >= 40 ? "D" : "F";

/**
 * Returns the hex colour associated with a grade.
 */
export const gradeColor = (g) =>
  ({ A: "#28a745", B: "#0071e3", C: "#bf8a00", D: "#d4622a", F: "#d62a2a" }[g] || "#aeaeb2");

/**
 * Computes a talent's score for a given year and quarter.
 * Score = sum of all OKR scores entered for that period.
 * Returns null if no scores have been entered yet.
 *
 * @param {object} talent   - talent record { id, okrs: [okrId, ...] }
 * @param {Array}  okrs     - all OKR records [{ id, weight, ... }]
 * @param {object} scoresMap - { "talentId:year:quarter": { okrId: score } }
 * @param {number} year
 * @param {number} quarter  - 1 | 2 | 3 | 4
 */
export const scoreKey = (tid, year, quarter) => `${tid}:${year}:${quarter}`;

export const computeScore = (talent, okrs, scoresMap, year, quarter) => {
  if (!talent?.okrs?.length) return null;
  const k = scoreKey(talent.id, year, quarter);
  const tScores = scoresMap[k] || {};
  let total = 0, hasAny = false;
  for (const oid of talent.okrs) {
    const s = tScores[oid];
    if (s !== undefined) { total += s; hasAny = true; }
  }
  return hasAny ? Math.round(total * 10) / 10 : null;
};

/**
 * Computes a talent's annual average across all 4 quarters.
 * Returns { scores: [q1, q2, q3, q4], avg, complete }
 * complete = true only when all 4 quarters have a score.
 */
export const computeAnnualScore = (talent, okrs, scoresMap, year) => {
  const QUARTERS = [1, 2, 3, 4];
  const qScores = QUARTERS.map((q) => computeScore(talent, okrs, scoresMap, year, q));
  const filled = qScores.filter((s) => s !== null);
  if (filled.length === 0) return { scores: qScores, avg: null, complete: false };
  const avg = Math.round((filled.reduce((a, b) => a + b, 0) / filled.length) * 10) / 10;
  return { scores: qScores, avg, complete: filled.length === 4 };
};

/**
 * Validates the total weight of selected OKRs.
 * Returns { valid, total, message }
 */
export const validateOKRWeights = (selectedOkrs) => {
  if (!selectedOkrs.length) {
    return { valid: false, total: 0, message: "Please select at least one OKR scorecard." };
  }
  const total = selectedOkrs.reduce((sum, o) => sum + o.weight, 0);
  if (total < 100) {
    return { valid: false, total, message: `Total weight is ${total}% — must equal exactly 100% before saving.` };
  }
  if (total > 100) {
    return { valid: false, total, message: `Total weight is ${total}% — exceeds 100%. Please adjust your selection.` };
  }
  return { valid: true, total: 100, message: "Total weight: 100% ✓" };
};

/**
 * Clamps a score value to be within 0 and the OKR's weight cap.
 */
export const clampScore = (value, maxWeight) => {
  const n = parseFloat(value);
  if (isNaN(n)) return undefined;
  return Math.min(maxWeight, Math.max(0, n));
};
