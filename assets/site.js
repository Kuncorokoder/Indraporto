/* Indra Rachman: the stripboard. One clock (gsap.ticker), one ease family. */
(function () {
  'use strict';
  var html = document.documentElement;
  var gsap = window.gsap;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;
  clearTimeout(window.__irFallback);

  // If GSAP failed to load, show everything and keep the site usable.
  if (!gsap) { html.classList.remove('motion', 'is-curtain'); initClock(null); initMonitor(); initFilter(null); return; }
  if (window.Flip) gsap.registerPlugin(window.Flip);
  var EASE = { out: 'expo.out', inOut: 'expo.inOut', soft: 'power3.out' };
  var motion = html.classList.contains('motion');

  /* ---------------- smooth scroll on the one clock ---------------- */
  var lenis = null;
  if (motion && window.Lenis && !touch) {
    lenis = new window.Lenis({ lerp: 0.12, autoRaf: false });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToY(y) { if (lenis) lenis.scrollTo(y, { duration: 1.1 }); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' }); }

  /* ---------------- header steps aside on scroll down ---------------- */
  var top = document.querySelector('[data-top]');
  var lastY = 0;
  gsap.ticker.add(function () {
    var y = window.scrollY;
    if (Math.abs(y - lastY) < 6) return;
    var hide = y > lastY && y > 240 && !document.querySelector('.monitor[open]');
    top.classList.toggle('is-hidden', hide && !top.contains(document.activeElement));
    lastY = y;
  });

  /* ---------------- Jakarta clock (idle: real time) ---------------- */
  initClock(gsap);
  function initClock(g) {
    var els = document.querySelectorAll('[data-clock]');
    if (!els.length) return;
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch (e) { fmt = null; }
    var last = '';
    function tick() {
      var d = new Date();
      var s = fmt ? fmt.format(d) : d.toTimeString().slice(0, 8);
      if (s === last) return; last = s;
      for (var i = 0; i < els.length; i++) { els[i].textContent = s; els[i].setAttribute('datetime', s); }
    }
    tick();
    if (g) g.ticker.add(tick); else setInterval(tick, 1000);
  }

  /* ---------------- back to top + in-page anchors ---------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var el = id === 'top' ? document.body : document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    scrollToY(id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY);
    if (id !== 'top') { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    else { var m = document.getElementById('main'); if (m) m.focus({ preventScroll: true }); }
  });

  /* ---------------- page transition: three strips ---------------- */
  var curtain = document.getElementById('curtain');
  var bars = curtain ? curtain.querySelectorAll('i') : [];
  if (bars.length) gsap.set(bars, { x: 0, xPercent: html.classList.contains('is-curtain') ? 0 : -101 });
  function leaveTo(href) {
    try { sessionStorage.setItem('ir-curtain', '1'); } catch (e) {}
    gsap.set(curtain, { visibility: 'visible' });
    gsap.fromTo(bars, { xPercent: -101 }, { xPercent: 0, duration: 0.6, ease: EASE.inOut, stagger: 0.07, onComplete: function () { location.href = href; } });
  }
  function enter() {
    if (!html.classList.contains('is-curtain')) return gsap.delayedCall(0, intro);
    gsap.set(curtain, { visibility: 'visible' });
    gsap.set(bars, { xPercent: 0 });
    html.classList.remove('is-curtain');
    gsap.to(bars, { xPercent: 101, duration: 0.7, ease: EASE.inOut, stagger: 0.07, delay: 0.05,
      onComplete: function () { gsap.set(curtain, { visibility: 'hidden' }); gsap.set(bars, { xPercent: -101 }); } });
    gsap.delayedCall(0.3, intro);
  }
  if (motion) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-open')) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // same page, hash handled elsewhere
      e.preventDefault();
      leaveTo(url.href);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) { gsap.set(curtain, { visibility: 'hidden' }); gsap.set(bars, { xPercent: -101 }); }
    });
  }

  /* ---------------- intro choreography (slot in like a strip) ---------------- */
  function intro() {
    if (!motion) return;
    var tl = gsap.timeline({ defaults: { ease: EASE.out } });
    var heads = document.querySelectorAll('.name__in, .wk-h__in, .ab-h__in');
    if (heads.length) tl.to(heads, { y: 0, duration: 1.15, stagger: 0.09 }, 0);
    var intros = document.querySelectorAll('[data-intro]');
    if (intros.length) tl.fromTo(intros, { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.9, stagger: 0.07, clearProps: 'transform' }, 0.15);
    var minis = document.querySelectorAll('.mini__s');
    if (minis.length) tl.to(minis, { clipPath: 'inset(0% 0 0 0)', duration: 0.9, stagger: { each: 0.045, from: 'start' } }, 0.25);
    slotIn(document.querySelectorAll('[data-slot]'), tl, 0.35);
    reveals();
  }

  function slotIn(items, tl, at) {
    if (!items.length) return;
    var inView = [], later = [];
    items.forEach(function (el) { (el.getBoundingClientRect().top < innerHeight ? inView : later).push(el); });
    inView.forEach(function (el) { el.dataset.shown = '1'; });
    if (inView.length) tl.fromTo(inView, { autoAlpha: 0, x: -40, clipPath: 'inset(0 100% 0 0)' },
      { autoAlpha: 1, x: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.95, stagger: 0.06, clearProps: 'transform,clipPath' }, at);
    onEnter(later, function (el) {
      gsap.fromTo(el, { autoAlpha: 0, x: -40, clipPath: 'inset(0 100% 0 0)' },
        { autoAlpha: 1, x: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.95, ease: EASE.out, clearProps: 'transform,clipPath' });
    });
  }

  function reveals() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    onEnter(els, function (el, i) {
      gsap.fromTo(el, { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.9, ease: EASE.out, delay: (i % 4) * 0.06, clearProps: 'transform' });
    });
  }

  function onEnter(els, fn) {
    if (!els.length) return;
    var n = 0;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        if (en.target.dataset.shown) return;
        en.target.dataset.shown = '1'; fn(en.target, n++);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- CTA fill slides in from the pointer's side ---------------- */
  if (motion && !touch) {
    document.querySelectorAll('[data-fill]').forEach(function (btn) {
      var fill = btn.querySelector('.cta__fill');
      if (!fill) return;
      fill.style.transition = 'none';
      gsap.set(fill, { scaleX: 0 });
      function side(e) { var r = btn.getBoundingClientRect(); return e.clientX - r.left < r.width / 2 ? 'left center' : 'right center'; }
      btn.addEventListener('pointerenter', function (e) { gsap.set(fill, { transformOrigin: side(e) }); gsap.to(fill, { scaleX: 1, duration: 0.55, ease: EASE.out, overwrite: true }); });
      btn.addEventListener('pointerleave', function (e) { gsap.set(fill, { transformOrigin: side(e) }); gsap.to(fill, { scaleX: 0, duration: 0.45, ease: EASE.soft, overwrite: true }); });
      btn.addEventListener('focus', function () { if (btn.matches(':focus-visible')) gsap.to(fill, { scaleX: 1, duration: 0.5, ease: EASE.out, overwrite: true }); });
      btn.addEventListener('blur', function () { gsap.to(fill, { scaleX: 0, duration: 0.4, ease: EASE.soft, overwrite: true }); });
    });
  }

  /* ---------------- WORK: filter the board (signature) ---------------- */
  initFilter(gsap);
  function initFilter(g) {
    var list = document.querySelector('[data-rows]');
    if (!list) return;
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
    var rows = Array.prototype.slice.call(list.children);
    var count = document.querySelector('[data-count]');
    var countLabel = document.querySelector('[data-count-label]');
    var empty = document.querySelector('.wk-empty');
    var labels = { all: 'strips on the board' };
    tabs.forEach(function (t) { if (t.dataset.filter !== 'all') labels[t.dataset.filter] = t.querySelector('.tab__label').textContent.toLowerCase() + ' strips pulled'; });

    function apply(key, animate) {
      if (!(key in labels)) key = 'all';
      tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.dataset.filter === key)); });
      var show = rows.filter(function (r) { return key === 'all' || r.dataset.cat === key; });
      var nVideos = show.filter(function (r) { return r.dataset.id; }).length;
      var useFlip = animate && g && window.Flip && motion;
      if (count) count.textContent = nVideos;
      if (countLabel) countLabel.textContent = labels[key];
      if (empty) empty.hidden = nVideos > 0;
      if (!useFlip) {
        rows.forEach(function (r) { r.classList.toggle('is-out', show.indexOf(r) < 0); r.style.visibility = ''; });
        return;
      }
      // 1. pull the other strips off the board, 2. slot the chosen ones into place
      if (running) running.progress(1);
      var leaving = rows.filter(function (r) { return show.indexOf(r) < 0 && !r.classList.contains('is-out'); });
      var tl = running = g.timeline({ onComplete: function () { running = null; } });
      if (leaving.length) tl.to(leaving, { x: 80, autoAlpha: 0, clipPath: 'inset(0 0 0 100%)', duration: 0.32, ease: 'power2.in', stagger: 0.02 });
      tl.add(function () {
        var state = window.Flip.getState(rows.filter(function (r) { return !r.classList.contains('is-out') && leaving.indexOf(r) < 0 && r.dataset.shown; }));
        var entering = show.filter(function (r) { return r.classList.contains('is-out') || !r.dataset.shown; });
        entering.forEach(function (r) { r.dataset.shown = '1'; });
        rows.forEach(function (r) { r.classList.toggle('is-out', show.indexOf(r) < 0); r.style.visibility = ''; });
        g.set(leaving, { clearProps: 'transform,opacity,visibility,clipPath' });
        window.Flip.from(state, { duration: 0.7, ease: EASE.out });
        if (entering.length) g.fromTo(entering, { autoAlpha: 0, x: -60, clipPath: 'inset(0 100% 0 0)' },
          { autoAlpha: 1, x: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: EASE.out, stagger: 0.045, clearProps: 'transform,clipPath' });
      });
    }
    var running = null;
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        var key = t.dataset.filter;
        history.replaceState(null, '', key === 'all' ? location.pathname : '#' + key);
        apply(key, true);
      });
    });
    var start = location.hash.replace('#', '').toLowerCase();
    // old links from the previous site: #/works/commercial
    var m = start.match(/works\/([^/]+)/);
    if (m) start = decodeURIComponent(m[1]).indexOf('event') === 0 ? 'event' : decodeURIComponent(m[1]);
    apply(start || 'all', false);
    window.addEventListener('hashchange', function () { apply(location.hash.replace('#', '') || 'all', true); });
  }

  /* ---------------- WORK: the monitor (lightbox) ---------------- */
  initMonitor();
  function initMonitor() {
    var dlg = document.querySelector('[data-monitor]');
    if (!dlg || !window.__WORKS) return;
    var data = window.__WORKS;
    var colors = { 'Commercial': 'var(--s-com)', 'Event and content': 'var(--s-evt)', 'Narrative': 'var(--s-nar)' };
    var q = function (s) { return dlg.querySelector(s); };
    var frame = q('[data-mon-frame]');
    var order = [], idx = 0, opener = null;
    function visibleIds() {
      return Array.prototype.slice.call(document.querySelectorAll('[data-rows] > li[data-id]:not(.is-out)')).map(function (li) { return +li.dataset.id; });
    }
    function paint() {
      var w = data.filter(function (x) { return x.id === order[idx]; })[0];
      if (!w) return;
      var parts = w.aspect.split(':');
      frame.style.setProperty('--ar', parts[0] + ' / ' + parts[1]);
      frame.style.setProperty('--arn', String(parts[0] / parts[1]));
      frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + w.yt + '?autoplay=1&rel=0" title="' + (w.client + ', ' + w.title).replace(/"/g, '&quot;') + '" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>';
      q('[data-mon-no]').textContent = w.no;
      q('[data-mon-cat]').textContent = w.cat;
      q('[data-mon-chip]').style.setProperty('--c', colors[w.cat]);
      q('[data-mon-client]').textContent = w.client;
      q('[data-mon-title]').textContent = w.title;
      q('[data-mon-sub]').innerHTML = w.role + ' · <span class="num">' + w.aspect + '</span> · ' + (idx + 1) + ' of ' + order.length;
    }
    function open(id, from) {
      order = visibleIds(); idx = Math.max(0, order.indexOf(id)); opener = from;
      paint();
      dlg.showModal();
      if (lenis) lenis.stop();
      if (gsap && motion) gsap.fromTo(dlg, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.7, ease: EASE.out, clearProps: 'clipPath' });
      q('[data-mon-close]').focus();
    }
    function close() {
      frame.innerHTML = '';
      if (dlg.open) dlg.close();
    }
    dlg.addEventListener('close', function () { frame.innerHTML = ''; if (lenis) lenis.start(); if (opener) opener.focus(); });
    function step(d) { idx = (idx + d + order.length) % order.length; paint(); }
    q('[data-mon-close]').addEventListener('click', close);
    q('[data-mon-prev]').addEventListener('click', function () { step(-1); });
    q('[data-mon-next]').addEventListener('click', function () { step(1); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    document.querySelectorAll('[data-open]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        open(+a.dataset.open, a);
      });
    });
  }

  /* ---------------- go ---------------- */
  if (motion) {
    if (document.fonts && document.fonts.ready) {
      var started = false;
      var go = function () { if (!started) { started = true; enter(); } };
      document.fonts.ready.then(go);
      setTimeout(go, 600);
    } else enter();
  }
})();
