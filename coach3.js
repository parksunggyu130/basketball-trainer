/* 자동 추가된 새 코치님 영상 (GitHub Actions 가 매일 갱신 — 직접 고치지 말 것) */
(function () {
  if (!window.DRILLS || !window.COACH_ST) return;
  var have = {}; DRILLS.forEach(function (d) { if (d.yt) have[d.yt] = 1 });
  var D = [["kim","eS3PK6rtot0","드리블","고급","속공 상황 확실한 임팩트를 만드는 쉐임갓 무브 4가지","속공 상황 확실한 임팩트를 만드는 쉐임갓 무브 4가지 — 코치님 영상을 보고 따라해 보세요."]];
  var F = [["kim","UQ6Aco1fYqc","“자유롭게 드리블할 수 있어야 실전에서 나온다!” 청주여중 | 3학년 | 박시우","“자유롭게 드리블할 수 있어야 실전에서 나온다!” 청주여중 | 3학년 | 박시우"]];
  var P = {"fb-3lane":[{"yt":"eS3PK6rtot0","coach":"kim","t":"속공 상황 확실한 임팩트를 만드는 쉐임갓 무브 4가지"}]};
  D.forEach(function (r) { if (have[r[1]]) return; DRILLS.push({ id: (r[0] === 'kim' ? 'k3-' : 'm3-') + r[1], coach: r[0], yt: r[1], cat: r[2], level: r[3], name: r[4], summary: r[5], steps: COACH_ST[r[2]], checks: COACH_CH[r[2]], mistakes: [], equip: '공 1개', time: '10분', reps: '천천히 10회 → 보통 속도 10회', q: [], isNew: true }) });
  var b = DRILLS.filter(function (d) { return d.follow })[0];
  F.forEach(function (r) { if (have[r[1]] || !b) return; DRILLS.push({ id: 'f3-' + r[1], coach: r[0], yt: r[1], cat: '따라해 보기', level: '중급', name: r[2], en: 'Follow Along', summary: r[3], steps: b.steps, checks: b.checks, mistakes: b.mistakes, equip: b.equip, time: b.time, reps: b.reps, follow: true, q: [], isNew: true }) });
  for (var k in P) PATTERN_VIDS[k] = P[k].filter(function (v) { return !(PATTERN_VIDS[k] || []).some(function (x) { return x.yt === v.yt }) }).concat(PATTERN_VIDS[k] || []);
})();
