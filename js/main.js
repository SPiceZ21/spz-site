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
