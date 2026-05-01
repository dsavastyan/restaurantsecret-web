import { useEffect, useRef } from 'react'

/**
 * Warm gradient orbs background.
 * Soft colour blobs that slowly drift and breathe — pure atmosphere, no distraction.
 * Pure Canvas, GPU-composited, pointer-events: none.
 */
export default function CityMapBackground({ themeMode = 'day' }) {
  const canvasRef = useRef(null)
  const themeRef  = useRef(themeMode)
  themeRef.current = themeMode

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    let rafId = 0, W = 0, H = 0, t = 0
    let stopped = false

    /* ---- orb definitions (normalised 0-1) ---- */
    const orbs = [
      { x: 0.18, y: 0.38, r: 0.42, hue: 36,  sat: 52, speed: 0.28, phase: 0.00, dx: 0.012, dy: 0.009 },
      { x: 0.75, y: 0.30, r: 0.36, hue: 22,  sat: 48, speed: 0.22, phase: 1.30, dx: -0.009, dy: 0.013 },
      { x: 0.50, y: 0.78, r: 0.32, hue: 48,  sat: 44, speed: 0.35, phase: 2.60, dx: 0.010, dy: -0.008 },
      { x: 0.10, y: 0.70, r: 0.26, hue: 30,  sat: 50, speed: 0.20, phase: 0.80, dx: 0.007, dy: 0.011 },
      { x: 0.88, y: 0.72, r: 0.28, hue: 42,  sat: 46, speed: 0.30, phase: 1.90, dx: -0.011, dy: -0.007 },
    ]

    function resize(entry) {
      W = Math.round(entry?.contentRect?.width || cv.clientWidth)
      H = Math.round(entry?.contentRect?.height || cv.clientHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width  = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)

      const dark = themeRef.current === 'night'
      const maxAlpha = dark ? 0.22 : 0.18

      for (const o of orbs) {
        // gentle drift within bounds
        const px = o.x + o.dx * Math.sin(t * o.speed * 0.7 + o.phase)
        const py = o.y + o.dy * Math.cos(t * o.speed * 0.9 + o.phase + 1)

        // radius breathing
        const rBase = o.r * Math.min(W, H)
        const r = rBase * (0.88 + 0.12 * Math.sin(t * o.speed + o.phase * 1.3))

        // alpha pulse
        const alpha = maxAlpha * (0.70 + 0.30 * Math.sin(t * o.speed * 1.1 + o.phase * 0.7))

        const lum = dark ? 55 : 72
        const g = ctx.createRadialGradient(px * W, py * H, 0, px * W, py * H, r)
        g.addColorStop(0, `hsla(${o.hue}, ${o.sat}%, ${lum}%, ${alpha})`)
        g.addColorStop(0.55, `hsla(${o.hue}, ${o.sat - 8}%, ${lum + 4}%, ${alpha * 0.45})`)
        g.addColorStop(1, `hsla(${o.hue}, ${o.sat - 12}%, ${lum + 6}%, 0)`)

        ctx.beginPath()
        ctx.arc(px * W, py * H, r, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
      }

    }

    function frame() {
      draw()
      t += 0.010
      rafId = requestAnimationFrame(frame)
    }

    function start() {
      if (stopped || rafId || document.visibilityState === 'hidden') return
      rafId = requestAnimationFrame(frame)
    }

    function stop() {
      if (!rafId) return
      cancelAnimationFrame(rafId)
      rafId = 0
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        stop()
      } else {
        start()
      }
    }

    const ro = new ResizeObserver(([entry]) => resize(entry))
    ro.observe(cv)
    resize()

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const startDelay = window.setTimeout(() => {
      if (!prefersReducedMotion) start()
    }, 1800)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopped = true
      window.clearTimeout(startDelay)
      stop()
      ro.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  )
}
