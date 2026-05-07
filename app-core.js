// ── CORE: Supabase, dados globais, helpers, toast, modais, navegação ──
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

const titles={dashboard:'Dashboard Geral',oc:'Ordens de Compra',fornecedores:'Cadastro de Fornecedores',produtos:'Cadastro de Produtos',nf:'Notas Fiscais',faturamentos:'Faturamentos',financeiro:'Contas a Pagar',estoque:'Estoque de Peças',frota:'Gestão de Frota',epi:'Controle de EPIs','rel-gastos':'Relatório — Gastos por Placa','rel-financeiro':'Relatório Financeiro por Período',pendentes:'OCs Pendentes de Faturamento',colaboradores:'Cadastro de Colaboradores',usuarios:'Usuários do Sistema',consulta:'🔍 Consulta Rápida',pipas:'🚛 Operações — Pipas',despesas:'🏆 Despesas por Placa 2026',relmensal:'📅 Resumo Operacional Mensal',energisa:'⚡ Gerar Planilha Energisa','rel-oc-fin':'📊 Relatório OC × Financeiro'};
function showScreen(id,el){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const sc=$('screen-'+id);if(sc)sc.classList.add('active');
  if(el)el.classList.add('active');
  else document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('onclick')&&n.getAttribute('onclick').includes("'"+id+"'"))n.classList.add('active');});
  $('page-title').textContent=titles[id]||id;
  if(id==='rel-financeiro'){toggleP();setTimeout(goRel,80);}
}

