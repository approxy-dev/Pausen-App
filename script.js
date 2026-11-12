'use strict';

document.body.classList.add('js');

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
menu.hidden = false;
function closeMenu(returnFocus = false) {
  navigation.dataset.open = 'false';
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open navigation');
  if (returnFocus) menu.focus();
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  navigation.dataset.open = String(open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.nav-shell')) closeMenu();
});
const mobileLayout = matchMedia('(max-width: 700px)');
mobileLayout.addEventListener('change', () => closeMenu());

const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab) {
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    activateTab(tabs[next]);
    tabs[next].focus();
  });
});

// Example daily plan. Local calendar boundaries preserve the displayed times across DST.
function bedtimeState(now) {
  const at = (hour, minute, dayOffset = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
  };
  const wake = at(6, 30);
  const winddown = at(22, 30);
  const curfew = at(23, 0);
  if (now < wake) return { start: at(23, 0, -1), end: wake, label: 'MORNING IN', caption: 'Rest easy. Your night is protected.' };
  if (now < winddown) return { start: wake, end: winddown, label: 'WIND-DOWN IN', caption: 'Time to make a little room.' };
  if (now < curfew) return { start: winddown, end: curfew, label: 'BEDTIME IN', caption: 'Warm light. A softer evening.' };
  return { start: curfew, end: at(6, 30, 1), label: 'MORNING IN', caption: 'Rest easy. Your night is protected.' };
}
function updateCountdown() {
  const now = new Date();
  const state = bedtimeState(now);
  const remaining = Math.max(0, Math.ceil((state.end - now) / 1000));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  document.querySelector('#countdown').textContent = [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  document.querySelector('#countdown-label').textContent = state.label;
  document.querySelector('#countdown-caption').textContent = state.caption;
  document.querySelector('#phone-clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const fraction = Math.min(1, Math.max(0, (state.end - now) / (state.end - state.start)));
  document.querySelector('#curfew-ring').style.strokeDashoffset = String(546.64 * (1 - fraction));
}
updateCountdown();
let countdownInterval = setInterval(updateCountdown, 1000);

const timelineDescriptions = {
  winddown: 'Warm light. Fewer distractions. Time to wind down.',
  curfew: 'Your bedtime boundary begins. Allowed apps remain available.',
  morning: 'A new day. Your scheduled bedtime protection ends.'
};
document.querySelectorAll('.timeline-step').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.timeline-step').forEach(step => {
      const selected = step === button;
      step.classList.toggle('is-active', selected);
      step.setAttribute('aria-pressed', String(selected));
    });
    document.querySelector('#timeline-feedback').textContent = timelineDescriptions[button.dataset.phase];
  });
});

const breathingButton = document.querySelector('#breathing-toggle');
const breathingStage = document.querySelector('#breathing-stage');
const breathingPhase = document.querySelector('#breathing-phase');
const breathingSeconds = document.querySelector('#breathing-seconds');
const breathingNote = document.querySelector('#breathing-note');
let breathingInterval;
let breathingStartedAt = 0;
let previousPhase = '';
function updateBreathing() {
  const elapsed = ((performance.now() - breathingStartedAt) / 1000) % 12;
  const phase = elapsed < 4 ? { label: 'Breathe in.', end: 4 } : elapsed < 6 ? { label: 'Hold gently.', end: 6 } : { label: 'Breathe out.', end: 12 };
  // Only announce phase changes, not every countdown tick.
  if (phase.label !== previousPhase) {
    breathingPhase.textContent = phase.label;
    previousPhase = phase.label;
  }
  const remaining = Math.ceil(phase.end - elapsed);
  breathingSeconds.textContent = `${remaining} ${remaining === 1 ? 'second' : 'seconds'}`;
}
function stopBreathing(away = false) {
  clearInterval(breathingInterval);
  breathingInterval = undefined;
  breathingStage.dataset.running = 'false';
  breathingButton.setAttribute('aria-pressed', 'false');
  breathingButton.querySelector('span').textContent = 'Start a breathing pause';
  breathingPhase.textContent = 'A little more room.';
  breathingSeconds.textContent = 'Another breath, whenever you like.';
  breathingNote.textContent = away ? 'Paused while you were away. Start again when you’re ready.' : 'Take that little bit of calm with you.';
}
breathingButton.addEventListener('click', () => {
  if (breathingInterval !== undefined) { stopBreathing(); return; }
  breathingStartedAt = performance.now();
  previousPhase = '';
  breathingStage.dataset.running = 'true';
  breathingButton.setAttribute('aria-pressed', 'true');
  breathingButton.querySelector('span').textContent = 'End breathing pause';
  breathingNote.textContent = 'Follow along for as long as you like. Stop whenever you need.';
  updateBreathing();
  breathingInterval = setInterval(updateBreathing, 100);
});
document.addEventListener('visibilitychange', () => {
  clearInterval(countdownInterval);
  if (document.hidden) {
    if (breathingInterval !== undefined) stopBreathing(true);
  } else {
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }
});

const contactForm = document.querySelector('#contact-form');
contactForm.addEventListener('submit', event => {
  if (contactForm.elements._gotcha.value) { event.preventDefault(); return; }
  // A configured Formgrid/Formspree action uses the provider's normal POST flow.
  if (contactForm.dataset.delivery === 'provider') return;
  event.preventDefault();
  const name = contactForm.elements.name.value.trim();
  const email = contactForm.elements.email.value.trim();
  const message = contactForm.elements.message.value.trim();
  if (!name || !message) {
    document.querySelector('#form-status').textContent = 'Please add your name and a message before opening a draft.';
    (!name ? contactForm.elements.name : contactForm.elements.message).focus();
    return;
  }
  const subject = `Pausen feedback from ${name}`;
  const body = `${message}\n\nFrom: ${name}\nReply to: ${email}`;
  const draftUrl = `mailto:approxydev@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const status = document.querySelector('#form-status');
  status.replaceChildren(document.createTextNode('Your draft is ready. Your email app may open; nothing is sent until you send it. '));
  const retry = document.createElement('a');
  retry.href = draftUrl;
  retry.textContent = 'Open the draft again';
  status.append(retry, document.createTextNode(', or email approxydev@gmail.com directly.'));
  // Keep the entered values in place if there is no installed email handler.
  window.location.href = draftUrl;
});
