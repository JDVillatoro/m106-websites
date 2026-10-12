// Score for one exercise: questions answered and points earned (0 to 1 per
// question, so 2.5 is possible). Shown as points out of questions, never as a
// percent, which reads like how much is done.
// The score is saved with the mode's storage, so it survives a page reload.

/**
 * @param {ReturnType<import('./storage.js').createStorage>} storage
 */
export function createScore(storage) {
  const saved = storage.get('score', {});
  let questions = Number(saved.questions) || 0;
  let points = Number(saved.points) || 0;
  const listeners = [];

  function changed() {
    storage.set('score', { questions, points });
    listeners.forEach(fn => fn());
  }

  return {
    get questions() { return questions; },
    get points() { return points; },

    /** Count one question and add the points earned for it (0 to 1). */
    record(earned = 0) {
      questions += 1;
      points += earned;
      changed();
    },

    /**
     * Add points to the current question without counting another one,
     * for questions with several parts (for example 0.5 + 0.5).
     */
    addPoints(earned) {
      points += earned;
      changed();
    },

    reset() {
      questions = 0;
      points = 0;
      changed();
    },

    /** Call `fn` whenever the score changes. */
    onChange(fn) {
      listeners.push(fn);
    },
  };
}

/**
 * A score as text: "No score" before the first question, else points out of
 * questions, "2.5 / 4 points" (at most two decimals, no trailing zeros).
 *
 * @param {{questions: number, points: number}} score
 */
export function describeScore({ questions, points }) {
  if (!questions) return 'No score';
  return `${Number(points.toFixed(2))} / ${questions} points`;
}
