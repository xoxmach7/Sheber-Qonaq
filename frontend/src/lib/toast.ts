/**
 * Показывает простое нативное уведомление пользователю.
 * Используется для критических событий (разлогин, ошибки авторизации).
 */
export function showToast(message: string) {
  // Создаём временный элемент для уведомления
  const toast = document.createElement('div')
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #EF4444;
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: fadeIn 0.3s ease-in-out;
  `

  document.body.appendChild(toast)

  // Удаляем через 3 секунды
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-in-out'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}
