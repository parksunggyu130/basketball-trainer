/* 작전판 (#/board): 작전타임 때 감독님이 쓰는 자석 칠판.
   - 빈 곳을 손가락·펜으로 문지르면 그림 (색·굵기 고르기, 지우개)
   - 자석(공격·수비·공)은 끌어서 옮기고, 옮긴 길이 화살표로 남음 (끌 수 있음)
   - 공을 선수 자석 위에 놓으면 붙어서 같이 움직임
   저장: S.board = { court:'half'|'full', strokes:[{c,w,p:[[x,y]…],t?:'o'|'x'|'b'}], mags:[{id,t,n,x,y,at?}], color, size, trails }
   patterns-ui.js 의 courtBase / courtDefs / PCOL / autoDef / FIVE_OUT 를 쓴다 */
'use strict';
var BD_COLORS = [['#1D1B19', '검정'], ['#D7263D', '빨강'], ['#1F5FBF', '파랑'], ['#1F8A5B', '초록'], ['#E8641B', '주황'], ['#7B3FBF', '보라']];
var BD_SIZES = [['.35', '가늘게'], ['.6', '보통'], ['1', '굵게']];
var BD = null; // 화면 상태 { tool, drag, cur, hist }
function bdState() {
  var b = S.board;
  if (!b || !b.mags) b = S.board = { court: 'half', strokes: [], mags: [], color: '#1D1B19', size: '.6', trails: true };
  /* 처음엔 빈 코트: 예전 버전의 '기본 배치'가 그대로 남아 있으면 비운다 (그린 선이 없을 때만) */
  if (!b.v2) { if (b.inited && !b.strokes.length) b.mags = []; b.v2 = true; delete b.inited }
  if (b.autoD == null) b.autoD = true;
  return b;
}
function bdFull(b) { return b.court === 'full' }
/* 선수 놓기: 찍은 곳에 다음 번호 공격 + (켜져 있으면) 그 선수를 막는 수비를 골대 쪽에 + 공이 없으면 공 */
function bdPlace(pt) {
  var b = S.board, used = {}, n = 1;
  b.mags.forEach(function (q) { if (q.t === 'o') used[q.n] = 1 });
  while (used[n]) n++;
  if (n > 9) { toast('9명까지 놓을 수 있어요'); return }
  bdSnap();
  var o = { id: 'o' + n, t: 'o', n: String(n), x: pt[0], y: pt[1] };
  b.mags.push(o);
  var msg = n + '번 공격';
  if (b.autoD && !b.mags.some(function (q) { return q.t === 'x' && q.n === String(n) })) {
    var d = autoDef({ 1: pt })[1];
    b.mags.push({ id: 'x' + n, t: 'x', n: String(n), x: +d[0].toFixed(2), y: +d[1].toFixed(2) });
    msg += '·수비';
  }
  if (!b.mags.some(function (q) { return q.t === 'b' })) { b.mags.push({ id: 'b' + Date.now().toString(36), t: 'b', x: pt[0], y: pt[1], at: o.id }); msg += '·공' }
  save(); bdDraw(); toast(msg + '을 놓았어요');
}
function bdSnap() { BD.hist.push(JSON.stringify({ s: S.board.strokes, m: S.board.mags })); if (BD.hist.length > 40) BD.hist.shift() }
function bdMagSvg(g) {
  var x = g.x, y = g.y, h = '<g data-m="' + g.id + '" class="bdmag">';
  if (g.t === 'o') h += '<circle cx="' + x + '" cy="' + y + '" r="2.1" fill="' + PCOL.o + '" stroke="#fff" stroke-width=".35"/><text x="' + x + '" y="' + (y + .1) + '" font-size="2.4" font-weight="800" fill="#fff" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif">' + g.n + '</text>';
  else if (g.t === 'x') h += '<rect x="' + (x - 1.9) + '" y="' + (y - 1.9) + '" width="3.8" height="3.8" rx=".8" fill="#fff" stroke="' + PCOL.d + '" stroke-width=".45"/><text x="' + x + '" y="' + (y + .1) + '" font-size="2.3" font-weight="800" fill="' + PCOL.d + '" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif">' + g.n + '</text>';
  else { var bx = g.at ? x + 1.7 : x, by = g.at ? y - 1.7 : y; h += '<circle cx="' + bx + '" cy="' + by + '" r="2.4" fill="transparent"/><circle cx="' + bx + '" cy="' + by + '" r="1.2" fill="' + PCOL.ball + '" stroke="#7A2E08" stroke-width=".25"/>' }
  return h + '</g>';
}
function bdStrokeSvg(s) {
  if (s.p.length < 2) return s.t ? '' : '<circle cx="' + s.p[0][0] + '" cy="' + s.p[0][1] + '" r="' + (s.w / 2) + '" fill="' + s.c + '"/>';
  var mk = s.t ? (s.t === 'o' ? 'ah-o' : s.t === 'x' ? 'ah-d' : 'ah-p') : '';
  return '<polyline points="' + s.p.map(function (q) { return q[0] + ',' + q[1] }).join(' ') + '" fill="none" stroke="' + s.c + '" stroke-width="' + s.w + '" stroke-linecap="round" stroke-linejoin="round"' + (s.t ? ' stroke-dasharray="' + (s.t === 'b' ? '.9 .6' : '1.2 .7') + '" marker-end="url(#' + mk + ')"' : '') + '/>';
}
function bdDraw() {
  var b = S.board, full = bdFull(b), svg = $('#bd'); if (!svg) return;
  var hideT = !b.trails;
  svg.innerHTML = courtDefs() + courtBase(full) +
    b.strokes.filter(function (s) { return !(hideT && s.t) }).map(bdStrokeSvg).join('') +
    b.mags.filter(function (g) { return g.t !== 'b' }).map(bdMagSvg).join('') + b.mags.filter(function (g) { return g.t === 'b' }).map(bdMagSvg).join('');
}
function bdPoint(e) {
  var svg = $('#bd'), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  var r = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [+Math.max(-2.5, Math.min(52.5, r.x)).toFixed(2), +Math.max(-4.5, Math.min(bdFull(S.board) ? 98.5 : 47.5, r.y)).toFixed(2)];
}
function renderBoard() {
  var b = bdState();
  BD = { tool: !b.mags.length ? 'place' : (S.ui && S.ui.bdTool) || 'place', drag: null, hist: [] };
  $('#app').innerHTML =
    '<div class="top"><h1>🧲 작전판</h1><div class="seg" id="bdcourt"><button data-court="half">반코트</button><button data-court="full">풀코트</button></div></div>' +
    '<div class="wrap bdwrap">' +
    '<div class="seg wide" id="bdtools"><button data-tool="place">👆 선수 놓기</button><button data-tool="pen">✏️ 펜</button><button data-tool="erase">🧽 지우개</button><button data-tool="del">🗑 자석 빼기</button></div>' +
    '<div class="bdpens" id="bdpens">' + BD_COLORS.map(function (c) { return '<button class="sw" data-color="' + c[0] + '" style="background:' + c[0] + '" aria-label="' + c[1] + '"></button>' }).join('') +
      '<span class="bdsz">' + BD_SIZES.map(function (s) { return '<button data-size="' + s[0] + '" aria-label="' + s[1] + '"><i style="height:' + (s[0] * 9 + 1) + 'px"></i></button>' }).join('') + '</span></div>' +
    '<div class="court bdcourt"><svg id="bd" class="courtsvg bdsvg"></svg></div>' +
    '<p class="note" id="bdhint" style="text-align:center;margin:4px 0 0"></p>' +
    '<div class="bdmags"><button class="btn" data-add="o"><span class="dot o"></span>공격</button><button class="btn" data-add="x"><span class="dot x"></span>수비</button><button class="btn" data-add="b"><span class="dot b"></span>공</button></div>' +
    '<div class="bdmags"><button class="btn" data-act="undo">↶ 되돌리기</button><button class="btn" data-act="clrline">선만 지우기</button><button class="btn" data-act="clrall" style="color:var(--bad)">모두 지우기</button></div>' +
    '<label class="tgl"><input type="checkbox" id="bdautod"> 공격을 놓으면 수비도 같이 놓기</label>' +
    '<label class="tgl"><input type="checkbox" id="bdtrail"> 자석이 움직인 길 보이기</label>' +
    '<div class="tip" style="margin:10px 0 24px"><b>이렇게 써요</b> · ① <b>👆 선수 놓기</b>로 코트를 누르면 공격이 놓이고 수비도 같이 나와요. ② 자석을 손가락으로 끌어 옮겨요 (움직인 길이 화살표로 남아요). ③ <b>✏️ 펜</b>으로 빈 곳에 그려요. 공을 선수 위에 놓으면 같이 움직여요.</div>' +
    '</div>';
  bdUI(); bdDraw(); bdWire();
}
function bdUI() {
  var b = S.board;
  $$('[data-court]').forEach(function (x) { x.classList.toggle('on', x.dataset.court === (b.court || 'half')) });
  $$('[data-tool]').forEach(function (x) { x.classList.toggle('on', x.dataset.tool === BD.tool) });
  $$('[data-color]').forEach(function (x) { x.classList.toggle('on', x.dataset.color === b.color) });
  $$('[data-size]').forEach(function (x) { x.classList.toggle('on', x.dataset.size === b.size) });
  $('#bdpens').style.opacity = BD.tool === 'pen' ? 1 : .45;
  $('#bdpens').hidden = BD.tool !== 'pen' && BD.tool !== 'erase';
  $('#bdtrail').checked = b.trails !== false;
  $('#bdautod').checked = !!b.autoD;
  $('#bd').classList.toggle('full', bdFull(b));
  $('#bd').setAttribute('viewBox', bdFull(b) ? '-3 -5 56 104' : '-3 -5 56 53');
  $('#bdhint').textContent = { place: '공격 선수를 놓을 곳을 누르세요 · 놓은 자석은 끌어서 옮겨요', pen: '빈 곳을 문지르면 그려져요 · 자석은 끌어서 옮겨요', erase: '지울 선을 문질러요 · 자석은 끌어서 옮겨요', del: '뺄 자석을 눌러요' }[BD.tool];
}
function bdWire() {
  var b = S.board, svg = $('#bd');
  $$('[data-court]').forEach(function (x) { x.onclick = function () { if (b.court === x.dataset.court) return; b.court = x.dataset.court; save(); bdUI(); bdDraw() } });
  $$('[data-tool]').forEach(function (x) { x.onclick = function () { BD.tool = x.dataset.tool; S.ui.bdTool = BD.tool; save(); bdUI() } });
  $$('[data-color]').forEach(function (x) { x.onclick = function () { b.color = x.dataset.color; BD.tool = 'pen'; save(); bdUI() } });
  $$('[data-size]').forEach(function (x) { x.onclick = function () { b.size = x.dataset.size; BD.tool = 'pen'; save(); bdUI() } });
  $('#bdtrail').onchange = function () { b.trails = this.checked; save(); bdDraw() };
  $('#bdautod').onchange = function () { b.autoD = this.checked; save() };
  $$('[data-add]').forEach(function (x) { x.onclick = function () { bdAdd(x.dataset.add) } });
  var on = function (a, f) { $$('[data-act=' + a + ']').forEach(function (x) { x.onclick = f }) };
  on('undo', function () { var h = BD.hist.pop(); if (!h) { toast('더 되돌릴 게 없어요'); return } h = JSON.parse(h); b.strokes = h.s; b.mags = h.m; save(); bdDraw() });
  on('clrline', function () { if (!b.strokes.length) return; bdSnap(); b.strokes = []; save(); bdDraw(); toast('선을 지웠어요 (자석은 그대로)') });
  on('clrall', function () { confirmSheet('그림과 자석을 모두 지울까요?', function () { bdSnap(); b.strokes = []; b.mags = []; save(); bdDraw() }) });

  svg.addEventListener('pointerdown', function (e) {
    if (BD.drag) return;
    e.preventDefault();
    var g = e.target.closest('[data-m]'), pt = bdPoint(e);
    try { svg.setPointerCapture(e.pointerId) } catch (x) {}
    if (g) {
      var m = b.mags.filter(function (q) { return q.id === g.dataset.m })[0]; if (!m) return;
      if (BD.tool === 'del') { bdSnap(); b.mags = b.mags.filter(function (q) { return q !== m && q.at !== m.id }); if (m.t !== 'b') b.mags.forEach(function (q) { if (q.at === m.id) delete q.at }); save(); bdDraw(); return }
      bdSnap();
      if (m.t === 'b') delete m.at;
      var trail = { c: m.t === 'o' ? PCOL.o : m.t === 'x' ? PCOL.d : PCOL.pass, w: .4, t: m.t, p: [[m.x, m.y]] };
      BD.drag = { id: e.pointerId, m: m, off: [m.x - pt[0], m.y - pt[1]], trail: trail, added: false };
      return;
    }
    if (BD.tool === 'del') return;
    if (BD.tool === 'place') { bdPlace(pt); return }
    bdSnap();
    if (BD.tool === 'erase') { BD.drag = { id: e.pointerId, erase: true, n: 0 }; bdErase(pt); return }
    var s = { c: b.color, w: +b.size, p: [pt] };
    b.strokes.push(s); BD.drag = { id: e.pointerId, s: s }; bdDraw();
  });
  svg.addEventListener('pointermove', function (e) {
    var d = BD && BD.drag; if (!d || d.id !== e.pointerId) return;
    var pt = bdPoint(e), b = S.board;
    if (d.erase) { bdErase(pt); return }
    if (d.s) { var l = d.s.p[d.s.p.length - 1]; if (Math.hypot(l[0] - pt[0], l[1] - pt[1]) > .25) { d.s.p.push(pt); bdDraw() } return }
    var m = d.m, nx = +(pt[0] + d.off[0]).toFixed(2), ny = +(pt[1] + d.off[1]).toFixed(2);
    m.x = nx; m.y = ny;
    b.mags.forEach(function (q) { if (q.at === m.id) { q.x = nx; q.y = ny } });
    var tl = d.trail.p[d.trail.p.length - 1];
    if (Math.hypot(tl[0] - nx, tl[1] - ny) > .5) { d.trail.p.push([nx, ny]); if (!d.added && d.trail.p.length > 2) { b.strokes.push(d.trail); d.added = true } }
    bdDraw();
  });
  function end(e) {
    var d = BD && BD.drag; if (!d || d.id !== e.pointerId) return;
    BD.drag = null;
    if (d.erase && !d.n) BD.hist.pop();
    if (d.m) {
      var m = d.m, b = S.board;
      if (!d.added) BD.hist.pop(); /* 그냥 누르기만 함 */
      else {
        var pp = d.trail.p, last = pp[pp.length - 1];
        if (last[0] !== m.x || last[1] !== m.y) pp.push([m.x, m.y]);
        if (Math.hypot(pp[0][0] - m.x, pp[0][1] - m.y) < 1.5) b.strokes = b.strokes.filter(function (s) { return s !== d.trail }); /* 제자리로 돌아오면 길은 안 남김 */
      }
      if (m.t === 'b') { /* 공은 가까운 선수(공격 먼저)에게 붙는다 */
        var best = null, bd = 3.2;
        b.mags.forEach(function (q) { if (q.t === 'b') return; var dd = Math.hypot(q.x - m.x, q.y - m.y) - (q.t === 'o' ? .5 : 0); if (dd < bd) { bd = dd; best = q } });
        if (best) { m.at = best.id; m.x = best.x; m.y = best.y }
      }
    }
    save(); bdDraw();
  }
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}
function bdErase(pt) {
  var b = S.board, before = b.strokes.length;
  b.strokes = b.strokes.filter(function (s) { return !s.p.some(function (q) { return Math.hypot(q[0] - pt[0], q[1] - pt[1]) < 1.4 + s.w / 2 }) });
  if (b.strokes.length !== before) { BD.drag.n++; bdDraw() }
}
/* 자석 추가: 다음 번호로, 코트 가운데쯤에 놓는다 */
function bdAdd(t) {
  var b = S.board, used = {}, n = 1;
  b.mags.forEach(function (q) { if (q.t === t) used[q.n] = 1 });
  if (t === 'b') { if (b.mags.filter(function (q) { return q.t === 'b' }).length >= 3) { toast('공은 3개까지예요'); return } }
  else { while (used[n]) n++; if (n > 9) { toast('9명까지 놓을 수 있어요'); return } }
  bdSnap();
  var c = b.mags.length, x = 12 + (c * 7) % 28, y = t === 'x' ? 36 : t === 'b' ? 33 : 40;
  b.mags.push({ id: t + (t === 'b' ? Date.now().toString(36) : n), t: t, n: t === 'b' ? '' : String(n), x: x, y: y });
  save(); bdDraw(); toast(t === 'o' ? n + '번 공격 자석을 놓았어요' : t === 'x' ? n + '번 수비 자석을 놓았어요' : '공을 놓았어요');
}
