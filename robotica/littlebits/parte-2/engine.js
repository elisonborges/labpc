/* Interactions shared only by Part 2 missions 2–9. No network requests. */
(() => {
  'use strict';
  const lab = globalThis.EnergyLab;
  const n = Number(document.body.dataset.mission), mission = lab.missions[n];
  const $ = id => document.getElementById(id);
  let state = lab.initial(n), selected = null, drag = null, suppressClick = false;
  let audio = null, oscillator = null, gain = null;
  function message(text, type = '') { $('status').textContent = text; $('status').className = 'top-status ' + type; }
  function stopSound() { if (gain) gain.gain.value = 0; }
  function sound() {
    if (n !== 2) return;
    try {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      if (!audio) { audio = new Audio(); oscillator = audio.createOscillator(); gain = audio.createGain(); gain.gain.value = 0; oscillator.frequency.value = 330; oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); }
      audio.resume().catch(() => {});
      gain.gain.value = state.controls.sun >= 40 ? state.controls.volume / 100 * 0.035 : 0;
    } catch { /* Visual simulation remains available if audio is blocked. */ }
  }
  function progress() {
    const completed = lab.readProgress(localStorageSafe);
    document.querySelectorAll('[data-n]').forEach(el => el.classList.toggle('done', completed.includes(Number(el.dataset.n))));
    $('next').hidden = !completed.includes(n);
  }
  // Obtaining localStorage itself can throw on restricted file origins.
  const localStorageSafe = { getItem(k) { return globalThis.localStorage.getItem(k); }, setItem(k,v) { globalThis.localStorage.setItem(k,v); } };
  function off() {
    stopSound();
    document.querySelectorAll('.network').forEach(el => el.classList.remove('powered'));
    document.querySelectorAll('.effect').forEach(el => el.classList.remove('active'));
    mission.chains.forEach((c,r) => $('effectText'+r).textContent = 'Aguardando teste');
  }
  function effects(active) {
    off();
    active.forEach((on,r) => {
      $('network'+r).classList.toggle('powered', on);
      $('effect'+r).classList.toggle('active', on);
      $('effectText'+r).textContent = on ? mission.chains[r].active : n === 6 || (n === 9 && r === 2) ? 'Poste apagado' : 'Sem energia';
    });
    if (n === 2 && active[0]) sound();
  }
  function art(kind) {
    const c = lab.components[kind];
    return '<svg viewBox="0 0 110 58" aria-hidden="true"><rect x="5" y="10" width="100" height="39" rx="6" fill="'+c[3]+'" stroke="#244a62"/><rect x="0" y="21" width="10" height="17" rx="2" fill="#cbd8e1" stroke="#637a8a"/><rect x="100" y="21" width="10" height="17" rx="2" fill="#cbd8e1" stroke="#637a8a"/><rect x="33" y="13" width="44" height="32" rx="6" fill="#e6eef5" stroke="#51718b"/><text x="55" y="36" font-size="21" text-anchor="middle">'+c[2]+'</text></svg>';
  }
  const palette = lab.palette(n);
  $('pieces').innerHTML = palette.map(kind => { const c = lab.components[kind]; return '<button type="button" class="piece" draggable="true" data-kind="'+kind+'" aria-pressed="false" style="--accent:'+c[3]+'"><small>'+c[1]+'</small>'+art(kind)+'<b>'+c[0]+'</b></button>'; }).join('');
  $('networks').innerHTML = mission.chains.map((c,r) => '<section class="network" id="network'+r+'" aria-label="'+c.name+'"><div class="chain"><h4>'+c.name+'</h4><div class="slots">'+c.order.map((_,i) => (i ? '<button type="button" class="join" data-row="'+r+'" data-link="'+(i-1)+'" aria-pressed="false"></button>' : '') + '<button type="button" class="slot" data-row="'+r+'" data-slot="'+i+'"></button>').join('')+'</div></div><div class="effect" id="effect'+r+'"><div class="effect-icon" aria-hidden="true">'+c.icon+'</div><strong id="effectText'+r+'">Aguardando teste</strong></div></section>').join('');
  mission.chains.forEach((c,r) => {
    const last = c.order[c.order.length-1];
    if (last === 'motor') $('effect'+r).classList.add('motor');
    if (last === 'eletrico' || last === 'combustao') $('effect'+r).classList.add('vehicle');
  });
  const pieces = [...document.querySelectorAll('[data-kind]')], slots = [...document.querySelectorAll('[data-slot]')], links = [...document.querySelectorAll('[data-link]')];
  function draw() {
    pieces.forEach(el => el.setAttribute('aria-pressed', String(selected?.row === null && selected.kind === el.dataset.kind)));
    slots.forEach(el => {
      const r = Number(el.dataset.row), i = Number(el.dataset.slot), kind = state.rows[r].slots[i];
      el.className = 'slot' + (kind ? ' filled' : '') + (selected?.row === r && selected.index === i ? ' selected' : '');
      el.draggable = !!kind;
      el.innerHTML = kind ? art(kind)+'<small>'+lab.components[kind][0]+'</small>' : '<span>＋</span><small>Espaço '+(i+1)+'</small>';
      el.setAttribute('aria-label', mission.chains[r].name+', espaço '+(i+1)+': '+(kind ? lab.components[kind][0] : 'vazio'));
      el.setAttribute('aria-pressed', String(selected?.row === r && selected.index === i));
    });
    links.forEach(el => { const r = Number(el.dataset.row), i = Number(el.dataset.link), on = state.rows[r].links[i]; el.textContent = on ? '◆' : '◇'; el.classList.toggle('connected', on); el.setAttribute('aria-pressed', String(on)); el.setAttribute('aria-label', (on ? 'Desconectar' : 'Conectar')+' '+mission.chains[r].name+', espaços '+(i+1)+' e '+(i+2)); });
    if ($('reserve')) { $('reserve').value = state.battery; $('reserveValue').textContent = state.battery+'/100'; }
    if ($('observed')) $('observed').textContent = 'Verificado: ' + (state.observed.length ? state.observed.map(p => p === 'day' ? 'dia' : 'noite').join(' e ') : 'nenhuma etapa');
  }
  function choose(kind, row = null, index = null) {
    selected = { kind, row, index }; draw();
    $('componentInfo').textContent = lab.components[kind][0]+': '+lab.components[kind][4];
    message('Selecionado: '+lab.components[kind][0]+'. Clique em um espaço para colocar ou mover.');
  }
  function changed() { lab.invalidate(state); off(); selected = null; draw(); }
  function unlink(r,i) { if (i > 0) state.rows[r].links[i-1] = false; if (i < state.rows[r].links.length) state.rows[r].links[i] = false; }
  function put(item, r, i) {
    if (!item || !palette.includes(item.kind) || !state.rows[r] || i < 0 || i >= state.rows[r].slots.length) return;
    if (item.row !== null && state.rows[item.row]?.slots[item.index] !== item.kind) return;
    if (item.row === r && item.index === i) { selected = null; draw(); return; }
    if (item.row !== null) { state.rows[item.row].slots[item.index] = state.rows[r].slots[i]; unlink(item.row,item.index); }
    state.rows[r].slots[i] = item.kind; unlink(r,i); changed();
    message('Peça encaixada. Conecte os elos ao redor dela. Mudanças na montagem reiniciam as etapas desta tentativa.');
  }
  pieces.forEach(el => el.addEventListener('click', () => { if (!suppressClick) choose(el.dataset.kind); }));
  slots.forEach(el => {
    const r = Number(el.dataset.row), i = Number(el.dataset.slot);
    el.addEventListener('click', () => { if (suppressClick) return; if (selected) put(selected,r,i); else if (state.rows[r].slots[i]) choose(state.rows[r].slots[i],r,i); else message('Escolha uma peça primeiro.','bad'); });
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); });
    el.addEventListener('dragleave', () => el.classList.remove('over'));
    el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('over'); if (drag) put(drag,r,i); drag = null; });
  });
  [...pieces,...slots].forEach(el => {
    function item() { const row = el.dataset.row === undefined ? null : Number(el.dataset.row), index = row === null ? null : Number(el.dataset.slot); return { row, index, kind: row === null ? el.dataset.kind : state.rows[row].slots[index] }; }
    el.addEventListener('dragstart', e => { const value = item(); if (!value.kind) return e.preventDefault(); drag = value; e.dataTransfer.setData('text/plain',value.kind); e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragend', () => { drag = null; slots.forEach(s => s.classList.remove('over')); });
    let start = null;
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; const value = item(); if (!value.kind) return; start = { x: e.clientX, y: e.clientY, id: e.pointerId, value }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointerup', e => {
      if (!start || start.id !== e.pointerId) return; const s = start; start = null;
      if (Math.hypot(e.clientX-s.x,e.clientY-s.y) <= 12) return;
      suppressClick = true; setTimeout(() => { suppressClick = false; },0);
      const target = slots.find(t => { const rect = t.getBoundingClientRect(); return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom; });
      if (target) put(s.value,Number(target.dataset.row),Number(target.dataset.slot));
    });
    el.addEventListener('pointercancel', () => { start = null; });
  });
  links.forEach(el => el.addEventListener('click', () => {
    const r = Number(el.dataset.row), i = Number(el.dataset.link), row = state.rows[r];
    if (!row.slots[i] || !row.slots[i+1]) return message('Preencha os dois lados do elo antes de conectar.','bad');
    row.links[i] = !row.links[i]; changed(); message('Conexão alterada. Teste novamente a rede.');
  }));
  document.querySelectorAll('[data-control]').forEach(el => el.addEventListener('input', () => {
    const name = el.dataset.control;
    state.controls[name] = el.type === 'checkbox' ? el.checked : Number(el.value);
    if (el.type !== 'checkbox') $(name+'Value').textContent = el.value+'%';
    if (name === 'sun' && Number(el.value) !== 0) state.discharged = false;
    off(); message('Ajuste atualizado. '+(mission.step ? 'Simule uma etapa e teste a rede.' : 'Clique em Testar redes para observar o resultado.'));
  }));
  if ($('step')) $('step').addEventListener('click', () => { const text = lab.step(n,state); const evaluation = lab.evaluate(n,state); effects(evaluation.active); draw(); message(text); });
  $('test').addEventListener('click', () => {
    const result = lab.evaluate(n,state);
    if (result.phase && !state.observed.includes(result.phase)) state.observed.push(result.phase);
    effects(result.active); draw();
    if (result.complete) {
      const saved = lab.saveProgress(localStorageSafe,n); progress(); $('next').hidden = false;
      message('✓ Missão '+n+' concluída! '+result.message+(saved ? '' : ' O navegador não permitiu salvar seu progresso.'),'good');
    } else message(result.message,result.valid ? '' : 'bad');
  });
  $('remove').addEventListener('click', () => {
    if (selected?.row === null || !selected) return message('Selecione uma peça montada para remover.','bad');
    const { row, index } = selected; state.rows[row].slots[index] = null; unlink(row,index); changed(); message('Peça removida. Reconecte a montagem.');
  });
  $('reset').addEventListener('click', () => {
    state = lab.initial(n); selected = null; drag = null; off();
    document.querySelectorAll('[data-control]').forEach(el => { if (el.type === 'checkbox') el.checked = state.controls[el.dataset.control]; else { el.value = state.controls[el.dataset.control]; $(el.dataset.control+'Value').textContent = el.value+'%'; } });
    draw(); message('Montagem reiniciada. Seu progresso concluído foi mantido.');
  });
  addEventListener('pagehide', () => { stopSound(); if (audio) audio.close().catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopSound(); });
  draw(); progress();
})();
