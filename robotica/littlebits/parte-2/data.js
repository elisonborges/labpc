/* Modelos pedagógicos locais. Também carregável pelo Node para os testes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EnergyLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const key = 'labpc-littlebits-parte2-v1';
  const components = {
    usina: ['Usina', 'GERADOR', '🏭', '#157bc5', 'Gera energia elétrica a partir de uma fonte de energia.'],
    transmissao: ['Transmissão', 'DISTRIBUIDOR', '🗼', '#ed9138', 'Transporta energia por longas distâncias.'],
    transformador: ['Transformador', 'ADAPTADOR', '⚡', '#ad68d6', 'Nesta cadeia, reduz a tensão para o uso na cidade.'],
    lampada: ['Lâmpada', 'APARELHO', '💡', '#43b76b', 'Transforma energia elétrica em luz e calor.'],
    solar: ['Painel solar', 'GERADOR', '☀️', '#157bc5', 'Converte energia da luz em energia elétrica. Sem luz, não gera.'],
    volume: ['Volume', 'CONTROLADOR', '🎚️', '#ed388c', 'Controla a intensidade do som do alto-falante.'],
    som: ['Alto-falante', 'APARELHO', '🔊', '#43b76b', 'Transforma energia elétrica em som.'],
    gas: ['Gás', 'FONTE', '🛢️', '#157bc5', 'Combustível que armazena energia química.'],
    valvula: ['Válvula', 'CONTROLADOR', '🔘', '#ed388c', 'Abre ou fecha a passagem do gás.'],
    fogao: ['Fogão', 'APARELHO', '🍳', '#43b76b', 'A combustão transforma energia química em calor.'],
    carregador: ['Carregador', 'ADAPTADOR', '🔌', '#ad68d6', 'Fornece energia elétrica para carregar um veículo.'],
    eletrico: ['Carro elétrico', 'APARELHO', '🚙', '#43b76b', 'Usa energia elétrica armazenada na bateria para mover o motor.'],
    gasolina: ['Gasolina', 'FONTE', '🛢️', '#157bc5', 'Combustível que armazena energia química.'],
    posto: ['Bomba de combustível', 'DISTRIBUIDOR', '⛽', '#ed9138', 'Abastece o veículo a combustão com gasolina.'],
    combustao: ['Carro a gasolina', 'APARELHO', '🚗', '#43b76b', 'A combustão transforma energia química em movimento e calor.'],
    vento: ['Vento', 'FONTE', '🌬️', '#157bc5', 'O movimento do ar pode mover uma turbina.'],
    turbina: ['Turbina eólica', 'GERADOR', '🌀', '#157bc5', 'Transforma energia do vento em energia elétrica.'],
    motor: ['Motor', 'APARELHO', '⚙️', '#43b76b', 'Transforma energia elétrica em movimento.'],
    escola: ['Escola', 'APARELHO', '🏫', '#43b76b', 'Precisa de energia para iluminação e equipamentos.'],
    sensor: ['Sensor de luz', 'CONTROLADOR', '🌗', '#ed388c', 'Liga a iluminação quando a luz ambiente fica abaixo do limite.'],
    poste: ['Poste', 'APARELHO', '💡', '#43b76b', 'Ilumina a rua quando recebe energia e o sensor autoriza.'],
    adaptador: ['Regulador', 'ADAPTADOR', '🔧', '#ad68d6', 'Adapta a energia gerada para o equipamento.'],
    bomba: ['Bomba de água', 'APARELHO', '💧', '#43b76b', 'Consome energia elétrica para movimentar a água.'],
    controlador: ['Controlador de carga', 'CONTROLADOR', '🎛️', '#ed388c', 'Gerencia a energia do painel e o carregamento da bateria.'],
    bateria: ['Bateria', 'ARMAZENADOR', '🔋', '#ad68d6', 'Armazena energia e alimenta o circuito quando a geração para.'],
    hospital: ['Hospital', 'APARELHO', '🏥', '#43b76b', 'Precisa de fornecimento contínuo de energia.']
  };
  const chain = (name, order, icon, active) => ({ name, order, icon, active });
  const missions = {
    1: { title: 'O caminho da energia' },
    2: {
      title: 'Sol que vira som', objective: 'Use a luz solar para alimentar um aparelho sonoro.',
      challenge: 'Monte a cadeia solar e ajuste luz solar para pelo menos 40% e volume para pelo menos 60%.',
      lesson: 'A luz foi convertida em energia elétrica e depois em som. O volume controla a intensidade sonora.',
      chains: [chain('Som solar', ['solar', 'volume', 'som'], '🔊', 'Som funcionando')],
      controls: [['sun', 'Luz solar', 0, 100, 20], ['volume', 'Volume', 0, 100, 20]]
    },
    3: {
      title: 'Cozinhando com energia', objective: 'Explore uma cadeia de energia que não usa eletricidade.',
      challenge: 'Conecte gás, válvula e fogão. Abra a válvula virtual para acender a chama.',
      lesson: 'Na simulação, a energia química do gás se transforma em energia térmica. Atividade virtual; não manipule gás real.',
      chains: [chain('Cozinha', ['gas', 'valvula', 'fogao'], '🔥', 'Chama acesa')],
      controls: [['valve', 'Válvula aberta', 'check', false]]
    },
    4: {
      title: 'Elétrico ou gasolina?', objective: 'Compare duas cadeias que fazem veículos funcionar.',
      challenge: 'Monte e conecte as duas cadeias. Carregue o carro elétrico e abasteça o carro a gasolina em pelo menos 40%.',
      lesson: 'Os dois veículos produzem movimento. O elétrico usa a energia da bateria; o carro a gasolina usa combustão, que também libera calor.',
      chains: [chain('Veículo elétrico', ['usina', 'carregador', 'eletrico'], '🚙', 'Carro elétrico em movimento'), chain('Veículo a gasolina', ['gasolina', 'posto', 'combustao'], '🚗', 'Carro a gasolina em movimento')],
      controls: [['charge', 'Carga do carro', 0, 100, 10], ['fuel', 'Combustível', 0, 100, 10]]
    },
    5: {
      title: 'Uma cidade, muitas energias', objective: 'Alimente quatro aparelhos por redes independentes.',
      challenge: 'Monte quatro redes: solar → lâmpada; usina → transformador → escola; vento → turbina → motor; gás → válvula → fogão. Conecte todos os elos.',
      lesson: 'Uma cidade reúne fontes e transformações diferentes. Cada rede precisa do caminho adequado até seu aparelho.',
      chains: [chain('Iluminação solar', ['solar', 'lampada'], '💡', 'Lâmpada acesa'), chain('Escola', ['usina', 'transformador', 'escola'], '🏫', 'Escola com energia'), chain('Movimento', ['vento', 'turbina', 'motor'], '⚙️', 'Motor girando'), chain('Cozinha', ['gas', 'valvula', 'fogao'], '🔥', 'Chama acesa')],
      controls: [], note: 'Nesta missão, luz solar, vento e passagem de gás estão disponíveis. Cada linha é uma rede independente.'
    },
    6: {
      title: 'Poste inteligente', objective: 'Use um sensor para economizar energia durante o dia.',
      challenge: 'Monte a rede e teste duas situações: dia com luz ambiente de 60% ou mais e noite com 30% ou menos.',
      lesson: 'O sensor mantém a lâmpada apagada de dia e liga à noite. A energia vem da usina, não do sensor.',
      chains: [chain('Rua inteligente', ['usina', 'transformador', 'sensor', 'poste'], '💡', 'Poste aceso')],
      controls: [['ambient', 'Luz ambiente', 0, 100, 80]]
    },
    7: {
      title: 'A força do vento', objective: 'Equilibre a geração eólica e o consumo de uma bomba.',
      challenge: 'Conecte vento, turbina, regulador e bomba. Aumente o vento até a geração atender à demanda da bomba.',
      lesson: 'A geração precisa atender ao consumo. Neste modelo simplificado, mais vento aumenta a energia disponível.',
      chains: [chain('Água para a cidade', ['vento', 'turbina', 'adaptador', 'bomba'], '💧', 'Bomba de água funcionando')],
      controls: [['wind', 'Vento / geração', 0, 100, 20], ['demand', 'Demanda da bomba', 20, 80, 60]]
    },
    8: {
      title: 'Energia de reserva', objective: 'Armazene energia solar e use a reserva quando anoitecer.',
      challenge: 'Conecte painel, controlador, bateria e lâmpada. Com luz solar ≥ 40%, simule etapas para carregar. Depois ajuste para 0% e simule uma etapa de consumo.',
      lesson: 'A bateria armazenou energia durante a geração e forneceu energia à lâmpada quando o painel parou.',
      chains: [chain('Reserva da iluminação', ['solar', 'controlador', 'bateria', 'lampada'], '💡', 'Lâmpada alimentada pela reserva')],
      controls: [['sun', 'Luz solar', 0, 100, 80]], step: true
    },
    9: {
      title: 'Desafio final — Cidade inteligente', objective: 'Mantenha escola, hospital e rua funcionando entre dia e noite.',
      challenge: 'Monte as três redes. De dia (sol ≥ 40%, luz ambiente ≥ 60%), carregue a reserva. Depois simule a noite (sol 0%, luz ≤ 30%). Garanta vento ≥ 50% para o hospital.',
      lesson: 'Você combinou geração, armazenamento, distribuição e automação para manter a cidade atendida de dia e à noite!',
      chains: [chain('Escola com reserva', ['solar', 'controlador', 'bateria', 'escola'], '🏫', 'Escola atendida'), chain('Hospital', ['vento', 'turbina', 'adaptador', 'hospital'], '🏥', 'Hospital atendido'), chain('Iluminação pública', ['usina', 'transformador', 'sensor', 'poste'], '💡', 'Poste aceso')],
      controls: [['sun', 'Luz solar', 0, 100, 80], ['wind', 'Vento / geração', 0, 100, 70], ['ambient', 'Luz ambiente', 0, 100, 80]], step: true
    }
  };
  function readProgress(storage) {
    try {
      const value = JSON.parse(storage.getItem(key) || '{}');
      return Array.isArray(value?.completed) ? [...new Set(value.completed.filter(n => Number.isInteger(n) && n >= 1 && n <= 9))] : [];
    } catch { return []; }
  }
  function saveProgress(storage, n) {
    try { storage.setItem(key, JSON.stringify({ completed: [...new Set([...readProgress(storage), n])].sort((a,b) => a-b) })); return true; }
    catch { return false; }
  }
  function initial(n) {
    const mission = missions[n];
    return { rows: mission.chains.map(c => ({ slots: c.order.map(() => null), links: c.order.slice(1).map(() => false) })),
      controls: Object.fromEntries(mission.controls.map(c => [c[0], c[2] === 'check' ? c[3] : c[4]])),
      observed: [], battery: 0, charged: false, discharged: false };
  }
  function circuitError(n, state) {
    for (let r = 0; r < missions[n].chains.length; r++) {
      const c = missions[n].chains[r], row = state.rows[r];
      if (row.slots.some(k => !k)) return c.name + ': preencha todos os espaços.';
      if (!c.order.every((k,i) => row.slots[i] === k)) return c.name + ': revise a sequência ' + c.order.map(k => components[k][0]).join(' → ') + '.';
      if (!row.links.every(Boolean)) return c.name + ': conecte todos os losangos entre as peças.';
    }
    return '';
  }
  function evaluate(n, s) {
    const error = circuitError(n, s), c = s.controls;
    if (error) return { complete: false, message: error, active: s.rows.map(() => false), valid: false };
    const out = (complete, message, active = s.rows.map(() => complete)) => ({ complete, message, active, valid: true });
    switch (n) {
      case 2: return c.sun < 40 ? out(false, 'Aumente a luz solar para pelo menos 40%.') : c.volume < 60 ? out(false, 'Há geração! Aumente o volume para pelo menos 60%.', [c.volume > 0]) : out(true, missions[n].lesson);
      case 3: return c.valve ? out(true, missions[n].lesson) : out(false, 'Abra a válvula virtual para o gás chegar ao fogão.');
      case 4: return c.charge >= 40 && c.fuel >= 40 ? out(true, missions[n].lesson) : out(false, 'Carga e combustível precisam chegar a pelo menos 40%.', [c.charge >= 40, c.fuel >= 40]);
      case 5: return out(true, missions[n].lesson);
      case 6: {
        const phase = c.ambient >= 60 ? 'day' : c.ambient <= 30 ? 'night' : null;
        const observed = new Set([...s.observed, ...(phase ? [phase] : [])]);
        const complete = observed.has('day') && observed.has('night');
        return { ...out(complete, complete ? missions[n].lesson : phase ? (phase === 'day' ? 'Dia verificado: poste apagado. Agora teste com luz ≤ 30%.' : 'Noite verificada: poste aceso. Agora teste com luz ≥ 60%.' ) : 'Use luz ≥ 60% para testar o dia ou ≤ 30% para testar a noite.', [c.ambient <= 30]), phase };
      }
      case 7: return c.wind >= c.demand ? out(true, missions[n].lesson) : out(false, 'Geração: '+c.wind+' unidades. Demanda: '+c.demand+'. Aumente o vento ou reduza a demanda.');
      case 8: return out(s.charged && s.discharged, s.charged && s.discharged ? missions[n].lesson : s.charged ? 'Reserva carregada. Ajuste o sol para 0% e simule uma etapa de consumo.' : 'Com sol ≥ 40%, clique em Simular etapa para carregar a bateria.', [c.sun >= 40 || (c.sun === 0 && s.discharged)]);
      case 9: {
        const complete = s.observed.includes('day') && s.observed.includes('night') && s.charged && s.discharged && c.sun === 0 && c.ambient <= 30 && c.wind >= 50;
        return out(complete, complete ? missions[n].lesson : c.wind < 50 ? 'O hospital precisa de vento ≥ 50%. Ajuste a geração.' : !s.observed.includes('day') ? 'Monte as redes e simule o dia: sol ≥ 40%, luz ambiente ≥ 60%, vento ≥ 50%.' : 'Dia atendido e reserva carregada. Simule a noite: sol 0%, luz ≤ 30%, vento ≥ 50%.', [c.sun >= 40 || (c.sun === 0 && s.discharged), c.wind >= 50, c.ambient <= 30]);
      }
      default: throw new Error('Missão desconhecida');
    }
  }
  function step(n, s) {
    const error = circuitError(n, s);
    if (error) return error;
    const c = s.controls;
    if (n === 9 && c.wind < 50) return 'O hospital está sem energia suficiente. Ajuste o vento para pelo menos 50%.';
    if (c.sun >= 40 && (n !== 9 || c.ambient >= 60)) {
      if (s.battery >= 100) return 'Bateria cheia. Agora experimente a noite.';
      s.battery = Math.min(100, s.battery + 25); s.charged = true; s.discharged = false;
      if (n === 9 && !s.observed.includes('day')) s.observed.push('day');
      return 'Etapa de dia: +25 unidades na bateria. Reserva: '+s.battery+'/100.';
    }
    if (c.sun === 0 && (n !== 9 || c.ambient <= 30)) {
      if (s.battery < 25) { s.discharged = false; return 'Reserva insuficiente. Volte ao dia e recarregue a bateria.'; }
      s.battery -= 25; s.discharged = true;
      if (n === 9 && !s.observed.includes('night')) s.observed.push('night');
      return 'Etapa de noite: 25 unidades da reserva alimentaram '+(n === 9 ? 'a escola' : 'a lâmpada')+'. Restam '+s.battery+'/100.';
    }
    return n === 9 ? 'Combine sol e luz ambiente: dia com sol ≥ 40% e luz ≥ 60%; noite com sol 0% e luz ≤ 30%.' : 'Use sol ≥ 40% para carregar ou 0% para usar a reserva.';
  }
  function invalidate(s) { s.observed = []; s.battery = 0; s.charged = false; s.discharged = false; }
  function palette(n) {
    const keys = ['usina','transmissao','transformador','lampada'];
    for (let i = 2; i <= n; i++) for (const c of missions[i].chains) for (const k of c.order) if (!keys.includes(k)) keys.push(k);
    return keys;
  }
  return { key, components, missions, initial, circuitError, evaluate, step, invalidate, palette, readProgress, saveProgress };
});
