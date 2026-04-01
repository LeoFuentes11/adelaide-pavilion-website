/**
 * cms-loader.js — Adelaide Pavilion
 *
 * Fetches CMS-managed JSON content and populates elements
 * marked with data-cms / data-cms-href / data-cms-html attributes.
 *
 * Elements keep their static HTML text as fallback — if the fetch
 * fails or is slow, visitors see the baked-in content with no flash.
 *
 * Attribute API:
 *   data-cms="key"       → sets element.textContent
 *   data-cms-html="key"  → sets element.innerHTML (for address <br> etc.)
 *   data-cms-href="key"  → sets element.href
 */

(function () {
  'use strict';

  // Map body[data-page] values to their JSON data files
  const PAGE_MAP = {
    home:      '_data/homepage.json',
    about:     '_data/about.json',
    weddings:  '_data/weddings.json',
    corporate: '_data/corporate.json',
    social:    '_data/social.json',
    packages:  '_data/packages.json',
    // gallery and contact have no page-scoped JSON
  };

  async function fetchJSON(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null; // silently fail — static content remains visible
    }
  }

  function applyData(data) {
    if (!data || typeof data !== 'object') return;

    // Text content
    document.querySelectorAll('[data-cms]').forEach(el => {
      const key = el.dataset.cms;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        el.textContent = String(data[key]);
      }
    });

    // innerHTML (allows <br> in addresses etc.)
    document.querySelectorAll('[data-cms-html]').forEach(el => {
      const key = el.dataset.cmsHtml;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        el.innerHTML = String(data[key]);
      }
    });

    // href attributes (phone links, email links, social URLs)
    document.querySelectorAll('[data-cms-href]').forEach(el => {
      const key = el.dataset.cmsHref;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        el.setAttribute('href', String(data[key]));
      }
    });
  }

  async function init() {
    // Always load contact info — used in every footer
    const contact = await fetchJSON('_data/contact.json');
    if (contact) applyData(contact);

    // Load page-specific content
    const pageKey = document.body.dataset.page;
    if (pageKey && PAGE_MAP[pageKey]) {
      const pageData = await fetchJSON(PAGE_MAP[pageKey]);
      if (pageData) applyData(pageData);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
