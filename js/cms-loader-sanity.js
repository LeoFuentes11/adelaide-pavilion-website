/**
 * cms-loader-sanity.js — Adelaide Pavilion (Sanity Edition)
 *
 * Fetches CMS-managed content from Sanity CMS and populates elements
 * marked with data-cms / data-cms-html / data-cms-href attributes.
 *
 * Uses @sanity/client via CDN for static site compatibility.
 */

(function () {
  'use strict';

  const PROJECT_ID = 'bt9gto0j';
  const DATASET = 'production';
  const API_VERSION = '2024-01-01';

  const PAGE_MAP = {
    home: 'homepage',
    about: 'about',
    weddings: 'weddings',
    corporate: 'corporate',
    social: 'social',
    packages: 'packages',
  };

  let sanityClient = null;

  async function initSanity() {
    if (sanityClient) return sanityClient;
    if (typeof window.SanityClient === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@sanity/client@6/+esm';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    sanityClient = window.SanityClient.createClient({
      projectId: PROJECT_ID,
      dataset: DATASET,
      apiVersion: API_VERSION,
      useCdn: true,
    });
    return sanityClient;
  }

  async function fetchDocument(docType) {
    try {
      const client = await initSanity();
      const query = `*[_type == "${docType}"][0]`;
      return await client.fetch(query);
    } catch (e) {
      console.warn('Sanity fetch failed:', e.message);
      return null;
    }
  }

  function renderTestimonials(data) {
    const container = document.querySelector('[data-testimonials]');
    if (!container || container.dataset.loaded) return;
    const items = data?.testimonials;
    if (!Array.isArray(items) || items.length === 0) return;
    container.innerHTML = '';
    items.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'testimonial fade-up visible';
      div.setAttribute('data-delay', String(i * 120));

      const stars = document.createElement('div');
      stars.className = 'testimonial-stars';
      stars.textContent = '★★★★★';

      const quote = document.createElement('p');
      quote.className = 'testimonial-text';
      quote.textContent = '\u201c' + (item.quote || '') + '\u201d';

      const author = document.createElement('div');
      author.className = 'testimonial-author';
      author.textContent = '\u2014 ' + (item.author || '') + (item.event ? ', ' + item.event : '');

      div.appendChild(stars);
      div.appendChild(quote);
      div.appendChild(author);
      container.appendChild(div);
    });
    container.dataset.loaded = 'true';
  }

  function renderBeverages(data) {
    document.querySelectorAll('[data-bev]').forEach(container => {
      if (container.dataset.loaded) return;
      const key = container.dataset.bev;
      const items = data?.[key];
      if (!Array.isArray(items)) return;
      container.innerHTML = '';
      items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        container.appendChild(li);
      });
      container.dataset.loaded = 'true';
    });
  }

  function renderMenus(data) {
    if (!data || typeof data !== 'object') return;
    document.querySelectorAll('[data-menu]').forEach(container => {
      if (container.dataset.loaded) return;
      const key = container.dataset.menu;
      const items = data[key];
      if (!Array.isArray(items)) return;
      container.innerHTML = '';
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'menu-item';

        const nameEl = document.createElement('div');
        nameEl.className = 'menu-item-name';
        nameEl.textContent = item.name || '';

        const descEl = document.createElement('div');
        descEl.className = 'menu-item-desc';
        descEl.textContent = item.desc || '';

        if (item.surcharge) {
          const s = document.createElement('span');
          s.className = 'menu-item-surcharge';
          s.textContent = ' ' + item.surcharge;
          descEl.appendChild(s);
        }

        div.appendChild(nameEl);
        div.appendChild(descEl);
        container.appendChild(div);
      });
      container.dataset.loaded = 'true';
    });
  }

  function applyData(data) {
    if (!data || typeof data !== 'object') return;

    document.querySelectorAll('[data-cms]').forEach(el => {
      const key = el.dataset.cms;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        el.textContent = String(data[key]);
      }
    });

    document.querySelectorAll('[data-cms-html]').forEach(el => {
      const key = el.dataset.cmsHtml;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        el.innerHTML = String(data[key]);
      }
    });

    document.querySelectorAll('[data-cms-href]').forEach(el => {
      const key = el.dataset.cmsHref;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        el.setAttribute('href', String(data[key]));
      }
    });
  }

  async function init() {
    const contact = await fetchDocument('contact');
    if (contact) applyData(contact);

    const pageKey = document.body.dataset.page;
    if (pageKey && PAGE_MAP[pageKey]) {
      const pageData = await fetchDocument(PAGE_MAP[pageKey]);
      if (pageData) {
        applyData(pageData);
        renderTestimonials(pageData);
        renderBeverages(pageData);
      }
    }

    if (document.querySelector('[data-menu]')) {
      const menus = await fetchDocument('menus');
      if (menus) renderMenus(menus);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
