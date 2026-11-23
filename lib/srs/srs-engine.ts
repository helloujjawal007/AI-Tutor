import type { TableLineProgress } from "@/app/lib/types";

/**
 * Tables Buddy SRS Engine
 * Leitner box-based spaced repetition system for multiplication table lines
 */

/**
 * Moves a line forward or backward in the Leitner system based on correctness.
 * Box 1 = needs most frequent practice, Box 5 = mastered
 */
export function updateLeitnerBox(
  currentBox: number,
  wasCorrect: boolean,
  maxBox = 5
): number {
  if (wasCorrect) {
    // Move up one box, but not beyond maxBox
    return Math.min(currentBox + 1, maxBox);
  } else {
    // Move back to box 1
    return 1;
  }
}

/**
 * Determines if a line should be considered "mastered" based on its box position.
 * A line is mastered if it's in box 4 or 5 and has been correct recently.
 */
export function isLineMastered(box: number): boolean {
  return box >= 4;
}

/**
 * Gets the priority level for a line based on its box.
 * Lower box = higher priority (needs more practice)
 */
export function getLinePriority(box: number): "high" | "medium" | "low" {
  switch (box) {
    case 1:
    case 2:
      return "high";
    case 3:
      return "medium";
    case 4:
    case 5:
      return "low";
    default:
      return "high";
  }
}

/**
 * Calculates the next due time for a line based on its box.
 * Box 1: due tomorrow, Box 2: due in 2 days, Box 3: due in 4 days,
 * Box 4: due in 8 days, Box 5: due in 14 days (mastered)
 */
export function calculateNextDue(box: number, baseDate: Date = new Date()): Date {
  const daysMap: Record<number, number> = {
    1: 1,
    2: 2,
    3: 4,
    4: 8,
    5: 14,
  };

  const days = daysMap[box] || 1;
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Records an attempt and updates the SRS box position.
 * This is a framework-agnostic version that takes supabase as a parameter.
 */
export function recordAttempt(
  supabase: any,
  childId: string,
  multiplicand: number,
  multiplier: number,
  wasCorrect: boolean,
  attemptNumber: number
): Promise<TableLineProgress> {
  return new Promise<TableLineProgress>(async (resolve, reject) => {
    try {
      // Get current progress
      const { data: progress, error } = await supabase
        .from("table_lines_progress")
        .select("*")
        .eq("child_id", childId)
        .eq("multiplicand", multiplicand)
        .eq("multiplier", multiplier)
        .single();

      if (error || !progress) {
        // Create new entry
        const { data: newProgress } = await supabase
          .from("table_lines_progress")
          .insert({
            child_id: childId,
            multiplicand,
            multiplier: wasCorrect ? 2 : 1,
            mastered: false,
            last_seen: new Date().toISOString(),
            next_due: calculateNextDue(1).toISOString(),
            weak_count: wasCorrect ? 0 : 1,
          })
          .select()
          .single();

        resolve(newProgress);
        return;
      }

      // Update existing entry
      const newBox = updateLeitnerBox(progress.box, wasCorrect);
      const newWeakCount = wasCorrect ? 0 : progress.weak_count + 1;
      const mastered = isLineMastered(newBox);

      const { data: updatedProgress } = await supabase
        .from("table_lines_progress")
        .update({
          box: newBox,
          mastered,
          last_seen: new Date().toISOString(),
          next_due: mastered ? null : calculateNextDue(newBox).toISOString(),
          weak_count: newWeakCount,
        })
        .eq("id", progress.id)
        .select()
        .single();

      resolve(updatedProgress);
    } catch (err) {
      reject(err);
    }
  });
}
