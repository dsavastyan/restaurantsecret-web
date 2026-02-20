import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import logoIcon from '@/assets/intro screens/RestSecret logo.png'
import { fetchCurrentUser } from '@/lib/api'
import { useAuth } from '@/store/auth'

type IntroLocationState = {
  next?: unknown;
  from?: unknown;
}

function toInternalPath(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') ? value : null
}

const STEP_ONE_IMAGES = {
  rus: '/assets/web%20app%20instruction/add-to-home-rus.png',
  eng: '/assets/web%20app%20instruction/add-to-home-eng.png'
}

const STEP_THREE_IMAGES = {
  rus: '/assets/web%20app%20instruction/web-app-view-rus.png',
  eng: '/assets/web%20app%20instruction/web-app-view-eng.png'
}

export default function OnboardingInstallAppPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const accessToken = useAuth((state) => state.accessToken)
  const [isOnboardingAllowed, setIsOnboardingAllowed] = useState<boolean | null>(null)

  const [stepOneLang, setStepOneLang] = useState<'rus' | 'eng'>('rus')
  const [stepThreeLang, setStepThreeLang] = useState<'rus' | 'eng'>('rus')

  const nextPath = useMemo(() => {
    const state = (location.state || {}) as IntroLocationState
    const fromNext = toInternalPath(state.next)
    const fromState = toInternalPath(state.from)
    const resolved = fromNext || fromState

    if (!resolved || resolved.startsWith('/onboarding')) {
      return '/account'
    }

    return resolved
  }, [location.state])

  useEffect(() => {
    if (!accessToken) return

    let isCancelled = false

    ;(async () => {
      try {
        const me = await fetchCurrentUser(accessToken)
        if (isCancelled) return
        setIsOnboardingAllowed(me?.user?.onboarding_completed !== true)
      } catch (statusError) {
        console.error('Failed to load onboarding status', statusError)
        if (!isCancelled) setIsOnboardingAllowed(true)
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [accessToken])

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (isOnboardingAllowed === null) {
    return null
  }

  if (!isOnboardingAllowed) {
    return <Navigate to="/account" replace />
  }

  return (
    <section className="onboarding-flow" aria-labelledby="onboarding-install-title">
      <div className="onboarding-flow__inner onboarding-install">
        <button
          type="button"
          className="onboarding-flow__back"
          onClick={() => navigate('/onboarding/welcome', { replace: true, state: { next: nextPath } })}
          aria-label="Назад"
        >
          Назад
        </button>

        <img src={logoIcon} alt="" className="onboarding-flow__logo" aria-hidden="true" />

        <h1 id="onboarding-install-title" className="onboarding-flow__title onboarding-install__title">
          Установите<br />веб-приложение<br />для айфона
        </h1>

        <ol className="onboarding-install__steps">
          <li>Нажмите на иконку <strong>Поделиться</strong>.</li>
          <li>В выпадающем меню найдите На экран Домой -&gt; Добавить.</li>
        </ol>

        <div className="onboarding-install__lang-row">
          <button
            type="button"
            className={`onboarding-install__lang ${stepOneLang === 'rus' ? 'is-active' : ''}`}
            onClick={() => setStepOneLang('rus')}
          >
            Рус
          </button>
          <button
            type="button"
            className={`onboarding-install__lang ${stepOneLang === 'eng' ? 'is-active' : ''}`}
            onClick={() => setStepOneLang('eng')}
          >
            Eng
          </button>
        </div>

        <img className="onboarding-install__image" src={STEP_ONE_IMAGES[stepOneLang]} alt="Шаг добавления на экран домой" />

        <p className="onboarding-install__step-three">3. Настройте веб-приложение по инструкции ниже.</p>

        <div className="onboarding-install__lang-row">
          <button
            type="button"
            className={`onboarding-install__lang ${stepThreeLang === 'rus' ? 'is-active' : ''}`}
            onClick={() => setStepThreeLang('rus')}
          >
            Рус
          </button>
          <button
            type="button"
            className={`onboarding-install__lang ${stepThreeLang === 'eng' ? 'is-active' : ''}`}
            onClick={() => setStepThreeLang('eng')}
          >
            Eng
          </button>
        </div>

        <img className="onboarding-install__image" src={STEP_THREE_IMAGES[stepThreeLang]} alt="Шаг настройки веб-приложения" />

        <a className="onboarding-install__support" href="/contact">
          Поддержка
        </a>

        <div className="onboarding-flow__actions onboarding-install__actions">
          <button
            type="button"
            className="onboarding-flow__action onboarding-flow__action--primary"
            onClick={() => navigate('/onboarding/profile/step-1', { replace: true, state: { next: nextPath } })}
          >
            Продолжить
          </button>
          <button
            type="button"
            className="onboarding-flow__action onboarding-flow__action--secondary"
            onClick={() => navigate('/onboarding/profile/step-1', { replace: true, state: { next: nextPath } })}
          >
            Пропустить
          </button>
        </div>
      </div>
    </section>
  )
}
