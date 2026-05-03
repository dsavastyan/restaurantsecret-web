export default function TelegramFooterLink({ className = '' }) {
  return (
    <a
      href="https://t.me/restaurantsecret"
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Telegram RestaurantSecret"
      title="Telegram"
    >
      <svg
        className="site-footer__social-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M21.78 4.02a1.14 1.14 0 0 0-1.18-.2L2.98 10.6a1.05 1.05 0 0 0 .05 1.97l4.47 1.42 1.72 5.26c.12.38.44.66.83.73.39.07.79-.08 1.04-.39l2.45-3.04 4.52 3.34c.31.23.72.28 1.07.13.35-.15.61-.47.68-.85l2.35-14.04c.07-.43-.07-.84-.38-1.11ZM18.3 17.22l-4.07-3a1.04 1.04 0 0 0-1.43.18l-1.77 2.2-.89-2.71 6.75-5.9c.34-.3.39-.8.11-1.15a.82.82 0 0 0-1.14-.14L8.26 12.7l-2.64-.84 14.38-5.53-1.7 10.89Z" />
      </svg>
    </a>
  )
}
