// Homepage behaviour: Lenis smooth scroll, Lucide icons, random hero video,
// scroll-reveal.

// ── Random hero background (Assets/bg/bg-1..6.webm) ─────────
const heroVideo = document.getElementById('heroVideo')
if (heroVideo) {
  const pick = 1 + Math.floor(Math.random() * 6)
  heroVideo.src = `Assets/bg/bg-${pick}.webm`
  heroVideo.play().catch(() => {
    // Autoplay denied (strict embeds): start on the first interaction instead
    const kick = () => { heroVideo.play().catch(() => {}) }
    window.addEventListener('pointerdown', kick, { once: true })
    window.addEventListener('scroll', kick, { once: true })
  })
}

// ── Lucide icons ─────────────────────────────────────────────
if (window.lucide) lucide.createIcons()

// ── Lenis smooth scroll ──────────────────────────────────────
let lenis = null
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (window.Lenis && !reduceMotion) {
  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })
  const raf = (time) => {
    lenis.raf(time)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)

  // route same-page anchors through Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'))
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target, { offset: -72 })
    })
  })
}

// ── Scroll-reveal ────────────────────────────────────────────
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in')
        io.unobserve(e.target)
      }
    }
  },
  { threshold: 0.12 }
)
document.querySelectorAll('.reveal').forEach((el) => io.observe(el))

// ── Scrub Reveal ────────────────────────────────────────────
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
  const scrubSpans = document.querySelectorAll('#scrubText span');
  if (scrubSpans.length > 0) {
    gsap.to(scrubSpans, {
      scrollTrigger: {
        trigger: '.scrub-section',
        start: 'top 75%',
        end: 'bottom 65%',
        scrub: 0.5,
      },
      opacity: 1,
      stagger: 0.1,
    });
  }
}

/* ── Footer glow ──────────────────────────────────────────────
   Bell of blurred columns pinned to the viewport bottom. Its scaleY goes
   from a thin strip to full height over the last glow-height of scroll. */
;(() => {
  const footer = document.querySelector('.site-footer')
  const glow = footer && footer.querySelector('.sf-glow')
  const bars = glow && glow.querySelector('#sfBars')
  const cars = footer && footer.querySelector('.sf-cars')
  if (!glow || !bars) return

  const VBW = 1271, VBH = 599, N = 9, PEAK = 0.98, VALLEY = 0.55, MIN = 0
  const colW = VBW / N, mid = (N - 1) / 2
  let svg = ''
  for (let i = 0; i < N; i++) {
    const t = Math.abs(i - mid) / mid
    const h = PEAK * VBH * (VALLEY + (1 - VALLEY) * (1 - Math.pow(t, 1.24)))
    svg += `<g filter="url(#sfBlur)"><rect x="${i * colW}" y="${VBH - h}" width="${colW * 1.23}" height="${h}" fill="url(#sfGrad)"/></g>`
  }
  bars.innerHTML = svg

  const measure = () => {
    const h = glow.offsetHeight || 1
    const left = document.documentElement.scrollHeight - innerHeight - scrollY
    const t = Math.max(0, Math.min(1, (h - left) / h))
    glow.style.transform = `scaleY(${MIN + (1 - MIN) * t})`
    // A blurred shape scaled to 0 can still leave a hairline; hide it outright
    // until the end of the page is actually in reach.
    glow.style.visibility = t > 0.001 ? 'visible' : 'hidden'
    // Cars drive up out of the glow, each starting a little later (data-lead).
    if (cars) {
      cars.style.visibility = glow.style.visibility
      cars.querySelectorAll('img').forEach((img) => {
        const lead = +img.dataset.lead || 0
        const k = Math.max(0, Math.min(1, (t - lead) / (1 - lead)))
        const ease = 1 - Math.pow(1 - k, 3)
        // Rise from fully below the screen to HALF out (50% still below the edge),
        // fanned on an arc: outer cars tilt outward and sit a little lower.
        const rot = (+img.dataset.rot || 0) * ease
        const drop = +img.dataset.drop || 0
        img.style.transform = `translateY(${(1 - ease) * 110 + ease * (50 + drop)}%) rotate(${rot}deg)`
      })
    }
  }
  measure()
  addEventListener('scroll', measure, { passive: true })
  addEventListener('resize', measure, { passive: true })
})()
