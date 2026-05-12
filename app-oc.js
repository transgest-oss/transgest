// ── OC: Ordens de Compra — populações, modal, CRUD, encerrar s/NF ──
// ======================== POPULAÇÕES DINÂMICAS ========================
function populateSelects(){
  // OCs no select da NF
  const selNFOC=$('f-nf-oc');
  selNFOC.innerHTML='<option value="Sem OC">Sem OC</option>';
  OCs.filter(o=>{
    if(o.status==='Cancelada') return false;
    // Mostra a OC enquanto a soma das NFs vinculadas for menor que o valor da OC
    const somaVinculadas = NFs.filter(n=>n.oc===o.num).reduce((acc,n)=>acc+(parseFloat(n.valor)||0),0);
    const valorOC = parseFloat(o.valor)||0;
    return somaVinculadas < valorOC - 0.02;
  }).forEach(o=>selNFOC.innerHTML+=`<option value="${o.num}">${o.num} — ${o.forn} (OC: ${fmt(parseFloat(o.valor)||0)})</option>`);
  // Tipos OC
  atualizarSelectTiposOC();
  // Placas
  const placas=[...Frota].sort((a,b)=>(a.placa||'').localeCompare(b.placa||'','pt-BR')).map(f=>f.placa);
  ['f-oc-placa','f-nf-dest','f-saida-placa','f-tit-placa'].forEach(sid=>{
    const s=$(sid); if(!s)return;
    const isNfDest=sid==='f-nf-dest';
    s.innerHTML=(isNfDest?'<option value="">— Sem placa / Administrativo —</option><option value="Estoque">Estoque</option>':'<option value="-">Nenhuma (geral)</option>');
    if(isNfDest){
      // Adiciona placas da frota com modelo (apenas para f-nf-dest)
      [...Frota].sort((a,b)=>(a.placa||'').localeCompare(b.placa||'','pt-BR')).forEach(f=>{ if(f.placa) s.innerHTML+=`<option value="${f.placa}">${f.placa}${f.modelo?' — '+f.modelo:''}</option>`; });
    } else {
      placas.forEach(p=>s.innerHTML+=`<option value="${p}">${p}</option>`);
    }
  });
  // Fornecedores nos selects (ordem alfabética)
  const fornsAtivos = Fornecedores.filter(f=>f.status==='Ativo').sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  ['f-oc-forn','f-nf-forn','f-nfr-forn','f-tit-forn','f-fat-forn'].forEach(sid=>{
    const s=$(sid); if(!s)return;
    const curVal = s.value;
    s.innerHTML='<option value="">— Selecione o fornecedor —</option>';
    fornsAtivos.forEach(f=>s.innerHTML+=`<option value="${f.nome}">${f.nome}</option>`);
    // Para o lançamento avulso (Contas a Pagar), também lista colaboradores ativos
    if(sid==='f-tit-forn'){
      const colabsAtivos = Colaboradores.filter(c=>c.status==='Ativo');
      if(colabsAtivos.length){
        s.innerHTML+=`<option value="" disabled>── Colaboradores ──</option>`;
        colabsAtivos.forEach(c=>s.innerHTML+=`<option value="${c.nome}">${c.nome}${c.cargo?' ('+c.cargo+')':''}</option>`);
      }
    }
    if(curVal) s.value=curVal;
  });
  // Produtos para selects de entrada e saída
  populateProdutoSelects();
  // EPIs para saída
  const se=$('f-episaida-epi');
  se.innerHTML='';
  [...EPIEstoque].sort((a,b)=>(a.epi||'').localeCompare(b.epi||'','pt-BR')).forEach(e=>se.innerHTML+=`<option value="${e.epi}">${e.epi}</option>`);
}

// ======================== OC ========================
function openModal(id,mode){$(id).classList.add('open');}// override below

window.openModal = function(id, mode, data){
  populateSelects();
  $(id).classList.add('open');
  // If opening tipos-oc modal, render the list
  if(id==='modal-tipos-oc'){ renderTiposOCLista(); return; }
  const key = id.replace('modal-','').replace('-','');
  // reset editing
  if(mode==='novo'){
    const editKey={oc:'oc',nf:'nf','titulo':'tit','saida':'saida','entrada-peca':'est','frota':'frota','epi-saida':'episaida','epi-entrada':'epient'}[id.replace('modal-','')];
    if(editKey)editing[editKey]=null;
    // inicializar OC nova
    if(id==='modal-oc'){
      if($('f-oc-cat')){$('f-oc-cat').value='manutencao'; ocToggleCategoria();}
      $('f-oc-rateio').value='Não';
      $('f-oc-valor').value='';
      $('f-oc-desc').value='';
      $('f-oc-placa').value='-';
      // Gera o próximo número automático e exibe no campo (readonly)
      const maiorOC = OCs.reduce((max, o) => {
        const n = parseInt(String(o.num).replace(/\D/g,'')) || 0;
        return Math.max(max, n);
      }, 2145);
      if($('f-oc-num')) $('f-oc-num').value = String(maiorOC + 1);
      ocToggleRateio();
    }
    // inicializar parcelas ao abrir NF nova
    if(id==='modal-nf'){
      window._nfEditandoId = null; // nova NF, nenhuma sendo editada
      if($('f-nf-cat')){$('f-nf-cat').value='manutencao'; nfToggleCategoria();}
      if(document.getElementById('f-nf-acrescimo')) document.getElementById('f-nf-acrescimo').value='';
      if(document.getElementById('f-nf-desconto')) document.getElementById('f-nf-desconto').value='';
      if(document.getElementById('nf-diverg-aviso')) document.getElementById('nf-diverg-aviso').style.display='none';
      $('f-nf-parcelas').value='1';
      $('f-nf-valor').value='';
      $('f-nf-data').value=today;
      if($('f-nf-file')) $('f-nf-file').value='';
      if($('nf-doc-atual')){ $('nf-doc-atual').style.display='none'; $('nf-doc-atual').innerHTML=''; }
      if(document.getElementById('nf-mod-normal')) document.getElementById('nf-mod-normal').checked=true;
      nfToggleModalidade();
      nfGerarParcelas();
      nfOCChanged(); // reset rateio aviso
      nfDesativarRateioManual();
      if($('nf-rateio-manual-linhas')) $('nf-rateio-manual-linhas').innerHTML='';
      if($('nf-dest-wrap')) $('nf-dest-wrap').style.display='';
    }
    if(id==='modal-titulo'){ resetTituloModal(); }
    // Reset frota modal
    if(id==='modal-frota'){
      ['f-frota-placa','f-frota-modelo','f-frota-cor','f-frota-ano','f-frota-anomodelo',
       'f-frota-chassi','f-frota-renavam','f-frota-limite','f-frota-motoristas',
       'f-frota-vlicen'].forEach(id=>{const el=$(id);if(el)el.value='';});
      if($('f-frota-status')) $('f-frota-status').value='Ativo';
      if($('f-frota-tipo')) $('f-frota-tipo').value='Caminhão';
      editing.frota = null;
    }
    // Reset colaborador modal
    if(id==='modal-colab'){
      ['f-colab-nome','f-colab-cpf','f-colab-cargo','f-colab-cnh','f-colab-vcnh',
       'f-colab-tel','f-colab-email','f-colab-obs'].forEach(id=>{const el=$(id);if(el)el.value='';});
      editing.colab = null;
    }
    // Reset EPI saida modal
    if(id==='modal-epi-saida'){ editing.episaida = null; }
    // Reset usuario modal
    if(id==='modal-usuario'){
      ['f-usr-nome','f-usr-email','f-usr-senha','f-usr-obs'].forEach(id=>{const el=$(id);if(el)el.value='';});
      if($('f-usr-perfil')) $('f-usr-perfil').value='Financeiro';
      if($('f-usr-status')) $('f-usr-status').value='Ativo';
      editing.usuario = null;
    }
    // Reset fornecedor modal
    if(id==='modal-forn'){
      ['f-forn-nome','f-forn-cnpj','f-forn-tel','f-forn-email','f-forn-obs'].forEach(id=>{const el=$(id);if(el)el.value='';});
      editing.forn = null;
    }
    // Reset produto modal
    if(id==='modal-prod'){
      ['f-prod-cod','f-prod-nome','f-prod-cat','f-prod-uncomp','f-prod-unsaida','f-prod-fator'].forEach(id=>{const el=$(id);if(el)el.value='';});
      editing.prod = null;
    }
  }
};

// ======================== CRUD OC ========================
function ocToggleRateio(){
  const sim = $('f-oc-rateio').value === 'Sim';
  $('oc-rateio-wrap').style.display = sim ? 'block' : 'none';
  $('oc-placa-simples').style.display = sim ? 'none' : '';
  if(sim) ocGerarLinhasRateio();
}

function ocGerarLinhasRateio(){
  const n = parseInt($('oc-rateio-qtd').value) || 2;
  const total = parseFloat($('f-oc-valor').value) || 0;
  const base = Math.floor((total / n) * 100) / 100;
  const resto = Math.round((total - base * n) * 100) / 100;
  const placas = Frota.map(f => f.placa);
  const cont = $('oc-rateio-linhas');
  cont.innerHTML = Array.from({length: n}, (_, i) => {
    const val = i === n-1 ? (Math.round((base + resto)*100)/100).toFixed(2) : base.toFixed(2);
    const opts = '<option value="-">— Placa —</option>' + placas.map(p=>`<option value="${p}">${p}</option>`).join('');
    return `<div style="display:grid;grid-template-columns:32px 1fr 1fr;gap:8px;margin-bottom:7px;align-items:center">
      <span style="font-size:11px;font-weight:600;color:var(--text3);text-align:center">${i+1}</span>
      <select class="oc-rat-placa" style="font-size:12px;padding:6px 9px">${opts}</select>
      <input type="number" class="oc-rat-val" value="${val}" step="0.01" min="0" style="font-size:12px;padding:6px 9px" oninput="ocRateioRecalc()"/>
    </div>`;
  }).join('');
  ocRateioRecalc();
}

function ocRateioRecalc(){
  if($('f-oc-rateio').value !== 'Sim') return;
  const total = parseFloat($('f-oc-valor').value) || 0;
  const vals = [...document.querySelectorAll('.oc-rat-val')].map(i => parseFloat(i.value)||0);
  const soma = Math.round(vals.reduce((a,b)=>a+b,0)*100)/100;
  const diff = Math.round((soma - total)*100)/100;
  const somaEl = $('oc-rateio-soma'), diffEl = $('oc-rateio-diff');
  somaEl.textContent = 'R$ ' + soma.toLocaleString('pt-BR',{minimumFractionDigits:2});
  if(Math.abs(diff) < 0.01){
    somaEl.style.color = 'var(--accent)';
    diffEl.textContent = '✓ Valores corretos';
    diffEl.style.color = 'var(--accent)';
  } else {
    somaEl.style.color = 'var(--red)';
    diffEl.textContent = (diff>0?'Excesso':'Falta')+': R$ '+Math.abs(diff).toLocaleString('pt-BR',{minimumFractionDigits:2});
    diffEl.style.color = 'var(--red)';
  }
}

// Detecta se a OC selecionada na NF tem rateio e exibe distribuição
function nfOCChanged(){
  const ocNum = $('f-nf-oc')?.value || $('f-nf-oc').value;
  const oc = OCs.find(o => o.num === ocNum);
  nfCalcDivergencia();
  // Auto-fill categoria from OC
  if(oc && oc.categoria && $('f-nf-cat')){
    $('f-nf-cat').value = oc.categoria;
    nfToggleCategoria();
  }
  const aviso = $('nf-rateio-aviso');
  const destWrap = $('nf-dest-wrap');
  const rateioManualToggle = $('nf-rateio-manual-toggle-wrap');

  if(oc && oc.isRateio && oc.rateio && oc.rateio.length > 0){
    // OC já tem rateio definido — exibe painel info e oculta destino e rateio manual
    aviso.style.display = 'block';
    destWrap.style.display = 'none';
    if(rateioManualToggle) rateioManualToggle.style.display = 'none';
    nfDesativarRateioManual();
    $('nf-rateio-linhas').innerHTML = oc.rateio.map((r, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(167,139,250,.12)">
        <span style="display:flex;align-items:center;gap:8px">
          <span style="background:rgba(167,139,250,.18);color:var(--purple);border-radius:5px;padding:2px 7px;font-size:11px;font-weight:600;font-family:var(--mono)">${i+1}</span>
          <span style="font-family:var(--mono);color:var(--accent);font-weight:600">${r.placa}</span>
        </span>
        <span style="font-family:var(--mono);font-weight:600;color:var(--text)">R$ ${parseFloat(r.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
      </div>`).join('');
  } else {
    aviso.style.display = 'none';
    destWrap.style.display = '';
    if(rateioManualToggle) rateioManualToggle.style.display = '';
  }
}

// ── Rateio manual na NF ──
function nfToggleRateioManual(){
  const ativo = $('nf-rateio-manual-ativo') && $('nf-rateio-manual-ativo').checked;
  $('nf-rateio-manual-wrap').style.display = ativo ? 'block' : 'none';
  $('nf-dest-wrap').style.display = ativo ? 'none' : '';
  if(ativo) nfGerarLinhasRateioManual();
}
function nfDesativarRateioManual(){
  if($('nf-rateio-manual-ativo')) $('nf-rateio-manual-ativo').checked = false;
  if($('nf-rateio-manual-wrap')) $('nf-rateio-manual-wrap').style.display = 'none';
}
function nfGerarLinhasRateioManual(){
  const n = parseInt($('nf-rateio-manual-qtd').value) || 2;
  const total = parseFloat($('f-nf-valor').value) || 0;
  const base = Math.floor((total / n) * 100) / 100;
  const resto = Math.round((total - base * n) * 100) / 100;
  const placas = Frota.filter(f => f.status !== 'Inativo').map(f => f.placa);
  const cont = $('nf-rateio-manual-linhas');
  cont.innerHTML = Array.from({length: n}, (_, i) => {
    const val = i === n - 1 ? Math.round((base + resto) * 100) / 100 : base;
    const opts = placas.map(p => `<option value="${p}">${p}</option>`).join('');
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">
      <select class="nf-rat-placa" onchange="nfAtualizarSomaRateio()" style="font-size:12px;padding:5px 8px"><option value="">— Placa —</option>${opts}</select>
      <input type="number" class="nf-rat-val" value="${val.toFixed(2)}" step="0.01" min="0" oninput="nfAtualizarSomaRateio()" style="font-size:12px;padding:5px 8px"/>
    </div>`;
  }).join('');
  nfAtualizarSomaRateio();
}
function nfAtualizarSomaRateio(){
  const total = parseFloat($('f-nf-valor').value) || 0;
  const vals = [...document.querySelectorAll('.nf-rat-val')].map(i => parseFloat(i.value) || 0);
  const soma = Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
  const diff = Math.round((soma - total) * 100) / 100;
  $('nf-rateio-manual-soma').textContent = 'R$ ' + soma.toLocaleString('pt-BR', {minimumFractionDigits: 2});
  const diffEl = $('nf-rateio-manual-diff');
  if(Math.abs(diff) < 0.01){ diffEl.textContent = '✓ Correto'; diffEl.style.color = 'var(--accent)'; }
  else { diffEl.textContent = (diff > 0 ? 'Excesso' : 'Falta') + ': R$ ' + Math.abs(diff).toLocaleString('pt-BR', {minimumFractionDigits: 2}); diffEl.style.color = 'var(--red)'; }
}

function editarOC(id){
  const o=OCs.find(x=>x.id===id); if(!o)return;
  if(o.status==='Cancelada'){ toast('OC cancelada não pode ser editada.','error'); return; }
  editing.oc=id;
  // Popula placas no select simples
  ocPopulatePlacaSelect();
  $('f-oc-num').value=o.num; $('f-oc-data').value=o.data;
  $('f-oc-forn').value=o.forn||''; $('f-oc-valor').value=o.valor;
  $('f-oc-tipo').value=o.tipo; $('f-oc-desc').value=o.desc||'';
  if($('f-oc-cat')) $('f-oc-cat').value=o.categoria||'manutencao';
  ocToggleCategoria();
  const temRateio = o.rateio && o.rateio.length > 0;
  $('f-oc-rateio').value = temRateio ? 'Sim' : 'Não';
  ocToggleRateio();
  if(temRateio){
    $('oc-rateio-qtd').value = String(o.rateio.length);
    ocGerarLinhasRateio();
    // Preenche placas e valores salvos
    setTimeout(()=>{
      const placaSels = document.querySelectorAll('.oc-rat-placa');
      const valInps = document.querySelectorAll('.oc-rat-val');
      o.rateio.forEach((r,i)=>{
        if(placaSels[i]) placaSels[i].value = r.placa;
        if(valInps[i]) valInps[i].value = r.valor.toFixed(2);
      });
      ocRateioRecalc();
    }, 50);
  } else {
    $('f-oc-placa').value = o.placas || '-';
  }
  $('modal-oc-title').textContent='Editar Ordem de Compra';
  $('btn-save-oc').textContent='💾 Atualizar';
  $('modal-oc').classList.add('open');
}

function ocPopulatePlacaSelect(){
  const sel = $('f-oc-placa'); if(!sel) return;
  sel.innerHTML = '<option value="-">Nenhuma (geral)</option>';
  Frota.forEach(f => sel.innerHTML += `<option value="${f.placa}">${f.placa}</option>`);
}

function salvarOC(){
  const data=$('f-oc-data').value||today;
  const forn=$('f-oc-forn').value.trim(); if(!forn){toast('Selecione o fornecedor','error');return;}
  const valor=parseFloat($('f-oc-valor').value)||0;
  const isRateio = $('f-oc-rateio').value === 'Sim';

  let rateio = [];
  let placas = '-';

  if(isRateio){
    const placaSels = [...document.querySelectorAll('.oc-rat-placa')];
    const valInps = [...document.querySelectorAll('.oc-rat-val')];
    if(!placaSels.length){ toast('Gere as linhas de rateio primeiro','error'); return; }
    for(let i=0;i<placaSels.length;i++){
      if(placaSels[i].value==='-'){ toast('Informe a placa do caminhão '+(i+1),'error'); return; }
      if(!(parseFloat(valInps[i].value)>0)){ toast('Informe o valor do caminhão '+(i+1),'error'); return; }
      rateio.push({ placa: placaSels[i].value, valor: Math.round(parseFloat(valInps[i].value)*100)/100 });
    }
    const soma = Math.round(rateio.reduce((a,r)=>a+r.valor,0)*100)/100;
    if(Math.abs(soma - valor) > 0.02){ toast('A soma do rateio (R$ '+soma.toLocaleString('pt-BR',{minimumFractionDigits:2})+') não bate com o valor total','error'); return; }
    placas = rateio.map(r=>r.placa).join(' / ');
  } else {
    placas = $('f-oc-placa').value || '-';
  }

  const catOC = ($('f-oc-cat')||{value:'manutencao'}).value;

  // Número da OC: sempre automático e sequencial, nunca editável
  // Garante que o próximo número seja sempre maior que qualquer OC existente
  let num;
  if(editing.oc){
    // Na edição, mantém o número original
    const ocAtual = OCs.find(x=>x.id===editing.oc);
    num = ocAtual ? ocAtual.num : String(nextId.oc);
  } else {
    // Nova OC: próximo número sequencial, mínimo 2147
    const maiorExistente = OCs.reduce((max, o) => {
      const n = parseInt(String(o.num).replace(/\D/g,'')) || 0;
      return Math.max(max, n);
    }, 2145);
    num = String(maiorExistente + 1);
  }

  const obj={num,data,forn,placas,valor,tipo:categoriaLabel(catOC),categoria:catOC,nf:'Pendente',nfsEsperadas:1,desc:$('f-oc-desc').value.trim(),rateio,isRateio};

  if(editing.oc){
    const i=OCs.findIndex(x=>x.id===editing.oc);
    if(OCs[i].status==='Cancelada'){ toast('OC cancelada não pode ser editada.','error'); return; }
    const antes = cloneSimples(OCs[i]);
    OCs[i]={...OCs[i],...obj};
    registrarHistoricoOC(OCs[i], 'Editou OC', resumoMudancasOC(antes, OCs[i]), antes, OCs[i]);
    registrarLog({
      acao: 'editou',
      tabela: 'tg_ocs',
      registro_id: OCs[i].num || OCs[i].id,
      descricao: `Editou OC ${OCs[i].num || OCs[i].id} — ${OCs[i].forn || 'sem fornecedor'} — ${fmt(OCs[i].valor)}`
    });
    editing.oc=null; toast('OC atualizada com sucesso!');
  } else {
    obj.id=newId('oc'); obj.nf='Pendente'; obj.status='Ativa'; obj.criadaEm=new Date().toISOString(); obj.criadaPor=usuarioAtualNome();
    OCs.unshift(obj); registrarHistoricoOC(obj, 'Criou OC', `OC criada no valor de ${fmt(obj.valor)} para ${obj.forn}`, null, obj);
    registrarLog({
      acao: 'criou',
      tabela: 'tg_ocs',
      registro_id: obj.num || obj.id,
      descricao: `Criou OC ${obj.num || obj.id} — ${obj.forn || 'sem fornecedor'} — ${fmt(obj.valor)}`
    });
    toast('OC emitida com sucesso!');
  }
  closeModal('modal-oc');
  $('modal-oc-title').textContent='Nova Ordem de Compra';
  $('btn-save-oc').textContent='💾 Emitir OC';
  renderAll();
}

function cancelarOC(id){
  const o=OCs.find(x=>x.id===id);
  if(!o) return;
  if(o.status==='Cancelada'){ toast('Esta OC já está cancelada.','error'); return; }
  const motivo = prompt(`Motivo do cancelamento da OC ${o.num}:`);
  if(motivo === null) return;
  const motivoLimpo = motivo.trim();
  if(!motivoLimpo){ toast('Informe um motivo para cancelar a OC.','error'); return; }
  confirmDelete(`Cancelar OC ${o.num}?`,`A OC será mantida no histórico e não será apagada. Motivo: ${motivoLimpo}`,()=>{
    const antes = cloneSimples(o);
    o.status='Cancelada';
    o.canceladaEm=new Date().toISOString();
    o.canceladaPor=usuarioAtualNome();
    o.motivoCancelamento=motivoLimpo;
    registrarHistoricoOC(o, 'Cancelou OC', motivoLimpo, antes, o);
    registrarLog({
      acao: 'cancelou',
      tabela: 'tg_ocs',
      registro_id: o.num || o.id,
      descricao: `Cancelou OC ${o.num || o.id}. Motivo: ${motivoLimpo}`
    });
    // Salva diretamente no Supabase para evitar race condition com wrapSalvar
    saveEntidade('OCs', [o]);
    if(HistoricoOC.length) saveEntidade('HistoricoOC', [HistoricoOC[0]]);
    toast('OC cancelada e preservada no histórico.');
    renderAll();
  });
}
function excluirOC(id){ cancelarOC(id); }

// ======================== ENCERRAR OC SEM NF ========================
function abrirEncerrarOCSemNF(id){
  const oc = OCs.find(x => x.id === id);
  if(!oc) return;
  if(oc.status === 'Cancelada')       { toast('OC cancelada não pode ser encerrada.','error'); return; }
  if(oc.nf === 'Recebida')            { toast('Esta OC já possui NF recebida.','error'); return; }
  if(oc.status === 'Encerrada s/ NF') { toast('Esta OC já foi encerrada sem NF.','error'); return; }
  $('encnf-oc-num').textContent   = oc.num;
  $('encnf-oc-forn').textContent  = oc.forn;
  $('encnf-oc-valor').textContent = fmt(oc.valor);
  $('encnf-valor').value          = oc.valor;
  $('encnf-forn').textContent     = oc.forn;
  $('encnf-venc').value           = today;
  $('encnf-status').value         = 'Pendente';
  $('encnf-motivo').value         = '';
  $('encnf-obs').value            = '';
  $('encnf-placa').value          = oc.placas || '-';
  $('modal-encerrar-sem-nf').dataset.ocId = id;
  $('modal-encerrar-sem-nf').classList.add('open');
}

async function confirmarEncerrarOCSemNF(){
  const id  = Number($('modal-encerrar-sem-nf').dataset.ocId);
  const oc  = OCs.find(x => x.id === id);
  if(!oc){ toast('OC não encontrada.','error'); return; }
  const motivo = $('encnf-motivo').value.trim();
  if(!motivo){ toast('Informe o motivo do encerramento.','error'); return; }
  const valor = parseFloat($('encnf-valor').value) || 0;
  if(valor <= 0){ toast('Informe um valor válido para o lançamento.','error'); return; }
  const venc   = $('encnf-venc').value || today;
  const status = $('encnf-status').value || 'Pendente';
  const obs    = $('encnf-obs').value.trim();
  const placa  = $('encnf-placa').value || '-';
  const titulo = {
    id: newId('tit'), forn: oc.forn, fornecedor: oc.forn,
    ref: 'OC-' + oc.num + '-SEM-NF', tipo: 'Lançamento s/ NF',
    categoria: oc.categoria || 'outros', valor, emissao: today, venc, status, placa,
    obs: obs || ('Encerramento sem NF — OC ' + oc.num + '. Motivo: ' + motivo),
    ocId: oc.id, ocNum: oc.num, semNF: true, boleto: '', comprovante: ''
  };
  Titulos.unshift(titulo);
  const antes = cloneSimples(oc);
  oc.nf = 'Sem NF'; oc.status = 'Encerrada s/ NF';
  oc.encerradaSemNFEm = new Date().toISOString();
  oc.encerradaSemNFPor = usuarioAtualNome();
  oc.motivoSemNF = motivo;
  registrarHistoricoOC(oc, 'Encerrada sem NF',
    'Lançamento avulso criado: ' + fmt(valor) + ' — venc. ' + venc + '. Motivo: ' + motivo, antes, oc);
  await saveEntidade('Titulos', [titulo]);
  await saveEntidade('OCs', [oc]);
  if(HistoricoOC.length) await saveEntidade('HistoricoOC', [HistoricoOC[0]]);
  await saveCounters();
  closeModal('modal-encerrar-sem-nf');
  populateSelects(); renderAll();
  toast('✅ OC ' + oc.num + ' encerrada! Título avulso de ' + fmt(valor) + ' criado no Contas a Pagar.');
}

