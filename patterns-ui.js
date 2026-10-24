/* 패턴(전술) 화면: 목록 / 보기(애니메이션) / 그리기(편집).
   index.html 의 공용 함수($, esc, S, save, sheet, toast …)를 쓴다 — 호출 시점에는 모두 정의되어 있음 */
'use strict';
var BASKET = [25, 5.25];
var PCOL = { o: '#1F5FBF', d: '#C8372D', ball: '#F07A2E', pass: '#E8641B', line: '#A7774A' };
var VB = '-3 -5 56 53';

function clone(o) { return JSON.parse(JSON.stringify(o)) }
function allPatterns() { return PATTERNS.concat(S.patterns) }
function findPattern(id) { return allPatterns().filter(function (p) { return p.id === id })[0] }

/* 수비 자동 위치: 자기 선수에서 골대 쪽으로 약 1m */
function autoDef(o) {
  var x = {};
  for (var k in o) {
    var v = o[k], dx = BASKET[0] - v[0], dy = BASKET[1] - v[1], d = Math.hypot(dx, dy);
    var s = d > 5 ? 3 : d * 0.5;
    x[k] = d ? [v[0] + dx / d * s, v[1] + dy / d * s] : [v[0], v[1] + 1];
  }
  return x;
}
/* 프레임마다 빠진 값은 앞 프레임에서 이어받아 완성된 위치로 만든다 */
function normPattern(p) {
  var out = [], pO = {}, pX = {}, pB = null;
  p.frames.forEach(function (f) {
    var o = Object.assign({}, pO, clone(f.o || {}));
    var ball = f.ball != null ? String(f.ball) : pB, x, k;
    if (p.def === 'manual') { x = Object.assign({}, pX, clone(f.x || {})); pX = x }
    else if (p.def === 'none') x = {};
    else { x = autoDef(o); for (k in (f.x || {})) x[k] = f.x[k] }
    out.push({ o: o, x: x, ball: ball, screen: (f.screen || []).map(String), note: f.note || '' });
    pO = o; pB = ball;
  });
  return { frames: out };
}

/* ---------- 코트 그림 ---------- */
function courtDefs() {
  function m(id, c) { return '<marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="1.8" markerHeight="1.8" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="' + c + '"/></marker>' }
  return '<defs>' + m('ah-o', PCOL.o) + m('ah-d', PCOL.d) + m('ah-p', PCOL.pass) + '</defs>';
}
/* 풀코트(full)면 아래쪽에 우리 골대 반 코트를 뒤집어 붙인다. 공격 방향은 항상 위쪽 골대 */
function isFull(p) { return p && p.court === 'full' }
function vbox(full) { return full ? '-3 -5 56 104' : VB }
function halfMarks(w, L) {
  return '<rect x="17" y="0" width="16" height="19" fill="#E8CDA4" stroke="' + L + '" stroke-width=".35"/>' +
    '<path d="M19 19 A6 6 0 0 0 31 19" ' + w + '/>' +
    '<path d="M19 19 A6 6 0 0 1 31 19" ' + w + ' stroke-dasharray="1 1"/>' +
    '<path d="M3 0 L3 14 A23.75 23.75 0 0 0 47 14 L47 0" ' + w + '/>' +
    '<path d="M21 5.25 A4 4 0 0 0 29 5.25" ' + w + '/>' +
    '<line x1="22" y1="4" x2="28" y2="4" stroke="#6B4423" stroke-width=".55"/>' +
    '<circle cx="25" cy="5.25" r=".75" fill="none" stroke="#D2541B" stroke-width=".35"/>';
}
function courtBase(full) {
  var L = PCOL.line, w = 'stroke="' + L + '" stroke-width=".35" fill="none"';
  if (!full) return '<rect x="-3" y="-5" width="56" height="53" fill="#E4CBA6"/>' +
    '<rect x="0" y="0" width="50" height="47" fill="#F2E1C4" stroke="' + L + '" stroke-width=".35"/>' +
    halfMarks(w, L) + '<path d="M19 47 A6 6 0 0 1 31 47" ' + w + '/>';
  return '<rect x="-3" y="-5" width="56" height="104" fill="#E4CBA6"/>' +
    '<rect x="0" y="0" width="50" height="94" fill="#F2E1C4" stroke="' + L + '" stroke-width=".35"/>' +
    halfMarks(w, L) + '<g transform="matrix(1 0 0 -1 0 94)">' + halfMarks(w, L) + '</g>' +
    '<line x1="0" y1="47" x2="50" y2="47" ' + w + '/><circle cx="25" cy="47" r="6" ' + w + '/>' +
    '<text x="25" y="51.5" font-size="1.8" fill="' + L + '" text-anchor="middle" font-family="system-ui,sans-serif">▲ 공격 방향</text>';
}
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]) }
function moved(a, b) { return a && b && dist(a, b) > 0.5 }
function f1(n) { return Math.round(n * 100) / 100 }
/* a→b 선분을 양 끝에서 줄인 좌표 */
function trim(a, b, sa, sb) {
  var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
  if (d < sa + sb + 0.4) return null;
  var ux = dx / d, uy = dy / d;
  return [[a[0] + ux * sa, a[1] + uy * sa], [b[0] - ux * sb, b[1] - uy * sb], ux, uy, d - sa - sb];
}
function arrowLine(a, b, color, marker, extra) {
  var t = trim(a, b, 1.9, 2.1); if (!t) return '';
  return '<line x1="' + f1(t[0][0]) + '" y1="' + f1(t[0][1]) + '" x2="' + f1(t[1][0]) + '" y2="' + f1(t[1][1]) + '" stroke="' + color + '" stroke-width="' + (extra && extra.w || .4) + '"' + (marker ? ' marker-end="url(#' + marker + ')"' : '') + (extra && extra.dash ? ' stroke-dasharray="' + extra.dash + '"' : '') + ' stroke-linecap="round"/>';
}
function zigzag(a, b, color) {
  var t = trim(a, b, 1.9, 2.1); if (!t) return '';
  var s = t[0], ux = t[2], uy = t[3], len = t[4], px = -uy, py = ux, pts = [s], step = 0.8, n = Math.floor((len - 1.4) / step);
  for (var j = 1; j <= n; j++) { var d = j * step, amp = j % 2 ? .7 : -.7; pts.push([s[0] + ux * d + px * amp, s[1] + uy * d + py * amp]) }
  pts.push(t[1]);
  return '<polyline points="' + pts.map(function (p) { return f1(p[0]) + ',' + f1(p[1]) }).join(' ') + '" fill="none" stroke="' + color + '" stroke-width=".4" stroke-linejoin="round" marker-end="url(#ah-o)"/>';
}
function offPlayer(k, p, ghost, sel) {
  return '<g data-pid="o' + k + '"' + (ghost ? ' opacity=".28"' : '') + '>' +
    (sel ? '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="2.6" fill="none" stroke="' + PCOL.o + '" stroke-width=".3" stroke-dasharray=".6 .5"/>' : '') +
    '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="1.8" fill="' + PCOL.o + '" stroke="#fff" stroke-width=".3"/>' +
    '<text x="' + f1(p[0]) + '" y="' + f1(p[1] + .08) + '" font-size="2.2" font-weight="800" fill="#fff" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif">' + k + '</text></g>';
}
function defPlayer(k, p, ghost) {
  return '<g data-pid="x' + k + '"' + (ghost ? ' opacity=".28"' : '') + '>' +
    '<rect x="' + f1(p[0] - 1.6) + '" y="' + f1(p[1] - 1.6) + '" width="3.2" height="3.2" rx=".7" fill="#fff" stroke="' + PCOL.d + '" stroke-width=".4"/>' +
    '<text x="' + f1(p[0]) + '" y="' + f1(p[1] + .08) + '" font-size="2" font-weight="800" fill="' + PCOL.d + '" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif">' + k + '</text></g>';
}
function ballAt(p) { return '<circle cx="' + f1(p[0] + 1.5) + '" cy="' + f1(p[1] - 1.5) + '" r="1" fill="' + PCOL.ball + '" stroke="#7A2E08" stroke-width=".2" pointer-events="none"/>' }
function screenBar(k, fr, prev) {
  var p = fr.o[k], dir = null;
  if (prev && moved(prev.o[k], p)) { var t = trim(prev.o[k], p, 0, 0); if (t) dir = [t[2], t[3]] }
  if (!dir) { /* 가장 가까운 (남의) 수비 쪽을 향해 */
    var best = null, bd = 1e9;
    for (var j in fr.x) { if (j === k) continue; var d = dist(p, fr.x[j]); if (d < bd) { bd = d; best = fr.x[j] } }
    if (best && bd > .1) dir = [(best[0] - p[0]) / bd, (best[1] - p[1]) / bd]; else dir = [0, 1];
  }
  var c = [p[0] + dir[0] * 2.3, p[1] + dir[1] * 2.3], px = -dir[1] * 1.5, py = dir[0] * 1.5;
  return '<line x1="' + f1(c[0] - px) + '" y1="' + f1(c[1] - py) + '" x2="' + f1(c[0] + px) + '" y2="' + f1(c[1] + py) + '" stroke="' + PCOL.o + '" stroke-width=".6" stroke-linecap="round"/>';
}
/* 한 단계(프레임)의 그림. 앞 단계에서 어떻게 움직였는지 화살표로 보여준다 */
function courtFrame(n, i, opt) {
  opt = opt || {};
  var F = n.frames, cur = F[i], prev = i > 0 ? F[i - 1] : null, h = '', k;
  var showD = opt.showD !== false;
  if (prev && opt.arrows !== false) {
    for (k in cur.o) if (moved(prev.o[k], cur.o[k])) h += offPlayer(k, prev.o[k], true);
    if (showD) for (k in cur.x) if (moved(prev.x[k], cur.x[k])) { h += defPlayer(k, prev.x[k], true); h += arrowLine(prev.x[k], cur.x[k], PCOL.d, 'ah-d', { w: .3, dash: '.5 .4' }) }
    for (k in cur.o) {
      if (!moved(prev.o[k], cur.o[k])) continue;
      if (cur.screen.indexOf(k) >= 0) h += arrowLine(prev.o[k], cur.o[k], PCOL.o, null);
      else if (prev.ball === k && cur.ball === k) h += zigzag(prev.o[k], cur.o[k], PCOL.o);
      else h += arrowLine(prev.o[k], cur.o[k], PCOL.o, 'ah-o');
    }
    if (prev.ball && cur.ball && prev.ball !== cur.ball && prev.o[prev.ball] && cur.o[cur.ball])
      h += arrowLine(prev.o[prev.ball], cur.o[cur.ball], PCOL.pass, 'ah-p', { w: .45, dash: '.9 .6' });
  }
  cur.screen.forEach(function (s) { if (cur.o[s]) h += screenBar(s, cur, prev) });
  if (showD) for (k in cur.x) h += defPlayer(k, cur.x[k]);
  for (k in cur.o) h += offPlayer(k, cur.o[k], false, opt.sel === k);
  if (cur.ball && cur.o[cur.ball]) h += ballAt(cur.o[cur.ball]);
  return h;
}
function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 }
function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
/* i-1 → i 사이 움직이는 중간 그림 */
function courtTween(n, i, t, showD) {
  var prev = n.frames[i - 1], cur = n.frames[i], e = ease(t), h = '', k, pos = {};
  for (k in cur.o) pos[k] = lerp(prev.o[k] || cur.o[k], cur.o[k], e);
  if (showD) for (k in cur.x) h += defPlayer(k, lerp(prev.x[k] || cur.x[k], cur.x[k], e));
  for (k in cur.o) h += offPlayer(k, pos[k]);
  if (cur.ball && pos[cur.ball]) {
    if (prev.ball && prev.ball !== cur.ball && pos[prev.ball]) h += ballAt(lerp(pos[prev.ball], pos[cur.ball], ease(Math.min(1, Math.max(0, (t - .1) / .6)))));
    else h += ballAt(pos[cur.ball]);
  }
  return h;
}
var animRaf = 0;
function stopAnim() { cancelAnimationFrame(animRaf); animRaf = 0 }
function animate(n, i, showD, cb) {
  stopAnim();
  var t0 = performance.now(), dur = 1400;
  (function tick(now) {
    var t = Math.min(1, (now - t0) / dur), g = $('#dyn'); if (!g) return;
    g.innerHTML = courtTween(n, i, t, showD);
    if (t < 1) animRaf = requestAnimationFrame(tick); else { animRaf = 0; cb && cb() }
  })(t0);
}
function courtSvg(id, extraCls, full) {
  return '<svg id="' + id + '" class="courtsvg' + (extraCls || '') + (full ? ' full' : '') + '" viewBox="' + vbox(full) + '" role="img" aria-label="' + (full ? '풀코트' : '하프코트') + ' 그림">' + courtDefs() + courtBase(full) + '<g id="dyn"></g></svg>';
}
function legendHtml(showD) {
  return '<div class="legend"><span><i class="lg o"></i>공격</span>' + (showD ? '<span><i class="lg d"></i>수비</span>' : '') +
    '<span><i class="lg b"></i>공</span><span>→ 이동</span><span>⌇ 드리블</span><span style="color:' + PCOL.pass + '">┅ 패스</span><span>┳ 스크린</span></div>';
}

/* ---------- 목록 ---------- */
var pview = { cat: '전체' };
function patternCard(p) {
  var n = normPattern(p);
  return '<a class="card drill pcard" href="#/p/' + encodeURIComponent(p.id) + '">' +
    '<svg class="mini' + (isFull(p) ? ' full' : '') + '" viewBox="' + vbox(isFull(p)) + '" aria-hidden="true">' + courtBase(isFull(p)) + courtFrame(n, 0, { showD: p.def !== 'none', arrows: false }) + '</svg>' +
    '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px"><div class="row"><span class="nm">' + esc(p.name) + '</span>' + (S.fav['p:' + p.id] ? '<span class="star">★</span>' : '') + '</div>' +
    '<div class="sm">' + esc(p.summary || '') + '</div>' +
    '<div class="row"><span class="tag">' + esc(p.cat) + '</span>' + (p.level ? '<span class="tag lv-' + esc(p.level) + '">' + esc(p.level) + '</span>' : '') + '<span class="tag">' + p.frames.length + '단계</span>' + (p.custom ? '<span class="tag vid">내 패턴</span>' : '') + masteryTag(p.id) + '</div></div></a>';
}
function renderPatternList() {
  var cats = ['전체', '내 패턴'].concat(PCATS);
  var items = allPatterns().filter(function (p) { return pview.cat === '전체' || (pview.cat === '내 패턴' ? p.custom : p.cat === pview.cat) });
  $('#app').innerHTML = '<div class="top"><h1>패턴</h1><button class="iconbtn" data-act="newpat" aria-label="새 패턴 그리기">＋</button></div><div class="wrap">' + patTabs('list') +
    '<div class="tip">코트 위에서 <b>공격·수비·공</b>이 어떻게 움직이는지 단계별로 보고, 배운 패턴은 <b>＋</b>로 직접 그려서 저장하세요.</div>' +
    '<div class="chips">' + cats.map(function (c) { return '<button class="chip' + (pview.cat === c ? ' on' : '') + '" data-pcat="' + c + '">' + c + '</button>' }).join('') + '</div>' +
    (items.length ? '<div class="list">' + items.map(patternCard).join('') + '</div>' : '<div class="empty">' + (pview.cat === '내 패턴' ? '오른쪽 위 ＋ 를 눌러 배운 패턴을 그려보세요' : '패턴이 없어요') + '</div>') + '</div>';
  $$('[data-pcat]').forEach(function (b) { b.onclick = function () { pview.cat = b.dataset.pcat; renderPatternList() } });
  $('[data-act=newpat]').onclick = newPattern;
}

/* ---------- 보기 ---------- */
var PV = null;
function renderPatternView(id) {
  var p = findPattern(id); if (!p) { location.hash = '#/pat'; return }
  var n = normPattern(p);
  PV = { p: p, n: n, i: 0, showD: p.def !== 'none', playing: false, timer: 0 };
  var q = p.q || [p.name + ' 농구'];
  $('#app').innerHTML =
    '<div class="top"><button class="iconbtn" data-act="back" aria-label="뒤로">←</button><h1 style="font-size:17px">' + esc(p.cat) + '</h1>' +
    '<button class="iconbtn" data-act="pfav" aria-label="즐겨찾기">' + (S.fav['p:' + p.id] ? '★' : '☆') + '</button>' +
    (p.custom ? '<button class="iconbtn" data-act="pedit" aria-label="고치기">✎</button>' : '<button class="iconbtn" data-act="pcopy" title="복사해서 내 패턴으로">⧉</button>') + '</div>' +
    '<div class="wrap"><div class="hero"><h2>' + esc(p.name) + ' ' + masteryTag(p.id) + '</h2>' + (p.en ? '<div class="en">' + esc(p.en) + '</div>' : '') + (p.summary ? '<p>' + esc(p.summary) + '</p>' : '') + '</div>' +
    '<div class="court">' + courtSvg('court', '', isFull(p)) + '</div>' + legendHtml(PV.showD) +
    '<div class="pctl"><button class="btn sm" data-act="pfirst" aria-label="처음">⏮</button><button class="btn sm" data-act="pprev">◀ 이전</button>' +
    '<span class="pstep" id="pstep"></span><button class="btn sm" data-act="pnext">다음 ▶</button><button class="btn sm pri" data-act="pplay" id="pplay">▶ 전체 재생</button></div>' +
    (p.def !== 'none' ? '<label class="tgl"><input type="checkbox" id="showD" checked> 수비 보이기</label>' : '') +
    '<div class="pnote" id="pnote"></div>' +
    '<div class="sec"><h3>단계별 움직임</h3><ol class="steps" id="psteps">' + n.frames.map(function (f, i) { return '<li data-pi="' + i + '"><span class="num">' + (i + 1) + '</span><div class="tx">' + esc(f.note || '(설명 없음)') + '</div></li>' }).join('') + '</ol></div>' +
    (p.keys && p.keys.length ? '<div class="sec"><h3>핵심 포인트</h3><div class="checks">' + p.keys.map(function (k) { return '<label><span>✓</span><span>' + esc(k) + '</span></label>' }).join('') + '</div></div>' : '') +
    '<div class="sec"><h3>📓 내 일지 <button class="btn sm pri" data-act="pjw" style="margin-left:auto">＋ 일지 쓰기</button></h3><div class="jlist">' + (journalOf(p.id).map(journalCard).join('') || '<p class="note" style="margin:0">아직 이 패턴 일지가 없어요. 배운 날 적어두면 복습할 때 좋아요.</p>') + '</div></div>' +
    '<div class="sec"><h3>내 메모</h3><textarea id="pmemo" rows="4" placeholder="배운 내용, 우리 팀에서 쓰는 방법, 코치님 말씀 등을 적어두세요">' + esc(S.pnotes[p.id] || '') + '</textarea></div>' +
    '<div class="sec" style="margin-bottom:24px"><h3>영상으로 더 보기</h3><div class="btns">' + q.map(function (s) { return '<button class="btn ghost" data-pq="' + esc(s) + '">🔎 ' + esc(s) + '</button>' }).join('') + '</div></div></div>';
  var on = function (a, f) { var b = $('[data-act=' + a + ']'); if (b) b.onclick = f };
  on('back', function () { history.length > 1 ? history.back() : location.hash = '#/pat' });
  on('pfav', function () { var k = 'p:' + p.id; if (S.fav[k]) delete S.fav[k]; else S.fav[k] = 1; save(); this.textContent = S.fav[k] ? '★' : '☆' });
  on('pedit', function () { location.hash = '#/pe/' + encodeURIComponent(p.id) });
  on('pcopy', function () { var c = copyToCustom(p); location.hash = '#/pe/' + encodeURIComponent(c.id); toast('내 패턴으로 복사했어요. 자유롭게 고치세요') });
  on('pfirst', function () { pvStop(); PV.i = 0; pvDraw() });
  on('pprev', function () { pvStop(); if (PV.i > 0) { PV.i--; pvDraw() } });
  on('pnext', function () { pvStop(); pvNext() });
  on('pplay', function () { PV.playing ? pvStop() : pvPlay() });
  var sd = $('#showD'); if (sd) sd.onchange = function () { PV.showD = sd.checked; pvDraw() };
  $$('[data-pi]').forEach(function (li) { li.onclick = function () { pvStop(); PV.i = +li.dataset.pi; pvDraw(); $('#court').scrollIntoView({ behavior: 'smooth', block: 'center' }) } });
  $('#pmemo').oninput = function () { S.pnotes[p.id] = this.value; save() };
  on('pjw', function () { journalSheet(null, p.id) });
  wireJournalCards(function () { renderPatternView(p.id) });
  $$('[data-pq]').forEach(function (b) { b.onclick = function () { openExternal('https://www.youtube.com/results?search_query=' + encodeURIComponent(b.dataset.pq)) } });
  pvDraw();
}
function pvDraw() {
  var n = PV.n, i = PV.i;
  $('#dyn').innerHTML = courtFrame(n, i, { showD: PV.showD });
  $('#pstep').textContent = (i + 1) + ' / ' + n.frames.length;
  $('#pnote').innerHTML = '<b>' + (i + 1) + '단계</b> ' + esc(n.frames[i].note || '');
  $$('#psteps li').forEach(function (li) { li.classList.toggle('cur', +li.dataset.pi === i) });
}
function pvNext(cb) {
  if (PV.i >= PV.n.frames.length - 1) { cb && cb(true); return }
  $('#pnote').innerHTML = '<b>' + (PV.i + 2) + '단계</b> ' + esc(PV.n.frames[PV.i + 1].note || '');
  animate(PV.n, PV.i + 1, PV.showD, function () { PV.i++; pvDraw(); cb && cb() });
}
function pvPlay() {
  PV.playing = true; $('#pplay').textContent = '❚❚ 멈춤';
  PV.i = 0; pvDraw();
  (function step() {
    PV.timer = setTimeout(function () {
      if (!PV || !PV.playing) return;
      pvNext(function (end) { if (end) { pvStop(); return } step() });
    }, 1600);
  })();
}
function pvStop() {
  if (!PV) return;
  PV.playing = false; clearTimeout(PV.timer); stopAnim();
  var b = $('#pplay'); if (b) b.textContent = '▶ 전체 재생';
  if ($('#dyn')) pvDraw();
}

/* ---------- 그리기 (편집) ---------- */
var FIVE_OUT = { 1: [25, 31], 2: [43, 22], 3: [7, 22], 4: [47.5, 5], 5: [2.5, 5] };
function newPattern() {
  var p = { id: 'myp-' + Date.now().toString(36), custom: true, cat: '공격 기본', name: '새 패턴', level: '', summary: '', keys: [], def: 'auto', q: [],
    frames: [{ o: clone(FIVE_OUT), x: {}, ball: '1', screen: [], note: '' }] };
  S.patterns.push(p); save();
  location.hash = '#/pe/' + encodeURIComponent(p.id);
}
function copyToCustom(src) {
  var n = normPattern(src), p = clone(src);
  p.id = 'myp-' + Date.now().toString(36); p.custom = true; p.name = src.name + ' (내 버전)';
  p.frames = n.frames.map(function (f, i) {
    var x = src.def === 'manual' ? f.x : clone(src.frames[i].x || {});
    return { o: f.o, x: x, ball: f.ball, screen: f.screen, note: f.note };
  });
  if (S.pnotes[src.id]) S.pnotes[p.id] = S.pnotes[src.id];
  S.patterns.push(p); save();
  return p;
}
var PE = null;
function renderPatternEdit(id) {
  var p = S.patterns.filter(function (x) { return x.id === id })[0];
  if (!p) { location.hash = '#/pat'; return }
  PE = { p: p, i: 0, tool: 'move', drag: null, sel: null };
  $('#app').innerHTML =
    '<div class="top"><button class="iconbtn" data-act="back" aria-label="완료">←</button><input class="inp" id="pname" value="' + esc(p.name) + '" style="flex:1;font-weight:700" aria-label="패턴 이름">' +
    '<button class="iconbtn" data-act="pview" title="보기">▶</button></div>' +
    '<div class="wrap">' +
    '<div class="seg wide" id="tools"><button data-tool="move" class="on">✋ 선수 옮기기</button><button data-tool="ball">🏀 공 주기</button><button data-tool="screen">┳ 스크린</button></div>' +
    '<p class="note" id="toolhelp" style="margin:6px 0"></p>' +
    '<div class="court">' + courtSvg('court', ' edit', isFull(p)) + '</div>' + legendHtml(p.def !== 'none') +
    '<div class="frames" id="frames"></div>' +
    '<label class="field" style="margin-top:10px"><span id="notelbl">이 단계 설명</span><textarea id="fnote" rows="3" placeholder="예: 5번이 올라와 1번 수비에게 스크린"></textarea></label>' +
    '<div class="btns" style="margin-top:8px"><button class="btn sm" data-act="defreset">수비 자동 위치로</button><button class="btn sm" data-act="playall">▶ 처음부터 움직임 보기</button></div>' +
    '<div class="sec"><h3>패턴 정보</h3>' +
    '<div class="two"><label class="field"><span>분류</span><select class="inp" id="pcat">' + PCATS.concat(['우리 팀']).map(function (c) { return '<option' + (c === p.cat ? ' selected' : '') + '>' + c + '</option>' }).join('') + '</select></label>' +
    '<label class="field"><span>수비</span><select class="inp" id="pdef"><option value="auto"' + (p.def === 'auto' ? ' selected' : '') + '>자동으로 따라가기</option><option value="manual"' + (p.def === 'manual' ? ' selected' : '') + '>직접 배치 (지역방어 등)</option><option value="none"' + (p.def === 'none' ? ' selected' : '') + '>안 보이기</option></select></label></div>' +
    '<label class="field"><span>코트</span><select class="inp" id="pcourt"><option value="half">하프코트</option><option value="full"' + (isFull(p) ? ' selected' : '') + '>풀코트 (속공·프레스)</option></select></label>' +
    '<div class="two"><label class="field"><span>영어 이름 (선택)</span><input class="inp" id="pen" value="' + esc(p.en || '') + '" placeholder="예: Pick and Roll"></label>' +
    '<label class="field"><span>난이도</span><select class="inp" id="plv">' + ['', '입문', '초급', '중급', '고급'].map(function (c) { return '<option value="' + c + '"' + (c === (p.level || '') ? ' selected' : '') + '>' + (c || '선택') + '</option>' }).join('') + '</select></label></div>' +
    '<label class="field"><span>한 줄 설명 — 어떤 패턴이고 언제 쓰나요?</span><input class="inp" id="psum" value="' + esc(p.summary || '') + '" placeholder="예: 빅맨이 스크린 후 골밑으로 롤해서 패스를 받는 2인 공격"></label>' +
    '<label class="field"><span>핵심 포인트 (한 줄에 하나씩)</span><textarea id="pkeys" rows="3" placeholder="예: 스크린은 발 넓게, 움직이지 않고&#10;수비가 쏠리면 롤맨에게 패스">' + esc((p.keys || []).join('\n')) + '</textarea></label>' +
    '<label class="field"><span>유튜브 검색어 (한 줄에 하나씩, 선택)</span><textarea id="pq" rows="2" placeholder="예: 농구 픽앤롤&#10;pick and roll basketball">' + esc((p.q || []).join('\n')) + '</textarea></label>' +
    '<div class="fmt" id="pcheck"></div>' +
    '<button class="btn pri" data-act="pjw" style="width:100%;margin-top:12px">📓 이 패턴 일지 쓰기</button>' +
    '<button class="btn" data-act="pdel" style="color:var(--bad);margin:14px 0 24px">이 패턴 삭제</button></div></div>';
  var on = function (a, f) { var b = $('[data-act=' + a + ']'); if (b) b.onclick = f };
  on('back', function () { location.hash = '#/p/' + encodeURIComponent(p.id) });
  on('pview', function () { location.hash = '#/p/' + encodeURIComponent(p.id) });
  on('defreset', function () { PE.p.frames[PE.i].x = {}; if (p.def === 'manual' && PE.i === 0) PE.p.frames[0].x = autoDef(PE.p.frames[0].o); peSave(); peDraw() });
  on('playall', pePlayAll);
  on('pdel', function () { confirmSheet('"' + p.name + '" 패턴을 지울까요?', function () { S.patterns = S.patterns.filter(function (x) { return x.id !== p.id }); delete S.pnotes[p.id]; delete S.fav['p:' + p.id]; save(); location.hash = '#/pat' }) });
  $('#pname').oninput = function () { p.name = this.value.trim() || '새 패턴'; save(); peCheck() };
  $('#pcat').onchange = function () { p.cat = this.value; save() };
  $('#pcourt').onchange = function () { p.court = this.value === 'full' ? 'full' : undefined; save(); renderPatternEdit(p.id) };
  $('#pdef').onchange = function () {
    p.def = this.value;
    if (p.def === 'manual' && !Object.keys(p.frames[0].x || {}).length) p.frames[0].x = autoDef(p.frames[0].o);
    save(); peDraw();
  };
  $('#psum').oninput = function () { p.summary = this.value; save(); peCheck() };
  $('#pkeys').oninput = function () { p.keys = this.value.split('\n').map(function (s) { return s.trim() }).filter(Boolean); save(); peCheck() };
  $('#pq').oninput = function () { p.q = this.value.split('\n').map(function (s) { return s.trim() }).filter(Boolean); save() };
  $('#pen').oninput = function () { p.en = this.value.trim(); save() };
  $('#plv').onchange = function () { p.level = this.value; save(); peCheck() };
  on('pjw', function () { journalSheet(null, p.id) });
  $('#fnote').oninput = function () { p.frames[PE.i].note = this.value; save(); peCheck() };
  $$('[data-tool]').forEach(function (b) { b.onclick = function () { PE.tool = b.dataset.tool; $$('[data-tool]').forEach(function (x) { x.classList.toggle('on', x === b) }); peHelp() } });
  peWireCourt();
  peDraw(); peHelp();
}
function peHelp() {
  $('#toolhelp').textContent = {
    move: '선수(파란 원·빨간 네모)를 손가락으로 끌어서 이 단계의 위치로 옮기세요. 앞 단계에서 움직인 길이 화살표로 그려져요.',
    ball: '공을 받을 공격 선수를 누르세요. 앞 단계와 공 가진 사람이 다르면 패스(점선)로 그려져요.',
    screen: '스크린을 거는 공격 선수를 누르세요. 다시 누르면 취소돼요.'
  }[PE.tool];
}
function peSave() { save() }
function peDraw() {
  var p = PE.p, n = normPattern(p), i = PE.i;
  $('#dyn').innerHTML = courtFrame(n, i, { showD: p.def !== 'none' });
  $('#frames').innerHTML = p.frames.map(function (f, j) { return '<button class="fchip' + (j === i ? ' on' : '') + '" data-fi="' + j + '">' + (j + 1) + '</button>' }).join('') +
    '<button class="fchip add" data-act="fadd">＋ 다음 단계</button>' + (p.frames.length > 1 ? '<button class="fchip del" data-act="fdel">이 단계 삭제</button>' : '');
  $('#notelbl').textContent = (i + 1) + '단계 설명 — 어떻게 움직이나요?';
  var ta = $('#fnote'); if (document.activeElement !== ta) ta.value = p.frames[i].note || '';
  peCheck();
  $$('[data-fi]').forEach(function (b) { b.onclick = function () { PE.i = +b.dataset.fi; peDraw() } });
  $('[data-act=fadd]').onclick = function () {
    var cur = normPattern(p).frames[i];
    var nf = { o: clone(cur.o), x: p.def === 'manual' ? clone(cur.x) : {}, ball: cur.ball, screen: [], note: '' };
    p.frames.splice(i + 1, 0, nf); PE.i = i + 1; save(); peDraw();
    toast((PE.i + 1) + '단계: 선수를 끌어서 움직이세요');
  };
  var del = $('[data-act=fdel]'); if (del) del.onclick = function () { confirmSheet((i + 1) + '단계를 지울까요?', function () { p.frames.splice(i, 1); PE.i = Math.max(0, i - 1); save(); peDraw() }) };
}
function svgPoint(svg, e) {
  var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  var r = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [Math.max(-2, Math.min(52, r.x)), Math.max(-4, Math.min(PE && isFull(PE.p) ? 98 : 47.5, r.y))];
}
function peWireCourt() {
  var svg = $('#court');
  svg.addEventListener('pointerdown', function (e) {
    var g = e.target.closest('[data-pid]'); if (!g || g.getAttribute('opacity')) return;
    var pid = g.dataset.pid, side = pid[0], k = pid.slice(1), p = PE.p, f = p.frames[PE.i];
    if (PE.tool === 'ball') { if (side === 'o') { f.ball = k; save(); peDraw() } return }
    if (PE.tool === 'screen') {
      if (side !== 'o') return;
      f.screen = f.screen || []; var at = f.screen.indexOf(k);
      if (at >= 0) f.screen.splice(at, 1); else f.screen.push(k);
      save(); peDraw(); return;
    }
    if (side === 'x' && p.def === 'none') return;
    e.preventDefault();
    PE.drag = { side: side, k: k, id: e.pointerId };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', function (e) {
    var d = PE && PE.drag; if (!d || d.id !== e.pointerId) return;
    var pt = svgPoint(svg, e).map(f1), f = PE.p.frames[PE.i];
    if (d.side === 'o') f.o[d.k] = pt;
    else { f.x = f.x || {}; f.x[d.k] = pt }
    $('#dyn').innerHTML = courtFrame(normPattern(PE.p), PE.i, { showD: PE.p.def !== 'none' });
  });
  function end(e) { if (PE && PE.drag && PE.drag.id === e.pointerId) { PE.drag = null; save(); peDraw() } }
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}
function pePlayAll() {
  var n = normPattern(PE.p), i = 0, showD = PE.p.def !== 'none';
  $('#dyn').innerHTML = courtFrame(n, 0, { showD: showD, arrows: false });
  (function step() {
    if (i >= n.frames.length - 1) { setTimeout(function () { if (PE && $('#dyn')) peDraw() }, 1200); return }
    setTimeout(function () { if (!$('#dyn')) return; animate(n, ++i, showD, step) }, 700);
  })();
}

/* ---------- 기본 패턴 기준 체크 ---------- */
function patternChecks(p) {
  var moves = normPattern(p).frames.some(function (f, i, F) { if (!i) return false; var pr = F[i - 1]; return pr.ball !== f.ball || Object.keys(f.o).some(function (k) { return moved(pr.o[k], f.o[k]) }) });
  return [
    ['이름 정하기', !!p.name && p.name !== '새 패턴'],
    ['난이도 고르기', !!p.level],
    ['한 줄 설명 (어떤 패턴, 언제 쓰나)', (p.summary || '').trim().length >= 5],
    ['단계 3개 이상 (시작 → 움직임 → 마무리)', p.frames.length >= 3],
    ['선수·공 움직임 그리기', moves],
    ['모든 단계에 설명 쓰기', p.frames.every(function (f) { return (f.note || '').trim() })],
    ['핵심 포인트 2개 이상', (p.keys || []).length >= 2]
  ];
}
function peCheck() {
  var box = $('#pcheck'); if (!box || !PE) return;
  var c = patternChecks(PE.p), ok = c.filter(function (x) { return x[1] }).length;
  box.innerHTML = '<div class="fmth"><b>기본 패턴 기준</b><span class="' + (ok === c.length ? 'good' : '') + '">' + ok + ' / ' + c.length + (ok === c.length ? ' 완성!' : '') + '</span></div>' +
    c.map(function (x) { return '<div class="fmti' + (x[1] ? ' ok' : '') + '">' + (x[1] ? '✓' : '○') + ' ' + x[0] + '</div>' }).join('');
}

/* ---------- 배운 패턴 일지 ---------- */
var MASTERY = ['', '처음 배움', '연습 중', '실전에서 씀'];
function byDateDesc(a, b) { return b.date < a.date ? -1 : b.date > a.date ? 1 : b.at - a.at }
function journalOf(pid) { return S.pjournal.filter(function (j) { return j.pid === pid }).sort(byDateDesc) }
function masteryOf(pid) { var j = journalOf(pid)[0]; return j ? j.lv : 0 }
function masteryTag(pid) { var m = masteryOf(pid); return m ? '<span class="tag ms ms' + m + '">' + MASTERY[m] + '</span>' : '' }
function patTabs(on) {
  return '<div class="seg wide" style="margin-bottom:10px"><button data-ptab="list" class="' + (on === 'list' ? 'on' : '') + '">📋 패턴 목록</button><button data-ptab="journal" class="' + (on === 'journal' ? 'on' : '') + '">📓 배운 패턴 일지</button></div>';
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-ptab]'); if (!b) return;
  location.hash = b.dataset.ptab === 'journal' ? '#/pj' : '#/pat';
});
function journalCard(j) {
  var p = findPattern(j.pid);
  var row = function (label, v) { return v ? '<div class="jrow"><small>' + label + '</small><div>' + esc(v) + '</div></div>' : '' };
  return '<div class="card jcard"><div class="jhead"><div style="flex:1;min-width:0"><a href="#/p/' + encodeURIComponent(j.pid) + '" class="jname">' + esc(p ? p.name : '(지운 패턴)') + '</a>' +
    '<small>' + esc(j.date) + (j.where ? ' · ' + esc(j.where) : '') + '</small></div><span class="tag ms ms' + j.lv + '">' + MASTERY[j.lv] + '</span>' +
    '<button class="iconbtn" data-jedit="' + j.at + '" aria-label="고치기" style="width:34px;height:34px;font-size:15px">✎</button></div>' +
    row('배운 내용', j.learned) + row('잘 된 점', j.good) + row('어려웠던 점', j.hard) + row('다음에 할 것', j.next) + '</div>';
}
function wireJournalCards(after) {
  $$('[data-jedit]').forEach(function (b) { b.onclick = function () { var j = S.pjournal.filter(function (x) { return String(x.at) === b.dataset.jedit })[0]; if (j) journalSheet(j, j.pid, after) } });
}
function journalSheet(j, pid, after) {
  var e = j || { date: today(), pid: pid || '', where: '', learned: '', good: '', hard: '', next: '', lv: masteryOf(pid) || 1 };
  var lv = e.lv;
  sheet('<h3>' + (j ? '일지 고치기' : '📓 배운 패턴 일지') + '</h3>' +
    '<div class="two"><label class="field"><span>날짜</span><input class="inp" type="date" id="jd" value="' + esc(e.date) + '"></label>' +
    '<label class="field"><span>배운 곳 / 알려준 사람</span><input class="inp" id="jw" value="' + esc(e.where) + '" placeholder="예: 토요일 동호회, 김코치"></label></div>' +
    '<label class="field"><span>패턴</span><select class="inp" id="jp">' + (e.pid ? '' : '<option value="">패턴 고르기</option>') + allPatterns().map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === e.pid ? ' selected' : '') + '>' + esc(p.name) + (p.custom ? ' (내 패턴)' : '') + '</option>' }).join('') + '</select></label>' +
    (pid ? '' : '<p class="note" style="margin:-4px 0 0">목록에 없으면 <a href="#" id="jnew">＋ 새 패턴부터 그리기</a></p>') +
    '<div class="field"><span>지금 내 수준</span><div class="feel">' + [1, 2, 3].map(function (n) { return '<button data-jl="' + n + '"' + (n === lv ? ' class="on"' : '') + '>' + MASTERY[n] + '</button>' }).join('') + '</div></div>' +
    '<label class="field"><span>배운 내용 — 어떻게 움직였나요?</span><textarea id="jl" rows="3" placeholder="예: 5번 스크린 후 롤, 수비가 바꿔 막으면 미스매치 공략">' + esc(e.learned) + '</textarea></label>' +
    '<label class="field"><span>잘 된 점</span><textarea id="jg" rows="2">' + esc(e.good) + '</textarea></label>' +
    '<label class="field"><span>어려웠던 점</span><textarea id="jh" rows="2" placeholder="예: 스크린 각도를 자꾸 잘못 섬">' + esc(e.hard) + '</textarea></label>' +
    '<label class="field"><span>다음에 할 것</span><textarea id="jn" rows="2" placeholder="예: 스크린 각도 영상 다시 보기, 2대2로 10번 연습">' + esc(e.next) + '</textarea></label>' +
    '<div class="btns"><button class="btn pri" id="ok" style="flex:1">저장</button>' + (j ? '<button class="btn" id="del" style="color:var(--bad)">삭제</button>' : '') + '<button class="btn" id="no">취소</button></div>', function (s, close) {
      $$('[data-jl]', s).forEach(function (b) { b.onclick = function () { lv = +b.dataset.jl; $$('[data-jl]', s).forEach(function (x) { x.classList.toggle('on', x === b) }) } });
      $('#no', s).onclick = close;
      var nw = $('#jnew', s); if (nw) nw.onclick = function (ev) { ev.preventDefault(); close(); newPattern() };
      $('#ok', s).onclick = function () {
        var p = $('#jp', s).value; if (!p) { toast('패턴을 골라주세요'); return }
        var o = { at: j ? j.at : Date.now(), date: $('#jd', s).value || today(), pid: p, where: $('#jw', s).value.trim(), lv: lv,
          learned: $('#jl', s).value.trim(), good: $('#jg', s).value.trim(), hard: $('#jh', s).value.trim(), next: $('#jn', s).value.trim() };
        if (j) S.pjournal = S.pjournal.map(function (x) { return x === j ? o : x }); else S.pjournal.push(o);
        save(); close(); toast('일지를 저장했어요'); (after || route)();
      };
      var del = $('#del', s); if (del) del.onclick = function () { close(); confirmSheet('이 일지를 지울까요?', function () { S.pjournal = S.pjournal.filter(function (x) { return x !== j }); save(); (after || route)() }) };
    });
}
var jview = { f: 0 };
function renderJournal() {
  var all = S.pjournal.slice().sort(byDateDesc);
  var learned = {}; all.forEach(function (j) { learned[j.pid] = 1 });
  var pids = Object.keys(learned), mastered = pids.filter(function (id) { return masteryOf(id) === 3 }).length;
  var list = jview.f ? all.filter(function (j) { return masteryOf(j.pid) === jview.f }) : all;
  var h = '<div class="top"><h1>패턴</h1><button class="iconbtn" data-act="jadd" aria-label="일지 쓰기">＋</button></div><div class="wrap">' + patTabs('journal') +
    '<div class="stats"><div><b>' + pids.length + '</b><small>배운 패턴</small></div><div><b>' + mastered + '</b><small>실전에서 씀</small></div><div><b>' + all.length + '</b><small>일지</small></div></div>' +
    '<div class="chips">' + [0, 1, 2, 3].map(function (n) { return '<button class="chip' + (jview.f === n ? ' on' : '') + '" data-jf="' + n + '">' + (n ? MASTERY[n] : '전체') + '</button>' }).join('') + '</div>';
  if (!all.length) h += '<div class="empty">아직 일지가 없어요.<br>패턴을 배운 날 <b>＋</b>를 눌러 적어보세요.<br><br><span class="note">배운 패턴이 목록에 없으면 📋 패턴 목록에서 ＋로 먼저 그리세요.</span></div>';
  else if (!list.length) h += '<div class="empty">이 수준의 패턴이 없어요</div>';
  var last = '';
  list.forEach(function (j) { if (j.date !== last) { last = j.date; h += '<div class="day">' + j.date + (j.date === today() ? ' (오늘)' : '') + '</div>' } h += journalCard(j) });
  $('#app').innerHTML = h + '<div style="height:16px"></div></div>';
  $('[data-act=jadd]').onclick = function () { journalSheet(null, null, renderJournal) };
  $$('[data-jf]').forEach(function (b) { b.onclick = function () { jview.f = +b.dataset.jf; renderJournal() } });
  wireJournalCards(renderJournal);
}
