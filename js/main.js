/* =============================================
   Adelaide Pavilion — main.js
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Sticky Navbar ---------- */
  const navbar = document.getElementById('navbar');
  const handleScroll = () => {
    if (window.scrollY > 60) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  /* ---------- Mobile Nav ---------- */
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');
  navToggle?.addEventListener('click', () => {
    navMobile?.classList.toggle('open');
  });
  // Close mobile nav on link click
  navMobile?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navMobile.classList.remove('open'));
  });

  /* ---------- Scroll Animations ---------- */
  const animEls = document.querySelectorAll('.fade-up, .fade-in');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        // Stagger children if data-stagger
        const delay = e.target.dataset.delay || 0;
        setTimeout(() => e.target.classList.add('visible'), delay);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  animEls.forEach(el => observer.observe(el));

  /* ---------- Lightbox ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  let galleryItems = [];
  let currentIndex = 0;

  const openLightbox = (index) => {
    currentIndex = index;
    const item = galleryItems[index];
    if (!item || !lightbox || !lightboxImg) return;
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || '';
    if (lightboxCaption) lightboxCaption.textContent = item.caption || item.alt || '';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox?.classList.remove('active');
    document.body.style.overflow = '';
  };

  const showPrev = () => openLightbox((currentIndex - 1 + galleryItems.length) % galleryItems.length);
  const showNext = () => openLightbox((currentIndex + 1) % galleryItems.length);

  // Build gallery items array
  document.querySelectorAll('[data-lightbox]').forEach((el, idx) => {
    const img = el.querySelector('img');
    galleryItems.push({
      src: img ? img.src : el.dataset.src || '',
      alt: img ? img.alt : '',
      caption: el.dataset.caption || (img ? img.alt : '')
    });
    el.addEventListener('click', () => openLightbox(idx));
  });

  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxPrev?.addEventListener('click', showPrev);
  lightboxNext?.addEventListener('click', showNext);
  lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox?.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  });

  /* ---------- Tab System ---------- */
  document.querySelectorAll('.tab-buttons').forEach(tabGroup => {
    const buttons = tabGroup.querySelectorAll('.tab-btn');
    const tabContainer = tabGroup.closest('[data-tabs]') || tabGroup.parentElement;
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabContainer.querySelectorAll('.tab-content').forEach(c => {
          c.classList.toggle('active', c.dataset.tabContent === target);
        });
      });
    });
  });

  /* ---------- Accordion ---------- */
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const body = item.querySelector('.accordion-body');
      const isOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('open');
        const b = i.querySelector('.accordion-body');
        if (b) b.style.maxHeight = '0';
      });
      // Toggle current
      if (!isOpen) {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Enquiry Form ---------- */
  const enquiryForm = document.getElementById('enquiryForm');
  const formSuccess = document.getElementById('formSuccess');
  enquiryForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    // Validation
    const required = enquiryForm.querySelectorAll('[required]');
    let valid = true;
    required.forEach(field => {
      if (!field.value.trim()) {
        field.style.borderColor = '#e57373';
        valid = false;
      } else {
        field.style.borderColor = '';
      }
    });
    if (!valid) return;
    // Submit to Netlify Forms via fetch
    const data = new FormData(enquiryForm);
    fetch('/', { method: 'POST', body: data })
      .then(() => {
        enquiryForm.style.display = 'none';
        formSuccess?.classList.add('visible');
        window.scrollTo({ top: formSuccess.offsetTop - 100, behavior: 'smooth' });
      })
      .catch(() => {
        alert('Something went wrong. Please call us on 08 8212 7444 or try again.');
      });
  });

  /* ---------- Smooth Scroll for anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---------- Active nav link ---------- */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .nav-mobile a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && (href === currentPage || (currentPage === '' && href === 'index.html'))) {
      a.classList.add('active');
    }
  });

  /* ---------- Year in footer ---------- */
  document.querySelectorAll('.js-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

});
