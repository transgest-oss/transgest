// ── NF: Notas Fiscais — CRUD, parcelas, rateio ──
// ======================== CRUD NF ========================

// Atualiza status da OC com base na SOMA dos valores das NFs lançadas
function atualizarStatusOC(oc){
  if(!oc) return;
  const nfsVinculadas = NFs.filter(n => n.oc === oc.num && n.pgto !== 'Aguardando Faturamento');
  if(nfsVinculadas.length === 0){
    oc.nf = 'Pendente';
    return;
  }
  const somaVinculadas = nfsVinculadas.reduce((acc, n) => acc + (parseFloat(n.valor)||0), 0);
  const valorOC = parseFloat(oc.valor) || 0;
  // Tolerância de R$ 0,02 para arredondamentos
  if(somaVinculadas >= valorOC - 0.02){
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
  const numNF=$('f-nf-num').value.trim();
  if(numNF){
    const duplicada=NFs.find(n=>n.num===numNF && n.forn===forn);
    if(duplicada){toast(`NF ${numNF} já foi lançada para ${forn}!`,'error');return;}
  }
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

