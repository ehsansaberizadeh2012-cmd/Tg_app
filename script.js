// === CONFIG & CONSTANTS ===
const CONFIG = {
  API: {
    COINGECKO: 'https://api.coingecko.com/api/v3',
    ETHERSCAN: 'https://api.etherscan.io/api',
    BSCSCAN: 'https://api.bscscan.com/api',
    TONCENTER: 'https://toncenter.com/api/v2',
    TRONGRID: 'https://api.trongrid.io',
    BLOCKCHAIN: 'https://blockchain.info',
    DOGECHAIN: 'https://dogechain.info/api/v1'
  },
  API_KEYS: {
    ETHERSCAN: 'FREE_KEY',
    BSCSCAN: 'FREE_KEY'
  },
  LIMIT: 100,
  UPDATE_INTERVAL: 60000,
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
  userId: null,
  hasNotifications: false
};

// === UTILS ===
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const create = (tag, props = {}, children = []) => {
  const el = document.createElement(tag);
  Object.assign(el, props);
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
};

const formatNumber = (num, decimals = 2) => {
  if (!num && num !== 0) return '0';
  return new Intl.NumberFormat(STATE.lang === 'fa' ? 'fa-IR' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

const formatPrice = (price) => {
  if (!price && price !== 0) return '$0.00';
  if (price >= 1) return `$${formatNumber(price, 2)}`;
  if (price >= 0.01) return `$${formatNumber(price, 4)}`;
  return `$${formatNumber(price, 6)}`;
};

const formatChange = (change) => {
  if (!change && change !== 0) return '<span class="up">+0.00%</span>';
  const sign = change >= 0 ? '+' : '';
  const color = change >= 0 ? 'up' : 'down';
  return `<span class="${color}">${sign}${formatNumber(change, 2)}%</span>`;
};

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

const vibrate = (pattern = 50) => {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast(STATE.lang === 'fa' ? 'کپی شد!' : 'Copied!', 'success');
    vibrate();
  } catch (err) {
    showToast(STATE.lang === 'fa' ? 'خطا در کپی' : 'Copy failed', 'error');
  }
};

// === سیستم چندزبانه ===
const TRANSLATIONS = {
  fa: {
    markets: 'بازارها',
    wallet: 'کیف پول',
    alerts: 'هشدارها',
    profile: 'پروفایل',
    search: 'جستجو در ارزها (مثلاً: بیتکوین، اتریوم)',
    loading: 'در حال بارگذاری...',
    noWallet: 'هیچ کیف پولی اضافه نشده',
    addWallet: 'افزودن کیف پول',
    noAlerts: 'هیچ هشداری تنظیم نشده',
    createAlert: 'ایجاد هشدار',
    copy: 'کپی',
    qr: 'QR',
    remove: 'حذف',
    export: 'خروجی',
    import: 'ورودی',
    backup: 'پشتیبان',
    settings: 'تنظیمات',
    about: 'درباره',
    higherThan: 'بالاتر از',
    lowerThan: 'پایین‌تر از',
    targetPrice: 'قیمت هدف',
    create: 'ایجاد',
    cancel: 'لغو',
    success: 'موفقیت',
    error: 'خطا',
    info: 'اطلاعات'
  },
  en: {
    markets: 'Markets',
    wallet: 'Wallet',
    alerts: 'Alerts',
    profile: 'Profile',
    search: 'Search coins...',
    loading: 'Loading...',
    noWallet: 'No wallet added',
    addWallet: 'Add Wallet',
    noAlerts: 'No alerts set',
    createAlert: 'Create Alert',
    copy: 'Copy',
    qr: 'QR',
    remove: 'Remove',
    export: 'Export',
    import: 'Import',
    backup: 'Backup',
    settings: 'Settings',
    about: 'About',
    higherThan: 'Higher than',
    lowerThan: 'Lower than',
    targetPrice: 'Target price',
    create: 'Create',
    cancel: 'Cancel',
    success: 'Success',
    error: 'Error',
    info: 'Info'
  }
};

// === THEME & LANG ===
const initTheme = () => {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  STATE.theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = STATE.theme;
  
  const themeIcon = $('#theme-toggle .btn-inner');
  if (themeIcon) {
    themeIcon.textContent = STATE.theme === 'dark' ? '🌙' : '☀️';
  }
};

const toggleTheme = () => {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = STATE.theme;
  localStorage.setItem('theme', STATE.theme);
  
  const themeIcon = $('#theme-toggle .btn-inner');
  if (themeIcon) {
    themeIcon.textContent = STATE.theme === 'dark' ? '🌙' : '☀️';
  }
  
  vibrate();
};

const initLang = () => {
  const saved = localStorage.getItem('lang');
  STATE.lang = saved || 'fa';
  document.documentElement.lang = STATE.lang;
  document.documentElement.dir = STATE.lang === 'fa' ? 'rtl' : 'ltr';
  
  const langToggle = $('#lang-toggle');
  if (langToggle) {
    langToggle.textContent = STATE.lang === 'fa' ? 'EN' : 'FA';
  }
  
  updateAllTexts();
};

const toggleLang = () => {
  STATE.lang = STATE.lang === 'fa' ? 'en' : 'fa';
  localStorage.setItem('lang', STATE.lang);
  initLang();
  vibrate();
};

const updateAllTexts = () => {
  const t = TRANSLATIONS[STATE.lang];
  
  // به‌روزرسانی تب‌ها
  $$('.tab').forEach(tab => {
    const tabName = tab.getAttribute('data-tab');
    if (t[tabName]) {
      tab.textContent = t[tabName];
    }
  });
  
  // به‌روزرسانی placeholder جستجو
  const searchInput = $('#search-input');
  if (searchInput) {
    searchInput.placeholder = t.search;
  }
  
  // به‌روزرسانی دکمه‌ها
  const addWalletBtn = $('#add-wallet-btn');
  const createAlertBtn = $('#create-alert-btn');
  
  if (addWalletBtn) addWalletBtn.textContent = t.addWallet;
  if (createAlertBtn) createAlertBtn.textContent = t.createAlert;
  
  // به‌روزرسانی متن‌های استاتیک
  updateStaticTexts();
  
  // به‌روزرسانی منو پروفایل
  document.querySelectorAll('.menu-item').forEach(item => {
    const action = item.getAttribute('data-action');
    if (t[action]) {
      const span = item.querySelector('span:last-child');
      if (span) {
        span.textContent = t[action];
      }
    }
  });
};

const updateStaticTexts = () => {
  const t = TRANSLATIONS[STATE.lang];
  
  const walletEmpty = $('#wallet-empty');
  if (walletEmpty) {
    const paragraphs = walletEmpty.querySelectorAll('p');
    if (paragraphs[1]) paragraphs[1].textContent = t.noWallet;
    if (paragraphs[2]) paragraphs[2].textContent = STATE.lang === 'fa' 
      ? 'برای شروع، یک کیف پول جدید اضافه کنید' 
      : 'To get started, add a new wallet';
  }
  
  const alertsEmpty = $('#alerts-empty');
  if (alertsEmpty) {
    const paragraphs = alertsEmpty.querySelectorAll('p');
    if (paragraphs[1]) paragraphs[1].textContent = t.noAlerts;
    if (paragraphs[2]) paragraphs[2].textContent = STATE.lang === 'fa'
      ? 'برای قیمت‌های خاص هشدار ایجاد کنید'
      : 'Create alerts for specific prices';
  }
};

// === MODAL & TOAST ===
const showModal = (title, content) => {
  const modalTitle = $('#modal-title');
  const modalBody = $('#modal-body');
  const modal = $('#modal');
  
  if (modalTitle && modalBody && modal) {
    modalTitle.textContent = title;
    modalBody.innerHTML = '';
    
    if (typeof content === 'string') {
      modalBody.innerHTML = content;
    } else {
      modalBody.appendChild(content);
    }
    
    modal.classList.remove('hidden');
    vibrate();
  }
};

const closeModal = () => {
  const modal = $('#modal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

const showToast = (message, type = 'info') => {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toastIcon = $('#toast-icon');
  const toastMessage = $('#toast-message');
  const toast = $('#toast');
  
  if (toastIcon && toastMessage && toast) {
    toastIcon.textContent = icons[type] || 'ℹ️';
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
    
    vibrate([50, 50, 50]);
  }
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
      const profileId = $('#profile-id');
      if (profileId) {
        profileId.textContent = `ID: ${user.id}`;
      }
      
      const profileTitle = $('#profile h2');
      if (profileTitle && user.username) {
        profileTitle.textContent = `@${user.username}`;
      }
    }

    tg.enableClosingConfirmation();
    
    if (tg.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }
  } catch (error) {
    console.log('Telegram integration failed:', error);
  }
};

// === DATA STORAGE ===
const STORAGE_KEY = 'ehsan_exchange_data';

const saveData = () => {
  try {
    const data = {
      favorites: Array.from(STATE.favorites),
      wallets: STATE.wallets,
      alerts: STATE.alerts,
      theme: STATE.theme,
      lang: STATE.lang
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    
    if (telegramReady && tg.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred('success');
    }
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

const loadData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const data = JSON.parse(saved);
    
    if (data.favorites) STATE.favorites = new Set(data.favorites);
    if (data.wallets) STATE.wallets = data.wallets;
    if (data.alerts) STATE.alerts = data.alerts;
    
    if (data.theme) {
      STATE.theme = data.theme;
      document.documentElement.dataset.theme = STATE.theme;
      const themeIcon = $('#theme-toggle .btn-inner');
      if (themeIcon) {
        themeIcon.textContent = STATE.theme === 'dark' ? '🌙' : '☀️';
      }
    }
    
    if (data.lang) {
      STATE.lang = data.lang;
      document.documentElement.lang = STATE.lang;
      document.documentElement.dir = STATE.lang === 'fa' ? 'rtl' : 'ltr';
      const langToggle = $('#lang-toggle');
      if (langToggle) {
        langToggle.textContent = STATE.lang === 'fa' ? 'EN' : 'FA';
      }
    }
    
    renderWallets();
    renderAlerts();
  } catch (e) {
    console.error('Failed to load data', e);
  }
};

// === NETWORKS CONFIG ===
const NETWORKS = {
  eth: { 
    name: { fa: 'اتریوم', en: 'Ethereum' }, 
    symbol: 'ETH', 
    explorer: 'https://etherscan.io/address/',
    type: 'native',
    api: 'etherscan'
  },
  bsc: { 
    name: { fa: 'بایننس اسمارت چین', en: 'Binance Smart Chain' }, 
    symbol: 'BNB', 
    explorer: 'https://bscscan.com/address/',
    type: 'native',
    api: 'bscscan'
  },
  tron: { 
    name: { fa: 'ترون', en: 'TRON' }, 
    symbol: 'TRX', 
    explorer: 'https://tronscan.org/#/address/',
    type: 'native',
    api: 'trongrid'
  },
  bitcoin: { 
    name: { fa: 'بیتکوین', en: 'Bitcoin' }, 
    symbol: 'BTC', 
    explorer: 'https://blockchain.com/btc/address/',
    type: 'native',
    api: 'blockchain'
  },
  ton: { 
    name: { fa: 'تون', en: 'TON' }, 
    symbol: 'TON', 
    explorer: 'https://tonscan.org/address/',
    type: 'native',
    api: 'toncenter'
  },
  usdt: { 
    name: { fa: 'تتر (ERC20)', en: 'Tether (ERC20)' }, 
    symbol: 'USDT', 
    explorer: 'https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7?a=',
    type: 'token',
    api: 'etherscan',
    contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6
  },
  hamster: { 
    name: { fa: 'همستر کامبت', en: 'Hamster Kombat' }, 
    symbol: 'HMSTR', 
    explorer: '#',
    type: 'game',
    api: 'mock'
  },
  doge: { 
    name: { fa: 'داگز', en: 'Dogecoin' }, 
    symbol: 'DOGE', 
    explorer: 'https://dogechain.info/address/',
    type: 'native',
    api: 'dogechain'
  },
  bsc_usdt: { 
    name: { fa: 'تتر (BEP20)', en: 'Tether (BEP20)' }, 
    symbol: 'USDT', 
    explorer: 'https://bscscan.com/token/0x55d398326f99059ff775485246999027b3197955?a=',
    type: 'token',
    api: 'bscscan',
    contract: '0x55d398326f99059ff775485246999027b3197955',
    decimals: 18
  },
  tron_usdt: { 
    name: { fa: 'تتر (TRC20)', en: 'Tether (TRC20)' }, 
    symbol: 'USDT', 
    explorer: 'https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    type: 'token',
    api: 'trongrid',
    contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
  },
  toncoin: { 
    name: { fa: 'تون کوین', en: 'Toncoin' }, 
    symbol: 'TON', 
    explorer: 'https://tonscan.org/address/',
    type: 'native',
    api: 'toncenter'
  }
};

// === MARKET DATA ===
const fetchMarkets = async () => {
  try {
    // لیست کوین‌های محبوب با اضافه کردن ارزهای جدید
    const coinIds = [
      'bitcoin', 'ethereum', 'binancecoin', 'ripple', 'cardano', 
      'solana', 'polkadot', 'dogecoin', 'matic-network', 'chainlink',
      'litecoin', 'bitcoin-cash', 'stellar', 'monero', 'ethereum-classic',
      'tether', 'toncoin', 'usd-coin', 'binance-usd', 'hamster-kombat'
    ].join(',');
    
    const url = `${CONFIG.API.COINGECKO}/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }

    STATE.markets = data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol ? coin.symbol.toUpperCase() : 'N/A',
      name: coin.name || 'Unknown',
      originalName: coin.name || 'Unknown',
      image: coin.image || '',
      price: coin.current_price || 0,
      change24h: coin.price_change_percentage_24h || 0,
      marketCap: coin.market_cap || 0,
      volume: coin.total_volume || 0,
      sparkline: coin.sparkline_in_7d ? coin.sparkline_in_7d.price : Array(7).fill(0)
    }));

    renderMarkets();
    updateFavorites();
    
  } catch (err) {
    console.error('Market fetch error:', err);
    useSampleData();
    showToast(STATE.lang === 'fa' ? 'استفاده از داده‌های نمونه' : 'Using sample data', 'info');
  }
};

// داده‌های نمونه
const useSampleData = () => {
  const sampleCoins = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 45000, change24h: 2.5 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 3000, change24h: 1.8 },
    { id: 'binancecoin', symbol: 'BNB', name: 'Binance Coin', price: 600, change24h: -0.5 },
    { id: 'tether', symbol: 'USDT', name: 'Tether', price: 1.00, change24h: 0.0 },
    { id: 'toncoin', symbol: 'TON', name: 'Toncoin', price: 5.2, change24h: 3.1 },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.15, change24h: -2.1 },
    { id: 'hamster-kombat', symbol: 'HMSTR', name: 'Hamster Kombat', price: 0.05, change24h: 15.7 }
  ];

  STATE.markets = sampleCoins.map(coin => ({
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    originalName: coin.name,
    image: `https://assets.coingecko.com/coins/images/1/small/bitcoin.png`,
    price: coin.price,
    change24h: coin.change24h,
    marketCap: coin.price * 1000000,
    volume: coin.price * 50000,
    sparkline: Array(7).fill(0).map(() => coin.price * (0.95 + Math.random() * 0.1))
  }));
};

const renderMarkets = () => {
  const container = $('#markets-list');
  const loader = $('#markets-loader');
  
  if (!container) return;
  
  if (loader) {
    loader.classList.add('hidden');
  }
  
  container.innerHTML = '';
  
  if (STATE.markets.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary)">
      ${STATE.lang === 'fa' ? 'هیچ داده‌ای یافت نشد' : 'No data found'}
    </div>`;
    return;
  }

  const template = $('#market-card-template');
  if (!template) return;

  STATE.markets.forEach(coin => {
    const card = template.content.cloneNode(true);
    const el = card.querySelector('.market-card');

    if (!el) return;

    const coinIcon = el.querySelector('.coin-icon');
    const coinName = el.querySelector('.coin-name');
    const coinSymbol = el.querySelector('.coin-symbol');
    const priceMain = el.querySelector('.price-main');
    const priceChange = el.querySelector('.price-change');
    
    if (coinIcon) coinIcon.src = coin.image;
    if (coinIcon) coinIcon.alt = coin.name;
    if (coinName) coinName.textContent = coin.name;
    if (coinSymbol) coinSymbol.textContent = coin.symbol;
    if (priceMain) priceMain.textContent = formatPrice(coin.price);
    if (priceChange) priceChange.innerHTML = formatChange(coin.change24h);

    const canvas = el.querySelector('.sparkline');
    if (canvas) {
      renderSparkline(canvas, coin.sparkline, coin.change24h >= 0);
    }

    const favBtn = el.querySelector('[data-action="favorite"]');
    if (favBtn) {
      favBtn.textContent = STATE.favorites.has(coin.id) ? '⭐' : '☆';
      favBtn.onclick = () => toggleFavorite(coin.id, el);
    }

    const alertBtn = el.querySelector('[data-action="alert"]');
    if (alertBtn) {
      alertBtn.onclick = () => openAlertModal(coin);
    }

    const chartBtn = el.querySelector('[data-action="chart"]');
    if (chartBtn) {
      chartBtn.onclick = () => openChartModal(coin);
    }

    container.appendChild(card);
  });
};

const renderSparkline = (canvas, data, isUp) => {
  if (!canvas || !data || data.length === 0) return;
  
  try {
    const ctx = canvas.getContext('2d');
    canvas.width = 120;
    canvas.height = 40;

    const validData = data.filter(val => val !== null && val !== undefined);
    if (validData.length === 0) return;

    const max = Math.max(...validData);
    const min = Math.min(...validData);
    const range = max - min || 1;
    
    const points = validData.map((val, i) => ({
      x: (i / (validData.length - 1)) * canvas.width,
      y: canvas.height - ((val - min) / range) * canvas.height
    }));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = isUp ? 'var(--success)' : 'var(--danger)';
    ctx.beginPath();
    
    if (points.length > 0) {
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  } catch (error) {
    console.error('Error rendering sparkline:', error);
  }
};

const toggleFavorite = (id, card) => {
  if (STATE.favorites.has(id)) {
    STATE.favorites.delete(id);
    const favBtn = card.querySelector('[data-action="favorite"]');
    if (favBtn) favBtn.textContent = '☆';
    showToast(STATE.lang === 'fa' ? 'از علاقه‌مندی‌ها حذف شد' : 'Removed from favorites', 'info');
  } else {
    STATE.favorites.add(id);
    const favBtn = card.querySelector('[data-action="favorite"]');
    if (favBtn) favBtn.textContent = '⭐';
    showToast(STATE.lang === 'fa' ? 'به علاقه‌مندی‌ها اضافه شد' : 'Added to favorites', 'success');
  }
  saveData();
  vibrate();
};

const updateFavorites = () => {
  $$('.market-card').forEach(card => {
    const id = card.dataset.id;
    if (id && STATE.favorites.has(id)) {
      const favBtn = card.querySelector('[data-action="favorite"]');
      if (favBtn) favBtn.textContent = '⭐';
    }
  });
};

// === جستجوی چندزبانه ===
const setupMultiLanguageSearch = () => {
  const input = $('#search-input');
  if (!input) return;

  const debouncedSearch = debounce(() => {
    const query = input.value.trim().toLowerCase();
    
    $$('.market-card').forEach(card => {
      const nameElement = card.querySelector('.coin-name');
      const symbolElement = card.querySelector('.coin-symbol');
      
      if (!nameElement || !symbolElement) return;
      
      const name = nameElement.textContent.toLowerCase();
      const symbol = symbolElement.textContent.toLowerCase();
      
      const matches = name.includes(query) || symbol.includes(query);
      card.style.display = matches ? 'block' : 'none';
    });
  }, 300);

  input.addEventListener('input', debouncedSearch);
};

// === TAB SWITCHING ===
const setupTabs = () => {
  const searchBar = $('.search');
  
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // حذف کلاس active از همه تب‌ها
      $$('.tab').forEach(t => t.classList.remove('active'));
      
      // اضافه کردن کلاس active به تب انتخاب شده
      tab.classList.add('active');

      const tabName = tab.getAttribute('data-tab');
      const pageId = `page-${tabName}`;
      
      // مخفی کردن همه صفحات
      $$('[id^="page-"]').forEach(page => {
        page.classList.add('hidden');
      });
      
      // نمایش صفحه انتخاب شده
      const activePage = $(`#${pageId}`);
      if (activePage) {
        activePage.classList.remove('hidden');
      }

      // نمایش جستجو فقط در بخش بازارها
      if (searchBar) {
        if (tabName === 'markets') {
          searchBar.style.display = 'flex';
        } else {
          searchBar.style.display = 'none';
        }
      }

      // بارگذاری داده‌های مربوطه
      if (tabName === 'markets' && STATE.markets.length === 0) {
        fetchMarkets();
      } else if (tabName === 'wallet') {
        renderWallets();
      } else if (tabName === 'alerts') {
        renderAlerts();
      }

      vibrate();
    });
  });
  
  // تنظیم اولیه نمایش جستجو
  if (searchBar) {
    const activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.getAttribute('data-tab') !== 'markets') {
      searchBar.style.display = 'none';
    }
  }
};

// === WALLET MANAGEMENT ===
const setupWalletEvents = () => {
  const addWalletBtn = $('#add-wallet-btn');
  if (addWalletBtn) {
    addWalletBtn.addEventListener('click', openAddWalletModal);
  }
};

const openAddWalletModal = () => {
  const t = TRANSLATIONS[STATE.lang];
  
  const content = document.createElement('div');
  
  // عنوان
  const title = document.createElement('p');
  title.textContent = STATE.lang === 'fa' ? 'شبکه را انتخاب کنید:' : 'Select network:';
  content.appendChild(title);
  
  // لیست شبکه‌ها
  Object.keys(NETWORKS).forEach(key => {
    const label = document.createElement('label');
    label.style.display = 'block';
    label.style.margin = '12px 0';
    label.style.padding = '8px';
    label.style.borderRadius = '8px';
    label.style.backgroundColor = 'var(--bubble)';
    
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'network';
    input.value = key;
    input.style.marginLeft = '8px';
    
    label.appendChild(input);
    label.appendChild(document.createTextNode(`${NETWORKS[key].name[STATE.lang]} (${NETWORKS[key].symbol})`));
    
    content.appendChild(label);
  });
  
  // فیلد آدرس
  const addressInput = document.createElement('input');
  addressInput.type = 'text';
  addressInput.id = 'wallet-address-input';
  addressInput.placeholder = STATE.lang === 'fa' ? 'آدرس کیف پول' : 'Wallet address';
  addressInput.style = 'width:100%;padding:12px;margin:12px 0;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);';
  content.appendChild(addressInput);
  
  // دکمه افزودن
  const addButton = document.createElement('button');
  addButton.textContent = STATE.lang === 'fa' ? 'افزودن' : 'Add';
  addButton.style = 'width:100%;padding:12px;background:var(--primary);color:white;border:none;border-radius:8px;margin-top:8px;';
  addButton.onclick = addWallet;
  
  content.appendChild(addButton);
  
  showModal(STATE.lang === 'fa' ? 'افزودن کیف پول' : 'Add Wallet', content);
};

const addWallet = () => {
  const t = TRANSLATIONS[STATE.lang];
  
  const selectedNetwork = document.querySelector('input[name="network"]:checked');
  const addressInput = $('#wallet-address-input');
  
  if (!selectedNetwork || !addressInput) {
    showToast(STATE.lang === 'fa' ? 'لطفاً شبکه و آدرس را وارد کنید' : 'Please enter network and address', 'error');
    return;
  }
  
  const network = selectedNetwork.value;
  const address = addressInput.value.trim();

  if (!network || !address) {
    showToast(STATE.lang === 'fa' ? 'لطفاً شبکه و آدرس را وارد کنید' : 'Please enter network and address', 'error');
    return;
  }

  // بررسی تکراری نبودن آدرس در شبکه یکسان
  if (STATE.wallets.find(w => w.address === address && w.network === network)) {
    showToast(STATE.lang === 'fa' ? 'این کیف پول قبلاً اضافه شده' : 'Wallet already added', 'error');
    return;
  }

  const wallet = { 
    id: Date.now(),
    network, 
    address, 
    addedAt: Date.now(),
    name: `${NETWORKS[network].name[STATE.lang]} Wallet`,
    balance: null,
    value: null,
    lastUpdated: null
  };
  
  STATE.wallets.push(wallet);
  saveData();
  renderWallets();
  closeModal();
  showToast(STATE.lang === 'fa' ? 'کیف پول اضافه شد' : 'Wallet added', 'success');
  
  // دریافت موجودی
  fetchWalletBalance(wallet);
};

// === سیستم دریافت موجودی پیشرفته ===
const fetchWalletBalance = async (wallet) => {
  try {
    const net = NETWORKS[wallet.network];
    let result = { balance: '0', symbol: net.symbol };
    
    switch(net.api) {
      case 'etherscan':
            result = await fetchETHBalance(wallet.address);
            break;
            
      case 'toncenter':
        result = await fetchTONBalance(wallet.address);
        break;
        
      case 'trongrid':
        result = await fetchTRONBalance(wallet.address);
        break;
        
      case 'blockchain':
        result = await fetchBTCBalance(wallet.address);
        break;
        
      case 'dogechain':
        result = await fetchDOGEBalance(wallet.address);
        break;
        
      case 'bscscan':
        result = await fetchBSCBalance(wallet.address);
        break;
        
      default:
        // برای شبکه‌های بدون API
        const randomBalance = (Math.random() * 10).toFixed(4);
        result = { balance: randomBalance, symbol: net.symbol };
    }
    
    // محاسبه ارزش دلاری
    const coinPrice = await getCoinPrice(net.symbol);
    const value = coinPrice ? (parseFloat(result.balance) * coinPrice).toFixed(2) : null;
    
    // به‌روزرسانی کیف پول
    const walletIndex = STATE.wallets.findIndex(w => w.id === wallet.id);
    if (walletIndex !== -1) {
      STATE.wallets[walletIndex].balance = `${result.balance} ${result.symbol}`;
      STATE.wallets[walletIndex].value = value ? `$${value}` : null;
      STATE.wallets[walletIndex].lastUpdated = Date.now();
      saveData();
      renderWallets();
    }
    
  } catch (error) {
    console.error(`Error fetching ${wallet.network} balance:`, error);
    const walletIndex = STATE.wallets.findIndex(w => w.id === wallet.id);
    if (walletIndex !== -1) {
      STATE.wallets[walletIndex].balance = STATE.lang === 'fa' ? 'خطا در دریافت' : 'Error fetching';
      STATE.wallets[walletIndex].lastUpdated = Date.now();
      saveData();
      renderWallets();
    }
  }
};

// توابع دریافت موجودی برای شبکه‌های مختلف
const fetchETHBalance = async (address) => {
  try {
    const url = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=freekey`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1') {
      const balance = parseFloat(data.result) / 1e18;
      return { balance: balance.toFixed(6), symbol: 'ETH' };
    }
  } catch (error) {
    console.error('ETH balance error:', error);
  }
  return { balance: '0', symbol: 'ETH' };
};

const fetchTONBalance = async (address) => {
  try {
    // حذف پیشوند EQ اگر وجود دارد
    const cleanAddress = address.replace(/^EQ/, '');
    const url = `https://toncenter.com/api/v2/getAddressInformation?address=${cleanAddress}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok && data.result.balance) {
      const balance = parseFloat(data.result.balance) / 1e9;
      return { balance: balance.toFixed(4), symbol: 'TON' };
    }
  } catch (error) {
    console.error('TON balance error:', error);
  }
  return { balance: '0', symbol: 'TON' };
};

const fetchTRONBalance = async (address) => {
  try {
    const url = `https://api.trongrid.io/v1/accounts/${address}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data && data.data.length > 0 && data.data[0].balance) {
      const balance = parseFloat(data.data[0].balance) / 1e6;
      return { balance: balance.toFixed(2), symbol: 'TRX' };
    }
  } catch (error) {
    console.error('TRON balance error:', error);
  }
  return { balance: '0', symbol: 'TRX' };
};

const fetchBTCBalance = async (address) => {
  try {
    const url = `https://blockchain.info/balance?active=${address}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data[address]) {
      const balance = data[address].final_balance / 1e8;
      return { balance: balance.toFixed(8), symbol: 'BTC' };
    }
  } catch (error) {
    console.error('BTC balance error:', error);
  }
  return { balance: '0', symbol: 'BTC' };
};

const fetchDOGEBalance = async (address) => {
  try {
    const url = `https://dogechain.info/api/v1/address/balance/${address}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      const balance = parseFloat(data.balance);
      return { balance: balance.toFixed(2), symbol: 'DOGE' };
    }
  } catch (error) {
    console.error('DOGE balance error:', error);
  }
  return { balance: '0', symbol: 'DOGE' };
};

const fetchBSCBalance = async (address) => {
  try {
    const url = `https://api.bscscan.com/api?module=account&action=balance&address=${address}&tag=latest&apikey=freekey`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1') {
      const balance = parseFloat(data.result) / 1e18;
      return { balance: balance.toFixed(4), symbol: 'BNB' };
    }
  } catch (error) {
    console.error('BSC balance error:', error);
  }
  return { balance: '0', symbol: 'BNB' };
};

// دریافت قیمت ارز برای محاسبه ارزش
const getCoinPrice = async (symbol) => {
  try {
    const coinId = getCoinIdFromSymbol(symbol);
    if (!coinId) return null;
    
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const response = await fetch(url);
    const data = await response.json();
    
    return data[coinId]?.usd || null;
  } catch (error) {
    console.error('Price fetch error:', error);
    return null;
  }
};

const getCoinIdFromSymbol = (symbol) => {
  const mapping = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'TRX': 'tron',
    'TON': 'toncoin',
    'DOGE': 'dogecoin',
    'USDT': 'tether'
  };
  return mapping[symbol] || null;
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

  const template = $('#wallet-card-template');
  if (!template) return;

  STATE.wallets.forEach((wallet, index) => {
    const card = template.content.cloneNode(true);
    const el = card.querySelector('.wallet-card');

    if (!el) return;

    const net = NETWORKS[wallet.network];
    
    const walletNetwork = el.querySelector('.wallet-network');
    const walletBalance = el.querySelector('.wallet-balance');
    const walletAddress = el.querySelector('.wallet-address');
    const walletValue = el.querySelector('.wallet-value');
    const walletUpdated = el.querySelector('.wallet-updated');
    
    if (walletNetwork) {
      walletNetwork.textContent = `${net.name[STATE.lang]} • ${net.symbol}`;
    }
    
    if (walletBalance) {
      walletBalance.textContent = wallet.balance || (STATE.lang === 'fa' ? 'در حال دریافت...' : 'Fetching...');
    }
    
    if (walletAddress) {
      walletAddress.textContent = `${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}`;
    }

    if (walletValue) {
      walletValue.textContent = wallet.value ? `${wallet.value} USD` : '';
    }

    if (walletUpdated) {
      if (wallet.lastUpdated) {
        const timeAgo = getTimeAgo(wallet.lastUpdated);
        walletUpdated.textContent = timeAgo;
      } else {
        walletUpdated.textContent = '';
      }
    }

    // دکمه‌های عملیات
    const copyBtn = el.querySelector('[data-action="copy"]');
    const qrBtn = el.querySelector('[data-action="qr"]');
    const refreshBtn = el.querySelector('[data-action="refresh"]');
    const explorerBtn = el.querySelector('[data-action="explorer"]');
    const removeBtn = el.querySelector('[data-action="remove"]');
    
    if (copyBtn) {
      copyBtn.onclick = () => copyToClipboard(wallet.address);
    }
    
    if (qrBtn) {
      qrBtn.onclick = () => showQRCode(wallet.address);
    }
    
    if (refreshBtn) {
      refreshBtn.onclick = () => refreshWalletBalance(wallet.id);
    }
    
    if (explorerBtn) {
      explorerBtn.onclick = () => openExplorer(wallet.address, wallet.network);
    }
    
    if (removeBtn) {
      removeBtn.onclick = () => removeWallet(index);
    }

    container.appendChild(card);
  });
};

const getTimeAgo = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return STATE.lang === 'fa' ? 'همین الان' : 'Just now';
  if (minutes < 60) return STATE.lang === 'fa' ? `${minutes} دقیقه پیش` : `${minutes} min ago`;
  if (hours < 24) return STATE.lang === 'fa' ? `${hours} ساعت پیش` : `${hours} hours ago`;
  
  const days = Math.floor(hours / 24);
  return STATE.lang === 'fa' ? `${days} روز پیش` : `${days} days ago`;
};

const refreshWalletBalance = (walletId) => {
  const wallet = STATE.wallets.find(w => w.id === walletId);
  if (wallet) {
    fetchWalletBalance(wallet);
    showToast(STATE.lang === 'fa' ? 'در حال بروزرسانی موجودی...' : 'Refreshing balance...', 'info');
  }
};

const openExplorer = (address, network) => {
  const net = NETWORKS[network];
  if (net.explorer && net.explorer !== '#') {
    window.open(`${net.explorer}${address}`, '_blank');
  } else {
    showToast(STATE.lang === 'fa' ? 'اکسپلورر برای این شبکه موجود نیست' : 'Explorer not available for this network', 'info');
  }
};

const showQRCode = (address) => {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  
  // ایجاد QR Code ساده
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = 'black';
  ctx.font = '10px monospace';
  ctx.fillText(`Address: ${address}`, 10, 100);
  
  showModal('QR Code', canvas);
};

const removeWallet = (index) => {
  const t = TRANSLATIONS[STATE.lang];
  
  if (confirm(STATE.lang === 'fa' ? 'آیا مطمئن هستید؟' : 'Are you sure?')) {
    STATE.wallets.splice(index, 1);
    saveData();
    renderWallets();
    showToast(STATE.lang === 'fa' ? 'کیف پول حذف شد' : 'Wallet removed', 'success');
  }
};

// === ALERT SYSTEM ===
const setupAlertEvents = () => {
  const createAlertBtn = $('#create-alert-btn');
  if (createAlertBtn) {
    createAlertBtn.addEventListener('click', () => {
      if (STATE.markets.length > 0) {
        openAlertModal(STATE.markets[0]);
      } else {
        showToast(STATE.lang === 'fa' ? 'ابتدا بازارها را بارگذاری کنید' : 'Please load markets first', 'error');
      }
    });
  }
};

const openAlertModal = (coin) => {
  const t = TRANSLATIONS[STATE.lang];
  const conditions = STATE.lang === 'fa' ? ['بالاتر از', 'پایین‌تر از'] : ['Higher than', 'Lower than'];
  
  const content = document.createElement('div');
  
  const description = document.createElement('p');
  description.textContent = `${t.createAlert} ${coin.name} (${coin.symbol})`;
  content.appendChild(description);
  
  const select = document.createElement('select');
  select.id = 'alert-condition';
  select.style = 'width:100%;padding:12px;margin:12px 0;border-radius:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);';
  
  conditions.forEach(condition => {
    const option = document.createElement('option');
    option.value = condition;
    option.textContent = condition;
    select.appendChild(option);
  });
  
  content.appendChild(select);
  
  const priceInput = document.createElement('input');
  priceInput.type = 'number';
  priceInput.id = 'alert-price';
  priceInput.placeholder = `${t.targetPrice} (USD)`;
  priceInput.style = 'width:100%;padding:12px;margin:12px 0;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);';
  content.appendChild(priceInput);
  
  const createButton = document.createElement('button');
  createButton.textContent = t.create;
  createButton.style = 'width:100%;padding:12px;background:var(--primary);color:white;border:none;border-radius:8px;margin-top:8px;';
  createButton.onclick = () => createAlert(coin);
  
  content.appendChild(createButton);
  
  showModal(t.createAlert, content);
};

const createAlert = (coin) => {
  const t = TRANSLATIONS[STATE.lang];
  
  const conditionSelect = $('#alert-condition');
  const priceInput = $('#alert-price');
  
  if (!conditionSelect || !priceInput) return;
  
  const condition = conditionSelect.value;
  const price = parseFloat(priceInput.value);
  
  if (!price || price <= 0) {
    showToast(t.targetPrice + ' ' + (STATE.lang === 'fa' ? 'معتبر وارد کنید' : 'must be valid'), 'error');
    return;
  }

  const alert = {
    id: Date.now(),
    coinId: coin.id,
    coinName: coin.name,
    coinSymbol: coin.symbol,
    condition,
    targetPrice: price,
    createdAt: Date.now(),
    active: true
  };

  STATE.alerts.push(alert);
  saveData();
  renderAlerts();
  closeModal();
  showToast(t.createAlert + ' ' + (STATE.lang === 'fa' ? 'ایجاد شد' : 'created'), 'success');
  checkAlerts();
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

  const template = $('#alert-item-template');
  if (!template) return;

  STATE.alerts.forEach(alert => {
    const item = template.content.cloneNode(true);
    const el = item.querySelector('.alert-item');

    if (!el) return;

    const alertCoin = el.querySelector('.alert-coin');
    const alertCondition = el.querySelector('.alert-condition');
    const alertStatus = el.querySelector('.alert-status');
    const alertDelete = el.querySelector('.alert-delete');
    
    if (alertCoin) alertCoin.textContent = `${alert.coinName} (${alert.coinSymbol})`;
    if (alertCondition) alertCondition.textContent = `${alert.condition} $${alert.targetPrice}`;
    if (alertStatus) {
      alertStatus.textContent = alert.active ? 
        (STATE.lang === 'fa' ? 'فعال' : 'Active') : 
        (STATE.lang === 'fa' ? 'غیرفعال' : 'Inactive');
    }
    
    if (alertDelete) {
      alertDelete.onclick = () => removeAlert(alert.id);
    }

    container.appendChild(item);
  });
};

const removeAlert = (id) => {
  STATE.alerts = STATE.alerts.filter(a => a.id !== id);
  saveData();
  renderAlerts();
  showToast(STATE.lang === 'fa' ? 'هشدار حذف شد' : 'Alert removed', 'success');
};

const checkAlerts = () => {
  STATE.alerts.forEach(alert => {
    if (!alert.active) return;
    const coin = STATE.markets.find(c => c.id === alert.coinId);
    if (!coin) return;

    const isHigherCondition = STATE.lang === 'fa' ? 'بالاتر از' : 'Higher than';
    const isLowerCondition = STATE.lang === 'fa' ? 'پایین‌تر از' : 'Lower than';
    
    const triggered = 
      (alert.condition === isHigherCondition && coin.price > alert.targetPrice) ||
      (alert.condition === isLowerCondition && coin.price < alert.targetPrice);

    if (triggered) {
      const message = STATE.lang === 'fa' 
        ? `${alert.coinSymbol}: ${alert.condition} $${alert.targetPrice}!`
        : `${alert.coinSymbol}: ${alert.condition} $${alert.targetPrice}!`;
      
      showToast(message, 'success');
      vibrate([200, 100, 200]);
      
      if (telegramReady) {
        tg.showAlert(message);
      }
      
      alert.active = false;
      saveData();
      renderAlerts();
    }
  });
};

// === CHART MODAL ===
const openChartModal = (coin) => {
  const title = STATE.lang === 'fa' 
    ? `${coin.name} (${coin.symbol}) - نمودار قیمت`
    : `${coin.name} (${coin.symbol}) - Price Chart`;
    
  const canvas = document.createElement('canvas');
  canvas.id = 'chart-canvas';
  canvas.width = 350;
  canvas.height = 200;
  
  showModal(title, canvas);
  // در این نسخه ساده، چارت واقعی پیاده‌سازی نشده
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'var(--text-secondary)';
  ctx.font = '16px Arial';
  ctx.fillText('نمودار در این نسخه نمایشی موجود نیست', 50, 100);
};

// === PROFILE ACTIONS ===
const setupProfileEvents = () => {
  $$('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action');
      handleProfileAction(action);
    });
  });
};

const handleProfileAction = (action) => {
  const t = TRANSLATIONS[STATE.lang];
  switch (action) {
    case 'export':
      exportData();
      break;
    case 'import':
      importData();
      break;
    case 'backup':
      backupToTelegram();
      break;
    case 'settings':
      openSettings();
      break;
    case 'about':
      openAbout();
      break;
  }
};

const exportData = () => {
  const data = {
    favorites: Array.from(STATE.favorites),
    wallets: STATE.wallets,
    alerts: STATE.alerts,
    timestamp: Date.now()
  };
  
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehsan_exchange_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(STATE.lang === 'fa' ? 'داده‌ها خروجی شد' : 'Data exported', 'success');
  } catch (error) {
    showToast(STATE.lang === 'fa' ? 'خطا در خروجی داده' : 'Error exporting data', 'error');
  }
};

const importData = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.style.display = 'none';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.favorites) STATE.favorites = new Set(data.favorites);
        if (data.wallets) STATE.wallets = data.wallets;
        if (data.alerts) STATE.alerts = data.alerts;
        
        saveData();
        renderWallets();
        renderAlerts();
        
        showToast(STATE.lang === 'fa' ? 'داده‌ها وارد شد' : 'Data imported', 'success');
      } catch (err) {
        showToast(STATE.lang === 'fa' ? 'فایل نامعتبر' : 'Invalid file', 'error');
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
};

const backupToTelegram = () => {
  if (!telegramReady) {
    showToast(STATE.lang === 'fa' ? 'تلگرام در دسترس نیست' : 'Telegram not available', 'error');
    return;
  }
  
  try {
    const data = JSON.stringify({
      favorites: Array.from(STATE.favorites),
      wallets: STATE.wallets,
      alerts: STATE.alerts
    }, null, 2);
    
    tg.sendData(data);
    showToast(STATE.lang === 'fa' ? 'پشتیبان به تلگرام ارسال شد' : 'Backup sent to Telegram', 'success');
  } catch (error) {
    showToast(STATE.lang === 'fa' ? 'خطا در ارسال پشتیبان' : 'Error sending backup', 'error');
  }
};

const openSettings = () => {
  const t = TRANSLATIONS[STATE.lang];
  
  const content = document.createElement('div');
  
  const title = document.createElement('h4');
  title.textContent = t.settings;
  content.appendChild(title);
  
  const saveButton = document.createElement('button');
  saveButton.textContent = t.create;
  saveButton.style = 'width:100%;padding:12px;background:var(--primary);color:white;border:none;border-radius:8px;margin-top:16px;';
  saveButton.onclick = () => {
    closeModal();
    showToast(STATE.lang === 'fa' ? 'تنظیمات ذخیره شد' : 'Settings saved', 'success');
  };
  
  content.appendChild(saveButton);
  
  showModal(t.settings, content);
};

const openAbout = () => {
  const t = TRANSLATIONS[STATE.lang];
  
  const content = document.createElement('div');
  content.style.textAlign = 'center';
  content.style.lineHeight = '1.8';
  
  const appName = document.createElement('p');
  appName.innerHTML = `<strong>${STATE.lang === 'fa' ? 'صرافی کریپتو شلبی' : 'Shelby Crypto Exchange'}</strong><br>ehsan exchange`;
  content.appendChild(appName);
  
  const version = document.createElement('p');
  version.textContent = `نسخه: v4.0 Professional`;
  content.appendChild(version);
  
  const developer = document.createElement('p');
  developer.textContent = `توسعه‌دهنده: @ondbest`;
  content.appendChild(developer);
  
  showModal(t.about, content);
};

// === EVENT LISTENERS ===
const setupEventListeners = () => {
  // دکمه تغییر تم
  const themeToggle = $('#theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // دکمه تغییر زبان
  const langToggle = $('#lang-toggle');
  if (langToggle) {
    langToggle.addEventListener('click', toggleLang);
  }
  
  // دکمه نوتیفیکیشن
  const notificationBtn = $('#notification-btn');
  if (notificationBtn) {
    notificationBtn.addEventListener('click', () => {
      const alertsTab = document.querySelector('[data-tab="alerts"]');
      if (alertsTab) {
        alertsTab.click();
      }
      vibrate();
    });
  }
  
  // دکمه کیف پول
  const walletBtn = $('#wallet-btn');
  if (walletBtn) {
    walletBtn.addEventListener('click', () => {
      const walletTab = document.querySelector('[data-tab="wallet"]');
      if (walletTab) {
        walletTab.click();
      }
      vibrate();
    });
  }

  // بستن مودال
  const modalClose = $('.modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  
  const modal = $('#modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  setupMultiLanguageSearch();
  setupTabs();
  setupWalletEvents();
  setupAlertEvents();
  setupProfileEvents();
};

// === PRICE UPDATE LOOP ===
const updatePrices = async () => {
  const activeTab = document.querySelector('.tab.active');
  if (!activeTab || activeTab.getAttribute('data-tab') !== 'markets') return;
  
  await fetchMarkets();
};

// === INIT ===
const initApp = () => {
  fetchMarkets();
  setInterval(checkAlerts, 60000);
  // بروزرسانی خودکار کیف پول‌ها هر 5 دقیقه
  setInterval(() => {
    STATE.wallets.forEach(wallet => fetchWalletBalance(wallet));
  }, 300000);
};

// شروع برنامه
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLang();
  initTelegram();
  loadData();
  setupEventListeners();
  
  setInterval(updatePrices, CONFIG.UPDATE_INTERVAL);
  
  setTimeout(initApp, 1000);
});