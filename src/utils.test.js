import { describe, it, expect } from "vitest";
import {
  gradeOf,
  gradeColor,
  computeScore,
  computeAnnualScore,
  validateOKRWeights,
  clampScore,
  scoreKey,
} from "./utils";

// ─── gradeOf ─────────────────────────────────────────────────
describe("gradeOf", () => {
  it("returns A for scores 70 and above", () => {
    expect(gradeOf(70)).toBe("A");
    expect(gradeOf(85)).toBe("A");
    expect(gradeOf(100)).toBe("A");
  });

  it("returns B for scores 60–69", () => {
    expect(gradeOf(60)).toBe("B");
    expect(gradeOf(65)).toBe("B");
    expect(gradeOf(69)).toBe("B");
  });

  it("returns C for scores 50–59", () => {
    expect(gradeOf(50)).toBe("C");
    expect(gradeOf(55)).toBe("C");
    expect(gradeOf(59)).toBe("C");
  });

  it("returns D for scores 40–49", () => {
    expect(gradeOf(40)).toBe("D");
    expect(gradeOf(45)).toBe("D");
    expect(gradeOf(49)).toBe("D");
  });

  it("returns F for scores below 40", () => {
    expect(gradeOf(39)).toBe("F");
    expect(gradeOf(20)).toBe("F");
    expect(gradeOf(0)).toBe("F");
  });

  it("handles decimal scores correctly", () => {
    expect(gradeOf(69.9)).toBe("B");
    expect(gradeOf(70.0)).toBe("A");
    expect(gradeOf(59.5)).toBe("C");
  });
});

// ─── gradeColor ───────────────────────────────────────────────
describe("gradeColor", () => {
  it("returns correct colour for each grade", () => {
    expect(gradeColor("A")).toBe("#28a745");
    expect(gradeColor("B")).toBe("#0071e3");
    expect(gradeColor("C")).toBe("#bf8a00");
    expect(gradeColor("D")).toBe("#d4622a");
    expect(gradeColor("F")).toBe("#d62a2a");
  });

  it("returns fallback colour for unknown grade", () => {
    expect(gradeColor("X")).toBe("#aeaeb2");
    expect(gradeColor("")).toBe("#aeaeb2");
  });
});

// ─── scoreKey ────────────────────────────────────────────────
describe("scoreKey", () => {
  it("generates a consistent key from talentId, year and quarter", () => {
    expect(scoreKey("t1", 2026, 1)).toBe("t1:2026:1");
    expect(scoreKey("t2", 2025, 4)).toBe("t2:2025:4");
  });
});

// ─── computeScore ────────────────────────────────────────────
describe("computeScore", () => {
  const okrs = [
    { id: "o1", weight: 40 },
    { id: "o2", weight: 50 },
    { id: "o3", weight: 10 },
  ];
  const talent = { id: "t1", okrs: ["o1", "o2", "o3"] };

  it("returns null when no scores have been entered", () => {
    expect(computeScore(talent, okrs, {}, 2026, 1)).toBeNull();
  });

  it("returns null when talent has no OKRs assigned", () => {
    const emptyTalent = { id: "t2", okrs: [] };
    expect(computeScore(emptyTalent, okrs, {}, 2026, 1)).toBeNull();
  });

  it("sums all OKR scores correctly — 40+50+10 = 100", () => {
    const scoresMap = { "t1:2026:1": { o1: 40, o2: 50, o3: 10 } };
    expect(computeScore(talent, okrs, scoresMap, 2026, 1)).toBe(100);
  });

  it("sums partial scores — only entered OKRs count", () => {
    const scoresMap = { "t1:2026:1": { o1: 40, o2: 50 } };
    expect(computeScore(talent, okrs, scoresMap, 2026, 1)).toBe(90);
  });

  it("handles the real-world example — 40+40+5 = 85", () => {
    const scoresMap = { "t1:2026:1": { o1: 40, o2: 40, o3: 5 } };
    expect(computeScore(talent, okrs, scoresMap, 2026, 1)).toBe(85);
  });

  it("handles decimal scores — 37.5+48.5+9.5 = 95.5", () => {
    const scoresMap = { "t1:2026:1": { o1: 37.5, o2: 48.5, o3: 9.5 } };
    expect(computeScore(talent, okrs, scoresMap, 2026, 1)).toBe(95.5);
  });

  it("scores are isolated per quarter — Q1 and Q2 are independent", () => {
    const scoresMap = {
      "t1:2026:1": { o1: 40, o2: 50, o3: 10 },
      "t1:2026:2": { o1: 30, o2: 40, o3: 8 },
    };
    expect(computeScore(talent, okrs, scoresMap, 2026, 1)).toBe(100);
    expect(computeScore(talent, okrs, scoresMap, 2026, 2)).toBe(78);
  });

  it("scores are isolated per year", () => {
    const scoresMap = {
      "t1:2025:1": { o1: 40, o2: 50, o3: 10 },
      "t1:2026:1": { o1: 20, o2: 30, o3: 5 },
    };
    expect(computeScore(talent, okrs, scoresMap, 2025, 1)).toBe(100);
    expect(computeScore(talent, okrs, scoresMap, 2026, 1)).toBe(55);
  });
});

// ─── computeAnnualScore ───────────────────────────────────────
describe("computeAnnualScore", () => {
  const okrs = [{ id: "o1", weight: 100 }];
  const talent = { id: "t1", okrs: ["o1"] };

  it("returns complete:false and avg:null when no quarters are scored", () => {
    const result = computeAnnualScore(talent, okrs, {}, 2026);
    expect(result.avg).toBeNull();
    expect(result.complete).toBe(false);
  });

  it("returns complete:false when only some quarters are scored", () => {
    const scoresMap = {
      "t1:2026:1": { o1: 80 },
      "t1:2026:2": { o1: 90 },
    };
    const result = computeAnnualScore(talent, okrs, scoresMap, 2026);
    expect(result.complete).toBe(false);
    expect(result.avg).toBe(85);
  });

  it("returns complete:true and correct avg when all 4 quarters scored", () => {
    const scoresMap = {
      "t1:2026:1": { o1: 80 },
      "t1:2026:2": { o1: 90 },
      "t1:2026:3": { o1: 70 },
      "t1:2026:4": { o1: 60 },
    };
    const result = computeAnnualScore(talent, okrs, scoresMap, 2026);
    expect(result.complete).toBe(true);
    expect(result.avg).toBe(75); // (80+90+70+60)/4
  });

  it("annual avg uses only scored quarters in average calculation", () => {
    const scoresMap = {
      "t1:2026:1": { o1: 100 },
      "t1:2026:2": { o1: 60 },
    };
    const result = computeAnnualScore(talent, okrs, scoresMap, 2026);
    expect(result.avg).toBe(80); // (100+60)/2
    expect(result.complete).toBe(false);
  });
});

// ─── validateOKRWeights ───────────────────────────────────────
describe("validateOKRWeights", () => {
  it("fails when no OKRs are selected", () => {
    const result = validateOKRWeights([]);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("at least one");
  });

  it("fails when total weight is below 100%", () => {
    const okrs = [{ weight: 40 }, { weight: 30 }]; // total = 70
    const result = validateOKRWeights(okrs);
    expect(result.valid).toBe(false);
    expect(result.total).toBe(70);
    expect(result.message).toContain("must equal exactly 100%");
  });

  it("fails when total weight exceeds 100%", () => {
    const okrs = [{ weight: 60 }, { weight: 50 }]; // total = 110
    const result = validateOKRWeights(okrs);
    expect(result.valid).toBe(false);
    expect(result.total).toBe(110);
    expect(result.message).toContain("exceeds 100%");
  });

  it("passes when total weight is exactly 100%", () => {
    const okrs = [{ weight: 40 }, { weight: 50 }, { weight: 10 }];
    const result = validateOKRWeights(okrs);
    expect(result.valid).toBe(true);
    expect(result.total).toBe(100);
  });

  it("passes for a single OKR with weight 100%", () => {
    const okrs = [{ weight: 100 }];
    const result = validateOKRWeights(okrs);
    expect(result.valid).toBe(true);
  });
});

// ─── clampScore ───────────────────────────────────────────────
describe("clampScore", () => {
  it("returns undefined for non-numeric input", () => {
    expect(clampScore("", 50)).toBeUndefined();
    expect(clampScore("abc", 50)).toBeUndefined();
  });

  it("clamps score to 0 when negative", () => {
    expect(clampScore(-5, 50)).toBe(0);
  });

  it("clamps score to max weight when exceeded", () => {
    expect(clampScore(6.1, 5)).toBe(5);
    expect(clampScore(60, 50)).toBe(50);
    expect(clampScore(100, 10)).toBe(10);
  });

  it("returns exact value when within range", () => {
    expect(clampScore(3.5, 5)).toBe(3.5);
    expect(clampScore(40, 50)).toBe(40);
    expect(clampScore(0, 10)).toBe(0);
  });

  it("accepts decimal string input", () => {
    expect(clampScore("3.5", 5)).toBe(3.5);
    expect(clampScore("4.9", 5)).toBe(4.9);
  });
});
