// Score for one exercise: questions answered, points earned, and the percent.
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
    get percent() { return questions === 0 ? 0 : Math.round((points / questions) * 100); },

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
