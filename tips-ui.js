/* 실전 꿀팁 화면. index.html 의 공용 함수($, esc, S, save, drill, findPattern …)를 쓴다 */
'use strict';
var tview = { cat: '전체', lv: '전체' };
var TIP_EMO = { '돌파': '⚡', '속공': '🚀', '미스매치': '⚖️', '픽앤롤': '🧱', '오프볼': '🔄', '수비': '🛡️', '리바운드': '🙌', '경기 운영': '🧠' };
function libTabs(on) {
  return '<div class="seg wide" style="margin-bottom:6px"><button data-ltab="drill" class="' + (on === 'drill' ? 'on' : '') + '">🏀 기술 훈련</button><button data-ltab="tips" class="' + (on === 'tips' ? 'on' : '') + '">💡 실전 꿀팁</button></div>';
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-ltab]'); if (!b) return;
  location.hash = b.dataset.ltab === 'tips' ? '#/tips' : '#/';
});
function findTip(id) { return TIPS.filter(function (t) { return t.id === id })[0] }
function tipCard(t) {
  return '<a class="card drill" href="#/t/' + encodeURIComponent(t.id) + '" style="text-decoration:none;color:inherit">' +
    '<div class="row"><span class="nm">' + esc(t.title) + '</span>' + '' + '</div>' +
    '<div class="sm">' + esc(t.situation) + '</div>' +
    '<div class="row"><span class="tag">' + esc(t.cat) + '</span><span class="tag lv-' + esc(t.level) + '">' + esc(t.level) + '</span><span class="tag">💡 ' + t.tips.length + '개</span></div></a>';
}
function renderTipsList() {
  var items = TIPS.filter(function (t) { return (tview.cat === '전체' || t.cat === tview.cat) && (tview.lv === '전체' || t.level === tview.lv) });
  if (tview.cat === '전체') {
    $('#app').innerHTML = '<div class="top"><h1>농구 훈련</h1></div><div class="wrap">' + libTabs('tips') +
      '<div class="tiles">' + TCATS.map(function (c) { var n = TIPS.filter(function (t) { return t.cat === c }).length; return '<button class="tile" data-tc="' + c + '"><span>' + (TIP_EMO[c] || '💡') + '</span><b>' + c + '</b><small>꿀팁 ' + n + '개</small></button>' }).join('') + '</div></div>';
    $$('[data-tc]').forEach(function (b) { b.onclick = function () { tview.cat = b.dataset.tc; tview.lv = '전체'; renderTipsList() } });
    return;
  }
  $('#app').innerHTML = '<div class="top"><h1>농구 훈련</h1></div><div class="wrap">' + libTabs('tips') +
    '<div class="cathead"><button class="btn sm" data-tc="전체">← 전체 상황</button><b>' + (TIP_EMO[tview.cat] || '') + ' ' + esc(tview.cat) + '</b></div>' +
    '<div class="chips">' + ['전체', '초급', '중급', '고급'].map(function (c) { return '<button class="chip' + (tview.lv === c ? ' on' : '') + '" data-tl="' + c + '">' + (c === '전체' ? '모든 난이도' : c) + '</button>' }).join('') + '</div>' +
    (items.length ? '<div class="list">' + items.map(tipCard).join('') + '</div>' : '<div class="empty">맞는 꿀팁이 없어요</div>') + '</div>';
  $$('[data-tc]').forEach(function (b) { b.onclick = function () { tview.cat = b.dataset.tc; renderTipsList() } });
  $$('[data-tl]').forEach(function (b) { b.onclick = function () { tview.lv = b.dataset.tl; renderTipsList() } });
}
function renderTip(id) {
  var t = findTip(id); if (!t) { location.hash = '#/tips'; return }
  var rel = (t.drills || []).map(function (d) { var x = drill(d); return x ? '<a class="chip" href="#/d/' + encodeURIComponent(x.id) + '">🏀 ' + esc(x.name) + '</a>' : '' }).join('') +
    (t.patterns || []).map(function (p) { var x = findPattern(p); return x ? '<a class="chip" href="#/p/' + encodeURIComponent(x.id) + '">📋 ' + esc(x.name) + '</a>' : '' }).join('');
  $('#app').innerHTML =
    '<div class="top"><button class="iconbtn" data-act="tback" aria-label="뒤로">←</button><h1 style="font-size:17px">' + esc(t.cat) + ' 꿀팁</h1></div>' +
    '<div class="wrap"><div class="hero"><h2>' + esc(t.title) + '</h2><div class="row" style="display:flex;gap:6px;margin-top:6px"><span class="tag">' + esc(t.cat) + '</span><span class="tag lv-' + esc(t.level) + '">' + esc(t.level) + '</span></div></div>' +
    '<div class="tsit"><small>이런 상황</small>' + esc(t.situation) + '</div>' +
    '<ol class="tlist">' + t.tips.map(function (x, i) { return '<li><span class="num">' + (i + 1) + '</span><div><b>' + esc(x[0]) + '</b><p>' + esc(x[1]) + '</p></div></li>' }).join('') + '</ol>' +
    '<div class="trem"><small>한 줄로 기억</small>' + esc(t.remember) + '</div>' +
    (rel ? '<div class="sec"><h3>같이 연습하기</h3><div class="chips" style="flex-wrap:wrap">' + rel + '</div></div>' : '') +
    '<div class="sec"><h3>내 메모</h3><textarea id="tmemo" rows="3" placeholder="경기에서 써본 결과, 내 생각 등">' + esc(S.tnotes[t.id] || '') + '</textarea></div>' +
    '<div class="sec" style="margin-bottom:24px"><h3>영상으로 더 보기</h3><div class="btns">' + (t.q || []).map(function (s) { return '<button class="btn ghost" data-tq="' + esc(s) + '">🔎 ' + esc(s) + '</button>' }).join('') + '</div></div></div>';
  $('[data-act=tback]').onclick = function () { history.length > 1 ? history.back() : location.hash = '#/tips' };
  $('#tmemo').oninput = function () { S.tnotes[t.id] = this.value; save() };
  $$('[data-tq]').forEach(function (b) { b.onclick = function () { openExternal('https://www.youtube.com/results?search_query=' + encodeURIComponent(b.dataset.tq)) } });
}
