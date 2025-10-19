// Lightweight modal explaining that menu access requires a subscription. Used
// in places where we do not show the full paywall.
export default function SubscriptionModal({ open, onClose }) {
  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" className="sub-modal">
      <div className="sub-modal__card">
        <h3>Меню доступно по подписке</h3>
        <p>Ты сможешь смотреть КБЖУ и состав блюд в любом ресторане.</p>
        <ul className="sub-modal__bullets">
          <li>Осознанный выбор даже в ресторане</li>
          <li>Экономия времени — всё меню в одном месте</li>
          <li>Фильтры: много белка, мало жиров, калории</li>
        </ul>
        <button className="btn" onClick={onClose}>Ок</button>
      </div>
      {/* Inline styles keep this component fully self-contained for the MVP. */}
      <style>{`
        .sub-modal{position:fixed;inset:0;background:rgba(0,0,0,.4);display:grid;place-items:center;z-index:1000}
        .sub-modal__card{background:#fff;max-width:420px;width:92%;border-radius:16px;padding:20px;border:1px solid #e5e7eb}
        .sub-modal__bullets{margin:10px 0 16px 18px}
        .btn{padding:10px 14px;border-radius:10px;background:#0ea5e9;color:#fff;border:0;cursor:pointer}
      `}</style>
    </div>
  )
}
