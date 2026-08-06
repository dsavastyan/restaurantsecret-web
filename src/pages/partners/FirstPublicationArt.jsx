// src/pages/partners/FirstPublicationArt.jsx
// Sketch/line-art иллюстрация приветственного экрана партнёрского кабинета:
// кабинет на десктопе и меню на телефоне, вокруг — четыре шага публикации.

function StepCard({ x, y, width, height, lines, bar = true, children }) {
  const cx = x + width / 2
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="16"
        fill="#FFFDF8"
        stroke="#E7E1D5"
        filter="url(#rsArtShadow)"
      />
      <g
        transform={`translate(${cx - 14} ${y + 21}) scale(1.16)`}
        stroke="#2f8f5b"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {children}
      </g>
      {lines.map((line, index) => (
        <text key={line} x={cx} y={y + 72 + index * 21} textAnchor="middle" className="partners-onboard__art-label">
          {line}
        </text>
      ))}
      {bar && <rect x={cx - 22} y={y + height - 22} width="44" height="6" rx="3" fill="#4FAE78" />}
    </g>
  )
}

export default function FirstPublicationArt() {
  return (
    <svg
      className="partners-onboard__art"
      viewBox="0 0 860 660"
      fill="none"
      role="img"
      aria-label="Иллюстрация: загрузка меню, фотографии блюд, предпросмотр и публикация"
    >
      <defs>
        <filter id="rsArtShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#4b3a1e" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* мягкое пятно фона */}
      <path
        d="M470 58C640 38 802 140 806 300c4 160-108 268-268 292-160 24-350-10-422-140C44 322 96 158 250 98c80-30 130-28 220-40Z"
        fill="#E9EEDD"
        opacity="0.55"
      />

      {/* пунктирный маршрут шагов */}
      <g stroke="#D49830" strokeWidth="2" strokeLinecap="round" strokeDasharray="7 10" opacity="0.75">
        <path d="M236 128C176 152 122 222 112 330" />
        <path d="M106 448C104 494 112 528 132 548" />
        <path d="M268 596C382 626 524 618 648 534" />
        <path d="M766 392C782 336 800 268 786 214" />
        <path d="M566 148C620 126 662 120 698 144" />
      </g>
      <g fill="#D49830">
        <circle cx="132" cy="238" r="5" />
        <circle cx="110" cy="482" r="5" />
        <circle cx="452" cy="616" r="5" />
        <circle cx="792" cy="292" r="5" />
        <circle cx="566" cy="148" r="5" />
      </g>

      {/* монитор */}
      <g>
        <rect x="168" y="92" width="392" height="258" rx="17" fill="#FFFDF8" stroke="#26744a" strokeWidth="2" />
        <rect x="182" y="106" width="364" height="230" rx="9" fill="#FFFFFF" stroke="#E3E6DB" />
        <path d="M268 106v230" stroke="#E9EBE2" />
        <circle cx="201" cy="130" r="10" stroke="#2f8f5b" strokeWidth="1.8" />
        {[160, 186, 212, 238].map((y) => (
          <g key={y}>
            <rect x="192" y={y} width="13" height="13" rx="3.5" stroke="#C9D0BD" />
            <rect x="214" y={y + 4} width="38" height="6" rx="3" fill="#E9EBE2" />
          </g>
        ))}
        <rect x="290" y="124" width="92" height="9" rx="4.5" fill="#E9EBE2" />
        <g>
          <rect x="506" y="118" width="26" height="26" rx="8" fill="#2f8f5b" />
          <path d="M519 125v12M513 131h12" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        </g>
        <g>
          <rect x="290" y="150" width="196" height="18" rx="9" stroke="#E3E6DB" />
          <circle cx="302" cy="159" r="4" stroke="#BEC5B2" />
          <path d="m305 162 3 3" stroke="#BEC5B2" strokeLinecap="round" />
        </g>
        <g>
          <rect x="290" y="180" width="44" height="15" rx="7.5" fill="#4FAE78" />
          <rect x="344" y="180" width="30" height="15" rx="7.5" stroke="#E0E3D8" />
          <rect x="384" y="180" width="38" height="15" rx="7.5" stroke="#E0E3D8" />
          <rect x="432" y="180" width="32" height="15" rx="7.5" stroke="#E0E3D8" />
        </g>
        <g>
          <rect x="290" y="208" width="100" height="62" rx="10" stroke="#E3E6DB" />
          <path d="m300 254 18-16 14 8 20-22 18 8" stroke="#4FAE78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="400" y="208" width="100" height="62" rx="10" stroke="#E3E6DB" />
          <rect x="414" y="246" width="10" height="16" rx="3" fill="#9DCBB2" />
          <rect x="430" y="236" width="10" height="26" rx="3" fill="#4FAE78" />
          <rect x="446" y="242" width="10" height="20" rx="3" fill="#E3C68C" />
          <rect x="462" y="228" width="10" height="34" rx="3" fill="#D49830" />
        </g>
        {[284, 302, 320].map((y) => (
          <g key={y}>
            <circle cx="297" cy={y + 4} r="5.5" stroke="#DEE1D6" />
            <rect x="313" y={y} width="150" height="8" rx="4" fill="#EDEEE8" />
          </g>
        ))}
        <path d="M340 350l-8 36h64l-8-36" stroke="#26744a" strokeWidth="2" strokeLinejoin="round" />
        <path d="M296 390h136" stroke="#26744a" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* телефон */}
      <g>
        <rect x="452" y="196" width="236" height="436" rx="34" fill="#FFFDF8" stroke="#26744a" strokeWidth="2" />
        <rect x="464" y="208" width="212" height="412" rx="26" fill="#FFFFFF" stroke="#E6E3DC" />
        <rect x="536" y="216" width="68" height="9" rx="4.5" fill="#EDEEE8" />
        <g stroke="#8A9184" strokeWidth="1.8" strokeLinecap="round">
          <path d="M482 244h22M482 250h22M482 256h16" />
        </g>
        <path
          d="M652 244c-3-4-9-4-11 1-2-5-8-5-11-1-3 5 2 10 11 15 9-5 14-10 11-15Z"
          stroke="#2f8f5b"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <g>
          <rect x="482" y="272" width="176" height="22" rx="11" stroke="#E3E6DB" />
          <circle cx="496" cy="283" r="4.5" stroke="#BEC5B2" />
          <path d="m499 286 3 3" stroke="#BEC5B2" strokeLinecap="round" />
        </g>
        <g>
          <rect x="482" y="306" width="46" height="17" rx="8.5" fill="#4FAE78" />
          <rect x="536" y="306" width="34" height="17" rx="8.5" stroke="#E0E3D8" />
          <rect x="578" y="306" width="40" height="17" rx="8.5" stroke="#E0E3D8" />
          <rect x="626" y="306" width="32" height="17" rx="8.5" stroke="#E0E3D8" />
        </g>
        {[340, 436, 532].map((y) => (
          <g key={y}>
            <rect x="482" y={y} width="176" height="80" rx="14" stroke="#E3E6DB" />
            <rect x="494" y={y + 14} width="52" height="52" rx="10" stroke="#DCE0D3" />
            <circle cx="508" cy={y + 30} r="4" stroke="#DCE0D3" />
            <path d={`m498 ${y + 58} 14-16 10 12 6-6 12 12`} stroke="#DCE0D3" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="558" y={y + 18} width="76" height="8" rx="4" fill="#EDEEE8" />
            <path d={`M558 ${y + 44}h88`} stroke="#EBEDE5" strokeWidth="5" strokeLinecap="round" />
            <circle cx={y === 436 ? 620 : 596} cy={y + 44} r="7" fill="#FFFDF8" stroke="#D49830" strokeWidth="2" />
            <path d={`m634 ${y + 60} 5 5 5-5`} stroke="#C3C9BB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
      </g>

      {/* шаги */}
      <StepCard x={36} y={336} width={140} height={112} lines={['Загрузить']}>
        <path d="M12 13v8" />
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <path d="m8 17 4-4 4 4" />
      </StepCard>

      <StepCard x={118} y={520} width={150} height={112} lines={['Фото блюд']}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </StepCard>

      <StepCard x={698} y={98} width={150} height={112} lines={['Предпросмотр']}>
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </StepCard>

      <StepCard x={688} y={392} width={160} height={130} lines={['Готово', 'к публикации']} bar={false}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </StepCard>
    </svg>
  )
}
