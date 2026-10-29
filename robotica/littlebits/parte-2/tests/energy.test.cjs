const assert = require('node:assert/strict');
const lab = require('../data.js');
let checks = 0;
function check(value, label) { assert.ok(value,label); checks++; }
function built(n) { const s=lab.initial(n); lab.missions[n].chains.forEach((c,r)=>{s.rows[r].slots=[...c.order];s.rows[r].links.fill(true);}); return s; }
for(let n=2;n<=9;n++) {
  check(!lab.evaluate(n,lab.initial(n)).valid,'mission '+n+' rejects empty networks');
  const s=built(n);
  s.rows[0].links[0]=false; check(!lab.evaluate(n,s).valid,'mission '+n+' rejects broken links');
  s.rows[0].links[0]=true; [s.rows[0].slots[0],s.rows[0].slots[1]]=[s.rows[0].slots[1],s.rows[0].slots[0]];
  check(!lab.evaluate(n,s).valid,'mission '+n+' rejects wrong sequence');
  check(lab.palette(n).every(k=>lab.components[k]),'mission '+n+' only offers existing components');
  if(n>2)check(lab.palette(n-1).every(k=>lab.palette(n).includes(k)),'cumulative palette '+n);
}
let s=built(2);s.controls={sun:39,volume:100};check(!lab.evaluate(2,s).complete,'solar rejects insufficient generation');s.controls={sun:40,volume:59};check(!lab.evaluate(2,s).complete,'solar requires volume');s.controls.volume=60;check(lab.evaluate(2,s).complete,'solar boundary succeeds');
s=built(3);check(!lab.evaluate(3,s).complete,'closed valve blocks gas');s.controls.valve=true;check(lab.evaluate(3,s).complete,'open valve feeds stove');
s=built(4);s.controls={charge:80,fuel:39};check(!lab.evaluate(4,s).complete,'both cars must run');s.controls.fuel=40;check(lab.evaluate(4,s).complete,'both chains run');
s=built(5);check(lab.evaluate(5,s).complete,'all four networks run');s.rows[3].slots[2]='lampada';check(!lab.evaluate(5,s).complete,'fourth network must be correct');
s=built(6);s.controls.ambient=80;let e=lab.evaluate(6,s);check(!e.complete&&!e.active[0]&&e.phase==='day','day verifies lamp off');s.observed.push(e.phase);s.controls.ambient=50;check(!lab.evaluate(6,s).complete,'twilight not a demonstration');s.controls.ambient=20;check(lab.evaluate(6,s).complete&&lab.evaluate(6,s).active[0],'night after day completes');lab.invalidate(s);check(!lab.evaluate(6,s).complete,'rewiring clears day/night evidence');
s=built(7);s.controls={wind:39,demand:40};check(!lab.evaluate(7,s).complete,'insufficient wind fails');s.controls.wind=40;check(lab.evaluate(7,s).complete,'generation equal to consumption succeeds');
s=built(8);s.controls.sun=0;lab.step(8,s);check(!s.discharged&&!lab.evaluate(8,s).complete,'empty reserve cannot power night');s.controls.sun=80;for(let i=0;i<5;i++)lab.step(8,s);check(s.battery===100&&!lab.evaluate(8,s).complete,'charge capped and daylight alone insufficient');s.controls.sun=0;lab.step(8,s);check(s.battery===75&&lab.evaluate(8,s).complete,'night consumes real reserve');for(let i=0;i<4;i++)lab.step(8,s);check(s.battery===0&&!lab.evaluate(8,s).complete,'exhausted reserve fails');lab.invalidate(s);check(s.battery===0&&!s.charged&&!s.discharged,'rewiring clears energy');
s=built(9);s.controls={sun:0,wind:80,ambient:0};lab.step(9,s);check(!lab.evaluate(9,s).complete,'city cannot skip charging');s.controls={sun:80,wind:49,ambient:80};lab.step(9,s);check(s.battery===0,'hospital shortfall prevents city day');s.controls.wind=50;lab.step(9,s);check(s.battery===25&&s.observed.includes('day')&&!lab.evaluate(9,s).complete,'city day charges but is not complete');s.controls.sun=0;lab.step(9,s);check(!s.discharged,'mismatched ambient blocks city night');s.controls.ambient=0;lab.step(9,s);check(s.battery===0&&s.discharged&&lab.evaluate(9,s).complete,'city completes after supplied day and night');s.controls.wind=0;check(!lab.evaluate(9,s).complete,'city still needs hospital supply');
let data={ 'labpc-littlebits-missions-v1':'[1,2,3]' };const storage={getItem:k=>data[k],setItem:(k,v)=>data[k]=v};
for(let n=9;n>=1;n--)check(lab.saveProgress(storage,n),'save mission '+n);
check(lab.readProgress(storage).join(',')==='1,2,3,4,5,6,7,8,9','progress merges and sorts all nine');check(data['labpc-littlebits-missions-v1']==='[1,2,3]','Part 1 storage untouched');
data[lab.key]='{"completed":[1,1,9,0,10,"2",null]}';check(lab.readProgress(storage).join(',')==='1,9','invalid progress sanitized');
data[lab.key]='null';check(lab.readProgress(storage).length===0,'null progress tolerated');data[lab.key]='bad';check(lab.saveProgress(storage,2),'corrupt progress can be repaired');
const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};check(lab.readProgress(denied).length===0&&!lab.saveProgress(denied,2),'denied storage degrades gracefully');
console.log(checks+' model checks passed.');
