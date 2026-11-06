/**
 * Theme Studio — client half.
 *
 * A left-sidebar panel entry plus the page it selects. The panel edits:
 *   • the color scheme preference (light / dark / system),
 *   • a per-scheme palette of alias theme tokens, entered as RGB + opacity,
 *   • a background image read from a local file.
 *
 * Colors reach the application only through `ctx.theme.overrideTokens`, so the
 * host keeps ownership of the theme registry and the shell keeps the last word
 * on the rendered palette. The background image is painted on `html` by a
 * package-owned stylesheet; the shell surfaces stay translucent enough to let it
 * through, which the panel controls through the opacity channel of those tokens.
 */
window.__ModuleLoader__.load({
  id: 'dsh-theme-studio',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;

    const PANEL_ID = 'theme-studio';
    const NS = 'theme-studio';
    const STORAGE_KEY = 'dsh-theme-studio:v1';
    const SOURCE = 'dsh-theme-studio/palette';
    /** Longest data URL worth keeping in localStorage; beyond this the browser refuses to save. */
    const MAX_STORED_URL = 2600000;
    const SCHEMES = ['light', 'dark'];
    const CHANNELS = ['r', 'g', 'b'];
    const BG_BASE = '--dsw-alias-bg-base';
    const SIDEBAR = '--dsw-specific-sidebar-fill';

    // ---------------------------------------------------------------- text --

    const EN = {
      'panel.title': 'Theme Studio',
      'panel.subtitle': 'Recolor the workbench, switch schemes, and set a background image.',
      'action.resetAll': 'Reset all',
      'action.reset': 'Reset',
      'action.replace': 'Replace image',
      'action.remove': 'Remove',
      'section.theme': 'Color scheme',
      'section.theme.hint': 'Applies to the whole workbench. Custom colors are layered on top of the scheme you pick.',
      'section.colors': 'Colors',
      'section.colors.hint': 'Type RGB values (0-255) or pick from the swatch; A is opacity in percent. Colors you do not edit keep the theme default.',
      'section.colors.themeNote': 'A third-party theme is active: {name}. Edits here stack on top of it — use “Reset all” to return to the theme’s own colors.',
      'section.wallpaper': 'Background image',
      'section.wallpaper.hint': 'Read from a local file. The image stays in this browser and is never sent to the server.',
      'scheme.light': 'Light',
      'scheme.dark': 'Dark',
      'scheme.system': 'Follow system',
      'palette.light': 'Light palette',
      'palette.dark': 'Dark palette',
      'group.background': 'Backgrounds',
      'group.text': 'Text',
      'group.accent': 'Accent',
      'group.border': 'Borders',
      'group.state': 'State',
      'color.bgBase': 'Workbench background',
      'color.sidebar': 'Sidebar',
      'color.layer1': 'Raised surface',
      'color.layer2': 'Nested surface',
      'color.overlay': 'Overlay',
      'color.labelPrimary': 'Primary text',
      'color.labelSecondary': 'Secondary text',
      'color.brand': 'Accent color',
      'color.border1': 'Subtle border',
      'color.border2': 'Strong border',
      'color.success': 'Success',
      'color.warn': 'Warning',
      'color.error': 'Error',
      'wallpaper.pick': 'Choose an image',
      'wallpaper.formats': 'PNG, JPEG, WebP or GIF. Large images are scaled down so the setting stays small.',
      'wallpaper.reading': 'Reading the image…',
      'wallpaper.untitled': 'Background image',
      'fit.cover': 'Cover',
      'fit.contain': 'Contain',
      'fit.tile': 'Tile',
      'wallpaper.dim': 'Dim',
      'wallpaper.revealHint': 'Lower the opacity of “Workbench background” and “Sidebar” under Colors to let the image show through.',
      'error.save': 'This browser refused to store the setting. It applies for now but is lost on reload.',
      'error.type': 'That file is not an image. Choose a PNG, JPEG, WebP or GIF file.',
      'error.read': 'The image could not be read. Try another file.',
      'error.tooLarge': 'That image is too large to keep in this browser. Try a smaller one.',
      'foot.storage': 'Settings are saved in this browser and apply to this device.',
    };

    const ZH = {
      'panel.title': '外观工作室',
      'panel.subtitle': '自定义工作台配色、切换主题，并设置背景图。',
      'action.resetAll': '全部重置',
      'action.reset': '重置',
      'action.replace': '更换图片',
      'action.remove': '移除',
      'section.theme': '主题模式',
      'section.theme.hint': '对整个工作台生效。自定义颜色叠加在你选择的模式之上。',
      'section.colors': '颜色',
      'section.colors.hint': '直接输入 RGB 值（0-255），或点色块取色；A 是不透明度百分比。未修改的颜色沿用主题默认值。',
      'section.colors.themeNote': '当前启用的主题：{name}。这里的修改会作为叠加层覆盖它；要回到主题原色，请点右上角「全部重置」。',
      'section.wallpaper': '背景图',
      'section.wallpaper.hint': '从本地文件读取。图片只保存在这个浏览器里，不会上传到服务器。',
      'scheme.light': '亮色',
      'scheme.dark': '暗色',
      'scheme.system': '跟随系统',
      'palette.light': '亮色配色',
      'palette.dark': '暗色配色',
      'group.background': '背景',
      'group.text': '文字',
      'group.accent': '强调',
      'group.border': '边框',
      'group.state': '状态',
      'color.bgBase': '工作台背景',
      'color.sidebar': '侧栏',
      'color.layer1': '卡片表面',
      'color.layer2': '嵌套表面',
      'color.overlay': '浮层',
      'color.labelPrimary': '主要文字',
      'color.labelSecondary': '次要文字',
      'color.brand': '强调色',
      'color.border1': '细边框',
      'color.border2': '强边框',
      'color.success': '成功',
      'color.warn': '警告',
      'color.error': '错误',
      'wallpaper.pick': '选择图片',
      'wallpaper.formats': '支持 PNG、JPEG、WebP、GIF。较大的图片会自动缩小，以免设置过大。',
      'wallpaper.reading': '正在读取图片…',
      'wallpaper.untitled': '背景图',
      'fit.cover': '填充',
      'fit.contain': '适应',
      'fit.tile': '平铺',
      'wallpaper.dim': '暗化',
      'wallpaper.revealHint': '在上方「颜色」里调低「工作台背景」和「侧栏」的不透明度，即可透出背景图。',
      'error.save': '浏览器拒绝保存该设置。当前已生效，但刷新后会丢失。',
      'error.type': '该文件不是图片。请选择 PNG、JPEG、WebP 或 GIF 文件。',
      'error.read': '图片读取失败，请换一个文件试试。',
      'error.tooLarge': '图片太大，无法保存在这个浏览器里。请换一张更小的图片。',
      'foot.storage': '设置保存在本浏览器中，仅对这台设备生效。',
    };

    // -------------------------------------------------------------- palette --
    // Built-in light/dark values of the alias tokens this panel exposes. They are
    // the starting point of every row and materialize the other scheme whenever a
    // token is edited for only one of them.

    const DEFAULTS = {
      '--dsw-alias-bg-base': { light: '#ffffff', dark: '#151517' },
      '--dsw-specific-sidebar-fill': { light: '#f9fafb', dark: '#1b1b1c' },
      '--dsw-alias-bg-layer-1': { light: '#ffffff', dark: '#232324' },
      '--dsw-alias-bg-layer-2': { light: '#ffffff', dark: '#2c2c2e' },
      '--dsw-alias-bg-overlay': { light: '#e9ecf2', dark: '#61666b' },
      '--dsw-alias-label-primary': { light: '#0f1115', dark: '#f9fafb' },
      '--dsw-alias-label-secondary': { light: '#61666b', dark: '#cfd3d6' },
      '--dsw-alias-brand-primary': { light: '#0f1115', dark: '#f9fafb' },
      '--dsw-alias-border-l1': { light: '#0000000a', dark: '#ffffff0f' },
      '--dsw-alias-border-l2': { light: '#0000001a', dark: '#ffffff1f' },
      '--dsw-alias-state-success-primary': { light: '#22c55e', dark: '#22c55e' },
      '--dsw-alias-state-warn-primary': { light: '#f59e0b', dark: '#f59e0b' },
      '--dsw-alias-state-error-primary': { light: '#ec1313', dark: '#f25a5a' },
    };

    const TOKEN_LABEL = {
      '--dsw-alias-bg-base': 'color.bgBase',
      '--dsw-specific-sidebar-fill': 'color.sidebar',
      '--dsw-alias-bg-layer-1': 'color.layer1',
      '--dsw-alias-bg-layer-2': 'color.layer2',
      '--dsw-alias-bg-overlay': 'color.overlay',
      '--dsw-alias-label-primary': 'color.labelPrimary',
      '--dsw-alias-label-secondary': 'color.labelSecondary',
      '--dsw-alias-brand-primary': 'color.brand',
      '--dsw-alias-border-l1': 'color.border1',
      '--dsw-alias-border-l2': 'color.border2',
      '--dsw-alias-state-success-primary': 'color.success',
      '--dsw-alias-state-warn-primary': 'color.warn',
      '--dsw-alias-state-error-primary': 'color.error',
    };

    const GROUPS = [
      { id: 'background', rows: [BG_BASE, SIDEBAR, '--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2', '--dsw-alias-bg-overlay'] },
      { id: 'text', rows: ['--dsw-alias-label-primary', '--dsw-alias-label-secondary'] },
      { id: 'accent', rows: ['--dsw-alias-brand-primary'] },
      { id: 'border', rows: ['--dsw-alias-border-l1', '--dsw-alias-border-l2'] },
      { id: 'state', rows: ['--dsw-alias-state-success-primary', '--dsw-alias-state-warn-primary', '--dsw-alias-state-error-primary'] },
    ];

    // -------------------------------------------------------------- helpers --

    function clampInt(value, min, max, fallback) {
      const parsed = Math.round(Number(value));
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(max, Math.max(min, parsed));
    }

    /** Read `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`; alpha becomes a percentage. */
    function parseHexColor(text) {
      if (typeof text !== 'string') return null;
      const match = /^#?([0-9a-f]{3,8})$/i.exec(text.trim());
      if (!match) return null;
      let hex = match[1];
      if (hex.length === 3 || hex.length === 4) {
        hex = hex.split('').map((character) => character + character).join('');
      }
      if (hex.length !== 6 && hex.length !== 8) return null;
      const color = {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 100,
      };
      if (hex.length === 8) color.a = Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 100);
      return color;
    }

    function normalizeColor(value) {
      const source = value && typeof value === 'object' ? value : {};
      return {
        r: clampInt(source.r, 0, 255, 0),
        g: clampInt(source.g, 0, 255, 0),
        b: clampInt(source.b, 0, 255, 0),
        a: clampInt(source.a, 0, 100, 100),
      };
    }

    function colorHex(color) {
      const pad = (value) => clampInt(value, 0, 255, 0).toString(16).padStart(2, '0');
      return '#' + pad(color.r) + pad(color.g) + pad(color.b);
    }

    function colorCss(color) {
      const alpha = clampInt(color.a, 0, 100, 100);
      if (alpha >= 100) return 'rgb(' + color.r + ', ' + color.g + ', ' + color.b + ')';
      return 'rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', ' + alpha / 100 + ')';
    }

    function blankSettings() {
      return { palette: { light: {}, dark: {} }, wallpaper: null };
    }

    function normalizeSettings(raw) {
      const settings = blankSettings();
      if (!raw || typeof raw !== 'object') return settings;
      const palette = raw.palette;
      if (palette && typeof palette === 'object') {
        for (const scheme of SCHEMES) {
          const source = palette[scheme];
          if (!source || typeof source !== 'object') continue;
          for (const token of Object.keys(DEFAULTS)) {
            const entry = source[token];
            if (!entry || typeof entry !== 'object') continue;
            settings.palette[scheme][token] = normalizeColor(entry);
          }
        }
      }
      const wallpaper = raw.wallpaper;
      if (wallpaper && typeof wallpaper === 'object'
        && typeof wallpaper.dataUrl === 'string'
        && wallpaper.dataUrl.slice(0, 11) === 'data:image/'
        && wallpaper.dataUrl.length <= MAX_STORED_URL) {
        settings.wallpaper = {
          dataUrl: wallpaper.dataUrl,
          name: typeof wallpaper.name === 'string' ? wallpaper.name : '',
          fit: wallpaper.fit === 'contain' || wallpaper.fit === 'tile' ? wallpaper.fit : 'cover',
          dim: clampInt(wallpaper.dim, 0, 90, 20),
        };
      }
      return settings;
    }

    function loadSettings() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? normalizeSettings(JSON.parse(raw)) : blankSettings();
      } catch (error) {
        return blankSettings();
      }
    }

    function saveSettings(settings) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        return true;
      } catch (error) {
        return false;
      }
    }

    function countCustom(settings) {
      let total = settings.wallpaper ? 1 : 0;
      for (const scheme of SCHEMES) total += Object.keys(settings.palette[scheme]).length;
      return total;
    }

    /** Fold the edited palette into the `{ light, dark }` pairs `overrideTokens` takes. */
    function buildTokens(settings) {
      const tokens = {};
      for (const token of Object.keys(DEFAULTS)) {
        const light = settings.palette.light[token];
        const dark = settings.palette.dark[token];
        if (!light && !dark) continue;
        tokens[token] = {
          light: colorCss(light || parseHexColor(DEFAULTS[token].light)),
          dark: colorCss(dark || parseHexColor(DEFAULTS[token].dark)),
        };
      }
      return tokens;
    }

    function wallpaperCss(wallpaper) {
      if (!wallpaper || !wallpaper.dataUrl) return '';
      const dim = clampInt(wallpaper.dim, 0, 90, 20) / 100;
      const overlay = 'linear-gradient(rgba(0, 0, 0, ' + dim + '), rgba(0, 0, 0, ' + dim + '))';
      const size = wallpaper.fit === 'contain' ? 'contain' : wallpaper.fit === 'tile' ? 'auto' : 'cover';
      const repeat = wallpaper.fit === 'tile' ? 'repeat' : 'no-repeat';
      return [
        'html{background-color:transparent!important;',
        'background-image:' + overlay + ',url("' + wallpaper.dataUrl + '")!important;',
        'background-size:cover,' + size + '!important;',
        'background-position:center,center!important;',
        'background-repeat:no-repeat,' + repeat + '!important;',
        'background-attachment:fixed,fixed!important}',
        // The shell frame paints the base token; the wallpaper behind it only
        // shows while that token keeps some transparency.
        'body{background-color:transparent!important}',
      ].join('');
    }

    // ------------------------------------------------------- image pipeline --

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('read'));
        reader.readAsDataURL(file);
      });
    }

    function loadImage(source) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('decode'));
        image.src = source;
      });
    }

    function paintScaled(image, edge, quality) {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) return '';
      const scale = Math.min(1, edge / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) return '';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL('image/webp', quality);
      if (webp.slice(0, 15) === 'data:image/webp') return webp;
      return canvas.toDataURL('image/jpeg', quality);
    }

    /** Re-encode to the smallest attempt that still fits the storage budget. */
    async function encodeWallpaper(source) {
      const image = await loadImage(source);
      const attempts = [[1920, 0.86], [1600, 0.8], [1280, 0.72], [1024, 0.62]];
      let best = '';
      for (const attempt of attempts) {
        const encoded = paintScaled(image, attempt[0], attempt[1]);
        if (!encoded) break;
        best = encoded;
        if (encoded.length <= MAX_STORED_URL) return encoded;
      }
      return best;
    }

    // --------------------------------------------------------------- store --

    function createStore(initial) {
      let state = initial;
      const listeners = new Set();
      const store = {
        get: () => state,
        set(next) {
          if (Object.is(next, state)) return;
          state = next;
          for (const listener of [...listeners]) listener();
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
      return store;
    }

    function useStore(store) {
      const [value, setValue] = React.useState(() => store.get());
      React.useEffect(() => {
        let live = true;
        const sync = () => {
          if (live) setValue(store.get());
        };
        const off = store.subscribe(sync);
        sync();
        return () => {
          live = false;
          off();
        };
      }, [store]);
      return value;
    }

    // ------------------------------------------------------------- runtime --

    let runtime = null;

    function createRuntime(deps) {
      const ctx = deps.ctx;
      const theme = deps.theme;
      const translate = deps.translate;

      const store = createStore({ settings: loadSettings(), error: '', busy: false, editScheme: null });
      const themeStore = createStore({ preference: 'system', scheme: 'light', themes: [] });

      let pageStyle = null;
      let wallpaperStyle = null;
      let overrideDisposer = null;
      let applyTimer = 0;
      let saveTimer = 0;
      let stopped = false;

      const t = (key, params) => translate(key, params);

      function applyOverrides(settings) {
        if (!theme || typeof theme.overrideTokens !== 'function') return;
        const tokens = buildTokens(settings);
        try {
          if (Object.keys(tokens).length === 0) {
            if (overrideDisposer) overrideDisposer();
            overrideDisposer = null;
            return;
          }
          overrideDisposer = theme.overrideTokens(SOURCE, tokens) || null;
        } catch (error) {
          overrideDisposer = null;
        }
      }

      function applyNow() {
        if (stopped) return;
        const settings = store.get().settings;
        applyOverrides(settings);
        if (wallpaperStyle) wallpaperStyle.textContent = wallpaperCss(settings.wallpaper);
      }

      function scheduleApply() {
        if (stopped || applyTimer) return;
        applyTimer = window.setTimeout(() => {
          applyTimer = 0;
          applyNow();
        }, 80);
      }

      function scheduleSave() {
        if (stopped) return;
        if (saveTimer) window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => {
          saveTimer = 0;
          if (saveSettings(store.get().settings)) return;
          store.set({ ...store.get(), error: 'save' });
        }, 350);
      }

      function commit(next, options) {
        const immediate = Boolean(options && options.immediate);
        const previous = store.get().settings;
        store.set({ ...store.get(), settings: next, error: '' });
        if (!immediate) {
          scheduleApply();
          scheduleSave();
          return true;
        }
        if (!saveSettings(next)) {
          store.set({ ...store.get(), settings: previous, error: 'save' });
          applyNow();
          return false;
        }
        applyNow();
        return true;
      }

      function paletteWith(scheme, token, color) {
        const settings = store.get().settings;
        const palette = { light: { ...settings.palette.light }, dark: { ...settings.palette.dark } };
        palette[scheme] = { ...palette[scheme], [token]: normalizeColor(color) };
        return { ...settings, palette };
      }

      function syncTheme(snapshot) {
        let preference = themeStore.get().preference;
        let scheme = themeStore.get().scheme;
        let installed = themeStore.get().themes;
        try {
          const current = snapshot && snapshot.active ? snapshot : theme && typeof theme.getTheme === 'function' ? theme.getTheme() : null;
          if (current) {
            if (typeof current.preference === 'string') preference = current.preference;
            const resolved = current.active && current.active.colorScheme === 'dark' ? 'dark' : 'light';
            scheme = resolved;
            // Every registered theme besides the built-in pair becomes a scheme
            // card, so a theme bundle installed later shows up here on its own.
            if (Array.isArray(current.themes)) {
              installed = current.themes
                .map((entry) => (entry && typeof entry.id === 'string' ? entry.id : ''))
                .filter((id) => id !== '' && id !== 'light' && id !== 'dark')
                .sort();
            }
          }
        } catch (error) {
          /* keep the previous values when the service cannot answer */
        }
        if (scheme !== themeStore.get().scheme && store.get().editScheme !== null) {
          store.set({ ...store.get(), editScheme: null });
        }
        const before = themeStore.get();
        if (before.preference === preference && before.scheme === scheme
          && Array.isArray(before.themes) && before.themes.join() === installed.join()) return;
        themeStore.set({ preference, scheme, themes: installed });
      }

      const runtimeApi = {
        store,
        themeStore,
        t,
        start() {
          pageStyle = document.createElement('style');
          pageStyle.setAttribute('data-dsh-theme-studio', 'page');
          pageStyle.textContent = PAGE_CSS;
          document.head.appendChild(pageStyle);
          wallpaperStyle = document.createElement('style');
          wallpaperStyle.setAttribute('data-dsh-theme-studio', 'wallpaper');
          document.head.appendChild(wallpaperStyle);
          applyNow();
          syncTheme();
        },
        stop() {
          stopped = true;
          if (applyTimer) window.clearTimeout(applyTimer);
          if (saveTimer) window.clearTimeout(saveTimer);
          applyTimer = 0;
          saveTimer = 0;
          if (overrideDisposer) {
            try {
              overrideDisposer();
            } catch (error) {
              /* the layer may already be gone */
            }
            overrideDisposer = null;
          }
          if (pageStyle) pageStyle.remove();
          if (wallpaperStyle) wallpaperStyle.remove();
          pageStyle = null;
          wallpaperStyle = null;
        },
        syncTheme,
        setMode(id) {
          if (!theme || typeof theme.setTheme !== 'function') return;
          try {
            theme.setTheme(id);
          } catch (error) {
            return;
          }
          syncTheme();
        },
        setEditScheme(scheme) {
          store.set({ ...store.get(), editScheme: scheme === 'dark' ? 'dark' : 'light' });
        },
        setColor(scheme, token, color) {
          commit(paletteWith(scheme, token, color));
        },
        resetColor(scheme, token) {
          const settings = store.get().settings;
          const palette = { light: { ...settings.palette.light }, dark: { ...settings.palette.dark } };
          delete palette[scheme][token];
          commit({ ...settings, palette });
        },
        resetAll() {
          commit(blankSettings(), { immediate: true });
        },
        setFit(fit) {
          const settings = store.get().settings;
          if (!settings.wallpaper) return;
          commit({ ...settings, wallpaper: { ...settings.wallpaper, fit } });
        },
        setDim(value) {
          const settings = store.get().settings;
          if (!settings.wallpaper) return;
          const dim = clampInt(value, 0, 90, settings.wallpaper.dim);
          commit({ ...settings, wallpaper: { ...settings.wallpaper, dim } });
        },
        clearWallpaper() {
          const settings = store.get().settings;
          const palette = { light: { ...settings.palette.light }, dark: { ...settings.palette.dark } };
          for (const scheme of SCHEMES) {
            const entry = palette[scheme][BG_BASE];
            if (!entry) continue;
            const fallback = parseHexColor(DEFAULTS[BG_BASE][scheme]);
            const same = entry.r === fallback.r && entry.g === fallback.g && entry.b === fallback.b;
            if (same && entry.a < 100) delete palette[scheme][BG_BASE];
          }
          commit({ ...settings, palette, wallpaper: null }, { immediate: true });
        },
        async uploadWallpaper(file) {
          if (!file) return;
          if (typeof file.type === 'string' && file.type && file.type.indexOf('image/') !== 0) {
            store.set({ ...store.get(), error: 'type' });
            return;
          }
          store.set({ ...store.get(), error: '', busy: true });
          try {
            const raw = await fileToDataUrl(file);
            const encoded = await encodeWallpaper(raw);
            if (!encoded) throw new Error('encode');
            if (encoded.length > MAX_STORED_URL) {
              store.set({ ...store.get(), busy: false, error: 'tooLarge' });
              return;
            }
            const settings = store.get().settings;
            const previous = settings.wallpaper;
            const palette = { light: { ...settings.palette.light }, dark: { ...settings.palette.dark } };
            for (const scheme of SCHEMES) {
              if (palette[scheme][BG_BASE]) continue;
              // A fresh background would stay hidden behind an opaque base
              // color, so start it translucent; the panel still owns the value.
              palette[scheme][BG_BASE] = { ...parseHexColor(DEFAULTS[BG_BASE][scheme]), a: 60 };
            }
            const next = {
              palette,
              wallpaper: {
                dataUrl: encoded,
                name: typeof file.name === 'string' ? file.name : '',
                fit: previous ? previous.fit : 'cover',
                dim: previous ? previous.dim : 20,
              },
            };
            // Clear the busy flag whether or not the browser accepted the save;
            // a rejected save already recorded its own error.
            commit(next, { immediate: true });
            store.set({ ...store.get(), busy: false });
          } catch (error) {
            store.set({ ...store.get(), busy: false, error: 'read' });
          }
        },
      };

      return runtimeApi;
    }

    // --------------------------------------------------------------- icons --

    function PaletteGlyph(props) {
      const size = (props && props.size) || 18;
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        'aria-hidden': 'true',
        focusable: 'false',
        style: { display: 'block' },
      },
      h('path', {
        d: 'M12 3.1c-4.9 0-9 3.6-9 8 0 4.4 4.1 8 9 8 .85 0 1.55-.7 1.55-1.55 0-.4-.16-.76-.4-1.03a1.55 1.55 0 0 1 1.16-2.57h1.62c2.24 0 4.07-1.82 4.07-4.07C20 6.05 16.5 3.1 12 3.1Z',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinejoin: 'round',
      }),
      h('circle', { cx: 8.3, cy: 9.4, r: 1.15, fill: 'currentColor' }),
      h('circle', { cx: 12.2, cy: 7.2, r: 1.15, fill: 'currentColor' }),
      h('circle', { cx: 8.7, cy: 13.9, r: 1.15, fill: 'currentColor' }));
    }

    function SunGlyph(props) {
      const size = (props && props.size) || 18;
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('circle', { cx: 12, cy: 12, r: 4.1, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', {
          d: 'M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
        }));
    }

    function MoonGlyph(props) {
      const size = (props && props.size) || 18;
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: 'M20.1 14.6A8.6 8.6 0 0 1 9.4 3.9a8.6 8.6 0 1 0 10.7 10.7Z',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }));
    }

    function MonitorGlyph(props) {
      const size = (props && props.size) || 18;
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('rect', { x: 3, y: 4.6, width: 18, height: 12.4, rx: 1.8, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M12 17v3.4M8.6 20.4h6.8', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }));
    }

    /** Badge for a theme contributed by another bundle (its id is all we know). */
    function StarGlyph(props) {
      const size = (props && props.size) || 18;
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: 'M12 2.6l2.6 6.8 6.8 2.6-6.8 2.6L12 21.4l-2.6-6.8L2.6 12l6.8-2.6z',
          fill: 'currentColor',
        }),
        h('circle', { cx: 19.2, cy: 5.4, r: 1.1, fill: 'currentColor', opacity: 0.7 }));
    }

    function UploadGlyph(props) {
      const size = (props && props.size) || 20;
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M12 16.5V5.2', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('path', { d: 'm7.4 9.6 4.6-4.4 4.6 4.4', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M4.6 15.2v3.2a1.6 1.6 0 0 0 1.6 1.6h11.6a1.6 1.6 0 0 0 1.6-1.6v-3.2', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }));
    }

    function ResetGlyph() {
      return h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M3.4 6.2a5 5 0 1 1-.3 3', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
        h('path', { d: 'M3.2 2.4v3.9h3.9', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }

    // ---------------------------------------------------------- panel view --

    const MODES = [
      { id: 'light', labelKey: 'scheme.light', Glyph: SunGlyph },
      { id: 'dark', labelKey: 'scheme.dark', Glyph: MoonGlyph },
      { id: 'system', labelKey: 'scheme.system', Glyph: MonitorGlyph },
    ];

    function PanelIcon(props) {
      return h(PaletteGlyph, { size: (props && props.size) || 18 });
    }

    function PanelRoot() {
      if (!runtime) return null;
      return h(Studio, { runtime });
    }

    function Studio(props) {
      const rt = props.runtime;
      const state = useStore(rt.store);
      const theme = useStore(rt.themeStore);
      const fileInput = React.useRef(null);
      const t = rt.t;

      const settings = state.settings;
      const activeScheme = theme.scheme === 'dark' ? 'dark' : 'light';
      const editScheme = state.editScheme === 'light' || state.editScheme === 'dark' ? state.editScheme : activeScheme;
      const palette = settings.palette[editScheme];
      const custom = countCustom(settings);
      const wallpaper = settings.wallpaper;

      /**
       * Display name of a theme registered by another bundle: a `theme.<id>` key
       * in `locale/*.json` names it, and without one the raw id is shown.
       */
      function themeLabel(id) {
        const key = 'theme.' + id;
        const localized = t(key);
        return localized === key ? id : localized;
      }

      const activeExtraTheme = (theme.themes || []).filter((id) => id === theme.preference)[0] || '';

      const errorNode = state.error
        ? h('div', { className: 'ts-error', role: 'alert' }, t('error.' + state.error))
        : null;

      function pickFile() {
        if (fileInput.current) fileInput.current.click();
      }

      function onFile(event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (file) rt.uploadWallpaper(file);
      }

      function renderRow(token) {
        const stored = palette[token];
        const color = stored || parseHexColor(DEFAULTS[token][editScheme]);
        const label = t(TOKEN_LABEL[token]);
        return h('div', { className: 'ts-row', key: token },
          h('div', { className: 'ts-name' },
            h('span', { className: 'ts-swatch', style: { backgroundColor: colorHex(color) } },
              h('input', {
                type: 'color',
                className: 'ts-swatchInput',
                value: colorHex(color),
                'aria-label': label,
                onChange: (event) => {
                  const picked = parseHexColor(event.target.value);
                  if (picked) rt.setColor(editScheme, token, { ...color, r: picked.r, g: picked.g, b: picked.b });
                },
              })),
            h('span', { className: 'ts-nameText' }, label)),
          CHANNELS.map((channel) => h('input', {
            key: channel,
            type: 'number',
            min: 0,
            max: 255,
            step: 1,
            className: 'ts-num',
            value: color[channel],
            'aria-label': label + ' ' + channel.toUpperCase(),
            onChange: (event) => {
              const next = { ...color };
              next[channel] = clampInt(event.target.value, 0, 255, color[channel]);
              rt.setColor(editScheme, token, next);
            },
          })),
          h('input', {
            type: 'number',
            min: 0,
            max: 100,
            step: 1,
            className: 'ts-num',
            value: color.a,
            'aria-label': label + ' A',
            onChange: (event) => {
              rt.setColor(editScheme, token, { ...color, a: clampInt(event.target.value, 0, 100, color.a) });
            },
          }),
          h('button', {
            type: 'button',
            className: 'ts-iconBtn',
            disabled: !stored,
            title: t('action.reset'),
            'aria-label': t('action.reset') + ': ' + label,
            onClick: () => rt.resetColor(editScheme, token),
          }, h(ResetGlyph, null)));
      }

      const header = h('header', { className: 'ts-header' },
        h('div', { className: 'ts-headText' },
          h('h1', { className: 'ts-title' }, t('panel.title')),
          h('p', { className: 'ts-subtitle' }, t('panel.subtitle'))),
        h('button', {
          type: 'button',
          className: 'ts-btn',
          disabled: custom === 0,
          onClick: () => rt.resetAll(),
        }, t('action.resetAll')));

      const schemeCard = h('section', { className: 'ts-card' },
        h('div', { className: 'ts-cardHead' },
          h('h2', { className: 'ts-cardTitle' }, t('section.theme')),
          h('p', { className: 'ts-hint' }, t('section.theme.hint'))),
        h('div', { className: 'ts-cubes' },
          MODES.map((mode) => h('button', {
            key: mode.id,
            type: 'button',
            className: 'ts-cube',
            'aria-pressed': theme.preference === mode.id,
            onClick: () => rt.setMode(mode.id),
          }, h(mode.Glyph, { size: 20 }), h('span', null, t(mode.labelKey)))),
          (theme.themes || []).map((id) => {
            const key = 'theme.' + id;
            const localized = t(key);
            const label = localized === key ? id : localized;
            return h('button', {
              key: id,
              type: 'button',
              className: 'ts-cube',
              'aria-pressed': theme.preference === id,
              onClick: () => rt.setMode(id),
            }, h(StarGlyph, { size: 20 }), h('span', null, label));
          })));

      const colorsCard = h('section', { className: 'ts-card' },
        h('div', { className: 'ts-cardHead' },
          h('h2', { className: 'ts-cardTitle' }, t('section.colors')),
          h('p', { className: 'ts-hint' }, t('section.colors.hint')),
          activeExtraTheme
            ? h('p', { className: 'ts-notice', role: 'status' }, t('section.colors.themeNote', { name: themeLabel(activeExtraTheme) }))
            : null),
        h('div', { className: 'ts-tabs' }, SCHEMES.map((scheme) => h('button', {
          key: scheme,
          type: 'button',
          className: 'ts-tab',
          'aria-pressed': editScheme === scheme,
          onClick: () => rt.setEditScheme(scheme),
        }, t(scheme === 'light' ? 'palette.light' : 'palette.dark')))),
        h('div', { className: 'ts-row ts-colHead' },
          h('span', null, ''),
          h('span', null, 'R'),
          h('span', null, 'G'),
          h('span', null, 'B'),
          h('span', null, 'A%'),
          h('span', null, '')),
        GROUPS.map((group) => h('div', { className: 'ts-group', key: group.id },
          h('div', { className: 'ts-groupTitle' }, t('group.' + group.id)),
          group.rows.map(renderRow))));

      const wallpaperHead = h('div', { className: 'ts-cardHead' },
        h('h2', { className: 'ts-cardTitle' }, t('section.wallpaper')),
        h('p', { className: 'ts-hint' }, t('section.wallpaper.hint')));

      let wallpaperCard;
      if (!wallpaper) {
        wallpaperCard = h('section', { className: 'ts-card' }, wallpaperHead,
          h('button', {
            type: 'button',
            className: 'ts-drop',
            disabled: state.busy,
            onClick: pickFile,
          },
          h(UploadGlyph, { size: 22 }),
          h('span', { className: 'ts-dropLabel' }, t(state.busy ? 'wallpaper.reading' : 'wallpaper.pick')),
          h('span', { className: 'ts-hint' }, t('wallpaper.formats'))),
          errorNode);
      } else {
        wallpaperCard = h('section', { className: 'ts-card' }, wallpaperHead,
          h('div', { className: 'ts-preview' },
            h('div', { className: 'ts-thumb' }, h('img', { src: wallpaper.dataUrl, alt: '' })),
            h('div', { className: 'ts-previewBody' },
              h('div', { className: 'ts-fileName', title: wallpaper.name }, wallpaper.name || t('wallpaper.untitled')),
              h('div', { className: 'ts-actions' },
                h('button', { type: 'button', className: 'ts-btn', disabled: state.busy, onClick: pickFile }, t('action.replace')),
                h('button', { type: 'button', className: 'ts-btn', onClick: () => rt.clearWallpaper() }, t('action.remove'))),
              h('div', { className: 'ts-seg' }, ['cover', 'contain', 'tile'].map((fit) => h('button', {
                key: fit,
                type: 'button',
                'aria-pressed': wallpaper.fit === fit,
                onClick: () => rt.setFit(fit),
              }, h('span', null, t('fit.' + fit))))))),
          h('div', { className: 'ts-fieldRow' },
            h('span', null, t('wallpaper.dim')),
            h('input', {
              type: 'range',
              className: 'ts-range',
              min: 0,
              max: 90,
              step: 5,
              value: wallpaper.dim,
              'aria-label': t('wallpaper.dim'),
              onChange: (event) => rt.setDim(event.target.value),
            }),
            h('span', { className: 'ts-readout' }, wallpaper.dim + '%')),
          h('p', { className: 'ts-hint ts-hintSpaced' }, t('wallpaper.revealHint')),
          errorNode);
      }

      return h('div', { className: 'ts-page' },
        h('input', {
          ref: fileInput,
          type: 'file',
          accept: 'image/*',
          style: { display: 'none' },
          onChange: onFile,
        }),
        header,
        h('div', { className: 'ts-body' },
          h('div', { className: 'ts-inner' },
            schemeCard,
            colorsCard,
            wallpaperCard,
            h('p', { className: 'ts-foot' }, t('foot.storage')))));
    }

    // ------------------------------------------------------------- styles --

    const PAGE_CSS = [
      '.ts-page{box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0;',
      'font-family:var(--dsw-font-family,inherit);color:var(--dsw-alias-label-primary)}',
      '.ts-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;',
      'padding:20px 28px 16px;border-bottom:.5px solid var(--dsw-alias-border-l1);flex:none}',
      '.ts-headText{min-width:0}',
      '.ts-title{margin:0;font-size:16px;font-weight:500;line-height:24px}',
      '.ts-subtitle{margin:2px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.ts-body{flex:1;min-height:0;overflow-y:auto;padding:20px 28px 56px}',
      '.ts-inner{display:flex;flex-direction:column;gap:16px;width:100%;max-width:860px;margin:0 auto}',
      '.ts-card{box-sizing:border-box;padding:16px 18px;border:.5px solid var(--dsw-alias-border-l2);',
      'border-radius:12px;background:var(--dsw-alias-bg-layer-2)}',
      '.ts-cardHead{display:flex;flex-direction:column;gap:3px;margin:0 0 12px}',
      '.ts-cardTitle{margin:0;font-size:13px;font-weight:500;line-height:20px}',
      '.ts-hint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.ts-notice{margin:8px 0 0;padding:7px 10px;border-left:2px solid var(--dsw-alias-state-business-primary);',
      'border-radius:6px;background:var(--dsw-alias-bg-layer-1);font-size:12px;line-height:18px;',
      'color:var(--dsw-alias-label-secondary)}',
      '.ts-hintSpaced{margin-top:10px}',
      '.ts-cubes{display:flex;flex-wrap:wrap;gap:8px}',
      '.ts-cube{box-sizing:border-box;display:flex;flex:1 1 150px;flex-direction:column;align-items:center;',
      'justify-content:center;gap:6px;min-height:78px;padding:12px;border:.5px solid var(--dsw-alias-border-l2);',
      'border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;',
      'line-height:20px;cursor:pointer}',
      '.ts-cube:hover{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-1))}',
      '.ts-cube[aria-pressed="true"]{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}',
      '.ts-tabs{display:inline-flex;gap:2px;padding:2px;margin:0 0 10px;border-radius:8px;',
      'border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}',
      '.ts-tab{appearance:none;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);',
      'font:inherit;font-size:12px;line-height:18px;padding:4px 12px;cursor:pointer}',
      '.ts-tab[aria-pressed="true"]{background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary)}',
      '.ts-group{margin-top:14px}',
      '.ts-groupTitle{margin:0 0 2px;font-size:11px;line-height:16px;letter-spacing:.04em;',
      'text-transform:uppercase;color:var(--dsw-alias-label-secondary)}',
      '.ts-row{display:grid;grid-template-columns:minmax(0,1fr) 58px 58px 58px 62px 26px;align-items:center;gap:8px;',
      'padding:5px 0}',
      '.ts-colHead{padding:0 0 2px;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
      '.ts-colHead span{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);text-align:center}',
      '.ts-colHead span:first-child{text-align:left}',
      '.ts-name{display:flex;align-items:center;gap:8px;min-width:0}',
      '.ts-nameText{font-size:13px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ts-swatch{position:relative;flex:none;width:18px;height:18px;border-radius:5px;overflow:hidden;',
      'border:.5px solid var(--dsw-alias-border-l2);box-shadow:0 0 0 1px var(--dsw-alias-bg-layer-2) inset}',
      '.ts-swatchInput{position:absolute;inset:0;width:100%;height:100%;padding:0;margin:0;border:0;',
      'opacity:0;background:none;cursor:pointer}',
      '.ts-num{box-sizing:border-box;width:100%;height:28px;padding:0 4px;border:.5px solid var(--dsw-alias-border-l2);',
      'border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;',
      'font-size:12px;text-align:center;appearance:textfield;-moz-appearance:textfield}',
      '.ts-num::-webkit-outer-spin-button,.ts-num::-webkit-inner-spin-button{appearance:none;margin:0}',
      '.ts-num:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}',
      '.ts-iconBtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;',
      'border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.ts-iconBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-1));',
      'color:var(--dsw-alias-label-primary)}',
      '.ts-iconBtn:disabled{opacity:.28;cursor:default}',
      '.ts-btn{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;',
      'border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;',
      'color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;cursor:pointer}',
      '.ts-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-1))}',
      '.ts-btn:disabled{opacity:.4;cursor:default}',
      '.ts-drop{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'gap:8px;width:100%;padding:22px 16px;border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;',
      'background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;text-align:center;cursor:pointer}',
      '.ts-drop:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}',
      '.ts-drop:disabled{opacity:.6;cursor:default}',
      '.ts-dropLabel{font-size:13px;line-height:20px}',
      '.ts-preview{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start}',
      '.ts-thumb{flex:none;width:180px;height:112px;overflow:hidden;border-radius:10px;',
      'border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}',
      '.ts-thumb img{display:block;width:100%;height:100%;object-fit:cover}',
      '.ts-previewBody{display:flex;flex:1 1 220px;flex-direction:column;gap:10px;min-width:0}',
      '.ts-fileName{font-size:13px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ts-actions{display:flex;flex-wrap:wrap;gap:8px}',
      '.ts-seg{display:inline-flex;gap:2px;padding:2px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);',
      'background:var(--dsw-alias-bg-layer-1);align-self:flex-start}',
      '.ts-seg button{appearance:none;border:0;border-radius:6px;background:transparent;',
      'color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;padding:3px 10px;cursor:pointer}',
      '.ts-seg button[aria-pressed="true"]{background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary)}',
      '.ts-fieldRow{display:grid;grid-template-columns:74px minmax(0,1fr) 48px;align-items:center;gap:10px;',
      'margin-top:14px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.ts-range{width:100%;height:20px;accent-color:var(--dsw-alias-brand-primary)}',
      '.ts-readout{text-align:right;font-variant-numeric:tabular-nums}',
      '.ts-error{margin:10px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary)}',
      '.ts-foot{margin:4px 0 0;font-size:11px;line-height:16px;text-align:center;color:var(--dsw-alias-label-secondary)}',
      '@media (max-width:560px){.ts-header{padding:16px 16px 12px}.ts-body{padding:16px 16px 40px}',
      '.ts-row{grid-template-columns:minmax(0,1fr) 46px 46px 46px 50px 24px;gap:6px}}',
    ].join('');

    // ---------------------------------------------------------------- apply --

    function apply(ctx) {
      const theme = typeof ctx.get === 'function' ? ctx.get('theme') : undefined;
      const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined;

      function fallbackTranslate(key, params) {
        const value = EN[key] !== undefined ? EN[key] : key;
        if (!params) return value;
        return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
      }

      let translate = fallbackTranslate;

      if (locale && typeof locale.register === 'function') {
        ctx.effect(() => {
          const disposers = [];
          try {
            disposers.push(locale.register(NS, 'en', EN));
          } catch (error) {
            /* a duplicate registration leaves the bound dictionary in place */
          }
          try {
            disposers.push(locale.register(NS, 'zh', ZH));
          } catch (error) {
            /* locales are optional for this panel */
          }
          const bound = locale.bind(NS);
          translate = (key, params) => bound(key, params);
          return () => {
            translate = fallbackTranslate;
            for (const dispose of disposers) {
              try {
                dispose();
              } catch (error) {
                /* already removed */
              }
            }
          };
        }, 'theme-studio: dictionaries');
      }

      runtime = createRuntime({ ctx, theme, translate: (key, params) => translate(key, params) });
      runtime.start();
      ctx.effect(() => () => runtime.stop(), 'theme-studio: runtime');

      if (theme && typeof ctx.on === 'function') {
        ctx.effect(() => {
          const off = ctx.on('theme/change', (snapshot) => runtime.syncTheme(snapshot));
          return () => {
            if (typeof off === 'function') off();
          };
        }, 'theme-studio: theme subscription');
      }

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        label: () => runtime.t('panel.title'),
      }, PanelIcon));

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
      }, PanelRoot));
    }

    return {
      // `theme` owns the token override layer this panel paints through, and
      // `locale` supplies the panel's own dictionaries, so both are hard
      // dependencies of the color and copy features.
      inject: ['slots', 'theme', 'locale'],
      apply,
    };
  },
});
