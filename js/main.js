(() => {
  'use strict';
  const fmt = n => n.toFixed(1).replace('.', ',');
  if (window.RoomPlan) window.RoomPlan.mount();
  const mode = document.getElementById('mode');
  if (mode) {
    mode.addEventListener('click', (() => {
      const plan = mode.getAttribute('aria-pressed') !== 'true';
      mode.setAttribute('aria-pressed', String(plan));
      document.body.dataset.mode = plan ? 'plan' : 'cozy';
    }));
  }
  const builder = document.getElementById('builder');
  if (builder) {
    const AREA = {
      work: 1,
      sleep: 2.8,
      cook: 1.6,
      guests: 1.4,
      sport: 2,
      craft: 1.3,
      things: 1.1,
      quiet: 1
    };
    const PASSAGES = 3.5;
    const STUDIO = 25;
    const LIMIT = 15;
    const chips = builder.querySelectorAll('.chip');
    const reqs = builder.querySelectorAll('#reqs li');
    const used = document.getElementById('scale-used');
    const total = document.getElementById('scale-total');
    const more = document.getElementById('hint-more');
    const less = document.getElementById('hint-less');
    const render = () => {
      let sum = 0;
      chips.forEach((chip => {
        const on = chip.getAttribute('aria-pressed') === 'true';
        if (on) sum += AREA[chip.dataset.key];
        reqs.forEach((li => {
          if (li.dataset.key === chip.dataset.key) li.hidden = !on;
        }));
      }));
      const all = sum + PASSAGES;
      used.style.setProperty('--used', `${sum / STUDIO * 100}%`);
      total.textContent = fmt(sum);
      more.hidden = all <= LIMIT;
      less.hidden = all > LIMIT;
    };
    chips.forEach((chip => {
      chip.addEventListener('click', (() => {
        chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
        render();
      }));
    }));
    render();
  }
})();