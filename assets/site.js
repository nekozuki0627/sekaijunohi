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

  /* ---------- FAQ をひとつずつ開く ---------- */
  var faq = document.querySelectorAll('.faq details');
  Array.prototype.forEach.call(faq, function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) { return; }
      Array.prototype.forEach.call(faq, function (o) { if (o !== d) { o.open = false; } });
    });
  });
})();
