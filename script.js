/* =========================================================
   Agenda Cheia Personal — LP script
   - Tracking n8n + Meta Pixel
   - FAQ accordion
   - Smooth scroll for non-checkout CTAs
   ========================================================= */

(function () {
  'use strict';

  /* ------------ Config ------------ */
  var WEBHOOK = 'https://projetopessoal-n8n.h574he.easypanel.host/webhook/track';
  var PREMIUM_LINK = 'https://pay.wiapy.com/gF6TO9FSbp';
  var START_LINK = 'https://pay.wiapy.com/AjGEA-ls-l';
  var PREMIUM_NAME = 'Agenda Cheia Personal — Premium';
  var START_NAME = 'Agenda Cheia Personal — Start';
  var PREMIUM_VALUE = 27;
  var START_VALUE = 10;
  var PAGE_VIEW_KEY = 'agenda_cheia_page_view_sent';

  /* ------------ Helpers ------------ */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : '';
  }
  function getParam(n) {
    try { return new URLSearchParams(window.location.search).get(n) || ''; }
    catch (e) { return ''; }
  }

  // click_id persistente
  var clickId = '';
  try {
    clickId = localStorage.getItem('click_id') || '';
    if (!clickId) { clickId = uuid(); localStorage.setItem('click_id', clickId); }
  } catch (e) { clickId = uuid(); }

  function ctx() {
    return {
      click_id: clickId,
      utm_source: getParam('utm_source'),
      utm_medium: getParam('utm_medium'),
      utm_campaign: getParam('utm_campaign'),
      utm_content: getParam('utm_content'),
      utm_term: getParam('utm_term'),
      fbclid: getParam('fbclid'),
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc'),
      page_url: window.location.href,
      user_agent: navigator.userAgent
    };
  }

  function send(payload) {
    try {
      return fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }

  function buildCheckoutUrl(baseUrl, offerName, offerValue) {
    var c = ctx();
    var url;
    try { url = new URL(baseUrl); } catch (e) { return baseUrl; }
    var params = url.searchParams;
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term'].forEach(function (k) {
      if (c[k]) params.set(k, c[k]);
    });
    var existing = c.utm_content || '';
    var merged = existing ? (existing + '||cid:' + clickId) : ('cid:' + clickId);
    params.set('utm_content', merged);
    if (c.click_id) params.set('click_id', c.click_id);
    if (c.fbp) params.set('fbp', c.fbp);
    if (c.fbc) params.set('fbc', c.fbc);
    if (c.fbclid) params.set('fbclid', c.fbclid);
    if (offerName) params.set('offer_name', offerName);
    if (offerValue) params.set('offer_value', String(offerValue));
    return url.toString();
  }

  /* ------------ page_view (1x por sessão) ------------ */
  function sendPageView() {
    try {
      if (sessionStorage.getItem(PAGE_VIEW_KEY)) {
        console.log('page_view skipped (already sent in session)');
        return;
      }
      sessionStorage.setItem(PAGE_VIEW_KEY, '1');
    } catch (e) { /* noop */ }
    console.log('tracking loaded');
    var payload = Object.assign({ event: 'page_view', event_id: uuid() }, ctx());
    send(payload);
    console.log('page_view sent');
  }

  /* ------------ Checkout handler ------------ */
  function handleCheckout(checkoutUrl, offerName, offerValue) {
    console.log('checkout clicked', offerName, offerValue);
    var finalUrl = buildCheckoutUrl(checkoutUrl, offerName, offerValue);

    try {
      if (window.fbq) window.fbq('track', 'InitiateCheckout', {
        value: offerValue, currency: 'BRL', content_name: offerName
      });
    } catch (e) { /* noop */ }

    var payload = Object.assign({
      event: 'initiate_checkout',
      event_id: uuid(),
      offer_name: offerName,
      offer_value: offerValue,
      checkout_url: finalUrl
    }, ctx());

    send(payload);
    console.log('redirecting to', finalUrl);
    setTimeout(function () { window.location.href = finalUrl; }, 250);
  }

  /* ------------ Wire up CTAs ------------ */
  function scrollToPlanos() {
    var el = document.getElementById('planos');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindCTAs() {
    var ctas = document.querySelectorAll('[data-cta]');
    ctas.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var type = btn.getAttribute('data-cta'); // "premium-checkout" | "start-checkout" | "scroll"
        if (type === 'premium-checkout') {
          handleCheckout(PREMIUM_LINK, PREMIUM_NAME, PREMIUM_VALUE);
        } else if (type === 'start-checkout') {
          handleCheckout(START_LINK, START_NAME, START_VALUE);
        } else {
          scrollToPlanos();
        }
      });
    });
  }

  /* ------------ FAQ accordion ------------ */
  function bindFAQ() {
    var items = document.querySelectorAll('.faq-item');
    items.forEach(function (item, idx) {
      var q = item.querySelector('.faq-q');
      if (!q) return;
      if (idx === 0) item.classList.add('open');
      q.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        items.forEach(function (i) { i.classList.remove('open'); });
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  /* ------------ VSL ------------ */
  function bindVSL() {
    var video = document.getElementById('vslVideo');
    var overlay = document.getElementById('vslOverlay');
    var toggle = document.getElementById('vslToggle');
    var loader = document.getElementById('vslLoader');
    if (!video || !overlay || !toggle) return;

    function showLoader(){ if (loader) loader.classList.add('show'); toggle.classList.remove('show'); }
    function hideLoader(){ if (loader) loader.classList.remove('show'); }

    overlay.addEventListener('click', function () {
      overlay.style.display = 'none';
      toggle.hidden = false;
      showLoader();
      var p = video.play();
      if (p && p.catch) p.catch(function(){});
      try { if (window.fbq) window.fbq('track', 'ViewContent', { content_name: 'VSL' }); } catch(e){}
    });

    function toggleVideo() {
      if (video.paused) { video.play(); } else { video.pause(); }
    }
    toggle.addEventListener('click', toggleVideo);
    video.addEventListener('click', function(){
      if (overlay.style.display === 'none' && !(loader && loader.classList.contains('show'))) toggleVideo();
    });

    video.addEventListener('waiting', showLoader);
    video.addEventListener('canplay', hideLoader);
    video.addEventListener('playing', function(){
      hideLoader();
      toggle.classList.remove('paused');
      toggle.classList.remove('show');
    });
    video.addEventListener('play',  function(){
      toggle.classList.remove('paused');
      toggle.classList.remove('show');
    });
    video.addEventListener('pause', function(){
      toggle.classList.add('paused');
      toggle.classList.add('show');
    });
    video.addEventListener('ended', function(){
      overlay.style.display = '';
      toggle.hidden = true;
      toggle.classList.remove('show');
      hideLoader();
      video.currentTime = 0;
    });

    // bloqueia menu de contexto
    video.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  }

  /* ------------ Init ------------ */
  function init() {
    sendPageView();
    bindCTAs();
    bindFAQ();
    bindVSL();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
