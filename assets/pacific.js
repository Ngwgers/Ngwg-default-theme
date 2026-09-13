// pacific — progressive enhancement only:
//   1. hamburger menu when the nav links do not fit the top bar
//   2. table of contents: collapsible widget in the sticky sidebar (wide),
//      floating button + popup panel (narrow) — CSS switches modes.
//      Highlighting is interval-based (topmost…bottommost visible heading).
//   3. pjax: internal navigation fetches the page and swaps <title>, the
//      dynamic <head> tags (SEO meta) and the .layout block, with a plain
//      opacity fade on the swapped block. Header, footer and scripts stay.
//   4. long-post segment loading: the deployer ships only the first segment
//      of a long article plus a .post-seg-end marker. Remaining segments are
//      prefetched sequentially — the next request fires the moment the
//      previous segment is parsed and inserted, the reader never waits on
//      the network. While segments are outstanding, the TOC shows a three-dot
//      loading indicator.
//   The site works without JavaScript; dark mode is CSS-only.
(function () {
  // shared dynamic-component state: replaced whenever the content swaps
  var state = {
    headings: [],
    tocItems: [],
    segToken: 0, // bumped on every view swap; aborts in-flight segment chains
    sideAutoCollapsed: false,
    lastScrollY: null,
  };

  initNav();
  bindTocDocumentHandlers();
  refreshDynamic();
  initPjax();

  // ---- hamburger -----------------------------------------------------------

  function initNav() {
    var nav = document.querySelector(".site-nav");
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".site-links");
    if (!nav || !toggle || !links) return;

    var raf = 0;

    function update() {
      raf = 0;
      // remove the flag first so measurements see the natural (expanded) widths
      var open = document.body.classList.contains("menu-open");
      document.body.classList.remove("nav-crowded", "menu-open");
      var overflow = nav.scrollWidth > nav.clientWidth + 1;
      if (overflow) {
        document.body.classList.add("nav-crowded");
        if (open) document.body.classList.add("menu-open");
      }
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    nav.update = update;
    window.addEventListener("resize", function () {
      if (!raf) raf = requestAnimationFrame(update);
    });
    update();

    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function () {
      document.body.classList.remove("menu-open");
    });
    currentKey = pageKey(location.href);
    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target)) document.body.classList.remove("menu-open");
    });
  }

  // ---- table of contents -----------------------------------------------------

  // document-level behaviours bound once; the toc element itself is replaced
  // on pjax swaps, so its own buttons re-bind in buildToc()
  function bindTocDocumentHandlers() {
    currentKey = pageKey(location.href);
    document.addEventListener("click", function (e) {
      var openToc = document.querySelector(".toc.open");
      if (openToc && !openToc.contains(e.target) && !e.target.closest(".toc-fab")) {
        setTocOpen(false);
      }
    });
    // scroll spy: one listener, reads the current state (rebuilt after swaps)
    var ticking = false;
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(function () {
            ticking = false;
            spy();
          });
        }
      },
      { passive: true },
    );
  }

  function buildToc() {
    state.headings = [];
    state.tocItems = [];
    var toc = document.getElementById("toc");
    var fab = document.querySelector(".toc-fab");
    if (!toc || !fab) return;

    var body = document.querySelector(".post-body");
    var headings = body
      ? Array.prototype.slice.call(body.querySelectorAll("h2[id], h3[id], h4[id]"))
      : [];
    if (headings.length === 0) return; // no sections: keep the widget hidden
    state.headings = headings;
    toc.hidden = false;
    fab.hidden = false;

    var list = toc.querySelector(".toc-list");
    list.innerHTML = "";
    state.tocItems = headings.map(function (h) {
      var li = document.createElement("li");
      li.className = "toc-item toc-" + h.tagName.toLowerCase();
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      list.appendChild(li);
      return li;
    });

    var toggle = toc.querySelector(".toc-toggle");
    toggle.onclick = function () {
      var collapsed = toc.classList.toggle("collapsed");
      toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    };
    fab.onclick = function (e) {
      e.stopPropagation();
      setTocOpen(!toc.classList.contains("open"));
    };
    toc.addEventListener("click", function (e) {
      // hijack anchor clicks: the browser's fragment navigation would fire
      // popstate (same-document navigation), and the pjax popstate path
      // re-requests the whole page — scroll ourselves instead and keep the
      // URL shareable via replaceState (no history entry)
      var a = e.target && e.target.closest ? e.target.closest("a[href^='#']") : null;
      if (a) {
        e.preventDefault();
        var id = decodeURIComponent(a.getAttribute("href").slice(1));
        var target = document.getElementById(id);
        if (target) {
          animateScrollTo(target.getBoundingClientRect().top + window.scrollY);
          if (history.replaceState) history.replaceState(null, "", "#" + id);
        }
        setTocOpen(false);
      }
      e.stopPropagation();
    });
    spy();
  }

  /** open/close the narrow-screen TOC popup, keeping the fab icon in sync */
  function setTocOpen(open) {
    var toc = document.getElementById("toc");
    var fab = document.querySelector(".toc-fab");
    if (toc) toc.classList.toggle("open", open);
    if (fab) {
      fab.classList.toggle("open", open);
      fab.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  // ---- collapsible sidebar lists ---------------------------------------------
  // the toggle handler is mounted on the component itself (the .side-block
  // element), so a pjax swap simply brings fresh components and this mounts
  // them again — no document-level listeners to clean up

  function initSideBlocks() {
    var blocks = document.querySelectorAll(".sidebar .side-block.collapsible");
    Array.prototype.forEach.call(blocks, function (block) {
      var toggle = block.querySelector(".side-toggle");
      if (!toggle) return;
      toggle.onclick = function () {
        var collapsed = block.classList.toggle("collapsed");
        toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      };
    });
  }

  /** reading view: collapse both sidebar lists on the FIRST downward scroll */
  function autoCollapseSideBlocks() {
    if (state.sideAutoCollapsed) return;
    if (!document.querySelector(".post-page")) return; // not reading an article
    var y = window.scrollY;
    if (state.lastScrollY === null) {
      state.lastScrollY = y;
      return;
    }
    if (y > state.lastScrollY + 4 && y > 24) {
      state.sideAutoCollapsed = true;
      var blocks = document.querySelectorAll(".sidebar .side-block.collapsible");
      Array.prototype.forEach.call(blocks, function (block) {
        block.classList.add("collapsed");
        var t = block.querySelector(".side-toggle");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }
    state.lastScrollY = y;
  }

  function spy() {
    autoCollapseSideBlocks();
    var headings = state.headings;
    var items = state.tocItems;
    if (headings.length === 0) return;
    var vh = window.innerHeight;
    var visible = [];
    for (var i = 0; i < headings.length; i++) {
      var r = headings[i].getBoundingClientRect();
      // heading on screen (a little margin at the top and bottom edges)
      if (r.top < vh - 60 && r.bottom > 80) visible.push(i);
    }
    var from, to;
    if (visible.length > 0) {
      from = visible[0];
      to = visible[visible.length - 1];
    } else {
      // nothing on screen: fall back to the nearest heading above the fold
      var last = -1;
      for (var j = 0; j < headings.length; j++) {
        if (headings[j].getBoundingClientRect().top < 80) last = j;
      }
      if (last < 0) return;
      from = to = last;
    }
    for (var k = 0; k < items.length; k++) {
      items[k].classList.toggle("active", k >= from && k <= to);
    }
  }

  // ---- long-post segment loading ---------------------------------------------
  //
  // Remaining segments are prefetched in a sequential chain: as soon as one
  // segment arrives and is parsed into the page, the next request fires —
  // regardless of where the reader is. The chain is aborted by a view swap
  // (pjax) via the segToken; a failed fetch keeps the TOC dots spinning
  // (content remains) and a full reload recovers.

  function setTocLoading(loading) {
    var dots = document.querySelector(".toc-loading");
    if (dots) dots.hidden = !loading;
  }

  function initSegLoader() {
    var marker = document.querySelector(".post-seg-end[data-next]");
    setTocLoading(!!marker);
    if (!marker) return;
    loadNext(marker, state.segToken);
  }

  function loadNext(marker, token) {
    var url = marker.getAttribute("data-next");
    if (!url) {
      setTocLoading(false);
      return;
    }
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then(function (frag) {
        if (token !== state.segToken || !marker.isConnected) return; // view swapped meanwhile
        var tmp = document.createElement("div");
        tmp.innerHTML = frag;
        var newMarker = tmp.querySelector(".post-seg-end");
        if (newMarker) newMarker.remove();
        marker.insertAdjacentHTML("beforebegin", tmp.innerHTML);
        if (newMarker) marker.replaceWith(newMarker);
        else marker.remove();
        buildToc(); // the TOC grows with the arriving sections
        spy();
        if (newMarker) loadNext(newMarker, token); // next fetch starts right away
        else setTocLoading(false); // article complete
      })
      .catch(function () {
        /* network trouble: keep what we have; a reload fetches the full page */
      });
  }

  // ---- re-init everything that lives inside the swapped block -----------------

  function refreshDynamic() {
    state.segToken++; // abort any in-flight segment chain from the old view
    state.sideAutoCollapsed = false;
    state.lastScrollY = null;
    buildToc();
    initSideBlocks();
    initSegLoader();
    spy();
  }

  // ---- pjax -------------------------------------------------------------------

  var PJAX_FADE_MS = 180;
  var navToken = 0;
  var scrollMemo = {};
  var currentKey = null; // pathname+search of the currently shown page

  function pageKey(url) {
    return new URL(url, location.href).pathname + new URL(url, location.href).search;
  }

  function initPjax() {
    if (!window.fetch || !window.history || !window.DOMParser) return;
    if (window.history.scrollRestoration) history.scrollRestoration = "manual";

    currentKey = pageKey(location.href);
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest("a") : null;
      if (!a || a.target || a.hasAttribute("download") || a.hasAttribute("data-no-pjax")) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && (url.hash || a.getAttribute("href").startsWith("#"))) return;
      e.preventDefault();
      scrollMemo[pageKey(location.href)] = window.scrollY;
      navigate(url.href, true, 0);
    });

    window.addEventListener("popstate", function () {
      var key = pageKey(location.href);
      if (key === currentKey) {
        // hash-only traversal (e.g. a legacy fragment entry): scroll, never
        // re-request the document
        scrollToHash();
        return;
      }
      currentKey = key;
      navigate(location.href, false, scrollMemo[key] || 0);
    });
  }

  function swapHead(doc) {
    if (doc.title !== undefined) document.title = doc.title;
    // dynamic head tags regenerated per page (SEO meta, feed links)
    var SELECTOR =
      'meta[name="description"], meta[property^="og:"], meta[name^="twitter:"], ' +
      'meta[property="article:published_time"], link[rel="canonical"], link[rel="alternate"]';
    document.head.querySelectorAll(SELECTOR).forEach(function (el) {
      el.remove();
    });
    doc.head.querySelectorAll(SELECTOR).forEach(function (el) {
      document.head.appendChild(document.importNode(el, true));
    });
  }

  /** jump to the fragment in the current URL, if any */
  function scrollToHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (target) animateScrollTo(target.getBoundingClientRect().top + window.scrollY);
  }

  // 0.25s eased scroll — the same motion the collapse/expand animation uses
  var SCROLL_MS = 250;
  var scrollToken = 0;
  function animateScrollTo(targetY) {
    var token = ++scrollToken;
    var startY = window.scrollY;
    var delta = targetY - startY;
    if (Math.abs(delta) < 1) return;
    var start = null;
    function step(ts) {
      if (token !== scrollToken) return; // a newer scroll took over
      if (start === null) start = ts;
      var t = Math.min((ts - start) / SCROLL_MS, 1);
      var eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
      window.scrollTo(0, startY + delta * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /** 2x three-dot loader over the content area while a page is fetched */
  function showPageLoading() {
    if (document.querySelector(".page-loading")) return;
    var el = document.createElement("div");
    el.className = "page-loading";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "<span></span><span></span><span></span>";
    document.body.appendChild(el);
  }

  function hidePageLoading() {
    var el = document.querySelector(".page-loading");
    if (el) el.remove();
  }

  function navigate(url, push, restoreScroll) {
    var token = ++navToken;
    currentKey = pageKey(url);
    showPageLoading();
    var layout = document.querySelector(".layout");
    if (layout) layout.classList.add("pjax-fade"); // fade out

    var faded = new Promise(function (resolve) {
      setTimeout(resolve, PJAX_FADE_MS);
    });
    var fetching = fetch(url, { headers: { "X-Pjax": "1" } }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    });

    Promise.all([fetching, faded])
      .then(function (results) {
        if (token !== navToken) return; // a newer navigation won (it owns the loader)
        hidePageLoading(); // the swap itself replaces the loading position
        var doc = new DOMParser().parseFromString(results[0], "text/html");
        var next = doc.querySelector(".layout");
        var current = document.querySelector(".layout");
        swapHead(doc);
        if (current && next) current.replaceWith(document.importNode(next, true));
        if (push) history.pushState({ pjax: true }, "", url);
        window.scrollTo(0, restoreScroll || 0);
        refreshDynamic();
        // fade back in
        var swapped = document.querySelector(".layout");
        if (swapped) {
          requestAnimationFrame(function () {
            swapped.classList.remove("pjax-fade");
          });
        }
      })
      .catch(function () {
        if (token !== navToken) return;
        hidePageLoading();
        location.href = url; // pjax failed — fall back to a full load
      });
  }
})();
