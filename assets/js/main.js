/* VOLVER · Landing RD — comportamiento y analítica
   Regla: nunca enviar nombre, teléfono, mensaje ni información clínica a GA4 / GTM / Google Ads. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  window.dataLayer = window.dataLayer || [];

  // Solo parámetros no personales.
  // - Con GTM: los eventos llegan al dataLayer y se configuran como activadores en GTM.
  // - Con GA4 directo (window.VOLVER_GA_ACTIVE): además se envían con gtag('event').
  function track(event, params) {
    var clean = {};
    Object.keys(params || {}).forEach(function (k) { if (params[k] != null) clean[k] = params[k]; });
    window.dataLayer.push(Object.assign({ event: event }, clean));
    if (window.VOLVER_GA_ACTIVE && typeof window.gtag === 'function') window.gtag('event', event, clean);
  }

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Clicks de llamada / WhatsApp ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-event]');
    if (!a) return;
    track(a.getAttribute('data-event'), { cta_location: a.getAttribute('data-loc') || undefined });
  });

  /* ---------- Header con sombra al hacer scroll ---------- */
  var header = $('.site-header');
  var onScrollHeader = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Barra sticky móvil ----------
     Visible tras superar el Hero. Se oculta cuando el formulario, el footer o el banner de
     consentimiento están en pantalla, o cuando el teclado móvil está abierto (campo enfocado). */
  var bar = $('#sticky-bar');
  var state = { pastHero: false, blockers: new Set(), typing: false, consent: false };
  function renderBar() {
    var show = state.pastHero && state.blockers.size === 0 && !state.typing && !state.consent;
    bar.classList.toggle('is-visible', show);
    bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    $$('a', bar).forEach(function (a) { a.tabIndex = show ? 0 : -1; });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { state.pastHero = !en.isIntersecting && en.boundingClientRect.top < 0; });
      renderBar();
    }, { threshold: 0 }).observe($('#hero'));

    var blockObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) state.blockers.add(en.target.id); else state.blockers.delete(en.target.id);
      });
      renderBar();
    }, { threshold: 0 });
    ['formulario', 'footer'].forEach(function (id) { var el = document.getElementById(id); if (el) blockObs.observe(el); });
  }
  document.addEventListener('focusin', function (e) {
    if (e.target.matches('input, select, textarea')) { state.typing = true; renderBar(); }
  });
  document.addEventListener('focusout', function (e) {
    if (e.target.matches('input, select, textarea')) { state.typing = false; setTimeout(renderBar, 150); }
  });

  /* ---------- Consentimiento (Consent Mode v2) ---------- */
  var consent = $('#consent');
  var KEY = 'volver_consent';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (err) { /* almacenamiento no disponible */ }
  function applyConsent(v) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: v, ad_storage: v, ad_user_data: v, ad_personalization: v });
    }
  }
  if (stored) applyConsent(stored);
  else if (consent) { consent.hidden = false; state.consent = true; }
  $$('[data-consent]', consent).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = btn.getAttribute('data-consent');
      try { localStorage.setItem(KEY, v); } catch (err) { /* noop */ }
      applyConsent(v);
      consent.hidden = true; state.consent = false; renderBar();
    });
  });

  /* ---------- FAQ accesible (aria-expanded) ---------- */
  $$('.acc-btn').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    // el contenido existe en el DOM sin JS; JS solo colapsa los que no vienen abiertos
    panel.hidden = btn.getAttribute('aria-expanded') !== 'true';
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
      if (!open) track('interaction_faq_open', { faq_id: panel.id });
    });
  });

  /* ---------- Vistas de sección (una sola vez) y revelado ---------- */
  if ('IntersectionObserver' in window) {
    var viewObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var ev = en.target.getAttribute('data-view');
        if (ev) track(ev);
        en.target.classList.add('is-in');
        obs.unobserve(en.target);
      });
    }, { threshold: 0.25 });
    $$('[data-view], .identity').forEach(function (el) { viewObs.observe(el); });

    var revealTargets = $$('.signal-card, .model-card, .method-card, .center-card, .path, .steps li, .person, .gallery figure, .voice, .call-steps li, .stats li');
    revealTargets.forEach(function (el) { el.classList.add('reveal'); });
    var revObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var sibs = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.transitionDelay = Math.min(sibs, 4) * 70 + 'ms';
        el.classList.add('is-in');
        obs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach(function (el) { revObs.observe(el); });
  }

  /* ---------- Profundidad de scroll ---------- */
  var depthsHit = {};
  function onScrollDepth() {
    var h = document.documentElement;
    var pct = (h.scrollTop + window.innerHeight) / h.scrollHeight * 100;
    [50, 90].forEach(function (d) {
      if (pct >= d && !depthsHit[d]) { depthsHit[d] = true; track('scroll_depth_' + d); }
    });
  }
  window.addEventListener('scroll', onScrollDepth, { passive: true });

  /* ---------- Video de autoridad ---------- */
  var box = $('[data-video]');
  if (box) {
    var video = $('video', box);
    var cover = $('.video-cover', box);
    var fallback = $('.video-fallback', box);
    var marks = { 25: false, 50: false, 75: false };
    var started = false;
    function showFallback() {
      box.classList.remove('is-playing');
      fallback.hidden = false;
    }
    cover.addEventListener('click', function () {
      box.classList.add('is-playing');
      var p = video.play();
      if (p && p.catch) p.catch(showFallback);
    });
    video.addEventListener('error', showFallback, true);
    var src = $('source', video); if (src) src.addEventListener('error', showFallback);
    video.addEventListener('play', function () { if (!started) { started = true; track('video_start'); } });
    video.addEventListener('timeupdate', function () {
      if (!video.duration) return;
      var pct = video.currentTime / video.duration * 100;
      [25, 50, 75].forEach(function (m) { if (pct >= m && !marks[m]) { marks[m] = true; track('video_progress_' + m); } });
    });
    video.addEventListener('ended', function () { track('video_complete'); });
  }

  /* ---------- Formulario de captura ---------- */
  var form = $('#lead-form');
  if (form) {
    var startedForm = false;
    form.addEventListener('focusin', function () { if (!startedForm) { startedForm = true; track('form_start'); } });

    var rules = {
      nombre: { el: $('#f-name'), err: $('#f-name-err'), test: function (v) { return v.trim().split(/\s+/).length >= 2 && v.trim().length >= 4; }, msg: 'Escriba su nombre y apellido.' },
      telefono: { el: $('#f-phone'), err: $('#f-phone-err'), test: function (v) { return v.replace(/\D/g, '').length >= 10; }, msg: 'Escriba un número de teléfono válido (con código de área).' },
      relacion: { el: $('#f-rel'), err: $('#f-rel-err'), test: function (v) { return !!v; }, msg: 'Seleccione su relación con el paciente.' }
    };
    function validate() {
      var ok = true, first = null;
      Object.keys(rules).forEach(function (k) {
        var r = rules[k], valid = r.test(r.el.value || '');
        r.el.setAttribute('aria-invalid', valid ? 'false' : 'true');
        r.el.setAttribute('aria-describedby', r.err.id);
        r.err.textContent = valid ? '' : r.msg;
        if (!valid) { ok = false; first = first || r.el; }
      });
      var canal = form.querySelector('input[name="canal"]:checked');
      var cErr = $('#f-canal-err');
      cErr.textContent = canal ? '' : 'Elija cómo prefiere que le contactemos.';
      if (!canal) { ok = false; first = first || form.querySelector('input[name="canal"]'); }
      if (first) first.focus();
      return ok;
    }
    Object.keys(rules).forEach(function (k) {
      rules[k].el.addEventListener('input', function () {
        if (rules[k].el.getAttribute('aria-invalid') === 'true' && rules[k].test(rules[k].el.value)) {
          rules[k].el.setAttribute('aria-invalid', 'false'); rules[k].err.textContent = '';
        }
      });
    });

    function success() {
      track('form_submission_success'); // sin datos personales
      form.hidden = true;
      var s = $('#form-success'); s.hidden = false; s.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;
      var data = {
        nombre: rules.nombre.el.value.trim(),
        telefono: rules.telefono.el.value.trim(),
        relacion: rules.relacion.el.value,
        canal: form.querySelector('input[name="canal"]:checked').value,
        origen: 'landing-rd-tratamiento-residencial'
      };
      var endpoint = form.getAttribute('data-endpoint');
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;

      if (endpoint) {
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); success(); })
          .catch(function () {
            btn.disabled = false;
            $('#f-canal-err').textContent = 'No pudimos enviar su solicitud. Llame al +1 (809) 534-6002 o escríbanos por WhatsApp.';
          });
        return;
      }
      // Sin CRM configurado: la solicitud se envía directamente a admisiones por WhatsApp.
      var msg = 'Hola, solicito orientación confidencial sobre el proceso de admisión en VOLVER.\n' +
        'Nombre: ' + data.nombre + '\n' +
        'Teléfono: ' + data.telefono + '\n' +
        'Relación con el paciente: ' + data.relacion + '\n' +
        'Canal preferido: ' + data.canal;
      window.open('https://wa.me/18497853789?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      success();
    });
  }
})();

/* Logo → inicio de la página (el ancla #top es el header sticky, que nunca sale de vista) */
document.querySelectorAll('a[href="#top"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  });
});


/* ---------- Semblanzas (modal) ---------- */
(function () {
  var openers = document.querySelectorAll('[data-bio]');
  if (!openers.length) return;
  function open(dlg, trigger) {
    if (!dlg || typeof dlg.showModal !== 'function') return;
    dlg._trigger = trigger;
    dlg.showModal();
    document.documentElement.classList.add('bio-lock');
    var c = dlg.querySelector('[data-close]'); if (c) c.focus();
  }
  openers.forEach(function (b) {
    b.addEventListener('click', function () { open(document.getElementById(b.getAttribute('data-bio')), b); });
  });
  document.querySelectorAll('dialog.bio-modal').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
    });
    dlg.addEventListener('close', function () {
      document.documentElement.classList.remove('bio-lock');
      if (dlg._trigger) dlg._trigger.focus();
    });
  });
})();
