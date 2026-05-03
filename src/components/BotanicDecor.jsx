const ORANGE = 'rgba(212,122,58,'
const GREEN = 'rgba(138,154,107,'
const SAND = 'rgba(232,161,94,'

const citrusSegments = [0, 40, 80, 120, 160, 200, 240, 280, 320]
const citrusDots = [
  [-30, -60],
  [20, -50],
  [50, -20],
  [60, 30],
  [30, 65],
  [-20, 70],
  [-65, 30],
  [-70, -25],
  [-40, -65],
]
const scatterDots = [
  [14, 52, ORANGE, 0.22, 5],
  [86, 44, GREEN, 0.20, 4],
  [30, 88, SAND, 0.22, 5],
  [70, 82, ORANGE, 0.18, 4],
  [50, 10, GREEN, 0.18, 3.5],
  [20, 34, ORANGE, 0.16, 3],
  [80, 32, SAND, 0.18, 3.5],
  [42, 76, GREEN, 0.16, 3],
  [60, 92, ORANGE, 0.14, 3],
  [8, 78, SAND, 0.14, 2.5],
  [92, 68, GREEN, 0.14, 2.5],
]

const citrusCenter = { x: 1070, y: 155 }
const smallSprigLeaves = [
  [74, 760, 22],
  [38, 730, -22],
  [74, 700, 22],
  [38, 670, -22],
]

export default function BotanicDecor() {
  return (
    <div className="botanic-decor" aria-hidden="true">
      <svg className="botanic-decor__svg" width="100%" height="100%" viewBox="0 0 1200 820" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50%" cy="-8%" rx="52%" ry="62%" fill="none" stroke={`${ORANGE}0.07)`} strokeWidth="2" />
        <ellipse cx="50%" cy="-8%" rx="40%" ry="48%" fill="none" stroke={`${GREEN}0.06)`} strokeWidth="1.5" />

        <g className="botanic-fb botanic-decor__large-sprig" style={{ transformOrigin: '78px 200px' }}>
          <line x1="78" y1="50" x2="82" y2="290" stroke={`${GREEN}0.28)`} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="78" y1="120" x2="118" y2="98" stroke={`${GREEN}0.20)`} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="78" y1="150" x2="38" y2="132" stroke={`${GREEN}0.18)`} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="78" y1="180" x2="120" y2="165" stroke={`${GREEN}0.16)`} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="78" y1="210" x2="36" y2="198" stroke={`${GREEN}0.15)`} strokeWidth="1.5" strokeLinecap="round" />
          {[0, 1, 2, 3, 4, 5, 6].map((item) => {
            const cx = item % 2 === 0 ? 104 : 52
            const cy = 90 + item * 30
            return (
              <ellipse
                key={item}
                cx={cx}
                cy={cy}
                rx="22"
                ry="9"
                fill={`${GREEN}${0.13 + item * 0.01})`}
                stroke={`${GREEN}0.08)`}
                strokeWidth="0.5"
                transform={`rotate(${item % 2 === 0 ? 25 : -25} ${cx} ${cy})`}
              />
            )
          })}
          <ellipse cx="126" cy="88" rx="14" ry="6" fill={`${GREEN}0.14)`} transform="rotate(-40 126 88)" />
          <ellipse cx="28" cy="122" rx="14" ry="6" fill={`${GREEN}0.12)`} transform="rotate(35 28 122)" />
          <ellipse cx="128" cy="155" rx="12" ry="5" fill={`${GREEN}0.12)`} transform="rotate(-20 128 155)" />
          <ellipse cx="26" cy="188" rx="12" ry="5" fill={`${GREEN}0.11)`} transform="rotate(30 26 188)" />
        </g>

        <g className="botanic-fc botanic-decor__citrus" style={{ transformOrigin: `${citrusCenter.x}px ${citrusCenter.y}px` }}>
          <circle cx={citrusCenter.x} cy={citrusCenter.y} r="95" fill={`${ORANGE}0.06)`} />
          <circle cx={citrusCenter.x} cy={citrusCenter.y} r="82" fill={`${ORANGE}0.09)`} />
          <circle cx={citrusCenter.x} cy={citrusCenter.y} r="68" fill={`${SAND}0.10)`} />
          <circle cx={citrusCenter.x} cy={citrusCenter.y} r="40" fill={`${ORANGE}0.06)`} />
          <circle cx={citrusCenter.x} cy={citrusCenter.y} r="12" fill={`${ORANGE}0.12)`} />
          {citrusSegments.map((deg) => {
            const rad = deg * Math.PI / 180
            const x2 = citrusCenter.x + Math.cos(rad) * 42
            const y2 = citrusCenter.y + Math.sin(rad) * 42
            return (
              <line
                key={deg}
                x1={citrusCenter.x}
                y1={citrusCenter.y}
                x2={x2}
                y2={y2}
                stroke={`${ORANGE}0.20)`}
                strokeWidth="1.2"
              />
            )
          })}
          {citrusDots.map(([dx, dy]) => (
            <circle
              key={`${dx}-${dy}`}
              cx={citrusCenter.x + dx * 0.7}
              cy={citrusCenter.y + dy * 0.7}
              r="2.5"
              fill={`${ORANGE}0.14)`}
            />
          ))}
        </g>

        <g className="botanic-fa botanic-decor__small-sprig" style={{ transformOrigin: '55px 740px' }} opacity="0.7">
          <line x1="55" y1="800" x2="60" y2="660" stroke={`${GREEN}0.22)`} strokeWidth="2" strokeLinecap="round" />
          {smallSprigLeaves.map(([cx, cy, rotation]) => (
            <ellipse
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              rx="16"
              ry="7"
              fill={`${GREEN}0.12)`}
              transform={`rotate(${rotation} ${cx} ${cy})`}
            />
          ))}
        </g>

        {scatterDots.map(([fx, fy, color, alpha, r]) => (
          <circle key={`${fx}-${fy}`} cx={`${fx}%`} cy={`${fy}%`} r={r} fill={`${color}${alpha})`} />
        ))}

        <line x1="0" y1="52%" x2="9%" y2="52%" stroke={`${ORANGE}0.12)`} strokeWidth="1" />
        <line x1="91%" y1="52%" x2="100%" y2="52%" stroke={`${ORANGE}0.12)`} strokeWidth="1" />
        <line x1="0" y1="54%" x2="6%" y2="54%" stroke={`${ORANGE}0.07)`} strokeWidth="1" />
        <line x1="94%" y1="54%" x2="100%" y2="54%" stroke={`${ORANGE}0.07)`} strokeWidth="1" />
      </svg>
    </div>
  )
}
