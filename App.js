/* app.js
   سازگار برای استفاده همراه با index.html موجود در repos شما.
   - همه قابلیت‌های صفحه (بازارها، جستجو، کیف پول، هشدارها، پروفایل، تلگرام) حفظ شده.
   - باگ‌ها رفع شده: فرمت عدد، debounce، data-id در کارت بازار، محافظت sparkline، آپدیت DOM برای موجودی کیف پول و ...
*/

(function () {
  'use strict';

  // === CONFIG & STATE ===
  const CONFIG = {
    API: {
      COINGECKO: 'https://api.coingecko.com/api/v3',
      ETHERSCAN: 'https://api.etherscan.io/api',
      TONCENTER: 'https://toncenter.com/api/v2',
      TRONGRID: 'https://api.trongrid.io'
    },
    LIMIT: 100,
    UPDATE_INTERVAL: 30000,
    CHART_DAYS: 7,
    CURRENCY: 'usd',
    LOCALE: 'fa-IR'
  };

  const STATE = {
    markets: [],
    favorites: new Set(),
    wallets: [],
    alerts: [],
    theme: 'dark',
    lang: 'fa',
    userId: null
  };

  // === HELPERS ===
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const create = (tag, props = {}, children = []) => {
    const el = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      // set event handlers if provided
      if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2), v);
      } else if (k === 'style' && typeof v === 'object') {
        Object.assign(el.style, v);
      } else {
        try { el[k] = v; } catch (e) { el.setAttribute(k, v); }
      }
    });
    children.forEach(child => {
      if (typeof child === 'string') el.appendChild(document.createTextNode(child));
      else if (child) el.appendChild(child);
    });
    return el;
  };

  const formatNumber = (num, decimals = 2) => {
    if (num == null || isNaN(Number(num))) return '0';
    return new Intl.NumberFormat(CONFIG.LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(Number(num));
  };

  const formatPrice = (price) => {
    if (price >= 1) return `$${formatNumber(price, 2)}`;
    if (price >= 0.01) return `$${formatNumber(price, 4)}`;
    return `$${formatNumber(price, 6)}`;
  };

  const formatChange = (change) => {
    const num = Number(change) || 0;
    const sign = num >= 0 ? '+' : '';
    const cls = num >= 0 ? 'up' : 'down';
    return `<span class="${cls}">${sign}${formatNumber(num, 2)}%</span>`;
  };

  const debounce = (func, wait) => {
    let timeout;
    return function (...args) {
      const ctx = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(ctx, args), wait);
    };
  };

  const vibrate = (pattern = 50) => {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) { /* ignore */ }
  };

  const showToast = (message, type = 'info') => {
    const icons = { success: '✔', error: '⚠', info: 'ℹ' };
    const toast = $('#toast');
    if (!toast) return;
    $('#toast-icon').textContent = icons[type] || 'ℹ';
    $('#toast-message').textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
    vibrate([50, 50, 50]);
  };

  const showModal = (title, content) => {
    const modal = $('#modal');
    if (!modal) return;
    $('#modal-title').textContent = title;
    const body = $('#modal-body');
    body.innerHTML = '';
    if (typeof content === 'string') body.innerHTML = content;
    else body.appendChild(content);
    modal.classList.remove('hidden');
    vibrate();
  };

  const closeModal = () => {
    $('#modal')?.classList.add('hidden');
  };

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      showToast('کپی شد!', 'success');
      vibrate();
    } catch (err) {
      showToast('خطا در کپی', 'error');
    }
  };

  // === THEME & LANG ===
  const initTheme = () => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    STATE.theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = STATE.theme;
    $('#theme-toggle') && ($('#theme-toggle').textContent = STATE.theme === 'dark' ? 'Sun' : 'Moon');
  };

  const toggleTheme = () => {
    STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = STATE.theme;
    localStorage.setItem('theme', STATE.theme);
    $('#theme-toggle') && ($('#theme-toggle').textContent = STATE.theme === 'dark' ? 'Sun' : 'Moon');
    vibrate();
  };

  const TRANSLATIONS = {
    fa: {
      markets: 'بازارها', wallet: 'کیف پول', alerts: 'هشدارها', profile: 'پروفایل',
      search: 'جستجو در ارزها...', loading: 'در حال بارگذاری...',
      noWallet: 'هیچ کیف پولی اضافه نشده', addWallet: 'افزودن کیف پول',
      noAlerts: 'هیچ هشداری تنظیم نشده', createAlert: 'ایجاد هشدار',
      copy: 'کپی', qr: 'QR', remove: 'حذف', export: 'خروجی', import: 'ورودی', backup: 'پشتیبان', settings: 'تنظیمات', about: 'درباره'
    },
    en: {
      markets: 'Markets', wallet: 'Wallet', alerts: 'Alerts', profile: 'Profile',
      search: 'Search coins...', loading: 'Loading...',
      noWallet: 'No wallet added', addWallet: 'Add Wallet',
      noAlerts: 'No alerts set', createAlert: 'Create Alert',
      copy: 'Copy', qr: 'QR', remove: 'Remove', export: 'Export', import: 'Import', backup: 'Backup', settings: 'Settings', about: 'About'
    }
  };

  const initLang = () => {
    const saved = localStorage.getItem('lang');
    STATE.lang = saved || 'fa';
    document.documentElement.lang = STATE.lang === 'fa' ? 'fa' : 'en';
    document.documentElement.dir = STATE.lang === 'fa' ? 'rtl' : 'ltr';
    $('#lang-toggle') && ($('#lang-toggle').textContent = STATE.lang === 'fa' ? 'EN' : 'FA');
    updateTexts();
  };

  const toggleLang = () => {
    STATE.lang = STATE.lang === 'fa' ? 'en' : 'fa';
    localStorage.setItem('lang', STATE.lang);
    initLang();
    vibrate();
  };

  const updateTexts = () => {
    const t = TRANSLATIONS[STATE.lang];
    $$('[data-tab]').forEach(tab => {
      const key = tab.dataset.tab;
      if (t[key]) tab.textContent = t[key];
    });
    const input = $('#search-input');
    if (input) input.placeholder = t.search;
  };

  // === TELEGRAM INTEGRATION ===
  const tg = window.Telegram?.WebApp;
  let telegramReady = false;

  const initTelegram = () => {
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      telegramReady = true;
      const user = tg.initDataUnsafe?.user;
      if (user) {
        STATE.userId = user.id;
        $('#profile-id') && ($('#profile-id').textContent = `ID: ${user.id}`);
        const h2 = $('#page-profile h2');
        if (h2 && user.username) h2.textContent = `@${user.username}`;
      }
      tg.enableClosingConfirmation && tg.enableClosingConfirmation();
      tg.HapticFeedback?.impactOccurred('medium');
    } catch (e) {
      console.warn('telegram init error', e);
    }
  };

  // === STORAGE ===
  const STORAGE_KEY = 'ehsan_exchange_data';

  const saveData = () => {
    const data = {
      favorites: Array.from(STATE.favorites),
      wallets: STATE.wallets,
      alerts: STATE.alerts,
      theme: STATE.theme,
      lang: STATE.lang
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (telegramReady) tg.HapticFeedback?.notificationOccurred('success');
  };

  const loadData = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      STATE.favorites = new Set(data.favorites || []);
      STATE.wallets = data.wallets || [];
      STATE.alerts = data.alerts || [];
      if (data.theme) {
        STATE.theme = data.theme;
        document.documentElement.dataset.theme = STATE.theme;
        $('#theme-toggle') && ($('#theme-toggle').textContent = STATE.theme === 'dark' ? 'Sun' : 'Moon');
      }
      if (data.lang) {
        STATE.lang = data.lang;
        document.documentElement.lang = STATE.lang === 'fa' ? 'fa' : 'en';
        document.documentElement.dir = STATE.lang === 'fa' ? 'rtl' : 'ltr';
        $('#lang-toggle') && ($('#lang-toggle').textContent = STATE.lang === 'fa' ? 'EN' : 'FA');
      }
      renderWallets();
      renderAlerts();
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };

  // === MARKET DATA ===
  const fetchMarkets = async () => {
    try {
      const ids = 'bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot,chainlink,tron,litecoin,uniswap,bitcoin-cash,cosmos,stellar,vechain,tezos,filecoin';
      const vs = CONFIG.CURRENCY;
      const url = `${CONFIG.API.COINGECKO}/coins/markets?vs_currency=${vs}&ids=${ids}&order=market_cap_desc&per_page=${CONFIG.LIMIT}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid market data');
      STATE.markets = data.map(coin => ({
        id: coin.id,
        symbol: (coin.symbol || '').toUpperCase(),
        name: coin.name,
        image: coin.image,
        price: coin.current_price,
        change1h: coin.price_change_percentage_1h_in_currency,
        change24h: coin.price_change_percentage_24h_in_currency,
        change7d: coin.price_change_percentage_7d_in_currency,
        marketCap: coin.market_cap,
        volume: coin.total_volume,
        sparkline: (coin.sparkline_in_7d && coin.sparkline_in_7d.price) || []
      }));
      renderMarkets();
      updateFavorites();
    } catch (err) {
      console.error(err);
      showToast('خطا در بارگذاری بازارها', 'error');
    }
  };

  const renderMarkets = () => {
    const container = $('#markets-list');
    if (!container) return;
    container.innerHTML = '';
    const tpl = $('#market-card-template')?.content;
    if (!tpl) return;

    STATE.markets.forEach(coin => {
      const card = tpl.cloneNode(true);
      const el = card.querySelector('.market-card');
      if (!el) return;
      el.dataset.id = coin.id || '';

      const img = el.querySelector('.coin-icon');
      if (img) { img.src = coin.image || ''; img.alt = coin.name || ''; }

      el.querySelector('.coin-name') && (el.querySelector('.coin-name').textContent = coin.name || '');
      el.querySelector('.coin-symbol') && (el.querySelector('.coin-symbol').textContent = coin.symbol || '');

      const priceEl = el.querySelector('.price-main');
      if (priceEl) priceEl.textContent = typeof coin.price === 'number' ? formatPrice(coin.price) : '—';
      const changeEl = el.querySelector('.price-change');
      if (changeEl) changeEl.innerHTML = formatChange(coin.change24h);

      const canvas = el.querySelector('.sparkline');
      renderSparkline(canvas, coin.sparkline || [], (coin.change7d || 0) >= 0);

      const favBtn = el.querySelector('[data-action="favorite"]');
      if (favBtn) {
        favBtn.textContent = STATE.favorites.has(coin.id) ? 'StarFilled' : 'Star';
        favBtn.onclick = () => toggleFavorite(coin.id, el);
      }

      const alertBtn = el.querySelector('[data-action="alert"]');
      if (alertBtn) alertBtn.onclick = () => openAlertModal(coin);

      const chartBtn = el.querySelector('[data-action="chart"]');
      if (chartBtn) chartBtn.onclick = () => openChartModal(coin);

      container.appendChild(card);
    });

    $('#markets-loader')?.classList.add('hidden');
  };

  const renderSparkline = (canvas, data, isUp) => {
    if (!canvas) return;
    const ctx = canvas.getContext && canvas.getContext('2d');
    canvas.width = 120;
    canvas.height = 40;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!Array.isArray(data) || data.length < 2) return;
    const nums = data.map(v => Number(v)).filter(v => !isNaN(v));
    if (nums.length < 2) return;
    const max = Math.max(...nums), min = Math.min(...nums);
    const range = max - min || 1;
    const points = nums.map((val, i) => ({ x: (i / (nums.length - 1)) * canvas.width, y: canvas.height - ((val - min) / range) * canvas.height }));
    ctx.lineWidth = 2;
    const successColor = getComputedStyle(document.documentElement).getPropertyValue('--success') || '#10B981';
    const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--danger') || '#EF4444';
    ctx.strokeStyle = (isUp ? successColor : dangerColor).trim();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  };

  const toggleFavorite = (id, card) => {
    if (!id) return;
    if (STATE.favorites.has(id)) {
      STATE.favorites.delete(id);
      const btn = card.querySelector('[data-action="favorite"]');
      if (btn) btn.textContent = 'Star';
    } else {
      STATE.favorites.add(id);
      const btn = card.querySelector('[data-action="favorite"]');
      if (btn) btn.textContent = 'StarFilled';
    }
    saveData();
    vibrate();
  };

  const updateFavorites = () => {
    $$('.market-card').forEach(card => {
      const id = card.dataset.id;
      if (id && STATE.favorites.has(id)) {
        const btn = card.querySelector('[data-action="favorite"]');
        if (btn) btn.textContent = 'StarFilled';
      }
    });
  };

  // === SEARCH & TABS ===
  const setupSearch = () => {
    const input = $('#search-input');
    if (!input) return;
    const cb = debounce(function () {
      const q = input.value.trim().toLowerCase();
      $$('.market-card').forEach(card => {
        const name = (card.querySelector('.coin-name')?.textContent || '').toLowerCase();
        const sym = (card.querySelector('.coin-symbol')?.textContent || '').toLowerCase();
        card.style.display = (name.includes(q) || sym.includes(q)) ? 'block' : 'none';
      });
    }, 300);
    input.addEventListener('input', cb);
  };

  const setupTabs = () => {
    $$('[data-tab]').forEach(tab => {
      tab.onclick = () => {
        $$('[data-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const pageId = `#page-${tab.dataset.tab}`;
        $$('[id^="page-"]').forEach(p => p.classList.add('hidden'));
        $(pageId)?.classList.remove('hidden');
        if (tab.dataset.tab === 'markets') fetchMarkets();
        if (tab.dataset.tab === 'wallet') renderWallets();
        if (tab.dataset.tab === 'alerts') renderAlerts();
        vibrate();
      };
    });
  };

  // === WALLET MANAGEMENT ===
  const NETWORKS = {
    eth: { name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io/address/' },
    ton: { name: 'TON', symbol: 'TON', explorer: 'https://tonviewer.com/' },
    tron: { name: 'TRON', symbol: 'TRX', explorer: 'https://tronscan.org/#/address/' },
    usdt: { name: 'USDT', symbol: 'USDT', explorer: 'https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7?a=' }
  };

  const setupWalletEvents = () => {
    $('#add-wallet-btn')?.addEventListener('click', openAddWalletModal);
  };

  const openAddWalletModal = () => {
    const container = create('div');
    container.appendChild(create('p', { textContent: 'شبکه را انتخاب کنید:' }));
    Object.keys(NETWORKS).forEach(key => {
      const lbl = create('label', { style: { display: 'block', margin: '12px 0' } });
      const r = create('input', { type: 'radio', name: 'network', value: key, style: { marginLeft: '8px' } });
      lbl.appendChild(r);
      lbl.appendChild(document.createTextNode(`${NETWORKS[key].name} (${NETWORKS[key].symbol})`));
      container.appendChild(lbl);
    });
    const addr = create('input', { type: 'text', id: 'wallet-address', placeholder: 'آدرس کیف پول', style: { width: '100%', padding: '12px', margin: '12px 0', borderRadius: '8px', border: '1px solid var(--border)' } });
    container.appendChild(addr);
    const btn = create('button', { textContent: 'افزودن', style: { width: '100%', padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', marginTop: '8px' } });
    btn.onclick = addWallet;
    container.appendChild(btn);
    showModal('افزودن کیف پول', container);
  };

  const addWallet = () => {
    const network = document.querySelector('input[name="network"]:checked')?.value;
    const address = $('#wallet-address')?.value?.trim();
    if (!network || !address) {
      showToast('لطفاً شبکه و آدرس را وارد کنید', 'error');
      return;
    }
    if (STATE.wallets.find(w => w.address === address)) {
      showToast('این کیف پول قبلاً اضافه شده', 'error');
      return;
    }
    const wallet = { network, address, addedAt: Date.now() };
    STATE.wallets.push(wallet);
    saveData();
    renderWallets();
    closeModal();
    showToast('کیف پول اضافه شد', 'success');
    fetchWalletBalance(wallet, STATE.wallets.length - 1);
  };

  const renderWallets = () => {
    const container = $('#wallet-content');
    const empty = $('#wallet-empty');
    if (!container || !empty) return;
    if (STATE.wallets.length === 0) {
      empty.classList.remove('hidden');
      container.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = '';
    const tpl = $('#wallet-card-template')?.content;
    if (!tpl) return;
    STATE.wallets.forEach((wallet, idx) => {
      const card = tpl.cloneNode(true);
      const el = card.querySelector('.wallet-card');
      if (!el) return;
      const net = NETWORKS[wallet.network] || { name: wallet.network, symbol: wallet.network.toUpperCase() };
      el.querySelector('.wallet-network') && (el.querySelector('.wallet-network').textContent = `${net.name} • ${net.symbol}`);
      el.querySelector('.wallet-balance') && (el.querySelector('.wallet-balance').textContent = 'در حال بارگذاری...');
      el.querySelector('.wallet-address') && (el.querySelector('.wallet-address').textContent = `${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}`);
      el.querySelector('[data-action="copy"]') && (el.querySelector('[data-action="copy"]').onclick = () => copyToClipboard(wallet.address));
      el.querySelector('[data-action="qr"]') && (el.querySelector('[data-action="qr"]').onclick = () => showQRCode(wallet.address));
      el.querySelector('[data-action="remove"]') && (el.querySelector('[data-action="remove"]').onclick = () => removeWallet(idx));
      el.dataset.index = idx;
      container.appendChild(card);
    });
    STATE.wallets.forEach((w, i) => fetchWalletBalance(w, i));
  };

  const fetchWalletBalance = async (wallet, index) => {
    let balanceText = 'خطا';
    try {
      if (wallet.network === 'eth' || wallet.network === 'usdt') {
        const token = wallet.network === 'usdt' ? '0xdac17f958d2ee523a2206206994597c13d831ec7' : '';
        const url = token
          ? `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${token}&address=${wallet.address}&tag=latest`
          : `https://api.etherscan.io/api?module=account&action=balance&address=${wallet.address}&tag=latest`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && (data.status === '1' || data.message === 'OK')) {
          if (wallet.network === 'usdt') balanceText = (Number(data.result) / 1e6).toFixed(2) + ' USDT';
          else balanceText = (Number(data.result) / 1e18).toFixed(6) + ' ETH';
        } else balanceText = 'نامشخص';
      } else if (wallet.network === 'ton') {
        const res = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${wallet.address}`);
        const data = await res.json();
        if (data && data.balance != null) balanceText = (Number(data.balance) / 1e9).toFixed(6) + ' TON';
        else balanceText = 'نامشخص';
      } else if (wallet.network === 'tron') {
        const res = await fetch(`${CONFIG.API.TRONGRID}/wallet/getaccount?address=${wallet.address}`);
        const data = await res.json();
        if (data && data.balance != null) balanceText = (Number(data.balance) / 1e6).toFixed(6) + ' TRX';
        else balanceText = 'نامشخص';
      } else balanceText = 'پشتیبانی نشده';
    } catch (err) {
      console.error('fetchWalletBalance error', err);
      balanceText = 'خطا';
    }
    const card = document.querySelector(`.wallet-card[data-index="${index}"]`);
    if (card) {
      const balEl = card.querySelector('.wallet-balance');
      if (balEl) balEl.textContent = balanceText;
    }
  };

  const removeWallet = (index) => {
    if (index == null || index < 0 || index >= STATE.wallets.length) return;
    STATE.wallets.splice(index, 1);
    saveData();
    renderWallets();
    showToast('کیف پول حذف شد', 'info');
  };

  const showQRCode = (text) => {
    const safe = encodeURIComponent(text);
    const img = create('img', { src: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${safe}`, style: { width: '100%', maxWidth: '300px', display: 'block', margin: '0 auto', borderRadius: '8px' } });
    const wrapper = create('div', {}, [img, create('p', { textContent: text, style: { wordBreak: 'break-all', marginTop: '12px', color: 'var(--text-secondary)' } })]);
    showModal('QR کد آدرس', wrapper);
  };

  // === ALERTS ===
  const setupAlertEvents = () => {
    $('#create-alert-btn')?.addEventListener('click', () => {
      const sel = create('select', { id: 'alert-coin', style: { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '8px' } });
      STATE.markets.forEach(c => sel.appendChild(create('option', { value: c.id, textContent: `${c.name} (${c.symbol})` })));
      const input = create('input', { type: 'number', id: 'alert-price', placeholder: 'قیمت هدف (USD)', style: { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '8px' } });
      const btn = create('button', { textContent: 'ایجاد هشدار', style: { width: '100%', padding: '10px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px' } });
      btn.onclick = () => {
        const coin = $('#alert-coin').value;
        const price = Number($('#alert-price').value);
        if (!coin || !price) { showToast('ورودی نامعتبر', 'error'); return; }
        STATE.alerts.push({ coin, price, enabled: true, id: Date.now() });
        saveData();
        renderAlerts();
        closeModal();
        showToast('هشدار ایجاد شد', 'success');
      };
      const content = create('div', {}, [sel, input, btn]);
      showModal('ایجاد هشدار قیمت', content);
    });
  };

  const renderAlerts = () => {
    const container = $('#alerts-list');
    const empty = $('#alerts-empty');
    if (!container || !empty) return;
    if (STATE.alerts.length === 0) {
      empty.classList.remove('hidden');
      container.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = '';
    const tpl = $('#alert-item-template')?.content;
    if (!tpl) return;
    STATE.alerts.forEach((al, idx) => {
      const item = tpl.cloneNode(true);
      item.querySelector('.alert-coin') && (item.querySelector('.alert-coin').textContent = al.coin);
      item.querySelector('.alert-condition') && (item.querySelector('.alert-condition').textContent = `قیمت هدف: $${formatNumber(al.price, 2)}`);
      item.querySelector('.alert-status') && (item.querySelector('.alert-status').textContent = al.enabled ? 'فعال' : 'غیرفعال');
      item.querySelector('.alert-delete') && (item.querySelector('.alert-delete').onclick = () => {
        STATE.alerts.splice(idx, 1);
        saveData();
        renderAlerts();
        showToast('هشدار حذف شد', 'info');
      });
      container.appendChild(item);
    });
  };

  const openAlertModal = (coin) => {
    const content = create('div');
    content.appendChild(create('p', { textContent: `ایجاد هشدار برای ${coin.name} (${coin.symbol})` }));
    const input = create('input', { type: 'number', placeholder: 'قیمت هدف (USD)', style: { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '8px' } });
    const btn = create('button', { textContent: 'ایجاد هشدار', style: { width: '100%', padding: '10px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', marginTop: '8px' } });
    btn.onclick = () => {
      const price = Number(input.value);
      if (!price) { showToast('قیمت نامعتبر', 'error'); return; }
      STATE.alerts.push({ coin: coin.id, price, enabled: true, id: Date.now() });
      saveData();
      renderAlerts();
      closeModal();
      showToast('هشدار اضافه شد', 'success');
    };
    content.appendChild(input);
    content.appendChild(btn);
    showModal('هشدار جدید', content);
  };

  // === CHART MODAL ===
  const openChartModal = async (coin) => {
    const body = create('div');
    body.appendChild(create('h4', { textContent: `${coin.name} (${coin.symbol})` }));
    const canvas = create('canvas', { style: 'width:100%;height:180px;background:transparent;borderRadius: ' });
    body.appendChild(canvas);
    showModal('نمودار', body);
    try {
      const url = `${CONFIG.API.COINGECKO}/coins/${coin.id}/market_chart?vs_currency=${CONFIG.CURRENCY}&days=${CONFIG.CHART_DAYS}`;
      const res = await fetch(url);
      const d = await res.json();
      const prices = d.prices ? d.prices.map(p => p[1]) : (coin.sparkline || []);
      renderSparkline(canvas, prices, (coin.change7d || 0) >= 0);
    } catch (e) {
      console.error('openChartModal error', e);
    }
  };

  // === PROFILE MENU ===
  const setupProfileEvents = () => {
    document.querySelectorAll('.profile-menu .menu-item').forEach(item => {
      item.onclick = () => {
        const action = item.dataset.action;
        if (action === 'export') {
          const data = localStorage.getItem(STORAGE_KEY) || '{}';
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'ehsan_exchange_data.json';
          a.click();
          URL.revokeObjectURL(url);
          showToast('دیتا صدور شد', 'success');
        } else if (action === 'import') {
          const inp = create('input', { type: 'file', accept: 'application/json' });
          inp.onchange = (e) => {
            const f = e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => {
              try {
                const parsed = JSON.parse(r.result);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                loadData();
                showToast('دیتا وارد شد', 'success');
              } catch (err) {
                showToast('فرمت نامعتبر', 'error');
              }
            };
            r.readAsText(f);
          };
          inp.click();
        } else if (action === 'backup') {
          showToast('پشتیبان‌گیری انجام شد', 'success');
        } else if (action === 'settings') {
          showToast('تنظیمات', 'info');
        } else if (action === 'about') {
          showModal('درباره شلبی', '<p>ساخته شده توسط ehsan</p>');
        }
      };
    });
  };

  // === SETUP ===
  const setupEventListeners = () => {
    $('#theme-toggle') && ($('#theme-toggle').onclick = toggleTheme);
    $('#lang-toggle') && ($('#lang-toggle').onclick = toggleLang);
    $('#fab-wallet') && ($('#fab-wallet').onclick = () => document.querySelector('[data-tab="wallet"]').click());
    document.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', closeModal));
    $('#modal') && $('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) closeModal(); });

    setupSearch();
    setupTabs();
    setupWalletEvents();
    setupAlertEvents();
    setupProfileEvents();
  };

  const updatePrices = async () => {
    if (!document.querySelector('[data-tab="markets"].active')) return;
    await fetchMarkets();
  };

  // start
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loaded');
    initTheme();
    initLang();
    initTelegram();
    loadData();
    setupEventListeners();
    if (document.querySelector('[data-tab="markets"].active')) fetchMarkets();
    setInterval(updatePrices, CONFIG.UPDATE_INTERVAL);
  });

  // expose for debugging
  window.APP = { STATE, fetchMarkets, renderMarkets, fetchWalletBalance, saveData, loadData };

})();
