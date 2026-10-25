// 매일 GitHub Actions 가 실행: 두 코치님 채널의 최신 쇼츠를 확인해서 앱에 없는 영상을 coach3.js 에 추가한다.
// 분류 규칙은 coach2.js 를 만들 때와 같음 (제목 키워드). 처리한 영상 ID 는 .github/data/new-videos.json 에 기록.
// 영상 목록: 저장소 비밀값 YT_API_KEY 가 있으면 YouTube Data API (안정적), 없으면 채널 페이지를 읽음 (YouTube 가 막을 수 있음).
import fs from 'node:fs';

const CH = { kim: 'jaehyeoniiiii', ko: 'minki_ko' };
const CH_ID = { kim: 'UChtablVko7BqPbJVBJ8LmVw', ko: 'UCjaDUVE6ssOEsy4SXPy4WLQ' };
const KEY = process.env.YT_API_KEY;
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'Accept-Language': 'ko-KR,ko;q=0.9' };
const DATA = '.github/data/new-videos.json';

const EXCLUDE = /댓글|여러분|농구인 특|여자친구|결혼|Vlog|vlog|하이라이트|Highlight|highlight|크리스마스|작전타임|논란|파울이냐|할 수 있어\?|Can you do|몇트|국룰|공감|의띠|1대1 대결|낋여|컨텐츠|실화|역전극|공이 3개|본 콜렉터|내 발목|야외코트|땡기는|안해줄꼬야|100% 차단|농친자|빡치게|짧은 농구인|농구 못한다|어려운거 맞아요|고르시오|우리 팀 포인트|대회를 뛴다고|레전드 픽|가장 큰 이유|심장을 뛰게|짜릿한|당하자|당하기로|잔상|라면정도/;
const FOLLOW = /학년|초등|초3|초 2|U-?\d{1,2}\b|U\d{1,2}|드림팀|드립팀|선수의 1대1|허예은|그냥 따라 해 봐|^Training$|성장|어릴 때부터|손에 붙어가는|초의 |초등학교|\((G|F|C)\)$/;
const SKILL_IN_FOLLOW = /연습 방법|연습법|드릴|루틴|사용법|방법|디테일|옵션|포인트/; // 선수가 시범만 보이는 기술 설명 영상
function patternOf(t) {
  if (/픽앤롤|2대2|헷지|스위치 디펜스/.test(t)) return ['pnr'];
  if (/아웃넘버/.test(t)) return ['fb-2v1', 'fb-3v2'];
  if (/속공|트랜지션|아웃렛/.test(t)) return ['fb-3lane'];
  if (/전술|공격 움직임|공격이 안 풀리는|팀원을 활용|패스를 못 받았는데|스크린 활용/.test(t)) return ['motion'];
  return null;
}
function catOf(t) {
  if (/패스|노룩|앨리웁/.test(t)) return '패스';
  if (/피니쉬|피니시|레이업|유로스텝|플로터|홉스텝|Hopstep|블록|프로 합|마무리|골밑|빅맨을 이기는|Swing step|스윙 스텝|스텝 스루/.test(t)) return '레이업';
  if (/슛|슈팅|슈터|점퍼|포물선|스텝 ?백|Step back|풀업|미들레인지|미드레인지|고무줄|득점 왕/.test(t)) return '슈팅';
  if (/포스트|빅맨이라면|DROP STEP|드랍 스텝/.test(t)) return '포스트';
  if (/속공 수비|리바운드|박스아웃/.test(t)) return /리바운드|박스아웃/.test(t) ? '리바운드' : '수비';
  if (/드리블|크로스|레그스루|비하인드|스핀|헤지|핸들링|인 앤|드래그|트윈|쉐임갓|스내치|포켓|리듬|딜레이|푸쉬|푸시|미스디렉션|쉬미|Shimmy|볼 키핑|오프 ?핸드|체인지 디렉션|방향 전환|속도|느림|슬로우|비트윈|리프트|힙|드랍 스루|사이즈업|공을 잘 다루는|반대 손|몸을 사용|몸의 사용|몸을 잘|하든|카이리|크리스폴|커리/.test(t)) return '드리블';
  if (/스텝|잽|풋워크|돌파|스피드|브레이크|스탑|트리플|캐치|토 탭|발|무게|흔드|속이|타이밍|1대1|1v1|수비자|수비를|바디컨택|몸 싸움|압박|밀린다|오프암/.test(t)) return '풋워크';
  return '드리블';
}
function levelOf(t) {
  if (/기본|기초|농린이|쉽|어렵지 않|간단|심플|첫|시작/.test(t)) return '초급';
  if (/NBA|하든|카이리|크리스폴|커리|아이버슨|콤보|연타|고급|장인|\b[56]가지|옵션 [56]|쉐임갓|인버티드|트윈|스내치/.test(t)) return '고급';
  return '중급';
}
const clean = s => s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\u{2600}-\u{27BF}]/gu, '').replace(/#\S+/g, '').replace(/\s+/g, ' ').replace(/\s*[‼!]+$/, '').trim();

// API: 업로드 재생목록(UU…) 최근 50개 + 퍼가기 허용 여부. 반환 [{id,t,desc,date,embed}]
async function latestApi(coach) {
  const api = (p, q) => fetch('https://www.googleapis.com/youtube/v3/' + p + '?key=' + KEY + '&' + q).then(r => r.json());
  const pl = await api('playlistItems', 'part=snippet&maxResults=50&playlistId=UU' + CH_ID[coach].slice(2));
  if (pl.error) throw new Error('YouTube API: ' + pl.error.message);
  const items = pl.items.map(i => ({ id: i.snippet.resourceId.videoId, t: i.snippet.title, desc: i.snippet.description || '', date: (i.snippet.publishedAt || '').slice(0, 10) }));
  const st = await api('videos', 'part=status&id=' + items.map(i => i.id).join(','));
  const emb = {}; (st.items || []).forEach(v => emb[v.id] = v.status.embeddable);
  items.forEach(i => i.embed = emb[i.id] !== false);
  return items;
}
async function latest(handle) {
  const r = await fetch('https://www.youtube.com/@' + handle + '/shorts', { headers: UA });
  if (!r.ok) throw new Error(handle + ': YouTube 가 요청을 막음 (' + r.status + ')');
  const h = await r.text();
  const m = h.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) throw new Error(handle + ': 채널 페이지를 읽지 못함');
  const out = [];
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (o.shortsLockupViewModel) {
      const v = o.shortsLockupViewModel, id = (JSON.stringify(v.onTap || {}).match(/"videoId":"([^"]+)"/) || [])[1];
      if (id) out.push({ id, t: v.overlayMetadata?.primaryText?.content || '' });
      return;
    }
    for (const k in o) walk(o[k]);
  })(JSON.parse(m[1]));
  return out;
}
async function details(id) {
  const h = await (await fetch('https://www.youtube.com/watch?v=' + id, { headers: UA })).text();
  const m = h.match(/var ytInitialPlayerResponse = (\{.*?\});(?:var|<\/script>)/s);
  if (!m) return null; // 막혔으면 다음 날 다시 시도
  const p = JSON.parse(m[1]);
  return { title: p.videoDetails?.title, desc: p.videoDetails?.shortDescription || '', embed: p.playabilityStatus?.playableInEmbed !== false, date: (h.match(/"uploadDate":"([^"]+)"/) || [])[1] || '' };
}

const db = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : { seen: [], drills: [], follow: [], patterns: {} };
// 이미 앱에 들어 있는 영상 (coach.js / coach2.js) 은 건너뜀
const known = new Set(db.seen);
for (const f of ['coach.js', 'coach2.js']) for (const m of fs.readFileSync(f, 'utf8').matchAll(/['"]([A-Za-z0-9_-]{11})['"]/g)) known.add(m[1]);

let added = 0;
for (const [coach, handle] of Object.entries(CH)) {
  let list;
  try { list = KEY ? await latestApi(coach) : await latest(handle) } catch (e) { console.log('⚠', e.message, '— 다음에 다시 시도'); continue }
  for (const v of list) {
    if (known.has(v.id)) continue;
    const d = KEY ? { title: v.t, desc: v.desc, embed: v.embed, date: v.date } : await details(v.id);
    if (!d) { console.log('⚠ 영상 정보를 못 읽음', v.id, '— 다음에 다시 시도'); continue }
    known.add(v.id); db.seen.push(v.id);
    const t = clean(d.title || v.t);
    if (d.embed === false || EXCLUDE.test(t)) { console.log('skip', coach, v.id, t); continue }
    const tk = t.replace(/[^가-힣]/g, '');
    let desc = d.desc.split('\n').map(clean).filter(p => /[가-힣]/.test(p) && p.replace(/[^가-힣]/g, '') !== tk && p.length > 3).join(' ');
    if (desc.length > 220) desc = desc.slice(0, 217) + '…';
    const name = clean(t.split(' - ')[0].split(' / ')[0].split(' : ')[0]) || t;
    if (FOLLOW.test(t) && !SKILL_IN_FOLLOW.test(t)) { db.follow.unshift([coach, v.id, name, desc || name, d.date]); added++; console.log('follow', v.id, name); continue }
    const p = patternOf(t);
    if (p) { for (const k of p) (db.patterns[k] = db.patterns[k] || []).unshift({ yt: v.id, coach, t: name }); console.log('pattern', p, v.id, name) }
    if (p && !/패스/.test(t) && !/^fb-/.test(p[0])) { added++; continue }
    const cat = catOf(t);
    db.drills.unshift([coach, v.id, cat, levelOf(t), name, desc || name + ' — 코치님 영상을 보고 따라해 보세요.', d.date]);
    added++; console.log('drill', cat, v.id, name);
  }
}
fs.mkdirSync('.github/data', { recursive: true });
fs.writeFileSync(DATA, JSON.stringify(db, null, 1));

// coach3.js: 앱이 불러가는 파일. ST/CH 는 coach2.js 의 분류별 공통 연습 순서를 그대로 씀 (window.COACH_ST)
const js = '/* 자동 추가된 새 코치님 영상 (GitHub Actions 가 매일 갱신 — 직접 고치지 말 것) */\n(function () {\n' +
  '  if (!window.DRILLS || !window.COACH_ST) return;\n' +
  '  var have = {}; DRILLS.forEach(function (d) { if (d.yt) have[d.yt] = 1 });\n' +
  '  var D = ' + JSON.stringify(db.drills.map(r => r.slice(0, 6))) + ';\n' +
  '  var F = ' + JSON.stringify(db.follow.map(r => r.slice(0, 4))) + ';\n' +
  '  var P = ' + JSON.stringify(db.patterns) + ';\n' +
  "  D.forEach(function (r) { if (have[r[1]]) return; DRILLS.push({ id: (r[0] === 'kim' ? 'k3-' : 'm3-') + r[1], coach: r[0], yt: r[1], cat: r[2], level: r[3], name: r[4], summary: r[5], steps: COACH_ST[r[2]], checks: COACH_CH[r[2]], mistakes: [], equip: '공 1개', time: '10분', reps: '천천히 10회 → 보통 속도 10회', q: [], isNew: true }) });\n" +
  "  var b = DRILLS.filter(function (d) { return d.follow })[0];\n" +
  "  F.forEach(function (r) { if (have[r[1]] || !b) return; DRILLS.push({ id: 'f3-' + r[1], coach: r[0], yt: r[1], cat: '따라해 보기', level: '중급', name: r[2], en: 'Follow Along', summary: r[3], steps: b.steps, checks: b.checks, mistakes: b.mistakes, equip: b.equip, time: b.time, reps: b.reps, follow: true, q: [], isNew: true }) });\n" +
  "  for (var k in P) PATTERN_VIDS[k] = P[k].filter(function (v) { return !(PATTERN_VIDS[k] || []).some(function (x) { return x.yt === v.yt }) }).concat(PATTERN_VIDS[k] || []);\n" +
  '})();\n';
fs.writeFileSync('coach3.js', js);
console.log('new', added, 'total auto', db.drills.length + db.follow.length);
