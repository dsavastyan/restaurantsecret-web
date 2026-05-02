// Application-level router wiring. The Router component picks between
// BrowserRouter (regular web) and HashRouter (Telegram WebApp) and renders the
// full route tree.
import React, { Suspense, lazy } from 'react'
import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import AppShell from '../app/AppShell.jsx'
import { isTelegramLaunch } from '../lib/telegram'
import NotFound from '../pages/NotFound.jsx'

const Landing = lazy(() => import('../pages/Landing.jsx'))
const Catalog = lazy(() => import('../pages/Catalog.jsx'))
const RestaurantPage = lazy(() => import('../pages/RestaurantPage.jsx'))
const Menu = lazy(() => import('../pages/Menu.jsx'))
const Search = lazy(() => import('../pages/Search.jsx'))
const PaySuccess = lazy(() => import('../pages/PaySuccess.jsx'))
const PaymentResult = lazy(() => import('../pages/PaymentResult.jsx'))
const Login = lazy(() => import('../pages/Login.tsx'))
const OnboardingWelcome = lazy(() => import('../pages/OnboardingWelcome.tsx'))
const OnboardingProfile = lazy(() => import('../pages/OnboardingProfile.tsx'))
const Contact = lazy(() => import('../pages/Contact.jsx'))
const Legal = lazy(() => import('../pages/Legal.jsx'))
const Privacy = lazy(() => import('../pages/Privacy.jsx'))
const Tariffs = lazy(() => import('../pages/Tariffs.jsx'))
const Licenses = lazy(() => import('../pages/Licenses.jsx'))
const AccountLayout = lazy(() => import('../pages/account/Layout.tsx'))
const AccountOverview = lazy(() => import('../pages/account/Overview.tsx'))
const AccountSubscription = lazy(() => import('../pages/account/Subscription.tsx'))
const Feedback = lazy(() => import('../pages/Feedback.jsx'))
const HowItWorks = lazy(() => import('../pages/HowItWorks.jsx'))
const SubscriptionHistoryPage = lazy(() => import('../pages/account/SubscriptionHistoryPage.tsx'))
const Favorites = lazy(() => import('../pages/account/Favorites.tsx'))
const Friends = lazy(() => import('../pages/account/Friends.tsx'))
const FriendFavorites = lazy(() => import('../pages/account/FriendFavorites.tsx'))
const Goals = lazy(() => import('../pages/account/Goals.tsx'))
const Statistics = lazy(() => import('../pages/account/Statistics.tsx'))
const PaymentMethods = lazy(() => import('../pages/account/PaymentMethods.tsx'))

// Defines the route tree shared between BrowserRouter and HashRouter. Keeping
// this as a separate component makes it easier to unit test in isolation.
function AppRoutes({ onReady }) {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          {/* Публичные страницы */}
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="onboarding/welcome" element={<OnboardingWelcome />} />
          <Route path="onboarding/profile/:step" element={<OnboardingProfile />} />
          <Route path="legal" element={<Legal />} />
          <Route path="tariffs" element={<Tariffs />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="licenses" element={<Licenses />} />
          <Route path="contact" element={<Contact />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<AccountOverview />} />
            <Route path="profile" element={<AccountOverview />} />
            <Route path="subscription" element={<AccountSubscription />} />
            <Route path="subscription/history" element={<SubscriptionHistoryPage />} />
            <Route path="payment-methods/*" element={<PaymentMethods />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="friends" element={<Friends />} />
            <Route path="friends/:friendId" element={<FriendFavorites />} />
            <Route path="goals" element={<Goals />} />
            <Route path="statistics" element={<Statistics />} />
          </Route>

          {/* Основной контент */}
          <Route path="catalog" element={<Catalog />} />
          <Route path="restaurants" element={<Catalog />} />
          <Route path="search" element={<Search />} />
          <Route path="restaurants/:slug" element={<RestaurantPage />} />
          <Route path="restaurants/:slug/menu" element={<Menu />} />
          <Route path="r/:slug" element={<ShortRestaurantRedirect />} />
          <Route path="r/:slug/menu" element={<ShortMenuRedirect />} />
          <Route path="pay/success" element={<PaySuccess />} />
          <Route path="pay/result" element={<PaymentResult />} />
          <Route path="payments/result" element={<PaymentResult />} />

          {/* AppShell зона с табами */}
          <Route path="app" element={<Outlet />}>
            <Route index element={<Catalog />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="search" element={<Search />} />
            <Route path="favorites" element={<div>TODO: Favorites</div>} />
            <Route path="profile" element={<div>TODO: Profile</div>} />
            <Route path="*" element={<Navigate to="catalog" replace />} />
          </Route>

          {/* Легаси-ссылки */}
          <Route path="restaurant/:slug" element={<LegacyRestaurantRedirect />} />
          <Route path="restaurant/:slug/menu" element={<LegacyMenuRedirect />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <AppReadySignal onReady={onReady} />
    </Suspense>
  )
}

// Chooses the router implementation based on the environment and mounts the
// AppRoutes component.
export default function Router({ children, onReady, onRouteStart }) {
  const inTelegram = isTelegramLaunch()
  if (!inTelegram && typeof window !== 'undefined' && window.location.pathname === '/') {
    const redirectPath = window.sessionStorage.getItem('redirectPath')
    if (redirectPath && redirectPath.startsWith('/') && redirectPath !== '/') {
      window.sessionStorage.removeItem('redirectPath')
      window.history.replaceState(null, '', redirectPath)
    }
  }
  if (!inTelegram && typeof window !== 'undefined' && window.location.pathname === '/' && window.location.hash.startsWith('#/')) {
    const legacyPath = window.location.hash.slice(1)
    if (legacyPath.startsWith('/')) {
      window.history.replaceState(null, '', legacyPath)
    }
  }
  const RouterImpl = inTelegram ? HashRouter : BrowserRouter

  return (
    <RouterImpl>
      <RouteSplashController onRouteStart={onRouteStart} />
      <AppRoutes onReady={onReady} />
      {children}
    </RouterImpl>
  )
}

function RouteSplashController({ onRouteStart }) {
  const location = useLocation()
  const previousKeyRef = React.useRef(location.key)

  React.useEffect(() => {
    if (previousKeyRef.current === location.key) return
    previousKeyRef.current = location.key
    onRouteStart?.()
  }, [location.key, onRouteStart])

  return null
}

function AppReadySignal({ onReady }) {
  const location = useLocation()

  React.useEffect(() => {
    onReady?.()
  }, [location.key, onReady])

  return null
}

// Redirect short public links to the canonical restaurant URL.
function ShortRestaurantRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/restaurants/${slug}`} replace />
}

// Redirect short public menu links to the canonical menu URL.
function ShortMenuRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/restaurants/${slug}/menu`} replace />
}

// Redirect old `/restaurant/:slug` paths to the canonical structure.
function LegacyRestaurantRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/restaurants/${slug}`} replace />
}

// Redirect old `/restaurant/:slug/menu` paths to the canonical menu URL.
function LegacyMenuRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/restaurants/${slug}/menu`} replace />
}
