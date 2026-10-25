/* 내 영상 비교 화면: 기준 영상과 내 영상을 나란히/겹쳐 보고, 같은 장면에 맞춰 함께 재생.
   뼈대(MediaPipe Pose)를 켜면 팔꿈치·무릎 각도를 기준과 비교한다.
   index.html 의 공용 함수($, esc, S, save, vdb, toast, drill, confirmSheet …)를 쓴다 */
'use strict';
var MP_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
var MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
var poseP = null;
function loadPose() {
  if (poseP) return poseP;
  poseP = import(MP_BASE + '/vision_bundle.mjs').then(function (v) {
    return v.FilesetResolver.forVisionTasks(MP_BASE + '/wasm').then(function (fs) {
      function mk(dev) { return v.PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: MP_MODEL, delegate: dev }, runningMode: 'IMAGE', numPoses: 1 }) }
      return mk('GPU').catch(function () { return mk('CPU') });
    });
  }).catch(function (e) { poseP = null; throw e });
  return poseP;
}

var BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [15, 19], [16, 20]];
var ANGLES = [
  { k: 'le', name: '왼 팔꿈치', p: [11, 13, 15] }, { k: 're', name: '오른 팔꿈치', p: [12, 14, 16] },
  { k: 'ls', name: '왼 어깨', p: [23, 11, 13] }, { k: 'rs', name: '오른 어깨', p: [24, 12, 14] },
  { k: 'lk', name: '왼 무릎', p: [23, 25, 27] }, { k: 'rk', name: '오른 무릎', p: [24, 26, 28] }
];

var C = null;
function clipList(id) { return (S.mine[id] = S.mine[id] || []) }
function refKey(d) { return S.cref[d.id] ? 'cref:' + d.id : (S.media[d.id] && S.media[d.id].type === 'local' ? d.id : null) }

function stopCompare() {
  if (!C) return;
  $('#app').onclick = null;
  cancelAnimationFrame(C.raf);
  [C.ref, C.my].forEach(function (p) { if (p.v) { p.v.pause() } if (p.url) URL.revokeObjectURL(p.url) });
  C = null;
}

function paneHtml(id, label) {
  return '<div class="pane" id="' + id + '"><span class="plabel">' + label + '</span><button class="mirbtn" data-mir="' + id + '" aria-label="좌우 반전">⇋</button>' +
    '<div class="vbox"><video playsinline muted preload="auto"></video><canvas></canvas></div><div class="ph"></div></div>';
}
function renderCompare(id) {
  var d = drill(id); if (!d) { location.hash = '#/'; return }
  C = { d: d, ref: { label: '기준', color: '#3DDC97' }, my: { label: '나', color: '#FF9F43' }, offset: 0, linked: false, mode: 'stack', target: 'both', rate: 1, skel: false, pose: null, raf: 0, clip: null, lastDet: 0 };
  var clips = clipList(d.id);
  $('#app').innerHTML =
    '<div class="top"><button class="iconbtn" data-act="back" aria-label="뒤로">←</button><h1 style="font-size:17px">내 영상 비교</h1></div>' +
    '<div class="wrap"><div class="hero"><h2>' + esc(d.name) + '</h2></div>' +
    '<div class="srcs"><div class="src card"><span class="srcn">①</span><div><b>잘하는 사람 영상</b><small id="refname"></small></div><button class="btn sm" data-act="pickref">📱 고르기</button></div>' +
    '<div class="src card"><span class="srcn">②</span><div style="flex:1;min-width:0"><b>내 영상</b><select class="inp" id="myclip" style="margin-top:4px;padding:6px 8px"></select></div><button class="btn sm pri" data-act="pickmy">📹 찍기</button><button class="iconbtn" data-act="delmy" aria-label="이 영상 삭제" style="width:40px;height:40px;font-size:16px">🗑</button></div></div>' +
    '<div class="seg wide cmode" style="margin-top:10px"><button data-cm="stack" class="on">⬆⬇ 위아래</button><button data-cm="side">⬅➡ 양옆</button><button data-cm="over">🔲 겹치기</button></div>' +
    '<div class="stage stack" id="stage">' + paneHtml('pref', '잘하는 사람') + paneHtml('pmy', '내 영상') + '</div>' +
    '<div class="row ovl" id="ovl" hidden><span class="note">잘하는 사람 영상 진하기</span><input type="range" id="op" min="0" max="100" value="50" style="flex:1"></div>' +
    '<div class="cguide" id="cguide" hidden></div>' +
    '<div class="ctrl" id="cctrl">' +
      '<div class="row basic"><button class="btn" data-cj="-1">−1초</button><button class="btn pri bigpp" data-act="cpp">▶ 같이 재생</button><button class="btn" data-cj="1">+1초</button></div>' +
      '<div class="row basic"><div class="seg wide"><button data-cr="0.5">🐢 느리게</button><button data-cr="1" class="on">보통 속도</button></div></div>' +
      '<div class="row basic"><button class="btn" data-act="guide">🔗 같은 순간 맞추기</button><button class="btn" data-act="skel" id="skelbtn">🦴 뼈대 보기</button></div>' +
      '<p class="note cst" id="linkst"></p>' +
      '<button class="btn sm ghost advtgl" data-act="cadv">' + (S.ui && S.ui.cadv ? '🛠 도구 접기 ▴' : '🛠 도구 더보기 (한쪽만 움직이기·프레임·위치) ▾') + '</button>' +
      '<div class="advbox"' + (S.ui && S.ui.cadv ? '' : ' hidden') + '>' +
        '<div class="row"><span class="lbl">조작</span><div class="seg" id="tgt"><button data-tg="both" class="on">둘 다</button><button data-tg="ref">잘하는 사람만</button><button data-tg="my">내 영상만</button></div></div>' +
        '<input type="range" id="scrub" min="0" max="1000" value="0" class="scrub" aria-label="재생 위치">' +
        '<div class="row"><button class="btn sm" data-cj="-0.0333">◂ 1프레임</button><button class="btn sm" data-cj="0.0333">1프레임 ▸</button><button class="btn sm" data-cr="0.25">0.25x</button><span class="time" id="ctm"></span></div>' +
        '<div class="row"><button class="btn sm" data-act="link" id="linkbtn">🔗 지금 장면으로 바로 맞추기</button></div>' +
      '</div>' +
    '</div>' +
    '<div id="angles"></div>' +
    '<div class="tip" style="margin-top:12px"><b>이렇게 해요</b> · ① 잘하는 사람 영상 고르기 → ② 내 영상 찍기 → ③ <b>🔗 같은 순간 맞추기</b>를 누르고 안내대로 두 영상을 같은 순간에 멈추기 → <b>▶ 같이 재생</b>!</div>' +
    (d.checks && d.checks.length ? '<div class="sec"><h3>이걸 비교해 보세요</h3><div class="checks">' + d.checks.map(function (c) { return '<label><input type="checkbox"><span>' + esc(c) + '</span></label>' }).join('') + '</div></div>' : '') +
    '<div class="sec"><h3>비교 메모</h3><textarea id="cmemo" rows="3" placeholder="다른 점, 고칠 점을 적어두세요 (이 영상에 저장돼요)"></textarea></div>' +
    '<div class="sec" style="margin-bottom:24px"><h3>촬영 팁</h3><div class="mist">' +
      ['기준 영상과 <b>같은 방향</b>에서 찍기 (옆이면 옆, 정면이면 정면)', '<b>온몸</b>이 화면에 다 나오게, 발끝부터 머리 위 공까지', '휴대폰은 <b>삼각대</b>나 벤치에 세워 흔들리지 않게', '가능하면 <b>슬로모션</b>(120fps 이상)으로 찍기', '오른손잡이·왼손잡이가 다르면 ⇋ 반전으로 방향 맞추기'].map(function (t) { return '<div>' + t + '</div>' }).join('') +
    '</div></div></div>';

  C.ref.el = $('#pref'); C.my.el = $('#pmy');
  [C.ref, C.my].forEach(function (p) {
    p.v = $('video', p.el); p.cv = $('canvas', p.el); p.ph = $('.ph', p.el);
    p.v.addEventListener('loadedmetadata', function () { p.v.playbackRate = C.rate; drawPoseFor(p) });
    p.v.addEventListener('seeked', function () { if (C && C.skel) detect(p) });
  });
  wireCompare();
  fillClips();
  loadRef();
  if (clips.length) selectClip(clips[clips.length - 1].k); else loadMy(null);
  loop();
}

function setVideo(p, blob) {
  if (p.url) URL.revokeObjectURL(p.url);
  p.url = blob ? URL.createObjectURL(blob) : null;
  p.res = null; p.ang = null;
  if (blob) { p.v.src = p.url; p.v.style.display = ''; p.ph.innerHTML = ''; p.ph.hidden = true }
  else { p.v.removeAttribute('src'); p.v.load(); p.v.style.display = 'none'; p.ph.hidden = false }
  clearCanvas(p); renderAngles();
}
function loadRef() {
  var d = C.d, k = refKey(d), name = $('#refname');
  if (!k) {
    var m = mediaOf(d), yt = m && m.type === 'yt';
    setVideo(C.ref, null);
    C.ref.ph.innerHTML = '<p>' + (yt ? '유튜브 영상은 비교 화면에서 쓸 수 없어요 (프레임 이동·겹치기가 안 됨).<br>폰에 있는 기준 영상을 골라주세요.' : '비교할 기준 영상(잘하는 사람 영상)을 골라주세요.') + '</p><button class="btn sm pri" data-act="pickref">📱 기준 영상 고르기</button>';
    name.textContent = ' 없음'; return;
  }
  name.textContent = ' ' + (S.cref[d.id] ? S.cref[d.id].name : (S.media[d.id].name || '이 훈련 영상'));
  vdb.get(k).then(function (b) { if (C) setVideo(C.ref, b || null) });
}
function loadMy(clip) {
  C.clip = clip;
  var memo = $('#cmemo'); memo.value = clip ? clip.memo || '' : ''; memo.disabled = !clip;
  C.linked = false; C.offset = 0;
  if (!clip) {
    setVideo(C.my, null);
    C.my.ph.innerHTML = '<p>내가 같은 동작을 찍은 영상을 넣어주세요.<br>지금 찍어도 되고, 앨범에서 골라도 돼요.</p><button class="btn sm pri" data-act="pickmy">📹 내 영상 넣기</button>';
  } else {
    if (clip.off != null) { C.offset = clip.off; C.linked = true }
    vdb.get(clip.k).then(function (b) { if (C) setVideo(C.my, b || null); if (!b) toast('저장된 영상을 찾을 수 없어요') });
  }
  linkStatus();
}
function fillClips() {
  var sel = $('#myclip'), clips = clipList(C.d.id);
  sel.innerHTML = clips.length ? clips.slice().reverse().map(function (c) { return '<option value="' + c.k + '">' + esc(c.date + ' · ' + (c.name || '영상')) + '</option>' }).join('') : '<option value="">아직 없음</option>';
  sel.disabled = !clips.length;
  if (C.clip) sel.value = C.clip.k;
}
function selectClip(k) { var c = clipList(C.d.id).filter(function (x) { return x.k === k })[0]; fillClips(); loadMy(c || null); if (c) $('#myclip').value = k }

function pickFile(cb) {
  var i = document.createElement('input'); i.type = 'file'; i.accept = 'video/*';
  i.onchange = function () { if (i.files[0]) cb(i.files[0]) };
  i.click();
}
function wireCompare() {
  $('#app').onclick = function (e) {
    var b = e.target.closest('[data-act]'); if (!b || !C) return;
    var a = b.dataset.act, d = C.d;
    if (a === 'back') { history.length > 1 ? history.back() : location.hash = '#/d/' + encodeURIComponent(d.id) }
    else if (a === 'pickref') pickFile(function (f) {
      toast('저장 중…');
      vdb.put('cref:' + d.id, f).then(function () { S.cref[d.id] = { name: f.name }; save(); loadRef(); toast('기준 영상을 넣었어요') }).catch(function () { toast('저장하지 못했어요. 영상이 너무 클 수 있어요') });
    });
    else if (a === 'pickmy') pickFile(function (f) {
      toast('저장 중…');
      var k = 'mine:' + d.id + ':' + Date.now();
      vdb.put(k, f).then(function () {
        clipList(d.id).push({ k: k, date: today(), name: f.name.replace(/\.[^.]+$/, '').slice(0, 24), memo: '', off: null }); save();
        selectClip(k); toast('내 영상을 넣었어요');
      }).catch(function () { toast('저장하지 못했어요. 영상이 너무 클 수 있어요') });
    });
    else if (a === 'delmy') {
      if (!C.clip) return;
      var c = C.clip;
      confirmSheet('이 내 영상(' + c.date + ')을 지울까요?', function () {
        vdb.del(c.k); S.mine[d.id] = clipList(d.id).filter(function (x) { return x !== c }); save();
        var rest = clipList(d.id); fillClips(); loadMy(rest.length ? rest[rest.length - 1] : null); fillClips();
      });
    }
    else if (a === 'cpp') togglePlay();
    else if (a === 'link') setLink();
    else if (a === 'skel') toggleSkel();
    else if (a === 'guide') startGuide();
    else if (a === 'gpp') togglePlay();
    else if (a === 'gnext') guideNext();
    else if (a === 'gcancel') endGuide();
    else if (a === 'cadv') { S.ui = S.ui || {}; S.ui.cadv = !S.ui.cadv; save(); $('.advbox', $('#cctrl')).hidden = !S.ui.cadv; b.textContent = S.ui.cadv ? '🛠 도구 접기 ▴' : '🛠 도구 더보기 (한쪽만 움직이기·프레임·위치) ▾' }
  };
  $('#myclip').onchange = function () { selectClip(this.value) };
  $('#cmemo').oninput = function () { if (C.clip) { C.clip.memo = this.value; save() } };
  $$('[data-cm]').forEach(function (b) { b.onclick = function () {
    C.mode = b.dataset.cm; $$('[data-cm]').forEach(function (x) { x.classList.toggle('on', x === b) });
    $('#stage').className = 'stage ' + C.mode; $('#ovl').hidden = C.mode !== 'over'; applyOpacity();
    setTimeout(function () { drawPoseFor(C.ref); drawPoseFor(C.my) }, 50);
  } });
  $('#op').oninput = applyOpacity;
  $$('[data-mir]').forEach(function (b) { b.onclick = function () { var p = b.dataset.mir === 'pref' ? C.ref : C.my; p.mirror = !p.mirror; p.v.style.transform = p.mirror ? 'scaleX(-1)' : ''; drawPoseFor(p) } });
  $$('[data-tg]').forEach(function (b) { b.onclick = function () { C.target = b.dataset.tg; $$('[data-tg]').forEach(function (x) { x.classList.toggle('on', x === b) }) } });
  $$('[data-cr]').forEach(function (b) { b.onclick = function () { C.rate = +b.dataset.cr; [C.ref, C.my].forEach(function (p) { p.v.playbackRate = C.rate }); $$('[data-cr]').forEach(function (x) { x.classList.toggle('on', +x.dataset.cr === C.rate) }) } });
  $$('[data-cj]').forEach(function (b) { b.onclick = function () { var dt = +b.dataset.cj; if (Math.abs(dt) < 1) pauseAll(); seekBy(dt) } });
  var sc = $('#scrub');
  sc.oninput = function () {
    var p = mainPane(); if (!p || !p.v.duration) return;
    pauseAll(); var t = sc.value / 1000 * p.v.duration;
    p.v.currentTime = t; if (C.target === 'both' && C.linked && ready(C.my)) C.my.v.currentTime = clampT(C.my, t - C.offset);
  };
}
function applyOpacity() { $('.vbox', C.ref.el).style.opacity = C.mode === 'over' ? $('#op').value / 100 : 1 }
function ready(p) { return p.url && p.v.readyState >= 1 }
function clampT(p, t) { return Math.max(0, Math.min(p.v.duration || 0, t)) }
function mainPane() { return C.target === 'my' ? (ready(C.my) ? C.my : null) : (ready(C.ref) ? C.ref : ready(C.my) ? C.my : null) }
function targets() { return (C.target === 'both' ? [C.ref, C.my] : [C[C.target]]).filter(ready) }
function seekBy(dt) {
  if (C.target === 'both' && C.linked && ready(C.ref) && ready(C.my)) {
    var t = clampT(C.ref, C.ref.v.currentTime + dt); C.ref.v.currentTime = t; C.my.v.currentTime = clampT(C.my, t - C.offset);
  } else targets().forEach(function (p) { p.v.currentTime = clampT(p, p.v.currentTime + dt) });
}
function pauseAll() { [C.ref, C.my].forEach(function (p) { if (p.v) p.v.pause() }) }
function togglePlay() {
  var ts = targets(); if (!ts.length) { toast('영상을 먼저 넣어주세요'); return }
  if (ts.some(function (p) { return !p.v.paused })) { ts.forEach(function (p) { p.v.pause() }); return }
  if (C.target === 'both' && C.linked && ready(C.ref) && ready(C.my)) {
    if (C.ref.v.ended) C.ref.v.currentTime = 0;
    C.my.v.currentTime = clampT(C.my, C.ref.v.currentTime - C.offset);
    if (C.ref.v.currentTime - C.offset < 0) ts = [C.ref]; // 내 영상은 따라잡을 때 loop() 가 재생
  }
  ts.forEach(function (p) { if (p.v.ended) p.v.currentTime = 0; var r = p.v.play(); if (r && r.catch) r.catch(function () {}) });
}
function setLink() {
  if (!ready(C.ref) || !ready(C.my)) { toast('두 영상을 모두 넣어주세요'); return }
  if (C.linked && $('#linkbtn').dataset.on) { C.linked = false; if (C.clip) { C.clip.off = null; save() } linkStatus(); return }
  pauseAll();
  C.offset = C.ref.v.currentTime - C.my.v.currentTime; C.linked = true;
  if (C.clip) { C.clip.off = C.offset; save() }
  C.target = 'both'; $$('[data-tg]').forEach(function (x) { x.classList.toggle('on', x.dataset.tg === 'both') });
  linkStatus(); toast('맞췄어요! 이제 둘 다 같이 움직여요');
}
function linkStatus() {
  var b = $('#linkbtn'), st = $('#linkst'); if (!b) return;
  if (C.linked) { b.textContent = '🔗 맞춤 풀기'; b.dataset.on = '1'; b.classList.add('pri'); st.innerHTML = '✅ 두 영상이 맞춰져 있어요 — <b>▶ 같이 재생</b>을 눌러 보세요' }
  else { b.textContent = '🔗 지금 장면으로 바로 맞추기'; delete b.dataset.on; b.classList.remove('pri'); st.innerHTML = '아직 안 맞췄어요 — <b>🔗 같은 순간 맞추기</b>를 눌러요' }
}

/* 시간 표시, 스크럽, 동기화 유지, 뼈대 검출 */
function loop() {
  if (!C) return;
  var p = mainPane(), now = performance.now();
  var r = C.ref.v, m = C.my.v;
  $('#ctm').textContent = (ready(C.ref) ? '기준 ' + fmt(r.currentTime) : '') + (ready(C.my) ? '  나 ' + fmt(m.currentTime) : '');
  var sc = $('#scrub'); if (p && p.v.duration && document.activeElement !== sc) sc.value = Math.round(p.v.currentTime / p.v.duration * 1000);
  var playing = [C.ref, C.my].some(function (q) { return ready(q) && !q.v.paused });
  var pp = $('[data-act=cpp]'); if (pp) pp.textContent = playing ? '❚❚ 멈추기' : '▶ 같이 재생';
  var gp = $('[data-act=gpp]'); if (gp) gp.textContent = playing ? '❚❚' : '▶';
  var gs = $('#gscrub'), gq = C.guide ? (C.guide === 1 ? C.ref : C.my) : null;
  if (gs && gq && ready(gq) && gq.v.duration && document.activeElement !== gs) gs.value = Math.round(gq.v.currentTime / gq.v.duration * 1000);
  if (C.target === 'both' && C.linked && ready(C.ref) && ready(C.my) && !r.paused) {
    var want = r.currentTime - C.offset;
    if (want < 0) { if (!m.paused) m.pause(); if (m.currentTime > 0.05) m.currentTime = 0 }
    else if (want < m.duration) {
      if (m.paused && !m.seeking) { m.currentTime = want; var pr = m.play(); if (pr && pr.catch) pr.catch(function () {}) }
      else if (Math.abs(m.currentTime - want) > 0.15) m.currentTime = want;
    }
  }
  if (C.skel && C.pose && playing && now - C.lastDet > 70) { C.lastDet = now; [C.ref, C.my].forEach(function (q) { if (ready(q) && !q.v.paused) detect(q) }) }
  C.raf = requestAnimationFrame(loop);
}

/* ---------- 뼈대 ---------- */
function toggleSkel() {
  var b = $('#skelbtn');
  if (C.skel) { C.skel = false; b.classList.remove('pri'); [C.ref, C.my].forEach(function (p) { p.res = null; p.ang = null; clearCanvas(p) }); renderAngles(); return }
  b.textContent = '🦴 불러오는 중…'; b.disabled = true;
  loadPose().then(function (pose) {
    if (!C) return;
    C.pose = pose; C.skel = true; b.classList.add('pri'); b.textContent = '🦴 뼈대 보기'; b.disabled = false;
    [C.ref, C.my].forEach(function (p) { if (ready(p)) detect(p) });
  }).catch(function () {
    if (!C) return;
    b.textContent = '🦴 뼈대 보기'; b.disabled = false;
    toast('뼈대 인식 프로그램을 받지 못했어요. 처음 한 번은 인터넷이 필요해요');
  });
}
function detect(p) {
  if (!C || !C.pose || !ready(p) || p.v.readyState < 2) return;
  try { var r = C.pose.detect(p.v); p.res = r && r.landmarks && r.landmarks[0] || null } catch (e) { p.res = null }
  drawPoseFor(p); renderAngles();
}
function clearCanvas(p) { if (p.cv) { var c = p.cv.getContext('2d'); c.clearRect(0, 0, p.cv.width, p.cv.height) } }
/* object-fit: contain 으로 그려진 영상의 실제 위치 */
function fitRect(v, W, H) {
  var vw = v.videoWidth || W, vh = v.videoHeight || H, s = Math.min(W / vw, H / vh);
  return { x: (W - vw * s) / 2, y: (H - vh * s) / 2, w: vw * s, h: vh * s };
}
function angleAt(lm, a, b, c, ar) {
  var A = lm[a], B = lm[b], Cc = lm[c];
  if (!A || !B || !Cc || Math.min(A.visibility || 1, B.visibility || 1, Cc.visibility || 1) < 0.5) return null;
  var v1x = (A.x - B.x) * ar, v1y = A.y - B.y, v2x = (Cc.x - B.x) * ar, v2y = Cc.y - B.y;
  var d = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y); if (!d) return null;
  return Math.round(Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / d))) * 180 / Math.PI);
}
function drawPoseFor(p) {
  if (!p.cv || !p.v) return;
  var dpr = window.devicePixelRatio || 1, W = p.cv.clientWidth, H = p.cv.clientHeight;
  p.cv.width = Math.round(W * dpr); p.cv.height = Math.round(H * dpr);
  var g = p.cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  if (!C || !C.skel || !p.res) { p.ang = null; return }
  var lm = p.res, R = fitRect(p.v, W, H), ar = (p.v.videoWidth || 1) / (p.v.videoHeight || 1);
  function pt(i) { var x = R.x + lm[i].x * R.w; if (p.mirror) x = W - x; return [x, R.y + lm[i].y * R.h] }
  function vis(i) { return lm[i] && (lm[i].visibility == null || lm[i].visibility > 0.5) }
  g.lineWidth = 3; g.strokeStyle = p.color; g.lineCap = 'round';
  BONES.forEach(function (b) { if (!vis(b[0]) || !vis(b[1])) return; var a = pt(b[0]), c = pt(b[1]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.stroke() });
  g.fillStyle = '#fff';
  [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(function (i) { if (!vis(i)) return; var a = pt(i); g.beginPath(); g.arc(a[0], a[1], 3.5, 0, 7); g.fill() });
  p.ang = {};
  g.font = 'bold 13px system-ui,sans-serif'; g.textBaseline = 'middle';
  ANGLES.forEach(function (A) {
    var v = angleAt(lm, A.p[0], A.p[1], A.p[2], ar); p.ang[A.k] = v;
    if (v == null || A.k[1] === 's') return;
    var c = pt(A.p[1]), t = v + '°', w = g.measureText(t).width + 8;
    g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(c[0] + 6, c[1] - 9, w, 18);
    g.fillStyle = p.color; g.fillText(t, c[0] + 10, c[1]);
  });
}
function renderAngles() {
  var box = $('#angles'); if (!box) return;
  if (!C.skel) { box.innerHTML = ''; return }
  var a = C.ref.ang || {}, b = C.my.ang || {};
  box.innerHTML = '<div class="sec"><h3>관절 각도 비교 <small class="note">(멈춘 장면 기준)</small></h3><table class="atbl"><tr><th></th><th style="color:#1F8A5B">잘하는 사람</th><th style="color:#D9661F">나</th><th>차이</th></tr>' +
    ANGLES.map(function (A) {
      var x = a[A.k], y = b[A.k], df = x != null && y != null ? y - x : null;
      return '<tr><td>' + A.name + '</td><td>' + (x != null ? x + '°' : '–') + '</td><td>' + (y != null ? y + '°' : '–') + '</td><td class="' + (df != null && Math.abs(df) >= 15 ? 'bad' : '') + '">' + (df != null ? (df > 0 ? '+' : '') + df + '°' : '–') + '</td></tr>';
    }).join('') + '</table><p class="note">팔꿈치·무릎: 180°=쭉 폄, 90°=ㄴ자. 차이가 15° 이상이면 빨간색. 같은 순간(맞추기 후)에서 봐야 정확해요. 몸이 옆으로 돌면 각도가 실제와 다르게 나올 수 있어요.</p></div>';
}

/* ---------- 같은 순간 맞추기 안내 (2단계) ---------- */
function startGuide() {
  if (!ready(C.ref) || !ready(C.my)) { toast('두 영상을 먼저 넣어주세요'); return }
  pauseAll(); C.guide = 1; C.target = 'ref'; drawGuide();
}
function drawGuide() {
  var g = $('#cguide'), first = C.guide === 1;
  $('#cctrl').hidden = true; g.hidden = false;
  C.ref.el.classList.toggle('sel', first); C.my.el.classList.toggle('sel', !first);
  g.innerHTML = '<div class="gstep">' + C.guide + ' / 2</div>' +
    '<div class="gtxt">' + (first ? '<b>잘하는 사람 영상</b>(초록 테두리)을<br>제일 중요한 순간에 멈춰요<small>예: 공을 손에서 놓는 순간</small>' : '<b>내 영상</b>(주황 테두리)도<br>똑같은 순간에 멈춰요') + '</div>' +
    '<div class="row basic gbtns"><button class="btn" data-gj="-1">◀◀ 1초</button><button class="btn" data-gj="-0.0333">◀ 조금</button><button class="btn pri" data-act="gpp">▶</button><button class="btn" data-gj="0.0333">조금 ▶</button><button class="btn" data-gj="1">1초 ▶▶</button></div>' +
    '<input type="range" id="gscrub" min="0" max="1000" value="0" class="scrub" aria-label="영상 위치">' +
    '<div class="row basic"><button class="btn" data-act="gcancel">취소</button><button class="btn pri" data-act="gnext">' + (first ? '여기서 멈춤 · 다음 ▶' : '맞추기 완료 ✓') + '</button></div>';
  $$('[data-gj]', g).forEach(function (b) { b.onclick = function () { pauseAll(); seekBy(+b.dataset.gj) } });
  var gs = $('#gscrub', g);
  gs.oninput = function () { var p = C.guide === 1 ? C.ref : C.my; if (!p.v.duration) return; pauseAll(); p.v.currentTime = gs.value / 1000 * p.v.duration };
  (C.guide === 1 ? C.ref : C.my).el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function guideNext() {
  pauseAll();
  if (C.guide === 1) { C.guide = 2; C.target = 'my'; drawGuide(); return }
  C.offset = C.ref.v.currentTime - C.my.v.currentTime; C.linked = true;
  if (C.clip) { C.clip.off = C.offset; save() }
  endGuide(); toast('🎉 맞췄어요! ▶ 같이 재생을 눌러 보세요');
}
function endGuide() {
  C.guide = 0; C.target = 'both';
  $$('[data-tg]').forEach(function (x) { x.classList.toggle('on', x.dataset.tg === 'both') });
  $('#cguide').hidden = true; $('#cctrl').hidden = false;
  C.ref.el.classList.remove('sel'); C.my.el.classList.remove('sel');
  linkStatus();
}
