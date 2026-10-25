/* 패턴(전술) 화면: 목록 / 보기(애니메이션) / 그리기(편집).
   index.html 의 공용 함수($, esc, S, save, sheet, toast …)를 쓴다 — 호출 시점에는 모두 정의되어 있음 */
'use strict';
var BASKET = [25, 5.25];
var PCOL = { o: '#1F5FBF', d: '#C8372D', ball: '#F07A2E', pass: '#E8641B', line: '#A7774A' };
var VB = '-3 -5 56 53';

function clone(o) { return JSON.parse(JSON.stringify(o)) }
/* 훈련일지에 그린 패턴(tjDate)은 패턴 목록에는 안 보이고 일지에서만 쓴다 */
function allPatterns() { return PATTERNS.concat(S.patterns.filter(function (p) { return !p.tjDate })) }
function findPattern(id) { return PATTERNS.concat(S.patterns).filter(function (p) { return p.id === id })[0] }

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
    var oo = o, xx = x, sc = (f.screen || []).map(String), bb = ball;
    if (p.n && p.n < 5) {
      oo = {}; xx = {};
      for (k in o) if (+k <= p.n) oo[k] = o[k];
      for (k in x) if (+k <= p.n) xx[k] = x[k];
      sc = sc.filter(function (q) { return +q <= p.n }); if (bb && +bb > p.n) bb = null;
    }
    out.push({ o: oo, x: xx, ball: bb, screen: sc, note: f.note || '' });
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
    '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px"><div class="row"><span class="nm">' + esc(p.name) + '</span>' + '' + '</div>' +
    '<div class="sm">' + esc(p.summary || '') + '</div>' +
    '<div class="row"><span class="tag">' + esc(p.cat) + '</span>' + (p.level ? '<span class="tag lv-' + esc(p.level) + '">' + esc(p.level) + '</span>' : '') + '<span class="tag">' + p.frames.length + '단계</span>' + (p.custom ? '<span class="tag vid">내 패턴</span>' : '') + masteryTag(p.id) + '</div></div></a>';
}
var PCAT_EMO = { '공격 기본': '🏀', '세트 오펜스': '🧩', '속공': '🚀', '프레스 브레이크': '🧨', '수비': '🛡️', '인바운드': '📥', '내 패턴': '✏️' };
function renderPatternList() {
  if (pview.cat === '전체') {
    var cats = PCATS.concat(['내 패턴']);
    $('#app').innerHTML = '<div class="top"><h1>패턴</h1></div><div class="wrap">' + patTabs('list') +
      '<div class="tiles">' + cats.map(function (c) {
        var n = allPatterns().filter(function (p) { return c === '내 패턴' ? p.custom : p.cat === c }).length;
        return '<button class="tile" data-pcat="' + c + '"><span>' + (PCAT_EMO[c] || '📋') + '</span><b>' + c + '</b><small>' + n + '개</small></button>';
      }).join('') + '</div>' +
      '<button class="btn pri follow" data-act="newpat">✏️ 배운 패턴 새로 그리기</button></div>';
    $$('[data-pcat]').forEach(function (b) { b.onclick = function () { pview.cat = b.dataset.pcat; renderPatternList() } });
    $('[data-act=newpat]').onclick = newPattern;
    return;
  }
  var items = allPatterns().filter(function (p) { return pview.cat === '전체' || (pview.cat === '내 패턴' ? p.custom : p.cat === pview.cat) });
  $('#app').innerHTML = '<div class="top"><h1>패턴</h1><button class="iconbtn" data-act="newpat" aria-label="새 패턴 그리기">＋</button></div><div class="wrap">' + patTabs('list') +
    '<div class="cathead"><button class="btn sm" data-pcat="전체">← 전체 분류</button><b>' + (PCAT_EMO[pview.cat] || '') + ' ' + esc(pview.cat) + '</b></div><div style="height:10px"></div>' +
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
    (p.custom ? '<button class="iconbtn" data-act="pedit" aria-label="고치기">✎</button>' : '<button class="iconbtn" data-act="pcopy" title="복사해서 내 패턴으로">⧉</button>') + '</div>' +
    '<div class="wrap"><div class="hero"><h2>' + esc(p.name) + ' ' + masteryTag(p.id) + '</h2>' + (p.en ? '<div class="en">' + esc(p.en) + '</div>' : '') + (p.summary ? '<p>' + esc(p.summary) + '</p>' : '') + '</div>' +
    '<div class="court tapnext">' + courtSvg('court', '', isFull(p)) + '</div>' +
    '<div class="pnote" id="pnote"></div>' +
    '<div class="pctl2"><button class="btn" data-act="pprev">◀ 이전</button><span class="pstep" id="pstep"></span><button class="btn pri" data-act="pnext">다음 ▶</button></div>' +
    '<button class="btn pplay" data-act="pplay" id="pplay">▶ 처음부터 움직임 보기</button>' +
    '<p class="note" style="text-align:center;margin:6px 0 0">코트 그림을 눌러도 다음 단계로 넘어가요</p>' + legendHtml(PV.showD) +
    (p.def !== 'none' ? '<label class="tgl"><input type="checkbox" id="showD" checked> 수비(빨간 네모) 보이기</label>' : '') +
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
  on('pnext', function () { pvStop(); if (PV.i >= PV.n.frames.length - 1) { PV.i = 0; pvDraw() } else pvNext() });
  on('pplay', function () { PV.playing ? pvStop() : pvPlay() });
  $('#court').addEventListener('click', function () { if (PV.playing) return; stopAnim(); if (PV.i >= PV.n.frames.length - 1) { PV.i = 0; pvDraw() } else pvNext() });
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
  var pb = $('[data-act=pprev]'); if (pb) pb.disabled = i === 0;
  var nb = $('[data-act=pnext]'); if (nb) nb.textContent = i >= n.frames.length - 1 ? '처음으로 ↺' : '다음 ▶';
  $('#pnote').innerHTML = '<b>' + (i + 1) + '단계</b> ' + esc(n.frames[i].note || '');
  $$('#psteps li').forEach(function (li) { li.classList.toggle('cur', +li.dataset.pi === i) });
}
function pvNext(cb) {
  if (PV.i >= PV.n.frames.length - 1) { cb && cb(true); return }
  $('#pnote').innerHTML = '<b>' + (PV.i + 2) + '단계</b> ' + esc(PV.n.frames[PV.i + 1].note || '');
  animate(PV.n, PV.i + 1, PV.showD, function () { PV.i++; pvDraw(); cb && cb() });
}
function pvPlay() {
  PV.playing = true; $('#pplay').textContent = '❚❚ 멈추기';
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
  var b = $('#pplay'); if (b) b.textContent = '▶ 처음부터 움직임 보기';
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
  PE = { p: p, i: 0, tool: 'move', drag: null, sel: null, zoom: (S.ui && S.ui.peZoom) || 1, ptrs: {}, pan: null };
  $('#app').innerHTML =
    '<div class="top"><button class="iconbtn" data-act="back" aria-label="완료">←</button><input class="inp" id="pname" value="' + esc(p.name) + '" style="flex:1;font-weight:700" aria-label="패턴 이름">' +
    '<button class="iconbtn" data-act="pview" title="보기">▶</button></div>' +
    '<div class="wrap">' +
    '<div class="seg wide" id="tools"><button data-tool="move" class="on">✋ 선수 옮기기</button><button data-tool="ball">🏀 공 주기</button><button data-tool="screen">┳ 스크린</button></div>' +
    '<div class="pe-n"><span class="note">👥 선수 수</span><div class="seg">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-pn="' + n + '" class="' + ((p.n || 5) === n ? 'on' : '') + '">' + n + '명</button>' }).join('') + '</div></div>' +
    '<p class="note" id="toolhelp" style="margin:6px 0"></p>' +
    '<div class="pe-zbar"><span class="note">코트 크기</span><div class="tj-zoom"><button class="btn" data-pz="-1" aria-label="작게">－</button><button class="btn sm" data-pz="0" id="pezl">100%</button><button class="btn" data-pz="1" aria-label="크게">＋</button></div></div>' +
    '<div class="court pe-wrap" id="pewrap">' + courtSvg('court', ' edit', isFull(p)) + '</div>' +
    '<p class="note" id="pehint" style="margin:4px 0 0;text-align:center"></p>' + legendHtml(p.def !== 'none') +
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
  var home = p.tjDate ? '#/tj/' + p.tjDate : '#/p/' + encodeURIComponent(p.id);
  on('back', function () { location.hash = home });
  on('pview', function () { location.hash = home });
  $$('[data-pn]').forEach(function (b) { b.onclick = function () { var n = +b.dataset.pn; if (n >= 5) delete p.n; else p.n = n; save(); $$('[data-pn]').forEach(function (x) { x.classList.toggle('on', x === b) }); peDraw() } });
  if (p.tjDate) { /* 일지용 패턴: 목록용 정보 칸은 숨기고 코트·수비 설정만 */
    ['#pcat', '#psum', '#pkeys', '#pen', '#plv', '#pq'].forEach(function (q) { var el = $(q); if (el) (el.closest('.field') || el).hidden = true });
    $$('#pcheck,[data-act=pjw]').forEach(function (el) { el.hidden = true });
    var h3 = $('.sec h3'); $$('.sec h3').forEach(function (x) { if (x.textContent === '패턴 정보') x.textContent = '패턴 설정' });
  }
  on('defreset', function () { PE.p.frames[PE.i].x = {}; if (p.def === 'manual' && PE.i === 0) PE.p.frames[0].x = autoDef(PE.p.frames[0].o); peSave(); peDraw() });
  on('playall', pePlayAll);
  on('pdel', function () { confirmSheet('"' + p.name + '" 패턴을 지울까요?', function () { S.patterns = S.patterns.filter(function (x) { return x.id !== p.id }); if (p.tjDate) { tjSet(p.tjDate, 'pat', false); location.hash = '#/tj/' + p.tjDate; return } delete S.pnotes[p.id]; delete S.fav['p:' + p.id]; save(); location.hash = '#/pat' }) });
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
  $$('[data-pz]').forEach(function (b) { b.onclick = function () { peZoom(+b.dataset.pz) } });
  peDraw(); peHelp(); peApplyZoom(false);
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
var PE_ZOOMS = [1, 1.5, 2, 2.5, 3];
function peZoom(dir) {
  var i = PE_ZOOMS.indexOf(PE.zoom); if (i < 0) i = 0;
  var z = dir === 0 ? 1 : PE_ZOOMS[Math.max(0, Math.min(PE_ZOOMS.length - 1, i + dir))];
  if (z === PE.zoom) return;
  PE.zoom = z; S.ui = S.ui || {}; S.ui.peZoom = z; save(); peApplyZoom(true);
}
function peApplyZoom(keep) {
  var w = $('#pewrap'), svg = $('#court'); if (!w || !svg) return;
  var old = svg.getBoundingClientRect().width, cx = (w.scrollLeft + w.clientWidth / 2) / (old || 1), cy = (w.scrollTop + w.clientHeight / 2) / (old || 1);
  var zoomed = PE.zoom > 1;
  w.classList.toggle('zoomed', zoomed);
  svg.style.width = (PE.zoom * 100) + '%';
  svg.style.maxHeight = zoomed ? 'none' : '';
  if (zoomed) {
    var nav = $('#nav'), top = $('.top');
    w.style.height = Math.max(260, Math.min(svg.getBoundingClientRect().height, window.innerHeight - (nav ? nav.offsetHeight : 0) - (top ? top.offsetHeight : 0) - 150)) + 'px';
  } else w.style.height = '';
  if (keep && zoomed) { var nw = svg.getBoundingClientRect().width; w.scrollLeft = cx * nw - w.clientWidth / 2; w.scrollTop = cy * nw - w.clientHeight / 2 }
  $('#pezl').textContent = Math.round(PE.zoom * 100) + '%';
  $('#pehint').textContent = zoomed ? '빈 곳을 끌거나 두 손가락으로 밀면 코트가 움직여요' : '＋ 를 누르면 코트가 커져요';
}
function peMid() { var ps = Object.keys(PE.ptrs).map(function (k) { return PE.ptrs[k] }), x = 0, y = 0; ps.forEach(function (q) { x += q[0]; y += q[1] }); return ps.length ? [x / ps.length, y / ps.length] : [0, 0] }
function peStartPan() { var w = $('#pewrap'); PE.pan = { mid: peMid(), sl: w.scrollLeft, st: w.scrollTop } }
function peWireCourt() {
  var svg = $('#court');
  svg.addEventListener('pointerdown', function (e) {
    PE.ptrs[e.pointerId] = [e.clientX, e.clientY];
    var zoomed = PE.zoom > 1;
    if (Object.keys(PE.ptrs).length >= 2) { // 두 손가락: 끌던 선수는 놓고 화면 이동
      if (PE.drag) { PE.drag = null; peDraw() }
      if (zoomed) { e.preventDefault(); peStartPan() }
      return;
    }
    var g = e.target.closest('[data-pid]');
    if (!g || g.getAttribute('opacity')) { if (zoomed) { e.preventDefault(); try { svg.setPointerCapture(e.pointerId) } catch (x) {} peStartPan() } return }
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
    try { svg.setPointerCapture(e.pointerId) } catch (x) {}
  });
  svg.addEventListener('pointermove', function (e) {
    if (PE && PE.ptrs[e.pointerId]) PE.ptrs[e.pointerId] = [e.clientX, e.clientY];
    if (PE && PE.pan) { var m = peMid(), w = $('#pewrap'); w.scrollLeft = PE.pan.sl - (m[0] - PE.pan.mid[0]); w.scrollTop = PE.pan.st - (m[1] - PE.pan.mid[1]); return }
    var d = PE && PE.drag; if (!d || d.id !== e.pointerId) return;
    var pt = svgPoint(svg, e).map(f1), f = PE.p.frames[PE.i];
    if (d.side === 'o') f.o[d.k] = pt;
    else { f.x = f.x || {}; f.x[d.k] = pt }
    $('#dyn').innerHTML = courtFrame(normPattern(PE.p), PE.i, { showD: PE.p.def !== 'none' });
  });
  function end(e) {
    if (!PE) return;
    delete PE.ptrs[e.pointerId];
    if (PE.pan) { if (Object.keys(PE.ptrs).length) peStartPan(); else PE.pan = null; return }
    if (PE.drag && PE.drag.id === e.pointerId) { PE.drag = null; save(); peDraw() }
  }
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
  var e = j || { date: (location.hash === '#/pj' && jview.day) || today(), pid: pid || '', where: '', learned: '', good: '', hard: '', next: '', lv: masteryOf(pid) || 1 };
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
var jview = { f: 0, month: null, day: null };
function renderJournal() {
  var all = S.pjournal.slice().sort(byDateDesc);
  var learned = {}; all.forEach(function (j) { learned[j.pid] = 1 });
  var pids = Object.keys(learned), mastered = pids.filter(function (id) { return masteryOf(id) === 3 }).length;
  /* 달력: 일지 쓴 날 = 📋 + 개수, 칸 색은 그날 가장 높은 수준 */
  var mon = jview.month || today().slice(0, 7), y = +mon.slice(0, 4), mo = +mon.slice(5, 7);
  var byDay = {}; all.forEach(function (j) { (byDay[j.date] = byDay[j.date] || []).push(j) });
  var nDays = new Date(y, mo, 0).getDate(), lead = new Date(y, mo - 1, 1).getDay(), monDays = 0;
  var cal = '<div class="tjc-head"><button class="btn" data-jm="-1" aria-label="이전 달">◀</button><b>' + y + '년 ' + mo + '월</b><button class="btn" data-jm="1" aria-label="다음 달">▶</button></div><div class="tjc-grid">' +
    '일월화수목금토'.split('').map(function (c, i) { return '<span class="tjc-wd' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '') + '">' + c + '</span>' }).join('');
  for (var i = 0; i < lead; i++) cal += '<span></span>';
  for (var d = 1; d <= nDays; d++) {
    var ds = mon + '-' + String(d).padStart(2, '0'), js = byDay[ds] || [], top = js.reduce(function (a, j) { return Math.max(a, j.lv || 1) }, 0);
    if (js.length) monDays++;
    cal += '<button class="tjc-d' + (top ? ' pj' + top : '') + (ds === today() ? ' t' : '') + (ds === jview.day ? ' sel' : '') + '" data-jd="' + ds + '"><b>' + d + '</b><span>' + (js.length ? '📋' : '') + '</span><small>' + (js.length > 1 ? js.length + '개' : '') + '</small></button>';
  }
  cal += '</div>';
  var list = all.filter(function (j) { return (jview.day ? j.date === jview.day : j.date.slice(0, 7) === mon) && (!jview.f || masteryOf(j.pid) === jview.f) });
  var h = '<div class="top"><h1>패턴</h1><button class="iconbtn" data-act="jadd" aria-label="일지 쓰기">＋</button></div><div class="wrap">' + patTabs('journal') +
    '<div class="card lcal">' + cal + '<p class="note" style="margin:8px 0 0;text-align:center">' + mo + '월에 <b>' + monDays + '일</b> 패턴을 배웠어요 · 날짜를 누르면 그날 일지만 보여요</p>' +
    '<div class="tjc-legend" style="justify-content:center;margin-top:6px"><span><i class="m1"></i>처음 배움</span><span><i class="m2"></i>연습 중</span><span><i class="m3"></i>실전에서 씀</span></div></div>' +
    '<div class="stats" style="margin-top:12px"><div><b>' + pids.length + '</b><small>배운 패턴</small></div><div><b>' + mastered + '</b><small>실전에서 씀</small></div><div><b>' + all.length + '</b><small>일지</small></div></div>' +
    '<div class="chips">' + [0, 1, 2, 3].map(function (n) { return '<button class="chip' + (jview.f === n ? ' on' : '') + '" data-jf="' + n + '">' + (n ? MASTERY[n] : '전체') + '</button>' }).join('') + '</div>';
  if (jview.day) h += '<div class="lday"><b>' + jview.day.slice(5).replace('-', '월 ') + '일</b><span>' + (byDay[jview.day] || []).length + '개</span><button class="btn sm pri" data-act="jaddday">＋ 이 날 일지</button><button class="btn sm" data-jd="' + jview.day + '">전체 보기</button></div>';
  if (!all.length) h += '<div class="empty">아직 일지가 없어요.<br>패턴을 배운 날 <b>＋</b>를 눌러 적어보세요.<br><br><span class="note">배운 패턴이 목록에 없으면 📋 패턴 목록에서 먼저 그리세요.</span></div>';
  else if (!list.length) h += '<div class="empty">' + (jview.day ? '이 날은 패턴 일지가 없어요' : jview.f ? '이 수준의 패턴이 없어요' : mo + '월에는 패턴 일지가 없어요') + '</div>';
  var last = jview.day || '';
  list.forEach(function (j) { if (j.date !== last) { last = j.date; h += '<div class="day">' + j.date + (j.date === today() ? ' (오늘)' : '') + '</div>' } h += journalCard(j) });
  $('#app').innerHTML = h + '<div style="height:16px"></div></div>';
  $('[data-act=jadd]').onclick = function () { journalSheet(null, null, renderJournal) };
  var jd = $('[data-act=jaddday]'); if (jd) jd.onclick = function () { journalSheet(null, null, renderJournal) };
  $$('[data-jf]').forEach(function (b) { b.onclick = function () { jview.f = +b.dataset.jf; renderJournal() } });
  $$('[data-jd]').forEach(function (b) { b.onclick = function () { jview.day = jview.day === b.dataset.jd ? null : b.dataset.jd; renderJournal() } });
  $$('[data-jm]').forEach(function (b) { b.onclick = function () { var dt = new Date(y, mo - 1 + +b.dataset.jm, 1); jview.month = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); jview.day = null; renderJournal() } });
  wireJournalCards(renderJournal);
}
