import { useEffect, useRef } from 'react'

/**
 * Animated city-map background.
 * - Proper rounded map-pin shapes (circle head + smooth teardrop)
 * - Dynamic connection lines that draw themselves between pins
 * - Pulse rings on active pins
 * - Street grid with slight city angle
 */
export default function CityMapBackground({ themeMode = 'day' }) {
  const canvasRef = useRef(null)
  const themeRef  = useRef(themeMode)
  themeRef.current = themeMode

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')

    let rafId
    let W = 0, H = 0
    let streets = []
    let pins = []
    let connections = []
    let nextSpawnT = 1.5

    /* ---- theme colours ---- */
    function clr() {
      const dark = themeRef.current === 'night'
      return {
        street:  dark ? 'rgba(210,190,160,0.09)' : 'rgba(140,120,90,0.14)',
        pin:     dark ? [205, 178, 130] : [85, 68, 46],
        pinDot:  dark ? 'rgba(18,16,12,0.92)'    : 'rgba(244,239,231,0.96)',
        conn:    dark ? [205, 178, 130] : [95, 76, 52],
      }
    }

    /* ---- resize + rebuild ---- */
    function resize() {
      W = cv.offsetWidth
      H = cv.offsetHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width  = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      streets     = buildStreets()
      pins        = buildPins()
      connections = []
    }

    /* ---- street grid ---- */
    function buildStreets() {
      const out = []
      const angle = -0.09
      const cos = Math.cos(angle), sin = Math.sin(angle)
      const cx = W / 2, cy = H / 2

      function rot(x, y) {
        return [
          cx + (x - cx) * cos - (y - cy) * sin,
          cy + (x - cx) * sin + (y - cy) * cos,
        ]
      }

      const hSteps = [26, 20, 48, 24, 44, 20, 36, 40, 25, 52, 28, 44, 20, 50, 30]
      let y = -12
      for (const s of hSteps) {
        y += s
        if (y > H + 12) break
        out.push({ p1: rot(-20, y), p2: rot(W + 20, y), w: s > 44 ? 1.0 : 0.5 })
      }

      const vSteps = [38, 24, 54, 28, 42, 22, 50, 32, 44, 24, 38, 52, 22, 46]
      let x = -12
      for (const s of vSteps) {
        x += s
        if (x > W + 12) break
        out.push({ p1: rot(x, -20), p2: rot(x, H + 20), w: s > 46 ? 1.0 : 0.5 })
      }

      // diagonal boulevards
      out.push({ p1: [W * 0.06, -10], p2: [W * 0.47, H + 10], w: 0.85 })
      out.push({ p1: [W * 0.40, -10], p2: [W * 0.92, H + 10], w: 0.85 })
      out.push({ p1: [-10, H * 0.17], p2: [W + 10, H * 0.57], w: 0.65 })

      return out
    }

    /* ---- pins (clustered like real districts) ---- */
    function buildPins() {
      const districts = [
        { cx: 0.20, cy: 0.38, count: 5, spread: 0.09 },
        { cx: 0.55, cy: 0.24, count: 5, spread: 0.08 },
        { cx: 0.77, cy: 0.62, count: 6, spread: 0.10 },
        { cx: 0.34, cy: 0.70, count: 4, spread: 0.08 },
        { cx: 0.50, cy: 0.50, count: 3, spread: 0.05 },
        { cx: 0.88, cy: 0.28, count: 3, spread: 0.06 },
        { cx: 0.08, cy: 0.72, count: 3, spread: 0.06 },
      ]
      const out = []
      for (const d of districts) {
        for (let i = 0; i < d.count; i++) {
          const a  = Math.random() * Math.PI * 2
          const rr = Math.random() * d.spread
          out.push({
            x:          Math.max(0.04, Math.min(0.96, d.cx + Math.cos(a) * rr)),
            y:          Math.max(0.04, Math.min(0.96, d.cy + Math.sin(a) * rr)),
            size:       0.62 + Math.random() * 0.58,
            breathPhase: Math.random() * Math.PI * 2,
            breathSpeed: 0.28 + Math.random() * 0.40,
            pulsePhase:  Math.random() * Math.PI * 2,
            hasPulse:    Math.random() > 0.60,
            active:      Math.random() > 0.80,
          })
        }
      }
      // scattered loners
      for (let i = 0; i < 8; i++) {
        out.push({
          x: 0.05 + Math.random() * 0.90,
          y: 0.05 + Math.random() * 0.90,
          size: 0.38 + Math.random() * 0.38,
          breathPhase:  Math.random() * Math.PI * 2,
          breathSpeed:  0.25,
          pulsePhase:   Math.random() * Math.PI * 2,
          hasPulse:     false,
          active:       false,
        })
      }
      return out
    }

    /* ---- draw a proper rounded map pin ---- */
    function drawPin(px, py, size, alpha, isActive, c) {
      const r      = size * 5.8           // head radius
      const headCY = py - r * 0.48        // centre of the circle head (raised)
      const tipY   = headCY + r * 2.55    // bottom tip

      const [pr, pg, pb] = c.pin
      const a = isActive ? Math.min(alpha * 1.9, 0.80) : alpha
      const fill = `rgba(${pr},${pg},${pb},${a})`

      ctx.save()

      // --- full circle head ---
      ctx.beginPath()
      ctx.arc(px, headCY, r, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()

      // --- teardrop body: two smooth quadratic curves down to the tip ---
      ctx.beginPath()
      ctx.moveTo(px - r * 0.58, headCY + r * 0.80)
      ctx.quadraticCurveTo(px - r * 0.22, tipY - r * 0.28, px, tipY)
      ctx.quadraticCurveTo(px + r * 0.22, tipY - r * 0.28, px + r * 0.58, headCY + r * 0.80)
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()

      // --- inner dot (hole) ---
      ctx.beginPath()
      ctx.arc(px, headCY, r * 0.38, 0, Math.PI * 2)
      ctx.fillStyle = c.pinDot
      ctx.fill()

      ctx.restore()
    }

    /* ---- pulse ring around pin head ---- */
    function drawPulse(px, py, size, t, pulsePhase, c) {
      const headCY  = py - size * 5.8 * 0.48
      const progress = ((t * 0.55 + pulsePhase) % (Math.PI * 2)) / (Math.PI * 2)
      const r        = progress * size * 26
      const alpha    = (1 - progress) * 0.20
      if (alpha < 0.005) return

      const [pr, pg, pb] = c.pin
      ctx.save()
      ctx.beginPath()
      ctx.arc(px, headCY, r, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${pr},${pg},${pb},${alpha})`
      ctx.lineWidth = 0.75
      ctx.stroke()
      ctx.restore()
    }

    /* ---- connection lines ---- */
    const MAX_CONN = 6

    function spawnConnection(t) {
      if (connections.length >= MAX_CONN) return
      if (t < nextSpawnT) return

      // collect candidates in range
      const cands = []
      for (let i = 0; i < pins.length; i++) {
        for (let j = i + 1; j < pins.length; j++) {
          const dx = (pins[i].x - pins[j].x) * W
          const dy = (pins[i].y - pins[j].y) * H
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d > 55 && d < 230) cands.push({ i, j, d })
        }
      }
      if (!cands.length) return

      // avoid duplicate pairs
      const active = new Set(connections.map(c => `${c.from}-${c.to}`))
      const fresh  = cands.filter(c => !active.has(`${c.i}-${c.j}`))
      if (!fresh.length) return

      const pick = fresh[Math.floor(Math.random() * fresh.length)]
      connections.push({
        from:      pick.i,
        to:        pick.j,
        progress:  0,
        alpha:     0,
        phase:     'in',      // in → hold → out
        holdLeft:  55 + Math.random() * 90,
        drawSpeed: 0.007 + Math.random() * 0.007,
      })

      nextSpawnT = t + 0.9 + Math.random() * 1.4
    }

    function tickConnections() {
      for (let i = connections.length - 1; i >= 0; i--) {
        const cn = connections[i]
        if (cn.phase === 'in') {
          cn.progress = Math.min(1, cn.progress + cn.drawSpeed)
          cn.alpha    = Math.min(0.26, cn.alpha + 0.014)
          if (cn.progress >= 1) cn.phase = 'hold'
        } else if (cn.phase === 'hold') {
          cn.holdLeft--
          if (cn.holdLeft <= 0) cn.phase = 'out'
        } else {
          cn.alpha -= 0.009
          if (cn.alpha <= 0) connections.splice(i, 1)
        }
      }
    }

    function drawConnection(cn, c) {
      const A  = pins[cn.from]
      const B  = pins[cn.to]
      const x1 = A.x * W,  y1 = A.y * H - A.size * 5.8 * 0.48
      const x2 = B.x * W,  y2 = B.y * H - B.size * 5.8 * 0.48

      // current tip (animated endpoint while drawing in)
      const ex = x1 + (x2 - x1) * cn.progress
      const ey = y1 + (y2 - y1) * cn.progress

      const [lr, lg, lb] = c.conn
      ctx.save()

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(ex, ey)
      ctx.strokeStyle = `rgba(${lr},${lg},${lb},${cn.alpha})`
      ctx.lineWidth   = 0.85
      ctx.stroke()

      // small travelling dot at the leading edge (only while drawing)
      if (cn.phase === 'in' && cn.progress < 0.98) {
        ctx.beginPath()
        ctx.arc(ex, ey, 2.0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${lr},${lg},${lb},${Math.min(cn.alpha * 2, 0.55)})`
        ctx.fill()
      }

      ctx.restore()
    }

    /* ---- main loop ---- */
    let t = 0

    function frame() {
      ctx.clearRect(0, 0, W, H)
      const c = clr()

      // streets
      for (const s of streets) {
        ctx.beginPath()
        ctx.moveTo(s.p1[0], s.p1[1])
        ctx.lineTo(s.p2[0], s.p2[1])
        ctx.strokeStyle = c.street
        ctx.lineWidth   = s.w
        ctx.stroke()
      }

      // connections
      spawnConnection(t)
      tickConnections()
      for (const cn of connections) drawConnection(cn, c)

      // pins
      for (const p of pins) {
        const px    = p.x * W
        const py    = p.y * H
        const breath = 0.16 + 0.10 * Math.sin(t * p.breathSpeed + p.breathPhase)
        const alpha  = p.active ? 0.68 : breath

        if (p.hasPulse) drawPulse(px, py, p.size, t, p.pulsePhase, c)
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
