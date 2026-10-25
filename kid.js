/* 어린이 모드: 큰 글씨·큰 버튼, 오늘의 미션 3개, 한 단계씩 따라하기, 별·배지 보상.
   index.html 의 공용 함수($, esc, S, save, drill, allDrills, today, sheet, toast, vdb, makeLocalPlayer, makeYTPlayer …)를 쓴다 */
'use strict';
var KID_LV = ['입문', '초급'];
var KID_EMO = { '드리블': '🏀', '슈팅': '🎯', '레이업': '🏃', '패스': '🤝', '풋워크': '👟', '수비': '🛡️', '포스트': '💪', '리바운드': '🙌' };
var KID_TITLES = [[0, '🐣', '새싹'], [15, '🏀', '루키'], [40, '⭐', '주전'], [80, '🔥', '에이스'], [150, '👑', 'MVP']];
var KID_TARGET = { '드리블': 30, '슈팅': 10, '레이업': 10 };

function kidState() { return (S.kid = S.kid || { on: false, name: '', hist: [] }) }
function kidDrills() { return allDrills().filter(function (d) { return KID_LV.indexOf(d.level) >= 0 }) }
function kidStars() { return kidState().hist.reduce(function (a, h) { return a + (h.stars || 0) }, 0) }
function kidTitle(stars) { var t = KID_TITLES[0], nx = null; KID_TITLES.forEach(function (x, i) { if (stars >= x[0]) { t = x; nx = KID_TITLES[i + 1] || null } }); return { t: t, next: nx } }
function kidName() { var n = kidState().name; return n ? n : '나' }
/* 날짜로 정해지는 오늘의 미션 3개: 드리블 1, 슈팅 1, 나머지 1 */
function kidMissions(date) {
  var seed = 0; for (var i = 0; i < date.length; i++) seed = (seed * 31 + date.charCodeAt(i)) >>> 0;
  function pick(list) { if (!list.length) return null; seed = (seed * 1103515245 + 12345) >>> 0; return list[seed % list.length] }
  var all = kidDrills();
  var a = pick(all.filter(function (d) { return d.cat === '드리블' })),
      b = pick(all.filter(function (d) { return d.cat === '슈팅' })),
      c = pick(all.filter(function (d) { return d.cat !== '드리블' && d.cat !== '슈팅' }));
  return [a, b, c].filter(Boolean);
}
function doneToday(id) { var t = today(); return kidState().hist.some(function (h) { return h.date === t && h.id === id }) }
function kidStreak() {
  var days = {}; kidState().hist.forEach(function (h) { days[h.date] = 1 });
  var n = 0, d = new Date(); if (!days[today()]) d.setDate(d.getDate() - 1);
  while (true) { var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (!days[k]) break; n++; d.setDate(d.getDate() - 1) }
  return n;
}
function kidBadges() {
  var h = kidState().hist, cnt = function (cat) { return h.filter(function (x) { return x.cat === cat }).length };
  var missionDays = {}; h.forEach(function (x) { if (x.allDone) missionDays[x.date] = 1 });
  var st = kidStreak(), stars = kidStars();
  return [
    ['🎉', '첫 연습', '처음으로 연습 완료', h.length >= 1],
    ['🔥', '3일 연속', '3일 연속 연습', st >= 3],
    ['🏆', '7일 연속', '일주일 연속 연습', st >= 7],
    ['🏀', '드리블 왕', '드리블 연습 10번', cnt('드리블') >= 10],
    ['🎯', '슈터', '슈팅 연습 10번', cnt('슈팅') >= 10],
    ['🏃', '레이업 달인', '레이업 연습 10번', cnt('레이업') >= 10],
    ['✅', '미션 클리어', '오늘의 미션 다 하기 5번', Object.keys(missionDays).length >= 5],
    ['⭐', '별 100개', '별 100개 모으기', stars >= 100]
  ];
}

/* ---------- 모드 바꾸기 ---------- */
function kidEnter() {
  sheet('<h3>🧒 어린이 모드</h3><p class="note" style="margin:0">글씨와 버튼이 커지고, 쉬운 연습만 나와요. 매일 미션 3개를 하면 별을 모을 수 있어요.<br>어른 모드로 돌아올 때는 <b>⭐ 내 별</b> 화면 맨 아래 버튼을 <b>길게(2초)</b> 누르세요.</p>' +
    '<label class="field"><span>아이 이름 (선택)</span><input class="inp" id="kn" value="' + esc(kidState().name) + '" placeholder="예: 민준"></label>' +
    '<div class="btns"><button class="btn pri" id="ok" style="flex:1">시작하기</button><button class="btn" id="no">취소</button></div>', function (s, close) {
      $('#no', s).onclick = close;
      $('#ok', s).onclick = function () { var k = kidState(); k.name = $('#kn', s).value.trim(); k.on = true; save(); close(); location.hash = '#/'; route() };
    });
}
function kidExit() { kidState().on = false; save(); location.hash = '#/'; route() }
function kidNav(on) {
  document.body.classList.toggle('kid', on);
  $('#nav').style.display = on ? 'none' : '';
  var k = $('#kidnav');
  if (!on) { if (k) k.remove(); return }
  if (!k) {
    k = document.createElement('nav'); k.id = 'kidnav'; k.className = 'nav kidnav';
    k.innerHTML = '<a href="#/" data-kk="home"><b>🎯</b>오늘 미션</a><a href="#/kpick" data-kk="pick"><b>🏀</b>연습 고르기</a><a href="#/kstars" data-kk="stars"><b>⭐</b>내 별</a>';
    document.body.appendChild(k);
  }
  var h = location.hash.replace(/^#/, '') || '/';
  $$('#kidnav a').forEach(function (a) { a.classList.toggle('on', (a.dataset.kk === 'home' && (h === '/' || h.indexOf('/kd/') === 0)) || (a.dataset.kk === 'pick' && h === '/kpick') || (a.dataset.kk === 'stars' && h === '/kstars')) });
}
/* index.html 의 route() 가 어린이 모드일 때 부른다 */
function kidRoute(h) {
  kidNav(true);
  var m = h.match(/^\/kd\/(.+)$/);
  if (m) renderKidDrill(decodeURIComponent(m[1]));
  else if (h === '/kpick') renderKidPick();
  else if (h === '/kstars') renderKidStars();
  else renderKidHome();
}

/* ---------- 화면 ---------- */
function kidCard(d, mission) {
  var done = doneToday(d.id);
  return '<a class="kcard' + (done ? ' done' : '') + '" href="#/kd/' + encodeURIComponent(d.id) + '"><span class="kemo">' + (KID_EMO[d.cat] || '🏀') + '</span>' +
    '<span class="kname">' + esc(d.name) + '<small>' + esc(d.cat) + (mission ? ' · ⭐2' : ' · ⭐1') + '</small></span><span class="kchk">' + (done ? '✅' : '▶') + '</span></a>';
}
function renderKidHome() {
  var ms = kidMissions(today()), nDone = ms.filter(function (d) { return doneToday(d.id) }).length;
  var stars = kidStars(), tt = kidTitle(stars), st = kidStreak();
  $('#app').innerHTML = '<div class="wrap kwrap">' +
    '<div class="khero"><div class="ktitle">' + esc(kidName()) + '의 농구 미션</div><div class="kstat"><span>' + tt.t[1] + ' ' + tt.t[2] + '</span><span>⭐ ' + stars + '</span>' + (st ? '<span>🔥 ' + st + '일</span>' : '') + '</div></div>' +
    '<h2 class="kh">🎯 오늘의 미션 <small>' + nDone + ' / ' + ms.length + '</small></h2>' +
    '<div class="kbar"><i style="width:' + Math.round(nDone / Math.max(1, ms.length) * 100) + '%"></i></div>' +
    '<div class="klist">' + ms.map(function (d) { return kidCard(d, true) }).join('') + '</div>' +
    (nDone === ms.length && ms.length ? '<div class="kdone">🎉 오늘 미션 완료! 정말 잘했어요!</div>' : '<p class="knote">미션을 하나씩 눌러서 따라 해 보세요. 다 하면 보너스 별 ⭐3개!</p>') +
    '</div>';
}
function renderKidPick() {
  var cats = CATS.filter(function (c) { return kidDrills().some(function (d) { return d.cat === c }) });
  $('#app').innerHTML = '<div class="wrap kwrap"><h2 class="kh">🏀 연습 고르기</h2>' +
    cats.map(function (c) {
      return '<h3 class="kcat">' + (KID_EMO[c] || '🏀') + ' ' + c + '</h3><div class="klist">' + kidDrills().filter(function (d) { return d.cat === c }).map(function (d) { return kidCard(d, false) }).join('') + '</div>';
    }).join('') + '<div style="height:16px"></div></div>';
}
function renderKidStars() {
  var stars = kidStars(), tt = kidTitle(stars), bs = kidBadges(), hist = kidState().hist.slice().reverse().slice(0, 15);
  var prog = tt.next ? Math.round((stars - tt.t[0]) / (tt.next[0] - tt.t[0]) * 100) : 100;
  $('#app').innerHTML = '<div class="wrap kwrap"><h2 class="kh">⭐ ' + esc(kidName()) + '의 별</h2>' +
    '<div class="klevel"><div class="kbig">' + tt.t[1] + '</div><div style="flex:1"><b>' + tt.t[2] + '</b><div>⭐ ' + stars + '개</div>' +
    '<div class="kbar"><i style="width:' + prog + '%"></i></div><small>' + (tt.next ? '다음 ' + tt.next[1] + ' ' + tt.next[2] + '까지 ⭐' + (tt.next[0] - stars) + '개' : '최고 등급!') + '</small></div></div>' +
    '<h3 class="kcat">🏅 배지</h3><div class="kbadges">' + bs.map(function (b) { return '<div class="kbadge' + (b[3] ? ' on' : '') + '"><span>' + b[0] + '</span><b>' + b[1] + '</b><small>' + b[2] + '</small></div>' }).join('') + '</div>' +
    '<h3 class="kcat">📅 최근 연습</h3>' + (hist.length ? '<div class="klog">' + hist.map(function (h) { return '<div><span>' + ['', '😣', '🙂', '😎'][h.feel || 2] + '</span><b>' + esc(h.name) + '</b><small>' + h.date.slice(5).replace('-', '/') + ' · ' + (h.reps ? h.reps + '회 · ' : '') + '⭐' + h.stars + '</small></div>' }).join('') + '</div>' : '<p class="knote">아직 없어요. 오늘 미션부터 시작해요!</p>') +
    '<button class="btn kexit" id="kexit">어른 모드로 바꾸기 (2초 길게 누르기)<i></i></button><div style="height:16px"></div></div>';
  var b = $('#kexit'), t = null;
  function start(e) { e.preventDefault(); b.classList.add('hold'); t = setTimeout(kidExit, 2000) }
  function stop() { b.classList.remove('hold'); clearTimeout(t) }
  b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
  b.addEventListener('contextmenu', function (e) { e.preventDefault() });
}

var KD = null;
function renderKidDrill(id) {
  var d = drill(id); if (!d) { location.hash = '#/'; return }
  var target = KID_TARGET[d.cat] || 10;
  KD = { d: d, i: 0, reps: 0, target: target, mission: kidMissions(today()).some(function (x) { return x.id === d.id }) };
  var m = S.media[d.id];
  $('#app').innerHTML = '<div class="wrap kwrap">' +
    '<div class="ktop"><button class="kback" onclick="history.length>1?history.back():location.hash=\'#/\'" aria-label="뒤로">←</button><div class="ktitle2">' + (KID_EMO[d.cat] || '🏀') + ' ' + esc(d.name) + '</div></div>' +
    '<p class="ksum">' + esc(d.summary) + '</p>' +
    (m ? '<div class="kvid" id="kvid"></div><div class="kspeed"><button data-ks="0.5">🐢 느리게</button><button data-ks="1" class="on">🐇 보통</button></div>'
       : '<div class="knovid">📺 아직 영상이 없어요. 아빠·엄마에게 영상을 넣어 달라고 해요!</div>') +
    '<h3 class="kcat">👀 따라 해 봐요</h3><div class="kstep" id="kstep"></div>' +
    '<div class="kstepbtn"><button id="kprev">◀ 이전</button><button id="knext" class="pri">다음 ▶</button></div>' +
    (d.checks && d.checks.length ? '<h3 class="kcat">✔️ 이것만 기억해요</h3><ul class="kchecks">' + d.checks.slice(0, 3).map(function (c) { return '<li>' + esc(c) + '</li>' }).join('') + '</ul>' : '') +
    '<h3 class="kcat">💪 연습하기 <small>목표 ' + target + '번</small></h3>' +
    '<div class="kcount"><div class="knum" id="knum">0</div><div class="kbar"><i id="kbar" style="width:0"></i></div>' +
    '<button class="kplus" id="kplus">+1</button><button class="kminus" id="kminus">−1</button></div>' +
    '<button class="kfinish" id="kfinish">다 했어요! ✅</button><div style="height:16px"></div></div>';
  if (m) {
    var el = $('#kvid');
    if (m.type === 'yt') { P = makeYTPlayer(el, m) }
    else vdb.get(d.id).then(function (b) { if (b && $('#kvid')) { P = makeLocalPlayer(el, b) } });
    $$('[data-ks]').forEach(function (b) { b.onclick = function () { if (P) { P.rate(+b.dataset.ks); P.rateV = +b.dataset.ks } $$('[data-ks]').forEach(function (x) { x.classList.toggle('on', x === b) }) } });
  }
  kdStep();
  $('#kprev').onclick = function () { if (KD.i > 0) { KD.i--; kdStep() } };
  $('#knext').onclick = function () { if (KD.i < d.steps.length - 1) { KD.i++; kdStep() } else $('#kplus').scrollIntoView({ behavior: 'smooth', block: 'center' }) };
  $('#kplus').onclick = function () { KD.reps++; kdCount(); if (navigator.vibrate) navigator.vibrate(20); if (KD.reps === KD.target) toast('🎉 목표 ' + KD.target + '번 달성!') };
  $('#kminus').onclick = function () { KD.reps = Math.max(0, KD.reps - 1); kdCount() };
  $('#kfinish').onclick = kidFinish;
}
function kdStep() {
  var d = KD.d, n = d.steps.length;
  $('#kstep').innerHTML = '<div class="kstepn">' + (KD.i + 1) + ' / ' + n + '</div><div class="kstept">' + esc(d.steps[KD.i]) + '</div>';
  $('#kprev').disabled = KD.i === 0;
  $('#knext').textContent = KD.i === n - 1 ? '연습하러 가기 💪' : '다음 ▶';
}
function kdCount() { $('#knum').textContent = KD.reps; $('#kbar').style.width = Math.min(100, KD.reps / KD.target * 100) + '%' }
function kidFinish() {
  var d = KD.d, again = doneToday(d.id);
  sheet('<h3 style="text-align:center;font-size:22px">어땠어요?</h3><div class="kfeel">' + ['😣 어려웠어', '🙂 괜찮았어', '😎 쉬웠어'].map(function (t, i) { return '<button data-kf="' + (i + 1) + '">' + t + '</button>' }).join('') + '</div>' +
    (again ? '<p class="note" style="text-align:center;margin:0">오늘 이미 한 연습이라 별은 안 생겨요. 그래도 최고!</p>' : ''), function (s, close) {
      $$('[data-kf]', s).forEach(function (b) {
        b.onclick = function () {
          var feel = +b.dataset.kf, stars = again ? 0 : (KD.mission ? 2 : 1), k = kidState();
          var entry = { date: today(), at: Date.now(), id: d.id, name: d.name, cat: d.cat, reps: KD.reps, feel: feel, stars: stars };
          k.hist.push(entry);
          var ms = kidMissions(today()), bonus = 0;
          if (!again && KD.mission && ms.every(function (x) { return doneToday(x.id) })) { bonus = 3; k.hist.push({ date: today(), at: Date.now() + 1, id: '_bonus', name: '오늘 미션 완료 보너스', cat: '', stars: 3, feel: 3, allDone: true }) }
          S.logs.push({ date: today(), at: Date.now(), id: d.id, name: d.name + ' (어린이 모드)', reps: KD.reps, sets: 0, min: 0, feel: feel, chk: 0, chkN: 0, memo: '' });
          save(); close();
          kidCelebrate(stars + bonus, bonus);
        };
      });
    });
}
function kidCelebrate(stars, bonus) {
  var o = document.createElement('div'); o.className = 'kparty';
  o.innerHTML = '<div><div class="kpe">' + (stars ? '🌟' : '👍') + '</div><b>' + (stars ? '⭐ +' + stars + '!' : '잘했어요!') + '</b>' + (bonus ? '<p>오늘 미션 완료! 보너스 ⭐3</p>' : '<p>정말 잘했어요!</p>') + '<button class="kfinish" id="kok">확인</button></div>';
  document.body.appendChild(o);
  $('#kok', o).onclick = function () { o.remove(); location.hash = '#/' };
}
