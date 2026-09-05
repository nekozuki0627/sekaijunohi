/* 冒険者ギルド世界樹の日 — 共通スクリプト */
(function () {
  'use strict';

  /* ---------- 問い合わせフォーム（Googleフォームへ送る） ---------- */
  var f = document.getElementById('inquiry');
  if (f) {
    var hint = document.getElementById('q-hint');
    var sent = document.getElementById('q-sent');
    var btn = f.querySelector('button[type="submit"]');
    var defaultHint = hint ? hint.textContent : '';
    var busy = false;

    function fail(msg, el) {
      if (hint) { hint.textContent = msg; hint.className = 'hint err'; }
      if (el) { el.focus(); }
    }

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) { return; }
      if (f.company && f.company.value) { return; }  /* 迷惑投稿よけ */

      var name = f.qname.value.trim(),
          mail = f.qmail.value.trim(),
          kind = f.kind.value,
          body = f.qbody.value.trim();

      if (!name || !mail || !body) {
        fail('お名前・メールアドレス・ご用件の内容は、お手数ですがすべてご記入ください。',
             !name ? f.qname : !mail ? f.qmail : f.qbody);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        fail('メールアドレスの形をご確認ください。返信先になります。', f.qmail);
        return;
      }

      var d = f.dataset;
      var data = new FormData();
      data.append(d.fName, name);
      data.append(d.fMail, mail);
      data.append(d.fKind, kind);
      data.append(d.fBody, body);

      busy = true;
      if (btn) { btn.disabled = true; btn.textContent = '送っています…'; }
      if (hint) { hint.className = 'hint'; hint.textContent = '送信中です。少しお待ちください。'; }

      fetch(d.endpoint, { method: 'POST', mode: 'no-cors', body: data })
        .then(function () {
          f.hidden = true;
          if (sent) {
            sent.hidden = false;
            sent.setAttribute('tabindex', '-1');
            sent.focus();
            sent.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        })
        .catch(function () {
          busy = false;
          if (btn) { btn.disabled = false; btn.textContent = 'この内容で送る'; }
          fail('うまく送れませんでした。通信状況をご確認のうえ、もう一度お試しください。');
          setTimeout(function () {
            if (hint) { hint.className = 'hint'; hint.textContent = defaultHint; }
          }, 8000);
        });
    });
  }

  /* ---------- カレンダーに追加（.ics を書き出す） ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsStamp(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T'
      + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';
  }
  function fold(s) { return s.replace(/[\\;,]/g, function (m) { return '\\' + m; }).replace(/\n/g, '\\n'); }

  var cal = document.getElementById('addcal');
  if (cal) {
    cal.addEventListener('click', function (e) {
      e.preventDefault();
      var d = cal.dataset;
      var days = [[d.start, d.end]];
      if (d.start2 && d.end2) { days.push([d.start2, d.end2]); }
      var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//yggdrasill day//JP',
        'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
      days.forEach(function (day, i) {
        lines.push(
          'BEGIN:VEVENT',
          'UID:' + (d.uid || 'yggdrasill-event') + '-' + (i + 1) + '@yggdrasill.day',
          'DTSTAMP:' + icsStamp(new Date()),
          'DTSTART:' + day[0],
          'DTEND:' + day[1],
          'SUMMARY:' + fold(d.title || '') + (days.length > 1 ? fold('（' + (i + 1) + '日目）') : ''),
          'LOCATION:' + fold(d.place || ''),
          'DESCRIPTION:' + fold(d.desc || ''),
          'URL:' + (d.url || location.href),
          'END:VEVENT'
        );
      });
      lines.push('END:VCALENDAR');
      var body = lines.join('\r\n');
      var blob = new Blob(['﻿' + body], { type: 'text/calendar;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (d.file || 'event') + '.ics';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    });
  }

  /* ---------- 共有する ---------- */
  var sh = document.getElementById('share');
  if (sh) {
    sh.addEventListener('click', function (e) {
      e.preventDefault();
      var data = {
        title: document.title,
        text: sh.dataset.text || document.title,
        url: location.href
      };
      if (navigator.share) {
        navigator.share(data).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () {
          var old = sh.innerHTML;
          sh.textContent = 'リンクをコピーしました';
          setTimeout(function () { sh.innerHTML = old; }, 2200);
        });
      } else {
        window.prompt('このリンクをコピーしてください', location.href);
      }
    });
  }

  /* =========================================================
     ここから下は「動き」まわり
     ========================================================= */
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- スクロールで浮かび上がる ---------- */
  (function () {
    var targets = document.querySelectorAll(
      '.chead, .notice .panel, .quests > *, .cards > *, .plans > *, .gal, .recs, ' +
      '.flow, .faq, .seals, .actions, .letter, .engrave, .access, .pad');
    if (!targets.length) { return; }
    if (calm || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(targets, function (el) { el.classList.add('in'); });
      return;
    }
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('reveal'); });
    /* 万一 observer が動かなくても本文が消えたままにならないようにする */
    setTimeout(function () {
      Array.prototype.forEach.call(targets, function (el) { el.classList.add('in'); });
    }, 6000);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        var el = e.target;
        var sibs = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
        el.style.transitionDelay = Math.min(sibs, 4) * 90 + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  })();

  /* ---------- 扉に漂う灯りの粒 ---------- */
  (function () {
    var box = document.getElementById('embers');
    if (!box || calm) { return; }
    var n = window.innerWidth < 600 ? 10 : 16;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var e = document.createElement('i');
      var size = 2.5 + Math.random() * 3.5;
      e.style.setProperty('--s', size.toFixed(1) + 'px');
      e.style.setProperty('--o', (0.45 + Math.random() * 0.5).toFixed(2));
      e.style.setProperty('--dx', (Math.random() * 90 - 45).toFixed(0) + 'px');
      e.style.setProperty('--h', '-' + (200 + Math.random() * 260).toFixed(0) + 'px');
      e.style.setProperty('--d', (8 + Math.random() * 9).toFixed(1) + 's');
      e.style.setProperty('--delay', (-Math.random() * 14).toFixed(1) + 's');
      e.style.left = (Math.random() * 100).toFixed(1) + '%';
      e.style.bottom = (-10 - Math.random() * 40).toFixed(0) + 'px';
      frag.appendChild(e);
    }
    box.appendChild(frag);
  })();

  /* ---------- 開催までの日数 ---------- */
  (function () {
    var cd = document.getElementById('cd');
    if (!cd) { return; }
    var start = new Date(cd.dataset.target).getTime();
    var end = new Date(cd.dataset.end || cd.dataset.target).getTime();
    if (isNaN(start)) { return; }
    var now = Date.now();
    var nEl = cd.querySelector('.n'), lb = cd.querySelector('.lb'), u = cd.querySelector('.u');
    if (now > end) { return; }                        /* 終わったら出さない */
    if (now >= start) {
      cd.classList.add('today');
      lb.textContent = 'ただいま';
      nEl.textContent = '開催中';
      nEl.style.fontSize = '22px';
      u.textContent = '';
    } else {
      var days = Math.ceil((start - now) / 86400000);
      lb.textContent = '開催まで';
      nEl.textContent = days;
      u.textContent = '日';
    }
    cd.hidden = false;
  })();

  /* ---------- HUD のスクロール進捗 ＋ 現在地 ＋ 扉のパララックス ---------- */
  (function () {
    var prog = document.getElementById('prog');
    var hero = document.querySelector('.top .bg');
    var links = document.querySelectorAll('.hud nav a[href^="#"]');
    var wide = window.matchMedia('(min-width: 760px)').matches;
    var ticking = false;

    function frame() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var y = window.scrollY || doc.scrollTop;
      if (prog) { prog.style.width = (max > 0 ? Math.min(y / max, 1) * 100 : 0) + '%'; }
      if (hero && wide && !calm && y < 700) { hero.style.transform = 'translate3d(0,' + (y * 0.16).toFixed(1) + 'px,0)'; }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { wide = window.matchMedia('(min-width: 760px)').matches; onScroll(); }, { passive: true });
    frame();

    if (links.length && 'IntersectionObserver' in window) {
      var map = {};
      Array.prototype.forEach.call(links, function (a) {
        var sec = document.querySelector(a.getAttribute('href'));
        if (sec) { map[sec.id] = a; }
      });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var a = map[e.target.id];
          if (!a) { return; }
          if (e.isIntersecting) {
            Array.prototype.forEach.call(links, function (l) { l.removeAttribute('aria-current'); });
            a.setAttribute('aria-current', 'true');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
    }
  })();

  /* ---------- 世界のかけら：横スワイプの点 ---------- */
  (function () {
    var track = document.getElementById('galTrack');
    var dots = document.getElementById('galDots');
    if (!track || !dots) { return; }
    var slides = track.querySelectorAll('.win2');
    if (slides.length < 2) { return; }

    Array.prototype.forEach.call(slides, function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', (i + 1) + '枚目を見る');
      b.addEventListener('click', function () {
        track.scrollTo({ left: s.offsetLeft - track.offsetLeft - 10, behavior: calm ? 'auto' : 'smooth' });
      });
      dots.appendChild(b);
    });

    var ticking = false;
    function sync() {
      ticking = false;
      var mid = track.scrollLeft + track.clientWidth / 2;
      var best = 0, bestD = Infinity;
      Array.prototype.forEach.call(slides, function (s, i) {
        var c = s.offsetLeft - track.offsetLeft + s.offsetWidth / 2;
        var d = Math.abs(c - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      Array.prototype.forEach.call(dots.children, function (b, i) {
        if (i === best) { b.setAttribute('aria-current', 'true'); }
        else { b.removeAttribute('aria-current'); }
      });
    }
    track.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(sync); }
    }, { passive: true });
    sync();
  })();

  /* ---------- FAQ をひとつずつ開く ---------- */
  var faq = document.querySelectorAll('.faq details');
  Array.prototype.forEach.call(faq, function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) { return; }
      Array.prototype.forEach.call(faq, function (o) { if (o !== d) { o.open = false; } });
    });
  });
})();
