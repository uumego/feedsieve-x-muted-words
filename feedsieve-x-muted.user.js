// ==UserScript==
// @name         FeedSieve → X Muted Words Manager
// @namespace    feedsieve-x-muted-smart
// @version      4.0.0
// @description  内置固定关键词快照，支持关键词管理、扫描去重与分批导入 X 已隐藏字词
// @match        https://x.com/settings/muted_keywords*
// @match        https://x.com/settings/add_muted_keyword*
// @resource     keywordPack https://raw.githubusercontent.com/realchendahuang/feedsieve/b0af90e4620b58b88f9613d58f5e7a0962af497f/community/keyword-packs/official.json
// @grant        GM_getResourceText
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const CFG = {
    BATCH_SIZE: 15,
    WORD_DELAY_MIN: 3500,
    WORD_DELAY_MAX: 5500,
    PAGE_WAIT: 1300,
    MAX_CONSECUTIVE_FAILURES: 2,
    MAX_SCAN_ROUNDS: 220,
    SCAN_WAIT: 700,
    MAX_NO_NEW_ROUNDS: 10,
  };

  const KEY = {
    SUCCESS: 'fsx_v4_success',
    FAILED: 'fsx_v4_failed',
    LAST_RUN: 'fsx_v4_last_run',
    CUSTOM: 'fsx_v4_custom_keywords',
    DISABLED_BUILTIN: 'fsx_v4_disabled_builtin',
  };

  const PACK_IDS = new Set(['adult_gray_traffic', 'crypto_giveaway_scams']);
  const SNAPSHOT_VERSION = '2026.09.13.2';

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clean = s => String(s || '').replace(/\u200B/g, '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  const normalize = s => clean(s).toLowerCase();
  const randomDelay = () => Math.floor(CFG.WORD_DELAY_MIN + Math.random() * (CFG.WORD_DELAY_MAX - CFG.WORD_DELAY_MIN));
  const log = (...a) => console.log('%c[FeedSieve→X]', 'color:#1d9bf0;font-weight:bold', ...a);
  const warn = (...a) => console.warn('[FeedSieve→X]', ...a);

  function compareKeys(s) {
    const original = String(s || '').replace(/\u200B/g, '').replace(/\u00A0/g, ' ').trim();
    const keys = new Set();
    const full = normalize(original);
    if (full) keys.add(full);
    const multi = original.split(/\s{2,}/)[0];
    if (multi) keys.add(normalize(multi));
    const symbol = original.split(/[｜|—–：:]+/)[0];
    if (symbol) keys.add(normalize(symbol));
    return [...keys].filter(Boolean);
  }

  function getBuiltinKeywords() {
    try {
      const raw = GM_getResourceText('keywordPack');
      const json = JSON.parse(raw);
      const out = new Map();
      for (const pack of json.packs || []) {
        if (!PACK_IDS.has(pack.id)) continue;
        for (const rule of pack.rules || []) {
          const phrase = clean(rule.phrase);
          if (phrase) out.set(normalize(phrase), phrase);
        }
      }
      return [...out.values()];
    } catch (e) {
      console.error('[FeedSieve→X] 读取内置词库失败', e);
      return [];
    }
  }

  function getCustomKeywords() { return GM_getValue(KEY.CUSTOM, []); }
  function setCustomKeywords(v) {
    const m = new Map();
    for (const x of v) if (clean(x)) m.set(normalize(x), clean(x));
    GM_setValue(KEY.CUSTOM, [...m.values()]);
  }
  function getDisabledBuiltin() { return new Set(GM_getValue(KEY.DISABLED_BUILTIN, [])); }
  function setDisabledBuiltin(set) { GM_setValue(KEY.DISABLED_BUILTIN, [...set]); }
  function getSavedSuccess() { return GM_getValue(KEY.SUCCESS, []); }
  function getSavedFailed() { return GM_getValue(KEY.FAILED, []); }
  function saveFailed(v) { GM_setValue(KEY.FAILED, v); }
  function saveSuccess(v) {
    const m = new Map();
    for (const x of v) m.set(normalize(x), clean(x));
    GM_setValue(KEY.SUCCESS, [...m.values()]);
  }

  function getActiveKeywords() {
    const disabled = getDisabledBuiltin();
    const out = new Map();
    for (const word of getBuiltinKeywords()) {
      const k = normalize(word);
      if (!disabled.has(k)) out.set(k, word);
    }
    for (const word of getCustomKeywords()) out.set(normalize(word), clean(word));
    return [...out.values()];
  }

  function addCustomFromText(text) {
    const incoming = String(text || '').split(/[\n,，;；]+/).map(clean).filter(Boolean);
    const before = getCustomKeywords();
    setCustomKeywords([...before, ...incoming]);
    return Math.max(0, getCustomKeywords().length - before.length);
  }

  function removeKeyword(word, source) {
    const k = normalize(word);
    if (source === 'custom') {
      setCustomKeywords(getCustomKeywords().filter(x => normalize(x) !== k));
    } else {
      const disabled = getDisabledBuiltin();
      disabled.add(k);
      setDisabledBuiltin(disabled);
    }
  }

  function restoreBuiltin(word) {
    const disabled = getDisabledBuiltin();
    disabled.delete(normalize(word));
    setDisabledBuiltin(disabled);
  }

  function findButton(pattern) {
    return [...document.querySelectorAll('button,[role="button"],a')].find(el => {
      const t = clean(el.innerText || el.textContent || el.getAttribute('aria-label'));
      return pattern.test(t);
    });
  }

  function setReactValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function extractVisibleMutedWords() {
    const result = new Map();
    const main = document.querySelector('main');
    if (!main) return result;
    for (const div of main.querySelectorAll('div')) {
      const lines = String(div.innerText || '').split('\n').map(clean).filter(Boolean);
      if (lines.length !== 2) continue;
      const [word, duration] = lines;
      if (!/^(永久|forever)$/i.test(duration)) continue;
      if (!word || word.length > 120) continue;
      result.set(normalize(word), word);
    }
    return result;
  }

  async function scanExistingMutedWords(statusCb) {
    if (location.pathname.includes('/settings/add_muted_keyword')) {
      history.back();
      await sleep(1800);
    }
    await sleep(1200);
    const collected = new Map();
    let noNew = 0;
    let lastCount = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    await sleep(900);

    for (let i = 0; i < CFG.MAX_SCAN_ROUNDS; i++) {
      const visible = extractVisibleMutedWords();
      for (const [k, v] of visible) collected.set(k, v);
      if (collected.size === lastCount) noNew++; else { noNew = 0; lastCount = collected.size; }
      statusCb?.(`扫描第 ${i + 1} 轮\n已发现：${collected.size} 条`);
      if (noNew >= CFG.MAX_NO_NEW_ROUNDS) break;
      const before = window.scrollY || document.documentElement.scrollTop;
      window.scrollBy({ top: Math.max(650, window.innerHeight * 0.8), behavior: 'smooth' });
      await sleep(CFG.SCAN_WAIT);
      const after = window.scrollY || document.documentElement.scrollTop;
      if (Math.abs(after - before) < 3) { noNew++; await sleep(500); }
    }

    for (const [k, v] of extractVisibleMutedWords()) collected.set(k, v);
    console.table([...collected.values()]);
    return collected;
  }

  async function openAddPage() {
    if (location.pathname.includes('/settings/add_muted_keyword')) return;
    const direct = document.querySelector('a[href="/settings/add_muted_keyword"]');
    if (direct) { direct.click(); await sleep(CFG.PAGE_WAIT); return; }
    const add = findButton(/^(添加|新增|add|\+)$/i);
    if (!add) throw new Error('找不到添加隐藏词按钮');
    add.click();
    await sleep(CFG.PAGE_WAIT);
  }

  function findKeywordInput() {
    return document.querySelector('input[name="keyword"]') || [...document.querySelectorAll('input,textarea')].find(el => {
      const d = `${el.placeholder || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
      return d.includes('word') || d.includes('phrase') || d.includes('keyword') || d.includes('字词') || d.includes('关键词');
    });
  }

  async function addOne(word) {
    await openAddPage();
    const input = findKeywordInput();
    if (!input) throw new Error('找不到关键词输入框');
    input.focus();
    setReactValue(input, word);
    await sleep(450);
    const save = findButton(/^(保存|save)$/i);
    if (!save) throw new Error('找不到保存按钮');
    if (save.disabled || save.getAttribute('aria-disabled') === 'true') throw new Error('保存按钮不可用');
    save.click();
    await sleep(1500);
    const pageText = document.body.innerText || '';
    if (/出了点问题|稍后再试|try again|something went wrong|rate limit|too many/i.test(pageText)) throw new Error('疑似触发 X 限流');
  }

  function setStatus(text) {
    const el = document.getElementById('fsx-status');
    if (el) el.innerText = text;
    log(text);
  }

  function exportKeywords() {
    const text = getActiveKeywords().join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `feedsieve-x-keywords-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function openManager() {
    document.getElementById('fsx-manager')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'fsx-manager';
    Object.assign(overlay.style, { position:'fixed', inset:'0', background:'rgba(0,0,0,.65)', zIndex:10000000, display:'flex', alignItems:'center', justifyContent:'center' });
    overlay.innerHTML = `
      <div style="width:min(760px,92vw);height:min(760px,88vh);background:#111;color:#fff;border-radius:16px;padding:16px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.5)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div><b style="font-size:18px">关键词管理</b><div id="fsx-manager-stats" style="font-size:12px;color:#aaa;margin-top:3px"></div></div>
          <button id="fsx-manager-close" style="background:#333;color:#fff;border:0;border-radius:8px;padding:7px 10px;cursor:pointer">关闭</button>
        </div>
        <input id="fsx-search" placeholder="搜索关键词" style="padding:9px 10px;border-radius:10px;border:1px solid #444;background:#000;color:#fff;margin-bottom:8px" />
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <textarea id="fsx-add-text" placeholder="添加关键词：一行一个，也支持逗号分隔" style="flex:1;height:70px;padding:8px;border-radius:10px;border:1px solid #444;background:#000;color:#fff"></textarea>
          <button id="fsx-add-btn" style="width:90px;background:#1d9bf0;color:#fff;border:0;border-radius:10px;font-weight:700;cursor:pointer">添加</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
          <button id="fsx-export" style="background:#222;color:#fff;border:1px solid #444;border-radius:9px;padding:7px 10px;cursor:pointer">导出 TXT</button>
          <button id="fsx-reset-builtin" style="background:#222;color:#fff;border:1px solid #444;border-radius:9px;padding:7px 10px;cursor:pointer">恢复全部内置词</button>
          <span style="font-size:12px;color:#999;align-self:center">删除内置词只会从脚本词库停用，不会从 X 已隐藏列表中删除。</span>
        </div>
        <div id="fsx-list" style="flex:1;overflow:auto;border:1px solid #333;border-radius:10px;padding:6px"></div>
      </div>`;
    document.body.appendChild(overlay);

    const render = () => {
      const q = normalize(document.getElementById('fsx-search').value || '');
      const builtin = getBuiltinKeywords();
      const disabled = getDisabledBuiltin();
      const custom = getCustomKeywords();
      const rows = [];
      for (const w of builtin) rows.push({ word:w, source:'builtin', disabled:disabled.has(normalize(w)) });
      for (const w of custom) rows.push({ word:w, source:'custom', disabled:false });
      const shown = rows.filter(r => !q || normalize(r.word).includes(q));
      document.getElementById('fsx-manager-stats').textContent = `内置 ${builtin.length} ｜ 自定义 ${custom.length} ｜ 已停用内置 ${disabled.size} ｜ 当前启用 ${getActiveKeywords().length}`;
      document.getElementById('fsx-list').innerHTML = shown.map((r,i) => `
        <div data-i="${i}" style="display:flex;gap:8px;align-items:center;padding:7px 8px;border-bottom:1px solid #222;opacity:${r.disabled ? .45 : 1}">
          <div style="flex:1;word-break:break-all">${escapeHtml(r.word)} <span style="font-size:11px;color:${r.source==='custom'?'#7dd3fc':'#aaa'}">${r.source==='custom'?'自定义':'内置'}</span></div>
          <button data-action="${r.disabled?'restore':'remove'}" data-source="${r.source}" data-word="${escapeAttr(r.word)}" style="background:${r.disabled?'#14532d':'#3f1d1d'};color:#fff;border:0;border-radius:7px;padding:5px 8px;cursor:pointer">${r.disabled?'恢复':'删除'}</button>
        </div>`).join('');
      document.querySelectorAll('#fsx-list button').forEach(btn => btn.onclick = () => {
        const word = btn.dataset.word;
        const source = btn.dataset.source;
        if (btn.dataset.action === 'restore') restoreBuiltin(word); else removeKeyword(word, source);
        render();
      });
    };

    document.getElementById('fsx-manager-close').onclick = () => overlay.remove();
    document.getElementById('fsx-search').oninput = render;
    document.getElementById('fsx-add-btn').onclick = () => {
      const ta = document.getElementById('fsx-add-text');
      const n = addCustomFromText(ta.value);
      ta.value = '';
      render();
      alert(`已新增 ${n} 个自定义关键词`);
    };
    document.getElementById('fsx-export').onclick = exportKeywords;
    document.getElementById('fsx-reset-builtin').onclick = () => {
      if (!confirm('恢复所有被停用的内置关键词？')) return;
      setDisabledBuiltin(new Set());
      render();
    };
    render();
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return escapeHtml(s); }

  async function runBatch() {
    const button = document.getElementById('fsx-run');
    if (button) button.disabled = true;
    try {
      const words = getActiveKeywords();
      if (!words.length) throw new Error('当前词库为空');
      setStatus(`词库：${words.length}\n正在扫描 X 已隐藏词……`);
      const xExisting = await scanExistingMutedWords(msg => setStatus(`词库：${words.length}\n${msg}`));
      const localSuccess = getSavedSuccess();
      const already = new Set();
      for (const word of xExisting.values()) for (const k of compareKeys(word)) already.add(k);
      for (const word of localSuccess) for (const k of compareKeys(word)) already.add(k);
      const isAlready = word => compareKeys(word).some(k => already.has(k));
      const excluded = words.filter(isAlready);
      const pending = words.filter(w => !isAlready(w));

      console.log('[FeedSieve→X] 词库总数：', words.length);
      console.log('[FeedSieve→X] X 扫描已有：', xExisting.size);
      console.log('[FeedSieve→X] 成功排除：', excluded.length);
      console.log('[FeedSieve→X] 剩余待添加：', pending.length);
      console.table(excluded.slice(0,100));
      setStatus(`词库：${words.length}\nX 已有：${xExisting.size}\n成功排除：${excluded.length}\n剩余：${pending.length}`);
      if (!pending.length) return alert('当前启用词库已全部存在于 X。');

      const batch = pending.slice(0, CFG.BATCH_SIZE);
      if (!confirm(`当前启用词库：${words.length}\nX 扫描已有：${xExisting.size}\n成功排除：${excluded.length}\n剩余：${pending.length}\n\n本次添加 ${batch.length} 条，是否开始？`)) return;

      let consecutiveFailures = 0;
      const successes = [];
      const failures = getSavedFailed();
      for (let i=0;i<batch.length;i++) {
        const word = batch[i];
        if (isAlready(word)) continue;
        setStatus(`本批 ${i+1}/${batch.length}\n正在添加：${word}\n成功：${successes.length}`);
        try {
          await addOne(word);
          successes.push(word);
          consecutiveFailures = 0;
          for (const k of compareKeys(word)) already.add(k);
          const saved = getSavedSuccess(); saved.push(word); saveSuccess(saved);
        } catch (e) {
          consecutiveFailures++;
          failures.push({word,error:e.message,time:new Date().toISOString()});
          saveFailed(failures);
          if (consecutiveFailures >= CFG.MAX_CONSECUTIVE_FAILURES) {
            alert(`已自动停止：连续 ${consecutiveFailures} 次失败，可能触发 X 限流。`);
            return;
          }
        }
        if (i < batch.length-1) await sleep(randomDelay());
      }
      GM_setValue(KEY.LAST_RUN, new Date().toISOString());
      setStatus(`本批完成\n成功：${successes.length}/${batch.length}`);
      alert(`本批完成：成功 ${successes.length} 条`);
    } catch (e) {
      console.error(e); setStatus(`错误：${e.message}`); alert(`运行失败：${e.message}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function createPanel() {
    if (document.getElementById('feedsieve-v4-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'feedsieve-v4-panel';
    Object.assign(panel.style,{position:'fixed',right:'22px',bottom:'22px',width:'325px',padding:'15px',zIndex:9999999,borderRadius:'16px',background:'#111',color:'#fff',fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',boxShadow:'0 8px 30px rgba(0,0,0,.35)'});
    panel.innerHTML = `
      <div style="font-size:16px;font-weight:700;margin-bottom:4px">FeedSieve → X v4</div>
      <div style="font-size:11px;color:#888;margin-bottom:9px">内置固定词库快照 ${SNAPSHOT_VERSION}</div>
      <div id="fsx-status" style="font-size:13px;line-height:1.6;white-space:pre-line;margin-bottom:12px">准备就绪｜启用 ${getActiveKeywords().length} 条</div>
      <button id="fsx-run" style="width:100%;padding:10px;border:0;border-radius:20px;background:#1d9bf0;color:#fff;font-weight:700;cursor:pointer;margin-bottom:8px">扫描并添加下一批</button>
      <button id="fsx-manage" style="width:100%;padding:9px;border:1px solid #555;border-radius:20px;background:#222;color:#fff;cursor:pointer;margin-bottom:8px">管理关键词</button>
      <button id="fsx-scan" style="width:100%;padding:9px;border:1px solid #555;border-radius:20px;background:#222;color:#fff;cursor:pointer;margin-bottom:8px">扫描全部已添加</button>
      <button id="fsx-reset-progress" style="width:100%;padding:8px;border:0;border-radius:20px;background:#333;color:#bbb;cursor:pointer">清除导入进度</button>`;
    document.body.appendChild(panel);
    document.getElementById('fsx-run').onclick = runBatch;
    document.getElementById('fsx-manage').onclick = openManager;
    document.getElementById('fsx-scan').onclick = async () => {
      const map = await scanExistingMutedWords(setStatus);
      setStatus(`扫描完成\nX 已隐藏：${map.size} 条`);
      alert(`扫描完成：识别到 ${map.size} 条已隐藏词`);
    };
    document.getElementById('fsx-reset-progress').onclick = () => {
      if (!confirm('清除脚本记录的导入进度？不会删除 X 已隐藏词，也不会改关键词库。')) return;
      GM_deleteValue(KEY.SUCCESS); GM_deleteValue(KEY.FAILED); GM_deleteValue(KEY.LAST_RUN); setStatus('导入进度已清除');
    };
  }

  window.FSX = { active:getActiveKeywords, builtin:getBuiltinKeywords, custom:getCustomKeywords, scan:scanExistingMutedWords, visible:extractVisibleMutedWords, manage:openManager };
  createPanel();
  setInterval(createPanel,1500);
})();
