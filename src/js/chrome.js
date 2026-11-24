// Application chrome: the working parts of the titlebar, menus, toolbar and
// status bar (see base.njk, which holds the markup). Loaded on every page, at
// the end of <body>; a small script in <head> has already restored the
// visit's font, text size and ¶ marks so the page doesn't flash.
(function () {

  // ── Shared: custom dropdown ───────────────────────────────────────────────
  function initDropdown(el, onChange, keepLabel) {
    var label   = el.querySelector('.app-dropdown__label');
    var options = el.querySelectorAll('.app-dropdown__option');

    el.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = el.classList.contains('app-dropdown--open');
      closeAll();
      if (!isOpen) el.classList.add('app-dropdown--open');
    });

    options.forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        options.forEach(function (o) { o.classList.remove('app-dropdown__option--selected'); });
        opt.classList.add('app-dropdown__option--selected');
        if (!keepLabel) label.textContent = opt.textContent;
        el.classList.remove('app-dropdown--open');
        if (onChange) onChange(opt.dataset.value);
      });
    });

    return {
      setValue: function (val) {
        options.forEach(function (o) {
          var match = o.dataset.value === String(val);
          o.classList.toggle('app-dropdown__option--selected', match);
          if (match) label.textContent = o.textContent;
        });
      }
    };
  }

  function closeAll() {
    document.querySelectorAll('.app-dropdown--open, .app-menu--open').forEach(function (d) {
      d.classList.remove('app-dropdown--open', 'app-menu--open');
    });
  }

  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });

  // ── 0. VISIT — formatting carries across pages within one visit only ─────
  // A fresh arrival (typed URL, bookmark, link from another site) clears the
  // saved font, size, zoom and ¶. Moving between pages, reload and back/forward
  // keep them. Storage stays sessionStorage, so a new tab is fresh too.
  var KEY = { font: 'musings-font', size: 'musings-size', zoom: 'musings-zoom', marks: 'musings-marks' };
  // Storage can throw (cookies blocked); formatting then just doesn't persist
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (err) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (err) {} }
  };
  // A fresh arrival has already cleared these (the <head> script in base.njk)

  // ── 1. FONT — persists within a visit ────────────────────────────────────
  var fontMap = {
    arial:   'Arial, Helvetica, sans-serif',
    georgia: 'Georgia, "Times New Roman", serif'
  };

  function applyFont(key) {
    document.documentElement.style.setProperty('--font-doc', fontMap[key] || fontMap.arial);
    store.set(KEY.font, key);
  }

  var fontDropdown = initDropdown(document.querySelector('.app-toolbar__font'), applyFont);

  var savedFont = store.get(KEY.font);
  if (savedFont && fontMap[savedFont]) {
    applyFont(savedFont);
    fontDropdown.setValue(savedFont);
  }

  // ── 2. ZOOM — session-persistent, from the dropdown and Help menu ─────────────────────────
  var zoomDropdown = initDropdown(document.querySelector('.app-toolbar__zoom'), function (value) {
    applyZoom(levels.indexOf(Number(value)));
  });

  var zoomStatus = document.querySelector('.app-statusbar__zoom');
  var canvas     = document.querySelector('.app-canvas');
  var levels     = [50, 75, 90, 100, 110, 125, 150, 175, 200];
  var zi         = levels.indexOf(100);

  function applyZoom(i) {
    zi = Math.max(0, Math.min(levels.length - 1, i));
    var pct = levels[zi];
    canvas.style.zoom      = pct / 100;
    zoomStatus.textContent = pct + '%';
    zoomDropdown.setValue(pct);
    store.set(KEY.zoom, pct);
  }

  var savedZoom = store.get(KEY.zoom);
  if (savedZoom) applyZoom(levels.indexOf(Number(savedZoom)));

  // Cmd/Ctrl +, - and 0 are left to the browser: its zoom scales everything,
  // chrome included, and people who rely on it should always have it

  // ── 3. TEXT SIZE — scales document text only, persists within a visit ────
  // 12 is the 1rem baseline; --doc-scale feeds the type scale inside .doc-page
  function applySize(pt) {
    document.documentElement.style.setProperty('--doc-scale', pt / 12);
    store.set(KEY.size, pt);
  }

  var sizeDropdown = initDropdown(document.querySelector('.app-toolbar__size'), function (value) {
    applySize(Number(value));
  });

  var savedSize = store.get(KEY.size);
  if (savedSize && document.querySelector('.app-toolbar__size [data-value="' + savedSize + '"]')) {
    applySize(Number(savedSize));
    sizeDropdown.setValue(savedSize);
  }

  // ── 4. OUTLINE — the style picker lists the post's headings ──────────────
  var outline  = document.querySelector('.app-toolbar__outline');
  var headings = document.querySelectorAll('.doc-body h2[id], .doc-body h3[id]');
  if (headings.length) {
    var outlineMenu = outline.querySelector('.app-dropdown__menu');
    headings.forEach(function (h) {
      var opt = document.createElement('div');
      opt.className = 'app-dropdown__option' + (h.tagName === 'H3' ? ' app-dropdown__option--sub' : '');
      opt.dataset.value = h.id;
      opt.textContent = h.textContent.trim();
      outlineMenu.appendChild(opt);
    });
    outline.querySelector('.app-dropdown__label').textContent = 'Outline';
    initDropdown(outline, function (id) { location.hash = id; }, true);
  } else {
    outline.classList.add('app-dropdown--empty');
  }

  // ── 5. FORMATTING MARKS — ¶ shows a pilcrow after every paragraph ────────
  var marks = document.querySelector('.app-toolbar__marks');

  function applyMarks(on) {
    document.documentElement.classList.toggle('show-marks', on);
    marks.classList.toggle('app-toolbar__fmt--active', on);
    store.set(KEY.marks, on ? '1' : '');
  }

  marks.addEventListener('click', function () {
    applyMarks(!document.documentElement.classList.contains('show-marks'));
  });
  if (store.get(KEY.marks)) applyMarks(true);

  // ── 6. STATUS BAR — page x of y (page breaks), word count, messages ─────
  var pageStatus = document.querySelector('.app-statusbar__page');
  var breaks     = document.querySelectorAll('.doc-body .page-break');

  var shownPage = 0;
  function updatePage() {
    var line = window.innerHeight / 2;
    var current = 1;
    breaks.forEach(function (b) {
      if (b.getBoundingClientRect().top < line) current++;
    });
    if (current === shownPage) return;
    shownPage = current;
    pageStatus.textContent = 'Page ' + current + ' of ' + (breaks.length + 1);
  }

  // Without page breaks the count can never change, so there is nothing to track
  if (breaks.length) {
    var pageTick = false;
    window.addEventListener('scroll', function () {
      if (pageTick) return;
      pageTick = true;
      requestAnimationFrame(function () { pageTick = false; updatePage(); });
    }, { passive: true });
  }
  updatePage();

  // An image-only snap has no words; show nothing rather than "0 words"
  var post = document.querySelector('.doc-page[data-words]');
  if (post && Number(post.dataset.words)) {
    var words = document.querySelector('.app-statusbar__words');
    words.textContent = Number(post.dataset.words).toLocaleString('en-GB') + ' words · ' +
      post.dataset.readtime + ' min read';
    words.hidden = false;
  }

  var msg = document.querySelector('.app-statusbar__msg');
  var msgTimer;
  function flash(text) {
    msg.textContent = text;
    msg.hidden = false;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(function () { msg.hidden = true; }, 2000);
  }

  // ── 7. MENUS — File, Help and the titlebar's version history ──────────────────────────────────────────
  // Shortcut hints are labels only; the browser keeps ⌘N/⌘P/⌘W.
  if (!/Mac|iPhone|iPad/.test(navigator.platform)) {
    document.querySelectorAll('.app-menu__key').forEach(function (k) {
      k.textContent = k.textContent.replace('⌘', 'Ctrl+');
    });
  }

  function openMenu(menu) {
    closeAll();
    menu.classList.add('app-menu--open');
  }

  var menus = document.querySelectorAll('.app-menu');
  menus.forEach(function (menu) {
    menu.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.target.closest('.app-menu__panel')) return;
      var isOpen = menu.classList.contains('app-menu--open');
      closeAll();
      if (!isOpen) openMenu(menu);
    });
    // Like a real menu bar: once one menu is open, hovering opens its
    // neighbour in the same bar (never the titlebar's, or from it)
    menu.addEventListener('mouseenter', function () {
      var open = document.querySelector('.app-menu--open');
      if (!open || open === menu || open.parentNode !== menu.parentNode) return;
      openMenu(menu);
    });
  });

  var actions = {
    random: function () {
      fetch('/posts.json').then(function (r) { return r.json(); }).then(function (all) {
        var urls = all.filter(function (u) { return u !== location.pathname; });
        if (urls.length) location.href = urls[Math.floor(Math.random() * urls.length)];
      }, function () { flash('Could not load posts'); });
    },
    'copy-link': function () {
      var url = location.href.split('#')[0];
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { flash('Link copied'); },
                                                function () { flash(url); });
      } else {
        flash(url);
      }
    },
    print:        function () { window.print(); },
    close:        function () { window.close(); },
    'zoom-in':    function () { applyZoom(zi + 1); },
    'zoom-out':   function () { applyZoom(zi - 1); },
    'zoom-reset': function () { applyZoom(levels.indexOf(100)); }
  };

  document.querySelectorAll('.app-menu__option').forEach(function (opt) {
    opt.addEventListener('click', function (e) {
      e.stopPropagation();
      closeAll();
      if (opt.dataset.href) location.href = opt.dataset.href;
      else if (actions[opt.dataset.action]) actions[opt.dataset.action](opt);
    });
  });

  // "Earlier versions" in the version footnote opens the version history in
  // the titlebar; its href (the original) is the fallback
  document.querySelectorAll('[data-open-versions]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var versions = document.querySelector('.app-titlebar__versions');
      if (!versions) return;
      e.preventDefault();
      e.stopPropagation();
      openMenu(versions);
    });
  });

  // ── 8. STOPLIGHT — red closes tab; all dots dim on window blur ────────────
  document.querySelector('.stoplight__red').addEventListener('click', actions.close);

  var titlebar = document.querySelector('.app-titlebar');
  var stoplight = document.querySelector('.stoplight');

  function setActive(active) {
    titlebar.classList.toggle('app-titlebar--inactive', !active);
    stoplight.classList.toggle('stoplight--inactive', !active);
  }

  window.addEventListener('blur',  function () { setActive(false); });
  window.addEventListener('focus', function () { setActive(true);  });
  document.addEventListener('visibilitychange', function () {
    setActive(!document.hidden);
  });

})();
