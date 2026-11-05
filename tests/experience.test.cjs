const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const storage = new Map();
const context = vm.createContext({ console, localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v) } });
for (const f of ['data','experience','save']) vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'), context, { filename: f+'.js' });
const run = s => vm.runInContext(s, context);
const json = s => JSON.parse(run('JSON.stringify('+s+')'));
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS '+name); }
test('existing presets migrate to Balanced without changing currencies or roster', () => {
  run(`SAVE = newSave(); SAVE.gems = 731; SAVE.exp = 819; SAVE.chars.sendo.lvl = 7; SAVE.cleared['1-1'] = true; SAVE.teams.forEach(t => delete t.plan); localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); SAVE = loadSave();`);
  assert.equal(run('SAVE.gems'),731); assert.equal(run('SAVE.exp'),819); assert.equal(run('SAVE.chars.sendo.lvl'),7);
  assert.equal(run("SAVE.cleared['1-1']"),true); assert.ok(json('SAVE.teams').every(t=>t.plan==='balanced'));
});
test('unknown and inherited plan keys are rejected', () => {
  assert.equal(run("SpoDesign.available('constructor')"),false);
  assert.equal(run("SpoDesign.plan('missing').name"),'Balanced');
  run(`SAVE.teams[0].plan = 'bad'; localStorage.setItem(SAVE_KEY,JSON.stringify(SAVE)); SAVE = loadSave();`);
  assert.equal(run('SAVE.teams[0].plan'),'balanced');
});
test('tactics unlock only after their story milestones', () => {
  run('SAVE = newSave()');
  assert.equal(run("SpoDesign.available('rush')"),false);
  run("SAVE.cleared['1-2'] = true");
  assert.equal(run("SpoDesign.available('rush')"),true);
  assert.equal(run("SpoDesign.available('shelter')"),false);
});
test('Ranked, tutorial and Bracket Run use their own rules', () => {
  for (const k of ['raid','tutorial','run']) assert.equal(run(`SpoDesign.allowedFor({${k}:true})`),false);
  assert.equal(run('SpoDesign.allowedFor({})'),true);
});
test('training quote deduplicates members and uses each exact level cost', () => {
  run('SAVE = newSave()');
  const q=json("SpoDesign.trainingQuote(['sendo','sendo','tsuna',null,'missing'],3)");
  assert.equal(q.rows.length,2); assert.equal(q.cost,600);
  assert.deepEqual(q.rows.map(r=>r.cost),[300,300]);
});
test('insufficient funds cause no partial purchase or save mutation', () => {
  run('SAVE.exp = 599'); const before=json('SAVE');
  assert.equal(run("SpoDesign.train(['sendo','tsuna'],3)"),false);
  assert.deepEqual(json('SAVE'),before);
});
test('confirmed training charges once and never downgrades members', () => {
  run('SAVE.exp = 1000');
  assert.ok(run("SpoDesign.train(['sendo','tsuna'],3)"));
  assert.equal(run('SAVE.exp'),400); assert.equal(run('SAVE.chars.tsuna.lvl'),3);
  assert.equal(run("SpoDesign.train(['sendo','tsuna'],3)"),false);
  assert.equal(run('SAVE.exp'),400);
  assert.equal(run("SpoDesign.trainingQuote(['sendo'],1).rows[0].to"),3);
});
test('training target clamps to legal levels', () => {
  assert.equal(run("SpoDesign.trainingQuote(['sendo'],999).target"),30);
  assert.equal(run("SpoDesign.trainingQuote(['sendo'],-1).target"),1);
  assert.equal(run("SpoDesign.trainingQuote(['sendo'],NaN).target"),1);
});
vm.runInContext(fs.readFileSync(path.join(root,'js/action.js'),'utf8'), context, { filename: 'action.js' });
test('reading the closing dialogue cannot inflate combat time', () => {
  run(`globalThis.timerBattle = { time: 35, t0: 5, routeTime: 3, headless: true, over: false, waveClear: false, waveIdx: 1, foes: [], stage: {waves:[[],[]]}, finish(win) { this.over = true; this.endTime = this.time; this.won = win; } }; ActionBattle.prototype.checkWave.call(timerBattle);`);
  assert.equal(run('timerBattle.combatEnd'),35);
  assert.equal(run('ActionBattle.prototype.fightTime.call(timerBattle)'),27);
  run('timerBattle.time = 400; timerBattle.endTime = 400');
  assert.equal(run('ActionBattle.prototype.fightTime.call(timerBattle)'),27);
});
test('travelling is excluded while combat resumes normally', () => {
  assert.equal(run('ActionBattle.prototype.fightTime.call({time:50,t0:5,routeTime:10,over:false})'),35);
  assert.equal(run('ActionBattle.prototype.fightTime.call({time:55,t0:5,routeTime:10,over:false})'),40);
});
test('a defeat still uses the time of defeat', () => {
  assert.equal(run('ActionBattle.prototype.fightTime.call({time:100,endTime:42,t0:5,routeTime:2,over:true})'),35);
});
test('stat previews do not spend tokens or change owned levels', () => {
  run('SAVE = newSave()');
  const before=json('SAVE');
  const stats=json("charStats('sendo',3)");
  assert.equal(stats.lvl,3);
  assert.ok(stats.hp>run("charStats('sendo').hp"));
  assert.ok(stats.atk>run("charStats('sendo').atk"));
  assert.deepEqual(json('SAVE'),before);
});


// Navigation is independent of rendering, so test the actual height/path projection rules.
vm.runInContext(fs.readFileSync(path.join(root,'js','expedition.js'),'utf8'), context, { filename: 'expedition.js' });
test('between-floor route has a continuous height along its stair flight', () => {
  const q = json('SpoExpedition.project(-9,-33,{})');
  assert.equal(q.x,-9); assert.equal(q.z,-33); assert.ok(Math.abs(q.y-.8)<.0001); assert.equal(q.distance,0);
});
test('route projection returns a finite nearest edge for a point off the deck', () => {
  const q = json('SpoExpedition.project(-35,-29,{})');
  assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.z)&&Number.isFinite(q.y));
  assert.ok(q.distance>20); assert.ok(q.index>=0&&q.index<8);
});

test('manual movement remains screen-relative as the camera rotates', () => {
  const q = json('ActionBattle.prototype.moveInput.call({keys:{w:true},stick:{on:false},cam:{yaw:Math.PI/2}})');
  assert.ok(Math.abs(q.x + 1)<.00001); assert.ok(Math.abs(q.z)<.00001);
  const diagonal = json('ActionBattle.prototype.moveInput.call({keys:{w:true,d:true},stick:{on:false},cam:{yaw:-.28}})');
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<.00001);
});
test('floor preparation advances only the excluded travel clock', () => {
  const q = json('(()=>{const b={phase:"floor-loading",time:50,events:[],routeTime:5};ActionBattle.prototype.step.call(b,3);return b;})()');
  assert.equal(q.time,53); assert.equal(q.routeTime,8);
  assert.equal(run('ActionBattle.prototype.fightTime.call({time:53,t0:0,routeTime:8,over:false})'),45);
});
console.log(`${checks} total checks passed.`);
