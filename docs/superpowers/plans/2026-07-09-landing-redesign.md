# Редизайн лендинга Sheber Qonaq — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать с нуля статический лендинг Sheber Qonaq (главная + FAQ) в `landing/` — светлый дизайн с фирменным градиентом, стилизованные мокапы экранов продукта, CTA-переходы в WhatsApp вместо формы регистрации.

**Architecture:** Чистый HTML/CSS/JS без сборки и без npm-зависимостей. Общие CSS-компоненты (`css/styles.css`, `css/animations.css`) переиспользуются между `index.html` и `faq.html`. Scroll-reveal анимации через `IntersectionObserver` в `js/main.js`. Деплой на Vercel уже настроен существующим `landing/vercel.json` (не трогаем).

**Tech Stack:** HTML5, CSS3 (custom properties, Grid/Flexbox, keyframe animations), vanilla JavaScript (ES6+, no build step), инлайн SVG для мокапов экранов.

---

## Дизайн-токены (использовать во всех задачах)

```css
--color-primary-50: #ECFBFF;
--color-primary-100: #D4F4FD;
--color-primary-200: #ABE8FA;
--color-primary-300: #82DCF4;
--color-primary-400: #6FD2F0;
--color-primary-500: #60CCED;
--color-primary-600: #38B0D6;
--color-primary-700: #2A8FB0;
--color-primary-800: #27758F;
--color-primary-900: #265F75;
--color-primary-950: #13404F;

--shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06);
--shadow-sheet: 0 -4px 24px rgba(0,0,0,0.1);
--shadow-nav: 0 -1px 12px rgba(0,0,0,0.04);

--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
```

Значения взяты из `frontend/tailwind.config.js` — сохраняем консистентность бренда между продуктом и лендингом.

**WhatsApp CTA-ссылка (использовать везде):** `https://wa.me/77478048183`

---

### Task 1: Базовая структура и дизайн-токены

**Files:**
- Create: `landing/css/styles.css`
- Create: `landing/index.html` (skeleton only — header/footer/hero, остальные секции пустые placeholder-комментарии для следующих задач)

- [ ] **Step 1: Создать `landing/css/styles.css` с дизайн-токенами и базовым сбросом**

```css
/* landing/css/styles.css */

:root {
  --color-primary-50: #ECFBFF;
  --color-primary-100: #D4F4FD;
  --color-primary-200: #ABE8FA;
  --color-primary-300: #82DCF4;
  --color-primary-400: #6FD2F0;
  --color-primary-500: #60CCED;
  --color-primary-600: #38B0D6;
  --color-primary-700: #2A8FB0;
  --color-primary-800: #27758F;
  --color-primary-900: #265F75;
  --color-primary-950: #13404F;

  --shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06);
  --shadow-sheet: 0 -4px 24px rgba(0,0,0,0.1);
  --shadow-nav: 0 -1px 12px rgba(0,0,0,0.04);
  --shadow-hover: 0 12px 32px rgba(38,95,117,0.16);

  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;

  --max-width: 1140px;
  --radius-lg: 20px;
  --radius-md: 14px;
  --radius-sm: 8px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans);
  color: var(--color-primary-950);
  background: #fff;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

img, svg {
  display: block;
  max-width: 100%;
}

a {
  color: inherit;
  text-decoration: none;
}

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 24px;
}

.section {
  padding: 96px 0;
}

@media (max-width: 640px) {
  .section {
    padding: 56px 0;
  }
}

h1, h2, h3 {
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

h1 { font-size: clamp(2.25rem, 5vw, 3.5rem); }
h2 { font-size: clamp(1.75rem, 3.5vw, 2.5rem); }
h3 { font-size: 1.25rem; }

.subtitle {
  color: var(--color-primary-800);
  font-size: 1.125rem;
  max-width: 640px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn:hover {
  transform: translateY(-2px);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700));
  color: #fff;
  box-shadow: var(--shadow-hover);
}

.btn-primary:hover {
  box-shadow: 0 16px 40px rgba(38,95,117,0.24);
}

.btn-ghost {
  background: transparent;
  color: var(--color-primary-900);
  border: 1.5px solid var(--color-primary-200);
}

.btn-ghost:hover {
  background: var(--color-primary-50);
}
```

- [ ] **Step 2: Создать `landing/index.html` со скелетом (header, hero-заглушка, footer)**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sheber Qonaq — учёт заездов для хостелов без хаоса</title>
  <meta name="description" content="Sheber Qonaq — сервис учёта бронирований и заездов для хостелов и гестхаусов. Замените таблицы и блокнот на систему, которая сама следит за занятостью и финансами.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
  <link rel="stylesheet" href="css/animations.css">
</head>
<body>

  <header class="site-header" id="site-header">
    <div class="container site-header__inner">
      <a href="/" class="logo">Sheber Qonaq</a>
      <nav class="site-nav">
        <a href="/faq">FAQ</a>
        <a href="https://wa.me/77478048183" class="btn btn-primary btn-sm" target="_blank" rel="noopener">Написать в WhatsApp</a>
      </nav>
    </div>
  </header>

  <main>
    <!-- HERO_SECTION -->
    <!-- HOW_IT_WORKS_SECTION -->
    <!-- SCREENS_SECTION -->
    <!-- COMPARISON_SECTION -->
    <!-- TESTIMONIALS_SECTION -->
    <!-- FINAL_CTA_SECTION -->
  </main>

  <!-- FOOTER -->

  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Открыть `landing/index.html` в браузере и проверить, что стили применяются**

Открыть файл напрямую в браузере (`file:///.../landing/index.html`) или через `npx serve landing`. Ожидается: белый фон, шрифт Inter, лого "Sheber Qonaq" и кнопка WhatsApp в шапке видны, без ошибок в консоли браузера (DevTools → Console).

- [ ] **Step 4: Commit**

```bash
git add landing/css/styles.css landing/index.html
git commit -m "Добавить базовую структуру и дизайн-токены лендинга"
```

---

### Task 2: Header со scroll-эффектом и мобильное меню

**Files:**
- Modify: `landing/css/styles.css`
- Create: `landing/js/main.js`
- Modify: `landing/index.html:` (header уже создан в Task 1 — добавить бургер-кнопку для мобильных)

- [ ] **Step 1: Добавить CSS для sticky-хедера с glassmorphism при скролле**

Добавить в конец `landing/css/styles.css`:

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: transparent;
  transition: background 0.3s ease, box-shadow 0.3s ease, backdrop-filter 0.3s ease;
}

.site-header.scrolled {
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--shadow-nav);
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76px;
}

.logo {
  font-weight: 800;
  font-size: 1.25rem;
  color: var(--color-primary-900);
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.site-nav a:not(.btn) {
  font-weight: 600;
  color: var(--color-primary-900);
  transition: color 0.2s ease;
}

.site-nav a:not(.btn):hover {
  color: var(--color-primary-600);
}

.btn-sm {
  padding: 10px 20px;
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .site-nav a:not(.btn) {
    display: none;
  }
}
```

- [ ] **Step 2: Создать `landing/js/main.js` с логикой scroll-эффекта хедера**

```js
// landing/js/main.js

const header = document.getElementById('site-header');

function updateHeaderOnScroll() {
  if (window.scrollY > 8) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', updateHeaderOnScroll, { passive: true });
updateHeaderOnScroll();
```

- [ ] **Step 3: Проверить в браузере**

Открыть `landing/index.html`, прокрутить страницу вниз (даже если контента мало — можно временно добавить `<div style="height:1200px"></div>` в `<main>` для теста, затем убрать). Ожидается: при скролле > 8px хедер получает полупрозрачный фон с блюром и тень; при возврате наверх — снова прозрачный.

- [ ] **Step 4: Commit**

```bash
git add landing/css/styles.css landing/js/main.js
git commit -m "Добавить scroll-эффект для хедера лендинга"
```

---

### Task 3: Scroll-reveal анимации (переиспользуемый механизм)

**Files:**
- Create: `landing/css/animations.css`
- Modify: `landing/js/main.js`

- [ ] **Step 1: Создать `landing/css/animations.css`**

```css
/* landing/css/animations.css */

.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

.reveal-stagger > * {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal-stagger.visible > *:nth-child(1) { transition-delay: 0s; }
.reveal-stagger.visible > *:nth-child(2) { transition-delay: 0.12s; }
.reveal-stagger.visible > *:nth-child(3) { transition-delay: 0.24s; }
.reveal-stagger.visible > *:nth-child(4) { transition-delay: 0.36s; }

.reveal-stagger.visible > * {
  opacity: 1;
  transform: translateY(0);
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-16px); }
}

.float {
  animation: float 6s ease-in-out infinite;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animated-gradient-bg {
  background-size: 200% 200%;
  animation: gradient-shift 12s ease infinite;
}

@media (prefers-reduced-motion: reduce) {
  .reveal, .reveal-stagger > *, .float, .animated-gradient-bg {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

- [ ] **Step 2: Добавить IntersectionObserver в `landing/js/main.js`**

Добавить в конец `landing/js/main.js`:

```js
const revealTargets = document.querySelectorAll('.reveal, .reveal-stagger');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach((el) => revealObserver.observe(el));
```

- [ ] **Step 3: Добавить `<link>` на `animations.css` в `landing/index.html`**

Файл уже содержит `<link rel="stylesheet" href="css/animations.css">` из Task 1 — проверить, что путь верный (Step 2 в Task 1 уже включает эту строку).

- [ ] **Step 4: Проверить в браузере**

Временно добавить в `<main>` тестовый блок `<div class="reveal" style="height:100px;background:#eee">test</div>`, прокрутить до него. Ожидается: элемент появляется с fade+slide-up при попадании в вьюпорт. Убрать тестовый блок после проверки.

- [ ] **Step 5: Commit**

```bash
git add landing/css/animations.css landing/js/main.js
git commit -m "Добавить механизм scroll-reveal анимаций"
```

---

### Task 4: Hero-секция с анимированным градиентным фоном

**Files:**
- Modify: `landing/index.html` (заменить `<!-- HERO_SECTION -->`)
- Modify: `landing/css/styles.css`

- [ ] **Step 1: Добавить CSS для hero**

Добавить в конец `landing/css/styles.css`:

```css
.hero {
  position: relative;
  overflow: hidden;
  padding: 120px 0 100px;
  background: linear-gradient(120deg, var(--color-primary-50), #fff 40%, var(--color-primary-100));
}

.hero::before,
.hero::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
  z-index: 0;
}

.hero::before {
  width: 420px;
  height: 420px;
  background: var(--color-primary-300);
  top: -120px;
  right: -80px;
}

.hero::after {
  width: 360px;
  height: 360px;
  background: var(--color-primary-400);
  bottom: -140px;
  left: -100px;
}

.hero__inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 48px;
  align-items: center;
}

@media (max-width: 900px) {
  .hero__inner {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .hero .subtitle {
    margin-left: auto;
    margin-right: auto;
  }
}

.hero__content h1 {
  margin-bottom: 20px;
}

.hero__content .subtitle {
  margin-bottom: 32px;
}

.hero__cta-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .hero__cta-row {
    justify-content: center;
  }
}

.hero__mockup-wrap {
  display: flex;
  justify-content: center;
}
```

- [ ] **Step 2: Заменить `<!-- HERO_SECTION -->` в `landing/index.html`**

```html
<section class="hero">
  <div class="container hero__inner">
    <div class="hero__content reveal">
      <h1>Учёт заездов для хостела, который больше не живёт в блокноте</h1>
      <p class="subtitle">Sheber Qonaq показывает занятость, брони и финансы вашего хостела в одном месте — без двойных заездов и забытых долгов.</p>
      <div class="hero__cta-row">
        <a href="https://wa.me/77478048183" class="btn btn-primary" target="_blank" rel="noopener">Написать в WhatsApp</a>
        <a href="/faq" class="btn btn-ghost">Как это работает</a>
      </div>
    </div>
    <div class="hero__mockup-wrap reveal">
      <div class="float" id="hero-mockup-placeholder" style="width:320px;height:320px;background:linear-gradient(135deg,var(--color-primary-200),var(--color-primary-400));border-radius:var(--radius-lg);box-shadow:var(--shadow-hover);"></div>
    </div>
  </div>
</section>
```

Примечание: `#hero-mockup-placeholder` — временный блок-заглушка, будет заменён на реальный SVG-мокап Dashboard в Task 5 (Step 4).

- [ ] **Step 3: Проверить в браузере**

Открыть `landing/index.html`. Ожидается: заголовок и подзаголовок видны, две кнопки CTA рядом, размытые цветные пятна на фоне hero, при скролле блок появляется с анимацией (уже подключено в Task 3), плейсхолдер-квадрат мягко покачивается (float-анимация).

- [ ] **Step 4: Commit**

```bash
git add landing/index.html landing/css/styles.css
git commit -m "Добавить hero-секцию с анимированным градиентным фоном"
```

---

### Task 5: SVG-мокапы экранов приложения

**Files:**
- Create: `landing/assets/mockup-dashboard.svg`
- Create: `landing/assets/mockup-occupancy.svg`
- Create: `landing/assets/mockup-finances.svg`
- Modify: `landing/index.html` (использовать `mockup-dashboard.svg` в hero вместо плейсхолдера из Task 4)

- [ ] **Step 1: Создать `landing/assets/mockup-dashboard.svg`**

Абстрактное представление дашборда: карточки-статистики сверху, псевдо-график снизу.

```svg
<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="320" rx="20" fill="#ECFBFF"/>
  <rect x="20" y="20" width="130" height="70" rx="12" fill="#fff" stroke="#ABE8FA" stroke-width="1.5"/>
  <rect x="34" y="36" width="60" height="8" rx="4" fill="#82DCF4"/>
  <rect x="34" y="52" width="90" height="14" rx="4" fill="#2A8FB0"/>
  <rect x="170" y="20" width="130" height="70" rx="12" fill="#fff" stroke="#ABE8FA" stroke-width="1.5"/>
  <rect x="184" y="36" width="60" height="8" rx="4" fill="#82DCF4"/>
  <rect x="184" y="52" width="90" height="14" rx="4" fill="#38B0D6"/>
  <rect x="20" y="106" width="280" height="194" rx="12" fill="#fff" stroke="#ABE8FA" stroke-width="1.5"/>
  <polyline points="36,260 80,220 124,240 168,180 212,200 256,150 284,170" fill="none" stroke="#60CCED" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="36" cy="260" r="5" fill="#2A8FB0"/>
  <circle cx="124" cy="240" r="5" fill="#2A8FB0"/>
  <circle cx="212" cy="200" r="5" fill="#2A8FB0"/>
  <circle cx="284" cy="170" r="5" fill="#2A8FB0"/>
  <rect x="36" y="278" width="248" height="6" rx="3" fill="#D4F4FD"/>
</svg>
```

- [ ] **Step 2: Создать `landing/assets/mockup-occupancy.svg`**

Абстрактная карта загрузки — сетка "комнаты × дни" с цветными ячейками.

```svg
<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="320" rx="20" fill="#ECFBFF"/>
  <rect x="20" y="20" width="280" height="30" rx="8" fill="#fff"/>
  <rect x="32" y="30" width="70" height="10" rx="4" fill="#265F75"/>
  <g>
    <rect x="20" y="64" width="60" height="34" rx="6" fill="#60CCED"/>
    <rect x="84" y="64" width="60" height="34" rx="6" fill="#D4F4FD"/>
    <rect x="148" y="64" width="60" height="34" rx="6" fill="#60CCED"/>
    <rect x="212" y="64" width="60" height="34" rx="6" fill="#60CCED"/>
    <rect x="20" y="102" width="60" height="34" rx="6" fill="#D4F4FD"/>
    <rect x="84" y="102" width="60" height="34" rx="6" fill="#38B0D6"/>
    <rect x="148" y="102" width="60" height="34" rx="6" fill="#D4F4FD"/>
    <rect x="212" y="102" width="60" height="34" rx="6" fill="#D4F4FD"/>
    <rect x="20" y="140" width="60" height="34" rx="6" fill="#38B0D6"/>
    <rect x="84" y="140" width="60" height="34" rx="6" fill="#60CCED"/>
    <rect x="148" y="140" width="60" height="34" rx="6" fill="#38B0D6"/>
    <rect x="212" y="140" width="60" height="34" rx="6" fill="#D4F4FD"/>
    <rect x="20" y="178" width="60" height="34" rx="6" fill="#60CCED"/>
    <rect x="84" y="178" width="60" height="34" rx="6" fill="#D4F4FD"/>
    <rect x="148" y="178" width="60" height="34" rx="6" fill="#60CCED"/>
    <rect x="212" y="178" width="60" height="34" rx="6" fill="#38B0D6"/>
  </g>
  <rect x="20" y="230" width="14" height="14" rx="4" fill="#60CCED"/>
  <rect x="44" y="230" width="60" height="10" rx="4" fill="#ABE8FA"/>
  <rect x="120" y="230" width="14" height="14" rx="4" fill="#D4F4FD"/>
  <rect x="144" y="230" width="60" height="10" rx="4" fill="#ABE8FA"/>
</svg>
```

- [ ] **Step 3: Создать `landing/assets/mockup-finances.svg`**

Абстрактный финансовый экран — список строк-транзакций с суммами и мини-диаграмма.

```svg
<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="320" rx="20" fill="#ECFBFF"/>
  <circle cx="80" cy="80" r="46" fill="none" stroke="#D4F4FD" stroke-width="16"/>
  <circle cx="80" cy="80" r="46" fill="none" stroke="#60CCED" stroke-width="16" stroke-dasharray="180 289" stroke-linecap="round" transform="rotate(-90 80 80)"/>
  <rect x="150" y="56" width="130" height="10" rx="5" fill="#2A8FB0"/>
  <rect x="150" y="76" width="90" height="8" rx="4" fill="#ABE8FA"/>
  <g>
    <rect x="20" y="152" width="280" height="36" rx="8" fill="#fff" stroke="#D4F4FD" stroke-width="1.5"/>
    <rect x="34" y="166" width="90" height="8" rx="4" fill="#265F75"/>
    <rect x="240" y="166" width="46" height="8" rx="4" fill="#38B0D6"/>

    <rect x="20" y="196" width="280" height="36" rx="8" fill="#fff" stroke="#D4F4FD" stroke-width="1.5"/>
    <rect x="34" y="210" width="70" height="8" rx="4" fill="#265F75"/>
    <rect x="240" y="210" width="46" height="8" rx="4" fill="#38B0D6"/>

    <rect x="20" y="240" width="280" height="36" rx="8" fill="#fff" stroke="#D4F4FD" stroke-width="1.5"/>
    <rect x="34" y="254" width="110" height="8" rx="4" fill="#265F75"/>
    <rect x="240" y="254" width="46" height="8" rx="4" fill="#38B0D6"/>
  </g>
</svg>
```

- [ ] **Step 4: Заменить hero-плейсхолдер на реальный SVG-мокап**

В `landing/index.html` заменить блок `#hero-mockup-placeholder` (добавлен в Task 4):

```html
<div class="hero__mockup-wrap reveal">
  <img src="assets/mockup-dashboard.svg" alt="Дашборд Sheber Qonaq" class="float" style="width:320px;box-shadow:var(--shadow-hover);border-radius:var(--radius-lg);">
</div>
```

- [ ] **Step 5: Проверить в браузере**

Открыть каждый SVG-файл напрямую в браузере (`file:///.../landing/assets/mockup-dashboard.svg` и т.д.) — убедиться, что рендерится без ошибок парсинга. Затем открыть `landing/index.html` — в hero должен отображаться дашборд-мокап вместо голубого квадрата.

- [ ] **Step 6: Commit**

```bash
git add landing/assets/ landing/index.html
git commit -m "Добавить SVG-мокапы экранов приложения"
```

---

### Task 6: Секция "Как это работает" (3 шага)

**Files:**
- Modify: `landing/index.html` (заменить `<!-- HOW_IT_WORKS_SECTION -->`)
- Modify: `landing/css/styles.css`

- [ ] **Step 1: Добавить CSS для секции шагов**

```css
.steps {
  background: #fff;
}

.steps__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-top: 56px;
}

@media (max-width: 800px) {
  .steps__grid {
    grid-template-columns: 1fr;
  }
}

.step-card {
  background: var(--color-primary-50);
  border-radius: var(--radius-lg);
  padding: 32px;
  text-align: center;
}

.step-card__number {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.25rem;
  margin: 0 auto 20px;
}

.step-card h3 {
  margin-bottom: 12px;
}

.step-card p {
  color: var(--color-primary-800);
}
```

- [ ] **Step 2: Заменить `<!-- HOW_IT_WORKS_SECTION -->` в `landing/index.html`**

```html
<section class="section steps">
  <div class="container">
    <h2 class="reveal">Как это работает</h2>
    <p class="subtitle reveal">От регистрации до первой брони — меньше 10 минут, без звонков и настройки.</p>
    <div class="steps__grid reveal-stagger">
      <div class="step-card">
        <div class="step-card__number">1</div>
        <h3>Зарегистрировался</h3>
        <p>Оставляете заявку в WhatsApp — мы создаём аккаунт и присылаем доступ.</p>
      </div>
      <div class="step-card">
        <div class="step-card__number">2</div>
        <h3>Добавил объект</h3>
        <p>Заносите комнаты, домики или койко-места — до 20 юнитов бесплатно.</p>
      </div>
      <div class="step-card">
        <div class="step-card__number">3</div>
        <h3>Ведёшь учёт</h3>
        <p>Брони, гости и финансы — в одном месте, без таблиц и путаницы.</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Проверить в браузере**

Прокрутить до секции. Ожидается: три карточки с номерами 1/2/3 появляются последовательно с задержкой (stagger-анимация из Task 3), на мобильной ширине (< 800px) складываются в столбец.

- [ ] **Step 4: Commit**

```bash
git add landing/index.html landing/css/styles.css
git commit -m "Добавить секцию 'Как это работает'"
```

---

### Task 7: Секция мокапов экранов приложения

**Files:**
- Modify: `landing/index.html` (заменить `<!-- SCREENS_SECTION -->`)
- Modify: `landing/css/styles.css`

- [ ] **Step 1: Добавить CSS для секции экранов**

```css
.screens {
  background: linear-gradient(180deg, #fff, var(--color-primary-50));
}

.screens__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  margin-top: 56px;
}

@media (max-width: 900px) {
  .screens__grid {
    grid-template-columns: 1fr;
  }
}

.screen-card {
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-card);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.screen-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-hover);
}

.screen-card img {
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}

.screen-card h3 {
  margin-bottom: 8px;
}

.screen-card p {
  color: var(--color-primary-800);
  font-size: 0.95rem;
}
```

- [ ] **Step 2: Заменить `<!-- SCREENS_SECTION -->` в `landing/index.html`**

```html
<section class="section screens">
  <div class="container">
    <h2 class="reveal">Экраны приложения</h2>
    <p class="subtitle reveal">Всё, что нужно для управления хостелом, — без переключения между вкладками и файлами.</p>
    <div class="screens__grid reveal-stagger">
      <div class="screen-card">
        <img src="assets/mockup-dashboard.svg" alt="Дашборд с ключевыми показателями">
        <h3>Дашборд</h3>
        <p>Загрузка, доход и активные брони — на одном экране в реальном времени.</p>
      </div>
      <div class="screen-card">
        <img src="assets/mockup-occupancy.svg" alt="Карта загрузки номеров">
        <h3>Карта загрузки</h3>
        <p>Видно, какие комнаты свободны, а какие заняты — на любую дату вперёд.</p>
      </div>
      <div class="screen-card">
        <img src="assets/mockup-finances.svg" alt="Финансовый учёт">
        <h3>Финансы</h3>
        <p>Оплаты, долги и остатки считаются автоматически, без ручных таблиц.</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Проверить в браузере**

Прокрутить до секции. Ожидается: три карточки с мокапами, при наведении курсора карточка приподнимается и тень усиливается.

- [ ] **Step 4: Commit**

```bash
git add landing/index.html landing/css/styles.css
git commit -m "Добавить секцию экранов приложения"
```

---

### Task 8: Секция сравнения с Excel/блокнотом

**Files:**
- Modify: `landing/index.html` (заменить `<!-- COMPARISON_SECTION -->`)
- Modify: `landing/css/styles.css`

- [ ] **Step 1: Добавить CSS для секции сравнения**

```css
.comparison {
  background: #fff;
}

.comparison__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 56px;
}

@media (max-width: 700px) {
  .comparison__grid {
    grid-template-columns: 1fr;
  }
}

.comparison__col {
  border-radius: var(--radius-lg);
  padding: 32px;
}

.comparison__col--before {
  background: #F7F5F0;
  border: 1.5px dashed #D8D2C4;
}

.comparison__col--after {
  background: linear-gradient(160deg, var(--color-primary-50), var(--color-primary-100));
  border: 1.5px solid var(--color-primary-200);
}

.comparison__col h3 {
  margin-bottom: 20px;
}

.comparison__col ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comparison__col li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: var(--color-primary-950);
}

.comparison__icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 800;
  color: #fff;
}

.comparison__col--before .comparison__icon {
  background: #B8AF9A;
}

.comparison__col--after .comparison__icon {
  background: var(--color-primary-600);
}
```

- [ ] **Step 2: Заменить `<!-- COMPARISON_SECTION -->` в `landing/index.html`**

```html
<section class="section comparison">
  <div class="container">
    <h2 class="reveal">Sheber Qonaq вместо таблиц и блокнота</h2>
    <p class="subtitle reveal">То же самое, что вы делаете вручную сейчас, — но без риска ошибиться и потерять данные.</p>
    <div class="comparison__grid reveal-stagger">
      <div class="comparison__col comparison__col--before">
        <h3>Вручную в таблицах</h3>
        <ul>
          <li><span class="comparison__icon">✕</span> Двойные брони на одну комнату по невнимательности</li>
          <li><span class="comparison__icon">✕</span> Долги гостей считаются в уме или в отдельном файле</li>
          <li><span class="comparison__icon">✕</span> Данные теряются, если файл случайно удалили или испортили</li>
          <li><span class="comparison__icon">✕</span> Загрузку по датам нужно пересчитывать вручную</li>
          <li><span class="comparison__icon">✕</span> Каждый сотрудник ведёт запись по-своему</li>
        </ul>
      </div>
      <div class="comparison__col comparison__col--after">
        <h3>В Sheber Qonaq</h3>
        <ul>
          <li><span class="comparison__icon">✓</span> Система сама проверяет пересечение дат при новой брони</li>
          <li><span class="comparison__icon">✓</span> Долги и оплаты считаются автоматически по каждому гостю</li>
          <li><span class="comparison__icon">✓</span> Данные хранятся в облаке — доступны с любого устройства</li>
          <li><span class="comparison__icon">✓</span> Карта загрузки строится сама на любую дату</li>
          <li><span class="comparison__icon">✓</span> Единый формат учёта для всех сотрудников</li>
        </ul>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Проверить в браузере**

Прокрутить до секции. Ожидается: две колонки рядом (на мобильном — один под другим), слева нейтрально-бежевая колонка с крестиками, справа — голубая с галочками.

- [ ] **Step 4: Commit**

```bash
git add landing/index.html landing/css/styles.css
git commit -m "Добавить секцию сравнения с ручным учётом"
```

---

### Task 9: Секция отзывов-заглушки

**Files:**
- Modify: `landing/index.html` (заменить `<!-- TESTIMONIALS_SECTION -->`)
- Modify: `landing/css/styles.css`

- [ ] **Step 1: Добавить CSS для секции отзывов**

```css
.testimonials {
  background: var(--color-primary-50);
}

.testimonials__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 56px;
}

@media (max-width: 900px) {
  .testimonials__grid {
    grid-template-columns: 1fr;
  }
}

.testimonial-card {
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-card);
}

.testimonial-card__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-200), var(--color-primary-400));
  margin-bottom: 16px;
}

.testimonial-card__quote {
  color: var(--color-primary-800);
  font-size: 0.95rem;
  margin-bottom: 16px;
  font-style: italic;
}

.testimonial-card__name {
  font-weight: 700;
  font-size: 0.9rem;
}

.testimonial-card__role {
  font-size: 0.85rem;
  color: var(--color-primary-600);
}
```

- [ ] **Step 2: Заменить `<!-- TESTIMONIALS_SECTION -->` в `landing/index.html`**

```html
<section class="section testimonials">
  <div class="container">
    <h2 class="reveal">Что говорят хостелы</h2>
    <p class="subtitle reveal">Реальные отзывы клиентов появятся здесь по мере подключения — сейчас это место для первых историй.</p>
    <div class="testimonials__grid reveal-stagger">
      <div class="testimonial-card">
        <div class="testimonial-card__avatar"></div>
        <p class="testimonial-card__quote">«Место для отзыва владельца хостела о том, как изменился учёт после перехода на Sheber Qonaq.»</p>
        <div class="testimonial-card__name">Название хостела</div>
        <div class="testimonial-card__role">Город</div>
      </div>
      <div class="testimonial-card">
        <div class="testimonial-card__avatar"></div>
        <p class="testimonial-card__quote">«Место для отзыва о конкретной проблеме, которую решил сервис — например, двойные брони или забытые долги.»</p>
        <div class="testimonial-card__name">Название хостела</div>
        <div class="testimonial-card__role">Город</div>
      </div>
      <div class="testimonial-card">
        <div class="testimonial-card__avatar"></div>
        <p class="testimonial-card__quote">«Место для отзыва о простоте перехода и поддержке команды Sheber Qonaq.»</p>
        <div class="testimonial-card__name">Название хостела</div>
        <div class="testimonial-card__role">Город</div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Проверить в браузере**

Прокрутить до секции. Ожидается: три карточки с плейсхолдер-аватарами (цветные кружки) и текстом, явно читаемым как место под будущий контент, а не как настоящий отзыв.

- [ ] **Step 4: Commit**

```bash
git add landing/index.html landing/css/styles.css
git commit -m "Добавить секцию отзывов-заглушку"
```

---

### Task 10: Финальный CTA и футер

**Files:**
- Modify: `landing/index.html` (заменить `<!-- FINAL_CTA_SECTION -->` и `<!-- FOOTER -->`)
- Modify: `landing/css/styles.css`

- [ ] **Step 1: Добавить CSS для финального CTA и футера**

```css
.final-cta {
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-900));
  color: #fff;
  text-align: center;
}

.final-cta h2 {
  color: #fff;
  margin-bottom: 16px;
}

.final-cta .subtitle {
  color: var(--color-primary-100);
  margin: 0 auto 32px;
}

.final-cta .btn-primary {
  background: #fff;
  color: var(--color-primary-900);
  box-shadow: 0 12px 32px rgba(0,0,0,0.2);
}

.final-cta .btn-primary:hover {
  box-shadow: 0 16px 40px rgba(0,0,0,0.28);
}

.site-footer {
  background: var(--color-primary-950);
  color: var(--color-primary-100);
  padding: 48px 0;
}

.site-footer__inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.site-footer a {
  color: var(--color-primary-100);
  font-weight: 600;
}

.site-footer a:hover {
  color: #fff;
}

.site-footer__links {
  display: flex;
  gap: 24px;
}

.site-footer__copy {
  font-size: 0.85rem;
  color: var(--color-primary-300);
}
```

- [ ] **Step 2: Заменить `<!-- FINAL_CTA_SECTION -->` в `landing/index.html`**

```html
<section class="section final-cta">
  <div class="container reveal">
    <h2>Готовы навести порядок в заездах?</h2>
    <p class="subtitle">Напишите нам в WhatsApp — за 10 минут разберёмся, подойдёт ли Sheber Qonaq вашему объекту.</p>
    <a href="https://wa.me/77478048183" class="btn btn-primary" target="_blank" rel="noopener">Написать в WhatsApp</a>
  </div>
</section>
```

- [ ] **Step 3: Заменить `<!-- FOOTER -->` в `landing/index.html`**

```html
<footer class="site-footer">
  <div class="container site-footer__inner">
    <div>
      <div class="logo" style="color:#fff;margin-bottom:8px;">Sheber Qonaq</div>
      <div class="site-footer__copy">© 2026 Sheber Qonaq. Все права защищены.</div>
    </div>
    <div class="site-footer__links">
      <a href="/faq">FAQ</a>
      <a href="https://wa.me/77478048183" target="_blank" rel="noopener">+7 747 804 8183</a>
    </div>
  </div>
</footer>
```

- [ ] **Step 4: Проверить в браузере**

Прокрутить страницу до конца. Ожидается: яркая градиентная CTA-секция перед футером, тёмный футер с логотипом, ссылкой на FAQ и WhatsApp-контактом. Кликнуть по кнопке WhatsApp — должна открыть `https://wa.me/77478048183` в новой вкладке.

- [ ] **Step 5: Commit**

```bash
git add landing/index.html landing/css/styles.css
git commit -m "Добавить финальный CTA и футер лендинга"
```

---

### Task 11: Страница FAQ

**Files:**
- Create: `landing/faq.html`
- Modify: `landing/css/styles.css`
- Modify: `landing/js/main.js`

- [ ] **Step 1: Добавить CSS для аккордеона FAQ**

```css
.faq-hero {
  background: linear-gradient(120deg, var(--color-primary-50), #fff);
  padding: 80px 0 40px;
  text-align: center;
}

.faq-list {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.faq-item {
  background: #fff;
  border: 1.5px solid var(--color-primary-100);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.faq-item__question {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 1.05rem;
  text-align: left;
  cursor: pointer;
  color: var(--color-primary-950);
}

.faq-item__icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  transition: transform 0.3s ease, background 0.3s ease;
}

.faq-item.open .faq-item__icon {
  transform: rotate(45deg);
  background: var(--color-primary-500);
  color: #fff;
}

.faq-item__answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.35s ease;
}

.faq-item__answer p {
  padding: 0 24px 20px;
  color: var(--color-primary-800);
  line-height: 1.6;
}
```

- [ ] **Step 2: Создать `landing/faq.html`**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FAQ — Sheber Qonaq</title>
  <meta name="description" content="Частые вопросы о регистрации, бесплатном периоде и тарифах Sheber Qonaq.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
  <link rel="stylesheet" href="css/animations.css">
</head>
<body>

  <header class="site-header" id="site-header">
    <div class="container site-header__inner">
      <a href="/" class="logo">Sheber Qonaq</a>
      <nav class="site-nav">
        <a href="/faq">FAQ</a>
        <a href="https://wa.me/77478048183" class="btn btn-primary btn-sm" target="_blank" rel="noopener">Написать в WhatsApp</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="faq-hero">
      <div class="container reveal">
        <h1>Частые вопросы</h1>
        <p class="subtitle" style="margin:16px auto 0;">Всё о регистрации, бесплатном периоде и переходе на платный тариф.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="faq-list reveal-stagger">
          <div class="faq-item">
            <button class="faq-item__question" aria-expanded="false">
              Как зарегистрироваться?
              <span class="faq-item__icon">+</span>
            </button>
            <div class="faq-item__answer">
              <p>Оставьте заявку в WhatsApp, указав email, пароль и название вашего объекта (хостела, гостевого дома или бани). Мы отправим письмо со ссылкой подтверждения — перейдите по ней, и аккаунт будет создан автоматически. Вы сразу попадёте в систему.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-item__question" aria-expanded="false">
              Что входит в бесплатный период?
              <span class="faq-item__icon">+</span>
            </button>
            <div class="faq-item__answer">
              <p>30 дней полного доступа: неограниченное количество бронирований, до 20 комнат/юнитов на один объект, все основные функции — карта размещения, гости, финансы, отчёты.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-item__question" aria-expanded="false">
              Есть ли ограничения на бесплатном периоде?
              <span class="faq-item__icon">+</span>
            </button>
            <div class="faq-item__answer">
              <p>Да — один объект размещения на одну регистрацию и максимум 20 юнитов (комнат, домиков или койко-мест) в этом объекте. Это защита от злоупотреблений; если вам нужно больше — напишите нам, обсудим индивидуальные условия.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-item__question" aria-expanded="false">
              Что будет через 30 дней?
              <span class="faq-item__icon">+</span>
            </button>
            <div class="faq-item__answer">
              <p>Если вы не подключите платную подписку, аккаунт перейдёт в режим «только просмотр»: вся история броней, гостей и финансов останется доступна, но создавать и редактировать новые записи будет нельзя, пока не оформите подписку.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-item__question" aria-expanded="false">
              Как оформить платную подписку?
              <span class="faq-item__icon">+</span>
            </button>
            <div class="faq-item__answer">
              <p>Напишите нам в WhatsApp — мы поможем подобрать тариф под ваш объект и снимем ограничение бесплатного периода.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-item__question" aria-expanded="false">
              Не пришло письмо с подтверждением
              <span class="faq-item__icon">+</span>
            </button>
            <div class="faq-item__answer">
              <p>Проверьте папку «Спам». Ссылка действительна 24 часа — если она устарела, напишите нам в WhatsApp, поможем зарегистрироваться заново.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-item__question" aria-expanded="false">
              Можно ли зарегистрировать несколько объектов на один email?
              <span class="faq-item__icon">+</span>
            </button>
            <div class="faq-item__answer">
              <p>На данный момент — нет, одна регистрация создаёт один объект. Если у вас несколько объектов, напишите нам, поможем настроить multi-property доступ вручную.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section final-cta">
      <div class="container reveal">
        <h2>Остались вопросы?</h2>
        <p class="subtitle">Напишите нам в WhatsApp — ответим и поможем разобраться за 10 минут.</p>
        <a href="https://wa.me/77478048183" class="btn btn-primary" target="_blank" rel="noopener">Написать в WhatsApp</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container site-footer__inner">
      <div>
        <div class="logo" style="color:#fff;margin-bottom:8px;">Sheber Qonaq</div>
        <div class="site-footer__copy">© 2026 Sheber Qonaq. Все права защищены.</div>
      </div>
      <div class="site-footer__links">
        <a href="/">На главную</a>
        <a href="https://wa.me/77478048183" target="_blank" rel="noopener">+7 747 804 8183</a>
      </div>
    </div>
  </footer>

  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Добавить логику аккордеона в `landing/js/main.js`**

Добавить в конец `landing/js/main.js`:

```js
const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach((item) => {
  const question = item.querySelector('.faq-item__question');
  const answer = item.querySelector('.faq-item__answer');
  const answerContent = answer.querySelector('p');

  question.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');

    faqItems.forEach((other) => {
      if (other !== item) {
        other.classList.remove('open');
        other.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
        other.querySelector('.faq-item__answer').style.maxHeight = null;
      }
    });

    if (isOpen) {
      item.classList.remove('open');
      question.setAttribute('aria-expanded', 'false');
      answer.style.maxHeight = null;
    } else {
      item.classList.add('open');
      question.setAttribute('aria-expanded', 'true');
      answer.style.maxHeight = answerContent.offsetHeight + 40 + 'px';
    }
  });
});
```

- [ ] **Step 4: Проверить в браузере**

Открыть `landing/faq.html`. Ожидается: 7 вопросов в виде закрытых аккордеонов, при клике на вопрос он плавно раскрывается (иконка `+` поворачивается в `×`), при клике на другой вопрос предыдущий закрывается. Проверить на мобильной ширине (DevTools → Toggle device toolbar), что текст не обрезается.

- [ ] **Step 5: Commit**

```bash
git add landing/faq.html landing/css/styles.css landing/js/main.js
git commit -m "Добавить страницу FAQ с аккордеоном"
```

---

### Task 12: Мобильное меню в хедере

**Files:**
- Modify: `landing/index.html`
- Modify: `landing/faq.html`
- Modify: `landing/css/styles.css`
- Modify: `landing/js/main.js`

Task 2 скрыл ссылку "FAQ" на мобильной ширине (`display:none` для `.site-nav a:not(.btn)`), оставив только кнопку WhatsApp. Этого достаточно для CTA, но ссылка на FAQ должна быть доступна с мобильных — добавляем компактное бургер-меню.

- [ ] **Step 1: Добавить CSS для мобильного меню**

Добавить в конец `landing/css/styles.css`:

```css
.burger {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.burger span {
  width: 22px;
  height: 2px;
  background: var(--color-primary-900);
  border-radius: 2px;
}

.mobile-menu {
  display: none;
  flex-direction: column;
  gap: 16px;
  padding: 16px 24px 24px;
  background: rgba(255,255,255,0.98);
  backdrop-filter: blur(12px);
}

.mobile-menu.open {
  display: flex;
}

.mobile-menu a {
  font-weight: 600;
  color: var(--color-primary-900);
  padding: 8px 0;
}

@media (max-width: 640px) {
  .burger {
    display: flex;
  }
  .site-nav .btn {
    display: none;
  }
}
```

- [ ] **Step 2: Обновить header в `landing/index.html` и `landing/faq.html`**

Заменить `<header class="site-header" id="site-header">...</header>` в обоих файлах на:

```html
<header class="site-header" id="site-header">
  <div class="container site-header__inner">
    <a href="/" class="logo">Sheber Qonaq</a>
    <nav class="site-nav">
      <a href="/faq">FAQ</a>
      <a href="https://wa.me/77478048183" class="btn btn-primary btn-sm" target="_blank" rel="noopener">Написать в WhatsApp</a>
    </nav>
    <button class="burger" id="burger-btn" aria-label="Открыть меню">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="mobile-menu" id="mobile-menu">
    <a href="/faq">FAQ</a>
    <a href="https://wa.me/77478048183" class="btn btn-primary btn-sm" target="_blank" rel="noopener">Написать в WhatsApp</a>
  </div>
</header>
```

- [ ] **Step 3: Добавить логику переключения меню в `landing/js/main.js`**

Добавить в конец `landing/js/main.js`:

```js
const burgerBtn = document.getElementById('burger-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (burgerBtn && mobileMenu) {
  burgerBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
    });
  });
}
```

- [ ] **Step 4: Проверить в браузере**

Открыть DevTools → Toggle device toolbar (мобильная ширина < 640px) на `landing/index.html` и `landing/faq.html`. Ожидается: кнопка-бургер видна вместо ссылки "FAQ" и кнопки WhatsApp, при клике раскрывается меню с обоими пунктами, при клике на пункт меню закрывается.

- [ ] **Step 5: Commit**

```bash
git add landing/index.html landing/faq.html landing/css/styles.css landing/js/main.js
git commit -m "Добавить мобильное меню в хедер"
```

---

### Task 13: Финальная проверка и деплой

**Files:** нет новых/изменённых файлов — только верификация.

- [ ] **Step 1: Полная визуальная проверка главной страницы**

Открыть `landing/index.html` в браузере на десктопной ширине, прокрутить сверху вниз через все секции: hero → как это работает → экраны → сравнение → отзывы → финальный CTA → футер. Убедиться, что все reveal-анимации срабатывают, нет наложений элементов, нет горизонтального скролла.

- [ ] **Step 2: Полная визуальная проверка FAQ**

Открыть `landing/faq.html`, раскрыть каждый из 7 вопросов по очереди, проверить, что предыдущий закрывается при открытии следующего.

- [ ] **Step 3: Проверка на мобильной ширине**

DevTools → Toggle device toolbar, выбрать профиль iPhone SE или аналогичный (375px). Пройти обе страницы, проверить бургер-меню, отсутствие горизонтального скролла, читаемость текста.

- [ ] **Step 4: Проверка всех ссылок**

Проверить, что все кнопки/ссылки "Написать в WhatsApp" ведут на `https://wa.me/77478048183`, ссылка "FAQ" в хедере/футере ведёт на `/faq`, ссылка "На главную" на FAQ-странице ведёт на `/`.

- [ ] **Step 5: Проверка консоли браузера**

Открыть DevTools → Console на обеих страницах — не должно быть ошибок JS или 404 на ресурсы (шрифты, CSS, JS, SVG).

- [ ] **Step 6: Commit финальных правок (если были найдены проблемы)**

```bash
git add landing/
git commit -m "Финальные правки лендинга по итогам проверки"
```

Если проблем не найдено — этот шаг пропускается, предыдущие коммиты уже полные.

- [ ] **Step 7: Push в main**

```bash
git push origin main
```

Vercel автоматически задеплоит `landing/` по существующей конфигурации (`landing/vercel.json`). Проверить деплой в Vercel dashboard после пуша.

---

## Итоговая структура файлов

```
landing/
  index.html
  faq.html
  css/
    styles.css
    animations.css
  js/
    main.js
  assets/
    mockup-dashboard.svg
    mockup-occupancy.svg
    mockup-finances.svg
  vercel.json   (существующий, не изменён)
```
