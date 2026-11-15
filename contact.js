/* contact.js — validated contact form using EmailJS (browser SDK v4).
   Use PUBLIC values only (Public Key, Service ID, Template ID). Never put a private key in frontend code.
   Get the Public Key at: EmailJS dashboard → Account → General → Public Key. */
const EMAILJS_CONFIG = {
  publicKey: 'nooWtPBhhixk2G3bQ',          // <-- paste your EmailJS Public Key here
  serviceId: 'service_nj6ay8q',
  templateId: 'template_0hmj9lc'
};

(function () {
  'use strict';
  const form = document.getElementById('contact-form');
  if (!form) return;
  const btn = form.querySelector('button[type="submit"]');
  const ok = document.getElementById('alert-ok'), bad = document.getElementById('alert-bad'), warn = document.getElementById('alert-warn');
  const SEND_TIMEOUT_MS = 20000;
  let sending = false;

  // A value is "missing" if empty or still a YOUR_… placeholder.
  const missing = Object.keys(EMAILJS_CONFIG).filter(function (k) { const v = EMAILJS_CONFIG[k]; return !v || /^YOUR_/.test(v); });
  const configured = missing.length === 0;
  const LABELS = { publicKey: 'Public Key', serviceId: 'Service ID', templateId: 'Template ID' };

  if (!configured) {
    warn.textContent = 'Contact form not configured yet: add your EmailJS ' + missing.map(function (k) { return LABELS[k]; }).join(', ') + ' in js/contact.js. Until then messages cannot be sent — please use the email or WhatsApp links instead.';
    warn.classList.add('show');
  }

  function show(el, text) { [ok, bad].forEach(function (a) { a.classList.remove('show'); }); el.textContent = text; el.classList.add('show'); }

  // ----- Validation -----
  const rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Please enter your full name.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'; },
    subject: function (v) { return v.trim().length >= 3 ? '' : 'Please add a short subject.'; },
    type: function (v) { return v ? '' : 'Please choose a project type.'; },
    message: function (v) { return v.trim().length >= 10 ? '' : 'Please write at least 10 characters.'; }
  };
  function check(input) {
    const field = input.closest('.field'), msg = rules[input.name](input.value);
    field.classList.toggle('invalid', !!msg);
    field.querySelector('.err-msg').textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  const inputs = Array.from(form.querySelectorAll('input[name],select[name],textarea[name]')).filter(function (i) { return rules[i.name]; });
  inputs.forEach(function (i) {
    i.addEventListener('blur', function () { check(i); });
    i.addEventListener('input', function () { if (i.closest('.field').classList.contains('invalid')) check(i); });
  });

  // ----- Sending -----
  function friendlyError(err) {
    const status = err && err.status, text = (err && err.text) || '';
    console.error('[EmailJS] send failed:', status, text, err);
    if (!navigator.onLine) return 'Message not sent: you appear to be offline. Please check your connection and try again.';
    if (err && err.message === 'timeout') return 'Message not sent: the request timed out. Please try again, or contact me directly by email or WhatsApp.';
    if (status === 429) return 'Message not sent: too many requests right now. Please wait a moment and try again.';
    if (status === 400 || status === 401 || status === 403 || status === 404) return 'Message not sent: the email service rejected the request (' + status + '). The form may need to be re-configured — please contact me directly by email or WhatsApp.';
    return 'Message not sent. Please try again, or contact me directly by email or WhatsApp.';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    [ok, bad].forEach(function (a) { a.classList.remove('show'); });
    if (sending) return;                                      // duplicate-submission guard
    if (form.elements.company.value) return;                  // honeypot: bots fill this field
    const valid = inputs.map(check).every(Boolean);           // validate every field (no short-circuit)
    if (!valid) { const first = form.querySelector('.invalid input,.invalid select,.invalid textarea'); if (first) first.focus(); return; }
    if (!configured) { show(bad, 'Message not sent: the form is not configured yet. Please email or WhatsApp me directly.'); return; }
    if (!window.emailjs) { show(bad, 'Message not sent: the email service failed to load. Check your connection or contact me directly.'); return; }

    sending = true; btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    const label = btn.textContent; btn.textContent = 'Sending…';

    const v = function (n) { return form.elements[n].value.trim(); };
    // Template variables. Use these in your EmailJS template as {{from_name}}, {{reply_to}}, {{subject}}, {{project_type}}, {{message}}.
    // Aliases (name, email, title…) are also sent so EmailJS's default templates work too.
    const params = {
      from_name: v('name'), reply_to: v('email'), subject: v('subject'), project_type: v('type'), message: v('message'),
      name: v('name'), email: v('email'), from_email: v('email'), title: v('subject'),
      time: new Date().toLocaleString()
    };

    const timeout = new Promise(function (_, reject) { setTimeout(function () { reject({ message: 'timeout' }); }, SEND_TIMEOUT_MS); });
    Promise.race([
      emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, params, { publicKey: EMAILJS_CONFIG.publicKey }),
      timeout
    ]).then(function (res) {
      // Only claim success when EmailJS explicitly confirms (HTTP 200 / "OK").
      if (res && res.status === 200) {
        show(ok, 'Message sent. Thank you — I’ll reply by email as soon as I can.');
        form.reset();
        inputs.forEach(function (i) { i.closest('.field').classList.remove('invalid'); i.removeAttribute('aria-invalid'); });
      } else {
        console.error('[EmailJS] unexpected response:', res);
        show(bad, 'Message not sent: unexpected response from the email service. Please contact me directly.');
      }
    }).catch(function (err) {
      show(bad, friendlyError(err));
    }).finally(function () {
      sending = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = label;
    });
  });
})();
