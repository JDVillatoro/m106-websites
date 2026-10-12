// Sample exercise used to try out the shell (scoreboard, Reset, feedback).
// TODO: delete once a real exercise is moved here (PLAN.md, step 3).

import { feedbackHtml, showFeedback, hideFeedback } from '../../shared/js/ui.js';

const COPY = {
  info: 'Sample exercise for testing the new site. It will be replaced by the real modes.',
  question: n => `Is ${n} even?`,
  yes: 'Even',
  no: 'Odd',
  explanation: (n, even) => `${n} is ${even ? 'even' : 'odd'}.`,
};

let root, score, current;

function newQuestion() {
  current = 1 + Math.floor(Math.random() * 99);
  root.querySelector('.question').textContent = COPY.question(current);
  root.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('is-correct', 'is-wrong');
  });
  hideFeedback(root.querySelector('.feedback'));
}

function answer(btn) {
  const even = current % 2 === 0;
  const correct = (btn.dataset.answer === 'even') === even;
  root.querySelectorAll('.choice-btn').forEach(b => { b.disabled = true; });
  btn.classList.add(correct ? 'is-correct' : 'is-wrong');
  score.record(correct ? 1 : 0);
  showFeedback(root.querySelector('.feedback'), {
    correct,
    messageHtml: COPY.explanation(current, even),
  });
}

export default {
  scored: true,

  mount(el, ctx) {
    root = el;
    score = ctx.score;
    root.innerHTML = `
      <div class="info"><p>${COPY.info}</p></div>
      <div class="section">
        <h2 class="question"></h2>
        <div class="choice-row">
          <button type="button" class="choice-btn" data-answer="even">${COPY.yes}</button>
          <button type="button" class="choice-btn" data-answer="odd">${COPY.no}</button>
        </div>
      </div>
      ${feedbackHtml()}`;
    root.querySelectorAll('.choice-btn').forEach(btn => btn.addEventListener('click', () => answer(btn)));
    root.querySelector('.feedback-next').addEventListener('click', newQuestion);
    newQuestion();
  },

  reset() {
    newQuestion();
  },
};
