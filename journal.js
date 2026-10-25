/* 훈련일지: 종이 양식(2쪽)과 같은 모양. 글자 입력 + 펜(손가락·터치펜) 필기. 날짜별로 저장.
   글자·선택값은 S.tj[날짜], 필기는 IndexedDB 'ink:날짜' 에 저장 (용량이 커서).
   index.html 의 공용 함수($, esc, S, save, vdb, today, sheet, toast, confirmSheet …)를 쓴다 */
'use strict';
var TJ_W = 700, TJ_H = 1010;
var TJ_MIND = [['😍', '최고'], ['😊', '좋음'], ['😐', '보통'], ['😩', '피곤'], ['😵', '힘듦'], ['😠', '화남']];
var TJ_PENS = ['#1D1B19', '#1F5FBF', '#D0342C'];
var TJ = null;

function tjAll() { return (S.tj = S.tj || {}) }
function tjGet(date) { return tjAll()[date] || {} }
function tjSet(date, k, v) { var a = tjAll(); a[date] = a[date] || {}; a[date][k] = v; save() }
function tjHas(e) { return !!(e && (e.content || e.coach || e.good || e.fix || e.stress || e.cond || e.mind || e.sat || (e.body && e.body.length) || e.ink)) }
function tjShift(date, n) { var d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function tjWeekday(date) { return (new Date(date + 'T12:00:00').getDay() + 6) % 7 } // 월=0 … 일=6

function tjPage1(date, e) {
  var p = date.split('-'), wd = tjWeekday(date);
  return '<div class="tj-page" id="tjp1">' +
    '<div class="tj-head"><div class="tj-ymd"><b>' + p[0] + '</b> 년 <b>' + (+p[1]) + '</b> 월 <b>' + (+p[2]) + '</b> 일</div>' +
    '<div class="tj-wd">' + '월화수목금토일'.split('').map(function (c, i) { return '<span class="' + (i === wd ? 'on' : '') + '">' + c + '</span>' }).join('') + '</div></div>' +
    '<div class="tj-lbl">운동 내용 <button class="tj-mini" data-tj="loadlog">📋 오늘 기록 불러오기</button></div>' +
    '<div class="tj-crow"><textarea class="tj-area lined" data-f="content" style="height:470px" placeholder="오늘 한 운동을 적어요">' + esc(e.content || '') + '</textarea>' +
    '<div class="tj-courtbox"><div class="tj-courth">패턴 그림</div><svg viewBox="' + VB + '" aria-label="패턴을 그리는 하프코트">' + courtBase(false) + '</svg>' +
    '<small>✏️ 펜에서 🔵공격 🔴수비 🟠공 도장을 찍고<br>선으로 움직임을 그려요</small></div></div>' +
    '<div class="tj-lbl" style="margin-top:18px">피드백</div>' +
    '<div class="tj-box"><div class="tj-boxh">지도자의 피드백</div><textarea class="tj-area lined" data-f="coach" style="height:262px" placeholder="코치님·부모님이 해 준 말">' + esc(e.coach || '') + '</textarea></div>' +
    '<canvas class="tj-ink" data-pg="p1" width="' + TJ_W * 2 + '" height="' + TJ_H * 2 + '"></canvas></div>';
}
function tjBody(e) {
  var marks = (e.body || []).map(function (m) { return '<g class="tj-x"><circle cx="' + m[0] + '" cy="' + m[1] + '" r="9" fill="rgba(208,52,44,.18)"/><path d="M' + (m[0] - 6) + ' ' + (m[1] - 6) + 'L' + (m[0] + 6) + ' ' + (m[1] + 6) + 'M' + (m[0] + 6) + ' ' + (m[1] - 6) + 'L' + (m[0] - 6) + ' ' + (m[1] + 6) + '" stroke="#D0342C" stroke-width="3" stroke-linecap="round"/></g>' }).join('');
  return '<svg class="tj-bodysvg" viewBox="0 0 200 300" data-tj="body" role="img" aria-label="몸 그림: 아픈 곳을 눌러 표시">' +
    '<g fill="#fff" stroke="#333" stroke-width="2" stroke-linejoin="round">' +
    '<circle cx="100" cy="28" r="17"/>' +
    '<path d="M93 44 L107 44 L108 54 L92 54 Z"/>' +
    '<path d="M70 58 Q100 50 130 58 L134 120 Q132 150 124 160 L76 160 Q68 150 66 120 Z"/>' +
    '<path d="M70 60 Q58 64 54 80 L44 140 Q42 156 48 170 L56 170 Q58 156 58 146 L68 96"/>' +
    '<path d="M130 60 Q142 64 146 80 L156 140 Q158 156 152 170 L144 170 Q142 156 142 146 L132 96"/>' +
    '<path d="M76 160 L74 220 Q73 250 76 282 L92 284 Q94 250 96 220 L100 172 L104 220 Q106 250 108 284 L124 282 Q127 250 126 220 L124 160"/>' +
    '</g><g stroke="#999" stroke-width="1.2" fill="none"><path d="M100 62 L100 150"/><path d="M78 104 L122 104"/><path d="M80 126 L120 126"/><circle cx="84" cy="236" r="6"/><circle cx="116" cy="236" r="6"/></g>' +
    marks + '</svg>';
}
function tjPage2(e) {
  var sat = e.sat || 0;
  return '<div class="tj-page" id="tjp2">' +
    '<div class="tj-head"></div>' +
    '<div class="tj-table"><div class="tj-th">오늘 운동의 잘한 점</div><div class="tj-th">스스로 느낀 고쳐야 할 점</div>' +
    '<textarea class="tj-area" data-f="good" style="height:260px">' + esc(e.good || '') + '</textarea><textarea class="tj-area" data-f="fix" style="height:260px">' + esc(e.fix || '') + '</textarea></div>' +
    '<div class="tj-row"><span>오늘 나의 마인드 상태</span><div class="tj-faces">' + TJ_MIND.map(function (m, i) { return '<button class="' + (e.mind === i + 1 ? 'on' : '') + '" data-mind="' + (i + 1) + '" aria-label="' + m[1] + '">' + m[0] + '</button>' }).join('') + '</div></div>' +
    '<div class="tj-row"><span>스트레스 요인</span><input class="tj-line" data-f="stress" value="' + esc(e.stress || '') + '"></div>' +
    '<div class="tj-row"><span>오늘의 운동 만족도</span><div class="tj-stars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-sat="' + n + '" aria-label="' + n + '점">' + (n <= sat ? '★' : '☆') + '</button>' }).join('') + '</div></div>' +
    '<div class="tj-q">오늘의 부상, 컨디션 또는 심리상태가 어땠나요?</div>' +
    '<div class="tj-cond"><textarea class="tj-area lined" data-f="cond" style="height:226px"></textarea><div class="tj-body">' + tjBody(e) + '<small>아픈 곳을 눌러 표시</small></div></div>' +
    '<div class="tj-quote">잘못이 부끄러운 것이 아니라, 잘못을 고치지 못하는 것이 부끄러운 것이다.<small>- 루소 -</small></div>' +
    '<canvas class="tj-ink" data-pg="p2" width="' + TJ_W * 2 + '" height="' + TJ_H * 2 + '"></canvas></div>';
}

function renderTJ(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) date = today();
  var e = tjGet(date), keepPage = TJ && TJ.page;
  TJ = { date: date, page: keepPage || 1, mode: (TJ && TJ.mode) || 'text', color: (TJ && TJ.color) || TJ_PENS[0], width: (TJ && TJ.width) || 3, eraser: false, ink: { p1: [], p2: [] }, undo: [], cur: null };
  var d = new Date(date + 'T12:00:00'), wd = '일월화수목금토'[d.getDay()];
  $('#app').innerHTML =
    '<div class="top"><h1>훈련일지</h1><button class="iconbtn" data-tj="list" aria-label="지난 일지">📚</button></div>' +
    '<div class="wrap" style="max-width:1480px">' +
    '<div class="tj-date"><button class="btn" data-tj="prev" aria-label="전날">◀</button>' +
    '<label class="tj-dlabel"><b>' + d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + ' (' + wd + ')</b><small>' + (date === today() ? '오늘' : tjHas(e) ? '✓ 쓴 날' : '날짜 바꾸기') + '</small><input type="date" id="tjpick" value="' + date + '"></label>' +
    '<button class="btn" data-tj="next" aria-label="다음날">▶</button>' + (date !== today() ? '<button class="btn sm" data-tj="today">오늘</button>' : '') + '</div>' +
    '<div class="tj-tools"><div class="seg"><button data-tjm="text" class="' + (TJ.mode === 'text' ? 'on' : '') + '">⌨️ 글자</button><button data-tjm="pen" class="' + (TJ.mode === 'pen' ? 'on' : '') + '">✏️ 펜</button></div>' +
    '<div class="tj-pen"' + (TJ.mode === 'pen' ? '' : ' hidden') + '>' + TJ_PENS.map(function (c) { return '<button class="tj-c' + (c === TJ.color ? ' on' : '') + '" data-tjc="' + c + '" style="background:' + c + '" aria-label="펜 색"></button>' }).join('') +
    '<button class="btn sm" data-tj="thick">' + (TJ.width > 3 ? '굵게' : '얇게') + '</button><button class="btn sm" data-tjs="o">🔵 공격</button><button class="btn sm" data-tjs="x">🔴 수비</button><button class="btn sm" data-tjs="b">🟠 공</button><button class="btn sm" data-tj="eraser">🧽 지우개</button><button class="btn sm" data-tj="undo">↶</button><button class="btn sm" data-tj="clear">🗑</button></div></div>' +
    '<div class="seg wide tj-tabs"><button data-tjp="1">1쪽 · 운동 내용</button><button data-tjp="2">2쪽 · 잘한 점·마음</button></div>' +
    '<div class="tj-wrap" id="tjwrap"><div class="tj-inner" id="tjinner">' + tjPage1(date, e) + tjPage2(e) + '</div></div>' +
    '<p class="note" style="text-align:center">쓰는 대로 저장돼요 · ◀ ▶ 로 다른 날짜 일지를 볼 수 있어요</p></div>';
  $('[data-f=cond]').value = e.cond || '';
  tjWire(); tjMode(TJ.mode); tjFit();
  vdb.get('ink:' + date).then(function (ink) { if (!TJ || TJ.date !== date) return; if (ink) TJ.ink = { p1: ink.p1 || [], p2: ink.p2 || [] }; tjDrawAll() }).catch(function () {});
}
function tjFit() {
  var w = $('#tjwrap'), inner = $('#tjinner'); if (!w || !inner) return;
  var avail = w.clientWidth, two = avail >= 980;
  inner.classList.toggle('two', two);
  $('.tj-tabs').style.display = two ? 'none' : '';
  $('#tjp1').style.display = two || TJ.page === 1 ? '' : 'none';
  $('#tjp2').style.display = two || TJ.page === 2 ? '' : 'none';
  $$('[data-tjp]').forEach(function (b) { b.classList.toggle('on', +b.dataset.tjp === TJ.page) });
  var s = avail / (two ? TJ_W * 2 + 24 : TJ_W);
  inner.style.transform = 'scale(' + s + ')';
  w.style.height = Math.ceil(TJ_H * s) + 'px';
}
window.addEventListener('resize', function () { if (TJ && $('#tjwrap')) tjFit() });
function tjMode(m) {
  TJ.mode = m; TJ.eraser = false; tjStamp(null);
  $$('.tj-ink').forEach(function (c) { c.classList.toggle('pen', m === 'pen') });
  $$('[data-tjm]').forEach(function (b) { b.classList.toggle('on', b.dataset.tjm === m) });
  $('.tj-pen').hidden = m !== 'pen';
  var er = $('[data-tj=eraser]'); if (er) er.classList.remove('pri');
}
function tjWire() {
  var date = TJ.date;
  $$('[data-f]').forEach(function (el) { el.addEventListener('input', function () { tjSet(date, el.dataset.f, el.value) }) });
  $$('[data-mind]').forEach(function (b) { b.onclick = function () { var v = +b.dataset.mind; v = tjGet(date).mind === v ? 0 : v; tjSet(date, 'mind', v); $$('[data-mind]').forEach(function (x) { x.classList.toggle('on', +x.dataset.mind === v) }) } });
  $$('[data-sat]').forEach(function (b) { b.onclick = function () { var v = +b.dataset.sat; v = tjGet(date).sat === v ? 0 : v; tjSet(date, 'sat', v); $$('[data-sat]').forEach(function (x) { x.textContent = +x.dataset.sat <= v ? '★' : '☆' }) } });
  $$('[data-tjm]').forEach(function (b) { b.onclick = function () { tjMode(b.dataset.tjm); if (b.dataset.tjm === 'pen') toast('펜 모드: 일지 위에 손가락이나 터치펜으로 쓰세요') } });
  $$('[data-tjs]').forEach(function (b) { b.onclick = function () { tjStamp(TJ.stamp === b.dataset.tjs ? null : b.dataset.tjs) } });
  $$('[data-tjc]').forEach(function (b) { b.onclick = function () { TJ.color = b.dataset.tjc; TJ.eraser = false; tjStamp(null); $('[data-tj=eraser]').classList.remove('pri'); $$('[data-tjc]').forEach(function (x) { x.classList.toggle('on', x === b) }) } });
  $$('[data-tjp]').forEach(function (b) { b.onclick = function () { TJ.page = +b.dataset.tjp; tjFit() } });
  $('#tjpick').onchange = function () { if (this.value) location.hash = '#/tj/' + this.value };
  $('#app').onclick = function (ev) {
    var b = ev.target.closest('[data-tj]'); if (!b || !TJ) return;
    var a = b.dataset.tj;
    if (a === 'prev') location.hash = '#/tj/' + tjShift(date, -1);
    else if (a === 'next') location.hash = '#/tj/' + tjShift(date, 1);
    else if (a === 'today') location.hash = '#/tj/' + today();
    else if (a === 'list') tjListSheet();
    else if (a === 'thick') { TJ.width = TJ.width > 3 ? 3 : 6; b.textContent = TJ.width > 3 ? '굵게' : '얇게' }
    else if (a === 'eraser') { TJ.eraser = !TJ.eraser; b.classList.toggle('pri', TJ.eraser); if (TJ.eraser) tjStamp(null) }
    else if (a === 'undo') tjUndo();
    else if (a === 'clear') confirmSheet('이 날 펜으로 쓴 것을 모두 지울까요?', function () { TJ.undo.push({ t: 'clear', ink: TJ.ink }); TJ.ink = { p1: [], p2: [] }; tjDrawAll(); tjSaveInk() });
    else if (a === 'loadlog') tjLoadLogs();
    else if (a === 'body' && TJ.mode === 'text') tjBodyTap(ev, b);
  };
  $$('.tj-ink').forEach(tjWireInk);
}
function tjLoadLogs() {
  var logs = S.logs.filter(function (l) { return l.date === TJ.date });
  if (!logs.length) { toast('이 날 훈련 기록이 없어요'); return }
  var lines = logs.map(function (l) { return '• ' + l.name + [l.reps ? ' ' + l.reps + '회' : '', l.min ? ' ' + l.min + '분' : ''].join('') + (l.memo ? ' — ' + l.memo : '') }).join('\n');
  var ta = $('[data-f=content]'); ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + '\n' : '') + lines;
  tjSet(TJ.date, 'content', ta.value); toast('훈련 기록 ' + logs.length + '개를 넣었어요');
}
function tjBodyTap(ev, svg) {
  var r = svg.getBoundingClientRect(), x = Math.round((ev.clientX - r.left) / r.width * 200), y = Math.round((ev.clientY - r.top) / r.height * 300);
  var body = (tjGet(TJ.date).body || []).slice(), hit = -1;
  body.forEach(function (m, i) { if (Math.hypot(m[0] - x, m[1] - y) < 14) hit = i });
  if (hit >= 0) body.splice(hit, 1); else body.push([x, y]);
  tjSet(TJ.date, 'body', body);
  svg.outerHTML = tjBody(tjGet(TJ.date));
}
function tjListSheet() {
  var all = tjAll(), dates = Object.keys(all).filter(function (d) { return tjHas(all[d]) }).sort().reverse();
  sheet('<h3>📚 지난 훈련일지</h3>' + (dates.length ? '<div class="tj-list">' + dates.map(function (d) {
    var e = all[d], first = (e.content || e.good || e.coach || '').split('\n')[0];
    return '<button data-go="' + d + '"><b>' + d.replace(/-/g, '. ') + ' (' + '일월화수목금토'[new Date(d + 'T12:00:00').getDay()] + ')</b>' +
      '<span>' + (e.mind ? TJ_MIND[e.mind - 1][0] + ' ' : '') + (e.sat ? '★'.repeat(e.sat) + ' ' : '') + (e.ink ? '✏️' : '') + '</span>' + (first ? '<small>' + esc(first.slice(0, 40)) + '</small>' : '') + '</button>';
  }).join('') + '</div>' : '<p class="note">아직 쓴 일지가 없어요.</p>') + '<button class="btn" id="no">닫기</button>', function (s, close) {
    $('#no', s).onclick = close;
    $$('[data-go]', s).forEach(function (b) { b.onclick = function () { close(); location.hash = '#/tj/' + b.dataset.go } });
  });
}

/* ---------- 펜 필기 ---------- */
function tjCtx(c) { var g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.lineCap = 'round'; g.lineJoin = 'round'; return g }
function tjStamp(t) {
  TJ.stamp = t;
  $$('[data-tjs]').forEach(function (b) { b.classList.toggle('pri', b.dataset.tjs === t) });
  if (t) { TJ.eraser = false; var er = $('[data-tj=eraser]'); if (er) er.classList.remove('pri') }
}
/* 도장: 공격 = 파란 원 + 번호, 수비 = 빨간 네모 + 번호, 공 = 주황 원 */
function tjDrawStamp(g, st) {
  var x = st.p[0], y = st.p[1];
  g.save(); g.lineWidth = 2.5;
  if (st.t === 'b') { g.fillStyle = '#F07A2E'; g.strokeStyle = '#7A2E08'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.stroke() }
  else {
    if (st.t === 'o') { g.fillStyle = '#1F5FBF'; g.strokeStyle = '#fff'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); g.stroke() }
    else { g.fillStyle = '#fff'; g.strokeStyle = '#C8372D'; g.beginPath(); g.rect(x - 11, y - 11, 22, 22); g.fill(); g.stroke() }
    g.fillStyle = st.t === 'o' ? '#fff' : '#C8372D'; g.font = 'bold 15px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(st.n), x, y + 1);
  }
  g.restore();
}
function tjStroke(g, st) {
  if (st.t) { tjDrawStamp(g, st); return }
  var p = st.p; if (p.length < 2) return;
  g.strokeStyle = st.c; g.lineWidth = st.w; g.beginPath(); g.moveTo(p[0], p[1]);
  if (p.length === 2) { g.lineTo(p[0] + 0.1, p[1] + 0.1) }
  for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
  g.stroke();
}
function tjDraw(pg) { var c = $('.tj-ink[data-pg=' + pg + ']'); if (!c) return; var g = tjCtx(c); g.clearRect(0, 0, TJ_W, TJ_H); TJ.ink[pg].forEach(function (st) { tjStroke(g, st) }) }
function tjDrawAll() { tjDraw('p1'); tjDraw('p2') }
var tjSaveT = 0;
function tjSaveInk() {
  clearTimeout(tjSaveT);
  var date = TJ.date, ink = TJ.ink;
  tjSaveT = setTimeout(function () {
    vdb.put('ink:' + date, ink).catch(function () { toast('필기를 저장하지 못했어요') });
    tjSet(date, 'ink', ink.p1.length + ink.p2.length > 0);
  }, 400);
}
function tjPt(c, e) { var r = c.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * TJ_W * 10) / 10, Math.round((e.clientY - r.top) / r.height * TJ_H * 10) / 10] }
function tjErase(pg, pt) {
  var keep = [], gone = [];
  TJ.ink[pg].forEach(function (st) {
    var hit = false; for (var i = 0; i < st.p.length; i += 2) if (Math.hypot(st.p[i] - pt[0], st.p[i + 1] - pt[1]) < (st.t ? 16 : 12)) { hit = true; break }
    (hit ? gone : keep).push(st);
  });
  if (gone.length) { TJ.ink[pg] = keep; TJ.undo.push({ t: 'erase', pg: pg, sts: gone }); tjDraw(pg); tjSaveInk() }
}
function tjUndo() {
  var a = TJ.undo.pop(); if (!a) { toast('되돌릴 게 없어요'); return }
  if (a.t === 'add') TJ.ink[a.pg] = TJ.ink[a.pg].filter(function (s) { return s !== a.st });
  else if (a.t === 'erase') TJ.ink[a.pg] = TJ.ink[a.pg].concat(a.sts);
  else if (a.t === 'clear') TJ.ink = a.ink;
  tjDrawAll(); tjSaveInk();
}
function tjWireInk(c) {
  var pg = c.dataset.pg;
  c.addEventListener('pointerdown', function (e) {
    if (!TJ || TJ.mode !== 'pen') return;
    e.preventDefault(); try { c.setPointerCapture(e.pointerId) } catch (x) {}
    var pt = tjPt(c, e);
    if (TJ.eraser) { TJ.cur = { erase: true, id: e.pointerId }; tjErase(pg, pt); return }
    if (TJ.stamp) {
      var same = TJ.ink[pg].filter(function (x) { return x.t === TJ.stamp }).length;
      var sp = { t: TJ.stamp, n: TJ.stamp === 'b' ? 0 : same % 5 + 1, p: pt };
      TJ.ink[pg].push(sp); TJ.undo.push({ t: 'add', pg: pg, st: sp }); tjDraw(pg); tjSaveInk(); return;
    }
    var st = { c: TJ.color, w: e.pointerType === 'pen' ? TJ.width * 0.8 : TJ.width, p: pt };
    TJ.cur = { st: st, id: e.pointerId };
    TJ.ink[pg].push(st);
  });
  c.addEventListener('pointermove', function (e) {
    var cur = TJ && TJ.cur; if (!cur || cur.id !== e.pointerId) return;
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!evs.length) evs = [e];
    if (cur.erase) { evs.forEach(function (ev) { tjErase(pg, tjPt(c, ev)) }); return }
    var g = tjCtx(c), p = cur.st.p;
    g.strokeStyle = cur.st.c; g.lineWidth = cur.st.w; g.beginPath(); g.moveTo(p[p.length - 2], p[p.length - 1]);
    evs.forEach(function (ev) { var q = tjPt(c, ev); p.push(q[0], q[1]); g.lineTo(q[0], q[1]) });
    g.stroke();
  });
  function end(e) {
    var cur = TJ && TJ.cur; if (!cur || cur.id !== e.pointerId) return;
    TJ.cur = null;
    if (cur.st) { if (cur.st.p.length === 2) tjDraw(pg); TJ.undo.push({ t: 'add', pg: pg, st: cur.st }); tjSaveInk() }
  }
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
}
