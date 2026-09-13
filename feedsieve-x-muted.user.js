// ==UserScript==
// @name         FeedSieve → X Muted Words Importer
// @namespace    feedsieve-x-muted-smart
// @version      3.1.0
// @description  自动读取 FeedSieve、扫描 X 已隐藏词、智能排除已有内容、分批导入并保存进度
// @match        https://x.com/settings/muted_keywords*
// @match        https://x.com/settings/add_muted_keyword*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @connect      feedsieve.win
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
    SUCCESS: 'fsx_v31_success',
    FAILED: 'fsx_v31_failed',
    LAST_RUN: 'fsx_v31_last_run',
  };

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clean = s => String(s || '').replace(/\u200B/g, '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  const normalize = s => clean(s).toLowerCase();
  const randomDelay = () => Math.floor(CFG.WORD_DELAY_MIN + Math.random() * (CFG.WORD_DELAY_MAX - CFG.WORD_DELAY_MIN));
  const log = (...args) => console.log('%c[FeedSieve→X]', 'color:#1d9bf0;font-weight:bold', ...args);
  const warn = (...args) => console.warn('[FeedSieve→X]', ...args);

  function compareKeys(s) {
    const original = String(s || '').replace(/\u200B/g, '').replace(/\u00A0/g, ' ').trim();
    const keys = new Set();
    const full = normalize(original);
    if (full) keys.add(full);

    const multiSpace = original.split(/\s{2,}/)[0];
    if (multiSpace) keys.add(normalize(multiSpace));

    const symbolPart = original.split(/[｜|—–：:]+/)[0];
    if (symbolPart) keys.add(normalize(symbolPart));

    return [...keys].filter(Boolean);
  }

  function getSavedSuccess() { return GM_getValue(KEY.SUCCESS, []); }
  function getSavedFailed() { return GM_getValue(KEY.FAILED, []); }
  function saveFailed(v) { GM_setValue(KEY.FAILED, v); }
  function saveSuccess(values) {
    const map = new Map();
    for (const value of values) map.set(normalize(value), value);
    GM_setValue(KEY.SUCCESS, [...map.values()]);
  }

  function fetchFeedSieve() {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://feedsieve.win/lists/keywords',
        onload: r => r.status >= 200 && r.status < 300 ? resolve(r.responseText) : reject(new Error(`FeedSieve HTTP ${r.status}`)),
        onerror: () => reject(new Error('无法读取 FeedSieve')),
      });
    });
  }

  function parseFeedSieve(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const selectors = ['li', 'span', 'code', 'td', 'button'];
    const ignore = [
      /^feedsieve$/i,
      /^福滤娃$/i,
      /^黄推\s*\/\s*成人引流$/i,
      /^crypto scam giveaway$/i,
      /^首页$/i,
      /^提交$/i,
      /^搜索$/i,
      /^名单公示$/i,
      /^白名单$/i,
      /^黑名单$/i,
      /^\d+\s*条$/,
      /^20\d\d[.\-/]\d+/,
    ];

    const raw = selectors.flatMap(selector => [...doc.querySelectorAll(selector)].map(el => clean(el.textContent)).filter(Boolean));
    const out = new Map();

    for (const text of raw) {
      if (!text || text.length < 2 || text.length > 100) continue;
      if (/https?:\/\//i.test(text)) continue;
      if (ignore.some(re => re.test(text))) continue;
      out.set(normalize(text), text);
    }

    return [...out.values()];
  }

  function findButton(pattern) {
    return [...document.querySelectorAll('button,[role="button"],a')].find(el => {
      const text = clean(el.innerText || el.textContent || el.getAttribute('aria-label'));
      return pattern.test(text);
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
    let noNewRounds = 0;
    let lastCount = 0;

    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    await sleep(1000);

    for (let i = 0; i < CFG.MAX_SCAN_ROUNDS; i++) {
      const visible = extractVisibleMutedWords();
      for (const [key, value] of visible) collected.set(key, value);

      if (collected.size === lastCount) noNewRounds++; else {
        noNewRounds = 0;
        lastCount = collected.size;
      }

      statusCb?.(`扫描第 ${i + 1} 轮\n已发现：${collected.size} 条`);
      if (noNewRounds >= CFG.MAX_NO_NEW_ROUNDS) break;

      const before = window.scrollY || document.documentElement.scrollTop;
      window.scrollBy({ top: Math.max(650, window.innerHeight * 0.8), behavior: 'smooth' });
      await sleep(CFG.SCAN_WAIT);
      const after = window.scrollY || document.documentElement.scrollTop;

      if (Math.abs(after - before) < 3) {
        noNewRounds++;
        await sleep(600);
      }
    }

    for (const [key, value] of extractVisibleMutedWords()) collected.set(key, value);
    console.table([...collected.values()]);
    return collected;
  }

  async function openAddPage() {
    if (location.pathname.includes('/settings/add_muted_keyword')) return;

    const direct = document.querySelector('a[href="/settings/add_muted_keyword"]');
    if (direct) {
      direct.click();
      await sleep(CFG.PAGE_WAIT);
      return;
    }

    const add = findButton(/^(添加|新增|add|\+)$/i);
    if (!add) throw new Error('找不到添加隐藏词按钮');
    add.click();
    await sleep(CFG.PAGE_WAIT);
  }

  function findKeywordInput() {
    return document.querySelector('input[name="keyword"]') || [...document.querySelectorAll('input,textarea')].find(el => {
      const descriptor = `${el.placeholder || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
      return descriptor.includes('word') || descriptor.includes('phrase') || descriptor.includes('keyword') || descriptor.includes('字词') || descriptor.includes('关键词');
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
    if (/出了点问题|稍后再试|try again|something went wrong|rate limit|too many/i.test(pageText)) {
      throw new Error('疑似触发 X 限流');
    }
  }

  function setStatus(text) {
    const el = document.getElementById('fsx-status');
    if (el) el.innerText = text;
    log(text);
  }

  async function runBatch() {
    const button = document.getElementById('fsx-run');
    if (button) button.disabled = true;

    try {
      setStatus('正在读取 FeedSieve……');
      const feedWords = parseFeedSieve(await fetchFeedSieve());
      if (feedWords.length < 100) throw new Error(`FeedSieve 仅识别 ${feedWords.length} 条，已停止`);

      setStatus(`FeedSieve：${feedWords.length}\n正在扫描 X 已隐藏词……`);
      const xExisting = await scanExistingMutedWords(msg => setStatus(`FeedSieve：${feedWords.length}\n${msg}`));
      const localSuccess = getSavedSuccess();

      const already = new Set();
      for (const word of xExisting.values()) for (const key of compareKeys(word)) already.add(key);
      for (const word of localSuccess) for (const key of compareKeys(word)) already.add(key);

      const isAlreadyAdded = word => compareKeys(word).some(key => already.has(key));
      const excluded = feedWords.filter(isAlreadyAdded);
      const pending = feedWords.filter(word => !isAlreadyAdded(word));

      console.log('[FeedSieve→X] FeedSieve 总数：', feedWords.length);
      console.log('[FeedSieve→X] X 扫描已有：', xExisting.size);
      console.log('[FeedSieve→X] 本地成功：', localSuccess.length);
      console.log('[FeedSieve→X] 成功排除：', excluded.length);
      console.log('[FeedSieve→X] 剩余待添加：', pending.length);
      console.table(excluded.slice(0, 100));

      setStatus(`FeedSieve：${feedWords.length}\nX 已有：${xExisting.size}\n成功排除：${excluded.length}\n剩余：${pending.length}`);
      if (!pending.length) return alert('已经没有需要添加的 FeedSieve 关键词了。');

      const batch = pending.slice(0, CFG.BATCH_SIZE);
      if (!confirm(`FeedSieve：${feedWords.length} 条\n\nX 扫描已有：${xExisting.size}\n成功排除：${excluded.length}\n剩余待添加：${pending.length}\n\n本次添加：${batch.length} 条\n\n是否开始？`)) return;

      let consecutiveFailures = 0;
      const thisSuccess = [];
      const failures = getSavedFailed();

      for (let i = 0; i < batch.length; i++) {
        const word = batch[i];
        if (isAlreadyAdded(word)) {
          log('⊘ 已存在，跳过：', word);
          continue;
        }

        setStatus(`本批 ${i + 1}/${batch.length}\n正在添加：${word}\n成功：${thisSuccess.length}\n连续失败：${consecutiveFailures}`);

        try {
          await addOne(word);
          thisSuccess.push(word);
          consecutiveFailures = 0;
          for (const key of compareKeys(word)) already.add(key);

          const saved = getSavedSuccess();
          saved.push(word);
          saveSuccess(saved);
          log('✓ 成功', word);
        } catch (e) {
          consecutiveFailures++;
          failures.push({ word, error: e.message, time: new Date().toISOString() });
          saveFailed(failures);
          warn('✗ 失败', word, e.message);

          if (consecutiveFailures >= CFG.MAX_CONSECUTIVE_FAILURES) {
            setStatus(`自动停止\n连续失败：${consecutiveFailures}\n本批成功：${thisSuccess.length}`);
            alert(`已自动停止。\n\n连续 ${consecutiveFailures} 次失败，可能触发 X 添加限制。\n\n本批成功：${thisSuccess.length}\n\n等到手动可以再次正常添加后，再继续。`);
            return;
          }
        }

        if (i < batch.length - 1) {
          const delay = randomDelay();
          setStatus(`本批 ${i + 1}/${batch.length}\n成功：${thisSuccess.length}\n等待 ${(delay / 1000).toFixed(1)} 秒……`);
          await sleep(delay);
        }
      }

      GM_setValue(KEY.LAST_RUN, new Date().toISOString());
      setStatus(`本批完成\n成功：${thisSuccess.length}/${batch.length}\n剩余约：${Math.max(0, pending.length - thisSuccess.length)}`);
      alert(`本批完成\n\n成功：${thisSuccess.length}\n本批：${batch.length}\n\n下次再次点击“扫描并添加下一批”即可继续。`);
    } catch (e) {
      console.error(e);
      setStatus(`错误：${e.message}`);
      alert(`运行失败：\n${e.message}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function createPanel() {
    if (document.getElementById('feedsieve-v31-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'feedsieve-v31-panel';
    Object.assign(panel.style, {
      position: 'fixed', right: '22px', bottom: '22px', width: '325px', padding: '15px', zIndex: 9999999,
      borderRadius: '16px', background: '#111', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
      boxShadow: '0 8px 30px rgba(0,0,0,.35)'
    });

    panel.innerHTML = `
      <div style="font-size:16px;font-weight:700;margin-bottom:10px">FeedSieve → X v3.1</div>
      <div id="fsx-status" style="font-size:13px;line-height:1.6;white-space:pre-line;margin-bottom:12px">准备就绪</div>
      <button id="fsx-run" style="width:100%;padding:10px;border:0;border-radius:20px;background:#1d9bf0;color:#fff;font-weight:700;cursor:pointer;margin-bottom:8px">扫描并添加下一批</button>
      <button id="fsx-scan" style="width:100%;padding:9px;border:1px solid #555;border-radius:20px;background:#222;color:#fff;cursor:pointer;margin-bottom:8px">扫描全部已添加</button>
      <button id="fsx-visible" style="width:100%;padding:9px;border:1px solid #555;border-radius:20px;background:#222;color:#fff;cursor:pointer;margin-bottom:8px">查看当前可见词</button>
      <button id="fsx-local" style="width:100%;padding:9px;border:1px solid #555;border-radius:20px;background:#222;color:#fff;cursor:pointer;margin-bottom:8px">查看本地进度</button>
      <button id="fsx-reset" style="width:100%;padding:8px;border:0;border-radius:20px;background:#333;color:#bbb;cursor:pointer">清除本地记录</button>`;

    document.body.appendChild(panel);
    document.getElementById('fsx-run').onclick = runBatch;
    document.getElementById('fsx-scan').onclick = async () => {
      const map = await scanExistingMutedWords(setStatus);
      setStatus(`扫描完成\nX 已隐藏：${map.size} 条`);
      alert(`扫描完成\n\n共识别到 ${map.size} 条已隐藏词`);
    };
    document.getElementById('fsx-visible').onclick = () => {
      const map = extractVisibleMutedWords();
      console.table([...map.values()]);
      setStatus(`当前页面可见：${map.size} 条`);
    };
    document.getElementById('fsx-local').onclick = () => {
      const success = getSavedSuccess();
      const failed = getSavedFailed();
      console.log('本地成功记录：', success);
      console.log('本地失败记录：', failed);
      console.table(success);
      setStatus(`本地成功：${success.length}\n本地失败记录：${failed.length}`);
    };
    document.getElementById('fsx-reset').onclick = () => {
      if (!confirm('仅清除脚本本地记录，不会删除 X 已隐藏词。确定吗？')) return;
      GM_deleteValue(KEY.SUCCESS);
      GM_deleteValue(KEY.FAILED);
      GM_deleteValue(KEY.LAST_RUN);
      setStatus('本地记录已清除');
    };
  }

  window.FSX = {
    visible: extractVisibleMutedWords,
    scan: scanExistingMutedWords,
    feedParse: parseFeedSieve,
    localSuccess: getSavedSuccess,
    localFailed: getSavedFailed,
    compareKeys,
  };

  createPanel();
  setInterval(createPanel, 1500);
})();
