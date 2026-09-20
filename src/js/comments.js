// Margin notes → document comments.
//
// Each <aside class="margin-note"> in the post (rendered by the `marginnote`
// shortcode) is anchored to a phrase or paragraph, then shown as a card:
//   • rail  — on the grey desk beside the page, level with its anchor
//   • sheet — one card at a time above the status bar, when the desk is too
//             narrow for a rail
// Without JS, in print and in feeds the plain inline <aside> is what shows.
(function () {
  // base.njk hides notes until this script has decided which ones get a card
  document.documentElement.classList.remove('comments-pending');

  var main = document.getElementById('main');
  if (!main) return;
  var asides = Array.prototype.slice.call(main.querySelectorAll('.margin-note'));
  if (!asides.length) return;

  var html = document.documentElement;
  var canvas = document.querySelector('.app-canvas');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RAIL_MARGIN = 12; // breathing room between the rail and the viewport edge
  var SEARCH = 3;       // neighbouring blocks considered when a note needs a free block

  // Curly quotes (the typographer) and straight ones should match each other.
  function norm(s) {
    return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  }

  // Wrap the first occurrence of `phrase` inside `block` in a <mark>.
  function wrapPhrase(block, phrase, mark) {
    var want = norm(phrase);
    var walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var i = norm(node.nodeValue).indexOf(want);
      if (i < 0) continue;
      var range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + want.length);
      range.surroundContents(mark);
      return true;
    }
    return false;
  }

  function neighbours(aside, dir) {
    var out = [], el = aside;
    while (out.length < SEARCH && (el = dir > 0 ? el.nextElementSibling : el.previousElementSibling)) {
      if (!el.classList.contains('margin-note') && !el.classList.contains('comment-badge-row')) out.push(el);
    }
    return out;
  }

  function findAnchor(aside, phrase) {
    var ahead = neighbours(aside, 1), behind = neighbours(aside, -1);
    // The phrase is looked for only in the block the note introduces: the one
    // right after it (or right before, when the note ends the post).
    var first = ahead[0] || behind[0];
    if (phrase && first) {
      var mark = document.createElement('mark');
      mark.className = 'comment-anchor';
      if (wrapPhrase(first, phrase, mark)) return { el: mark, phrase: true };
      console.warn('[comments] anchor phrase not found in the block after the note:', phrase);
    }
    // Whole-block anchor: the nearest block no other note has already taken
    var free = ahead.concat(behind).filter(function (b) { return !b.classList.contains('comment-target'); })[0];
    return free ? { el: free, phrase: false } : null;
  }

  // The badge sits inside the anchor block when that is a text container,
  // otherwise on a small row of its own just before it (a <sup>/<button>
  // directly inside a <ul>, <table> or <hr> would be invalid).
  function placeBadge(found, badge) {
    var el = found.el;
    if (found.phrase) {
      // Outside any link the phrase sits in: a button nested in an <a> is
      // invalid, and tapping it would follow the link.
      var after = el.closest('a') || el;
      after.parentNode.insertBefore(badge, after.nextSibling);
      return;
    }
    var host = /^(P|H[1-6]|LI|BLOCKQUOTE|DD|DT)$/.test(el.tagName) ? el : el.querySelector('p, li, td, th, figcaption');
    if (host) {
      host.appendChild(badge);
    } else {
      var row = document.createElement('div');
      row.className = 'comment-badge-row';
      row.appendChild(badge);
      el.parentNode.insertBefore(row, el);
    }
  }

  // ── Build one comment per aside ────────────────────────────────────────────
  var comments = []; // { anchor, card, y, cardY } — y/cardY are set by layoutRail
  asides.forEach(function (aside) {
    var found = findAnchor(aside, aside.getAttribute('data-anchor'));
    if (!found) return;
    var id = comments.length + 1;
    var el = found.el;

    el.setAttribute('data-c', id);
    if (found.phrase) el.tabIndex = 0;
    else el.classList.add('comment-target');

    var badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'comment-badge';
    badge.setAttribute('data-c', id);
    badge.setAttribute('aria-label', 'Open note ' + id);
    badge.textContent = id;
    placeBadge(found, badge);

    var card = document.createElement('article');
    card.className = 'comment';
    card.id = 'comment-' + id;
    card.setAttribute('data-c', id);
    card.setAttribute('aria-label', 'Note ' + id);
    card.innerHTML = aside.innerHTML;
    aside.hidden = true; // only notes that got a card are hidden; the rest stay readable inline

    comments.push({ anchor: el, card: card, phrase: found.phrase, label: 'Note ' + id + ' on \u201c' + el.textContent + '\u201d' });
  });
  if (!comments.length) return;

  // ── Rail ───────────────────────────────────────────────────────────────────
  var rail = document.createElement('div');
  rail.className = 'comment-rail';
  rail.setAttribute('role', 'complementary');
  rail.setAttribute('aria-label', 'Notes');
  var svgNS = 'http://www.w3.org/2000/svg';
  var conn = document.createElementNS(svgNS, 'svg');
  conn.setAttribute('class', 'comment-conn');
  conn.setAttribute('aria-hidden', 'true');
  var path = document.createElementNS(svgNS, 'path');
  conn.appendChild(path);
  rail.appendChild(conn);
  comments.forEach(function (c) { rail.appendChild(c.card); });
  main.appendChild(rail);

  // ── Sheet ──────────────────────────────────────────────────────────────────
  var sheet = document.createElement('div');
  sheet.className = 'comment-sheet';
  sheet.setAttribute('role', 'region');
  sheet.setAttribute('aria-label', 'Note');
  sheet.hidden = true;
  sheet.innerHTML =
    '<i class="comment-sheet__grab"></i>' +
    '<div class="comment-sheet__head"><span class="comment-sheet__count" aria-live="polite"></span><span>' +
    '<button type="button" data-act="prev" aria-label="Previous note">‹</button>' +
    '<button type="button" data-act="next" aria-label="Next note">›</button>' +
    '<button type="button" data-act="close" aria-label="Close note">×</button>' +
    '</span></div><div class="comment-sheet__body"></div>';
  document.body.appendChild(sheet);
  var sheetCount = sheet.querySelector('.comment-sheet__count');
  var sheetBody = sheet.querySelector('.comment-sheet__body');

  // ── State ──────────────────────────────────────────────────────────────────
  var railMode = false;
  var applied = null; // the mode setAnchorMode() last ran for
  var active = 0;   // hovered / focused (rail) or open (sheet) comment id
  var shown = null; // the comment currently painted as active
  var railW = 0, gap = 0; // --comment-w / --comment-gap, re-read on each relayout

  function byId(id) { return comments[id - 1]; }

  // Rail: the anchor is focusable text described by its card (nothing to press).
  // Sheet: a phrase is a button that opens the sheet; a whole-paragraph note
  // opens from its badge button instead.
  function setAnchorMode() {
    comments.forEach(function (c) {
      var el = c.anchor;
      if (railMode) {
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
        el.setAttribute('aria-describedby', c.card.id);
      } else {
        el.removeAttribute('aria-describedby');
        if (c.phrase) {
          el.setAttribute('role', 'button');
          el.setAttribute('aria-label', c.label);
        }
      }
    });
  }
  function token(name) { return parseFloat(getComputedStyle(html).getPropertyValue(name)) || 0; }

  // Everything below works in the canvas's own (unzoomed) coordinates: rects
  // are in visual px, so divide by the zoom scale before using them as CSS px.
  function scale() { return parseFloat(canvas.style.zoom) || 1; }

  function paint() {
    if (shown) {
      shown.anchor.classList.remove('on');
      shown.card.classList.remove('on');
    }
    shown = active ? byId(active) : null;
    sheet.hidden = railMode || !shown;
    if (!shown) { path.setAttribute('d', ''); return; }
    shown.anchor.classList.add('on');
    shown.card.classList.add('on');
    // The svg sits inside the rail: x = 0 is the rail's left edge, and the
    // page edge is one gap to the left of it.
    path.setAttribute('d', railMode
      ? 'M' + -gap + ' ' + shown.y + ' H' + -gap / 2 + ' V' + shown.cardY + ' H0'
      : '');
  }

  function setActive(id) {
    if (id === active) return;
    active = id;
    paint();
  }

  // Read every measurement first, then write the card positions once.
  function layoutRail() {
    var s = scale(), top0 = main.getBoundingClientRect().top, bottom = 0;
    comments.map(function (c) {
      var r = c.anchor.getBoundingClientRect();
      return {
        c: c,
        top: (r.top - top0) / s,
        mid: (r.top - top0 + Math.min(r.height / 2, 10 * s)) / s,
        h: c.card.offsetHeight
      };
    }).sort(function (a, b) { return a.top - b.top; }).forEach(function (it) {
      var top = Math.max(it.top, bottom);
      it.c.card.style.top = top + 'px';
      it.c.y = it.mid;
      it.c.cardY = top + 14;
      bottom = top + it.h + 8;
    });
  }

  // Is there room on the desk, right of the page, for the rail?
  function roomForRail() {
    var need = (railW + gap + RAIL_MARGIN) * scale();
    return html.clientWidth - main.getBoundingClientRect().right >= need;
  }

  function relayout() {
    railW = token('--comment-w');
    gap = token('--comment-gap');
    railMode = roomForRail();
    html.classList.toggle('comments-rail', railMode);
    rail.hidden = !railMode;
    if (railMode !== applied) { // entering a mode: start clean
      applied = railMode;
      active = 0;
      setAnchorMode();
    }
    if (railMode) layoutRail();
    paint();
  }

  // ── Sheet behaviour ────────────────────────────────────────────────────────
  function openSheet(id) {
    active = id;
    sheetBody.innerHTML = '<div class="comment">' + byId(id).card.innerHTML + '</div>';
    sheetCount.textContent = 'Note ' + id + ' of ' + comments.length;
    paint();
    reveal(byId(id).anchor);
  }

  // Scroll so the anchor sits in the visible band between the sticky chrome
  // and the top of the sheet. (--chrome-h is a calc(), so measure the bars.)
  function reveal(el) {
    var chrome = ['.app-toolbar', '.app-ruler'].reduce(function (max, sel) {
      var bar = document.querySelector(sel);
      return bar ? Math.max(max, bar.getBoundingClientRect().bottom) : max;
    }, 0);
    var top = chrome + 8;
    var bottom = window.innerHeight - sheet.offsetHeight - 24;
    var r = el.getBoundingClientRect();
    if (r.top >= top && r.bottom <= bottom) return;
    window.scrollBy({ top: r.top - (top + (bottom - top) * 0.3), behavior: reduce ? 'auto' : 'smooth' });
  }

  sheet.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var k = b.getAttribute('data-act'), n = comments.length;
    if (k === 'close') setActive(0);
    else if (k === 'next') openSheet(active % n + 1);
    else if (k === 'prev') openSheet((active + n - 2) % n + 1);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !sheet.hidden) setActive(0);
  });

  // ── Interaction ────────────────────────────────────────────────────────────
  function idFrom(node) {
    var t = node.closest && node.closest('[data-c]');
    return t && main.contains(t) ? +t.getAttribute('data-c') : 0;
  }

  function enter(e) {
    var id = idFrom(e.target);
    if (railMode && id) setActive(id);
  }
  function leave(e) {
    if (railMode && !idFrom(e.relatedTarget || document.body)) setActive(0);
  }
  ['mouseover', 'focusin'].forEach(function (t) { main.addEventListener(t, enter); });
  ['mouseout', 'focusout'].forEach(function (t) { main.addEventListener(t, leave); });

  main.addEventListener('click', function (e) {
    if (railMode || e.target.closest('.comment-rail')) return;
    var t = e.target.closest('[data-c]');
    if (!t || !main.contains(t)) return;
    var isBadge = t.classList.contains('comment-badge');
    // A whole-paragraph note opens from its badge only, so selecting text in
    // the paragraph doesn't pop the sheet; and links keep their own click.
    if (!isBadge && (t.classList.contains('comment-target') || e.target.closest('a'))) return;
    if (isBadge) e.preventDefault();
    openSheet(+t.getAttribute('data-c'));
  });
  main.addEventListener('keydown', function (e) {
    if (!railMode && (e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('comment-anchor')) {
      e.preventDefault();
      e.target.click();
    }
  });

  // ── Keep layout honest ─────────────────────────────────────────────────────
  var timer = 0;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(relayout, 16);
  }
  window.addEventListener('resize', schedule);
  document.fonts.ready.then(schedule);
  new ResizeObserver(schedule).observe(main);
  // Zoom (canvas style) and font (root style) changes reflow the text
  var mo = new MutationObserver(schedule);
  mo.observe(canvas, { attributes: true, attributeFilter: ['style'] });
  mo.observe(html, { attributes: true, attributeFilter: ['style'] });

  relayout();
})();
