import { useEffect, useRef } from 'react'

/**
 * Animated city-map background — street grid + location pins.
 * Pure Canvas, GPU-composited (transform/opacity only), pointer-events: none.
 * Drop it inside any `position: relative` container.
 */
export default function CityMapBackground({ themeMode = 'day' }) {
  const canvasRef = useRef(null)
  const themeRef = useRef(themeMode)
  themeRef.current = themeMode

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return

    const ctx = cv.getContext('2d')
    let rafId
    let W = 0
    let H = 0
    let streets = []
    let pins = []

    /* ---- colours (recalculated each frame so theme switches live) ---- */
    function colors() {
      const dark = themeRef.current === 'night'
      return {
        street: dark ? 'rgba(210,190,155,0.10)' : 'rgba(160,140,110,0.16)',
        pin:    dark ? 'rgba(205,175,125,ALPHA)' : 'rgba(75,60,40,ALPHA)',
        dot:    dark ? 'rgba(20,18,14,0.90)'     : 'rgba(242,236,226,0.90)',
        pulse:  dark ? 'rgba(205,175,125,PALPHA)' : 'rgba(75,60,40,PALPHA)',
      }
    }

    /* ---- resize ---- */
    function resize() {
      W = cv.offsetWidth
      H = cv.offsetHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width  = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      streets = buildStreets()
      pins    = buildPins()
    }

    /* ---- street grid (slightly rotated like a real city) ---- */
    function buildStreets() {
      const result = []
      const angle = -0.10
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const cx = W / 2
      const cy = H / 2

      function rot(x, y) {
        return [
          cx + (x - cx) * cos - (y - cy) * sin,
          cy + (x - cx) * sin + (y - cy) * cos,
        ]
      }

      // horizontal
      const hSteps = [30, 22, 52, 26, 48, 24, 38, 44, 28, 55, 32, 46, 22, 52, 34]
      let y = -15
      for (const s of hSteps) {
        y += s
        if (y > H + 15) break
        result.push({ p1: rot(-20, y), p2: rot(W + 20, y), w: s > 45 ? 1.1 : 0.55 })
      }

      // vertical
      const vSteps = [42, 28, 58, 32, 44, 24, 52, 36, 46, 28, 40, 55, 26, 48]
      let x = -15
      for (const s of vSteps) {
        x += s
        if (x > W + 15) break
        result.push({ p1: rot(x, -20), p2: rot(x, H + 20), w: s > 48 ? 1.1 : 0.55 })
      }

      // diagonal boulevards
      result.push({ p1: [W * 0.07, -10], p2: [W * 0.48, H + 10], w: 0.85 })
      result.push({ p1: [W * 0.42, -10], p2: [W * 0.92, H + 10], w: 0.85 })
      result.push({ p1: [-10, H * 0.18], p2: [W + 10, H * 0.58], w: 0.70 })

      return result
    }

    /* ---- location pins (clustered by district) ---- */
    function buildPins() {
      const districts = [
        { cx: 0.22, cy: 0.40, count: 6, spread: 0.10 },
        { cx: 0.60, cy: 0.26, count: 5, spread: 0.08 },
        { cx: 0.76, cy: 0.66, count: 7, spread: 0.11 },
        { cx: 0.36, cy: 0.72, count: 4, spread: 0.07 },
        { cx: 0.52, cy: 0.50, count: 3, spread: 0.05 },
      ]
      const result = []
      for (const d of districts) {
        for (let i = 0; i < d.count; i++) {
          const a = Math.random() * Math.PI * 2
          const r = Math.random() * d.spread
          result.push({
            x: d.cx + Math.cos(a) * r,
            y: d.cy + Math.sin(a) * r,
            size:   0.55 + Math.random() * 0.65,
            pulse:  Math.random() > 0.68,
            phase:  Math.random() * Math.PI * 2,
            speed:  0.45 + Math.random() * 0.60,
            active: Math.random() > 0.82,
          })
        }
      }
      // scattered loners
      for (let i = 0; i < 8; i++) {
        result.push({
          x: 0.05 + Math.random() * 0.90,
          y: 0.05 + Math.random() * 0.90,
          size:   0.35 + Math.random() * 0.40,
          pulse:  false,
          phase:  Math.random() * Math.PI * 2,
          speed:  0.38,
          active: false,
        })
      }
      return result
    }

    /* ---- draw helpers ---- */
    function drawPin(cx, cy, size, alpha, isActive, c) {
      const r   = size * 5.5
      const top = cy - r * 0.32           // centre of circular head
      const tipY = top + r * 2.0          // bottom tip

      const fill = (isActive
        ? c.pin.replace('ALPHA', '0.80')
        : c.pin.replace('ALPHA', String(alpha.toFixed(2)))
      )

      ctx.save()

      // head circle
      ctx.beginPath()
      ctx.arc(cx, top, r, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()

      // teardrop body
      ctx.beginPath()
      ctx.moveTo(cx - r * 0.66, top + r * 0.72)
      ctx.quadraticCurveTo(cx - r * 0.26, (top + r * 0.72 + tipY) * 0.55, cx, tipY)
      ctx.quadraticCurveTo(cx + r * 0.26, (top + r * 0.72 + tipY) * 0.55, cx + r * 0.66, top + r * 0.72)
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()

      // inner dot
      ctx.beginPath()
      ctx.arc(cx, top, r * 0.36, 0, Math.PI * 2)
      ctx.fillStyle = c.dot
      ctx.fill()

      ctx.restore()
    }

    function drawPulse(cx, cy, size, t, phase, speed, c) {
      const maxR    = size * 22
      const progress = ((t * speed + phase) % (Math.PI * 2)) / (Math.PI * 2)
      const r       = progress * maxR
      const alpha   = (1 - progress) * 0.22
      if (alpha < 0.005) return

      const top = cy - size * 5.5 * 0.32
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, top, r, 0, Math.PI * 2)
      ctx.strokeStyle = c.pulse.replace('PALPHA', alpha.toFixed(3))
      ctx.lineWidth = 0.75
      ctx.stroke()
      ctx.restore()
    }

    /* ---- animation loop ---- */
    let t = 0

    function frame() {
      ctx.clearRect(0, 0, W, H)

      const c = colors()

      // streets
      for (const s of streets) {
        ctx.beginPath()
        ctx.moveTo(s.p1[0], s.p1[1])
        ctx.lineTo(s.p2[0], s.p2[1])
        ctx.strokeStyle = c.street
        ctx.lineWidth   = s.w
        ctx.stroke()
      }

      // pins
      for (const p of pins) {
        const px = p.x * W
        const py = p.y * H
        const baseAlpha = 0.20 + 0.12 * Math.sin(t * p.speed + p.phase)
        const alpha = p.active ? 0.72 : baseAlpha

        if (p.pulse) drawPulse(px, py, p.size, t, p.phase, p.speed, c)
        drawPin(px, py, p.size, alpha, p.active, c)
      }

      t += 0.016
      rafId = requestAnimationFrame(frame)
    }

    /* ---- init ---- */
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    resize()
    frame()

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, []) // run once — themeMode read via ref inside frame()

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
