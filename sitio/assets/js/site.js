(() => {
  const body = document.body;
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
  updateHeader();
  addEventListener('scroll', updateHeader, { passive: true });

  toggle?.addEventListener('click', () => {
    const open = body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav?.addEventListener('click', event => {
    if (event.target.closest('a')) {
      body.classList.remove('nav-open');
      toggle?.setAttribute('aria-expanded', 'false');
    }
  });

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    reveals.forEach(el => observer.observe(el));
  }

  document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
      const answer = document.getElementById(button.getAttribute('aria-controls'));
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      if (answer) answer.hidden = expanded;
    });
  });

  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const group = button.closest('[data-filter-group]');
      const value = button.dataset.filter;
      group?.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('is-active', item === button));
      document.querySelectorAll('[data-filter-item]').forEach(item => {
        item.classList.toggle('is-hidden', value !== 'all' && item.dataset.filterItem !== value);
      });
    });
  });

  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach(link => {
    if (link.getAttribute('href') === page) link.setAttribute('aria-current', 'page');
  });
})();
