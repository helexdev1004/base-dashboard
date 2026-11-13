'use strict';

// Profiling (profiling.html): the Panel and Country filters at the top.
// Any number of chips can be on. "All" turns the others off, and turning the last one off goes back to All.
// Countries that don't fit on two rows move into the Others menu, where they're ticked instead of pressed.
// The filters only switch their own state: the lists below don't change yet.

const chipFor = (group, code) => $(`:scope > [data-chip="${code}"]`, group);

function setChip(chip, on) {
  chip.classList.toggle('active', on);
  chip.setAttribute('aria-pressed', String(on));
}

// All, the Others button and the Others ticks follow the chips.
function syncFilter(group) {
  const chips = $$(':scope > [data-chip]', group);
  const any = chips.some((chip) => chip.getAttribute('aria-pressed') === 'true');
  setChip($(':scope > [data-all]', group), !any);
  const boxes = $$('.prf-others-menu input', group);
  boxes.forEach((box) => { box.checked = chipFor(group, box.dataset.chip).getAttribute('aria-pressed') === 'true'; });
  $('.prf-others-btn', group)?.classList.toggle('active', boxes.some((box) => box.checked && !box.closest('li').hidden));
}

// Show as many chips as fit on the allowed rows, with Others last; the rest go into Others,
// whose number is their members added up.
function fitRows(group) {
  const chips = $$(':scope > [data-chip]', group);
  const others = $(':scope > .prf-others', group);
  chips.forEach((chip) => { chip.hidden = false; });
  others.hidden = false;
  const first = group.firstElementChild;
  const rowStep = first.offsetHeight + parseFloat(getComputedStyle(group).rowGap || 0);
  const lastRowTop = first.getBoundingClientRect().top + rowStep * (Number(group.dataset.maxRows) - 1) + 1;
  for (let i = chips.length - 1; i >= 0 && others.getBoundingClientRect().top > lastRowTop; i--) chips[i].hidden = true;

  let members = 0;
  $$('.prf-others-menu li', group).forEach((li) => {
    const chip = chipFor(group, li.dataset.chip);
    li.hidden = !chip.hidden;
    if (chip.hidden) members += Number(chip.dataset.members);
  });
  others.hidden = !members;
  $('[data-others-count]', others).textContent = members.toLocaleString('en-US');
  syncFilter(group);
}

document.addEventListener('DOMContentLoaded', () => {
  $$('[data-multi]').forEach((group) => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('button[aria-pressed]');
      if (!btn || btn.parentElement !== group) return;
      if (btn.hasAttribute('data-all')) $$(':scope > [data-chip]', group).forEach((chip) => setChip(chip, false));
      else setChip(btn, btn.getAttribute('aria-pressed') !== 'true');
      syncFilter(group);
    });
    group.addEventListener('change', (e) => {
      const box = e.target.closest('.prf-others-menu input');
      if (!box) return;
      setChip(chipFor(group, box.dataset.chip), box.checked);
      syncFilter(group);
    });
  });

  // Refit whenever the filters' width changes (window resize, sidebar collapse).
  const capped = $$('[data-max-rows]');
  let timer;
  const refit = () => { clearTimeout(timer); timer = setTimeout(() => capped.forEach(fitRows), 60); };
  capped.forEach(fitRows);
  capped.forEach((group) => new ResizeObserver(refit).observe(group.parentElement));
});
