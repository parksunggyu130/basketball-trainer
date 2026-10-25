/* 내가 추가한 코치님 (폰마다 따로 저장): S.coaches [{id,name,yt,ig,at}], S.cvids { 코치id: [{v:유튜브ID | ig:인스타코드, t:제목, cat, lv}] }
   안드로이드 앱: 유튜브 채널의 영상 목록을 폰에서 직접 읽어 자동으로 넣음 (CapacitorHttp, 하루에 한 번 새로고침)
   아이폰·웹: 브라우저 보안 때문에 채널 목록은 못 읽음 → 영상 링크를 하나씩 붙여넣기 (제목은 YouTube oEmbed 로 자동)
   index.html 의 공용 함수($, esc, S, save, sheet, toast, plugin, isNative …)를 쓴다 */
'use strict';
var UC_SKIP = /댓글|여러분|구독|브이로그|Vlog|vlog|하이라이트|Highlight|라이브|LIVE|Live/;
function ucCat(t) {
  if (/패스|노룩|앨리웁|pass/i.test(t)) return '패스';
  if (/피니쉬|피니시|레이업|유로스텝|플로터|홉스텝|블록|프로 ?합|골밑|finish|layup|floater/i.test(t)) return '레이업';
  if (/슛|슈팅|슈터|점퍼|스텝 ?백|풀업|미들레인지|미드레인지|shoot|shot|jumper/i.test(t)) return '슈팅';
  if (/포스트|빅맨|드랍 스텝|post/i.test(t)) return '포스트';
  if (/리바운드|박스아웃|rebound/i.test(t)) return '리바운드';
  if (/수비|디펜스|defen/i.test(t) && !/수비를|수비자|수비가/.test(t)) return '수비';
  if (/학년|초등|U-?\d{1,2}\b|선수 소개|스킬 ?트레이닝|skill training/i.test(t)) return '따라해 보기';
  if (/스텝|잽|풋워크|돌파|스피드|스탑|트리플|jab|step|footwork/i.test(t) && !/드리블|크로스|레그스루|비하인드|스핀|헤지/.test(t)) return '풋워크';
  return '드리블';
}
function ucLevel(t) { return /기본|기초|쉽|간단|심플|입문|처음/.test(t) ? '초급' : /고급|NBA|콤보/.test(t) ? '고급' : '중급' }
function ucClean(s) { return String(s || '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\u{2600}-\u{27BF}]/gu, '').replace(/#\S+/g, '').replace(/\s+/g, ' ').trim() }
/* '@이름', 채널 주소, youtu.be 아님 → 채널 주소로 */
function ucYT(s) {
  s = String(s || '').trim(); if (!s) return '';
  var m = s.match(/youtube\.com\/((?:@[^/?#\s]+)|(?:channel\/[\w-]+)|(?:c\/[^/?#\s]+)|(?:user\/[^/?#\s]+))/i);
  if (m) return 'https://www.youtube.com/' + decodeURIComponent(m[1]);
  if (/^@?[\w.\-가-힣]+$/.test(s)) return 'https://www.youtube.com/@' + s.replace(/^@/, '');
  return null;
}
function ucIG(s) {
  s = String(s || '').trim(); if (!s) return '';
  var m = s.match(/instagram\.com\/([\w.]+)/i);
  if (m && !/^(p|reel|reels|tv)$/i.test(m[1])) return 'https://www.instagram.com/' + m[1];
  if (/^@?[\w.]+$/.test(s)) return 'https://www.instagram.com/' + s.replace(/^@/, '');
  return null;
}
function ucIGCode(s) { var m = String(s || '').match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reel|reels|tv)\/([\w-]+)/i); return m ? m[1] : null }

/* 내 코치님과 영상을 COACHES / DRILLS 에 합친다 (바꿀 때마다 다시 부름) */
function ucApply() {
  for (var k in COACHES) if (COACHES[k].user) delete COACHES[k];
  window.DRILLS = DRILLS.filter(function (d) { return !d.ucoach });
  var have = {}; DRILLS.forEach(function (d) { if (d.yt) have[d.yt] = 1 });
  var fb = DRILLS.filter(function (d) { return d.follow })[0];
  (S.coaches || []).forEach(function (c) {
    var key = 'u' + c.id;
    COACHES[key] = { name: c.name, full: c.name + ' 코치', yt: c.yt || '', ig: c.ig || '', user: true };
    (S.cvids[c.id] || []).forEach(function (v) {
      if (v.v && have[v.v]) return;
      var cat = v.cat || '드리블', fol = cat === '따라해 보기';
      DRILLS.push({ id: key + '-' + (v.v || 'ig-' + v.ig), coach: key, ucoach: c.id, yt: v.v || undefined, ig: v.ig || undefined, cat: cat, level: v.lv || '중급', name: v.t || '영상', en: '',
        summary: (v.t || '영상') + ' — ' + c.name + ' 코치님 영상을 보고 따라해 보세요.',
        steps: fol && fb ? fb.steps : (COACH_ST[cat] || COACH_ST['드리블']), checks: fol && fb ? fb.checks : (COACH_CH[cat] || COACH_CH['드리블']), mistakes: [], follow: fol || undefined,
        equip: '공 1개', time: '10분', reps: '천천히 10회 → 보통 속도 10회', q: [] });
    });
  });
  if (typeof demoFix === 'function') demoFix();
}

/* 안드로이드 앱: 채널 페이지(쇼츠·동영상 탭)를 폰에서 직접 읽어 영상 목록을 가져온다 */
function ucNativeGet(url) {
  var h = plugin('CapacitorHttp');
  if (!h) return Promise.reject(new Error('web'));
  return h.call('get', { url: url, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'Accept-Language': 'ko-KR,ko;q=0.9' }, responseType: 'text' })
    .then(function (r) { if (r.status >= 400) throw new Error('HTTP ' + r.status); return typeof r.data === 'string' ? r.data : JSON.stringify(r.data) });
}
function ucParse(html) {
  var m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/); if (!m) return [];
  var out = [];
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (o.shortsLockupViewModel) { var s = o.shortsLockupViewModel, id = (JSON.stringify(s.onTap || {}).match(/"videoId":"([\w-]{11})"/) || [])[1]; if (id) out.push({ v: id, t: s.overlayMetadata && s.overlayMetadata.primaryText && s.overlayMetadata.primaryText.content || '' }); return }
    if (o.videoRenderer) { var v = o.videoRenderer; out.push({ v: v.videoId, t: (v.title && v.title.runs || []).map(function (r) { return r.text }).join('') }); return }
    if (o.lockupViewModel && o.lockupViewModel.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') { var l = o.lockupViewModel; out.push({ v: l.contentId, t: l.metadata && l.metadata.lockupMetadataViewModel && l.metadata.lockupMetadataViewModel.title && l.metadata.lockupMetadataViewModel.title.content || '' }); return }
    for (var k in o) walk(o[k]);
  })(JSON.parse(m[1]));
  return out;
}
function ucFetch(c) {
  if (!c.yt) return Promise.reject(new Error('유튜브 채널이 없어요'));
  return Promise.all(['/shorts', '/videos'].map(function (tab) { return ucNativeGet(c.yt + tab).then(ucParse).catch(function (e) { if (e.message === 'web') throw e; return [] }) }))
    .then(function (rs) {
      var list = S.cvids[c.id] = S.cvids[c.id] || [], seen = {}, n = 0;
      list.forEach(function (v) { if (v.v) seen[v.v] = 1 });
      (c.skip || []).forEach(function (id) { seen[id] = 1 });
      rs[0].concat(rs[1]).forEach(function (x) {
        if (!x.v || seen[x.v]) return; seen[x.v] = 1;
        var t = ucClean(x.t); if (UC_SKIP.test(t)) return;
        list.unshift({ v: x.v, t: t, cat: ucCat(t), lv: ucLevel(t) }); n++;
      });
      c.at = Date.now(); save(); ucApply();
      if (!rs[0].length && !rs[1].length) throw new Error('채널에서 영상을 찾지 못했어요. 채널 주소를 확인해 주세요');
      return n;
    });
}
/* 앱을 열 때 하루에 한 번 내 코치님 채널 새 영상 확인 (안드로이드 앱만) */
function ucAutoRefresh() {
  if (!isNative) return;
  var due = (S.coaches || []).filter(function (c) { return c.yt && Date.now() - (c.at || 0) > 864e5 });
  if (!due.length) return;
  due.reduce(function (p, c) { return p.then(function () { return ucFetch(c).catch(function () {}) }) }, Promise.resolve())
    .then(function () { var h = location.hash.replace(/^#/, '') || '/'; if (h === '/' || h === '/mc') route() });
}

/* ---------- 화면: 코치님 관리 (#/mc) ---------- */
function renderMyCoaches() {
  var all = allDrills(), cnt = function (k) { return all.filter(function (d) { return d.coach === k }).length };
  $('#app').innerHTML =
    '<div class="top"><button class="iconbtn" data-act="back" aria-label="뒤로">←</button><h1 style="font-size:19px">코치님 관리</h1><button class="iconbtn" data-act="ucadd" aria-label="코치님 추가">＋</button></div><div class="wrap">' +
    '<p class="note" style="margin-top:0">좋아하는 코치님의 <b>유튜브 채널</b>과 <b>인스타 계정</b>을 넣으면 그 코치님 영상으로 훈련할 수 있어요. 이 폰에만 저장돼요.' +
    (isNative ? ' 유튜브 채널 영상은 <b>자동으로 불러와요</b> (하루에 한 번 새 영상 확인).' : ' 아이폰·웹에서는 채널 영상을 자동으로 못 불러와서, 영상 <b>링크를 하나씩</b> 넣어 주세요. (안드로이드 앱은 자동)') + '</p>' +
    '<button class="btn pri" data-act="ucadd" style="width:100%;padding:14px">＋ 코치님 추가하기</button>' +
    '<div class="sec"><h3>내가 추가한 코치님</h3>' + ((S.coaches || []).length ? '<div class="coaches">' + S.coaches.map(function (c) {
      var k = 'u' + c.id;
      return '<div class="card coachcard"><button class="cc-main" data-ucview="' + k + '"><b>🎬 ' + esc(c.name) + ' 코치</b><small>' + cnt(k) + '개 영상 훈련 보기 ›</small></button>' +
        '<div class="cc-links">' + (c.yt ? '<button class="btn sm" data-ext="' + esc(c.yt) + '">▶ 유튜브</button>' : '') + (c.ig ? '<button class="btn sm" data-ext="' + esc(c.ig) + '">📷 인스타</button>' : '') + '</div>' +
        '<div class="cc-links" style="flex-wrap:wrap">' + (c.yt && isNative ? '<button class="btn sm pri" data-ucfetch="' + c.id + '">🔄 유튜브 영상 불러오기</button>' : '') +
        '<button class="btn sm" data-uclink="' + c.id + '">＋ 영상 링크 넣기</button><button class="btn sm ghost" data-ucedit="' + c.id + '">✎ 고치기</button></div>' +
        (c.at ? '<small class="note" style="margin:0">마지막으로 불러온 때: ' + new Date(c.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + '</small>' : '') + '</div>';
    }).join('') + '</div>' : '<p class="note" style="margin:0">아직 없어요. 위의 <b>＋ 코치님 추가하기</b>를 눌러 보세요.</p>') + '</div>' +
    '<div class="sec" style="margin-bottom:24px"><h3>기본 코치님</h3><div class="coaches">' + Object.keys(COACHES).filter(function (k) { return !COACHES[k].user }).map(function (k) {
      var c = COACHES[k]; return '<div class="card coachcard"><button class="cc-main" data-ucview="' + k + '"><b>🎬 ' + esc(c.full) + '</b><small>' + cnt(k) + '개 영상 훈련 보기 ›</small></button><div class="cc-links"><button class="btn sm" data-ext="' + esc(c.yt) + '">▶ 유튜브</button><button class="btn sm" data-ext="' + esc(c.ig) + '">📷 인스타</button></div><small class="note" style="margin:0">새 영상은 매일 자동으로 추가돼요</small></div>';
    }).join('') + '</div></div></div>';
  var on = function (a, f) { $$('[data-act=' + a + ']').forEach(function (b) { b.onclick = f }) };
  on('back', function () { history.length > 1 ? history.back() : location.hash = '#/' });
  on('ucadd', function () { ucEditSheet(null) });
  $$('[data-ext]').forEach(function (b) { b.onclick = function () { openExternal(b.dataset.ext) } });
  $$('[data-ucview]').forEach(function (b) { b.onclick = function () { view.cat = '전체'; view.lv = '전체'; view.coach = b.dataset.ucview; location.hash = '#/' } });
  $$('[data-ucedit]').forEach(function (b) { b.onclick = function () { ucEditSheet(ucById(b.dataset.ucedit)) } });
  $$('[data-uclink]').forEach(function (b) { b.onclick = function () { ucLinkSheet(ucById(b.dataset.uclink)) } });
  $$('[data-ucfetch]').forEach(function (b) { b.onclick = function () { ucFetchUI(ucById(b.dataset.ucfetch), b) } });
}
function ucById(id) { return (S.coaches || []).filter(function (c) { return c.id === id })[0] }
function ucFetchUI(c, btn) {
  if (btn) { btn.disabled = true; btn.textContent = '불러오는 중…' }
  ucFetch(c).then(function (n) { toast(n ? '새 영상 ' + n + '개를 넣었어요' : '새 영상이 없어요'); renderMyCoaches() })
    .catch(function (e) { toast(e.message === 'web' ? '안드로이드 앱에서만 자동으로 불러와요. 영상 링크를 넣어 주세요' : e.message || '불러오지 못했어요'); renderMyCoaches() });
}
function ucEditSheet(c) {
  sheet('<h3>' + (c ? '코치님 고치기' : '코치님 추가') + '</h3>' +
    '<label class="field"><span>코치님 이름</span><input class="inp" id="ucn" placeholder="예: 홍길동" value="' + esc(c ? c.name : '') + '"></label>' +
    '<label class="field"><span>유튜브 채널 (주소나 @아이디)</span><input class="inp" id="ucy" placeholder="예: https://youtube.com/@아이디" value="' + esc(c ? c.yt : '') + '"></label>' +
    '<label class="field"><span>인스타그램 계정 (주소나 @아이디, 선택)</span><input class="inp" id="uci" placeholder="예: https://www.instagram.com/아이디" value="' + esc(c ? c.ig : '') + '"></label>' +
    '<p class="note" style="margin:0">유튜브 앱에서 코치님 채널 → <b>공유 → 링크 복사</b> 한 것을 붙여넣으면 돼요.</p>' +
    '<div class="btns"><button class="btn pri" id="ok" style="flex:1">저장</button>' + (c ? '<button class="btn" id="del" style="color:var(--bad)">삭제</button>' : '') + '<button class="btn" id="no">취소</button></div>', function (s, close) {
      $('#no', s).onclick = close;
      $('#ok', s).onclick = function () {
        var name = $('#ucn', s).value.trim(), yt = ucYT($('#ucy', s).value), ig = ucIG($('#uci', s).value);
        if (!name) { toast('코치님 이름을 써 주세요'); return }
        if (yt === null) { toast('유튜브 채널 주소를 확인해 주세요 (영상 주소 말고 채널 주소)'); return }
        if (ig === null) { toast('인스타 계정 주소를 확인해 주세요'); return }
        var isNew = !c, o = c || { id: Date.now().toString(36) };
        if (o.yt !== yt) o.at = 0;
        o.name = name; o.yt = yt; o.ig = ig;
        if (isNew) S.coaches.push(o);
        save(); ucApply(); close(); renderMyCoaches();
        if (yt && isNative && (isNew || !o.at)) ucFetchUI(o, null);
        else toast(isNew ? '코치님을 추가했어요. ＋ 영상 링크 넣기로 영상을 넣어 보세요' : '저장했어요');
      };
      var del = $('#del', s); if (del) del.onclick = function () {
        close(); confirmSheet('"' + c.name + '" 코치님과 영상 목록을 지울까요?', function () {
          S.coaches = S.coaches.filter(function (x) { return x !== c }); delete S.cvids[c.id];
          if (view.coach === 'u' + c.id) view.coach = '전체';
          save(); ucApply(); renderMyCoaches();
        });
      };
    });
}
/* 영상 링크 하나 넣기: 유튜브(앱 안에서 재생) 또는 인스타 릴스/게시물 */
function ucLinkSheet(c) {
  var cats = CATS.slice();
  sheet('<h3>' + esc(c.name) + ' 코치님 영상 넣기</h3>' +
    '<label class="field"><span>영상 링크 (유튜브 또는 인스타)</span><input class="inp" id="ul" placeholder="https://youtube.com/shorts/... 또는 https://www.instagram.com/reel/..."></label>' +
    '<label class="field"><span>제목</span><input class="inp" id="ut" placeholder="링크를 넣으면 유튜브 제목이 자동으로 들어가요"></label>' +
    '<label class="field"><span>분류</span><select class="inp" id="uc">' + cats.map(function (x) { return '<option>' + esc(x) + '</option>' }).join('') + '</select></label>' +
    '<p class="note" style="margin:0">유튜브·인스타 앱에서 영상 → <b>공유 → 링크 복사</b> 후 붙여넣으세요. 코치님이 직접 시범한 영상은 기술 분류에, 선수가 한 영상은 <b>따라해 보기</b>에 넣어요.</p>' +
    '<div class="btns"><button class="btn pri" id="ok" style="flex:1">넣기</button><button class="btn" id="no">취소</button></div>', function (s, close) {
      var li = $('#ul', s), ti = $('#ut', s), ci = $('#uc', s), touched = false;
      ci.value = '드리블'; ci.onchange = function () { touched = true };
      li.oninput = function () {
        var p = parseYT(li.value);
        if (p) fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + p.id)).then(function (r) { return r.json() }).then(function (j) {
          var t = ucClean(j.title); if (!ti.value) ti.value = t; if (!touched) ci.value = ucCat(t);
        }).catch(function () {});
      };
      $('#no', s).onclick = close;
      $('#ok', s).onclick = function () {
        var p = parseYT(li.value), ig = p ? null : ucIGCode(li.value), list = S.cvids[c.id] = S.cvids[c.id] || [];
        if (!p && !ig) { toast('유튜브나 인스타 영상 링크를 확인해 주세요'); return }
        if (list.some(function (v) { return p ? v.v === p.id : v.ig === ig })) { toast('이미 넣은 영상이에요'); return }
        var t = ti.value.trim() || (p ? '유튜브 영상' : '인스타 영상');
        list.unshift(p ? { v: p.id, t: t, cat: ci.value, lv: ucLevel(t) } : { ig: ig, t: t, cat: ci.value, lv: ucLevel(t) });
        save(); ucApply(); close(); renderMyCoaches(); toast('넣었어요 (' + ci.value + ')');
      };
      setTimeout(function () { li.focus() }, 50);
    });
}
/* 내 코치님 영상 훈련에서 빼기 (자동으로 다시 들어오지 않게 기록) */
function ucRemoveVideo(d) {
  var c = ucById(d.ucoach); if (!c) return;
  S.cvids[c.id] = (S.cvids[c.id] || []).filter(function (v) { return d.yt ? v.v !== d.yt : v.ig !== d.ig });
  if (d.yt) (c.skip = c.skip || []).push(d.yt);
  save(); ucApply();
}
