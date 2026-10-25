/* 훈련일지: 종이 양식(2쪽)과 같은 모양을 세로로 이어 붙임. 글자는 키보드로 입력, 날짜별로 저장(S.tj[날짜]).
   운동 내용의 "패턴 그림"은 패턴 편집기로 그리는 그날의 패턴(S.patterns 의 id 'tj-날짜', tjDate 표시).
   index.html 의 공용 함수($, esc, S, save, vdb, today, sheet, toast, confirmSheet …)를 쓴다 */
'use strict';
var TJ_W = 700, TJ_H = 1010;
var TJ_MIND = [['😍', '최고'], ['😊', '좋음'], ['😐', '보통'], ['😩', '피곤'], ['😵', '힘듦'], ['😠', '화남']];
var TJ = null;
var TJ_ZOOMS = [1, 1.3, 1.6, 2, 2.5, 3];
function tjUi() { return (S.ui = S.ui || {}) }

function tjAll() { return (S.tj = S.tj || {}) }
function tjGet(date) { return tjAll()[date] || {} }
function tjSet(date, k, v) { var a = tjAll(); a[date] = a[date] || {}; a[date][k] = v; save() }
function tjHas(e) { return !!(e && (e.content || e.coach || e.good || e.fix || e.stress || e.cond || e.mind || e.sat || (e.body && e.body.length) || e.pat)) }
function tjShift(date, n) { var d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
function tjWeekday(date) { return (new Date(date + 'T12:00:00').getDay() + 6) % 7 } // 월=0 … 일=6

function tjPage1(date, e) {
  var p = date.split('-'), wd = tjWeekday(date);
  return '<div class="tj-page" id="tjp1">' +
    '<div class="tj-head"><div class="tj-ymd"><b>' + p[0] + '</b> 년 <b>' + (+p[1]) + '</b> 월 <b>' + (+p[2]) + '</b> 일</div>' +
    '<div class="tj-wd">' + '월화수목금토일'.split('').map(function (c, i) { return '<span class="' + (i === wd ? 'on' : '') + '">' + c + '</span>' }).join('') + '</div></div>' +
    '<div class="tj-lbl">운동 내용 <button class="tj-mini" data-tj="loadlog">📋 오늘 기록 불러오기</button></div>' +
    '<div class="tj-crow"><textarea class="tj-area lined" data-f="content" style="height:470px" placeholder="오늘 한 운동을 적어요">' + esc(e.content || '') + '</textarea>' +
    '<div class="tj-courtbox" id="tjpat">' + tjPatBox(date) + '</div></div>' +
    '<div class="tj-lbl" style="margin-top:18px">피드백</div>' +
    '<div class="tj-box"><div class="tj-boxh">지도자의 피드백</div><textarea class="tj-area lined" data-f="coach" style="height:262px" placeholder="코치님·부모님이 해 준 말">' + esc(e.coach || '') + '</textarea></div></div>';
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
    '<div class="tj-quote">잘못이 부끄러운 것이 아니라, 잘못을 고치지 못하는 것이 부끄러운 것이다.<small>- 루소 -</small></div></div>';
}

function renderTJ(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) date = today();
  var e = tjGet(date);
  TJ = { date: date, zoom: (TJ && TJ.zoom) || tjUi().tjZoom || 0, s: 1, fi: 0 };
  var d = new Date(date + 'T12:00:00'), wd = '일월화수목금토'[d.getDay()];
  $('#app').innerHTML =
    '<div class="top"><h1>훈련일지</h1><button class="iconbtn" data-tj="list" aria-label="지난 일지 달력">📅</button></div>' +
    '<div class="wrap" style="max-width:1480px">' +
    '<div class="tj-date"><button class="btn" data-tj="prev" aria-label="전날">◀</button>' +
    '<label class="tj-dlabel"><b>' + d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + ' (' + wd + ')</b><small>' + (date === today() ? '오늘' : tjHas(e) ? '✓ 쓴 날' : '날짜 바꾸기') + '</small><input type="date" id="tjpick" value="' + date + '"></label>' +
    '<button class="btn" data-tj="next" aria-label="다음날">▶</button>' + (date !== today() ? '<button class="btn sm" data-tj="today">오늘</button>' : '') + '</div>' +
    '<div class="tj-tools"><div class="tj-row1"><span class="note">⌨️ 칸을 누르고 키보드로 써요</span>' +
    '<div class="tj-zoom"><button class="btn" data-tj="zout" aria-label="작게">－</button><button class="btn sm" data-tj="zfit" id="tjzl">100%</button><button class="btn" data-tj="zin" aria-label="크게">＋</button></div></div></div>' +
    '<div class="tj-wrap" id="tjwrap"><div class="tj-sizer" id="tjsizer"><div class="tj-inner" id="tjinner">' + tjPage1(date, e) + tjPage2(e) + '</div></div></div>' +
    '<p class="note" style="text-align:center">쓰는 대로 저장돼요 · ＋ 로 크게 볼 수 있어요 (크게 하면 손가락으로 밀어서 이동) · ❓ 도움말 탭에 자세한 설명</p></div>';
  $('[data-f=cond]').value = e.cond || '';
  tjWire(); tjFit(); tjPatShow();
  /* 스크롤바가 생기거나 화면 폭이 바뀌면 다시 맞춘다 (오른쪽 잘림 방지) */
  if (window.ResizeObserver) { var lastW = 0, ro = new ResizeObserver(function () { var el = $('#tjwrap'); if (!el || !TJ) { ro.disconnect(); return } var cw = el.parentNode.clientWidth; if (cw !== lastW) { lastW = cw; tjFit(true) } }); ro.observe($('#tjwrap').parentNode) }
}
/* 화면 맞춤 배율 × 확대(zoom). 확대하면 일지 칸 안에서 위아래·옆으로 밀어서 본다 */
function tjFit(keep) {
  var w = $('#tjwrap'), sizer = $('#tjsizer'), inner = $('#tjinner'); if (!w || !inner) return;
  var cs = getComputedStyle(w.parentNode); // .wrap 의 좌우 여백은 빼고 잰다 (안 빼면 오른쪽이 잘림)
  var avail = w.parentNode.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - (TJ.zoom > 1 ? 4 : 0);
  if (!TJ.zoom) TJ.zoom = 1;
  /* 세로로 한 줄: 1쪽(운동 내용·피드백) 아래에 2쪽(잘한 점·마음·컨디션) */
  var pw = TJ_W, ph = TJ_H * 2 + 24, old = TJ.s, cx = 0, cy = 0;
  if (keep && old) { cx = (w.scrollLeft + w.clientWidth / 2) / old; cy = (w.scrollTop + w.clientHeight / 2) / old }
  var s = Math.floor(Math.min(avail, 820) / pw * TJ.zoom * 1000) / 1000; TJ.s = s;
  inner.style.transform = 'scale(' + s + ')';
  sizer.style.width = Math.ceil(pw * s) + 'px'; sizer.style.height = Math.ceil(ph * s) + 'px';
  var zoomed = TJ.zoom > 1;
  w.classList.toggle('zoomed', zoomed);
  if (zoomed) {
    var top = $('.top'), tools = $('.tj-tools'), nav = $('#nav');
    tools.style.top = (top ? top.offsetHeight : 0) + 'px';
    var h = window.innerHeight - (top ? top.offsetHeight : 0) - tools.offsetHeight - (nav ? nav.offsetHeight : 0) - 12;
    w.style.height = Math.max(280, Math.min(h, ph * s)) + 'px';
  } else w.style.height = Math.ceil(ph * s) + 'px';
  if (keep && old) { w.scrollLeft = cx * s - w.clientWidth / 2; w.scrollTop = cy * s - w.clientHeight / 2 }
  var zl = $('#tjzl'); if (zl) zl.textContent = Math.round(TJ.zoom * 100) + '%';
}
function tjZoom(dir) {
  var i = TJ_ZOOMS.indexOf(TJ.zoom); if (i < 0) i = 0;
  var z = dir === 0 ? 1 : TJ_ZOOMS[Math.max(0, Math.min(TJ_ZOOMS.length - 1, i + dir))];
  if (z === TJ.zoom) return;
  TJ.zoom = z; tjUi().tjZoom = z; save();
  tjFit(true);
  if (z > 1) { var w = $('#tjwrap'), top = $('.top'), tools = $('.tj-tools'); window.scrollTo({ top: w.getBoundingClientRect().top + window.scrollY - (top ? top.offsetHeight : 0) - tools.offsetHeight - 6, behavior: 'smooth' }) }
}
window.addEventListener('resize', function () { if (TJ && $('#tjwrap')) tjFit(true) });
function tjWire() {
  var date = TJ.date;
  $$('[data-f]').forEach(function (el) { el.addEventListener('input', function () { tjSet(date, el.dataset.f, el.value) }) });
  $$('[data-mind]').forEach(function (b) { b.onclick = function () { var v = +b.dataset.mind; v = tjGet(date).mind === v ? 0 : v; tjSet(date, 'mind', v); $$('[data-mind]').forEach(function (x) { x.classList.toggle('on', +x.dataset.mind === v) }) } });
  $$('[data-sat]').forEach(function (b) { b.onclick = function () { var v = +b.dataset.sat; v = tjGet(date).sat === v ? 0 : v; tjSet(date, 'sat', v); $$('[data-sat]').forEach(function (x) { x.textContent = +x.dataset.sat <= v ? '★' : '☆' }) } });
  $('#tjpick').onchange = function () { if (this.value) location.hash = '#/tj/' + this.value };
  $('#app').onclick = function (ev) {
    var b = ev.target.closest('[data-tj]'); if (!b || !TJ) return;
    var a = b.dataset.tj;
    if (a === 'prev') location.hash = '#/tj/' + tjShift(date, -1);
    else if (a === 'next') location.hash = '#/tj/' + tjShift(date, 1);
    else if (a === 'today') location.hash = '#/tj/' + today();
    else if (a === 'list') tjListSheet();
    else if (a === 'zin') tjZoom(1);
    else if (a === 'zout') tjZoom(-1);
    else if (a === 'zfit') tjZoom(0);
    else if (a === 'pdraw') tjPatEdit();
    else if (a === 'pload') tjPatLoad();
    else if (a === 'pprev') { if (TJ.fi > 0) { TJ.fi--; tjPatShow() } }
    else if (a === 'pnext') tjPatNext();
    else if (a === 'pplay') tjPatPlay();
    else if (a === 'loadlog') tjLoadLogs();
    else if (a === 'body') tjBodyTap(ev, b);
  };
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
/* 지난 일지: 달력으로 보기. 일지 쓴 날 = 마음 표정(없으면 ✓), 연습 기록만 있는 날 = 🏀 점 */
function tjListSheet() {
  var all = tjAll(), cur = TJ.date.slice(0, 7), logDays = {};
  S.logs.forEach(function (l) { logDays[l.date] = 1 });
  var nWritten = Object.keys(all).filter(function (d) { return tjHas(all[d]) }).length;
  sheet('<h3>📚 지난 훈련일지 <small class="note">' + nWritten + '일 썼어요</small></h3><div id="tjcal"></div>' +
    '<div class="tjc-legend"><span><i class="w"></i>일지 쓴 날</span><span>🏀 연습만 한 날</span><span><i class="t"></i>오늘</span></div>' +
    '<button class="btn" id="no">닫기</button>', function (s, close) {
      $('#no', s).onclick = close;
      function draw() {
        var y = +cur.slice(0, 4), m = +cur.slice(5, 7), first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate();
        var lead = first.getDay(), h = '<div class="tjc-head"><button class="btn" data-mv="-1" aria-label="이전 달">◀</button><b>' + y + '년 ' + m + '월</b><button class="btn" data-mv="1" aria-label="다음 달">▶</button></div><div class="tjc-grid">' +
          '일월화수목금토'.split('').map(function (c, i) { return '<span class="tjc-wd' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '') + '">' + c + '</span>' }).join('');
        for (var i = 0; i < lead; i++) h += '<span></span>';
        for (var d = 1; d <= days; d++) {
          var ds = cur + '-' + String(d).padStart(2, '0'), e = all[ds], w = tjHas(e);
          var mark = w ? (e.mind ? TJ_MIND[e.mind - 1][0] : '✓') : logDays[ds] ? '🏀' : '';
          h += '<button class="tjc-d' + (w ? ' w' : '') + (ds === today() ? ' t' : '') + (ds === TJ.date ? ' sel' : '') + '" data-go="' + ds + '"><b>' + d + '</b><span>' + mark + '</span>' +
            (w && e.sat ? '<small>' + '★'.repeat(e.sat) + '</small>' : '') + '</button>';
        }
        $('#tjcal', s).innerHTML = h + '</div>';
        $$('[data-mv]', s).forEach(function (b) { b.onclick = function () { var dt = new Date(y, m - 1 + +b.dataset.mv, 1); cur = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); draw() } });
        $$('[data-go]', s).forEach(function (b) { b.onclick = function () { close(); location.hash = '#/tj/' + b.dataset.go } });
      }
      draw();
    });
}

/* ---------- 운동 내용의 패턴 그림 (패턴 편집기로 그리고, 여기서는 단계별로 보기·재생) ---------- */
function tjPat(date) { return S.patterns.filter(function (p) { return p.tjDate === date })[0] }
function tjPatBox(date) {
  var p = tjPat(date), full = p && isFull(p);
  var h = '<div class="tj-courth">패턴 그림' + (p ? ' · ' + p.frames.length + '단계' : '') + '</div>' +
    '<svg class="tj-psvg' + (full ? ' full' : '') + '" viewBox="' + vbox(full) + '" aria-label="오늘의 패턴 그림">' + courtDefs() + courtBase(full) + '<g id="tjdyn"></g></svg>';
  if (!p) return h + '<div class="tj-pempty">선수·공의 움직임을<br>단계별로 그려서 남겨요</div>' +
    '<div class="tj-pbtns"><button class="tj-pb pri" data-tj="pdraw">✏️ 패턴 그리기</button><button class="tj-pb" data-tj="pload">📋 불러오기</button></div>';
  return h + '<div class="tj-pctl"><button class="tj-pb" data-tj="pprev">◀</button><b id="tjpstep"></b><button class="tj-pb" data-tj="pnext">▶</button><button class="tj-pb play" data-tj="pplay">▶ 움직임</button></div>' +
    '<div class="tj-pnote" id="tjpnote"></div>' +
    '<div class="tj-pbtns"><button class="tj-pb pri" data-tj="pdraw">✏️ 고치기</button><button class="tj-pb" data-tj="pload">📋 다른 패턴</button></div>';
}
function tjPatShow() {
  var p = tjPat(TJ.date), g = $('#tjdyn'); if (!g) return;
  if (!p) { g.innerHTML = ''; return }
  var n = normPattern(p); if (TJ.fi >= n.frames.length) TJ.fi = n.frames.length - 1;
  g.innerHTML = courtFrame(n, TJ.fi, { showD: p.def !== 'none' });
  $('#tjpstep').textContent = (TJ.fi + 1) + ' / ' + n.frames.length;
  $('#tjpnote').textContent = n.frames[TJ.fi].note || '';
}
var tjRaf = 0;
function tjTween(n, i, showD, cb) {
  cancelAnimationFrame(tjRaf);
  var t0 = performance.now();
  (function tick(now) {
    var g = $('#tjdyn'); if (!g) return;
    var t = Math.min(1, (now - t0) / 1300); g.innerHTML = courtTween(n, i, t, showD);
    if (t < 1) tjRaf = requestAnimationFrame(tick); else cb && cb();
  })(t0);
}
function tjPatNext() {
  var p = tjPat(TJ.date); if (!p) return;
  var n = normPattern(p);
  if (TJ.fi >= n.frames.length - 1) { TJ.fi = 0; tjPatShow(); return }
  $('#tjpnote').textContent = n.frames[TJ.fi + 1].note || '';
  tjTween(n, TJ.fi + 1, p.def !== 'none', function () { TJ.fi++; tjPatShow() });
}
function tjPatPlay() {
  var p = tjPat(TJ.date); if (!p) return;
  var n = normPattern(p), showD = p.def !== 'none';
  TJ.fi = 0; tjPatShow();
  (function step() {
    if (!$('#tjdyn') || TJ.fi >= n.frames.length - 1) return;
    setTimeout(function () { if (!$('#tjdyn')) return; $('#tjpnote').textContent = n.frames[TJ.fi + 1].note || ''; tjTween(n, TJ.fi + 1, showD, function () { TJ.fi++; tjPatShow(); step() }) }, 900);
  })();
}
function tjPatNew(date, src) {
  var p;
  if (src) {
    var n = normPattern(src);
    p = { court: src.court, def: src.def === 'manual' ? 'manual' : src.def, n: src.n, name: src.name,
      frames: n.frames.map(function (f, i) { return { o: f.o, x: src.def === 'manual' ? f.x : clone(src.frames[i].x || {}), ball: f.ball, screen: f.screen, note: f.note } }) };
  } else p = { def: 'auto', name: '오늘의 패턴', frames: [{ o: clone(FIVE_OUT), x: {}, ball: '1', screen: [], note: '' }] };
  p.id = 'tj-' + date; p.tjDate = date; p.custom = true; p.cat = '훈련일지'; p.keys = []; p.q = [];
  S.patterns = S.patterns.filter(function (x) { return x.tjDate !== date }); S.patterns.push(p);
  tjSet(date, 'pat', true);
  return p;
}
function tjPatEdit() {
  var p = tjPat(TJ.date) || tjPatNew(TJ.date);
  location.hash = '#/pe/' + encodeURIComponent(p.id);
}
function tjPatLoad() {
  var date = TJ.date;
  sheet('<h3>📋 패턴 불러오기</h3><p class="note" style="margin:0">고른 패턴을 오늘 일지에 복사해요. 불러온 뒤 ✏️ 고치기로 바꿀 수 있어요.</p>' +
    '<div class="tj-list">' + allPatterns().map(function (p) { return '<button data-pp="' + esc(p.id) + '"><b>' + esc(p.name) + '</b><small>' + esc(p.cat) + ' · ' + p.frames.length + '단계' + (p.custom ? ' · 내 패턴' : '') + '</small></button>' }).join('') + '</div>' +
    '<button class="btn" id="no">닫기</button>', function (s, close) {
      $('#no', s).onclick = close;
      $$('[data-pp]', s).forEach(function (b) {
        b.onclick = function () {
          var src = findPattern(b.dataset.pp); if (!src) return;
          function go() { close(); tjPatNew(date, src); TJ.fi = 0; $('#tjpat').innerHTML = tjPatBox(date); tjPatShow(); toast('"' + src.name + '"를 불러왔어요') }
          if (tjPat(date)) { close(); confirmSheet('지금 그린 패턴을 "' + src.name + '"로 바꿀까요?', function () { tjPatNew(date, src); TJ.fi = 0; $('#tjpat').innerHTML = tjPatBox(date); tjPatShow() }) } else go();
        };
      });
    });
}
