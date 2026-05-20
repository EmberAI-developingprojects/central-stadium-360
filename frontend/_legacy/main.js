    (function () {
      var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // 1) Smooth scroll on in-page anchor clicks
      document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
        if (history.pushState) history.pushState(null, '', href);
      });

      // 2) Sticky header: switch to denser glass once the page scrolls
      var header = document.querySelector('.site-header');
      if (header) {
        var onScroll = function () {
          if (window.scrollY > 8) header.classList.add('is-scrolled');
          else header.classList.remove('is-scrolled');
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
      }

      // 3) Reveal on scroll
      var els = document.querySelectorAll('.reveal-up');
      if (!('IntersectionObserver' in window) || prefersReduced) {
        els.forEach(function (el) { el.classList.add('is-in'); });
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
      els.forEach(function (el) { io.observe(el); });
    })();

    (function () {
      var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var stage = document.getElementById('upcomingStage');
      if (!stage) return;

      var slides = Array.prototype.slice.call(stage.querySelectorAll('.up-slide'));
      var thumbs = Array.prototype.slice.call(document.querySelectorAll('#upThumbs button'));
      var progress = document.getElementById('upProgress');
      var prev = document.getElementById('upPrev');
      var next = document.getElementById('upNext');
      var interval = 5500;
      var idx = 0;
      var rafId = null;
      var startTs = 0;

      function setActive(i) {
        idx = (i + slides.length) % slides.length;
        slides.forEach(function (s, k) { s.classList.toggle('is-active', k === idx); });
        thumbs.forEach(function (t, k) { t.classList.toggle('is-active', k === idx); });
      }

      function tick(ts) {
        if (!startTs) startTs = ts;
        var elapsed = ts - startTs;
        var pct = Math.min(100, (elapsed / interval) * 100);
        if (progress) progress.style.width = pct + '%';
        if (elapsed >= interval) { setActive(idx + 1); startTs = ts; }
        rafId = requestAnimationFrame(tick);
      }

      function start() {
        if (rafId) return;
        startTs = 0;
        rafId = requestAnimationFrame(tick);
      }
      function stop() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        if (progress) progress.style.width = '0%';
      }
      function restart() { stop(); start(); }

      thumbs.forEach(function (t, k) {
        t.addEventListener('click', function () { setActive(k); restart(); });
      });
      if (prev) prev.addEventListener('click', function () { setActive(idx - 1); restart(); });
      if (next) next.addEventListener('click', function () { setActive(idx + 1); restart(); });

      stage.addEventListener('mouseenter', stop);
      stage.addEventListener('mouseleave', start);

      if (prefersReduced) {
        if (progress) progress.style.width = '0%';
        return;
      }

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
        }, { threshold: 0.25 });
        io.observe(stage);
      } else {
        start();
      }
    })();

    (function () {
      var v = document.getElementById('storyVideo');
      var btn = document.getElementById('storyVideoToggle');
      if (!v || !btn) return;
      var sync = function () { btn.classList.toggle('is-paused', v.paused); };
      btn.addEventListener('click', function () {
        if (v.paused) { v.play(); } else { v.pause(); }
      });
      v.addEventListener('play', sync);
      v.addEventListener('pause', sync);
      sync();
    })();

    // Auth-gated CTAs: any element with data-gated="watch" routes through login.html
    // when no session exists. After login the user is sent to watch.html.
    (function () {
      function getSession() {
        try { return JSON.parse(localStorage.getItem('tsengeldekh_session') || 'null'); }
        catch (e) { return null; }
      }
      document.addEventListener('click', function (e) {
        var el = e.target.closest('[data-gated="watch"]');
        if (!el) return;
        e.preventDefault();
        var session = getSession();
        if (session && session.identifier) {
          window.location.href = 'watch.html';
        } else {
          window.location.href = 'login.html?next=watch.html';
        }
      });

      // Reflect logged-in state in the header: swap "Нэвтрэх" pill for the user's name + a logout
      var session = getSession();
      var authBar = document.querySelector('.header-auth');
      if (session && session.identifier && authBar) {
        var label = session.fullname || session.identifier;
        authBar.innerHTML =
          '<a href="watch.html" class="auth-btn" aria-label="Хувийн булан">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>' +
            '</svg>' +
            '<span>' + label + '</span>' +
          '</a>' +
          '<button type="button" class="auth-link" id="logoutBtn" style="background:none;border:none;cursor:pointer;font-family:inherit;">Гарах</button>';
        var logout = document.getElementById('logoutBtn');
        if (logout) logout.addEventListener('click', function () {
          try { localStorage.removeItem('tsengeldekh_session'); } catch (e) {}
          window.location.reload();
        });
      }
    })();
