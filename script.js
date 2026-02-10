document.addEventListener('DOMContentLoaded', function(){
  // Atualiza ano no footer
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Fechar menu do Bootstrap ao clicar em link (em mobile)
  const bsCollapseEl = document.querySelector('.navbar-collapse');
  if(bsCollapseEl){
    bsCollapseEl.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        try{
          const inst = bootstrap.Collapse.getInstance(bsCollapseEl) || new bootstrap.Collapse(bsCollapseEl);
          inst.hide();
        }catch(e){
          bsCollapseEl.classList.remove('show');
        }
      });
    });
  }

  // Normalize mainNav and navToggle selectors for resize logic (guard against missing elements)
  const mainNav = document.querySelector('.main-nav') || bsCollapseEl || document.querySelector('.navbar-collapse');
  const navToggle = document.querySelector('.nav-toggle') || document.querySelector('.navbar-toggler');

  // Reveal on scroll (simple, elegant)
  const reveals = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && reveals.length){
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    reveals.forEach(r => obs.observe(r));
  } else {
    reveals.forEach(r => r.classList.add('visible'));
  }

  // Initialize hero carousel with interval and pause on hover
  const heroEl = document.getElementById('heroCarousel');
  let heroCarouselInstance = null;
  if(heroEl && typeof bootstrap !== 'undefined'){
    // troca a cada 7 segundos para leitura confortável
    heroCarouselInstance = new bootstrap.Carousel(heroEl, {interval: 7000, ride: 'carousel', pause: 'hover', touch:true});

    // Setup custom dot indicators for better UX (replace numeric indicator)
    const indicatorsContainer = heroEl.querySelector('.custom-indicators');
    const slides = heroEl.querySelectorAll('.carousel-item');
    // Preload hero images immediately when slide count is small to avoid blank frames during transition
    try{
      const heroImgsAll = heroEl.querySelectorAll('img.hero-img[data-src]');
      if(heroImgsAll.length && slides.length <= 6){
        heroImgsAll.forEach(img => {
          if(img.dataset.src){ img.src = img.dataset.src; img.dataset.loaded = 'true'; }
        });
      }
    }catch(e){/* noop */}
    if(indicatorsContainer && slides.length){
      // create dots (buttons for accessibility)
      slides.forEach((s, idx) => {
        const dot = document.createElement('button');
        dot.className = 'dot';
        dot.type = 'button';
        dot.setAttribute('aria-label', `Ir para slide ${idx + 1}`);
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-controls', 'heroCarousel');
        dot.tabIndex = 0;
        if(idx === 0){ dot.classList.add('active'); dot.setAttribute('aria-current','true'); }
        dot.addEventListener('click', () => {
          heroCarouselInstance.to(idx);
        });
        // keyboard support: left/right navigation when dot is focused
        dot.addEventListener('keydown', (ev) => {
          if(ev.key === 'ArrowLeft'){
            ev.preventDefault();
            heroCarouselInstance.prev();
          } else if(ev.key === 'ArrowRight'){
            ev.preventDefault();
            heroCarouselInstance.next();
          }
        });
        indicatorsContainer.appendChild(dot);
      });

      // update active dot on slide change; also manage aria-current
      heroEl.addEventListener('slid.bs.carousel', (e) => {
        const activeIndex = Array.from(slides).indexOf(e.relatedTarget);
        const dots = indicatorsContainer.querySelectorAll('.dot');
        dots.forEach((d, i) => {
          d.classList.toggle('active', i === activeIndex);
          if(i === activeIndex){ d.setAttribute('aria-current','true'); } else { d.removeAttribute('aria-current'); }
        });
      });

      // allow arrow navigation when indicators container has focus
      indicatorsContainer.addEventListener('keydown', (ev) => {
        if(ev.key === 'ArrowLeft') heroCarouselInstance.prev();
        if(ev.key === 'ArrowRight') heroCarouselInstance.next();
      });

      // Mostrar controles no hover (desktop) e no toque/pointer (mobile)
      (function manageCarouselControls(carouselEl){
        if(!carouselEl) return;
        let controlsHideTimeout = null;
        const showControls = () => {
          carouselEl.classList.add('controls-visible');
          if(controlsHideTimeout) clearTimeout(controlsHideTimeout);
          controlsHideTimeout = setTimeout(() => carouselEl.classList.remove('controls-visible'), 2200);
        };
        const hideControls = () => {
          if(controlsHideTimeout) clearTimeout(controlsHideTimeout);
          carouselEl.classList.remove('controls-visible');
        };
        carouselEl.addEventListener('pointerenter', showControls);
        carouselEl.addEventListener('pointermove', showControls);
        carouselEl.addEventListener('pointerleave', hideControls);
        carouselEl.addEventListener('touchstart', showControls, {passive:true});
        carouselEl.addEventListener('focusin', showControls);
      })(heroEl);
    }
  }

  // Fallback: garantir que os botões prev/next acionem o carousel (caso data-bs não esteja respondendo)
  try{
    const prevBtn = document.querySelector('#heroCarousel .carousel-control-prev');
    const nextBtn = document.querySelector('#heroCarousel .carousel-control-next');
    if(prevBtn){
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if(heroCarouselInstance && typeof heroCarouselInstance.prev === 'function'){
          heroCarouselInstance.prev();
        } else {
          // fallback: dispatch bootstrap event
          const ev = new Event('slide.bs.carousel');
          heroEl.dispatchEvent(ev);
        }
      });
    }
    if(nextBtn){
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if(heroCarouselInstance && typeof heroCarouselInstance.next === 'function'){
          heroCarouselInstance.next();
        } else {
          const ev = new Event('slide.bs.carousel');
          heroEl.dispatchEvent(ev);
        }
      });
    }
  }catch(e){console.debug('carousel control fallback error', e)}

  // Gentle CTA attention pulse on initial load (one-shot)
  try{
    const activeCTA = document.querySelector('.carousel-item.active .btn-cta');
    if(activeCTA){
      activeCTA.classList.add('pulse');
      setTimeout(()=> activeCTA.classList.remove('pulse'), 1600);
    }
  }catch(e){/* noop */}

  // Lazy-load and resize hero <img> elements (client-side) so the full image is visible
  const heroImgs = document.querySelectorAll('img.hero-img[data-src]');
  if('IntersectionObserver' in window && heroImgs.length){
    const loadImg = async (img) => {
      if(img.dataset.loaded === 'true') return;
      const src = img.dataset.src;
      try{
        const resp = await fetch(src);
        if(!resp.ok) throw new Error('fetch failed');
        const blob = await resp.blob();
        const imgBitmap = await createImageBitmap(blob);
        const maxW = Math.min( Math.max(window.innerWidth, 1200), 2000 );
        const scale = imgBitmap.width > maxW ? (maxW / imgBitmap.width) : 1;
        const w = Math.max(1, Math.round(imgBitmap.width * scale));
        const h = Math.max(1, Math.round(imgBitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgBitmap, 0, 0, w, h);
        const resizedBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
        if(resizedBlob){
          const url = URL.createObjectURL(resizedBlob);
          img.src = url;
          img.dataset.loaded = 'true';
          img.dataset.bloburl = url;
        } else {
          img.src = src;
          img.dataset.loaded = 'true';
        }
      }catch(e){
        img.src = src;
        img.dataset.loaded = 'true';
      }
    };

    const imgObs = new IntersectionObserver((entries)=>{
      entries.forEach(entry => {
        if(entry.isIntersecting){
          loadImg(entry.target);
          imgObs.unobserve(entry.target);
        }
      });
    },{rootMargin:'300px 0px'});
    heroImgs.forEach(i => imgObs.observe(i));
  } else {
    // fallback: set src directly
    heroImgs.forEach(i => { i.src = i.dataset.src; i.dataset.loaded = 'true'; });
  }

  // Smooth scroll com offset para header fixo
  const header = document.querySelector('.site-header');
  const headerHeight = () => header ? header.offsetHeight + 8 : 72;

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e){
      const href = this.getAttribute('href');
      if(!href || href === '#') return;
      if(href.startsWith('#')){
        e.preventDefault();
        const target = document.querySelector(href);
        if(target){
          const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight();
          window.scrollTo({top,behavior:'smooth'});
        }
      }
    });
  });

  // Fechar menu ao redimensionar para desktop
  window.addEventListener('resize', () => {
    try{
      if(window.innerWidth > 700 && mainNav && mainNav.classList.contains('show')){
        mainNav.classList.remove('show');
        if(navToggle && typeof navToggle.setAttribute === 'function') navToggle.setAttribute('aria-expanded','false');
      }
    }catch(e){/* ignore resize errors */}
  });

  // Staggered entrance for persona cards in "Para quem é" section
  try{
    const personaCards = document.querySelectorAll('.para-quem .persona-card');
    if(personaCards && personaCards.length){
      personaCards.forEach((card, idx) => {
        // stagger by 100ms
        const delayMs = idx * 100;
        card.style.animationDelay = `${delayMs}ms`;
        // ensure animation triggers after paint
        requestAnimationFrame(() => card.classList.add('enter'));
        // after entrance finishes, add idle class to run continuous subtle motion
        const enterDuration = 520; // matches CSS persona-enter duration
        setTimeout(() => card.classList.add('idle'), delayMs + enterDuration + 80);
      });
    }
  }catch(e){/* noop */}
});
