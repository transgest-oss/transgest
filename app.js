// ── CLIENTE SUPABASE (único, declarado aqui para estar disponível em todo o código) ──
const SUPA_URL = 'https://oevzvetthuvnawjuhfeq.supabase.co';
const SUPA_KEY = 'sb_publishable_rsY8opUVpHRekTRFTKoKiw_EVfBr_rM';
const supa = supabase.createClient(SUPA_URL, SUPA_KEY);

const $ = id => document.getElementById(id);
const today = new Date().toISOString().split('T')[0];

// ======================== DADOS ========================
// Produção: sem dados de demonstração hardcoded.
// O estado do sistema é carregado/salvo no Supabase (tabela transgest_state).
// IMPORTANTE: usar var (não let/const) para que window['Frota'] === Frota seja true
var Fornecedores = [];
var OCs = [];
var NFs = [];
var Titulos = [];
var Produtos = [];
var Estoque = [];
var Saidas = [];
var Frota = [];
var EPIEstoque = [];
var EPIEntregas = [];
var Colaboradores = [];
var Usuarios = [];
var Faturamentos = [];
var HistoricoOC = [];
var ViagensPipa = [];
var filtroOCAtual = 'todas';

var nextFornId = 1;
var nextProdId = 1;
var nextIdColab = 1, nextIdUser = 1;
var nextFatId = 1;
var nextId = {oc:1,nf:1,tit:1,est:1,saida:1,frota:1,episaida:1,epient:1};
function newId(k){return nextId[k]++;}
function usuarioAtualNome(){
  return (window.usuarioLogado && (usuarioLogado.nome || usuarioLogado.email)) || 'Usuário do sistema';
}
function cloneSimples(obj){ return JSON.parse(JSON.stringify(obj || {})); }
function resumoMudancasOC(antes, depois){
  const campos = [['num','Número'],['data','Data'],['forn','Fornecedor'],['placas','Placa(s)'],['valor','Valor'],['tipo','Tipo'],['desc','Descrição'],['nf','Status NF'],['status','Status']];
  const mudancas=[];
  campos.forEach(([key,label])=>{ const a=antes?antes[key]:undefined; const d=depois?depois[key]:undefined; if(JSON.stringify(a)!==JSON.stringify(d)) mudancas.push(`${label}: ${a || '—'} → ${d || '—'}`); });
  return mudancas.join(' | ') || 'Alteração registrada';
}
function registrarHistoricoOC(oc, acao, detalhe='', antes=null, depois=null){
  if(!oc) return;
  HistoricoOC.unshift({ id: Date.now()+Math.floor(Math.random()*1000), ocId: oc.id, ocNum: oc.num, acao, detalhe, usuario: usuarioAtualNome(), dataHora: new Date().toISOString(), antes: cloneSimples(antes), depois: cloneSimples(depois || oc) });
}
function verHistoricoOC(id){
  const oc=OCs.find(x=>x.id===id);
  const hist=HistoricoOC.filter(h=>h.ocId===id || (oc && h.ocNum===oc.num));
  if(!hist.length){ toast('Esta OC ainda não tem histórico registrado.','error'); return; }
  const linhas=hist.slice(0,12).map(h=>{ const data=new Date(h.dataHora).toLocaleString('pt-BR'); return `${data}\n${h.acao} por ${h.usuario}\n${h.detalhe || 'Sem detalhes'}`; }).join('\n\n--------------------\n\n');
  alert(`Histórico da OC ${oc ? oc.num : ''}\n\n${linhas}`);
}


// ======================== HELPERS ========================
const fmt = v => 'R$ ' + (parseFloat(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtD = v => parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2});
const CL={manutencao:'Manutenção',pecas:'Peças',impostos:'Impostos',pessoal:'Pessoal',admin:'Administrativo'};
const CC={manutencao:'#0099FF',pecas:'#00C4A1',impostos:'#F5A623',pessoal:'#A78BFA',admin:'#FB923C'};

function chip(txt,cls){return `<span class="chip ${cls}">${txt}</span>`;}
function chipS(s){return s==='Cancelada'?chip('🚫 Cancelada','cr'):s==='Recebida'||s==='Pago'?chip(s,'cg'):s==='Parcialmente Recebida'?chip('⚡ Parc. Recebida','cb'):s==='Pendente'?chip('📄 Cobr. Direta','cgr'):s==='Aguardando Faturamento'?chip('⏳ Aguard.Fat.','ca'):s==='Faturado'?chip('💼 Faturado','cb'):chip(s,'cgr');}
function acts(editFn,delFn){return `<div class="action-btns"><button class="btn btn-edit btn-sm" onclick="${editFn}">✏️</button><button class="btn btn-danger btn-sm" onclick="${delFn}">🗑️</button></div>`;}

// ======================== TOAST ========================
function toast(msg,type='success'){
  const t=$('toast'),m=$('toast-msg');
  t.className='toast '+type; m.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2800);
}

// ======================== CONFIRM DELETE ========================
let _deleteFn=null;
function confirmDelete(msg,detail,fn){
  $('confirm-msg').textContent=msg;
  $('confirm-detail').textContent=detail||'Esta ação não pode ser desfeita.';
  _deleteFn=fn;
  $('modal-confirm').classList.add('open');
}
function confirmarDelete(){
  if(_deleteFn)_deleteFn();
  closeModal('modal-confirm');
}

// ======================== MODAIS ========================
function openModal(id,mode){$( id).classList.add('open');}
function closeModal(id){$(id).classList.remove('open');}
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.remove('open');});

// ======================== EDIÇÃO (estado) ========================
let editing={oc:null,nf:null,tit:null,est:null,saida:null,frota:null,episaida:null,epient:null,colab:null,usuario:null,fat:null};

function setModalMode(module,mode,icon,titleNew,titleEdit){
  $(modal_icon[module]).textContent=icon;
  $(modal_title[module]).textContent=mode==='novo'?titleNew:titleEdit;
  $('btn-save-'+module).textContent=mode==='novo'?'💾 Salvar':'💾 Atualizar';
}
const modal_icon={oc:'modal-oc-icon',nf:'modal-nf-icon',tit:'modal-tit-icon',saida:'modal-saida-title',ep:'modal-ep-title',frota:'modal-frota-title',episaida:'modal-episaida-title',epient:'modal-epient-title'};
const modal_title={oc:'modal-oc-title',nf:'modal-nf-title',tit:'modal-tit-title'};

// ======================== NAVEGAÇÃO ========================

// ======================== CATEGORIAS ========================
const CATEGORIAS_OC = [
  { id: 'manutencao',         label: 'Manutenção',          comPlaca: true  },
  { id: 'scherer',            label: 'Scherer',             comPlaca: true  },
  { id: 'scherer_ambi',       label: 'Scherer Ambicampos',  comPlaca: false },
  { id: 'combustiveis',       label: 'Combustíveis',        comPlaca: false },
  { id: 'impostos',           label: 'Impostos',            comPlaca: false },
  { id: 'outros',             label: 'Outros',              comPlaca: false },
  { id: 'diarias',            label: 'Diárias',             comPlaca: false },
  { id: 'consorcios',         label: 'Consórcios',          comPlaca: false },
  { id: 'gratificacoes',      label: 'Gratificações',       comPlaca: false },
  { id: 'seguros',            label: 'Seguros',             comPlaca: false },
  { id: 'funcionarios',       label: 'Funcionários',        comPlaca: false },
  { id: 'adiantamentos',      label: 'Adiantamentos',       comPlaca: false },
  { id: 'colaboradores',     label: 'Colaboradores',        comPlaca: false },
];

function categoriaLabel(id){ const c=CATEGORIAS_OC.find(x=>x.id===id); return c?c.label:(id||'—'); }
function categoriaComPlaca(id){ const c=CATEGORIAS_OC.find(x=>x.id===id); return c?c.comPlaca:true; }

function ocToggleCategoria(){
  const catId = ($('f-oc-cat')||{value:'manutencao'}).value;
  const comPlaca = categoriaComPlaca(catId);
  const placaWrap = document.getElementById('oc-placa-wrap');
  const rateioWrap = document.getElementById('f-oc-rateio') ? document.getElementById('f-oc-rateio').closest('.form-group') : null;
  if(placaWrap) placaWrap.style.display = comPlaca ? '' : 'none';
  if(rateioWrap) rateioWrap.style.display = comPlaca ? '' : 'none';
  if(!comPlaca){
    // Reseta rateio se categoria não tem placa
    if($('f-oc-rateio')) $('f-oc-rateio').value = 'Não';
    ocToggleRateio();
  }
}

const titles={dashboard:'Dashboard Geral',oc:'Ordens de Compra',fornecedores:'Cadastro de Fornecedores',produtos:'Cadastro de Produtos',nf:'Notas Fiscais',faturamentos:'Faturamentos',financeiro:'Contas a Pagar',estoque:'Estoque de Peças',frota:'Gestão de Frota',epi:'Controle de EPIs','rel-gastos':'Relatório — Gastos por Placa','rel-financeiro':'Relatório Financeiro por Período',pendentes:'OCs Pendentes de Faturamento',colaboradores:'Cadastro de Colaboradores',usuarios:'Usuários do Sistema',consulta:'🔍 Consulta Rápida',pipas:'🚛 Operações — Pipas',despesas:'🏆 Despesas por Placa 2026',relmensal:'📅 Resumo Operacional Mensal',energisa:'⚡ Gerar Planilha Energisa'};
function showScreen(id,el){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const sc=$('screen-'+id);if(sc)sc.classList.add('active');
  if(el)el.classList.add('active');
  else document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('onclick')&&n.getAttribute('onclick').includes("'"+id+"'"))n.classList.add('active');});
  $('page-title').textContent=titles[id]||id;
  if(id==='rel-financeiro'){toggleP();setTimeout(goRel,80);}
}

// ======================== POPULAÇÕES DINÂMICAS ========================
function populateSelects(){
  // OCs no select da NF
  const selNFOC=$('f-nf-oc');
  selNFOC.innerHTML='<option value="Sem OC">Sem OC</option>';
  OCs.filter(o=>o.status!=='Cancelada' && o.nf!=='Recebida').forEach(o=>selNFOC.innerHTML+=`<option value="${o.num}">${o.num} — ${o.forn}</option>`);
  // Tipos OC
  atualizarSelectTiposOC();
  // Placas
  const placas=Frota.map(f=>f.placa);
  ['f-oc-placa','f-nf-dest','f-saida-placa','f-tit-placa'].forEach(sid=>{
    const s=$(sid); if(!s)return;
    const isNfDest=sid==='f-nf-dest';
    s.innerHTML=(isNfDest?'<option value="">— Sem placa / Administrativo —</option><option value="Estoque">Estoque</option>':'<option value="-">Nenhuma (geral)</option>');
    if(isNfDest){
      // Adiciona placas da frota
      Frota.forEach(f=>{ if(f.placa) s.innerHTML+=`<option value="${f.placa}">${f.placa}${f.modelo?' — '+f.modelo:''}</option>`; });
    }
    placas.forEach(p=>s.innerHTML+=`<option value="${p}">${p}</option>`);
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
  EPIEstoque.forEach(e=>se.innerHTML+=`<option value="${e.epi}">${e.epi}</option>`);
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
    toast('OC cancelada e preservada no histórico.');
    renderAll();
  });
}
function excluirOC(id){ cancelarOC(id); }

// ======================== CRUD NF ========================

// Atualiza status da OC com base nas NFs já lançadas
function atualizarStatusOC(oc){
  if(!oc) return;
  const nfsVinculadas = NFs.filter(n => n.oc === oc.num);
  const esperadas = oc.nfsEsperadas || 1;
  if(nfsVinculadas.length === 0){
    oc.nf = 'Pendente';
  } else if(nfsVinculadas.length >= esperadas){
    oc.nf = 'Recebida';
  } else {
    oc.nf = 'Parcialmente Recebida';
  }
}

// --- Lógica de parcelas ---
function nfGerarParcelas(){
  const total = parseFloat($('f-nf-valor').value)||0;
  const n = parseInt($('f-nf-parcelas').value)||1;
  const emissao = $('f-nf-data').value || today;
  const base = Math.floor((total/n)*100)/100;
  const resto = Math.round((total - base*n)*100)/100;
  const linhas = [];
  for(let i=0;i<n;i++){
    // vencimento: i+1 meses após emissão
    const d = new Date(emissao);
    d.setMonth(d.getMonth()+(i+1));
    const venc = d.toISOString().split('T')[0];
    const val = i===n-1 ? Math.round((base+resto)*100)/100 : base;
    linhas.push({venc, val});
  }
  nfRenderLinhas(linhas);
  nfAtualizarSoma();
}
function nfRecalcularParcelas(){
  // redistribui valores mantendo datas já definidas
  const n = parseInt($('f-nf-parcelas').value)||1;
  const total = parseFloat($('f-nf-valor').value)||0;
  const base = Math.floor((total/n)*100)/100;
  const resto = Math.round((total - base*n)*100)/100;
  const rows = document.querySelectorAll('.parcela-val');
  rows.forEach((inp,i)=>{
    inp.value = i===rows.length-1 ? (Math.round((base+resto)*100)/100).toFixed(2) : base.toFixed(2);
  });
  nfAtualizarSoma();
}
function nfRenderLinhas(linhas){
  const cont = $('parcelas-linhas');
  cont.innerHTML = linhas.map((l,i)=>`
    <div class="parcela-row">
      <span class="parcela-num">${i+1}×</span>
      <input type="date" class="parcela-venc" value="${l.venc}" oninput="nfAtualizarSoma()"/>
      <input type="number" class="parcela-val" value="${l.val.toFixed(2)}" step="0.01" min="0" oninput="nfAtualizarSoma()"/>
      <span style="font-size:10px;color:var(--text3)">Parcela ${i+1}</span>
    </div>`).join('');
}
function nfAtualizarSoma(){
  const total = parseFloat($('f-nf-valor').value)||0;
  const vals = [...document.querySelectorAll('.parcela-val')].map(i=>parseFloat(i.value)||0);
  const soma = Math.round(vals.reduce((a,b)=>a+b,0)*100)/100;
  const diff = Math.round((soma-total)*100)/100;
  const somaEl=$('parcelas-soma'), msgEl=$('parcelas-diff-msg');
  somaEl.textContent='R$ '+soma.toLocaleString('pt-BR',{minimumFractionDigits:2});
  if(Math.abs(diff)<0.01){
    somaEl.className='parcela-diff ok';
    msgEl.textContent='✓ Valores corretos';
    msgEl.style.color='var(--accent)';
  } else {
    somaEl.className='parcela-diff err';
    msgEl.textContent=(diff>0?'Excesso':'Falta')+': R$ '+Math.abs(diff).toLocaleString('pt-BR',{minimumFractionDigits:2});
    msgEl.style.color='var(--red)';
  }
}

function editarNF(id){
  const o=NFs.find(x=>x.id===id); if(!o)return;
  editing.nf=id; window._nfEditandoId=id; populateSelects();
  $('f-nf-oc').value=o.oc; $('f-nf-tipo').value=o.tipo;
  $('f-nf-num').value=o.num; $('f-nf-data').value=o.data||today;
  $('f-nf-forn').value=o.forn||''; $('f-nf-dest').value=o.dest;
  if($('f-nf-cat')){$('f-nf-cat').value=o.categoria||'manutencao'; nfToggleCategoria();}
  if(o.combTipo) document.getElementById('f-nf-comb-tipo').value=o.combTipo||'';
  if(o.combQtd) document.getElementById('f-nf-comb-qtd').value=o.combQtd||'';
  if(o.combVuni) document.getElementById('f-nf-comb-vuni').value=o.combVuni||'';
  if(o.combPgto) document.getElementById('f-nf-comb-pgto').value=o.combPgto||'';
  if(o.combPlaca) document.getElementById('f-nf-comb-placa').value=o.combPlaca||'';
  $('f-nf-valor').value=o.valor;
  $('f-nf-obs').value=o.obs||'';
  if($('f-nf-file')) $('f-nf-file').value='';
  if($('nf-doc-atual')){
    $('nf-doc-atual').style.display = o.doc ? 'block' : 'none';
    if(o.doc){
      const docUrls = o.doc.split('|').filter(Boolean);
      const links = docUrls.length===1
        ? `<a href="${docUrls[0]}" target="_blank" rel="noopener">abrir arquivo</a>`
        : docUrls.map((u,i)=>`<a href="${u}" target="_blank" rel="noopener">Arquivo ${i+1}</a>`).join(' · ');
      $('nf-doc-atual').innerHTML = `📎 Arquivo(s) atual(is): ${links}<br><span style="color:var(--text3)">Escolha outro(s) arquivo(s) somente se quiser substituir.</span>`;
    } else { $('nf-doc-atual').innerHTML = ''; }
  }
  nfOCChanged(); // exibe aviso de rateio se OC for rateada
  // restaurar parcelas salvas (se houver) ou gerar 1 parcela
  const parc = o.parcelas||[{venc:o.venc||today, val:o.valor}];
  $('f-nf-parcelas').value=String(parc.length);
  nfRenderLinhas(parc.map(p=>({venc:p.venc, val:p.val})));
  nfAtualizarSoma();
  $('modal-nf-title').textContent='Editar Nota Fiscal';
  $('btn-save-nf').textContent='💾 Atualizar';
  $('modal-nf').classList.add('open');
}


function nfToggleCategoria(){
  const cat = ($('f-nf-cat')||{value:'manutencao'}).value;
  const combWrap = document.getElementById('nf-comb-wrap');
  if(combWrap) combWrap.style.display = cat === 'combustiveis' ? '' : 'none';
  // Populate combustivel placa select
  if(cat === 'combustiveis'){
    const sel = document.getElementById('f-nf-comb-placa');
    if(sel && sel.options.length <= 1){
      Frota.forEach(f => sel.innerHTML += `<option value="${f.placa}">${f.placa} — ${f.modelo||''}</option>`);
    }
  }
}

function nfCombCalc(){
  const qtd = parseFloat(document.getElementById('f-nf-comb-qtd')?.value)||0;
  const vuni = parseFloat(document.getElementById('f-nf-comb-vuni')?.value)||0;
  const total = qtd * vuni;
  const el = document.getElementById('f-nf-comb-vtotal');
  if(el) el.value = total > 0 ? fmt(total) : '—';
  // Auto-fill valor total da NF se ainda estiver vazio
  const nfVal = document.getElementById('f-nf-valor');
  if(nfVal && total > 0 && !nfVal.value) {
    nfVal.value = total.toFixed(2);
    nfRecalcularParcelas();
  }
}

async function salvarNF(){
  const forn=$('f-nf-forn').value.trim(); if(!forn){toast('Selecione o fornecedor','error');return;}
  const valorBase=parseFloat($('f-nf-valor').value)||0;
  if(!valorBase){toast('Informe o valor total da NF','error');return;}
  const acrescimo=parseFloat(document.getElementById('f-nf-acrescimo')?.value)||0;
  const desconto=parseFloat(document.getElementById('f-nf-desconto')?.value)||0;
  const total=Math.round((valorBase+acrescimo-desconto)*100)/100;

  // Coleta parcelas da grade
  const vencEls=[...document.querySelectorAll('.parcela-venc')];
  const valEls=[...document.querySelectorAll('.parcela-val')];
  if(!vencEls.length){ toast('Gere as parcelas antes de lançar','error'); return; }
  for(let i=0;i<vencEls.length;i++){
    if(!vencEls[i].value){toast('Informe a data da parcela '+(i+1),'error');return;}
    if(!(parseFloat(valEls[i].value)>0)){toast('Informe o valor da parcela '+(i+1),'error');return;}
  }
  const parcelas=vencEls.map((el,i)=>({venc:el.value,val:Math.round(parseFloat(valEls[i].value)*100)/100}));
  // Primeira parcela define venc principal da NF (compatibilidade)
  const vencPrincipal=parcelas[0].venc;

  // Verifica modalidade: faturamento ou normal
  const isModoFat = document.getElementById('nf-mod-fat') && document.getElementById('nf-mod-fat').checked;

  if(isModoFat){
    // Lança NF aguardando faturamento — sem criar títulos
    const ocFat = OCs.find(o => o.num === $('f-nf-oc').value);
    const destFat = (ocFat && ocFat.isRateio && ocFat.rateio && ocFat.rateio.length > 0)
      ? ocFat.placas : $('f-nf-dest').value;
    const docNFfat = await uploadDocNF();
    if(docNFfat === null){ toast('Erro ao enviar arquivo. Tente novamente.','error'); return; }
    const nfCatFat = ($('f-nf-cat')||{value:catHerd}).value || catHerd;
    const obj={oc:$('f-nf-oc').value,tipo:$('f-nf-tipo').value,num:$('f-nf-num').value.trim()||'NF-'+Date.now(),data:$('f-nf-data').value||today,forn,dest:destFat,valor:total,venc:null,pgto:'Aguardando Faturamento',obs:$('f-nf-obs').value.trim(),parcelas:[],doc:docNFfat,categoria:nfCatFat};
    obj.id=newId('nf'); NFs.unshift(obj);
    const ocFatRef=OCs.find(o=>o.num===obj.oc); if(ocFatRef) atualizarStatusOC(ocFatRef);
    registrarLog({
      acao: 'lancou_nf_aguardando_faturamento',
      tabela: 'tg_nfs',
      registro_id: obj.num || obj.id,
      descricao: `Lançou NF ${obj.num || obj.id} aguardando faturamento — ${obj.forn || 'sem fornecedor'} — ${fmt(obj.valor)}`
    });
    toast('NF lançada! Aguardando faturamento do fornecedor.');
    closeModal('modal-nf'); editing.nf=null; renderAll(); return;
  }

  // Define destino: prioridade: OC com rateio > rateio manual > campo dest
  const ocVincNF = OCs.find(o => o.num === $('f-nf-oc').value);
  const rateioManualAtivo = $('nf-rateio-manual-ativo') && $('nf-rateio-manual-ativo').checked;

  // Coleta rateio manual se ativo
  let rateioManual = [];
  if(rateioManualAtivo){
    const placaSels = [...document.querySelectorAll('.nf-rat-placa')];
    const valInps   = [...document.querySelectorAll('.nf-rat-val')];
    for(let i = 0; i < placaSels.length; i++){
      if(!placaSels[i].value){ toast('Selecione a placa na linha '+(i+1)+' do rateio','error'); return; }
      rateioManual.push({ placa: placaSels[i].value, valor: Math.round(parseFloat(valInps[i].value)*100)/100 });
    }
    const somaRM = Math.round(rateioManual.reduce((a,r)=>a+r.valor,0)*100)/100;
    if(Math.abs(somaRM - total) > 0.02){ toast('A soma do rateio (R$ '+somaRM.toLocaleString('pt-BR',{minimumFractionDigits:2})+') não bate com o valor total','error'); return; }
  }

  const destNF = (ocVincNF && ocVincNF.isRateio && ocVincNF.rateio && ocVincNF.rateio.length > 0)
    ? ocVincNF.placas
    : rateioManualAtivo
      ? rateioManual.map(r=>r.placa).join(' / ')
      : $('f-nf-dest').value;

  const docNF = await uploadDocNF();
  if(docNF === null){ toast('Erro ao enviar arquivo. Tente novamente.','error'); return; }
  const docNFfinal = docNF || (editing.nf ? (NFs.find(x=>x.id===editing.nf)||{}).doc||'' : '');
  const nfCat = ($('f-nf-cat')||{value:catHerd}).value || catHerd;
  const combExtra = nfCat === 'combustiveis' ? {
    combTipo: ($('f-nf-comb-tipo')||{value:''}).value,
    combQtd: parseFloat(($('f-nf-comb-qtd')||{value:0}).value)||0,
    combVuni: parseFloat(($('f-nf-comb-vuni')||{value:0}).value)||0,
    combPgto: ($('f-nf-comb-pgto')||{value:''}).value,
    combPlaca: ($('f-nf-comb-placa')||{value:''}).value,
  } : {};
  const obj={oc:$('f-nf-oc').value,tipo:$('f-nf-tipo').value,num:$('f-nf-num').value.trim()||'NF-'+Date.now(),data:$('f-nf-data').value||today,forn,dest:destNF,valor:total,venc:vencPrincipal,pgto:'Pendente',obs:$('f-nf-obs').value.trim(),parcelas,doc:docNFfinal,categoria:nfCat,...combExtra};

  if(editing.nf){
    const i=NFs.findIndex(x=>x.id===editing.nf);
    NFs[i]={...NFs[i],...obj};
    registrarLog({
      acao: 'editou_nf',
      tabela: 'tg_nfs',
      registro_id: NFs[i].num || NFs[i].id,
      descricao: `Editou NF ${NFs[i].num || NFs[i].id} — ${NFs[i].forn || 'sem fornecedor'} — ${fmt(NFs[i].valor)}`
    });
    editing.nf=null;
    toast('NF atualizada!');
  } else {
    obj.id=newId('nf');
    NFs.unshift(obj);
    registrarLog({
      acao: 'lancou_nf',
      tabela: 'tg_nfs',
      registro_id: obj.num || obj.id,
      descricao: `Lançou NF ${obj.num || obj.id} — ${obj.forn || 'sem fornecedor'} — ${fmt(obj.valor)}`
    });
    // atualiza status da OC vinculada (considera múltiplas NFs)
    const oc=OCs.find(o=>o.num===obj.oc);
    if(oc) atualizarStatusOC(oc);

    // ── Contas a Pagar ──
    const temRateioOC = oc && oc.isRateio && oc.rateio && oc.rateio.length > 0;

    if(temRateioOC){
      // Rateio via OC: 1 título por caminhão por parcela
      parcelas.forEach((p,i)=>{
        const label=parcelas.length>1?` — Parcela ${i+1}/${parcelas.length}`:'';
        oc.rateio.forEach(r=>{
          Titulos.unshift({
            id:newId('tit'), forn:obj.forn, tipo:'Boleto NF',
            ref:obj.num+label+' ('+r.placa+')',
            valor:Math.round((p.val*(r.valor/total))*100)/100,
            emissao:obj.data, venc:p.venc, status:'Pendente',
            placa:r.placa, obs:`Rateio OC — ${r.placa}`, categoria:obj.categoria||'manutencao'
          });
        });
      });
      const msg = parcelas.length>1
        ? `NF lançada! ${parcelas.length} parcelas × ${oc.rateio.length} caminhões criadas no Contas a Pagar.`
        : `NF lançada! Custo rateado em ${oc.rateio.length} caminhão(ões) no Contas a Pagar.`;
      toast(msg);
    } else if(rateioManualAtivo && rateioManual.length > 0){
      // Rateio manual: 1 título por caminhão por parcela
      parcelas.forEach((p,i)=>{
        const label=parcelas.length>1?` — Parcela ${i+1}/${parcelas.length}`:'';
        rateioManual.forEach(r=>{
          const proporcao = total > 0 ? r.valor / total : 1 / rateioManual.length;
          Titulos.unshift({
            id:newId('tit'), forn:obj.forn, tipo:'Boleto NF',
            ref:obj.num+label+' ('+r.placa+')',
            valor:Math.round((p.val*proporcao)*100)/100,
            emissao:obj.data, venc:p.venc, status:'Pendente',
            placa:r.placa, obs:`Rateio manual — ${r.placa}`, categoria:obj.categoria||'manutencao'
          });
        });
      });
      const msg = parcelas.length>1
        ? `NF lançada! ${parcelas.length} parcelas × ${rateioManual.length} caminhões criadas no Contas a Pagar.`
        : `NF lançada! Custo rateado em ${rateioManual.length} caminhão(ões) no Contas a Pagar.`;
      toast(msg);
    } else {
      // Sem rateio: 1 título por parcela
      parcelas.forEach((p,i)=>{
        const label=parcelas.length>1?` — Parcela ${i+1}/${parcelas.length}`:'';
        Titulos.unshift({
          id:newId('tit'), forn:obj.forn, tipo:'Boleto NF',
          ref:obj.num+label, valor:p.val,
          emissao:obj.data, venc:p.venc, status:'Pendente',
          placa:obj.dest, obs:parcelas.length>1?`Parcela ${i+1} de ${parcelas.length} — NF ${obj.num}`:'',
          categoria:obj.categoria||'manutencao', combPlaca:obj.combPlaca||''
        });
      });
      const msg = parcelas.length>1
        ? `NF lançada! ${parcelas.length} parcelas criadas no Contas a Pagar.`
        : 'NF lançada e título criado no Contas a Pagar!';
      toast(msg);
    }
  }
  closeModal('modal-nf');
  $('modal-nf-title').textContent='Lançar Nota Fiscal';
  $('btn-save-nf').textContent='💾 Lançar e Criar Parcelas';
  editing.nf=null; window._nfEditandoId=null; renderAll();
}
function excluirNF(id){
  const o=NFs.find(x=>x.id===id);
  confirmDelete(`Excluir NF ${o.num}?`,`Fornecedor: ${o.forn} | Valor: ${fmt(o.valor)}`,()=>{
    NFs=NFs.filter(x=>x.id!==id); toast('NF excluída.'); renderAll();
  });
}

// ======================== CRUD TITULO ========================
function editarTitulo(id){
  const o=Titulos.find(x=>x.id===id); if(!o)return;
  editing.tit=id; populateSelects();
  $('f-tit-forn').value=o.forn||''; if($('f-tit-forn-manual'))$('f-tit-forn-manual').value=''; $('f-tit-tipo').value=o.tipo;
  $('f-tit-ref').value=o.ref; $('f-tit-valor').value=o.valor;
  $('f-tit-emissao').value=o.emissao||today; $('f-tit-venc').value=o.venc;
  $('f-tit-status').value=o.status; $('f-tit-placa').value=o.placa||'-';
  $('f-tit-obs').value=o.obs||'';
  if($('f-tit-file')) $('f-tit-file').value='';
  if($('tit-comprovante-atual')){
    $('tit-comprovante-atual').style.display = o.comprovante ? 'block' : 'none';
    $('tit-comprovante-atual').innerHTML = o.comprovante ? `📎 Comprovante atual: <a href="${o.comprovante}" target="_blank" rel="noopener">abrir arquivo</a><br><span style="color:var(--text3)">Escolha outro arquivo acima somente se quiser substituir.</span>` : '';
  }
  if($('f-tit-boleto-file')) $('f-tit-boleto-file').value='';
  if($('tit-boleto-atual')){
    $('tit-boleto-atual').style.display = o.boleto ? 'block' : 'none';
    $('tit-boleto-atual').innerHTML = o.boleto ? `📄 Boleto atual: <a href="${o.boleto}" target="_blank" rel="noopener">abrir boleto</a><br><span style="color:var(--text3)">Escolha outro arquivo somente se quiser substituir.</span>` : '';
  }
  if($('f-tit-recorrente')) $('f-tit-recorrente').checked=false;
  if($('tit-recorrente-config')) $('tit-recorrente-config').style.display='none';
  if($('tit-recorrente-box')) $('tit-recorrente-box').style.display='none';
  $('modal-tit-title').textContent='Editar Título';
  $('btn-save-tit').textContent='💾 Atualizar';
  $('modal-titulo').classList.add('open');
}
function resetTituloModal(){
  editing.tit = null;
  if($('f-tit-forn')) $('f-tit-forn').value='';
  if($('f-tit-forn-manual')) $('f-tit-forn-manual').value='';
  if($('f-tit-tipo')) $('f-tit-tipo').value='Boleto NF';
  if($('f-tit-ref')) $('f-tit-ref').value='';
  if($('f-tit-valor')) $('f-tit-valor').value='';
  if($('f-tit-emissao')) $('f-tit-emissao').value=today;
  if($('f-tit-venc')) $('f-tit-venc').value=today;
  if($('f-tit-status')) $('f-tit-status').value='Pendente';
  if($('f-tit-placa')) $('f-tit-placa').value='-';
  if($('f-tit-obs')) $('f-tit-obs').value='';
  if($('f-tit-file')) $('f-tit-file').value='';
  if($('tit-comprovante-atual')){ $('tit-comprovante-atual').style.display='none'; $('tit-comprovante-atual').innerHTML=''; }
  if($('f-tit-boleto-file')) $('f-tit-boleto-file').value='';
  if($('tit-boleto-atual')){ $('tit-boleto-atual').style.display='none'; $('tit-boleto-atual').innerHTML=''; }
  if($('tit-recorrente-box')) $('tit-recorrente-box').style.display='';
  if($('f-tit-recorrente')) $('f-tit-recorrente').checked=false;
  if($('f-tit-rec-qtd')) $('f-tit-rec-qtd').value='3';
  if($('tit-recorrente-config')) $('tit-recorrente-config').style.display='none';
  if($('tit-recorrente-linhas')) $('tit-recorrente-linhas').innerHTML='';
  if($('tit-recorrente-total')) $('tit-recorrente-total').textContent='R$ 0,00';
  $('modal-tit-title').textContent='Lançar Título — Contas a Pagar';
  $('btn-save-tit').textContent='💾 Salvar';
}
function titDateAddMonthsISO(dataISO, meses){
  const base = parseDataLocal(dataISO || today);
  const diaOriginal = base.getDate();
  const alvo = new Date(base.getFullYear(), base.getMonth() + meses, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth()+1, 0).getDate();
  alvo.setDate(Math.min(diaOriginal, ultimoDia));
  return alvo.toISOString().slice(0,10);
}
function titRecorrenteToggle(){
  const ativo = $('f-tit-recorrente') && $('f-tit-recorrente').checked;
  if($('tit-recorrente-config')) $('tit-recorrente-config').style.display = ativo ? 'block' : 'none';
  if(ativo) titRecorrenteGerar();
}
function titRecorrenteGerar(){
  if(!$('f-tit-recorrente') || !$('f-tit-recorrente').checked) return;
  const qtd = Math.max(1, Math.min(60, parseInt($('f-tit-rec-qtd').value)||1));
  const valorBase = parseFloat($('f-tit-valor').value)||0;
  const vencBase = $('f-tit-venc').value || today;
  const compBase = $('f-tit-emissao').value || vencBase;
  $('tit-recorrente-linhas').innerHTML = Array.from({length:qtd}, (_,i)=>{
    const comp = titDateAddMonthsISO(compBase, i);
    const venc = titDateAddMonthsISO(vencBase, i);
    return `<div class="tit-rec-row" style="display:grid;grid-template-columns:36px 1fr 1fr 1fr;gap:8px;align-items:center;margin-bottom:7px"><span style="font-size:11px;font-weight:600;font-family:var(--mono);color:var(--text3);text-align:center">${i+1}</span><input type="date" class="tit-rec-comp" value="${comp}" style="font-size:12px;padding:6px 9px"/><input type="date" class="tit-rec-venc" value="${venc}" style="font-size:12px;padding:6px 9px"/><input type="number" class="tit-rec-valor" value="${valorBase ? valorBase.toFixed(2) : ''}" step="0.01" min="0" style="font-size:12px;padding:6px 9px" oninput="titRecorrenteTotal()"/></div>`;
  }).join('');
  titRecorrenteTotal();
}
function titRecorrenteTotal(){
  const vals = [...document.querySelectorAll('.tit-rec-valor')].map(i=>parseFloat(i.value)||0);
  if($('tit-recorrente-total')) $('tit-recorrente-total').textContent = fmt(vals.reduce((a,b)=>a+b,0));
}
function limparNomeArquivo(nome){
  return String(nome || 'arquivo')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]+/g,'_')
    .replace(/_+/g,'_')
    .replace(/^_|_$/g,'') || 'arquivo';
}
async function uploadDocNF(){
  const input = $('f-nf-file');
  const files = input && input.files && input.files.length ? Array.from(input.files) : [];
  if(!files.length) return '';
  const maxMB = 12;
  const pasta = new Date().toISOString().slice(0,10);
  const urls = [];
  for(const file of files){
    if(file.size > maxMB * 1024 * 1024){
      toast(`Arquivo "${file.name}" muito grande. Limite: ${maxMB}MB.`, 'error');
      return null;
    }
    const nome = `nf/${pasta}/${Date.now()}_${limparNomeArquivo(file.name)}`;
    const { error } = await supa.storage.from('transgest-docs').upload(nome, file, { upsert:false, contentType:file.type || undefined });
    if(error){
      console.error(error);
      toast('Erro ao enviar arquivo: ' + error.message, 'error');
      return null;
    }
    const { data } = supa.storage.from('transgest-docs').getPublicUrl(nome);
    if(data && data.publicUrl) urls.push(data.publicUrl);
  }
  return urls.join('|');
}

async function uploadDocTitulo(){
  const input = $('f-tit-boleto-file');
  const file = input && input.files && input.files[0] ? input.files[0] : null;
  if(!file) return '';
  const maxMB = 12;
  if(file.size > maxMB * 1024 * 1024){
    toast(`Arquivo muito grande. Limite: ${maxMB}MB.`, 'error');
    return null;
  }
  const pasta = new Date().toISOString().slice(0,10);
  const nome = `boletos/${pasta}/${Date.now()}_${limparNomeArquivo(file.name)}`;
  const { error } = await supa.storage.from('transgest-docs').upload(nome, file, { upsert:false, contentType:file.type || undefined });
  if(error){
    console.error(error);
    toast('Erro ao enviar boleto: ' + error.message, 'error');
    return null;
  }
  const { data } = supa.storage.from('transgest-docs').getPublicUrl(nome);
  return data && data.publicUrl ? data.publicUrl : '';
}

async function uploadComprovanteTitulo(){
  const input = $('f-tit-file');
  const file = input && input.files && input.files[0] ? input.files[0] : null;
  if(!file) return '';
  const maxMB = 12;
  if(file.size > maxMB * 1024 * 1024){
    toast(`Arquivo muito grande. Limite: ${maxMB}MB.`, 'error');
    return null;
  }
  const pasta = new Date().toISOString().slice(0,10);
  const nome = `${pasta}/${Date.now()}_${limparNomeArquivo(file.name)}`;
  const { error } = await supa.storage.from('comprovantes').upload(nome, file, { upsert:false, contentType:file.type || undefined });
  if(error){
    console.error(error);
    toast('Erro ao enviar comprovante: ' + error.message, 'error');
    return null;
  }
  const { data } = supa.storage.from('comprovantes').getPublicUrl(nome);
  return data && data.publicUrl ? data.publicUrl : '';
}
function linkComprovante(url, icone='📎', label='Ver'){
  if(!url) return '<span style="font-size:11px;color:var(--text3)">—</span>';
  const urls = url.split('|').filter(Boolean);
  if(urls.length === 1) return `<a href="${urls[0]}" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent2);font-weight:600">${icone} ${label}</a>`;
  return urls.map((u,i)=>`<a href="${u}" target="_blank" rel="noopener" style="font-size:12px;color:var(--accent2);font-weight:600">${icone} Arq.${i+1}</a>`).join(' ');
}
async function salvarTitulo(){
  const fornSel=$('f-tit-forn').value.trim(); const fornMan=($('f-tit-forn-manual')||{value:''}).value.trim(); const forn=fornMan||fornSel; if(!forn){toast('Selecione ou informe o fornecedor','error');return;}
  const valor=parseFloat($('f-tit-valor').value)||0; if(!valor){toast('Informe o valor','error');return;}
  const venc=$('f-tit-venc').value; if(!venc){toast('Informe o vencimento','error');return;}
  const base={forn,tipo:$('f-tit-tipo').value,ref:$('f-tit-ref').value.trim()||'-',valor,emissao:$('f-tit-emissao').value||today,venc,status:$('f-tit-status').value,placa:$('f-tit-placa').value||'-',obs:$('f-tit-obs').value.trim()};
  const btnTit = $('btn-save-tit');
  if(btnTit){ btnTit.disabled = true; btnTit.textContent = '⏳ Salvando...'; }
  const boletoNovo = await uploadDocTitulo();
  if(boletoNovo === null){ toast('Erro ao enviar boleto. Tente novamente.','error'); return; }
  const comprovanteNovo = await uploadComprovanteTitulo();
  if(comprovanteNovo === null){
    if(btnTit){ btnTit.disabled = false; btnTit.textContent = editing.tit ? '💾 Atualizar' : '💾 Salvar'; }
    return;
  }
  const recorrente = !editing.tit && $('f-tit-recorrente') && $('f-tit-recorrente').checked;
  if(editing.tit){
    const i=Titulos.findIndex(x=>x.id===editing.tit);
    const comprovanteAtual = Titulos[i] && Titulos[i].comprovante ? Titulos[i].comprovante : '';
    const boletoAtual = Titulos[i] && Titulos[i].boleto ? Titulos[i].boleto : '';
    Titulos[i]={...Titulos[i],...base,comprovante:comprovanteNovo || comprovanteAtual, boleto:boletoNovo || boletoAtual};
    editing.tit=null; toast('Título atualizado!');
  } else if(recorrente){
    const rows=[...document.querySelectorAll('.tit-rec-row')];
    if(!rows.length){toast('Gere as recorrências antes de salvar','error');return;}
    const grupo = 'REC-' + Date.now();
    const total = rows.length;
    const novos = rows.map((row, idx)=>{
      const valorLinha = parseFloat(row.querySelector('.tit-rec-valor').value)||0;
      const vencLinha = row.querySelector('.tit-rec-venc').value;
      const compLinha = row.querySelector('.tit-rec-comp').value || today;
      if(!valorLinha || !vencLinha) return null;
      return {...base,id:newId('tit'),valor:valorLinha,venc:vencLinha,emissao:compLinha,ref:`${base.ref} (${idx+1}/${total})`,obs:[base.obs,`Recorrência ${idx+1}/${total}`].filter(Boolean).join(' | '),comprovante:comprovanteNovo || '',boleto:boletoNovo || '',recorrente:true,recorrenciaGrupo:grupo,recorrenciaParcela:idx+1,recorrenciaTotal:total};
    });
    if(novos.some(x=>!x)){toast('Revise vencimentos e valores das recorrências','error');return;}
    Titulos.unshift(...novos);
    registrarLog({
      acao: 'lancou_avulso_recorrente',
      tabela: 'tg_titulos',
      registro_id: grupo,
      descricao: `Criou ${total} título(s) recorrente(s) avulso(s) — ${base.forn || 'sem fornecedor'} — total ${fmt(novos.reduce((s,t)=>s+(parseFloat(t.valor)||0),0))}`
    });
    toast(`${total} título(s) recorrente(s) lançados com sucesso!`);
  } else {
    base.id=newId('tit'); base.comprovante = comprovanteNovo || ''; base.boleto = boletoNovo || ''; Titulos.unshift(base);
    registrarLog({
      acao: 'lancou_avulso',
      tabela: 'tg_titulos',
      registro_id: base.ref || base.id,
      descricao: `Criou título avulso ${base.ref || base.id} — ${base.forn || 'sem fornecedor'} — ${fmt(base.valor)}`
    });
    toast('Título lançado com sucesso!');
  }
  if(btnTit){ btnTit.disabled = false; btnTit.textContent = '💾 Salvar'; }
  closeModal('modal-titulo');
  resetTituloModal();
  editing.tit=null; renderAll();
}
function excluirTitulo(id){
  const o=Titulos.find(x=>x.id===id);
  confirmDelete(`Excluir título de ${o.forn}?`,`Valor: ${fmt(o.valor)} | Vencimento: ${o.venc}`,()=>{
    Titulos=Titulos.filter(x=>x.id!==id); toast('Título excluído.'); renderAll();
  });
}
function marcarPago(id){
  const t=Titulos.find(x=>x.id===id);
  if(t){
    t.status='Pago';
    registrarLog({
      acao: 'baixou_pagamento',
      tabela: 'tg_titulos',
      registro_id: t.ref || t.id,
      descricao: `Marcou como pago: ${t.ref || t.id} — ${t.forn || 'sem fornecedor'} — ${fmt(t.valor)}`
    });
    renderFin();
    toast('Título marcado como pago!');
  }
}

// ======================== CRUD ESTOQUE ========================
function editarEstoque(id){
  const o=Estoque.find(x=>x.id===id); if(!o)return;
  editing.est=id;
  $('f-ep-cod').value=o.cod; $('f-ep-desc').value=o.desc;
  $('f-ep-qtd').value=o.qtd; $('f-ep-valor').value=o.unit;
  $('f-ep-nf').value=o.nf||''; $('f-ep-data').value=o.ultima;
  $('modal-ep-title').textContent='Editar Peça no Estoque';
  $('btn-save-ep').textContent='💾 Atualizar';
  $('modal-entrada-peca').classList.add('open');
}
function salvarEntradaPeca(){
  const prodId = parseInt($('f-ep-prod').value);
  const p = Produtos.find(x=>x.id===prodId);
  if(!p){ toast('Selecione um produto','error'); return; }

  const qtdCompra = parseFloat($('f-ep-qtd-compra').value)||0;
  if(qtdCompra<=0){ toast('Informe a quantidade de compra','error'); return; }

  // Converte: qtd em unCompra × fator = qtd em unSaida que entra no estoque
  const qtdSaida = qtdCompra * p.fator;

  // Atualiza o estoque do produto (em unSaida)
  p.qtdEstoque += qtdSaida;
  if(p.valorUnitCompra === 0 && parseFloat($('f-ep-valor').value)>0)
    p.valorUnitCompra = parseFloat($('f-ep-valor').value);

  // Registra no histórico de entradas (Estoque[] legacy — usamos para exibir entradas)
  const entrada = {
    id: newId('est'), prodId: p.id, cod: p.cod, desc: p.nome,
    qtdCompra, unCompra: p.unCompra, qtdSaida, unSaida: p.unSaida, fator: p.fator,
    unit: parseFloat($('f-ep-valor').value)||p.valorUnitCompra,
    nf: $('f-ep-nf').value.trim(), ultima: $('f-ep-data').value||today
  };
  Estoque.unshift(entrada);

  toast(`✅ Entrada: ${qtdCompra} ${p.unCompra} → ${qtdSaida.toLocaleString('pt-BR',{maximumFractionDigits:3})} ${p.unSaida} adicionados ao estoque`);
  closeModal('modal-entrada-peca');
  $('f-ep-prod').value=''; $('f-ep-qtd-compra').value=''; $('f-ep-qtd-saida').value='';
  $('ep-conv-info').style.display='none';
  populateSelects(); renderProdutos(); renderEstoque();
}
function excluirEstoque(id){
  const o=Estoque.find(x=>x.id===id);
  confirmDelete(`Excluir peça "${o.desc}"?`,`Qtd: ${o.qtd} | Total: ${fmt(o.qtd*o.unit)}`,()=>{
    Estoque=Estoque.filter(x=>x.id!==id); toast('Peça excluída do estoque.'); renderEstoque();
  });
}

// ======================== CRUD SAIDA ========================
function editarSaida(id){
  const o=Saidas.find(x=>x.id===id); if(!o)return;
  editing.saida=id; populateSelects();
  // Select by prodId if available, else by name match
  const s=$('f-saida-peca');
  if(o.prodId){ s.value=o.prodId; }
  else {
    const p=Produtos.find(x=>x.nome===o.peca);
    if(p) s.value=p.id;
  }
  saidaProdutoChanged();
  $('f-saida-qtd').value=o.qtd; $('f-saida-placa').value=o.placa;
  $('f-saida-oc').value=o.oc; $('f-saida-resp').value=o.resp; $('f-saida-data').value=o.data;
  $('modal-saida-title').textContent='Editar Saída';
  $('btn-save-saida').textContent='💾 Atualizar';
  $('modal-saida').classList.add('open');
}
function salvarSaida(){
  const prodId = parseInt($('f-saida-peca').value);
  const p = Produtos.find(x=>x.id===prodId);
  if(!p){ toast('Selecione um produto','error'); return; }

  const qtd = parseFloat($('f-saida-qtd').value)||0;
  if(qtd<=0){ toast('Informe a quantidade','error'); return; }
  if(qtd > p.qtdEstoque){ toast(`Estoque insuficiente! Disponível: ${p.qtdEstoque.toLocaleString('pt-BR',{maximumFractionDigits:3})} ${p.unSaida}`,'error'); return; }

  const obj = {
    prodId: p.id, peca: p.nome, unSaida: p.unSaida,
    qtd, placa: $('f-saida-placa').value,
    oc: $('f-saida-oc').value.trim()||'-',
    resp: $('f-saida-resp').value.trim()||'-',
    data: $('f-saida-data').value||today
  };

  if(editing.saida){
    // Se editar, devolve a qtd anterior e desconta a nova
    const old = Saidas.find(x=>x.id===editing.saida);
    if(old && old.prodId===prodId) p.qtdEstoque += (old.qtd - qtd);
    else p.qtdEstoque -= qtd;
    const i = Saidas.findIndex(x=>x.id===editing.saida);
    Saidas[i] = {...Saidas[i], ...obj};
    editing.saida = null; toast('Saída atualizada!');
  } else {
    p.qtdEstoque -= qtd; // desconta em unSaida
    obj.id = newId('saida'); Saidas.unshift(obj);
    toast(`✅ Saída: ${qtd.toLocaleString('pt-BR',{maximumFractionDigits:3})} ${p.unSaida} de ${p.nome}`);
  }
  closeModal('modal-saida');
  $('modal-saida-title').textContent='Saída de Estoque';
  $('btn-save-saida').textContent='💾 Registrar Saída';
  editing.saida=null; populateSelects(); renderProdutos(); renderEstoque();
}
function excluirSaida(id){
  confirmDelete('Excluir este registro de saída?','',()=>{
    Saidas=Saidas.filter(x=>x.id!==id); toast('Saída excluída.'); renderEstoque();
  });
}

// ======================== CRUD FROTA ========================
function editarFrota(id){
  const o=Frota.find(x=>x.id===id); if(!o)return;
  editing.frota=id;
  $('f-fr-placa').value=o.placa; $('f-fr-modelo').value=o.modelo;
  $('f-fr-ano').value=o.ano; $('f-fr-limite').value=o.limite;
  $('f-fr-motoristas').value=o.motoristas;
  $('f-fr-tipo').value=o.tipo||'Caminhão';
  $('f-fr-cor').value=o.cor||'';
  $('f-fr-anomodelo').value=o.anomodelo||'';
  $('f-fr-chassi').value=o.chassi||'';
  $('f-fr-renavam').value=o.renavam||'';
  $('f-fr-status').value=o.status||'Ativo';
  $('f-fr-vlicen').value=o.vlicen||'';
  $('modal-frota-title').textContent='Editar Caminhão';
  $('btn-save-frota').textContent='💾 Atualizar';
  $('modal-frota').classList.add('open');
}
function salvarFrota(){
  const placa=$('f-fr-placa').value.trim().toUpperCase(); if(!placa){toast('Informe a placa','error');return;}
  const obj={
    placa,
    tipo:$('f-fr-tipo').value,
    modelo:$('f-fr-modelo').value.trim()||'-',
    cor:$('f-fr-cor').value.trim()||'-',
    ano:parseInt($('f-fr-ano').value)||2020,
    anomodelo:parseInt($('f-fr-anomodelo').value)||'',
    chassi:$('f-fr-chassi').value.trim()||'',
    renavam:$('f-fr-renavam').value.trim()||'',
    status:$('f-fr-status').value||'Ativo',
    motoristas:$('f-fr-motoristas').value.trim()||'-',
    limite:parseFloat($('f-fr-limite').value)||5000,
    vlicen:$('f-fr-vlicen').value||'',
    gasto:0
  };
  if(editing.frota){
    const i=Frota.findIndex(x=>x.id===editing.frota);
    obj.gasto=Frota[i].gasto||0;
    Frota[i]={...Frota[i],...obj};
    editing.frota=null; toast('Caminhão atualizado!');
  } else {
    obj.id=newId('frota'); Frota.push(obj); toast('Caminhão cadastrado!');
  }
  closeModal('modal-frota');
  $('modal-frota-title').textContent='Cadastrar Caminhão';
  $('btn-save-frota').textContent='💾 Salvar';
  // limpar campos adicionais
  ['f-fr-tipo','f-fr-cor','f-fr-anomodelo','f-fr-chassi','f-fr-renavam','f-fr-status',
   'f-fr-vlicen'].forEach(id=>{
    const el=$(id); if(el) el.value=id==='f-fr-tipo'?'Caminhão':id==='f-fr-status'?'Ativo':'';
  });
  editing.frota=null; populateSelects(); renderFrota(); renderDashboard();
}
function excluirFrota(id){
  const o=Frota.find(x=>x.id===id);
  confirmDelete(`Excluir caminhão ${o.placa}?`,`Modelo: ${o.modelo} | ${o.motoristas}`,()=>{
    Frota=Frota.filter(x=>x.id!==id); toast('Caminhão removido.'); populateSelects(); renderFrota(); renderDashboard();
  });
}

// ======================== CRUD EPI ESTOQUE ========================
function editarEPIEst(id){
  const o=EPIEstoque.find(x=>x.id===id); if(!o)return;
  editing.epient=id;
  $('f-epiE-desc').value=o.epi; $('f-epiE-ca').value=o.ca;
  $('f-epiE-qtd').value=o.qtd; $('f-epiE-validade').value=o.validade;
  if($('f-epiE-cat')) $('f-epiE-cat').value=o.cat||'Outros';
  if($('f-epiE-tamanho')) $('f-epiE-tamanho').value=o.tamanho||'';
  if($('f-epiE-marca')) $('f-epiE-marca').value=o.marca||'';
  if($('f-epiE-estmin')) $('f-epiE-estmin').value=o.estmin||'';
  if($('f-epiE-forn')) $('f-epiE-forn').value=o.forn||'';
  if($('f-epiE-nf')) $('f-epiE-nf').value=o.nf||'';
  if($('f-epiE-vunit')) $('f-epiE-vunit').value=o.vunit||'';
  if($('f-epiE-local')) $('f-epiE-local').value=o.local||'';
  $('modal-epient-title').textContent='Editar EPI no Estoque';
  $('btn-save-epient').textContent='💾 Atualizar';
  $('modal-epi-entrada').classList.add('open');
}
function salvarEPIEntrada(){
  const epi=$('f-epiE-desc').value.trim(); if(!epi){toast('Informe o EPI','error');return;}
  const obj={
    epi,
    ca:$('f-epiE-ca').value.trim()||'-',
    qtd:parseInt($('f-epiE-qtd').value)||0,
    validade:$('f-epiE-validade').value||'-',
    cat:$('f-epiE-cat')?$('f-epiE-cat').value:'Outros',
    tamanho:$('f-epiE-tamanho')?$('f-epiE-tamanho').value.trim():'',
    marca:$('f-epiE-marca')?$('f-epiE-marca').value.trim():'',
    estmin:$('f-epiE-estmin')?parseInt($('f-epiE-estmin').value)||0:0,
    forn:$('f-epiE-forn')?$('f-epiE-forn').value.trim():'',
    nf:$('f-epiE-nf')?$('f-epiE-nf').value.trim():'',
    vunit:$('f-epiE-vunit')?parseFloat($('f-epiE-vunit').value)||0:0,
    local:$('f-epiE-local')?$('f-epiE-local').value.trim():''
  };
  if(editing.epient){
    const i=EPIEstoque.findIndex(x=>x.id===editing.epient);
    EPIEstoque[i]={...EPIEstoque[i],...obj};
    editing.epient=null; toast('EPI atualizado!');
  } else {
    obj.id=newId('epient'); EPIEstoque.unshift(obj); toast('EPI adicionado ao estoque!');
  }
  closeModal('modal-epi-entrada');
  $('modal-epient-title').textContent='Entrada de EPI no Estoque';
  $('btn-save-epient').textContent='💾 Confirmar';
  editing.epient=null; renderEPI();
}
function excluirEPIEst(id){
  confirmDelete('Excluir este EPI do estoque?','',()=>{
    EPIEstoque=EPIEstoque.filter(x=>x.id!==id); toast('EPI excluído do estoque.'); renderEPI();
  });
}

// ======================== CRUD EPI ENTREGA ========================
function editarEPISaida(id){
  const o=EPIEntregas.find(x=>x.id===id); if(!o)return;
  editing.episaida=id; populateSelects();
  $('f-episaida-colab').value=o.colab;
  $('f-episaida-epi').value=o.epi;
  $('f-episaida-qtd').value=o.qtd; $('f-episaida-data').value=o.data;
  $('f-episaida-troca').value=o.troca;
  $('modal-episaida-title').textContent='Editar Entrega de EPI';
  $('btn-save-episaida').textContent='💾 Atualizar';
  $('modal-epi-saida').classList.add('open');
}
function salvarEPISaida(){
  const colab=$('f-episaida-colab').value.trim(); if(!colab){toast('Informe o colaborador','error');return;}
  const obj={colab,epi:$('f-episaida-epi').value,qtd:parseInt($('f-episaida-qtd').value)||1,data:$('f-episaida-data').value||today,troca:$('f-episaida-troca').value||'-'};
  if(editing.episaida){
    const i=EPIEntregas.findIndex(x=>x.id===editing.episaida);
    EPIEntregas[i]={...EPIEntregas[i],...obj};
    editing.episaida=null; toast('Entrega atualizada!');
  } else {
    obj.id=newId('episaida'); EPIEntregas.unshift(obj); toast('Entrega de EPI registrada!');
  }
  closeModal('modal-epi-saida');
  $('modal-episaida-title').textContent='Registrar Entrega de EPI';
  $('btn-save-episaida').textContent='💾 Confirmar Entrega';
  editing.episaida=null; renderEPI();
}
function excluirEPISaida(id){
  confirmDelete('Excluir este registro de entrega?','',()=>{
    EPIEntregas=EPIEntregas.filter(x=>x.id!==id); toast('Entrega excluída.'); renderEPI();
  });
}

// ======================== RENDERS ========================
function parseDataLocal(dataISO){
  if(!dataISO) return null;
  const partes = String(dataISO).split('-').map(Number);
  if(partes.length !== 3 || partes.some(isNaN)) return new Date(dataISO);
  return new Date(partes[0], partes[1]-1, partes[2]);
}
function diasAte(dataISO){
  const alvo = parseDataLocal(dataISO);
  if(!alvo) return 999999;
  const hoje = new Date();
  const baseHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - baseHoje) / 86400000);
}
function mesmoMesAtual(dataISO){
  const d = parseDataLocal(dataISO);
  if(!d) return false;
  const h = new Date();
  return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth();
}
function renderDashboard(){
  sincronizarGastosFreota();
  const gastosMap=calcGastoMesAtual();
  const gastTotal=Object.values(gastosMap).reduce((a,v)=>a+v,0);
  const pendentes=Titulos.filter(t=>t.status==='Pendente');
  const pagos=Titulos.filter(t=>t.status==='Pago');
  const pendVal=pendentes.reduce((a,t)=>a+(Number(t.valor)||0),0);
  const pagoMes=pagos.filter(t=>mesmoMesAtual(t.venc)).reduce((a,t)=>a+(Number(t.valor)||0),0);
  const vencidos=pendentes.filter(t=>diasAte(t.venc)<0);
  const venceHoje=pendentes.filter(t=>diasAte(t.venc)===0);
  const vence3=pendentes.filter(t=>{const d=diasAte(t.venc);return d>=0&&d<=3;});
  const vence7=pendentes.filter(t=>{const d=diasAte(t.venc);return d>=0&&d<=7;});
  const valorVencidos=vencidos.reduce((a,t)=>a+(Number(t.valor)||0),0);
  const valorHoje=venceHoje.reduce((a,t)=>a+(Number(t.valor)||0),0);
  const valor3=vence3.reduce((a,t)=>a+(Number(t.valor)||0),0);
  const valor7=vence7.reduce((a,t)=>a+(Number(t.valor)||0),0);
  const ocsAtivas=OCs.filter(o=>o.status!=='Cancelada');
  const ocsP=ocsAtivas.filter(o=>o.nf==='Pendente'||o.nf==='Parcialmente Recebida');

  $('dash-gasto').textContent=fmt(gastTotal);
  $('dash-ocs').textContent=ocsAtivas.length;
  $('dash-ocs-sub').textContent=ocsP.length+' sem NF';
  $('dash-titulos').textContent=fmt(pendVal);
  $('dash-titulos-sub').textContent=pendentes.length+' títulos pendentes';
  $('dash-pago-mes').textContent=fmt(pagoMes);
  $('dash-pago-mes-sub').textContent=pagos.filter(t=>mesmoMesAtual(t.venc)).length+' títulos pagos no mês';
  $('dash-vencidos').textContent=fmt(valorVencidos);
  $('dash-vencidos-sub').textContent=vencidos.length+' título'+(vencidos.length!==1?'s':'')+' em atraso';
  $('dash-vence-hoje').textContent=fmt(valorHoje);
  $('dash-vence-hoje-sub').textContent=venceHoje.length+' vencimento'+(venceHoje.length!==1?'s':'')+' hoje';
  $('dash-vence-3').textContent=fmt(valor3);
  $('dash-vence-3-sub').textContent=vence3.length+' título'+(vence3.length!==1?'s':'')+' até 3 dias';
  $('dash-vence-7').textContent=fmt(valor7);
  $('dash-vence-7-sub').textContent=vence7.length+' título'+(vence7.length!==1?'s':'')+' até 7 dias';

  const totalProdsSaldo = Produtos.reduce((a,p)=>a+(Number(p.qtdEstoque)||0),0);
  $('dash-estoque').textContent=totalProdsSaldo.toLocaleString('pt-BR',{maximumFractionDigits:0});
  const baixoEstoque = Produtos.filter(p=>(Number(p.minimo)||0)>0&&(Number(p.qtdEstoque)||0)<=Number(p.minimo)).length;
  $('dash-estoque-sub').textContent=Produtos.length+' produtos'+(baixoEstoque>0?' | ⚠️ '+baixoEstoque+' abaixo do mínimo':'');
  $('badge-oc').textContent='⚠ '+ocsP.length+' OC'+(ocsP.length!==1?'s':'')+' sem NF';
  const badgeFin = $('badge-fin');
  if(badgeFin){
    if(vencidos.length>0){
      badgeFin.style.display='inline-flex';
      badgeFin.textContent='🔴 '+vencidos.length+' conta'+(vencidos.length!==1?'s':'')+' vencida'+(vencidos.length!==1?'s':'');
    } else if(venceHoje.length>0){
      badgeFin.style.display='inline-flex';
      badgeFin.textContent='🟡 '+venceHoje.length+' vence'+(venceHoje.length!==1?'m':'')+' hoje';
    } else if(vence3.length>0){
      badgeFin.style.display='inline-flex';
      badgeFin.textContent='🟠 '+vence3.length+' vence'+(vence3.length!==1?'m':'')+' em 3 dias';
    } else {
      badgeFin.style.display='none';
    }
  }

  if(vencidos.length>0){
    const nomes=vencidos.slice(0,3).map(t=>t.forn).join(', ');
    $('dash-fin-alert-bar').style.display='flex';
    $('dash-fin-alert-bar').innerHTML=`🚨 Existem <strong>${vencidos.length}</strong> título(s) vencido(s), totalizando <strong>${fmt(valorVencidos)}</strong>. Principais: <strong>${nomes}</strong>. <strong style="cursor:pointer;text-decoration:underline;margin-left:6px" onclick="showScreen('financeiro',null)">Abrir financeiro →</strong>`;
  } else if(venceHoje.length>0){
    $('dash-fin-alert-bar').style.display='flex';
    $('dash-fin-alert-bar').innerHTML=`⚠ Hoje vence <strong>${fmt(valorHoje)}</strong> em ${venceHoje.length} título(s). <strong style="cursor:pointer;text-decoration:underline;margin-left:6px" onclick="showScreen('financeiro',null)">Abrir financeiro →</strong>`;
  } else {
    $('dash-fin-alert-bar').style.display='none';
  }

  if(ocsP.length>0){
    const nomes=ocsP.slice(0,3).map(o=>o.forn).join(', ');
    $('dash-alert-bar').style.display='flex';
    $('dash-alert-bar').innerHTML=`⚠ OCs aguardando faturamento: <strong>${nomes}</strong>. <strong style="cursor:pointer;text-decoration:underline;margin-left:6px" onclick="showScreen('pendentes',null)">Ver detalhes →</strong>`;
  } else {
    $('dash-alert-bar').style.display='none';
  }

  // Insights rápidos operacionais de OCs (mês atual)
  const ocsMes = OCs.filter(o => o.status!=='Cancelada' && mesmoMesAtual(o.data));
  const totalOCsMes = ocsMes.length;
  const valorOCsMes = ocsMes.reduce((acc,o)=>acc+(Number(o.valor)||0),0);
  const ocsPendentesNF = OCs.filter(o => o.status!=='Cancelada' && o.nf !== 'Recebida');

  const placaMap = {};
  ocsMes.forEach(o => {
    const placas = o.isRateio && Array.isArray(o.rateio)
      ? o.rateio.map(r => r.placa)
      : String(o.placas || '').split(',');
    placas.forEach(p => {
      const placa = String(p || '').trim();
      if(!placa || placa === '-' || placa.toLowerCase() === 'nenhuma') return;
      placaMap[placa] = (placaMap[placa] || 0) + 1;
    });
  });
  const topPlacaOC = Object.entries(placaMap).sort((a,b)=>b[1]-a[1])[0] || null;

  const safeAttr = v => String(v || '-').replace(/"/g,'&quot;');
  const insightCard = (icone, titulo, valor, sub, cor) => `
    <div class="stat-card" style="padding:13px 14px">
      <div class="stat-label">${icone} ${titulo}</div>
      <div class="stat-value" style="font-size:16px;color:${cor||'var(--text)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${safeAttr(valor)}">${valor || '-'}</div>
      <div class="stat-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${safeAttr(sub || 'Sem dados suficientes')}">${sub || 'Sem dados suficientes'}</div>
    </div>`;

  const insightsEl = $('dash-insights');
  if(insightsEl){
    insightsEl.innerHTML =
      insightCard('📄','OCs emitidas no mês', totalOCsMes, totalOCsMes === 1 ? '1 ordem emitida no mês atual' : `${totalOCsMes} ordens emitidas no mês atual`, 'var(--accent2)') +
      insightCard('🚚','Placa que mais abriu OC', topPlacaOC ? topPlacaOC[0] : '-', topPlacaOC ? `${topPlacaOC[1]} OC${topPlacaOC[1]!==1?'s':''} no mês atual` : 'Sem OCs por placa no mês', 'var(--amber)') +
      insightCard('💰','Valor total das OCs no mês', fmt(valorOCsMes), totalOCsMes ? `Somando ${totalOCsMes} OC${totalOCsMes!==1?'s':''}` : 'Sem OCs emitidas no mês', 'var(--accent)') +
      insightCard('⚠️','OCs pendentes de NF', ocsPendentesNF.length, ocsPendentesNF.length === 1 ? '1 OC aguardando NF' : `${ocsPendentesNF.length} OCs aguardando NF`, 'var(--red)');
  }

  let df='';
  [...Frota].sort((a,b)=>(gastosMap[b.placa]||0)-(gastosMap[a.placa]||0)).slice(0,8).forEach(f=>{
    const limite=Number(f.limite)||0;
    const gasto=gastosMap[f.placa]||0;
    const pct=limite>0?Math.min(100,Math.round(gasto/limite*100)):0;
    const cls=pct>85?'danger':pct>65?'warn':'';
    df+=`<tr><td class="mono" style="color:var(--accent)">${f.placa}</td><td class="mono">${fmt(gasto)}</td><td class="mono" style="color:var(--text3)">${fmt(limite)}</td><td style="min-width:90px"><div class="progress-bar-wrap"><div class="progress-bar ${cls}" style="width:${pct}%"></div></div><span style="font-size:10px;color:var(--text3)">${pct}%</span></td></tr>`;
  });
  $('tb-dash-frota').innerHTML=df||'<tr><td colspan="4" class="empty">Sem dados</td></tr>';
  let dv='';
  [...Titulos].filter(t=>t.status==='Pendente').sort((a,b)=>parseDataLocal(a.venc)-parseDataLocal(b.venc)).slice(0,8).forEach(t=>{
    const days=diasAte(t.venc);
    const sc=days<0?'cr':days<=3?'ca':'cb';
    const label=days<0?`${Math.abs(days)}d atraso`:days===0?'Hoje':`${days}d`;
    dv+=`<tr><td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${t.forn}">${t.forn}</td><td class="mono">${fmt(t.valor)}</td><td style="font-size:11px">${formatarDataBR(t.venc)}</td><td>${chip(label,sc)}</td></tr>`;
  });
  $('tb-dash-venc').innerHTML=dv||'<tr><td colspan="4" class="empty">Sem vencimentos</td></tr>';
}

function setFiltroOC(filtro){
  filtroOCAtual = filtro || 'todas';
  ['todas','ativas','canceladas'].forEach(f=>{
    const el=$('oc-filter-'+f);
    if(el) el.classList.toggle('on', filtroOCAtual===f);
  });
  renderOC();
}

function badgeStatusOC(cancelada){
  return cancelada
    ? '<span class="oc-status-card cancelada">🚫 Cancelada</span>'
    : '<span class="oc-status-card ativa">● Ativa</span>';
}

function renderOC(){
  const ativas = OCs.filter(o=>o.status!=='Cancelada').length;
  const canceladas = OCs.length - ativas;
  $('oc-count').textContent = canceladas ? `${ativas} ativas / ${canceladas} canceladas / ${OCs.length} total` : OCs.length;

  ['todas','ativas','canceladas'].forEach(f=>{
    const el=$('oc-filter-'+f);
    if(el) el.classList.toggle('on', filtroOCAtual===f);
  });

  let lista = OCs.map(o=>{ if(!o.status) o.status='Ativa'; return o; });
  if(filtroOCAtual==='ativas') lista = lista.filter(o=>o.status!=='Cancelada');
  if(filtroOCAtual==='canceladas') lista = lista.filter(o=>o.status==='Cancelada');

  const vazio = filtroOCAtual==='ativas'
    ? 'Nenhuma OC ativa encontrada'
    : filtroOCAtual==='canceladas'
      ? 'Nenhuma OC cancelada encontrada'
      : 'Nenhuma OC cadastrada';

  $('tb-oc').innerHTML=lista.length?lista.map(o=>{
    const cancelada = o.status === 'Cancelada';
    const rBadge = o.isRateio ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(167,139,250,.14);color:var(--purple);border:1px solid rgba(167,139,250,.25);margin-left:4px">🔀 ${o.rateio.length} caminhões</span>` : '';
    const motivo = cancelada && o.motivoCancelamento ? `<div class="oc-motivo">Motivo: ${o.motivoCancelamento}</div>` : '';
    const num = `<div class="oc-num-wrap"><span>${o.num}</span>${cancelada?'<span class="oc-cancel-tag">Cancelada</span>':''}</div>`;
    const botoes = cancelada
      ? `<button class="btn btn-secondary btn-sm" onclick="gerarPDFOC(${o.id})">📄 PDF</button><button class="btn btn-muted btn-sm" onclick="verHistoricoOC(${o.id})">🕘 Histórico</button>`
      : `<button class="btn btn-secondary btn-sm" onclick="gerarPDFOC(${o.id})">📄 PDF</button><button class="btn btn-edit btn-sm" onclick="editarOC(${o.id})">✏️</button><button class="btn btn-amber btn-sm" onclick="cancelarOC(${o.id})">🚫 Cancelar</button><button class="btn btn-muted btn-sm" onclick="verHistoricoOC(${o.id})">🕘</button>`;
    return `<tr class="${cancelada?'tr-cancelada':''}" data-status="${cancelada?'cancelada':'ativa'}">
    <td class="mono" style="color:var(--accent2);font-size:11px">${num}</td>
    <td style="font-size:11px">${o.data}</td>
    <td style="max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${o.forn}">${o.forn}${motivo}</td>
    <td class="mono" style="font-size:11px">${o.placas}${rBadge}</td>
    <td>${chip(o.tipo,'cgr')}</td>
    <td class="mono">${fmt(o.valor)}</td>
    <td>${badgeStatusOC(cancelada)}</td>
    <td>${chipS(cancelada ? 'Cancelada' : o.nf)}</td>
    <td><div class="action-btns">${botoes}</div></td>
  </tr>`;
  }).join(''):`<tr><td colspan="9" class="empty">${vazio}</td></tr>`;
}

function renderNF(){
  $('nf-count').textContent=NFs.length;
  $('tb-nf').innerHTML=NFs.length?NFs.map(n=>{
    const nParc=(n.parcelas&&n.parcelas.length>1)?`<span style="font-size:10px;padding:1px 5px;border-radius:8px;background:rgba(167,139,250,.14);color:var(--purple);border:1px solid rgba(167,139,250,.25);margin-left:4px">${n.parcelas.length}×</span>`:'';
    const vencDisplay=n.parcelas&&n.parcelas.length>1?`${n.parcelas[0].venc} → ${n.parcelas[n.parcelas.length-1].venc}`:n.venc;
    return `<tr>
      <td class="mono" style="color:var(--accent2);font-size:10px">${n.oc}</td>
      <td>${chip(n.tipo,'cgr')}</td>
      <td class="mono">${n.num}${nParc}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.forn}</td>
      <td class="mono" style="font-size:11px">${n.dest}</td>
      <td class="mono">${fmt(n.valor)}</td>
      <td style="font-size:11px;color:var(--text2)">${vencDisplay}</td>
      <td>${chipS(n.pgto)}</td>
      <td>${linkComprovante(n.doc,'📄','NF/Bol')}</td>
      <td>${acts('editarNF('+n.id+')','excluirNF('+n.id+')')}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="10" class="empty">Nenhuma NF lançada</td></tr>';
}

function parseISODateLocal(v){
  if(!v) return null;
  const p=String(v).split('-').map(Number);
  if(p.length!==3 || !p[0] || !p[1] || !p[2]) return null;
  return new Date(p[0],p[1]-1,p[2]);
}
function isoDateLocal(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function startOfMonthLocal(d){return new Date(d.getFullYear(),d.getMonth(),1);}
function endOfMonthLocal(d){return new Date(d.getFullYear(),d.getMonth()+1,0);}
function addDaysLocal(d,n){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x;}
function sameOrAfterDate(a,b){return a && b && a.getTime()>=b.getTime();}
function sameOrBeforeDate(a,b){return a && b && a.getTime()<=b.getTime();}
function diasAte(venc){
  const v=parseISODateLocal(venc), h=new Date();
  if(!v) return 0;
  const hoje=new Date(h.getFullYear(),h.getMonth(),h.getDate());
  return Math.round((v-hoje)/86400000);
}
function finPopulateFiltros(){
  const sf=$('fin-filtro-forn'), sp=$('fin-filtro-placa');
  if(!sf || !sp) return;
  const curF=sf.value, curP=sp.value;
  const forns=[...new Set(Titulos.map(t=>t.forn).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const placas=[...new Set(Titulos.map(t=>t.placa).filter(p=>p && p!=='-'))].sort();
  sf.innerHTML='<option value="">Todos</option>'+forns.map(f=>`<option value="${f}">${f}</option>`).join('');
  sp.innerHTML='<option value="">Todas</option>'+placas.map(p=>`<option value="${p}">${p}</option>`).join('');
  if(forns.includes(curF)) sf.value=curF;
  if(placas.includes(curP)) sp.value=curP;
}
function finFiltroChanged(){
  const periodo=$('fin-filtro-periodo')?.value || 'mes';
  const show=periodo==='personalizado';
  const de=$('fin-filtro-de'), ate=$('fin-filtro-ate');
  if(de) de.style.display=show?'':'none';
  if(ate) ate.style.display=show?'':'none';
  if(show && de && ate && (!de.value || !ate.value)){
    const h=new Date(); de.value=isoDateLocal(startOfMonthLocal(h)); ate.value=isoDateLocal(endOfMonthLocal(h));
  }
  renderFin();
}
function resetFinFiltros(){
  if($('fin-filtro-periodo')) $('fin-filtro-periodo').value='mes';
  if($('fin-filtro-status')) $('fin-filtro-status').value='';
  if($('fin-filtro-forn')) $('fin-filtro-forn').value='';
  if($('fin-filtro-placa')) $('fin-filtro-placa').value='';
  finFiltroChanged();
}
function getTitulosFinanceiroFiltrados(){
  const periodo=$('fin-filtro-periodo')?.value || 'mes';
  const status=$('fin-filtro-status')?.value || '';
  const forn=$('fin-filtro-forn')?.value || '';
  const placa=$('fin-filtro-placa')?.value || '';
  const hoje=new Date();
  const h=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate());
  let de=null, ate=null;
  if(periodo==='mes'){ de=startOfMonthLocal(h); ate=endOfMonthLocal(h); }
  if(periodo==='proximos7'){ de=h; ate=addDaysLocal(h,7); }
  if(periodo==='personalizado'){ de=parseISODateLocal($('fin-filtro-de')?.value); ate=parseISODateLocal($('fin-filtro-ate')?.value); }
  return Titulos.filter(t=>{
    const v=parseISODateLocal(t.venc);
    if(status && t.status!==status) return false;
    if(forn && t.forn!==forn) return false;
    if(placa && t.placa!==placa) return false;
    if(periodo==='vencidos') return t.status==='Pendente' && v && v<h;
    if(de && v && !sameOrAfterDate(v,de)) return false;
    if(ate && v && !sameOrBeforeDate(v,ate)) return false;
    return true;
  });
}
function renderFin(){
  if(!$('fin-count')) return;
  finPopulateFiltros();
  const lista=getTitulosFinanceiroFiltrados();
  $('fin-count').textContent=`${lista.length}/${Titulos.length}`;
  const pend=lista.filter(t=>t.status==='Pendente');
  const pago=lista.filter(t=>t.status==='Pago');
  const pendVal=pend.reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
  const pagoVal=pago.reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
  const vencidos=pend.filter(t=>diasAte(t.venc)<0);
  const vence7=pend.filter(t=>{const d=diasAte(t.venc);return d>=0&&d<=7;}).reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
  const venceHoje=pend.filter(t=>diasAte(t.venc)===0).reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
  $('fin-kpis').innerHTML=
    `<div class="stat-card"><div class="stat-label">Pendente filtrado</div><div class="stat-value" style="font-size:17px;color:var(--red)">${fmt(pendVal)}</div><div class="stat-sub">${pend.length} títulos</div></div>`+
    `<div class="stat-card"><div class="stat-label">Vencidos</div><div class="stat-value" style="font-size:17px;color:var(--red)">${fmt(vencidos.reduce((a,t)=>a+(parseFloat(t.valor)||0),0))}</div><div class="stat-sub">${vencidos.length} títulos</div></div>`+
    `<div class="stat-card"><div class="stat-label">Vence em 7 dias</div><div class="stat-value" style="font-size:17px;color:var(--amber)">${fmt(vence7)}</div><div class="stat-sub">inclui hoje: ${fmt(venceHoje)}</div></div>`+
    `<div class="stat-card"><div class="stat-label">Pago filtrado</div><div class="stat-value" style="font-size:17px;color:var(--accent)">${fmt(pagoVal)}</div><div class="stat-sub">${pago.length} títulos</div></div>`;
  $('tb-fin').innerHTML=lista.length?[...lista].sort((a,b)=>parseISODateLocal(a.venc)-parseISODateLocal(b.venc)).map(t=>{
    const d=diasAte(t.venc);
    const vencInfo=t.status==='Pendente' ? (d<0?`<span style="color:var(--red);font-size:10px">${Math.abs(d)}d atraso</span>`:d===0?`<span style="color:var(--red);font-size:10px">vence hoje</span>`:d<=7?`<span style="color:var(--amber);font-size:10px">em ${d}d</span>`:`<span style="color:var(--text3);font-size:10px">em ${d}d</span>`) : `<span style="color:var(--accent);font-size:10px">pago</span>`;
    const pgBtn=t.status==='Pendente'
      ?`<button class="btn btn-save btn-sm" onclick="marcarPago(${t.id})" style="font-size:10px">✓ Pagar</button>`
      :`<span style="font-size:11px;color:var(--accent)">✓ Quitado</span>`;
    return `<tr>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${t.forn}">${t.forn}</td>
      <td><span style="font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(0,112,214,.09);color:var(--accent2);font-weight:600">${categoriaLabel(t.categoria||'manutencao')}</span></td>
      <td>${chip(t.tipo,'cgr')}</td>
      <td class="mono" style="font-size:11px">${t.ref}</td>
      <td class="mono" style="font-size:11px;color:var(--accent2)">${t.placa||'-'}</td>
      <td class="mono">${fmt(t.valor)}</td>
      <td style="font-size:11px">${formatarDataBR(t.venc)}<br>${vencInfo}</td>
      <td>${chipS(t.status)}</td>
      <td>${linkComprovante(t.boleto,"📄","Boleto")}</td><td>${linkComprovante(t.comprovante,"📎","Comp.")}</td>
      <td><div class="action-btns">${pgBtn}<button class="btn btn-edit btn-sm" onclick="editarTitulo(${t.id})">✏️</button><button class="btn btn-danger btn-sm" onclick="excluirTitulo(${t.id})">🗑️</button></div></td>
    </tr>`;
  }).join(''):'<tr><td colspan="10" class="empty">Nenhum título encontrado com esses filtros.</td></tr>';
}

function renderEstoque(){
  // Tabela de estoque atual (baseada em Produtos)
  const prods = Produtos;
  $('est-count').textContent = prods.length;
  const tb = $('tb-estoque');
  if(tb){
    tb.innerHTML = prods.length ? prods.map(p=>{
      const baixo = p.minimo>0 && p.qtdEstoque<=p.minimo;
      const qtdFmt = p.qtdEstoque.toLocaleString('pt-BR',{maximumFractionDigits:3});
      return `<tr>
        <td class="mono" style="color:var(--accent2);font-size:11px">${p.cod}</td>
        <td><strong>${p.nome}</strong><br><span style="font-size:10px;color:var(--text3)">${p.cat}</span></td>
        <td class="mono" style="font-weight:600;color:${baixo?'var(--red)':'var(--text)'}">
          ${qtdFmt} ${p.unSaida}${baixo?' ⚠️':''}
        </td>
        <td style="font-size:11px;color:var(--text3)">Compra: ${p.unCompra}<br>Fator: ${p.fator}×</td>
        <td class="mono">${fmt(p.valorUnitCompra)}</td>
        <td class="mono">${fmt(p.qtdEstoque * (p.valorUnitCompra/p.fator))}</td>
        <td><button class="btn btn-edit btn-sm" onclick="openModalProduto('editar',${p.id})">✏️ Produto</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="empty">Nenhum produto cadastrado. Vá em Cadastros → Produtos.</td></tr>';
  }
  // Tabela histórico de saídas
  $('saidas-count').textContent=Saidas.length;
  $('tb-saidas').innerHTML=Saidas.length?Saidas.map(s=>`<tr>
    <td style="font-size:11px">${s.data}</td>
    <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.peca}</td>
    <td class="mono">${(s.qtd||0).toLocaleString('pt-BR',{maximumFractionDigits:3})} ${s.unSaida||''}</td>
    <td class="mono" style="color:var(--accent)">${s.placa}</td>
    <td>${s.resp}</td>
    <td class="mono" style="color:var(--accent2);font-size:11px">${s.oc}</td>
    <td>${acts(`editarSaida(${s.id})`,`excluirSaida(${s.id})`)}</td>
  </tr>`).join(''):'<tr><td colspan="7" class="empty">Sem saídas registradas</td></tr>';
}

function renderFrota(){
  sincronizarGastosFreota();
  $('frota-count').textContent=Frota.length;
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const d30=new Date(hoje); d30.setDate(d30.getDate()+30);
  function vencBadge(data,label){
    if(!data||data==='-') return '';
    const dt=new Date(data+'T00:00:00');
    if(dt<hoje) return `<span class="chip cr" style="font-size:9px;margin-right:3px">⚠ ${label} vencido</span>`;
    if(dt<=d30) return `<span class="chip ca" style="font-size:9px;margin-right:3px">⏰ ${label} 30d</span>`;
    return '';
  }
  const statusMap={'Ativo':'cg','Manutenção':'ca','Inativo':'cgr'};
  $('frota-cards').innerHTML=Frota.length?Frota.map(f=>{
    const pct=Math.min(100,Math.round((f.gasto||0)/(f.limite||1)*100));
    const cls=pct>85?'danger':pct>65?'warn':'';
    const color=pct>85?'var(--red)':pct>65?'var(--amber)':'var(--accent)';
    const chipCls=pct>85?'cr':pct>65?'ca':'cg';
    const stCls=statusMap[f.status||'Ativo']||'cg';
    const alertas=vencBadge(f.vlicen,'Licenc.')+vencBadge(f.vseguro,'Seguro');
    return `<div class="card-block" style="margin-bottom:0;border-left:3px solid ${f.status==='Inativo'?'var(--text3)':f.status==='Manutenção'?'var(--amber)':'var(--accent)'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-size:16px;font-weight:700;font-family:var(--mono);color:var(--accent);letter-spacing:.04em">${f.placa}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:1px">${f.tipo||'Caminhão'} · ${f.modelo||'-'} · ${f.ano||'—'}${f.cor&&f.cor!=='-'?' · '+f.cor:''}</div>
        </div>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          ${chip(f.status||'Ativo',stCls)}
          ${chip(pct+'%',chipCls)}
          <button class="btn btn-edit btn-sm" onclick="editarFrota(${f.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="excluirFrota(${f.id})">🗑️</button>
        </div>
      </div>
      ${alertas?`<div style="margin-bottom:7px">${alertas}</div>`:''}
      <div style="font-size:12px;color:var(--text2);margin-bottom:5px">👤 ${f.motoristas||'-'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;color:var(--text3);margin-bottom:7px">
        ${f.chassi?`<div>Chassi: <span style="color:var(--text);font-family:var(--mono);font-size:9px">${f.chassi}</span></div>`:''}
        ${f.renavam?`<div>RENAVAM: <span style="color:var(--text);font-family:var(--mono)">${f.renavam}</span></div>`:''}
        ${f.vseguro?`<div>Venc. seguro: <span style="color:var(--text)">${f.vseguro}</span></div>`:''}
        ${f.vlicen?`<div>Venc. licenc.: <span style="color:var(--text)">${f.vlicen}</span></div>`:''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
        <span style="color:var(--text3)">Gasto mensal</span>
        <span class="mono" style="color:${color};font-weight:600">${fmt(f.gasto||0)}</span>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar ${cls}" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:4px">
        <span>Limite: ${fmt(f.limite||0)}</span><span>Saldo: ${fmt((f.limite||0)-(f.gasto||0))}</span>
      </div>
    </div>`;
  }).join(''):'<div class="empty" style="grid-column:1/-1">Nenhum veículo cadastrado. Clique em "+ Cadastrar Veículo" para começar.</div>';
  // Gerar alertas de vencimento
  const alertasBar=$('frota-alertas-bar');
  if(alertasBar){
    const alertas=[];
    Frota.forEach(f=>{
      function checkDoc(data,label){
        if(!data) return;
        const dt=new Date(data+'T00:00:00');
        if(dt<hoje) alertas.push(`⚠ ${f.placa}: <strong>${label} VENCIDO</strong>`);
        else if(dt<=d30) alertas.push(`⏰ ${f.placa}: ${label} vence em ${Math.ceil((dt-hoje)/864e5)} dias`);
      }
      checkDoc(f.vlicen,'Licenciamento');
      checkDoc(f.vseguro,'Seguro');
    });
    if(alertas.length){
      alertasBar.style.display='flex';
      alertasBar.style.flexDirection='column';
      alertasBar.style.gap='4px';
      alertasBar.innerHTML=alertas.map(a=>`<div style="font-size:12px">${a}</div>`).join('');
    } else {
      alertasBar.style.display='none';
    }
  }
}

function renderEPI(){
  $('epi-est-count').textContent=EPIEstoque.length;
  $('epi-ent-count').textContent=EPIEntregas.length;
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const d30=new Date(hoje); d30.setDate(d30.getDate()+30);
  function vencCls(data){
    if(!data||data==='-') return '';
    const dt=new Date(data+'T00:00:00');
    if(dt<hoje) return ' style="color:var(--red);font-weight:600"';
    if(dt<=d30) return ' style="color:var(--amber);font-weight:600"';
    return '';
  }
  // Atualizar cabeçalho da tabela EPI estoque
  const thEst=document.querySelector('#tb-epi-est')?.closest('table')?.querySelector('thead tr');
  if(thEst) thEst.innerHTML='<th>EPI / Descrição</th><th>Categoria</th><th>Tamanho</th><th>Marca</th><th>CA Nº</th><th>Qtd</th><th>Mín.</th><th>Validade</th><th>Local</th><th style="width:100px">Ações</th>';
  $('tb-epi-est').innerHTML=EPIEstoque.length?EPIEstoque.map(e=>{
    const baixoEstoque=e.estmin&&e.qtd<=e.estmin;
    return `<tr${baixoEstoque?' style="background:rgba(200,120,0,.06)"':''}>
      <td><strong>${e.epi}</strong>${baixoEstoque?'<br><span style="font-size:9px;color:var(--amber)">⚠ Estoque baixo</span>':''}</td>
      <td style="font-size:11px;color:var(--text3)">${e.cat||'-'}</td>
      <td style="font-size:11px">${e.tamanho||'-'}</td>
      <td style="font-size:11px">${e.marca||'-'}</td>
      <td class="mono" style="font-size:10px;color:var(--text3)">${e.ca||'-'}</td>
      <td class="mono" style="font-weight:600${baixoEstoque?';color:var(--amber)':''}">${e.qtd}</td>
      <td class="mono" style="font-size:11px;color:var(--text3)">${e.estmin||0}</td>
      <td style="font-size:11px"${vencCls(e.validade)}>${e.validade||'-'}</td>
      <td style="font-size:10px;color:var(--text3)">${e.local||'-'}</td>
      <td>${acts(`editarEPIEst(${e.id})`,`excluirEPIEst(${e.id})`)}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="10" class="empty">Sem EPIs cadastrados no estoque</td></tr>';
  $('tb-epi-ent').innerHTML=EPIEntregas.length?EPIEntregas.map(e=>`<tr>
    <td>${e.colab}</td><td style="font-size:11px">${e.epi}</td>
    <td class="mono">${e.qtd}</td><td style="font-size:11px">${e.data}</td>
    <td style="font-size:11px;color:var(--text3)"${vencCls(e.troca)}>${e.troca||'-'}</td>
    <td>${acts(`editarEPISaida(${e.id})`,`excluirEPISaida(${e.id})`)}</td>
  </tr>`).join(''):'<tr><td colspan="6" class="empty">Sem entregas registradas</td></tr>';
}

function renderFrotaTabela(){
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const d30=new Date(hoje); d30.setDate(d30.getDate()+30);
  function vc(data){
    if(!data) return '-';
    const dt=new Date(data+'T00:00:00');
    if(dt<hoje) return `<span style="color:var(--red);font-weight:600">⚠ ${data}</span>`;
    if(dt<=d30) return `<span style="color:var(--amber);font-weight:600">⏰ ${data}</span>`;
    return `<span style="font-size:11px">${data}</span>`;
  }
  const statusMap={'Ativo':'cg','Manutenção':'ca','Inativo':'cgr'};
  const tb=$('tb-frota-tabela');
  if(!tb)return;
  tb.innerHTML=Frota.length?Frota.map(f=>{
    const pct=Math.min(100,Math.round((f.gasto||0)/(f.limite||1)*100));
    const chipCls=pct>85?'cr':pct>65?'ca':'cg';
    return `<tr>
      <td class="mono" style="font-weight:700;color:var(--accent)">${f.placa}</td>
      <td style="font-size:11px">${f.tipo||'Caminhão'}</td>
      <td style="font-size:12px">${f.modelo||'-'} ${f.cor&&f.cor!=='-'?'· '+f.cor:''}</td>
      <td class="mono" style="font-size:11px">${f.ano||'-'}</td>
      <td style="font-size:11px">${f.motoristas||'-'}</td>
      <td>${chip(f.status||'Ativo',statusMap[f.status||'Ativo']||'cg')}</td>
      <td class="mono">${fmt(f.gasto||0)}</td>
      <td class="mono">${fmt(f.limite||0)}</td>
      <td>${chip(pct+'%',chipCls)}</td>
      <td>${vc(f.vlicen)}</td>
      <td>${acts(`editarFrota(${f.id})`,`excluirFrota(${f.id})`)}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="13" class="empty">Nenhum veículo cadastrado.</td></tr>';
}
function setFrotaTab(tab, el){
  document.querySelectorAll('.tab-row .tab').forEach(t=>t.classList.remove('on'));
  if(el) el.classList.add('on');
  $('frota-cards').style.display=tab==='cards'?'grid':'none';
  const tabDiv=$('frota-tabela');
  if(tabDiv) tabDiv.style.display=tab==='tabela'?'block':'none';
  if(tab==='tabela') renderFrotaTabela();
}
function exportFrotaXLSX(){
  if(typeof XLSX==='undefined'){toast('XLSX não disponível','error');return;}
  const ws=XLSX.utils.json_to_sheet(Frota.map(f=>({
    Placa:f.placa,Tipo:f.tipo||'Caminhão',Modelo:f.modelo,Cor:f.cor||'-',
    'Ano Fab.':f.ano,'Ano Modelo':f.anomodelo||'',Chassi:f.chassi||'',RENAVAM:f.renavam||'',
    Status:f.status||'Ativo',Motorista:f.motoristas,
    'Limite Mensal':f.limite,'Gasto Mês':f.gasto||0,
    'Venc. Licenc.':f.vlicen||'',
    'Venc. Seguro':f.vseguro||''
  })));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Frota');
  XLSX.writeFile(wb,`frota_${today}.xlsx`);
  toast('Excel exportado!');
}


function calcGastoPorPlaca(){
  // Calcula gasto real por placa a partir das NFs lançadas (pgto != Aguardando)
  // Para NFs de OCs rateadas → usa o rateio da OC
  // Para NFs de OCs simples ou sem OC → usa a placa da NF
  const gastos = {}; // { placa: { serv, pcs, total } }
  Frota.forEach(f => { gastos[f.placa] = { serv: 0, pcs: 0, total: 0 }; });

  NFs.forEach(nf => {
    const oc = OCs.find(o => o.num === nf.oc);
    const isPeca = nf.tipo && nf.tipo.toLowerCase().includes('peça');

    if(oc && oc.isRateio && oc.rateio && oc.rateio.length > 0){
      // NF de OC rateada: distribui pelo rateio da OC
      oc.rateio.forEach(r => {
        if(!gastos[r.placa]) gastos[r.placa] = { serv: 0, pcs: 0, total: 0 };
        if(isPeca) gastos[r.placa].pcs = Math.round((gastos[r.placa].pcs + r.valor)*100)/100;
        else        gastos[r.placa].serv = Math.round((gastos[r.placa].serv + r.valor)*100)/100;
        gastos[r.placa].total = Math.round((gastos[r.placa].total + r.valor)*100)/100;
      });
    } else {
      // NF simples: usa a placa/dest da NF
      const placa = nf.dest;
      if(placa && gastos[placa]){
        if(isPeca) gastos[placa].pcs = Math.round((gastos[placa].pcs + nf.valor)*100)/100;
        else        gastos[placa].serv = Math.round((gastos[placa].serv + nf.valor)*100)/100;
        gastos[placa].total = Math.round((gastos[placa].total + nf.valor)*100)/100;
      }
    }
  });
  return gastos;
}


// Calcula gasto do mês atual por placa (sempre a partir das NFs — nunca usa f.gasto)
function calcGastoMesAtual(){
  const h = new Date();
  const anoAtual = h.getFullYear();
  const mesAtual = h.getMonth();
  const gastos = {};
  Frota.forEach(f => { gastos[f.placa] = 0; });

  NFs.forEach(nf => {
    // filtra pelo mês da data da NF
    const d = nf.data ? new Date(nf.data + 'T00:00:00') : null;
    if(!d || d.getFullYear() !== anoAtual || d.getMonth() !== mesAtual) return;

    const oc = OCs.find(o => o.num === nf.oc);
    if(oc && oc.isRateio && oc.rateio && oc.rateio.length > 0){
      oc.rateio.forEach(r => {
        if(gastos[r.placa] === undefined) gastos[r.placa] = 0;
        gastos[r.placa] = Math.round((gastos[r.placa] + r.valor) * 100) / 100;
      });
    } else {
      const placa = nf.dest;
      if(placa && gastos[placa] !== undefined){
        gastos[placa] = Math.round((gastos[placa] + nf.valor) * 100) / 100;
      }
    }
  });
  return gastos;
}

// Sincroniza f.gasto de toda a frota com o cálculo real do mês atual
function sincronizarGastosFreota(){
  const gastos = calcGastoMesAtual();
  Frota.forEach(f => { f.gasto = gastos[f.placa] || 0; });
}
function resetRelGastosFiltros(){
  const pfEl=$('rel-placa-filter');
  if(pfEl)pfEl.value='';
  const mesEl=$('rel-mes'); if(mesEl)mesEl.value='4';
  const mesFimEl=$('rel-mes-fim'); if(mesFimEl)mesFimEl.value='';
  renderRelGastos();
}

function renderRelGastos(){
  // populate placa filter
  const pfEl=$('rel-placa-filter');
  const pfVal=pfEl?pfEl.value:'';
  if(pfEl&&pfEl.options.length<=1){
    Frota.forEach(f=>{const o=document.createElement('option');o.value=f.placa;o.textContent=f.placa;pfEl.appendChild(o);});
  }
  const gastos = calcGastoPorPlaca();
  let lista = Frota.filter(f=>!pfVal||f.placa===pfVal);
  const cnt=$('rel-gastos-count');
  if(cnt) cnt.textContent=lista.length+' placa(s) exibida(s)';
  $('tb-rel').innerHTML=lista.map(f=>{
    const g = gastos[f.placa] || { serv: 0, pcs: 0, total: 0 };
    const tot = g.total;
    const serv = g.serv;
    const pcs  = g.pcs;
    const saldo = f.limite - tot;
    const pct = Math.round(tot/f.limite*100);
    const sc = pct>85?'cr':pct>65?'ca':'cg';
    return `<tr><td class="mono" style="color:var(--accent2);font-weight:600">${f.placa}</td><td class="mono">${fmt(serv)}</td><td class="mono">${fmt(pcs)}</td><td class="mono" style="font-weight:600">${fmt(tot)}</td><td class="mono" style="color:var(--text3)">${fmt(f.limite)}</td><td class="mono" style="color:${saldo<0?'var(--red)':'var(--accent)'}">${fmt(saldo)}</td><td>${chip(pct+'%',sc)}</td></tr>`;
  }).join('')||'<tr><td colspan="7" class="empty">Nenhuma placa encontrada</td></tr>';
}

// ======================== TIPOS OC ========================
let TiposOC = ['Manutencao (Servico)','Pecas','Servico + Pecas','Administrativo','Pessoal','Combustivel','Lubrificantes','Pneus','Documentacao'];

function renderTiposOCLista(){
  const el=$('tipos-oc-lista');
  if(!el)return;
  el.innerHTML=TiposOC.map((t,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:6px;${i%2===0?'background:rgba(0,0,0,.03)':''}">
    <span style="font-size:13px;color:var(--text)">${t}</span>
    <button onclick="removerTipoOC(${i})" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:14px;padding:2px 6px" title="Remover">&#x1F5D1;&#xFE0F;</button>
  </div>`).join('')||`<div style="text-align:center;padding:20px;font-size:13px;color:var(--text3)">Nenhum tipo cadastrado</div>`;
}

function adicionarTipoOC(){
  const el=$('f-novo-tipo');
  const val=(el.value||'').trim();
  if(!val){toast('Informe o nome do tipo','error');return;}
  if(TiposOC.includes(val)){toast('Tipo ja existe!','error');return;}
  TiposOC.push(val);
  el.value='';
  renderTiposOCLista();
  atualizarSelectTiposOC();
  toast('Tipo adicionado!');
}

function removerTipoOC(idx){
  if(TiposOC.length<=1){toast('Mantenha ao menos 1 tipo','error');return;}
  TiposOC.splice(idx,1);
  renderTiposOCLista();
  atualizarSelectTiposOC();
  toast('Tipo removido');
}

function atualizarSelectTiposOC(){
  const sel=$('f-oc-tipo');
  if(!sel)return;
  const cur=sel.value;
  sel.innerHTML=TiposOC.map(t=>`<option${t===cur?' selected':''}>${t}</option>`).join('');
}

function renderPendentes(){
  const pends=OCs.filter(o=>o.nf==='Pendente'||o.nf==='Parcialmente Recebida');
  $('tb-pendentes').innerHTML=pends.length?pends.map(o=>{
    const days=Math.round((new Date()-new Date(o.data))/86400000);
    const nfsLancadas = NFs.filter(n=>n.oc===o.num).length;
    const esperadas = o.nfsEsperadas || 1;
    const statusExtra = o.nf==='Parcialmente Recebida'
      ? `<br><span style="font-size:10px;color:var(--accent2)">⚡ ${nfsLancadas}/${esperadas} NFs recebidas</span>`
      : '';
    return `<tr>
      <td class="mono" style="color:var(--accent2)">${o.num}</td>
      <td style="font-size:11px">${o.data}</td>
      <td>${o.forn}</td>
      <td class="mono" style="font-size:11px">${o.placas}</td>
      <td class="mono">${fmt(o.valor)}</td>
      <td>${chip(days+'d',days>10?'cr':'ca')}</td>
      <td>${chipS(o.nf)}${statusExtra}</td>
      <td><button class="btn btn-amber btn-sm">Cobrar Fornecedor</button></td>
    </tr>`;
  }).join(''):'<tr><td colspan="8" class="empty">✅ Nenhuma OC pendente de faturamento</td></tr>';
}

function renderAll(){
  if(typeof renderProdutos==='function') renderProdutos();
  renderDashboard(); renderOC(); renderNF(); renderFin();
  renderEstoque(); renderFrota(); renderEPI(); renderRelGastos(); renderPendentes();
  renderColab(); renderUsuarios(); renderFaturamentos(); renderFornecedores();
}

// ======================== RELATÓRIO FINANCEIRO ========================
const DADOS_FIN=[];

let CH={};
function dc(id){if(CH[id]){CH[id].destroy();delete CH[id];}}
function toggleP(){
  const v=$('tp').value;
  $('bm').style.display=v==='mes'?'flex':'none';
  $('bc').style.display=v==='custom'?'flex':'none';
  $('btrim').style.display=v==='trim'?'flex':'none';
}
function getDates(){
  const t=$('tp').value;
  if(t==='mes'){const m=+$('fm').value,a=+$('fa').value;return{de:new Date(a,m-1,1),ate:new Date(a,m,0)};}
  if(t==='custom')return{de:new Date($('fde').value),ate:new Date($('fat').value)};
  const q=+$('ftr').value,a=+$('fta').value;
  const ms=[[0,2],[3,5],[6,8],[9,11]][q-1];
  return{de:new Date(a,ms[0],1),ate:new Date(a,ms[1]+1,0)};
}
function getFiltrado(){
  // Combina DADOS_FIN com Titulos reais
  const base=[...DADOS_FIN];
  Titulos.forEach(t=>{
    if(!base.find(d=>d.ref===t.ref&&d.forn===t.forn)){
      base.push({forn:t.forn,cat:t.tipo.toLowerCase().includes('pessoal')?'pessoal':t.tipo.toLowerCase().includes('imposto')||t.tipo.toLowerCase().includes('inss')||t.tipo.toLowerCase().includes('issqn')||t.tipo.toLowerCase().includes('fgts')?'impostos':t.tipo.toLowerCase().includes('manutenção')||t.tipo.toLowerCase().includes('boleto')?'manutencao':'admin',ref:t.ref,valor:t.valor,venc:t.venc,placa:t.placa||'-',status:t.status});
    }
  });
  const{de,ate}=getDates();
  const cat=$('fcat').value,st=$('fst').value;
  return base.filter(d=>{const v=new Date(d.venc);return v>=de&&v<=ate&&(!cat||d.cat===cat)&&(!st||d.status===st);});
}
function goRel(){
  const d=getFiltrado();
  relKPI(d);relGeral(d);relCateg(d);relPlaca(d);relLista(d);
}
function resetRel(){
  $('tp').value='mes';$('fm').value='4';$('fa').value='2025';
  $('fcat').value='';$('fst').value='';
  toggleP();goRel();
}
function relKPI(d){
  const tot=d.reduce((a,x)=>a+x.valor,0);
  const pg=d.filter(x=>x.status==='Pago').reduce((a,x)=>a+x.valor,0);
  const pn=d.filter(x=>x.status==='Pendente').reduce((a,x)=>a+x.valor,0);
  const mx=d.length?Math.max(...d.map(x=>x.valor)):0;
  const ct=[...new Set(d.map(x=>x.cat))].length;
  $('kpis-fin').innerHTML=
    `<div class="stat-card"><div class="stat-label">Total no período</div><div class="stat-value" style="font-size:16px">${fmt(tot)}</div><div class="stat-sub">${d.length} lançamentos</div></div>`+
    `<div class="stat-card"><div class="stat-label">Total pago</div><div class="stat-value" style="font-size:16px;color:var(--accent)">${fmt(pg)}</div><div class="stat-sub">${d.filter(x=>x.status==='Pago').length} títulos</div></div>`+
    `<div class="stat-card"><div class="stat-label">Total pendente</div><div class="stat-value" style="font-size:16px;color:var(--red)">${fmt(pn)}</div><div class="stat-sub">${d.filter(x=>x.status==='Pendente').length} títulos</div></div>`+
    `<div class="stat-card"><div class="stat-label">Maior gasto</div><div class="stat-value" style="font-size:16px;color:var(--amber)">${fmt(mx)}</div></div>`+
    `<div class="stat-card"><div class="stat-label">Categorias</div><div class="stat-value" style="font-size:16px">${ct}</div></div>`;
}
function relGeral(d){
  const s=[0,0,0,0],sp=[0,0,0,0];
  d.forEach(x=>{const i=Math.min(3,Math.floor((new Date(x.venc).getDate()-1)/7));(x.status==='Pago'?s:sp)[i]+=x.valor;});
  dc('c-sem');CH['c-sem']=new Chart($('c-sem'),{type:'bar',data:{labels:['Sem 1','Sem 2','Sem 3','Sem 4'],datasets:[{label:'Pago',data:s,backgroundColor:'#00C4A1',borderRadius:4},{label:'Pendente',data:sp,backgroundColor:'#E8445A',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#5A7394',font:{size:11}},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#5A7394',font:{size:10},callback:v=>'R$'+Math.round(v/1000)+'k'},grid:{color:'rgba(255,255,255,.05)'}}}}});
  const ct={};d.forEach(x=>{ct[x.cat]=(ct[x.cat]||0)+x.valor;});
  const ks=Object.keys(ct);
  $('leg-cat').innerHTML=ks.map(k=>`<span class="li"><span class="ld" style="background:${CC[k]||'#888'}"></span>${CL[k]||k}</span>`).join('');
  dc('c-donut');CH['c-donut']=new Chart($('c-donut'),{type:'doughnut',data:{labels:ks.map(k=>CL[k]||k),datasets:[{data:ks.map(k=>ct[k]),backgroundColor:ks.map(k=>CC[k]||'#888'),borderWidth:0,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false}}}});
  const pg=d.filter(x=>x.status==='Pago').reduce((a,x)=>a+x.valor,0);
  const pn=d.filter(x=>x.status==='Pendente').reduce((a,x)=>a+x.valor,0);
  const all=pg+pn||1;
  dc('c-pizza');CH['c-pizza']=new Chart($('c-pizza'),{type:'doughnut',data:{labels:['Pago','Pendente'],datasets:[{data:[pg,pn],backgroundColor:['#00C4A1','#E8445A'],borderWidth:0,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false}}}});
  $('pizza-det').innerHTML=`<div style="display:flex;flex-direction:column;gap:12px">
    <div><div class="stat-label" style="margin-bottom:2px">Pago</div><div style="font-size:17px;font-weight:600;font-family:var(--mono);color:var(--accent)">${fmt(pg)}</div><div class="stat-sub">${Math.round(pg/all*100)}%</div></div>
    <div><div class="stat-label" style="margin-bottom:2px">Pendente</div><div style="font-size:17px;font-weight:600;font-family:var(--mono);color:var(--red)">${fmt(pn)}</div><div class="stat-sub">${Math.round(pn/all*100)}%</div></div>
  </div>`;
}
function relCateg(d){
  const ct={},cpg={},cpn={},cq={};
  d.forEach(x=>{ct[x.cat]=(ct[x.cat]||0)+x.valor;cq[x.cat]=(cq[x.cat]||0)+1;if(x.status==='Pago')cpg[x.cat]=(cpg[x.cat]||0)+x.valor;else cpn[x.cat]=(cpn[x.cat]||0)+x.valor;});
  const ks=Object.keys(ct).sort((a,b)=>ct[b]-ct[a]);
  dc('c-barcat');
  if(ks.length)CH['c-barcat']=new Chart($('c-barcat'),{type:'bar',data:{labels:ks.map(k=>CL[k]||k),datasets:[{data:ks.map(k=>ct[k]),backgroundColor:ks.map(k=>CC[k]||'#888'),borderRadius:4,borderSkipped:false}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#5A7394',font:{size:10},callback:v=>'R$'+Math.round(v/1000)+'k'},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#8FA3C0',font:{size:11}},grid:{display:false}}}}});
  $('tb-categ').innerHTML=ks.length?ks.map(k=>`<tr><td><span style="display:inline-flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:${CC[k]};flex-shrink:0"></span>${CL[k]||k}</span></td><td class="mono">${fmt(ct[k])}</td><td class="mono" style="color:var(--text2)">${cq[k]}</td><td class="mono" style="color:var(--accent)">${fmt(cpg[k]||0)}</td><td class="mono" style="color:var(--red)">${fmt(cpn[k]||0)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Sem dados</td></tr>';
}
function relPlaca(d){
  const pm={},pp={};
  d.filter(x=>x.placa&&x.placa!=='-').forEach(x=>{if(x.cat==='manutencao')pm[x.placa]=(pm[x.placa]||0)+x.valor;if(x.cat==='pecas')pp[x.placa]=(pp[x.placa]||0)+x.valor;});
  const ps=[...new Set([...Object.keys(pm),...Object.keys(pp)])].sort();
  dc('c-placa');
  if(ps.length)CH['c-placa']=new Chart($('c-placa'),{type:'bar',data:{labels:ps,datasets:[{label:'Manutenção',data:ps.map(p=>pm[p]||0),backgroundColor:'#0099FF',borderRadius:4},{label:'Peças',data:ps.map(p=>pp[p]||0),backgroundColor:'#00C4A1',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8FA3C0',font:{size:11}},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#5A7394',font:{size:10},callback:v=>'R$'+Math.round(v/1000)+'k'},grid:{color:'rgba(255,255,255,.05)'}}}}});
  $('tb-rfplaca').innerHTML=ps.length?ps.map(p=>{const m=pm[p]||0,pc=pp[p]||0,tot=m+pc,lim=5000,sl=lim-tot,pct=Math.round(Math.min(100,tot/lim*100));return`<tr><td class="mono" style="color:var(--accent2)">${p}</td><td class="mono">${fmt(m)}</td><td class="mono">${fmt(pc)}</td><td class="mono" style="font-weight:600">${fmt(tot)}</td><td class="mono" style="color:var(--text3)">${fmt(lim)}</td><td class="mono" style="color:${sl<0?'var(--red)':'var(--accent)'}">${fmt(sl)}</td><td>${chip(pct+'%',pct>85?'cr':pct>65?'ca':'cg')}</td></tr>`;}).join(''):'<tr><td colspan="7" class="empty">Sem dados por placa</td></tr>';
}
function relLista(d){
  $('cnt-lista').textContent=d.length+' registros';
  $('tb-lista-rf').innerHTML=d.length?d.map(x=>`<tr>
    <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${x.forn}">${x.forn}</td>
    <td><span style="font-size:10px;padding:2px 6px;border-radius:10px;background:${CC[x.cat]||'#888'}22;color:${CC[x.cat]||'#888'};border:1px solid ${CC[x.cat]||'#888'}33">${CL[x.cat]||x.cat}</span></td>
    <td class="mono" style="font-size:11px;color:var(--text2)">${x.ref}</td>
    <td class="mono">${fmt(x.valor)}</td>
    <td style="font-size:11px;color:var(--text3)">${x.venc}</td>
    <td class="mono" style="font-size:11px;color:var(--accent2)">${x.placa}</td>
    <td>${chipS(x.status)}</td>
  </tr>`).join(''):'<tr><td colspan="7" class="empty">Nenhum lançamento no período</td></tr>';
}
function setRelTab(id,el){
  ['geral','categ','placa','lista'].forEach(t=>$('pg-'+t).style.display='none');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  $('pg-'+id).style.display='block';
  el.classList.add('on');
}


// ======================== CRUD COLABORADORES ========================
function renderColab(){
  $('colab-count').textContent=Colaboradores.length;
  $('tb-colab').innerHTML=Colaboradores.length?Colaboradores.map(c=>{
    const sc=c.status==='Ativo'?'cg':c.status==='Inativo'?'cr':'ca';
    return `<tr>
      <td style="font-weight:500">${c.nome}</td>
      <td class="mono" style="font-size:11px">${c.cpf}</td>
      <td>${c.cargo}</td>
      <td>${chip(c.setor,'cgr')}</td>
      <td style="font-size:11px">${c.admissao}</td>
      <td style="font-size:11px">${c.tel}</td>
      <td>${chip(c.status,sc)}</td>
      <td>${acts('editarColab('+c.id+')','excluirColab('+c.id+')')}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="8" class="empty">Nenhum colaborador cadastrado</td></tr>';
}
function editarColab(id){
  const c=Colaboradores.find(x=>x.id===id); if(!c)return;
  editing.colab=id;
  $('f-colab-nome').value=c.nome; $('f-colab-cpf').value=c.cpf;
  $('f-colab-rg').value=c.rg||''; $('f-colab-cargo').value=c.cargo;
  $('f-colab-setor').value=c.setor; $('f-colab-admissao').value=c.admissao;
  $('f-colab-tel').value=c.tel; $('f-colab-email').value=c.email;
  $('f-colab-cnh').value=c.cnh||''; $('f-colab-cnh-venc').value=c.cnhVenc||'';
  $('f-colab-status').value=c.status; $('f-colab-obs').value=c.obs||'';
  $('modal-colab-title').textContent='Editar Colaborador';
  $('btn-save-colab').textContent='💾 Atualizar';
  $('modal-colab').classList.add('open');
}
function salvarColab(){
  const nome=$('f-colab-nome').value.trim(); if(!nome){toast('Informe o nome','error');return;}
  const obj={nome,cpf:$('f-colab-cpf').value.trim(),rg:$('f-colab-rg').value.trim(),cargo:$('f-colab-cargo').value.trim()||'Não informado',setor:$('f-colab-setor').value,admissao:$('f-colab-admissao').value||today,tel:$('f-colab-tel').value.trim(),email:$('f-colab-email').value.trim(),cnh:$('f-colab-cnh').value,cnhVenc:$('f-colab-cnh-venc').value,status:$('f-colab-status').value,obs:$('f-colab-obs').value.trim()};
  if(editing.colab){
    const i=Colaboradores.findIndex(x=>x.id===editing.colab);
    Colaboradores[i]={...Colaboradores[i],...obj}; editing.colab=null; toast('Colaborador atualizado!');
  } else {
    obj.id=nextIdColab++; Colaboradores.unshift(obj); toast('Colaborador cadastrado!');
  }
  closeModal('modal-colab'); $('modal-colab-title').textContent='Novo Colaborador'; $('btn-save-colab').textContent='💾 Salvar';
  editing.colab=null; renderColab(); populateUsuariosColab();
}
function excluirColab(id){
  const c=Colaboradores.find(x=>x.id===id);
  confirmDelete('Excluir colaborador '+c.nome+'?','Esta ação não pode ser desfeita.',()=>{
    Colaboradores=Colaboradores.filter(x=>x.id!==id); toast('Colaborador excluído.'); renderColab();
  });
}
function populateUsuariosColab(){
  const sel=$('f-usr-colab'); if(!sel)return;
  sel.innerHTML='<option value="">Nenhum</option>';
  Colaboradores.forEach(c=>sel.innerHTML+=`<option value="${c.id}">${c.nome}</option>`);
}

// ======================== CRUD USUARIOS ========================
function renderUsuarios(){
  $('user-count').textContent=Usuarios.length;
  $('tb-usuarios').innerHTML=Usuarios.length?Usuarios.map(u=>{
    const sc=u.status==='Ativo'?'cg':u.status==='Bloqueado'?'cr':'ca';
    const perfilColor=u.perfil.includes('Gestor')?'var(--purple)':u.perfil.includes('Financeiro')?'var(--amber)':'var(--accent2)';
    return `<tr>
      <td style="font-weight:500">${u.nome}</td>
      <td style="font-size:11px;color:var(--text2)">${u.email}</td>
      <td><span style="font-size:11px;color:${perfilColor}">${u.perfil}</span></td>
      <td style="font-size:11px;color:var(--text3)">${u.ultimoAcesso||'—'}</td>
      <td>${chip(u.status,sc)}</td>
      <td>${acts('editarUsuario('+u.id+')','excluirUsuario('+u.id+')')}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="6" class="empty">Nenhum usuário cadastrado</td></tr>';
}
function editarUsuario(id){
  const u=Usuarios.find(x=>x.id===id); if(!u)return;
  editing.usuario=id; populateUsuariosColab();
  $('f-usr-nome').value=u.nome; $('f-usr-email').value=u.email;
  $('f-usr-senha').value=''; $('f-usr-perfil').value=u.perfil;
  $('f-usr-colab').value=u.colabId||''; $('f-usr-status').value=u.status;
  $('f-usr-obs').value=u.obs||'';
  $('modal-usuario-title').textContent='Editar Usuário';
  $('btn-save-usuario').textContent='💾 Atualizar';
  $('modal-usuario').classList.add('open');
}
async function salvarUsuario(){
  const nome=$('f-usr-nome').value.trim(); if(!nome){toast('Informe o nome','error');return;}
  const email=$('f-usr-email').value.trim(); if(!email){toast('Informe o e-mail/login','error');return;}
  const senha=$('f-usr-senha').value.trim();
  const obj={nome,email,perfil:$('f-usr-perfil').value,colabId:$('f-usr-colab').value,status:$('f-usr-status').value,ultimoAcesso:'—',obs:$('f-usr-obs').value.trim()};

  if(editing.usuario){
    // Edição — atualiza apenas dados locais (senha só muda se preenchida)
    const i=Usuarios.findIndex(x=>x.id===editing.usuario);
    Usuarios[i]={...Usuarios[i],...obj};
    if(senha){
      // Atualiza senha no Supabase via Admin API não disponível no client — orienta o admin
      toast('Dados atualizados! Para alterar a senha, use o painel do Supabase.');
    } else {
      toast('Usuário atualizado!');
    }
    editing.usuario=null;
  } else {
    // Novo usuário — cria no Supabase
    if(!senha){ toast('Informe uma senha para o novo usuário','error'); return; }

    const btn = $('btn-save-usuario');
    btn.textContent = '⏳ Criando...'; btn.disabled = true;

    const { data, error } = await supa.auth.admin ? 
      // Se tiver acesso admin usa signUp direto
      { data: null, error: { message: 'use_signup' } } :
      await supa.auth.signUp({ email, password: senha, options:{ data:{ nome } } });

    // Como não temos service_role, usamos signUp (envia e-mail de confirmação)
    const { data: sd, error: se } = await supa.auth.signUp({
      email,
      password: senha,
      options: { data: { nome }, emailRedirectTo: window.location.href }
    });

    btn.textContent = '💾 Criar Usuário'; btn.disabled = false;

    if(se){
      // Se o e-mail já existe no Supabase, só salva o perfil no TransGest
      if(se.message && (se.message.includes('already registered') || se.message.includes('already been registered'))){
        obj.id = nextIdUser++;
        obj.supaId = '';
        Usuarios.unshift(obj);
        toast('Perfil criado no TransGest! (Usuário já existia no Supabase) ✅');
      } else {
        toast('Erro ao criar no Supabase: ' + se.message, 'error');
        return;
      }
    } else {
      obj.id = nextIdUser++;
      obj.supaId = sd.user?.id || '';
      Usuarios.unshift(obj);
      toast('Usuário criado! ✅');
    }
  }

  closeModal('modal-usuario');
  $('modal-usuario-title').textContent='Novo Usuário';
  $('btn-save-usuario').textContent='💾 Criar Usuário';
  editing.usuario=null; renderUsuarios();
}

function excluirUsuario(id){
  const u=Usuarios.find(x=>x.id===id);
  confirmDelete('Excluir usuário '+u.nome+'?','O acesso será removido. Para revogar o login, remova também no painel do Supabase.',()=>{
    Usuarios=Usuarios.filter(x=>x.id!==id); toast('Usuário removido do sistema. Remova também no Supabase se necessário.'); renderUsuarios();
  });
}

// ======================== EXPORT XLSX ========================
function exportRelGastosXLSX(){
  if(typeof XLSX==='undefined'){toast('Biblioteca XLSX não carregou','error');return;}
  sincronizarGastosFreota();
  const gastosReais = calcGastoPorPlaca();
  const rows=[['Placa','Manutenção','Peças','Total Mês','Limite','Saldo','Uso %']];
  Frota.forEach(f=>{
    const g = gastosReais[f.placa] || {serv:0,pcs:0,total:0};
    const tot = g.total;
    rows.push([f.placa,g.serv,g.pcs,tot,f.limite,f.limite-tot,Math.round(tot/(f.limite||1)*100)+'%']);
  });
  const ws=XLSX.utils.aoa_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Gastos por Placa');
  XLSX.writeFile(wb,'Relatorio_Gastos_Placa.xlsx');
  toast('Excel gerado com sucesso!');
}
function exportRelFinXLSX(){
  if(typeof XLSX==='undefined'){toast('Biblioteca XLSX não carregou','error');return;}
  const d=getFiltrado();
  const rows=[['Fornecedor','Categoria','Referência','Valor (R$)','Vencimento','Placa','Status']];
  d.forEach(x=>rows.push([x.forn,CL[x.cat]||x.cat,x.ref,x.valor,x.venc,x.placa,x.status]));
  const ws=XLSX.utils.aoa_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Relatório Financeiro');
  XLSX.writeFile(wb,'Relatorio_Financeiro.xlsx');
  toast('Excel gerado com sucesso!');
}

// ======================== EXPORT PDF RELATÓRIOS ========================
function exportRelGastosPDF(){
  const{jsPDF}=window.jspdf||{};
  if(!jsPDF){toast('Biblioteca PDF não carregou','error');return;}
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const logoImg=new Image(); logoImg.src='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCI...';
  // Header
  doc.setFillColor(11,22,40);
  doc.rect(0,0,297,22,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  doc.text('AJBAM — Relatório de Gastos por Placa',148,13,{align:'center'});
  doc.setFontSize(9);
  doc.setFont('helvetica','normal');
  doc.text('Gerado em: '+new Date().toLocaleDateString('pt-BR'),148,19,{align:'center'});
  // Table header
  const cols=['Placa','Manutenção','Peças','Estoque','Total Mês','Limite','Saldo','Uso %'];
  const widths=[30,35,30,30,35,30,30,25];
  let x=10,y=32;
  doc.setFillColor(0,196,161); doc.rect(10,26,277,8,'F');
  doc.setTextColor(11,22,40); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  cols.forEach((c,i)=>{doc.text(c,x+2,31);x+=widths[i];});
  // Rows
  const gastosReaisPDF = calcGastoPorPlaca();
  doc.setFont('helvetica','normal'); doc.setTextColor(30,40,60);
  Frota.forEach((f,ri)=>{
    if(ri%2===0){doc.setFillColor(240,245,250);doc.rect(10,y-4,277,7,'F');}
    const serv=Math.round(f.gasto*0.6),pcs=Math.round(f.gasto*0.3),est=Math.round(f.gasto*0.1);
    const vals=[f.placa,'R$ '+serv.toLocaleString('pt-BR',{minimumFractionDigits:2}),'R$ '+pcs.toLocaleString('pt-BR',{minimumFractionDigits:2}),'R$ '+est.toLocaleString('pt-BR',{minimumFractionDigits:2}),'R$ '+f.gasto.toLocaleString('pt-BR',{minimumFractionDigits:2}),'R$ '+f.limite.toLocaleString('pt-BR',{minimumFractionDigits:2}),'R$ '+(f.limite-f.gasto).toLocaleString('pt-BR',{minimumFractionDigits:2}),Math.round(f.gasto/f.limite*100)+'%'];
    x=10; vals.forEach((v,i)=>{doc.text(v,x+2,y);x+=widths[i];});
    y+=7; if(y>190){doc.addPage();y=20;}
  });
  doc.save('Relatorio_Gastos_Placa.pdf');
  toast('PDF gerado com sucesso!');
}
function exportRelFinPDF(){
  const{jsPDF}=window.jspdf||{};
  if(!jsPDF){toast('Biblioteca PDF não carregou','error');return;}
  const d=getFiltrado();
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  doc.setFillColor(11,22,40);
  doc.rect(0,0,297,22,'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  doc.text('AJBAM — Relatório Financeiro por Período',148,13,{align:'center'});
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text('Gerado em: '+new Date().toLocaleDateString('pt-BR'),148,19,{align:'center'});
  const cols=['Fornecedor','Categoria','Referência','Valor','Vencimento','Placa','Status'];
  const widths=[60,35,35,30,28,28,25];
  let x=10, y=32;
  doc.setFillColor(0,196,161); doc.rect(10,26,277,8,'F');
  doc.setTextColor(11,22,40); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  cols.forEach((c,i)=>{doc.text(c,x+2,31);x+=widths[i];});
  doc.setFont('helvetica','normal'); doc.setTextColor(30,40,60);
  d.forEach((x2,ri)=>{
    if(ri%2===0){doc.setFillColor(240,245,250);doc.rect(10,y-4,277,7,'F');}
    const vals=[x2.forn.slice(0,28),CL[x2.cat]||x2.cat,x2.ref.slice(0,18),'R$ '+x2.valor.toLocaleString('pt-BR',{minimumFractionDigits:2}),x2.venc,x2.placa,x2.status];
    let px=10; vals.forEach((v,i)=>{doc.text(v,px+2,y);px+=widths[i];});
    y+=7; if(y>190){doc.addPage();y=20;}
  });
  doc.save('Relatorio_Financeiro.pdf');
  toast('PDF gerado com sucesso!');
}
// ======================== PDF FINANCEIRO ========================

function exportFinPDFFiltrado(){
  const{jsPDF}=window.jspdf||{};
  if(!jsPDF){toast('Biblioteca PDF não carregou','error');return;}
  const lista = getTitulosFinanceiroFiltrados();
  if(!lista.length){toast('Nenhum título no filtro atual','error');return;}
  const periodoEl = document.getElementById('fin-filtro-periodo');
  const statusEl  = document.getElementById('fin-filtro-status');
  const periodo = periodoEl ? periodoEl.options[periodoEl.selectedIndex].text : '';
  const status  = statusEl  ? (statusEl.value  || 'Todos') : 'Todos';
  gerarPDFTitulos(lista, 'AJBAM — Contas a Pagar', `Período: ${periodo} | Status: ${status}`, 'Contas_a_Pagar_Filtrado');
}

function exportBoletosHojePDF(){
  const{jsPDF}=window.jspdf||{};
  if(!jsPDF){toast('Biblioteca PDF não carregou','error');return;}
  const hoje=new Date(); const h=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate());
  const lista = Titulos.filter(t=>{
    if(t.status!=='Pendente') return false;
    const v = parseISODateLocal(t.venc);
    return v && v.getFullYear()===h.getFullYear() && v.getMonth()===h.getMonth() && v.getDate()===h.getDate();
  });
  if(!lista.length){toast('Nenhum boleto vence hoje!','error');return;}
  const dataFmt = h.toLocaleDateString('pt-BR');
  gerarPDFTitulos(lista, 'AJBAM — Boletos do Dia', `Vencimento: ${dataFmt} | Apenas Pendentes`, 'Boletos_do_Dia');
}

function gerarPDFTitulos(lista, titulo, subtitulo, nomeArquivo){
  const{jsPDF}=window.jspdf||{};
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const W=297;
  const M=8; // margem esquerda
  const TW=281; // largura total da tabela

  // ── Cabeçalho: fundo branco (cor da logo) ──
  doc.setFillColor(255,255,255); doc.rect(0,0,W,22,'F');
  // Linha separadora sutil embaixo do cabeçalho
  doc.setDrawColor(220,228,236); doc.setLineWidth(0.5); doc.line(0,22,W,22);

  const logoEl = document.querySelector('.logo img');
  const logoSrc = logoEl ? logoEl.src : '';
  if(logoSrc){
    try{ doc.addImage(logoSrc,'PNG',M,2,36,18); }
    catch(e){ try{ doc.addImage(logoSrc,'JPEG',M,2,36,18); }catch(e2){} }
  }
  doc.setTextColor(11,22,40); doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text(titulo, W/2, 11, {align:'center'});
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(80,100,120);
  doc.text(subtitulo, W/2, 17, {align:'center'});
  doc.setFontSize(7); doc.setTextColor(140,155,170);
  doc.text('Gerado em: '+new Date().toLocaleString('pt-BR'), W-M, 17, {align:'right'});

  // ── Totalizador geral ──
  const total = lista.reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
  doc.setFillColor(0,120,100); doc.rect(0,22,W,8,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text(`Total: ${fmt(total)}  |  ${lista.length} título(s)`, W/2, 27.5, {align:'center'});

  // ── Colunas (sem Referência, Tipo, Placa) ──
  const cols   = ['Fornecedor','Categoria','Valor','Vencimento','Status'];
  const widths = [110, 60, 38, 42, 31];
  // widths soma = 281 = TW ✓

  function drawTableHeader(yH){
    doc.setFillColor(220,228,236); doc.rect(M,yH,TW,8,'F');
    doc.setTextColor(11,22,40); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
    let xH=M;
    cols.forEach((c,i)=>{ doc.text(c, xH+2, yH+5.5); xH+=widths[i]; });
  }

  // ── Ordenar e agrupar por dia de vencimento ──
  const sorted = [...lista].sort((a,b)=>parseISODateLocal(a.venc)-parseISODateLocal(b.venc));

  // Agrupa: { 'YYYY-MM-DD': [titulos] }
  const grupos = {};
  sorted.forEach(t => {
    const dia = t.venc ? t.venc.slice(0,10) : '0000-00-00';
    if(!grupos[dia]) grupos[dia]=[];
    grupos[dia].push(t);
  });
  const dias = Object.keys(grupos).sort();

  let y = 32; // posição Y inicial após a barra verde
  drawTableHeader(y);
  y += 10;

  doc.setFont('helvetica','normal'); doc.setFontSize(7);
  let rowIndex = 0;

  dias.forEach(dia => {
    const itens = grupos[dia];
    const totalDia = itens.reduce((a,t)=>a+(parseFloat(t.valor)||0),0);

    // Verifica se cabe o grupo inteiro + subtotal (aprox); se não, nova página
    const alturaGrupo = itens.length * 7 + 8; // linhas + subtotal
    if(y + alturaGrupo > 196){
      doc.addPage();
      y = 12;
      drawTableHeader(y);
      y += 10;
      rowIndex = 0;
    }

    itens.forEach((t)=>{
      if(y > 196){ doc.addPage(); y=12; drawTableHeader(y); y+=10; rowIndex=0; }
      if(rowIndex%2===0){ doc.setFillColor(245,248,252); doc.rect(M,y-4,TW,7,'F'); }
      const diasV = diasAte(t.venc);
      const corStatus = t.status==='Pago'?[0,130,100]:(diasV<0?[180,20,20]:(diasV===0?[180,80,0]:[30,40,60]));
      doc.setTextColor(...corStatus);
      const vals=[
        (t.forn||'-').slice(0,52),
        (categoriaLabel(t.categoria||'manutencao')||'-').slice(0,28),
        fmt(t.valor),
        formatarDataBR(t.venc),
        t.status||'-'
      ];
      let x=M; vals.forEach((v,i)=>{ doc.text(String(v), x+2, y); x+=widths[i]; });
      y+=7; rowIndex++;
    });

    // ── Subtotal do dia ──
    doc.setFillColor(230,240,235); doc.rect(M, y-4, TW, 7, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(0,100,80);
    doc.text(`Subtotal ${formatarDataBR(dia)}`, M+2, y);
    doc.text(`${fmt(totalDia)}  (${itens.length} título${itens.length!==1?'s':''})`, M+TW-2, y, {align:'right'});
    doc.setFont('helvetica','normal'); doc.setTextColor(30,40,60);
    y += 9;
  });

  // ── Total Geral no final ──
  if(y > 188){ doc.addPage(); y=12; }
  doc.setFillColor(0,100,80); doc.rect(M, y, TW, 9, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
  doc.text('TOTAL GERAL DO PERÍODO', M+2, y+6);
  doc.text(`${fmt(total)}  (${lista.length} título${lista.length!==1?'s':''})`, M+TW-2, y+6, {align:'right'});

  doc.save(nomeArquivo+'_'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('PDF gerado com sucesso!');
}

// ======================== PDF ========================

function gerarPDFOC(id){
  const o = OCs.find(x => x.id === id);
  if(!o){ toast('OC não encontrada','error'); return; }
  const { jsPDF } = window.jspdf || {};
  if(!jsPDF){ toast('Biblioteca PDF não carregou. Atualize a página.','error'); return; }

  // A5 Portrait: 148mm x 210mm
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const W = 148, H = 210, M = 12;
  const PW = W - M * 2; // 124mm área útil

  const txt = v => String(v || '').trim() || '-';
  const dataBR = v => (typeof formatarDataBR === 'function' ? formatarDataBR(v) : txt(v));
  const moeda = v => (typeof fmt === 'function' ? fmt(Number(v)||0) : ('R$ ' + (Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})));

  // ── Fundo branco + borda ──
  doc.setFillColor(255,255,255);
  doc.rect(0,0,W,H,'F');
  doc.setDrawColor(180,180,180);
  doc.setLineWidth(0.35);
  doc.rect(6, 6, W-12, H-12, 'D');

  // ── Logo ──
  const logoEl = document.querySelector('.logo img') || document.querySelector('img[src^="data:image"]');
  const logoSrc = logoEl ? logoEl.src : '';
  let logoOk = false;
  if(logoSrc){
    try { doc.addImage(logoSrc, 'JPEG', M, 12, 60, 19); logoOk=true; }
    catch(e){ try { doc.addImage(logoSrc, 'PNG', M, 12, 60, 19); logoOk=true; } catch(e2){} }
  }
  if(!logoOk){
    doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(140,25,22);
    doc.text('AJBAM', M, 22);
    doc.setFontSize(7); doc.setTextColor(80,80,80); doc.setFont('helvetica','normal');
    doc.text('Solu\u00E7\u00F5es em transportes', M, 27);
  }

  // ── Linha separadora do cabeçalho ──
  doc.setDrawColor(180,180,180); doc.setLineWidth(0.35);
  doc.line(6, 34, W-6, 34);

  // ── Título ──
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(30,30,30);
  doc.text('ORDEM DE COMPRA', W/2, 42, {align:'center'});

  // ── Campos: label negrito na mesma linha, valor normal ──
  // Espaçamento: 5mm entre label+valor e 4mm de gap antes do próximo campo
  let cy = 53;
  const fs = 9;       // font size campos
  const gap = 7;      // espaço entre campos

  function linha(label, value){
    doc.setFont('helvetica','bold'); doc.setFontSize(fs); doc.setTextColor(30,30,30);
    const lw = doc.getTextWidth(label + ' ');
    doc.text(label, M, cy);
    doc.setFont('helvetica','normal');
    const valLines = doc.splitTextToSize(txt(value), PW - lw);
    doc.text(valLines, M + lw, cy);
    cy += gap * valLines.length;
  }

  linha('N\u00B0', o.num);
  linha('Data:', dataBR(o.data || new Date().toISOString().slice(0,10)));
  cy += 1; // respiro extra antes dos campos maiores
  linha('Fornecedor:', o.forn);
  cy += 1;
  linha('Equipamento:', o.placas || o.equipamento || o.dest || '-');
  cy += 1;
  linha('Descri\u00E7\u00E3o:', o.desc || o.obs || '-');
  cy += 1;
  linha('Valor Total:', moeda(o.valor || 0));

  cy += 4;

  // ── Linha separadora ──
  doc.setDrawColor(180,180,180); doc.setLineWidth(0.3);
  doc.line(6, cy, W-6, cy);
  cy += 6;

  // ── Textos informativos ──
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(50,50,50);
  doc.text('Ciente do valor j\u00E1 acordado na cota\u00E7\u00E3o de valores.', M, cy); cy += 6;
  doc.text('Ordem de Compra Liberada ap\u00F3s Aprova\u00E7\u00E3o dos Gestores.', M, cy); cy += 8;

  // ── Aviso INDISPENSÁVEL ──
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(140,25,22);
  const avisoLines = doc.splitTextToSize('INDISPENS\u00C1VEL ENVIAR A NF ACOMPANHADO DO PIX OU BOLETO PARA:', PW);
  doc.text(avisoLines, M, cy); cy += 6 * avisoLines.length;
  doc.text('ajbamtransportes@gmail.com', M, cy);

  // ── Salvar ──
  const nomeForn = (o.forn||'SEM_FORN').replace(/[^a-zA-Z0-9\u00C0-\u00FF\s]/g,'').trim().replace(/\s+/g,'_');
  const nomePlaca = (o.placas||'-').replace(/[^a-zA-Z0-9]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
  doc.save(`${o.num || 'OC'}_${nomeForn}_${nomePlaca}.pdf`);
  toast('PDF da Ordem de Compra gerado!');
}
function formatarDataBR(dataISO){
  if(!dataISO) return '-';
  const partes = String(dataISO).split('-');
  if(partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function truncarPDF(txt, max){
  txt = String(txt || '-');
  return txt.length > max ? txt.slice(0, max - 3) + '...' : txt;
}

// ======================== FATURAMENTOS ========================

function nfToggleModalidade(){
  const isFat = document.getElementById('nf-mod-fat') && document.getElementById('nf-mod-fat').checked;
  const parcWrap = $('parcelas-wrap');
  const aviso = $('nf-fat-aviso');
  if(parcWrap) parcWrap.style.display = isFat ? 'none' : 'block';
  if(aviso) aviso.style.display = isFat ? 'block' : 'none';
  if(!isFat) { nfGerarParcelas(); }
}

function openModalFaturamento(){
  const fornsSel = $('f-fat-forn');
  const forns = [...new Set(NFs.filter(n=>n.pgto==='Aguardando Faturamento').map(n=>n.forn))];
  fornsSel.innerHTML = '<option value="">— Selecione o fornecedor —</option>';
  forns.forEach(f => fornsSel.innerHTML += `<option value="${f}">${f}</option>`);
  $('f-fat-num').value = '';
  $('f-fat-data').value = today;
  $('f-fat-parcelas').value = '1';
  $('f-fat-obs').value = '';
  $('fat-nfs-lista').innerHTML = '<span style="font-size:12px;color:var(--text3)">Selecione um fornecedor acima para ver as NFs em aberto.</span>';
  $('fat-resumo-wrap').style.display = 'none';
  $('fat-boleto-wrap').style.display = 'none';
  $('modal-fat-title').textContent = 'Faturamento Consolidado';
  $('btn-save-fat').textContent = '💼 Gerar Boleto Consolidado';
  editing.fat = null;
  $('modal-faturamento').classList.add('open');
}

function fatSelecionarTodas(sel){
  document.querySelectorAll('.fat-nf-check').forEach(c => c.checked = sel);
  fatRecalcTotal();
}

function fatFiltrarNFs(){
  const forn = $('f-fat-forn').value;
  const cont = $('fat-nfs-lista');
  $('fat-resumo-wrap').style.display = 'none';
  $('fat-boleto-wrap').style.display = 'none';
  if(!forn){
    cont.innerHTML = '<span style="font-size:12px;color:var(--text3)">Selecione um fornecedor acima para ver as NFs em aberto.</span>';
    return;
  }
  const nfsDisp = NFs.filter(n => n.forn === forn && n.pgto === 'Aguardando Faturamento');
  if(!nfsDisp.length){
    cont.innerHTML = '<span style="font-size:12px;color:var(--amber)">⚠ Nenhuma NF aguardando faturamento para este fornecedor.</span>';
    return;
  }
  cont.innerHTML = nfsDisp.map(n => `
    <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;margin-bottom:5px;background:rgba(255,255,255,.03);border:1px solid var(--border);transition:background .12s" onmouseover="this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.background='rgba(255,255,255,.03)'">
      <input type="checkbox" class="fat-nf-check" data-id="${n.id}" data-valor="${n.valor}" onchange="fatRecalcTotal()" checked style="width:auto;padding:0;border:none;background:none;accent-color:var(--accent);flex-shrink:0"/>
      <span style="flex:1;min-width:0">
        <span style="font-size:12px;font-weight:600;color:var(--accent2)">NF ${n.num}</span>
        <span style="font-size:11px;color:var(--text3);margin-left:8px">${n.data||''}</span>
        ${n.oc && n.oc!=='Sem OC'?`<span style="font-size:10px;color:var(--text3);margin-left:6px">· OC: ${n.oc}</span>`:''}
      </span>
      <span style="font-size:11px;color:var(--text3);margin-right:4px">${n.tipo||''}</span>
      <span style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--accent);flex-shrink:0">${fmt(n.valor)}</span>
    </label>`).join('');
  fatRecalcTotal();
}

function fatRecalcTotal(){
  const checks = [...document.querySelectorAll('.fat-nf-check:checked')];
  const total = Math.round(checks.reduce((a,c)=>a+parseFloat(c.dataset.valor||0),0)*100)/100;
  if(total > 0){
    $('fat-resumo-wrap').style.display = 'block';
    $('fat-boleto-wrap').style.display = 'block';
    $('fat-resumo-qtd').textContent = checks.length;
    $('fat-resumo-total').textContent = 'R$ ' + total.toLocaleString('pt-BR',{minimumFractionDigits:2});
    fatGerarParcelas();
  } else {
    $('fat-resumo-wrap').style.display = 'none';
    $('fat-boleto-wrap').style.display = 'none';
  }
}

function fatGerarParcelas(){
  const checks = [...document.querySelectorAll('.fat-nf-check:checked')];
  const total = Math.round(checks.reduce((a,c)=>a+parseFloat(c.dataset.valor||0),0)*100)/100;
  const n = parseInt($('f-fat-parcelas').value)||1;
  const dataRef = $('f-fat-data').value || today;
  const base = Math.floor((total/n)*100)/100;
  const resto = Math.round((total - base*n)*100)/100;
  const linhas = [];
  for(let i=0;i<n;i++){
    const d = new Date(dataRef);
    d.setMonth(d.getMonth()+(i+1));
    linhas.push({venc: d.toISOString().split('T')[0], val: i===n-1 ? Math.round((base+resto)*100)/100 : base});
  }
  fatRenderLinhas(linhas);
  fatAtualizarSoma();
}

function fatRecalcularParcelas(){
  const checks = [...document.querySelectorAll('.fat-nf-check:checked')];
  const total = Math.round(checks.reduce((a,c)=>a+parseFloat(c.dataset.valor||0),0)*100)/100;
  const n = parseInt($('f-fat-parcelas').value)||1;
  const base = Math.floor((total/n)*100)/100;
  const resto = Math.round((total - base*n)*100)/100;
  const rows = document.querySelectorAll('.fat-parcela-val');
  rows.forEach((inp,i)=>{ inp.value = i===rows.length-1 ? (Math.round((base+resto)*100)/100).toFixed(2) : base.toFixed(2); });
  fatAtualizarSoma();
}

function fatRenderLinhas(linhas){
  $('fat-parcelas-linhas').innerHTML = linhas.map((l,i)=>`
    <div class="parcela-row">
      <span class="parcela-num">${i+1}×</span>
      <input type="date" class="fat-parcela-venc" value="${l.venc}" oninput="fatAtualizarSoma()"/>
      <input type="number" class="fat-parcela-val" value="${l.val.toFixed(2)}" step="0.01" min="0" oninput="fatAtualizarSoma()"/>
      <span style="font-size:10px;color:var(--text3)">Parcela ${i+1}</span>
    </div>`).join('');
}

function fatAtualizarSoma(){
  const checks = [...document.querySelectorAll('.fat-nf-check:checked')];
  const total = Math.round(checks.reduce((a,c)=>a+parseFloat(c.dataset.valor||0),0)*100)/100;
  const vals = [...document.querySelectorAll('.fat-parcela-val')].map(i=>parseFloat(i.value)||0);
  const soma = Math.round(vals.reduce((a,b)=>a+b,0)*100)/100;
  const diff = Math.round((soma-total)*100)/100;
  const somaEl=$('fat-parcelas-soma'), msgEl=$('fat-parcelas-diff-msg');
  somaEl.textContent='R$ '+soma.toLocaleString('pt-BR',{minimumFractionDigits:2});
  if(Math.abs(diff)<0.01){ somaEl.className='parcela-diff ok'; msgEl.textContent='✓ Valores corretos'; msgEl.style.color='var(--accent)'; }
  else { somaEl.className='parcela-diff err'; msgEl.textContent=(diff>0?'Excesso':'Falta')+': R$ '+Math.abs(diff).toLocaleString('pt-BR',{minimumFractionDigits:2}); msgEl.style.color='var(--red)'; }
}

async function salvarFaturamento(){
  const forn = $('f-fat-forn').value;
  if(!forn){ toast('Selecione o fornecedor','error'); return; }
  const checks = [...document.querySelectorAll('.fat-nf-check:checked')];
  if(!checks.length){ toast('Selecione ao menos uma NF','error'); return; }

  // Coleta parcelas
  const vencEls = [...document.querySelectorAll('.fat-parcela-venc')];
  const valEls  = [...document.querySelectorAll('.fat-parcela-val')];
  if(!vencEls.length){ toast('Aguarde as parcelas serem geradas','error'); return; }
  for(let i=0;i<vencEls.length;i++){
    if(!vencEls[i].value){ toast('Informe a data da parcela '+(i+1),'error'); return; }
    if(!(parseFloat(valEls[i].value)>0)){ toast('Informe o valor da parcela '+(i+1),'error'); return; }
  }
  const parcelas = vencEls.map((el,i)=>({venc:el.value, val:Math.round(parseFloat(valEls[i].value)*100)/100}));
  const total = Math.round(checks.reduce((a,c)=>a+parseFloat(c.dataset.valor||0),0)*100)/100;

  const nfIds  = checks.map(c=>parseInt(c.dataset.id));
  const nfNums = nfIds.map(id=>{ const n=NFs.find(x=>x.id===id); return n?n.num:id; });
  const num = $('f-fat-num').value.trim() || ('FAT-'+new Date().getFullYear()+'-'+String(nextFatId).padStart(3,'0'));

  const fat = {
    id: nextFatId++,
    num,
    data: $('f-fat-data').value || today,
    venc: parcelas[0].venc,
    forn,
    nfIds,
    nfNums,
    valor: total,
    forma: $('f-fat-forma').value,
    obs: $('f-fat-obs').value.trim(),
    parcelas,
    status: 'Pendente'
  };
  Faturamentos.unshift(fat);

  // Marca NFs como Faturado
  nfIds.forEach(id=>{
    const nf = NFs.find(x=>x.id===id);
    if(nf){ nf.pgto='Faturado'; nf.fatNum=num; }
  });

  // Cria 1 título por parcela — mas todas referenciando o mesmo faturamento consolidado
  const descNFs = nfNums.length <= 3
    ? 'NFs: ' + nfNums.join(', ')
    : 'NFs: ' + nfNums.slice(0,3).join(', ') + ' e mais ' + (nfNums.length-3);
  const novosTits = [];
  parcelas.forEach((p,i)=>{
    const label = parcelas.length > 1 ? ` — Parcela ${i+1}/${parcelas.length}` : '';
    const tit = {
      id: newId('tit'),
      forn,
      tipo: 'Boleto NF',
      ref: num + label,
      valor: p.val,
      emissao: fat.data,
      venc: p.venc,
      status: 'Pendente',
      placa: '-',
      obs: descNFs + (fat.obs ? ' | ' + fat.obs : '')
    };
    Titulos.unshift(tit);
    novosTits.push(tit);
  });

  closeModal('modal-faturamento');
  renderAll();

  // ── Upsert direto no Supabase — sem wrapper, com feedback visual imediato ──
  const nfsAfetadas = nfIds.map(id => NFs.find(x=>x.id===id)).filter(Boolean);
  const _ts = new Date().toISOString();
  console.log('[FAT] Persistindo. id=', fat.id, 'num=', fat.num, 'forn=', fat.forn, 'valor=', fat.valor);

  // 1) Salva o Faturamento
  const _r1 = await supa.from('tg_faturamentos').upsert(
    [{ id: Number(fat.id), data: fat, updated_at: _ts }], { onConflict: 'id' }
  );
  if(_r1.error){
    alert('❌ ERRO ao salvar Faturamento no servidor:\n\n' + _r1.error.message +
          '\nCódigo: ' + (_r1.error.code||'?') +
          '\n\nO registro ficou apenas nesta sessão. Sem relogar, ele será perdido.');
    console.error('[FAT] Erro faturamento:', _r1.error);
  } else {
    console.log('[FAT] ✅ Faturamento salvo. id=', fat.id);
    toast('✅ Faturamento ' + fat.num + ' salvo no servidor!');
  }

  // 2) Salva os Títulos gerados
  if(novosTits.length){
    const _r2 = await supa.from('tg_titulos').upsert(
      novosTits.map(t => ({ id: Number(t.id), data: t, updated_at: _ts })), { onConflict: 'id' }
    );
    if(_r2.error){ console.error('[FAT] Erro títulos:', _r2.error); }
    else { console.log('[FAT] ✅ Títulos salvos. qtd=', novosTits.length); }
  }

  // 3) Atualiza NFs para Faturado
  if(nfsAfetadas.length){
    const _r3 = await supa.from('tg_nfs').upsert(
      nfsAfetadas.map(n => ({ id: Number(n.id), data: n, updated_at: _ts })), { onConflict: 'id' }
    );
    if(_r3.error){ console.error('[FAT] Erro NFs:', _r3.error); }
    else { console.log('[FAT] ✅ NFs atualizadas. qtd=', nfsAfetadas.length); }
  }

  // 4) Contadores
  await saveCounters();
  console.log('[FAT] Concluído. Faturamentos em memória:', Faturamentos.length);
}

function excluirFaturamento(id){
  const f = Faturamentos.find(x=>x.id===id);
  confirmDelete(`Excluir Faturamento ${f.num}?`, `Fornecedor: ${f.forn} | Valor: ${fmt(f.valor)}`, ()=>{
    // Reverte NFs para Aguardando Faturamento
    f.nfIds.forEach(nid=>{ const nf=NFs.find(x=>x.id===nid); if(nf&&nf.pgto==='Faturado'){ nf.pgto='Aguardando Faturamento'; delete nf.fatNum; } });
    // Remove títulos gerados por este faturamento
    Titulos = Titulos.filter(t => !t.ref.startsWith(f.num));
    Faturamentos = Faturamentos.filter(x=>x.id!==id);
    toast('Faturamento excluído e títulos removidos.'); renderAll();
  });
}

function marcarFatPago(id){
  const f = Faturamentos.find(x=>x.id===id);
  if(!f) return;
  f.status = 'Pago';
  // Marca todos os títulos deste faturamento como pagos
  Titulos.filter(t=>t.ref.startsWith(f.num)).forEach(t=>t.status='Pago');
  toast('Faturamento marcado como pago!'); renderAll();
}

function renderFaturamentos(){
  // Painel de NFs aguardando
  const aguard = NFs.filter(n=>n.pgto==='Aguardando Faturamento');
  $('nf-aguard-count').textContent = aguard.length + ' NF(s) em aberto';
  $('fat-count').textContent = Faturamentos.length;
  if(aguard.length>0){
    $('fat-aguard-badge').textContent = '⏳ '+aguard.length+' NF(s) aguardando';
  } else {
    $('fat-aguard-badge').textContent = '';
  }
  $('tb-nf-aguard').innerHTML = aguard.length ? aguard.map(n=>{
    const dias = Math.round((new Date()-new Date(n.data||today))/86400000);
    return `<tr>
      <td class="mono" style="color:var(--accent2)">${n.num}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.forn}</td>
      <td style="font-size:11px;color:var(--text3)">${n.oc}</td>
      <td class="mono">${fmt(n.valor)}</td>
      <td style="font-size:11px">${n.data||'—'}</td>
      <td>${chip(dias+'d',dias>15?'cr':dias>7?'ca':'cgr')}</td>
      <td><button class="btn btn-primary btn-sm" onclick="abrirFatParaNF(${n.id})">💼 Faturar</button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="empty">✅ Nenhuma NF aguardando faturamento</td></tr>';

  // Tabela de faturamentos registrados
  $('tb-fat').innerHTML = Faturamentos.length ? Faturamentos.map(f=>{
    const pgBtn = f.status==='Pendente'
      ? `<button class="btn btn-save btn-sm" onclick="marcarFatPago(${f.id})">✓ Pago</button>`
      : `<span style="font-size:11px;color:var(--accent)">✓ Quitado</span>`;
    const vencDisplay = f.venc || (f.parcelas && f.parcelas[0] ? f.parcelas[0].venc : '—');
    const qtdBadge = (f.nfNums||[]).length > 1
      ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(0,196,161,.12);color:var(--accent);border:1px solid rgba(0,196,161,.25);margin-left:5px">${f.nfNums.length} NFs</span>` : '';
    return `<tr>
      <td class="mono" style="color:var(--accent2);font-size:11px">${f.num}${qtdBadge}</td>
      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.forn}</td>
      <td style="font-size:11px;color:var(--text2);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(f.nfNums||[]).map(n=>'NF '+n).join(', ')}">${(f.nfNums||[]).map(n=>'NF '+n).join(', ')||'—'}</td>
      <td class="mono" style="font-weight:600">${fmt(f.valor)}</td>
      <td style="font-size:11px">${vencDisplay}</td>
      <td style="font-size:11px">${f.forma}</td>
      <td>${chipS(f.status)}</td>
      <td><div class="action-btns">${pgBtn}<button class="btn btn-danger btn-sm" onclick="excluirFaturamento(${f.id})">🗑️</button></div></td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" class="empty">Nenhum faturamento registrado ainda.<br><span style="font-size:11px;color:var(--text3)">Se você já registrou faturamentos, clique em 🔄 Recarregar ou reabra a tela.</span></td></tr>';
}

// Recarrega faturamentos diretamente do Supabase e re-renderiza
async function recarregarFaturamentos(){
  try {
    toast('Recarregando faturamentos...');
    const rows = await loadTabelaCompleta(TG_TABLES['Faturamentos']);
    Faturamentos = rows.map(row => normalizeFromSupabaseData('Faturamentos', row));
    console.log('Faturamentos recarregados:', Faturamentos.length, Faturamentos);
    renderFaturamentos();
    toast('Faturamentos atualizados: ' + Faturamentos.length + ' registro(s).');
  } catch(e) {
    console.error('Erro ao recarregar faturamentos:', e);
    toast('Erro ao recarregar: ' + e.message, 'error');
  }
}

// Recarrega NFs diretamente do Supabase e força exibição das que estão Aguardando Faturamento
async function forcaNFsAguardando(){
  toast('Recarregando NFs do servidor...');
  try {
    const rows = await loadTabelaCompleta(TG_TABLES['NFs']);
    NFs = rows.map(row => normalizeFromSupabaseData('NFs', row));
    console.log('[forcaNFs] NFs recarregadas:', NFs.length);

    const aguardando = NFs.filter(n => n.pgto === 'Aguardando Faturamento');
    console.log('[forcaNFs] NFs aguardando faturamento:', aguardando.length, aguardando);

    if (!aguardando.length) {
      // Mostra TODAS as NFs e deixa o usuário escolher quais reabrir para faturamento
      const lista = NFs.map((n, i) =>
        i + ': NF ' + (n.num||'?') + ' | ' + (n.forn||'?') + ' | R$ ' + (n.valor||0) + ' | ' + (n.pgto||'sem pgto')
      ).join('\n');

      const resposta = prompt(
        'Nenhuma NF com status "Aguardando Faturamento" encontrada.\n\n' +
        'NFs salvas no servidor:\n' + lista +
        '\n\nDigite os números (0, 1, 2...) das NFs que quer reabrir para faturar, separados por vírgula.\n' +
        'Exemplo: 0,1'
      );
      if(!resposta && resposta !== '0') return;

      const indices = resposta.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 0 && n < NFs.length);
      if(!indices.length){ toast('Nenhum índice válido.', 'error'); return; }

      const paraReabrir = indices.map(i => NFs[i]);
      paraReabrir.forEach(n => { n.pgto = 'Aguardando Faturamento'; delete n.fatNum; });

      const _ts2 = new Date().toISOString();
      const { error: _eReab } = await supa.from('tg_nfs').upsert(
        paraReabrir.map(n => ({ id: Number(n.id), data: n, updated_at: _ts2 })), { onConflict: 'id' }
      );
      if(_eReab){ alert('Erro ao reabrir NFs: ' + _eReab.message); return; }

      renderFaturamentos();
      toast(paraReabrir.length + ' NF(s) reabertas! Clique em 💼 Faturar.');
      return;
    }

    renderFaturamentos();
    toast(aguardando.length + ' NF(s) aguardando faturamento carregada(s)! Clique em 💼 Faturar.');
  } catch(e) {
    console.error('[forcaNFs] Erro:', e);
    toast('Erro ao recarregar NFs: ' + e.message, 'error');
  }
}

// Atalho: abre modal de faturamento já com o fornecedor da NF pré-selecionado (todas as NFs do forn marcadas)
function abrirFatParaNF(nfId){
  const nf = NFs.find(x=>x.id===nfId); if(!nf) return;
  openModalFaturamento();
  setTimeout(()=>{
    $('f-fat-forn').value = nf.forn;
    fatFiltrarNFs(); // já marca todas as NFs do fornecedor (checked por padrão)
  }, 80);
}

// ======================== NF RÁPIDA (Lançamento direto da tela de Faturamentos) ========================

function openModalNFRapida(){
  // Popula o select de OCs
  const selOC = $('f-nfr-oc');
  selOC.innerHTML = '<option value="Sem OC">Sem OC</option>';
  OCs.forEach(o => selOC.innerHTML += `<option value="${o.num}">${o.num} — ${o.forn}</option>`);

  // Popula placas no destino
  const selDest = $('f-nfr-dest');
  selDest.innerHTML = '<option value="Estoque">Estoque</option>';
  Frota.forEach(f=>{ if(f.placa) selDest.innerHTML+=`<option value="${f.placa}">${f.placa}${f.modelo?' — '+f.modelo:''}</option>`; });
  Frota.forEach(f => selDest.innerHTML += `<option value="${f.placa}">${f.placa}</option>`);

  // Reseta campos
  $('f-nfr-num').value = '';
  $('f-nfr-data').value = today;
  if($('f-nfr-forn')) $('f-nfr-forn').value = '';
  $('f-nfr-valor').value = '';
  $('f-nfr-obs').value = '';
  $('f-nfr-tipo').value = 'NF de Serviço';
  $('f-nfr-oc').value = 'Sem OC';
  $('f-nfr-dest').value = 'Estoque';

  $('modal-nf-rapida').classList.add('open');
}

function salvarNFRapida(){
  const forn = $('f-nfr-forn').value.trim();
  if(!forn || forn === ''){ toast('Selecione o fornecedor','error'); return; }
  const total = parseFloat($('f-nfr-valor').value) || 0;
  if(!total){ toast('Informe o valor total da NF','error'); return; }

  const obj = {
    id: newId('nf'),
    oc: $('f-nfr-oc').value,
    tipo: $('f-nfr-tipo').value,
    num: $('f-nfr-num').value.trim() || 'NF-' + Date.now(),
    data: $('f-nfr-data').value || today,
    forn,
    dest: $('f-nfr-dest').value,
    valor: total,
    venc: null,
    pgto: 'Aguardando Faturamento',
    obs: $('f-nfr-obs').value.trim(),
    parcelas: []
  };
  NFs.unshift(obj);

  // Atualiza OC vinculada, se houver
  if(obj.oc && obj.oc !== 'Sem OC'){
    const oc = OCs.find(x => x.num === obj.oc);
    if(oc) atualizarStatusOC(oc);
  }

  closeModal('modal-nf-rapida');
  toast('NF lançada! Aguardando faturamento do fornecedor. ⏳');
  renderAll();
}


// ======================== CRUD FORNECEDORES ========================

function openModalFornecedor(mode, id){
  editing._forn = id || null;
  if(mode === 'novo'){
    $('f-forn-nome').value=''; $('f-forn-cnpj').value=''; $('f-forn-tel').value='';
    $('f-forn-email').value=''; $('f-forn-cat').value='Manutenção (Serviço)';
    $('f-forn-status').value='Ativo'; $('f-forn-contato').value='';
    $('f-forn-pix').value=''; $('f-forn-end').value=''; $('f-forn-obs').value='';
    $('modal-forn-title').textContent='Novo Fornecedor';
    $('btn-save-forn').textContent='💾 Salvar';
  } else {
    const o = Fornecedores.find(x=>x.id===id); if(!o)return;
    $('f-forn-nome').value=o.nome||''; $('f-forn-cnpj').value=o.cnpj||'';
    $('f-forn-tel').value=o.tel||''; $('f-forn-email').value=o.email||'';
    $('f-forn-cat').value=o.cat||''; $('f-forn-status').value=o.status||'Ativo';
    $('f-forn-contato').value=o.contato||''; $('f-forn-pix').value=o.pix||'';
    $('f-forn-end').value=o.end||''; $('f-forn-obs').value=o.obs||'';
    $('modal-forn-title').textContent='Editar Fornecedor';
    $('btn-save-forn').textContent='💾 Atualizar';
  }
  $('modal-fornecedor').classList.add('open');
}

function salvarFornecedor(){
  const nome = $('f-forn-nome').value.trim();
  if(!nome){ toast('Informe o nome do fornecedor','error'); return; }
  // Verificar duplicidade (exceto na edição do próprio registro)
  const dup = Fornecedores.find(f => f.nome.toLowerCase()===nome.toLowerCase() && f.id !== editing._forn);
  if(dup){ toast('Já existe um fornecedor com este nome!','error'); return; }

  const obj = {
    nome, cnpj:$('f-forn-cnpj').value.trim(), tel:$('f-forn-tel').value.trim(),
    email:$('f-forn-email').value.trim(), cat:$('f-forn-cat').value,
    status:$('f-forn-status').value, contato:$('f-forn-contato').value.trim(),
    pix:$('f-forn-pix').value.trim(), end:$('f-forn-end').value.trim(),
    obs:$('f-forn-obs').value.trim()
  };

  if(editing._forn){
    const i = Fornecedores.findIndex(x=>x.id===editing._forn);
    Fornecedores[i] = {...Fornecedores[i], ...obj};
    editing._forn = null; toast('Fornecedor atualizado!');
  } else {
    obj.id = nextFornId++;
    Fornecedores.push(obj); toast('Fornecedor cadastrado! ✅');
  }
  closeModal('modal-fornecedor');
  populateSelects();
  renderFornecedores();
}

function excluirFornecedor(id){
  const o = Fornecedores.find(x=>x.id===id);
  // Verificar uso em OCs, NFs, etc.
  const emUso = OCs.some(x=>x.forn===o.nome) || NFs.some(x=>x.forn===o.nome);
  if(emUso){
    toast('Este fornecedor está em uso em OCs ou NFs e não pode ser excluído.','error');
    return;
  }
  confirmDelete(`Excluir fornecedor "${o.nome}"?`,'Esta ação não pode ser desfeita.',()=>{
    Fornecedores = Fornecedores.filter(x=>x.id!==id);
    populateSelects(); renderFornecedores(); toast('Fornecedor excluído.');
  });
}

function renderFornecedores(){
  const busca = ($('forn-busca')||{value:''}).value.toLowerCase();
  const lista = Fornecedores.filter(f =>
    !busca || f.nome.toLowerCase().includes(busca) ||
    (f.cnpj||'').includes(busca) || (f.cat||'').toLowerCase().includes(busca)
  );
  const tb = $('tb-fornecedores'); if(!tb) return;
  if(!lista.length){ tb.innerHTML=`<tr><td colspan="7" class="empty">Nenhum fornecedor encontrado.</td></tr>`; return; }
  tb.innerHTML = lista.map(f=>`<tr>
    <td><strong>${f.nome}</strong>${f.contato?`<br><span style="font-size:10px;color:var(--text3)">${f.contato}</span>`:''}</td>
    <td class="mono" style="font-size:11px">${f.cnpj||'-'}</td>
    <td style="font-size:11px">${f.tel||'-'}</td>
    <td style="font-size:11px">${f.email||'-'}</td>
    <td><span class="chip cgr">${f.cat||'-'}</span></td>
    <td>${f.status==='Ativo'?'<span class="chip cg">Ativo</span>':'<span class="chip cr">Inativo</span>'}</td>
    <td>${acts(`openModalFornecedor('editar',${f.id})`,`excluirFornecedor(${f.id})`)}</td>
  </tr>`).join('');
}


// ======================== CRUD PRODUTOS ========================

function openModalProduto(mode, id){
  editing._prod = id || null;
  if(mode === 'novo'){
    $('f-prod-nome').value=''; $('f-prod-cod').value=''; $('f-prod-cat').value='Lubrificantes';
    $('f-prod-uncompra').value='peça'; $('f-prod-unsaida').value='peça';
    $('f-prod-fator').value='1'; $('f-prod-minimo').value='0';
    $('f-prod-valor').value=''; $('f-prod-obs').value='';
    $('modal-prod-title').textContent='Novo Produto';
    $('btn-save-prod').textContent='💾 Salvar';
  } else {
    const o = Produtos.find(x=>x.id===id); if(!o)return;
    $('f-prod-nome').value=o.nome; $('f-prod-cod').value=o.cod;
    $('f-prod-cat').value=o.cat; $('f-prod-uncompra').value=o.unCompra;
    $('f-prod-unsaida').value=o.unSaida; $('f-prod-fator').value=o.fator;
    $('f-prod-minimo').value=o.minimo; $('f-prod-valor').value=o.valorUnitCompra;
    $('f-prod-obs').value=o.obs||'';
    $('modal-prod-title').textContent='Editar Produto';
    $('btn-save-prod').textContent='💾 Atualizar';
  }
  $('modal-produto').classList.add('open');
}

function salvarProduto(){
  const nome = $('f-prod-nome').value.trim();
  if(!nome){ toast('Informe o nome do produto','error'); return; }
  const dup = Produtos.find(p=>p.nome.toLowerCase()===nome.toLowerCase() && p.id!==editing._prod);
  if(dup){ toast('Já existe um produto com este nome!','error'); return; }
  const fator = parseFloat($('f-prod-fator').value)||1;
  if(fator<=0){ toast('Fator de conversão deve ser maior que zero','error'); return; }

  const obj = {
    nome, cod:$('f-prod-cod').value.trim()||'PROD-'+String(nextProdId).padStart(3,'0'),
    cat:$('f-prod-cat').value, unCompra:$('f-prod-uncompra').value.trim()||'unidade',
    unSaida:$('f-prod-unsaida').value.trim()||'unidade', fator,
    minimo:parseFloat($('f-prod-minimo').value)||0,
    valorUnitCompra:parseFloat($('f-prod-valor').value)||0, obs:$('f-prod-obs').value.trim()
  };

  if(editing._prod){
    const i = Produtos.findIndex(x=>x.id===editing._prod);
    Produtos[i] = {...Produtos[i], ...obj};
    editing._prod = null; toast('Produto atualizado! ✅');
  } else {
    obj.id = nextProdId++; obj.qtdEstoque = 0;
    Produtos.push(obj); toast('Produto cadastrado! ✅');
  }
  closeModal('modal-produto');
  populateSelects();
  renderProdutos();
  renderEstoque();
}

function excluirProduto(id){
  const o = Produtos.find(x=>x.id===id);
  if(o.qtdEstoque > 0){ toast(`Este produto tem ${o.qtdEstoque} ${o.unSaida}(s) em estoque. Zere o estoque antes de excluir.`,'error'); return; }
  confirmDelete(`Excluir produto "${o.nome}"?`,'Esta ação não pode ser desfeita.',()=>{
    Produtos = Produtos.filter(x=>x.id!==id);
    populateSelects(); renderProdutos(); renderEstoque(); toast('Produto excluído.');
  });
}

function renderProdutos(){
  const busca = ($('prod-busca')||{value:''}).value.toLowerCase();
  const lista = Produtos.filter(p=>
    !busca || p.nome.toLowerCase().includes(busca) ||
    (p.cod||'').toLowerCase().includes(busca) || (p.cat||'').toLowerCase().includes(busca)
  );
  const tb = $('tb-produtos'); if(!tb) return;
  $('prod-count').textContent = Produtos.length;
  if(!lista.length){ tb.innerHTML=`<tr><td colspan="8" class="empty">Nenhum produto cadastrado.</td></tr>`; return; }
  tb.innerHTML = lista.map(p=>{
    const baixo = p.qtdEstoque <= p.minimo && p.minimo > 0;
    return `<tr>
      <td class="mono" style="font-size:11px">${p.cod}</td>
      <td><strong>${p.nome}</strong>${p.obs?`<br><span style="font-size:10px;color:var(--text3)">${p.obs}</span>`:''}</td>
      <td><span class="chip cgr">${p.cat}</span></td>
      <td style="font-size:12px">${p.unCompra}</td>
      <td style="font-size:12px">${p.unSaida} <span style="font-size:10px;color:var(--text3)">(fator ${p.fator})</span></td>
      <td class="mono" style="font-size:12px;text-align:center">${p.fator}×</td>
      <td class="mono" style="font-size:13px;font-weight:600;color:${baixo?'var(--red)':'var(--text)'}">${p.qtdEstoque.toLocaleString('pt-BR',{maximumFractionDigits:3})} ${p.unSaida}${baixo?' ⚠️':''}</td>
      <td>${acts(`openModalProduto('editar',${p.id})`,`excluirProduto(${p.id})`)}</td>
    </tr>`;
  }).join('');
}

// Preenche select de produtos nos modais de entrada/saída
function populateProdutoSelects(){
  ['f-ep-prod','f-saida-peca'].forEach(sid=>{
    const s=$(sid); if(!s) return;
    const curVal = s.value;
    s.innerHTML = '<option value="">— Selecione o produto —</option>';
    Produtos.forEach(p=>s.innerHTML+=`<option value="${p.id}">${p.nome} [${p.qtdEstoque.toLocaleString('pt-BR',{maximumFractionDigits:3})} ${p.unSaida}]</option>`);
    if(curVal) s.value=curVal;
  });
}

// Callbacks ao selecionar produto na entrada
function epProdutoChanged(){
  const id = parseInt($('f-ep-prod').value);
  const p = Produtos.find(x=>x.id===id);
  const info = $('ep-conv-info');
  if(!p){ info.style.display='none'; $('ep-uncompra-label').textContent='un.'; $('ep-unsaida-label').textContent='un.'; return; }
  $('ep-uncompra-label').textContent = p.unCompra;
  $('ep-unsaida-label').textContent = p.unSaida;
  if(p.fator !== 1){
    info.style.display='block';
    info.innerHTML=`🔄 1 <strong>${p.unCompra}</strong> = <strong>${p.fator}</strong> ${p.unSaida} | Estoque atual: <strong>${p.qtdEstoque.toLocaleString('pt-BR',{maximumFractionDigits:3})} ${p.unSaida}</strong>`;
  } else {
    info.style.display='none';
  }
  if(p.valorUnitCompra) $('f-ep-valor').value = p.valorUnitCompra.toFixed(2);
  epRecalcSaida();
}

function epRecalcSaida(){
  const id = parseInt($('f-ep-prod').value);
  const p = Produtos.find(x=>x.id===id);
  const qtdCompra = parseFloat($('f-ep-qtd-compra').value)||0;
  $('f-ep-qtd-saida').value = p ? (qtdCompra * p.fator).toLocaleString('pt-BR',{maximumFractionDigits:3}) : '0';
}

// Callback ao selecionar produto na saída
function saidaProdutoChanged(){
  const id = parseInt($('f-saida-peca').value);
  const p = Produtos.find(x=>x.id===id);
  const info = $('saida-estoque-info');
  if(!p){ info.style.display='none'; $('saida-unsaida-label').textContent='un.'; return; }
  $('saida-unsaida-label').textContent = p.unSaida;
  info.style.display='block';
  const baixo = p.qtdEstoque <= p.minimo && p.minimo > 0;
  info.innerHTML=`📦 Estoque atual: <strong style="color:${baixo?'var(--red)':'var(--accent)'}">${p.qtdEstoque.toLocaleString('pt-BR',{maximumFractionDigits:3})} ${p.unSaida}</strong>${p.minimo>0?` | Mínimo: ${p.minimo} ${p.unSaida}`:''}`;
  $('f-saida-qtd').value = '1';
}

// ======================== SUPABASE ========================
// (cliente já declarado no início do script — ver const supa = ...)

let usuarioLogado = null;

// ======================== AUDITORIA / LOGS ========================
// Registra ações importantes na tabela tg_logs.
// Não bloqueia o sistema se o log falhar: salva no console e segue o fluxo.
async function registrarLog({ acao, tabela, registro_id, descricao }) {
  try {
    const { data } = await supa.auth.getUser();

    const email = data?.user?.email || "usuario-sem-login";

    const payload = {
      usuario: email,
      acao: acao || 'acao',
      tabela: tabela || '',
      registro_id: String(registro_id ?? ''),
      descricao: descricao || ''
    };

    const { error } = await supa.from("tg_logs").insert([payload]);

    if (error) {
      console.error("Erro ao salvar log:", error);
    } else {
      console.log("Log salvo com sucesso");
    }

  } catch (err) {
    console.error("Erro geral log:", err);
  }
}

// ======================== LOGIN / LOGOUT ========================

async function doLogin(){
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const senha = document.getElementById('login-senha').value;
  const errEl = document.getElementById('login-err');
  const btn = document.querySelector('.login-btn');

  if(!email || !senha){ errEl.textContent='Preencha e-mail e senha.'; errEl.style.display='block'; return; }

  btn.textContent = 'Entrando...';
  btn.disabled = true;

  const { data, error } = await supa.auth.signInWithPassword({ email, password: senha });

  btn.textContent = 'Entrar no Sistema →';
  btn.disabled = false;

  if(error){
    errEl.textContent = 'E-mail ou senha incorretos.';
    errEl.style.display = 'block';
    document.getElementById('login-senha').value = '';
    return;
  }

  errEl.style.display = 'none';
  const user = data.user;

  // Busca perfil no array local pelo e-mail
  const perfil = Usuarios.find(u => u.email.toLowerCase() === email);

  // Atualiza sidebar
  const nomeExibir = perfil ? perfil.nome : (user.email.split('@')[0]);
  const perfilExibir = perfil ? perfil.perfil.replace(' (Acesso Total)','') : 'Usuário';
  const iniciais = nomeExibir.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();

  document.getElementById('sb-avatar').textContent = iniciais;
  document.getElementById('sb-nome').textContent = nomeExibir;
  document.getElementById('sb-perfil').textContent = perfilExibir;

  usuarioLogado = { ...user, nome: nomeExibir, perfil: perfilExibir };

  // Exibe o sistema
  document.getElementById('login-wrap').style.display = 'none';
  document.getElementById('app-wrap').style.display = 'flex';
  renderAll();
}

async function doLogout(){
  if(!confirm('Deseja sair do sistema?')) return;

  await supa.auth.signOut();
  usuarioLogado = null;

  document.getElementById('login-email').value = '';
  document.getElementById('login-senha').value = '';
  document.getElementById('login-err').style.display = 'none';

  document.getElementById('app-wrap').style.display = 'none';
  document.getElementById('login-wrap').style.display = 'flex';

  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('screen-dashboard').classList.add('active');
}

// ======================== PERSISTÊNCIA SUPABASE — TABELAS SEPARADAS ========================

// ======================== LANÇAMENTO AVULSO ========================

// ======================== PAGAMENTO RÁPIDO ========================
function openModalPagRapido(){
  const sel = document.getElementById('f-pr-forn');
  if(sel){
    sel.innerHTML = '<option value="">— Selecione —</option>';
    const fornsAtivos = Fornecedores.filter(f => f.status === 'Ativo' || !f.status);
    if(fornsAtivos.length){
      let g = '<optgroup label="🏢 Fornecedores">';
      fornsAtivos.forEach(f => g += `<option value="${f.nome}">${f.nome}</option>`);
      sel.innerHTML += g + '</optgroup>';
    }
    const colabsAtivos = Colaboradores.filter(c => c.status === 'Ativo' || !c.status);
    if(colabsAtivos.length){
      let g = '<optgroup label="👤 Colaboradores">';
      colabsAtivos.forEach(c => g += `<option value="${c.nome}">${c.nome}${c.cargo?' ('+c.cargo+')':''}</option>`);
      sel.innerHTML += g + '</optgroup>';
    }
  }
  document.getElementById('f-pr-cat').value   = 'diarias';
  document.getElementById('f-pr-valor').value = '';
  document.getElementById('f-pr-desc').value  = '';
  document.getElementById('f-pr-data').value  = today;
  document.getElementById('f-pr-forma').value = 'PIX';
  document.getElementById('modal-pag-rapido').classList.add('open');
}

function salvarPagRapido(){
  const forn  = document.getElementById('f-pr-forn').value.trim();
  if(!forn){ toast('Selecione o beneficiário','error'); return; }
  const desc  = document.getElementById('f-pr-desc').value.trim();
  if(!desc){ toast('Informe a descrição','error'); return; }
  const valor = parseFloat(document.getElementById('f-pr-valor').value)||0;
  if(!valor){ toast('Informe o valor','error'); return; }
  const data  = document.getElementById('f-pr-data').value || today;
  const forma = document.getElementById('f-pr-forma').value;
  const cat   = document.getElementById('f-pr-cat').value;

  const titulo = {
    id: newId('tit'),
    forn,
    tipo: 'Avulso',
    ref: desc,
    valor,
    emissao: data,
    venc: data,
    status: 'Pago',
    placa: '-',
    obs: `Pagamento Rápido — ${forma}`,
    categoria: cat,
    competencia: data.slice(0,7),
  };

  Titulos.unshift(titulo);
  saveEntidade('Titulos', [titulo]);
  saveCounters();
  popularFiltroMeses();
  populateSelects();
  renderAll();
  closeModal('modal-pag-rapido');
  toast(`✅ Pagamento de ${fmt(valor)} lançado e marcado como Pago!`);
}

function openModalAvulso(){
  // Popula fornecedores e colaboradores em grupos separados
  const sel = document.getElementById('f-av-forn');
  if(sel){
    sel.innerHTML = '<option value="">— Selecione —</option>';
    // Grupo Fornecedores
    const fornsAtivos = Fornecedores.filter(f => f.status === 'Ativo' || !f.status);
    if(fornsAtivos.length){
      let grpForn = '<optgroup label="🏢 Fornecedores">';
      fornsAtivos.forEach(f => grpForn += `<option value="${f.nome}">${f.nome}</option>`);
      grpForn += '</optgroup>';
      sel.innerHTML += grpForn;
    }
    // Grupo Colaboradores
    const colabsAtivos = Colaboradores.filter(c => c.status === 'Ativo' || !c.status);
    if(colabsAtivos.length){
      let grpColab = '<optgroup label="👤 Colaboradores">';
      colabsAtivos.forEach(c => grpColab += `<option value="${c.nome}">${c.nome}${c.cargo ? ' (' + c.cargo + ')' : ''}</option>`);
      grpColab += '</optgroup>';
      sel.innerHTML += grpColab;
    }
  }
  document.getElementById('f-av-cat').value = 'seguros';
  document.getElementById('f-av-valor').value = '';
  document.getElementById('f-av-desc').value = '';
  document.getElementById('f-av-ref').value = '';
  document.getElementById('f-av-parcelas').value = '1';
  document.getElementById('f-av-forma').value = 'Boleto';
  document.getElementById('av-parcelas-linhas').innerHTML = '';
  document.getElementById('av-parcelas-soma').textContent = 'R$ 0,00';
  document.getElementById('av-parcelas-diff').textContent = '';
  avGerarParcelas();
  document.getElementById('modal-avulso').classList.add('open');
}

function avProxMes(anoMes, n){
  // Retorna anoMes + n meses no formato {ano, mes}
  let { ano, mes } = anoMes;
  mes += n;
  while(mes > 12){ mes -= 12; ano++; }
  return { ano, mes };
}

function avGerarParcelas(){
  const total = parseFloat(document.getElementById('f-av-valor').value)||0;
  const qtd = parseInt(document.getElementById('f-av-parcelas').value)||1;
  const valParcela = qtd > 0 ? Math.round(total/qtd*100)/100 : 0;
  const hoje = new Date();
  const wrap = document.getElementById('av-parcelas-linhas');

  let html = '';
  for(let i = 0; i < qtd; i++){
    // Vencimento: 1 mês a frente por parcela
    const vencDate = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, hoje.getDate());
    const vencISO = vencDate.toISOString().slice(0,10);
    // Competência: mês atual + i
    const compMes = avProxMes({ano: hoje.getFullYear(), mes: hoje.getMonth()+1}, i);
    const compVal = `${compMes.ano}-${String(compMes.mes).padStart(2,'0')}`;

    html += `<div style="display:grid;grid-template-columns:28px 1fr 1fr 1fr auto;gap:8px;margin-bottom:6px;align-items:center">
      <span style="font-size:11px;font-weight:600;color:var(--text3);text-align:center">${i+1}</span>
      <input type="date" class="av-parc-venc" value="${vencISO}" style="font-size:12px;padding:6px 8px"/>
      <input type="month" class="av-parc-comp" value="${compVal}" style="font-size:12px;padding:6px 8px"/>
      <input type="number" class="av-parc-val" value="${valParcela.toFixed(2)}" step="0.01" min="0" oninput="avSomarParcelas()" style="font-size:12px;padding:6px 8px;font-family:var(--mono)"/>
      <span style="font-size:10px;color:var(--text3)">R$</span>
    </div>`;
  }
  wrap.innerHTML = html;
  avSomarParcelas();
}

function avRecalcParcelas(){
  const total = parseFloat(document.getElementById('f-av-valor').value)||0;
  const qtd = parseInt(document.getElementById('f-av-parcelas').value)||1;
  const valParcela = qtd > 0 ? Math.round(total/qtd*100)/100 : 0;
  document.querySelectorAll('.av-parc-val').forEach((el,i) => {
    // Só recalcula se ainda estiver com valor padrão
    el.value = valParcela.toFixed(2);
  });
  avSomarParcelas();
}

function avSomarParcelas(){
  const total = parseFloat(document.getElementById('f-av-valor').value)||0;
  const soma = [...document.querySelectorAll('.av-parc-val')].reduce((a,el)=>a+(parseFloat(el.value)||0),0);
  const somaEl = document.getElementById('av-parcelas-soma');
  const diffEl = document.getElementById('av-parcelas-diff');
  somaEl.textContent = 'R$ ' + soma.toLocaleString('pt-BR',{minimumFractionDigits:2});
  const diff = Math.round((soma - total)*100)/100;
  if(Math.abs(diff) > 0.02){
    diffEl.textContent = `Diferença: R$ ${Math.abs(diff).toFixed(2)}`;
    diffEl.style.color = 'var(--red)';
    somaEl.style.color = 'var(--red)';
  } else {
    diffEl.textContent = '✓';
    diffEl.style.color = 'var(--accent)';
    somaEl.style.color = 'var(--accent2)';
  }
}

function salvarAvulso(){
  const cat = document.getElementById('f-av-cat').value;
  const forn = document.getElementById('f-av-forn').value.trim();
  if(!forn){ toast('Selecione o fornecedor','error'); return; }
  const desc = document.getElementById('f-av-desc').value.trim();
  if(!desc){ toast('Informe a descrição','error'); return; }
  const total = parseFloat(document.getElementById('f-av-valor').value)||0;
  if(!total){ toast('Informe o valor','error'); return; }
  const ref = document.getElementById('f-av-ref').value.trim();
  const forma = document.getElementById('f-av-forma').value;

  const vencs = [...document.querySelectorAll('.av-parc-venc')];
  const comps = [...document.querySelectorAll('.av-parc-comp')];
  const vals  = [...document.querySelectorAll('.av-parc-val')];

  if(!vencs.length){ toast('Gere as parcelas primeiro','error'); return; }

  // Valida
  for(let i=0;i<vencs.length;i++){
    if(!vencs[i].value){ toast(`Informe o vencimento da parcela ${i+1}`,'error'); return; }
    if(!comps[i].value){ toast(`Informe a competência da parcela ${i+1}`,'error'); return; }
    if(!(parseFloat(vals[i].value)>0)){ toast(`Informe o valor da parcela ${i+1}`,'error'); return; }
  }

  // Verifica soma
  const soma = Math.round(vals.reduce((a,el)=>a+(parseFloat(el.value)||0),0)*100)/100;
  if(Math.abs(soma - total) > 0.02){
    toast(`A soma das parcelas (${fmt(soma)}) difere do total (${fmt(total)})`,'error'); return;
  }

  // Cria títulos
  const qtd = vencs.length;
  vencs.forEach((el,i) => {
    const label = qtd > 1 ? ` — Parcela ${i+1}/${qtd}` : '';
    const compYM = comps[i].value; // formato YYYY-MM
    const compData = compYM + '-01'; // primeiro dia do mês de competência
    Titulos.unshift({
      id: newId('tit'),
      forn,
      tipo: 'Avulso',
      ref: (ref||desc) + label,
      valor: Math.round(parseFloat(vals[i].value)*100)/100,
      emissao: compData, // competência como data de emissão para o relatório
      venc: el.value,
      status: 'Pendente',
      placa: '-',
      obs: desc + (ref ? ` — Ref: ${ref}` : '') + ` — ${forma}`,
      categoria: cat,
      competencia: compYM,
    });
  });

  closeModal('modal-avulso');
  toast(`${qtd} título(s) criado(s) no Contas a Pagar! ✅`);
  // Persiste os novos títulos no Supabase
  const novosTitulos = Titulos.slice(0, qtd);
  saveEntidade('Titulos', novosTitulos);
  saveCounters();
  popularFiltroMeses();
  populateSelects();
  renderAll();
}

// ======================== DIVERGÊNCIA NF x OC ========================

function nfCalcDivergencia(){
  const ocNum = ($('f-nf-oc')||{value:'Sem OC'}).value;
  const oc = OCs.find(o => o.num === ocNum);
  if(!oc){
    document.getElementById('nf-diverg-aviso').style.display = 'none';
    return;
  }

  // Valor da NF sendo lancada agora
  const valorNF = parseFloat(($('f-nf-valor')||{value:0}).value)||0;
  const acrescimo = parseFloat(document.getElementById('f-nf-acrescimo')?.value)||0;
  const desconto = parseFloat(document.getElementById('f-nf-desconto')?.value)||0;
  const valorFinal = valorNF + acrescimo - desconto;

  // Soma das NFs ja lancadas para esta OC (exceto a que esta sendo editada agora)
  const nfEditandoId = window._nfEditandoId || null;
  const nfsExistentes = NFs.filter(nf => nf.oc === ocNum && nf.id !== nfEditandoId);
  const somaExistentes = nfsExistentes.reduce((acc, nf) => acc + (parseFloat(nf.valor)||0), 0);
  const somaTotal = Math.round((somaExistentes + valorFinal) * 100) / 100;

  const valorOC = oc.valor || 0;
  const diff = Math.round((somaTotal - valorOC) * 100) / 100;

  const aviso = document.getElementById('nf-diverg-aviso');
  const msg = document.getElementById('nf-diverg-msg');
  const qtdNFs = nfsExistentes.length;

  if(Math.abs(diff) > 0.02){
    aviso.style.display = '';
    if(diff > 0){
      if(qtdNFs > 0){
        msg.textContent = `\u26a0\ufe0f Soma das ${qtdNFs + 1} NFs desta OC (${fmt(somaTotal)}) maior que a OC em ${fmt(Math.abs(diff))} (OC: ${fmt(valorOC)})`;
      } else {
        msg.textContent = `\u26a0\ufe0f NF maior que a OC em ${fmt(Math.abs(diff))} (OC: ${fmt(valorOC)} \u2192 NF + acr\u00e9scimos: ${fmt(valorFinal)})`;
      }
    } else {
      if(qtdNFs > 0){
        msg.textContent = `\u26a0\ufe0f Soma das ${qtdNFs + 1} NFs desta OC (${fmt(somaTotal)}) ainda menor que a OC em ${fmt(Math.abs(diff))} — OC: ${fmt(valorOC)} | J\u00e1 lan\u00e7ado: ${fmt(somaExistentes)} | Esta NF: ${fmt(valorFinal)}`;
      } else {
        msg.textContent = `\u26a0\ufe0f NF menor que a OC em ${fmt(Math.abs(diff))} (OC: ${fmt(valorOC)} \u2192 NF com descontos: ${fmt(valorFinal)})`;
      }
    }
  } else {
    aviso.style.display = 'none';
  }
}

// ======================== PLANILHA ENERGISA ========================

function enNFsMes(cats, ano, mes){
  const prefixo = `${ano}-${String(mes).padStart(2,'0')}`;
  return NFs.filter(nf => {
    const cat = nf.categoria || 'manutencao';
    if(!cats.includes(cat)) return false;
    if(nf.pgto === 'Aguardando Faturamento') return false;
    return (nf.data||'').startsWith(prefixo);
  });
}

function enTitulosMes(cats, ano, mes){
  const prefixo = `${ano}-${String(mes).padStart(2,'0')}`;
  return Titulos.filter(t => {
    const cat = t.categoria || 'manutencao';
    if(!cats.includes(cat)) return false;
    return (t.emissao||t.venc||'').startsWith(prefixo);
  });
}

function renderEnergisa(){
  const mes = parseInt(document.getElementById('en-mes').value);
  const ano = parseInt(document.getElementById('en-ano').value);
  const prefixo = `${ano}-${String(mes).padStart(2,'0')}`;
  const mesNome = MESES_NOME[mes-1];

  // Calcula totais por categoria
  const totais = {};
  RM_LINHAS.forEach(l => {
    totais[l.id] = enNFsMes(l.cats, ano, mes).reduce((a,nf) => a + (nf.valor||0), 0);
  });
  // Funcionários via NFs
  totais['funcionarios'] = enNFsMes(['funcionarios'], ano, mes).reduce((a,nf) => a + (nf.valor||0), 0);
  const totalGeral = Object.values(totais).reduce((a,v) => a+v, 0);

  const preview = document.getElementById('en-preview');
  const gerarWrap = document.getElementById('en-gerar-wrap');

  const linhasPreview = RM_LINHAS.concat([{id:'funcionarios',label:'Funcionários',cats:['funcionarios']}])
    .filter((l,i,arr) => arr.findIndex(x=>x.id===l.id)===i) // deduplica
    .map(l => {
      const v = totais[l.id]||0;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
        <span style="color:var(--text2)">${l.label}</span>
        <span style="font-family:var(--mono);font-weight:${v>0?'700':'400'};color:${v>0?'var(--text)':'var(--text3)'}">${v > 0 ? fmt(v) : '—'}</span>
      </div>`;
    }).join('');

  preview.innerHTML = `
    <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:20px 24px;max-width:600px">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px">
        📋 Resumo — ${mesNome} ${ano}
      </div>
      ${linhasPreview}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 0;margin-top:4px;font-size:14px;font-weight:800">
        <span>Valor Total</span>
        <span style="font-family:var(--mono);color:var(--accent2)">${fmt(totalGeral)}</span>
      </div>
    </div>`;

  gerarWrap.style.display = totalGeral > 0 ? 'block' : 'none';
}

function gerarPlanilhaEnergisa(){
  if(typeof XLSX === 'undefined'){ toast('Biblioteca XLSX não carregou','error'); return; }

  const mes = parseInt(document.getElementById('en-mes').value);
  const ano = parseInt(document.getElementById('en-ano').value);
  const mesNome = MESES_NOME[mes-1].toUpperCase();
  const prefixo = `${ano}-${String(mes).padStart(2,'0')}`;

  const wb = XLSX.utils.book_new();

  // ── Helper: adiciona aba ──
  function addSheet(nome, dados){
    const ws = XLSX.utils.aoa_to_sheet(dados);
    // Largura automática
    const cols = dados[0] ? dados[0].map((_,i) => ({
      wch: Math.max(...dados.map(r => String(r[i]||'').length), String(dados[0][i]||'').length, 10)
    })) : [];
    ws['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, ws, nome);
  }

  // ── Totais por categoria ──
  const tot = {};
  const cats_map = {
    manutencao:   ['manutencao','scherer'],
    scherer_ambi: ['scherer_ambi'],
    combustiveis: ['combustiveis'],
    impostos:     ['impostos'],
    outros:       ['outros'],
    diarias:      ['diarias'],
    consorcios:   ['consorcios'],
    gratificacoes:['gratificacoes'],
    seguros:      ['seguros'],
    funcionarios: ['funcionarios'],
    adiantamentos:['adiantamentos'],
    colaboradores:['colaboradores'],
  };

  Object.keys(cats_map).forEach(k => {
    tot[k] = enNFsMes(cats_map[k], ano, mes).reduce((a,nf) => a+(nf.valor||0), 0);
  });
  const totalGeral = Object.values(tot).reduce((a,v)=>a+v,0);

  // ── ABA 1: RESUMO ──
  addSheet('RESUMO', [
    ['Resumo Operacional'],
    ['DADOS', 'VALOR FINAL'],
    ['MANUTENÇÃO MENSAL (MAN. + SCHERER AJBAM)', tot.manutencao],
    ['COMBUSTÍVEIS (ÓLEOS)',                     tot.combustiveis],
    ['IMPOSTOS',                                 tot.impostos],
    ['OUTROS',                                   tot.outros],
    ['SCHERER AMBICAMPOS',                       tot.scherer_ambi],
    ['ADIANTAMENTO',                             tot.adiantamentos],
    ['DIARIAS',                                  tot.diarias],
    ['CONSÓRCIOS',                               tot.consorcios],
    ['GRATIFICAÇÕES',                            tot.gratificacoes],
    ['SEGUROS E MONITORAMENTO',                  tot.seguros],
    ['FUNCIONÁRIOS',                             tot.funcionarios],
    ['COLABORADORES',                            tot.colaboradores],
    ['Valor Total',                              totalGeral],
  ]);

  // ── ABA 2: MANUTENÇÃO (Man. + Scherer) ──
  const nfMan = enNFsMes(['manutencao','scherer'], ano, mes);
  const rowsMan = [
    ['MANUTENÇÃO'],
    ['Data','OS','Valor','Destino','Empresa','Tipo','NF','Caminhão'],
    ...nfMan.map(nf => {
      const oc = OCs.find(o => o.num === nf.oc);
      return [
        nf.data||'',
        nf.oc||'-',
        nf.valor||0,
        nf.dest||'-',
        nf.forn||'',
        nf.tipo||'',
        nf.num||'',
        nf.dest||'-',
      ];
    }),
    ['','','','',' ','',''],
    ['','',nfMan.reduce((a,n)=>a+(n.valor||0),0),'','','','',''],
  ];
  addSheet('MANUTENÇÃO', rowsMan);

  // ── ABA 3: SCHERER ──
  const nfSch = enNFsMes(['scherer'], ano, mes);
  addSheet('SCHERER', [
    ['SCHERER'],
    ['Data','OS','Valor','Descrição','Empresa','Tipo','NF','Caminhão'],
    ...nfSch.map(nf => [nf.data||'', nf.oc||'-', nf.valor||0, nf.desc||nf.obs||'', nf.forn||'', nf.tipo||'', nf.num||'', nf.dest||'-']),
    ['','',nfSch.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 4: SCHERER AMBICAMPOS ──
  const nfAmbi = enNFsMes(['scherer_ambi'], ano, mes);
  addSheet('SCHERER AMBICAMPOS', [
    ['SCHERER AMBICAMPOS'],
    ['Data','OS','Valor','Destino','Empresa','Tipo','NF','Caminhão'],
    ...nfAmbi.map(nf => [nf.data||'', nf.oc||'-', nf.valor||0, nf.desc||nf.obs||'', nf.forn||'', nf.tipo||'', nf.num||'', nf.dest||'-']),
    ['','',nfAmbi.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 5: DIARIA ──
  const nfDia = enNFsMes(['diarias'], ano, mes);
  addSheet('DIARIA', [
    ['DIARIAS'],
    ['Data','Valor','Colaborador','Empresa','Tipo'],
    ...nfDia.map(nf => [nf.data||'', nf.valor||0, nf.dest||nf.obs||'', nf.forn||'AJBAM', nf.tipo||'COMPROVANTE']),
    ['',nfDia.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 6: OUTROS ──
  const nfOut = enNFsMes(['outros'], ano, mes);
  addSheet('OUTROS', [
    ['OUTROS'],
    ['DATA','OC','VALOR','DESCRIÇÃO','FORNECEDOR','NUMERO NOTA FISCAL','EMPRESA'],
    ...nfOut.map(nf => [nf.data||'', nf.oc||'-', nf.valor||0, nf.obs||nf.desc||'', nf.forn||'', nf.num||'', 'AJBAM']),
    ['','',nfOut.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 7: SEGUROS E MONITORAMENTO ──
  const nfSeg = enNFsMes(['seguros'], ano, mes);
  addSheet('SEGUROS E MONITORAMENTO', [
    ['SEGURANÇA E MONITORAMENTO'],
    ['DATA','OC','VALOR','DESCRIÇÃO','FORNECEDOR','NUMERO NOTA FISCAL'],
    ...nfSeg.map(nf => [nf.data||'', nf.oc||'-', nf.valor||0, nf.obs||nf.desc||'', nf.forn||'', nf.num||'']),
    ['','',nfSeg.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 8: COMBUSTÍVEIS ──
  const nfComb = enNFsMes(['combustiveis'], ano, mes);
  addSheet('COMBUSTIVEIS', [
    [''],
    ['Data','Quantidade','Valor Uni.','Valor Total','Empresa','Tipo Óleo','Forma Pagamento','Nº Nota','Placa'],
    ...nfComb.map(nf => [
      nf.data||'',
      nf.combQtd||'',
      nf.combVuni||'',
      nf.valor||0,
      nf.forn||'',
      nf.combTipo||'',
      nf.combPgto||'BOLETO',
      nf.num||'',
      nf.combPlaca||nf.dest||'',
    ]),
    ['','','TOTAL','',nfComb.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 9: IMPOSTOS ──
  const nfImp = enNFsMes(['impostos'], ano, mes);
  addSheet('IMPOSTOS', [
    ['OBRIGAÇÕES FISCAIS'],
    ['Data','Valor','Descrição','Empresa','Tipo','NF','Forma'],
    ...nfImp.map(nf => [nf.data||'', nf.valor||0, nf.obs||nf.desc||'', nf.forn||'', 'IMPOSTO', nf.num||'', 'BOLETO']),
    ['',nfImp.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 10: ADIANTAMENTO ──
  const nfAdt = enNFsMes(['adiantamentos'], ano, mes);
  addSheet('ADIANTAMENTO', [
    ['ADIANTAMENTOS'],
    ['Data','Valor','Destino','Empresa','Nota'],
    ...nfAdt.map(nf => [nf.data||'', nf.valor||0, nf.dest||nf.obs||'', nf.forn||'AJBAM', nf.num||'COMPROVANTE']),
    ['',nfAdt.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 11: CONSÓRCIOS ──
  const nfCons = enNFsMes(['consorcios'], ano, mes);
  addSheet('CONSORCIOS', [
    ['Data','Valor','Destino','Empresa','Nº Nota','Vencimento'],
    ...nfCons.map(nf => [nf.data||'', nf.valor||0, nf.obs||nf.desc||'', nf.forn||'', nf.num||'BOLETO', nf.venc||'']),
    ['',nfCons.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 12: GRATIFICAÇÃO ──
  const nfGrat = enNFsMes(['gratificacoes'], ano, mes);
  addSheet('GRATIFICAÇÃO', [
    ['GRATIFICAÇÕES'],
    ['DATA','FUNCIONARIO','VALOR','Nº DA NOTA'],
    ...nfGrat.map(nf => [nf.data||'', nf.dest||nf.obs||'TODOS', nf.valor||0, nf.num||'COMPROVANTE']),
    ['','',nfGrat.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 13: FUNCIONÁRIOS ──
  const nfFunc = enNFsMes(['funcionarios'], ano, mes);
  addSheet('FUNCIONÁRIOS', [
    ['FUNCIONÁRIOS'],
    ['Data','Valor','Descrição','Empresa','Nota'],
    ...nfFunc.map(nf => [nf.data||'', nf.valor||0, nf.obs||nf.desc||'', nf.forn||'AJBAM', nf.num||'COMPROVANTE']),
    ['',nfFunc.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── ABA 14: COLABORADORES ──
  const nfColab = enNFsMes(['colaboradores'], ano, mes);
  addSheet('COLABORADORES', [
    ['COLABORADORES'],
    ['Data','Valor','Descrição','Empresa','Nota'],
    ...nfColab.map(nf => [nf.data||'', nf.valor||0, nf.obs||nf.desc||'', nf.forn||'AJBAM', nf.num||'COMPROVANTE']),
    ['',nfColab.reduce((a,n)=>a+(n.valor||0),0)],
  ]);

  // ── Gera o arquivo ──
  const nomeArquivo = `CONTROLE_DE_GASTOS_AJBAM_${mesNome}_${ano}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
  toast(`✅ Planilha gerada: ${nomeArquivo}`);
}

// ======================== RESUMO OPERACIONAL MENSAL ========================

// Linhas do relatório — ordem de exibição
// Manutenção = manutencao + scherer (somados)
const RM_LINHAS = [
  { id: 'manutencao',    label: 'Manutenção (Man. + Scherer)', cats: ['manutencao','scherer'] },
  { id: 'scherer_ambi',  label: 'Scherer Ambicampos',          cats: ['scherer_ambi'] },
  { id: 'combustiveis',  label: 'Combustíveis',                cats: ['combustiveis'] },
  { id: 'impostos',      label: 'Impostos',                    cats: ['impostos'] },
  { id: 'outros',        label: 'Outros',                      cats: ['outros'] },
  { id: 'diarias',       label: 'Diárias',                     cats: ['diarias'] },
  { id: 'consorcios',    label: 'Consórcios',                  cats: ['consorcios'] },
  { id: 'gratificacoes', label: 'Gratificações',               cats: ['gratificacoes'] },
  { id: 'seguros',       label: 'Seguros',                     cats: ['seguros'] },
  { id: 'funcionarios',  label: 'Funcionários',                cats: ['funcionarios'] },
  { id: 'adiantamentos', label: 'Adiantamentos',               cats: ['adiantamentos'] },
  { id: 'colaboradores',  label: 'Colaboradores',                cats: ['colaboradores'] },
];

// Calcula o total de uma categoria num mês/ano a partir dos Títulos
function rmValorCatMes(cats, ano, mes){
  // Regime de competência: agrupa pela data de emissão da NF
  // não pelo vencimento do título
  const prefixo = `${ano}-${String(mes).padStart(2,'0')}`;
  
  // Busca nas NFs pela data de emissão
  return NFs.filter(nf => {
    const cat = nf.categoria || 'manutencao';
    if(!cats.includes(cat)) return false;
    if(nf.pgto === 'Aguardando Faturamento') return false;
    return (nf.data||'').startsWith(prefixo);
  }).reduce((a,nf) => a + (nf.valor||0), 0);
}

function renderRelMensal(){
  const ano = parseInt((document.getElementById('rm-ano')||{value:'2026'}).value) || 2026;
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1; // 1-12
  const mesesExibir = ano === anoAtual ? mesAtual : 12;

  // ── MÊS ATUAL EM DESTAQUE ──
  const mesDestaque = ano === anoAtual ? mesAtual : 12;
  const totalMesDestaque = RM_LINHAS.reduce((a,l) => a + rmValorCatMes(l.cats, ano, mesDestaque), 0);

  const rmMesAtual = document.getElementById('rm-mes-atual');
  if(rmMesAtual){
    const itens = RM_LINHAS.map(l => {
      const v = rmValorCatMes(l.cats, ano, mesDestaque);
      return `<div class="rm-mes-item${l.id==='manutencao'?'':''}" style="${v===0?'opacity:.45':''}">
        <span class="rm-mes-item-label">${l.label}</span>
        <span class="rm-mes-item-val" style="${v===0?'color:var(--text3)':''}">${v > 0 ? fmt(v) : '—'}</span>
      </div>`;
    }).join('');
    rmMesAtual.innerHTML = `
      <div class="rm-mes-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700;font-size:14px;color:var(--text)">📌 ${MESES_NOME[mesDestaque-1]} ${ano}</span>
          <span style="font-family:var(--mono);font-weight:800;font-size:18px;color:var(--accent2)">${fmt(totalMesDestaque)}</span>
        </div>
        <div class="rm-mes-grid">${itens}
          <div class="rm-mes-item rm-mes-total">
            <span class="rm-mes-item-label">TOTAL DO MÊS</span>
            <span class="rm-mes-item-val" style="color:var(--accent2)">${fmt(totalMesDestaque)}</span>
          </div>
        </div>
      </div>`;
  }

  // ── TABELA ANUAL ──
  const thead = document.getElementById('tb-relmensal-head');
  const tbody = document.getElementById('tb-relmensal-body');

  // Cabeçalho: Categoria | Jan | Fev | ... | Total
  thead.innerHTML = `<tr>
    <th style="text-align:left;min-width:220px">Categoria</th>
    ${Array.from({length:mesesExibir},(_,i)=>`<th>${MESES_NOME[i].slice(0,3)}</th>`).join('')}
    <th style="background:rgba(0,112,214,.07)">Total ${ano}</th>
  </tr>`;

  // Corpo
  const totaisMes = Array(mesesExibir).fill(0);
  let totalGeral = 0;

  const rows = RM_LINHAS.map(linha => {
    const valores = Array.from({length:mesesExibir},(_,i) => rmValorCatMes(linha.cats, ano, i+1));
    const totalLinha = valores.reduce((a,v) => a+v, 0);
    totalGeral += totalLinha;
    valores.forEach((v,i) => totaisMes[i] += v);

    const celulasMeses = valores.map(v =>
      v > 0
        ? `<td>${fmt(v)}</td>`
        : `<td class="rm-zero">—</td>`
    ).join('');

    return `<tr>
      <td class="rm-cat-label">${linha.label}</td>
      ${celulasMeses}
      <td style="background:rgba(0,112,214,.05);font-weight:700">${totalLinha > 0 ? fmt(totalLinha) : '<span class="rm-zero">—</span>'}</td>
    </tr>`;
  });

  // Linha de total
  const celasTotais = totaisMes.map(v =>
    `<td style="font-weight:800">${v > 0 ? fmt(v) : '<span class="rm-zero">—</span>'}</td>`
  ).join('');

  tbody.innerHTML = rows.join('') + `
    <tr class="rm-total-row">
      <td>VALOR TOTAL</td>
      ${celasTotais}
      <td style="background:rgba(0,112,214,.07);font-weight:800">${fmt(totalGeral)}</td>
    </tr>`;
}

function exportRelMensalXLSX(){
  if(typeof XLSX === 'undefined'){ toast('Biblioteca XLSX não carregou','error'); return; }
  const ano = parseInt((document.getElementById('rm-ano')||{value:'2026'}).value) || 2026;
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;
  const mesesExibir = ano === anoAtual ? mesAtual : 12;

  const cabecalho = ['Dados', ...MESES_NOME.slice(0, mesesExibir), 'Total'];
  const rows = [
    [`Resumo Operacional ${ano}`],
    cabecalho
  ];

  let totaisMes = Array(mesesExibir).fill(0);
  let totalGeral = 0;

  RM_LINHAS.forEach(linha => {
    const valores = Array.from({length:mesesExibir},(_,i) => rmValorCatMes(linha.cats, ano, i+1));
    const totalLinha = valores.reduce((a,v)=>a+v,0);
    totalGeral += totalLinha;
    valores.forEach((v,i) => totaisMes[i] += v);
    rows.push([linha.label, ...valores, totalLinha]);
  });

  rows.push(['Valor Total', ...totaisMes, totalGeral]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Largura das colunas
  ws['!cols'] = [{ wch: 30 }, ...Array(mesesExibir+1).fill({ wch: 14 })];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Resumo ${ano}`);
  XLSX.writeFile(wb, `Resumo_Operacional_${ano}.xlsx`);
  toast('Excel gerado! ✅');
}

// ======================== DESPESAS POR PLACA ========================

const MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Retorna os gastos reais de uma placa em um mês/ano específico
// calculados a partir das NFs (mesma lógica do calcGastoPorPlaca mas por mês)
function gastoPlacaMes(placa, ano, mes){
  // mes: 1-12
  const mesStr = String(mes).padStart(2,'0');
  const prefixo = `${ano}-${mesStr}`;
  let total = 0;
  NFs.forEach(nf => {
    if(!(nf.data||'').startsWith(prefixo)) return;
    const oc = OCs.find(o => o.num === nf.oc);
    if(oc && oc.isRateio && oc.rateio){
      oc.rateio.forEach(r => { if(r.placa === placa) total += r.valor||0; });
    } else {
      if(nf.dest === placa) total += nf.valor||0;
    }
  });
  // Também considera Títulos com placa e vencimento no mês
  Titulos.forEach(t => {
    if(!t.placa || t.placa !== placa) return;
    if(!(t.venc||'').startsWith(prefixo)) return;
    // Evita dupla contagem — só conta títulos que não têm NF vinculada
    if(!t.nf) total += t.valor||0;
  });
  return Math.round(total * 100) / 100;
}

function renderDespesas(){
  const ano = parseInt((document.getElementById('desp-ano')||{value:'2026'}).value) || 2026;
  const mesAtual = new Date().getMonth() + 1; // 1-12
  const anoAtual = new Date().getFullYear();
  // Meses a exibir: de Janeiro até o mês atual (se for o ano atual), senão Dezembro
  const mesesExibir = ano === anoAtual ? mesAtual : 12;

  // Apenas placas reais da frota (exclui categorias como ESTOQUE, OUTROS, etc.)
  const placasValidas = Frota.filter(f => f.placa && /^[A-Z]{3}\d[A-Z0-9]\d{2}$|^[A-Z]{3}\d{4}$/.test(f.placa));

  if(!placasValidas.length){
    document.getElementById('tb-despesas-head').innerHTML = '';
    document.getElementById('tb-despesas-body').innerHTML = '<tr><td colspan="20" class="empty">Nenhum caminhão cadastrado na frota com placa válida.</td></tr>';
    document.getElementById('desp-kpis').innerHTML = '';
    return;
  }

  // Monta matriz de gastos: { placa: [g1, g2, ..., gN] }
  const matriz = {};
  placasValidas.forEach(f => {
    matriz[f.placa] = [];
    for(let m = 1; m <= mesesExibir; m++){
      matriz[f.placa].push(gastoPlacaMes(f.placa, ano, m));
    }
  });

  // Cabeçalho da tabela
  const thead = document.getElementById('tb-despesas-head');
  thead.innerHTML = `<tr>
    <th style="text-align:left">Placa</th>
    <th style="text-align:right">Limite</th>
    ${Array.from({length: mesesExibir}, (_,i) => `<th>${MESES_NOME[i].slice(0,3)}</th>`).join('')}
    <th style="background:rgba(0,112,214,.07)">Total</th>
    <th style="background:rgba(0,149,122,.07)">Média</th>
    <th>Status</th>
  </tr>`;

  // Corpo da tabela
  const tbody = document.getElementById('tb-despesas-body');
  let totalGeral = 0;
  let dentroCount = 0;
  let foraCount = 0;

  const rows = placasValidas.map(f => {
    const gastos = matriz[f.placa];
    const mesesComDados = gastos.filter(g => g > 0).length;
    const totalPlaca = gastos.reduce((a,g) => a+g, 0);
    // Média acumulada: soma ÷ número de meses (independente de ter dados ou não)
    const media = mesesComDados > 0 ? totalPlaca / mesesExibir : 0;
    const limite = f.limite || 0;
    const dentro = limite > 0 && media <= limite;
    const fora = limite > 0 && media > limite;

    totalGeral += totalPlaca;
    if(dentro) dentroCount++;
    if(fora) foraCount++;

    const celulasMeses = gastos.map(g =>
      g > 0
        ? `<td class="mono">${fmt(g)}</td>`
        : `<td class="desp-vazio">—</td>`
    ).join('');

    const mediaClass = dentro ? 'desp-media-ok' : fora ? 'desp-media-nok' : '';
    const statusIcon = dentro ? '🟢' : fora ? '🔴' : '⚪';
    const statusLabel = dentro ? 'OK' : fora ? 'Acima' : 'Sem limite';

    return `<tr>
      <td>${f.placa}</td>
      <td class="mono" style="color:var(--text3)">${limite > 0 ? fmt(limite) : '—'}</td>
      ${celulasMeses}
      <td class="mono" style="background:rgba(0,112,214,.05);font-weight:700">${fmt(totalPlaca)}</td>
      <td class="mono ${mediaClass}" style="border-radius:6px">${mesesComDados > 0 ? fmt(media) : '—'}</td>
      <td style="text-align:center;font-size:13px">${statusIcon} ${statusLabel}</td>
    </tr>`;
  });

  tbody.innerHTML = rows.join('') + `<tr style="border-top:2px solid var(--border);background:var(--card)">
    <td style="font-weight:800;font-size:13px">TOTAL</td>
    <td></td>
    ${Array.from({length: mesesExibir}, () => '<td></td>').join('')}
    <td class="mono" style="font-weight:800;font-size:13px;background:rgba(0,112,214,.07)">${fmt(totalGeral)}</td>
    <td></td>
    <td></td>
  </tr>`;

  // KPIs
  const kpis = document.getElementById('desp-kpis');
  const mediaGeral = placasValidas.length > 0 ? totalGeral / (placasValidas.length * mesesExibir) : 0;
  kpis.innerHTML =
    `<div class="stat-card"><div class="stat-label">Caminhões avaliados</div><div class="stat-value" style="font-size:20px">${placasValidas.length}</div><div class="stat-sub">${mesesExibir} meses acumulados</div></div>` +
    `<div class="stat-card"><div class="stat-label">Dentro do limite 🟢</div><div class="stat-value" style="font-size:20px;color:var(--accent)">${dentroCount}</div><div class="stat-sub">Elegíveis à gratificação</div></div>` +
    `<div class="stat-card"><div class="stat-label">Acima do limite 🔴</div><div class="stat-value" style="font-size:20px;color:var(--red)">${foraCount}</div><div class="stat-sub">Fora da faixa</div></div>` +
    `<div class="stat-card"><div class="stat-label">Gasto Total ${ano}</div><div class="stat-value" style="font-size:20px;color:var(--amber)">${fmt(totalGeral)}</div><div class="stat-sub">Média ${fmt(mediaGeral)}/caminhão/mês</div></div>`;
}

function exportDespesasXLSX(){
  if(typeof XLSX === 'undefined'){ toast('Biblioteca XLSX não carregou','error'); return; }
  const ano = parseInt((document.getElementById('desp-ano')||{value:'2026'}).value) || 2026;
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();
  const mesesExibir = ano === anoAtual ? mesAtual : 12;

  const placasValidas = Frota.filter(f => f.placa && /^[A-Z]{3}\d[A-Z0-9]\d{2}$|^[A-Z]{3}\d{4}$/.test(f.placa));

  const cabecalho = ['Placa','Limite', ...MESES_NOME.slice(0, mesesExibir), 'Total', 'Média Acumulada', 'Status'];
  const rows = [cabecalho];

  placasValidas.forEach(f => {
    const gastos = [];
    for(let m = 1; m <= mesesExibir; m++) gastos.push(gastoPlacaMes(f.placa, ano, m));
    const total = gastos.reduce((a,g) => a+g, 0);
    const mesesComDados = gastos.filter(g=>g>0).length;
    const media = mesesComDados > 0 ? total / mesesExibir : 0;
    const limite = f.limite || 0;
    const status = limite > 0 ? (media <= limite ? '✅ OK' : '❌ Acima') : '—';
    rows.push([f.placa, limite, ...gastos, total, media, status]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Despesas ${ano}`);
  XLSX.writeFile(wb, `Despesas_Placas_${ano}.xlsx`);
  toast('Excel gerado! ✅');
}

// ======================== PIPAS ========================

// ViagensPipa já declarada no bloco de dados globais (var ViagensPipa = [])
var _nextPipaId = 1;

function newPipaId(){ return _nextPipaId++; }

function pipasInit(){
  if(!window.ViagensPipa) window.ViagensPipa = [];
}

function openModalPipa(mode, id){
  // Popula placas da frota
  const sel = document.getElementById('f-pipa-placa');
  if(sel){
    sel.innerHTML = '<option value="">— Selecione —</option>';
    Frota.forEach(f => sel.innerHTML += `<option value="${f.placa}">${f.placa} — ${f.modelo||''}</option>`);
  }
  if(mode === 'novo'){
    document.getElementById('f-pipa-data').value = today;
    document.getElementById('f-pipa-hora').value = new Date().toTimeString().slice(0,5);
    document.getElementById('f-pipa-placa').value = '';
    document.getElementById('f-pipa-motorista').value = '';
    document.getElementById('f-pipa-litros').value = '';
    document.getElementById('f-pipa-saida').value = '';
    document.getElementById('f-pipa-origem').value = '';
    document.getElementById('f-pipa-descarga').value = '';
    document.getElementById('f-pipa-obs').value = '';
    document.getElementById('modal-pipa-title').textContent = 'Registrar Viagem';
    document.getElementById('btn-save-pipa').textContent = '💾 Salvar Viagem';
    window._editingPipa = null;
  } else {
    const v = ViagensPipa.find(x => x.id === id); if(!v) return;
    window._editingPipa = id;
    document.getElementById('f-pipa-data').value = v.data;
    document.getElementById('f-pipa-hora').value = v.hora||'';
    document.getElementById('f-pipa-placa').value = v.placa;
    document.getElementById('f-pipa-motorista').value = v.motorista;
    document.getElementById('f-pipa-litros').value = v.litros;
    document.getElementById('f-pipa-saida').value = v.saida||'';
    document.getElementById('f-pipa-origem').value = v.origem||'';
    document.getElementById('f-pipa-descarga').value = v.descarga||'';
    document.getElementById('f-pipa-obs').value = v.obs||'';
    document.getElementById('modal-pipa-title').textContent = 'Editar Viagem';
    document.getElementById('btn-save-pipa').textContent = '💾 Atualizar';
  }
  document.getElementById('modal-pipa').classList.add('open');
}

function salvarPipa(){
  const placa = document.getElementById('f-pipa-placa').value;
  if(!placa){ toast('Selecione a placa','error'); return; }
  const motorista = document.getElementById('f-pipa-motorista').value.trim();
  if(!motorista){ toast('Informe o motorista','error'); return; }
  const litros = parseFloat(document.getElementById('f-pipa-litros').value)||0;
  if(!litros){ toast('Informe os litros','error'); return; }

  const obj = {
    placa,
    motorista,
    litros,
    data: document.getElementById('f-pipa-data').value || today,
    hora: document.getElementById('f-pipa-hora').value || '',
    saida: document.getElementById('f-pipa-saida').value.trim(),
    origem: document.getElementById('f-pipa-origem').value.trim(),
    descarga: document.getElementById('f-pipa-descarga').value.trim(),
    obs: document.getElementById('f-pipa-obs').value.trim(),
  };

  let objParaSalvar;
  if(window._editingPipa){
    const i = ViagensPipa.findIndex(x => x.id === window._editingPipa);
    ViagensPipa[i] = { ...ViagensPipa[i], ...obj };
    objParaSalvar = ViagensPipa[i];
    window._editingPipa = null;
    toast('Viagem atualizada!');
  } else {
    obj.id = newPipaId();
    ViagensPipa.unshift(obj);
    objParaSalvar = obj;
    toast('Viagem registrada! ✅');
  }
  closeModal('modal-pipa');
  renderPipas();
  // Persiste no Supabase (objeto completo com id)
  saveEntidade('ViagensPipa', objParaSalvar);
  saveCounters();
}

function excluirPipa(id){
  const v = ViagensPipa.find(x => x.id === id);
  confirmDelete(`Excluir viagem de ${v.placa} em ${formatarDataBR(v.data)}?`, `${v.litros.toLocaleString('pt-BR')} litros — ${v.motorista}`, () => {
    ViagensPipa = ViagensPipa.filter(x => x.id !== id);
    deleteEntidade('ViagensPipa', id);
    toast('Viagem excluída.');
    renderPipas();
  });
}

function resetPipaFiltros(){
  ['pipa-fil-mes','pipa-fil-placa','pipa-fil-mot'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  renderPipas();
}

function setPipaTab(tab, el){
  ['indicadores','viagens','motoristas'].forEach(t => {
    const div = document.getElementById('pipa-tab-'+t);
    if(div) div.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('#screen-pipas .tab').forEach(t => t.classList.remove('on'));
  if(el) el.classList.add('on');
}

function renderPipas(){
  // Popular filtros
  const filMes  = document.getElementById('pipa-fil-mes');
  const filPlaca = document.getElementById('pipa-fil-placa');
  const filMot  = document.getElementById('pipa-fil-mot');

  // Meses disponíveis
  if(filMes){
    const cur = filMes.value;
    const MESES_PT = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const mesesSet = new Set(ViagensPipa.map(v => v.data ? v.data.slice(0,7) : '').filter(Boolean));
    const meses = [...mesesSet].sort().reverse();
    filMes.innerHTML = '<option value="">Todos os meses</option>';
    meses.forEach(ym => {
      const [ano, m] = ym.split('-');
      filMes.innerHTML += `<option value="${ym}">${MESES_PT[parseInt(m)]} ${ano}</option>`;
    });
    filMes.value = cur;
  }

  // Placas disponíveis
  if(filPlaca){
    const cur = filPlaca.value;
    const placas = [...new Set(ViagensPipa.map(v => v.placa).filter(Boolean))].sort();
    filPlaca.innerHTML = '<option value="">Todas as placas</option>';
    placas.forEach(p => filPlaca.innerHTML += `<option value="${p}">${p}</option>`);
    filPlaca.value = cur;
  }

  // Motoristas disponíveis
  if(filMot){
    const cur = filMot.value;
    const mots = [...new Set(ViagensPipa.map(v => v.motorista).filter(Boolean))].sort();
    filMot.innerHTML = '<option value="">Todos os motoristas</option>';
    mots.forEach(m => filMot.innerHTML += `<option value="${m}">${m}</option>`);
    filMot.value = cur;
  }

  // Filtra viagens
  const mesFil   = (filMes||{value:''}).value;
  const placaFil = (filPlaca||{value:''}).value;
  const motFil   = (filMot||{value:''}).value;

  const viagens = ViagensPipa.filter(v => {
    if(mesFil   && !(v.data||'').startsWith(mesFil)) return false;
    if(placaFil && v.placa !== placaFil) return false;
    if(motFil   && v.motorista !== motFil) return false;
    return true;
  });

  document.getElementById('pipas-count').textContent = viagens.length;

  // KPIs gerais
  const totalLitros = viagens.reduce((a,v) => a + (v.litros||0), 0);
  const totalViagens = viagens.length;
  const placasUnicas = new Set(viagens.map(v => v.placa)).size;
  const mediaLitros = totalViagens ? Math.round(totalLitros / totalViagens) : 0;

  // Custo total de manutenção das placas no período
  const gastosMap = calcGastoMesAtual();
  const placasFiltradas = [...new Set(viagens.map(v => v.placa))];
  const custoTotal = placasFiltradas.reduce((a, p) => a + (gastosMap[p]||0), 0);
  const custoPorLitro = totalLitros > 0 ? custoTotal / totalLitros : 0;

  const kpisEl = document.getElementById('pipa-kpis');
  if(kpisEl) kpisEl.innerHTML =
    `<div class="stat-card"><div class="stat-label">Total de Viagens</div><div class="stat-value" style="font-size:20px">${totalViagens.toLocaleString('pt-BR')}</div><div class="stat-sub">${placasUnicas} placa(s)</div></div>` +
    `<div class="stat-card"><div class="stat-label">Total Transportado</div><div class="stat-value" style="font-size:20px;color:var(--accent)">${totalLitros.toLocaleString('pt-BR')} L</div><div class="stat-sub">Média ${mediaLitros.toLocaleString('pt-BR')} L/viagem</div></div>` +
    `<div class="stat-card"><div class="stat-label">Custo de Manutenção</div><div class="stat-value" style="font-size:20px;color:var(--amber)">${fmt(custoTotal)}</div><div class="stat-sub">Frota filtrada no mês</div></div>` +
    `<div class="stat-card"><div class="stat-label">Custo por Litro</div><div class="stat-value" style="font-size:20px;color:${custoPorLitro > 0.5 ? 'var(--red)' : 'var(--accent2)'}">${custoPorLitro > 0 ? 'R$ ' + custoPorLitro.toFixed(4) : '—'}</div><div class="stat-sub">Manutenção ÷ litros</div></div>`;

  // TAB INDICADORES POR PLACA
  const porPlaca = {};
  viagens.forEach(v => {
    if(!porPlaca[v.placa]) porPlaca[v.placa] = { viagens: 0, litros: 0 };
    porPlaca[v.placa].viagens++;
    porPlaca[v.placa].litros += v.litros||0;
  });

  const tbInd = document.getElementById('tb-pipa-indicadores');
  if(tbInd){
    const placasOrd = Object.keys(porPlaca).sort((a,b) => porPlaca[b].litros - porPlaca[a].litros);
    const maxLitros = Math.max(...placasOrd.map(p => porPlaca[p].litros), 1);
    tbInd.innerHTML = placasOrd.length ? placasOrd.map(placa => {
      const d = porPlaca[placa];
      const custo = gastosMap[placa] || 0;
      const cpl = d.litros > 0 ? custo / d.litros : 0;
      const media = d.viagens > 0 ? Math.round(d.litros / d.viagens) : 0;
      const pct = Math.round(d.litros / maxLitros * 100);
      const efCls = cpl === 0 ? 'cgr' : cpl < 0.3 ? 'cg' : cpl < 0.6 ? 'ca' : 'cr';
      const efLabel = cpl === 0 ? '—' : cpl < 0.3 ? '🟢 Ótimo' : cpl < 0.6 ? '🟡 Regular' : '🔴 Alto';
      return `<tr>
        <td class="mono" style="font-weight:700;color:var(--accent)">${placa}</td>
        <td class="mono">${d.viagens}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="mono" style="font-weight:600">${d.litros.toLocaleString('pt-BR')} L</span>
            <div class="progress-bar-wrap" style="flex:1;min-width:60px"><div class="progress-bar" style="width:${pct}%;background:var(--accent2)"></div></div>
          </div>
        </td>
        <td class="mono">${media.toLocaleString('pt-BR')} L</td>
        <td class="mono">${custo > 0 ? fmt(custo) : '<span style="color:var(--text3)">—</span>'}</td>
        <td class="mono" style="font-weight:700;color:var(--accent2)">${cpl > 0 ? 'R$ '+cpl.toFixed(4) : '<span style="color:var(--text3)">—</span>'}</td>
        <td>${chip(efLabel, efCls)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="empty">Nenhuma viagem no período</td></tr>';
  }

  // TAB VIAGENS
  const tbViag = document.getElementById('tb-pipa-viagens');
  if(tbViag){
    tbViag.innerHTML = viagens.length ? [...viagens].sort((a,b) => {
      const da = (a.data||'')+(a.hora||'');
      const db = (b.data||'')+(b.hora||'');
      return db.localeCompare(da);
    }).map(v => `<tr>
      <td style="font-size:11px">${formatarDataBR(v.data)}</td>
      <td class="mono" style="font-size:11px;color:var(--text3)">${v.hora||'—'}</td>
      <td class="mono" style="font-weight:700;color:var(--accent)">${v.placa}</td>
      <td>${v.motorista}</td>
      <td class="mono" style="font-weight:600;color:var(--accent2)">${(v.litros||0).toLocaleString('pt-BR')} L</td>
      <td style="font-size:11px;color:var(--text3)">${v.saida||'—'}</td>
      <td style="font-size:11px">${v.origem||'—'}</td>
      <td style="font-size:11px;color:var(--text3)">${v.descarga||'—'}</td>
      <td>${acts(`openModalPipa('editar',${v.id})`,`excluirPipa(${v.id})`)}</td>
    </tr>`).join('') : '<tr><td colspan="9" class="empty">Nenhuma viagem registrada</td></tr>';
  }

  // TAB MOTORISTAS
  const porMot = {};
  viagens.forEach(v => {
    if(!porMot[v.motorista]) porMot[v.motorista] = { viagens: 0, litros: 0, placas: new Set() };
    porMot[v.motorista].viagens++;
    porMot[v.motorista].litros += v.litros||0;
    porMot[v.motorista].placas.add(v.placa);
  });

  const tbMot = document.getElementById('tb-pipa-motoristas');
  if(tbMot){
    const motsOrd = Object.keys(porMot).sort((a,b) => porMot[b].litros - porMot[a].litros);
    tbMot.innerHTML = motsOrd.length ? motsOrd.map(mot => {
      const d = porMot[mot];
      const media = d.viagens > 0 ? Math.round(d.litros / d.viagens) : 0;
      return `<tr>
        <td style="font-weight:500">${mot}</td>
        <td class="mono">${d.viagens}</td>
        <td class="mono" style="font-weight:600;color:var(--accent2)">${d.litros.toLocaleString('pt-BR')} L</td>
        <td class="mono">${media.toLocaleString('pt-BR')} L</td>
        <td style="font-size:11px;color:var(--text3)">${[...d.placas].join(', ')}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" class="empty">Nenhuma viagem registrada</td></tr>';
  }
}

function exportPipasXLSX(){
  if(typeof XLSX === 'undefined'){ toast('Biblioteca XLSX não carregou','error'); return; }
  const mesFil   = (document.getElementById('pipa-fil-mes')||{value:''}).value;
  const placaFil = (document.getElementById('pipa-fil-placa')||{value:''}).value;
  const motFil   = (document.getElementById('pipa-fil-mot')||{value:''}).value;

  const viagens = ViagensPipa.filter(v => {
    if(mesFil   && !(v.data||'').startsWith(mesFil)) return false;
    if(placaFil && v.placa !== placaFil) return false;
    if(motFil   && v.motorista !== motFil) return false;
    return true;
  }).sort((a,b) => ((b.data||'')+(b.hora||'')).localeCompare((a.data||'')+(a.hora||'')));

  const rows = [['Data','Hora','Placa','Motorista','Litros','Local de Saída','Origem','Local de Descarga','Obs']];
  viagens.forEach(v => rows.push([v.data, v.hora||'', v.placa, v.motorista, v.litros, v.saida||'', v.origem||'', v.descarga||'', v.obs||'']));

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Viagens Pipas');
  XLSX.writeFile(wb, 'Viagens_Pipas.xlsx');
  toast('Excel gerado com sucesso!');
}

// ======================== CONSULTA RÁPIDA ========================

function popularFiltrosConsulta(){
  // Fornecedores
  const selForn = document.getElementById('cq-forn');
  if(selForn){
    const curForn = selForn.value;
    selForn.innerHTML = '<option value="">Todos os fornecedores</option>';
    const forns = [...new Set([
      ...OCs.map(o=>o.forn),
      ...NFs.map(n=>n.forn),
      ...Titulos.map(t=>t.forn),
      ...Faturamentos.map(f=>f.forn)
    ].filter(Boolean))].sort();
    forns.forEach(f => selForn.innerHTML += `<option value="${f}">${f}</option>`);
    if(curForn) selForn.value = curForn;
  }
  // Placas
  const selPlaca = document.getElementById('cq-placa');
  if(selPlaca){
    const curPlaca = selPlaca.value;
    selPlaca.innerHTML = '<option value="">Todas as placas</option>';
    const placas = [...new Set([
      ...Frota.map(f=>f.placa),
      ...OCs.map(o=>o.placas||'').join('/').split('/').map(p=>p.trim()),
      ...NFs.map(n=>n.dest||''),
      ...Titulos.map(t=>t.placa||'')
    ].filter(p=>p && p !== '-' && p.length > 2))].sort();
    placas.forEach(p => selPlaca.innerHTML += `<option value="${p}">${p}</option>`);
    if(curPlaca) selPlaca.value = curPlaca;
  }
}

function limparConsulta(){
  ['cq-texto','cq-de','cq-ate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['cq-forn','cq-placa','cq-status'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['cq-t-oc','cq-t-nf','cq-t-tit','cq-t-fat'].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=true;});
  renderConsulta();
}

function renderConsulta(){
  popularFiltrosConsulta();

  const texto  = (document.getElementById('cq-texto')||{value:''}).value.toLowerCase().trim();
  const forn   = (document.getElementById('cq-forn')||{value:''}).value;
  const placa  = (document.getElementById('cq-placa')||{value:''}).value;
  const de     = (document.getElementById('cq-de')||{value:''}).value;
  const ate    = (document.getElementById('cq-ate')||{value:''}).value;
  const status = (document.getElementById('cq-status')||{value:''}).value;
  const inclOC  = document.getElementById('cq-t-oc')  && document.getElementById('cq-t-oc').checked;
  const inclNF  = document.getElementById('cq-t-nf')  && document.getElementById('cq-t-nf').checked;
  const inclTit = document.getElementById('cq-t-tit') && document.getElementById('cq-t-tit').checked;
  const inclFat = document.getElementById('cq-t-fat') && document.getElementById('cq-t-fat').checked;

  // Sem nenhum filtro ativo
  const temFiltro = texto || forn || placa || de || ate || status;
  if(!temFiltro){
    document.getElementById('cq-resumo').innerHTML = '';
    document.getElementById('cq-resultados').innerHTML = '<div class="empty" style="padding:40px;text-align:center;color:var(--text3)">Use os filtros acima para buscar registros em todo o sistema.</div>';
    return;
  }

  function dentroDoperiodo(dataISO){
    if(!dataISO) return true;
    if(de && dataISO < de) return false;
    if(ate && dataISO > ate) return false;
    return true;
  }
  function matchTexto(campos){
    if(!texto) return true;
    return campos.some(c => c && String(c).toLowerCase().includes(texto));
  }
  function matchForn(f){ return !forn || (f||'').toLowerCase() === forn.toLowerCase(); }
  function matchPlaca(p){ return !placa || (p||'').toLowerCase().includes(placa.toLowerCase()); }
  function matchStatus(s){ return !status || (s||'').toLowerCase() === status.toLowerCase(); }

  const resultados = [];

  // ── OCs ──
  if(inclOC){
    OCs.forEach(o => {
      if(!matchTexto([o.num, o.forn, o.placas, o.desc, o.tipo])) return;
      if(!matchForn(o.forn)) return;
      if(!matchPlaca(o.placas)) return;
      if(!dentroDoperiodo(o.data)) return;
      if(!matchStatus(o.status)) return;
      resultados.push({ tipo:'oc', data: o.data, obj: o });
    });
  }

  // ── NFs ──
  if(inclNF){
    NFs.forEach(n => {
      if(!matchTexto([n.num, n.forn, n.oc, n.dest, n.tipo, n.obs])) return;
      if(!matchForn(n.forn)) return;
      if(!matchPlaca(n.dest)) return;
      if(!dentroDoperiodo(n.data)) return;
      if(status && !matchStatus(n.pgto)) return;
      resultados.push({ tipo:'nf', data: n.data, obj: n });
    });
  }

  // ── Títulos ──
  if(inclTit){
    Titulos.forEach(t => {
      if(!matchTexto([t.forn, t.ref, t.tipo, t.placa, t.obs])) return;
      if(!matchForn(t.forn)) return;
      if(!matchPlaca(t.placa)) return;
      if(!dentroDoperiodo(t.venc)) return;
      if(!matchStatus(t.status)) return;
      resultados.push({ tipo:'tit', data: t.venc, obj: t });
    });
  }

  // ── Faturamentos ──
  if(inclFat){
    Faturamentos.forEach(f => {
      if(!matchTexto([f.num, f.forn, ...(f.nfNums||[])])) return;
      if(!matchForn(f.forn)) return;
      if(!dentroDoperiodo(f.data)) return;
      if(!matchStatus(f.status)) return;
      resultados.push({ tipo:'fat', data: f.data, obj: f });
    });
  }

  // Ordena por data decrescente
  resultados.sort((a,b) => (b.data||'').localeCompare(a.data||''));

  // ── Resumo chips ──
  const conts = { oc:0, nf:0, tit:0, fat:0 };
  resultados.forEach(r => conts[r.tipo]++);
  const CHIP_CORES = { oc:'rgba(0,112,214,.1)', nf:'rgba(0,149,122,.1)', tit:'rgba(200,120,0,.1)', fat:'rgba(124,92,218,.1)' };
  const CHIP_TEXT  = { oc:'var(--accent2)', nf:'var(--accent)', tit:'var(--amber)', fat:'var(--purple)' };
  const CHIP_LABEL = { oc:'OCs', nf:'NFs', tit:'Títulos', fat:'Faturamentos' };
  const resumoEl = document.getElementById('cq-resumo');
  resumoEl.innerHTML = `<div style="font-size:12px;color:var(--text3);display:flex;align-items:center;margin-right:6px">${resultados.length} resultado(s)</div>` +
    Object.keys(conts).filter(k=>conts[k]>0).map(k=>
      `<div class="cq-resumo-chip" style="background:${CHIP_CORES[k]};color:${CHIP_TEXT[k]};border:1px solid ${CHIP_TEXT[k]}33">
        ${conts[k]} ${CHIP_LABEL[k]}
      </div>`
    ).join('');

  // ── Renderiza cards ──
  if(!resultados.length){
    document.getElementById('cq-resultados').innerHTML = '<div class="empty" style="padding:36px;text-align:center;color:var(--text3)">Nenhum registro encontrado com esses filtros.</div>';
    return;
  }

  document.getElementById('cq-resultados').innerHTML = resultados.map(r => {
    const o = r.obj;
    if(r.tipo === 'oc') return `
      <div class="cq-card">
        <div class="cq-card-header">
          <span class="cq-badge oc">OC</span>
          <span style="font-weight:600;font-size:13px;font-family:var(--mono)">${o.num}</span>
          <span style="font-size:12px;color:var(--text3)">${o.forn}</span>
          <span style="margin-left:auto;font-family:var(--mono);font-weight:700;color:var(--accent2)">${fmt(o.valor)}</span>
          ${chipS(o.status||'Ativa')}
          <button class="cq-goto" onclick="showScreen('oc',null)">Ver OCs →</button>
        </div>
        <div class="cq-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="cq-row-item"><span class="cq-label">Data emissão</span><span class="cq-val">${formatarDataBR(o.data)}</span></div>
          <div class="cq-row-item"><span class="cq-label">Placa(s)</span><span class="cq-val mono">${o.placas||'-'}</span></div>
          <div class="cq-row-item"><span class="cq-label">Tipo</span><span class="cq-val">${o.tipo||'-'}</span></div>
          <div class="cq-row-item"><span class="cq-label">Status NF</span><span class="cq-val">${o.nf||'-'}</span></div>
          ${o.desc?`<div class="cq-row-item" style="grid-column:span 2"><span class="cq-label">Descrição</span><span class="cq-val">${o.desc}</span></div>`:''}
        </div>
      </div>`;

    if(r.tipo === 'nf') return `
      <div class="cq-card">
        <div class="cq-card-header">
          <span class="cq-badge nf">NF</span>
          <span style="font-weight:600;font-size:13px;font-family:var(--mono)">NF ${o.num}</span>
          <span style="font-size:12px;color:var(--text3)">${o.forn}</span>
          <span style="margin-left:auto;font-family:var(--mono);font-weight:700;color:var(--accent)">${fmt(o.valor)}</span>
          ${chip(o.pgto||'Pendente', o.pgto==='Faturado'?'cg':o.pgto==='Aguardando Faturamento'?'ca':'cgr')}
          <button class="cq-goto" onclick="showScreen('nf',null)">Ver NFs →</button>
        </div>
        <div class="cq-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="cq-row-item"><span class="cq-label">Emissão</span><span class="cq-val">${formatarDataBR(o.data)}</span></div>
          <div class="cq-row-item"><span class="cq-label">OC Vinculada</span><span class="cq-val mono">${o.oc||'Sem OC'}</span></div>
          <div class="cq-row-item"><span class="cq-label">Destino / Placa</span><span class="cq-val mono">${o.dest||'-'}</span></div>
          <div class="cq-row-item"><span class="cq-label">Tipo</span><span class="cq-val">${o.tipo||'-'}</span></div>
          ${o.venc?`<div class="cq-row-item"><span class="cq-label">Vencimento</span><span class="cq-val">${formatarDataBR(o.venc)}</span></div>`:''}
          ${o.doc?`<div class="cq-row-item"><span class="cq-label">Documento</span><span class="cq-val">${linkComprovante(o.doc,'📄','Abrir arquivo')}</span></div>`:''}
        </div>
      </div>`;

    if(r.tipo === 'tit') return `
      <div class="cq-card">
        <div class="cq-card-header">
          <span class="cq-badge tit">TÍTULO</span>
          <span style="font-weight:600;font-size:13px">${o.ref||'-'}</span>
          <span style="font-size:12px;color:var(--text3)">${o.forn}</span>
          <span style="margin-left:auto;font-family:var(--mono);font-weight:700;color:var(--amber)">${fmt(o.valor)}</span>
          ${chipS(o.status)}
          <button class="cq-goto" onclick="showScreen('financeiro',null)">Ver Financeiro →</button>
        </div>
        <div class="cq-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="cq-row-item"><span class="cq-label">Vencimento</span><span class="cq-val" style="color:${diasAte(o.venc)<0&&o.status==='Pendente'?'var(--red)':'inherit'}">${formatarDataBR(o.venc)}${diasAte(o.venc)<0&&o.status==='Pendente'?' ⚠':''}</span></div>
          <div class="cq-row-item"><span class="cq-label">Tipo</span><span class="cq-val">${o.tipo||'-'}</span></div>
          <div class="cq-row-item"><span class="cq-label">Placa</span><span class="cq-val mono">${o.placa||'-'}</span></div>
          ${o.boleto?`<div class="cq-row-item"><span class="cq-label">Boleto</span><span class="cq-val">${linkComprovante(o.boleto,'📄','Abrir boleto')}</span></div>`:''}
          ${o.comprovante?`<div class="cq-row-item"><span class="cq-label">Comprovante</span><span class="cq-val">${linkComprovante(o.comprovante,'📎','Abrir comprovante')}</span></div>`:''}
          ${o.obs?`<div class="cq-row-item" style="grid-column:span 2"><span class="cq-label">Obs</span><span class="cq-val">${o.obs}</span></div>`:''}
        </div>
      </div>`;

    if(r.tipo === 'fat') return `
      <div class="cq-card">
        <div class="cq-card-header">
          <span class="cq-badge fat">FATURAMENTO</span>
          <span style="font-weight:600;font-size:13px;font-family:var(--mono)">${o.num}</span>
          <span style="font-size:12px;color:var(--text3)">${o.forn}</span>
          <span style="margin-left:auto;font-family:var(--mono);font-weight:700;color:var(--purple)">${fmt(o.valor)}</span>
          ${chipS(o.status)}
          <button class="cq-goto" onclick="showScreen('faturamentos',null)">Ver Faturamentos →</button>
        </div>
        <div class="cq-row" style="grid-template-columns:1fr 1fr 1fr">
          <div class="cq-row-item"><span class="cq-label">Data</span><span class="cq-val">${formatarDataBR(o.data)}</span></div>
          <div class="cq-row-item"><span class="cq-label">Vencimento</span><span class="cq-val">${formatarDataBR(o.venc)}</span></div>
          <div class="cq-row-item"><span class="cq-label">Forma Pgto</span><span class="cq-val">${o.forma||'-'}</span></div>
          <div class="cq-row-item" style="grid-column:span 3"><span class="cq-label">NFs incluídas</span><span class="cq-val">${(o.nfNums||[]).map(n=>'NF '+n).join(', ')||'-'}</span></div>
        </div>
      </div>`;

    return '';
  }).join('');
}

// v3 — cada entidade tem sua própria tabela no Supabase.
// Isso elimina o risco de dois usuários sobrescreverem os dados um do outro.

let _stateLoaded = false;
let _savingQueue = {}; // controla saves em paralelo por tabela

// Mapa: nome JS → nome da tabela no Supabase
const TG_TABLES = {
  Fornecedores:  'tg_fornecedores',
  OCs:           'tg_ocs',
  NFs:           'tg_nfs',
  Titulos:       'tg_titulos',
  Produtos:      'tg_produtos',
  Estoque:       'tg_estoque',
  Saidas:        'tg_saidas',
  Frota:         'tg_frota',
  EPIEstoque:    'tg_epi_estoque',
  EPIEntregas:   'tg_epi_entregas',
  Colaboradores: 'tg_colaboradores',
  Usuarios:      'tg_usuarios',
  Faturamentos:  'tg_faturamentos',
  HistoricoOC:   'tg_historico_oc',
  ViagensPipa:   'tg_viagens_pipa',
};

function proximoId(lista){
  const maior = (lista || []).reduce((m, item) => Math.max(m, Number(item.id) || 0), 0);
  return maior + 1;
}

// ── CARREGAMENTO INICIAL ──────────────────────────────────────────
// Carrega todas as linhas de uma tabela, lidando com paginação do Supabase
async function loadTabelaCompleta(tabela){
  const PAGE = 1000;
  let allRows = [];
  let from = 0;
  while(true){
    const { data: rows, error } = await supa
      .from(tabela)
      .select('id, data')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if(error){
      console.error('Erro ao carregar tabela "' + tabela + '" (offset ' + from + '):', error.message, error);
      // Retorna o que já carregou — evita travar todo o sistema por uma tabela
      return allRows;
    }
    if(!rows || rows.length === 0) break;
    rows.forEach(r => {
      if(!r.data || typeof r.data !== 'object'){
        console.warn('Linha sem campo "data" valido em "' + tabela + '" id=' + r.id, r);
      }
    });
    allRows = allRows.concat(rows);
    if(rows.length < PAGE) break;
    from += PAGE;
  }
  return allRows;
}

async function loadAppState(){
  try {
    const nomes = Object.keys(TG_TABLES);
    // Busca todas as tabelas em paralelo, com suporte a paginação
    const resultados = await Promise.all(
      nomes.map(nome => loadTabelaCompleta(TG_TABLES[nome]))
    );

    nomes.forEach((nome, i) => {
      const rows = resultados[i];
      window[nome] = rows.map(row => normalizeFromSupabaseData(nome, row));
      console.log(`✅ ${nome}: ${window[nome].length} registros carregados`);
    });

    OCs.forEach(o=>{ if(!o.status) o.status='Ativa'; });
    if(!window.ViagensPipa) window.ViagensPipa = [];
    _nextPipaId = ViagensPipa.length ? Math.max(...ViagensPipa.map(v=>Number(v.id)||0))+1 : 1;

    // Carrega contadores
    const { data: ctrs, error: ctrErr } = await supa.from('tg_counters').select('key, value');
    if(ctrErr){ console.error('Erro ao carregar contadores:', ctrErr); }
    if(ctrs){
      const m = {};
      ctrs.forEach(r => m[r.key] = Number(r.value));
      nextFornId  = m.nextFornId  || proximoId(Fornecedores);
      nextProdId  = m.nextProdId  || proximoId(Produtos);
      nextIdColab = m.nextIdColab || proximoId(Colaboradores);
      nextIdUser  = m.nextIdUser  || proximoId(Usuarios);
      nextFatId   = m.nextFatId   || proximoId(Faturamentos);
      nextId = {
        oc:       m.nextId_oc      || proximoId(OCs),
        nf:       m.nextId_nf      || proximoId(NFs),
        tit:      m.nextId_tit     || proximoId(Titulos),
        est:      m.nextId_est     || proximoId(Estoque),
        saida:    m.nextId_saida   || proximoId(Saidas),
        frota:    m.nextId_frota   || proximoId(Frota),
        episaida: m.nextId_episaida|| proximoId(EPIEntregas),
        epient:   m.nextId_epient  || proximoId(EPIEstoque),
      };
    }

    _stateLoaded = true;
    populateSelects();
    popularFiltroMeses();
    return true;
  } catch(e){
    toast('Erro ao carregar dados: ' + e.message, 'error');
    console.error('loadAppState FALHOU:', e);
    return false;
  }
}

// ── SALVAR UMA ENTIDADE ESPECÍFICA ────────────────────────────────
// Salva apenas os registros que mudaram em vez de reescrever tudo.
// Recebe o nome JS (ex: 'OCs') e os objetos a upsert (array ou único).
async function saveEntidade(nomeJS, objetos){
  if(!_stateLoaded) return;
  const tabela = TG_TABLES[nomeJS];
  if(!tabela){ console.warn('Tabela desconhecida:', nomeJS); return; }

  const lista = Array.isArray(objetos) ? objetos : [objetos];
  if(!lista.length) return;

  // Monta os rows no formato { id, data, updated_at } que o Supabase espera
  const rows = lista.map(o => ({
    id: Number(o.id),
    data: o,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supa.from(tabela).upsert(rows, { onConflict: 'id' });
  if(error){
    toast(`Erro ao salvar ${nomeJS}: ${error.message}`, 'error');
    console.error('saveEntidade error:', nomeJS, error);
  }
}

// Exclui um registro de uma tabela pelo id
async function deleteEntidade(nomeJS, id){
  if(!_stateLoaded) return;
  const tabela = TG_TABLES[nomeJS];
  if(!tabela) return;
  const { error } = await supa.from(tabela).delete().eq('id', Number(id));
  if(error){
    toast(`Erro ao excluir: ${error.message}`, 'error');
    console.error('deleteEntidade error:', nomeJS, id, error);
  }
}

// Salva contadores de IDs
async function saveCounters(){
  const rows = [
    { key: 'nextFornId',     value: nextFornId },
    { key: 'nextProdId',     value: nextProdId },
    { key: 'nextIdColab',    value: nextIdColab },
    { key: 'nextIdUser',     value: nextIdUser },
    { key: 'nextFatId',      value: nextFatId },
    { key: 'nextId_oc',      value: nextId.oc },
    { key: 'nextId_nf',      value: nextId.nf },
    { key: 'nextId_tit',     value: nextId.tit },
    { key: 'nextId_est',     value: nextId.est },
    { key: 'nextId_saida',   value: nextId.saida },
    { key: 'nextId_frota',   value: nextId.frota },
    { key: 'nextId_episaida',value: nextId.episaida },
    { key: 'nextId_epient',  value: nextId.epient },
  ];
  const { error } = await supa.from('tg_counters').upsert(rows, { onConflict: 'key' });
  if(error) console.error('saveCounters error:', error);
}

// ── HOOKS NAS FUNÇÕES DE SALVAR ───────────────────────────────────
// Intercepta cada função de salvar para persistir apenas a entidade afetada.

// Guarda referências originais
const _orig = {};
[
  'salvarOC','salvarNF','salvarTitulo','salvarSaida','salvarFrota',
  'salvarEPIEntrada','salvarEPISaida','salvarColab','salvarUsuario',
  'salvarFornecedor','salvarProduto','salvarNFRapida',
  'marcarPago','cancelarOC'
].forEach(fn => { _orig[fn] = window[fn]; });

// Mapa: função → quais entidades ela afeta
const FN_ENTIDADES = {
  salvarOC:         ['OCs', 'HistoricoOC'],
  salvarNF:         ['NFs', 'OCs', 'Titulos', 'Frota'],
  salvarTitulo:     ['Titulos'],
  salvarSaida:      ['Saidas', 'Produtos'],
  salvarFrota:      ['Frota'],
  salvarEPIEntrada: ['EPIEstoque'],
  salvarEPISaida:   ['EPIEntregas'],
  salvarColab:      ['Colaboradores'],
  salvarUsuario:    ['Usuarios'],
  salvarFornecedor: ['Fornecedores'],
  salvarProduto:    ['Produtos'],
  // salvarFaturamento gerencia o próprio save diretamente (função async)
  salvarNFRapida:   ['NFs', 'OCs'],
  marcarPago:       ['Titulos'],
  cancelarOC:       ['OCs', 'HistoricoOC'],
};

function wrapSalvar(fnName){
  window[fnName] = async function(...args){
    // Snapshot antes — guarda o JSON de cada registro para comparar depois
    const snapAntes = {};
    const entidades = FN_ENTIDADES[fnName] || [];
    entidades.forEach(e => {
      snapAntes[e] = {};
      (window[e] || []).forEach(x => { snapAntes[e][x.id] = JSON.stringify(x); });
    });

    const ret = _orig[fnName].apply(this, args);
    if(ret && typeof ret.then === 'function') await ret;

    // Detecta registros novos ou alterados e salva só eles
    const promises = [];
    entidades.forEach(e => {
      const lista = window[e] || [];
      const antes = snapAntes[e] || {};
      // Novos: id não existia antes. Modificados: JSON mudou.
      const alterados = lista.filter(x => {
        const jsonAntes = antes[x.id];
        if(jsonAntes === undefined) return true;          // novo
        return jsonAntes !== JSON.stringify(x);           // modificado
      });
      if(alterados.length > 0){
        promises.push(saveEntidade(e, alterados));
      }
    });
    promises.push(saveCounters());
    await Promise.all(promises);
    return ret;
  };
}

Object.keys(FN_ENTIDADES).forEach(wrapSalvar);

// Intercepta exclusões para deletar do Supabase
const _confirmDeleteOriginal = confirmDelete;
confirmDelete = function(msg, detail, fn){
  return _confirmDeleteOriginal(msg, detail, async function(){
    // Snapshot antes da exclusão
    const snapAntes = {};
    Object.keys(TG_TABLES).forEach(e => {
      snapAntes[e] = new Set((window[e] || []).map(x => x.id));
    });

    const ret = fn && fn();
    if(ret && typeof ret.then === 'function') await ret;

    // Detecta quais ids foram removidos por entidade
    const promises = [];
    Object.keys(TG_TABLES).forEach(e => {
      const depoisIds = new Set((window[e] || []).map(x => x.id));
      const removidos = [...(snapAntes[e] || [])].filter(id => !depoisIds.has(id));
      removidos.forEach(id => promises.push(deleteEntidade(e, id)));
    });
    promises.push(saveCounters());
    await Promise.all(promises);
  });
};

// ── FILTRO DE MESES DINÂMICO ──────────────────────────────────────
function popularFiltroMeses(){
  // Coleta todos os meses/anos presentes nos dados financeiros (Titulos + NFs)
  const mesesSet = new Set();
  const MESES_PT = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  [...Titulos, ...NFs].forEach(t => {
    const d = t.venc || t.data;
    if(!d) return;
    const partes = String(d).split('-');
    if(partes.length < 2) return;
    const ano = partes[0], mes = parseInt(partes[1]);
    if(ano && mes) mesesSet.add(`${ano}-${String(mes).padStart(2,'0')}`);
  });

  // Ordena decrescente (mais recente primeiro)
  const mesesOrdenados = [...mesesSet].sort().reverse();

  // Atualiza selects hardcoded no rel-gastos
  ['rel-mes','rel-mes-fim'].forEach(selId => {
    const sel = document.getElementById(selId);
    if(!sel) return;
    const curVal = sel.value;
    // Mantém opção vazia no "até"
    sel.innerHTML = selId === 'rel-mes-fim' ? '<option value="">—</option>' : '';
    mesesOrdenados.forEach(ym => {
      const [ano, mesStr] = ym.split('-');
      const mesNum = parseInt(mesStr);
      const opt = document.createElement('option');
      opt.value = mesNum;
      opt.dataset.ano = ano;
      opt.textContent = `${MESES_PT[mesNum]} ${ano}`;
      sel.appendChild(opt);
    });
    // Tenta restaurar valor
    if(curVal) sel.value = curVal;
  });

  // Relatório financeiro — selects fm/fa com anos dinâmicos
  const anos = [...new Set(mesesOrdenados.map(ym => ym.split('-')[0]))].sort().reverse();
  ['fa','fta'].forEach(selId => {
    const sel = document.getElementById(selId);
    if(!sel) return;
    const curVal = sel.value;
    sel.innerHTML = '';
    anos.forEach(ano => {
      const opt = document.createElement('option');
      opt.value = ano;
      opt.textContent = ano;
      sel.appendChild(opt);
    });
    if(curVal && anos.includes(curVal)) sel.value = curVal;
    else if(anos.length) sel.value = anos[0];
  });
}

// ── LOGIN / SESSÃO ────────────────────────────────────────────────
// Sobrescreve doLogin para carregar os dados do Supabase ANTES de renderizar.
doLogin = async function(){
  // Se a sessão já foi restaurada automaticamente, ignora
  if(_appInitializing || usuarioLogado) return;

  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const senha = document.getElementById('login-senha').value;
  const errEl = document.getElementById('login-err');
  const btn = document.querySelector('.login-btn');

  if(!email || !senha){ errEl.textContent='Preencha e-mail e senha.'; errEl.style.display='block'; return; }

  btn.textContent = 'Entrando...';
  btn.disabled = true;

  const { data, error } = await supa.auth.signInWithPassword({ email, password: senha });

  btn.textContent = 'Entrar no Sistema →';
  btn.disabled = false;

  if(error){
    errEl.textContent = 'E-mail ou senha incorretos.';
    errEl.style.display = 'block';
    document.getElementById('login-senha').value = '';
    return;
  }

  errEl.style.display = 'none';
  const user = data.user;

  // Carrega todos os dados do Supabase antes de qualquer render
  const ok = await loadAppState();
  if(!ok){
    toast('Falha ao carregar dados. Tente novamente.', 'error');
    return;
  }

  // Agora busca o perfil (Usuarios já está populado)
  const perfil = Usuarios.find(u => u.email && u.email.toLowerCase() === email);
  const nomeExibir = perfil ? perfil.nome : (user.email.split('@')[0]);
  const perfilExibir = perfil ? perfil.perfil.replace(' (Acesso Total)','') : 'Usuário';
  const iniciais = nomeExibir.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();

  document.getElementById('sb-avatar').textContent = iniciais;
  document.getElementById('sb-nome').textContent = nomeExibir;
  document.getElementById('sb-perfil').textContent = perfilExibir;

  usuarioLogado = { ...user, nome: nomeExibir, perfil: perfilExibir };

  document.getElementById('login-wrap').style.display = 'none';
  document.getElementById('app-wrap').style.display = 'flex';
  renderAll();
};

// Verifica se já há sessão ativa ao carregar a página
// Usa flag para evitar duplo carregamento caso doLogin seja chamado junto
let _appInitializing = false;

supa.auth.getSession().then(async ({ data: { session } }) => {
  if(!session) return; // sem sessão, fica na tela de login

  if(_appInitializing) return;
  _appInitializing = true;

  const email = session.user.email;

  // Esconde login imediatamente para evitar piscar
  document.getElementById('login-wrap').style.display = 'none';
  document.getElementById('app-wrap').style.display = 'flex';

  // Carrega dados
  const ok = await loadAppState();
  if(!ok){
    console.warn('Não foi possível carregar dados na restauração de sessão.');
    _appInitializing = false;
    return;
  }

  const perfil = Usuarios.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  const nomeExibir = perfil ? perfil.nome : email.split('@')[0];
  const perfilExibir = perfil ? perfil.perfil.replace(' (Acesso Total)','') : 'Usuário';
  const iniciais = nomeExibir.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();

  document.getElementById('sb-avatar').textContent = iniciais;
  document.getElementById('sb-nome').textContent = nomeExibir;
  document.getElementById('sb-perfil').textContent = perfilExibir;

  usuarioLogado = { ...session.user, nome: nomeExibir, perfil: perfilExibir };

  renderAll();
  _appInitializing = false;
});

// ======================== IMPORTAÇÃO SEGURA — CONTAS A PAGAR ========================
// Esta camada deixa o sistema mais tolerante a planilhas com nomes de colunas diferentes
// e garante que os títulos importados sejam salvos em tg_titulos.data com os campos que a tela usa.
function normalizeTextKey(v){
  return String(v || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function pickCampo(obj, nomes){
  const mapa = {};
  Object.keys(obj || {}).forEach(k => mapa[normalizeTextKey(k)] = obj[k]);
  for(const n of nomes){
    const key = normalizeTextKey(n);
    if(mapa[key] !== undefined && mapa[key] !== null && String(mapa[key]).trim() !== '') return mapa[key];
  }
  return '';
}

function parseValorBR(v){
  if(typeof v === 'number') return v;
  let s = String(v || '').trim();
  if(!s) return 0;
  s = s.replace(/R\$|\s/g, '');
  if(s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if(s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function excelDateToISO(v){
  if(!v) return '';
  if(v instanceof Date && !isNaN(v)) return v.toISOString().slice(0,10);
  if(typeof v === 'number'){
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if(!isNaN(d)) return d.toISOString().slice(0,10);
  }
  const s = String(v).trim();
  if(!s) return '';
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if(m){
    const dd = m[1].padStart(2,'0');
    const mm = m[2].padStart(2,'0');
    let yy = m[3];
    if(yy.length === 2) yy = '20' + yy;
    return yy + '-' + mm + '-' + dd;
  }
  const d = new Date(s);
  return isNaN(d) ? '' : d.toISOString().slice(0,10);
}

function normalizarTituloImportado(row){
  const fornecedor = pickCampo(row, ['fornecedor','beneficiario','beneficiário','nome','razao social','razão social','favorecido','cliente fornecedor']);
  const valor = parseValorBR(pickCampo(row, ['valor','valor total','total','vlr','valor titulo','valor título','valor parcela']));
  const venc = excelDateToISO(pickCampo(row, ['vencimento','data vencimento','data de vencimento','vence','vcto','dt vencimento','data pgto','data pagamento']));
  const emissao = excelDateToISO(pickCampo(row, ['emissao','emissão','data emissao','data emissão','competencia','competência','data'])) || today;
  const statusRaw = String(pickCampo(row, ['status','situacao','situação','pago pendente','pagamento']) || 'Pendente').trim().toLowerCase();
  const status = statusRaw.includes('pag') || statusRaw.includes('quit') || statusRaw.includes('baix') ? 'Pago' : 'Pendente';
  const tipo = String(pickCampo(row, ['tipo','tipo documento','categoria documento','documento']) || 'Boleto NF').trim();
  const categoria = String(pickCampo(row, ['categoria','grupo','centro custo','centro de custo']) || 'outros').trim();
  const ref = String(pickCampo(row, ['nf','nota fiscal','referencia','referência','documento','numero','número','num doc','boleto','parcela']) || '').trim() || ('IMP-' + Date.now() + '-' + Math.floor(Math.random()*1000));
  const placa = String(pickCampo(row, ['placa','veiculo','veículo','caminhao','caminhão']) || '-').trim() || '-';
  const obs = String(pickCampo(row, ['obs','observacao','observação','descricao','descrição','historico','histórico']) || '').trim();

  if(!fornecedor || !valor || !venc) return null;
  return { fornecedor, forn: fornecedor, categoria, tipo, ref, valor, emissao, venc, status, placa, boleto:'', comprovante:'', obs };
}

function normalizeFromSupabaseData(nome, row){
  // row tem a estrutura: { id: number, data: { ...campos } }
  // Precisa achatar: { id: number, ...campos }
  const data = row && row.data && typeof row.data === 'object' ? row.data : {};
  // Garante que o id do row (chave primária) sobrescreve qualquer id dentro de data
  const obj = { ...data, id: Number(row.id) };

  // Normalizações específicas por entidade
  if(nome === 'Titulos'){
    if(!obj.forn && obj.fornecedor) obj.forn = obj.fornecedor;
    if(!obj.fornecedor && obj.forn) obj.fornecedor = obj.forn;
    if(!obj.venc && obj.vencimento) obj.venc = obj.vencimento;
    if(!obj.vencimento && obj.venc) obj.vencimento = obj.venc;
    if(!obj.valor && obj.valor_total) obj.valor = obj.valor_total;
    if(!obj.status) obj.status = 'Pendente';
    if(!obj.tipo) obj.tipo = 'Boleto NF';
    if(!obj.categoria) obj.categoria = 'outros';
    if(!obj.placa) obj.placa = '-';
  }
  if(nome === 'OCs'){
    if(!obj.status) obj.status = 'Ativa';
    if(!obj.nf) obj.nf = 'Pendente';
  }
  if(nome === 'Frota'){
    if(!obj.status) obj.status = 'Ativo';
    if(obj.gasto === undefined) obj.gasto = 0;
    if(obj.limite === undefined) obj.limite = 0;
  }
  if(nome === 'Fornecedores'){
    if(!obj.status) obj.status = 'Ativo';
  }
  if(nome === 'Produtos'){
    if(obj.qtdEstoque === undefined) obj.qtdEstoque = 0;
    if(obj.fator === undefined || !obj.fator) obj.fator = 1;
    if(obj.minimo === undefined) obj.minimo = 0;
    if(obj.valorUnitCompra === undefined) obj.valorUnitCompra = 0;
  }
  if(nome === 'Colaboradores' || nome === 'Usuarios'){
    if(!obj.status) obj.status = 'Ativo';
  }
  if(nome === 'Faturamentos'){
    if(!obj.status) obj.status = 'Pendente';
    if(!Array.isArray(obj.nfIds))   obj.nfIds   = obj.nfIds   ? (typeof obj.nfIds==='string'   ? JSON.parse(obj.nfIds)   : []) : [];
    if(!Array.isArray(obj.nfNums))  obj.nfNums  = obj.nfNums  ? (typeof obj.nfNums==='string'  ? JSON.parse(obj.nfNums)  : []) : [];
    if(!Array.isArray(obj.parcelas))obj.parcelas= obj.parcelas? (typeof obj.parcelas==='string'? JSON.parse(obj.parcelas): []) : [];
    if(!obj.num)  obj.num  = 'FAT-?';
    if(!obj.forn) obj.forn = '';
    if(!obj.forma)obj.forma= '';
    if(!obj.venc && obj.parcelas && obj.parcelas[0]) obj.venc = obj.parcelas[0].venc;
    if(obj.valor !== undefined) obj.valor = parseFloat(obj.valor) || 0;
  }
  return obj;
}

async function importarTitulosPlanilha(event){
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if(!file) return;
  if(typeof XLSX === 'undefined'){
    toast('Biblioteca XLSX não carregou. Recarregue a página e tente de novo.', 'error');
    return;
  }
  try{
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type:'array', cellDates:true });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Lê a planilha como matriz para aceitar arquivos COM ou SEM cabeçalho.
    // Formato sem cabeçalho esperado: Nº/Ref | Fornecedor | Valor | Vencimento
    const matriz = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false, blankrows:false });
    if(!matriz.length){ toast('A planilha está vazia.', 'error'); return; }

    const primeiraLinha = (matriz[0] || []).map(v => normalizeTextKey(v));
    const temCabecalho = primeiraLinha.some(k =>
      ['fornecedor','beneficiario','beneficiário','valor','vencimento','data_vencimento','nf','referencia','referência','documento'].includes(k)
    );

    let linhas = [];
    if(temCabecalho){
      linhas = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
    } else {
      linhas = matriz.map(r => ({
        ref: r[0] || '',
        fornecedor: r[1] || '',
        valor: r[2] || '',
        vencimento: r[3] || '',
        emissao: r[3] || '',
        status: 'Pendente',
        tipo: 'Boleto NF',
        categoria: 'outros',
        placa: '-',
        obs: 'Importado de planilha sem cabeçalho'
      }));
    }

    const novos = [];
    const rejeitados = [];
    linhas.forEach((linha, idx) => {
      const t = normalizarTituloImportado(linha);
      if(t){ t.id = newId('tit'); novos.push(t); }
      else rejeitados.push((temCabecalho ? idx + 2 : idx + 1));
    });

    if(!novos.length){
      toast('Nenhum título válido encontrado. Confira fornecedor, valor e vencimento.', 'error');
      return;
    }

    Titulos.unshift(...novos);
    await saveEntidade('Titulos', novos);
    await saveCounters();
    popularFiltroMeses();
    populateSelects();
    renderAll();

    const detalhe = rejeitados.length ? (' ' + rejeitados.length + ' linha(s) ignorada(s): ' + rejeitados.slice(0,8).join(', ') + (rejeitados.length>8?'...':'')) : '';
    const modo = temCabecalho ? 'com cabeçalho' : 'sem cabeçalho';
    toast(novos.length + ' título(s) importado(s) de planilha ' + modo + ' e salvo(s) no Supabase.' + detalhe);
  }catch(e){
    console.error(e);
    toast('Erro ao importar planilha: ' + e.message, 'error');
  }
}

function backupTitulosJSON(){
  const blob = new Blob([JSON.stringify(Titulos, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup_tg_titulos_' + today + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ======================== INIT ========================

document.querySelectorAll('input[type=date]').forEach(el=>{
  if(!el.value) el.value = today;
});

populateSelects();
toggleP();
// renderAll() é chamado após o login bem-sucedido
