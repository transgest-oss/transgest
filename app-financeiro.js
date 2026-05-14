// ── FINANCEIRO: CRUD Título ──
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
async function uploadCRLV(inputId){
  const input = $(inputId);
  const file = input && input.files && input.files[0] ? input.files[0] : null;
  if(!file) return '';
  const maxMB = 12;
  if(file.size > maxMB * 1024 * 1024){
    toast(`Arquivo muito grande. Limite: ${maxMB}MB.`, 'error');
    return null;
  }
  const pasta = new Date().toISOString().slice(0,10);
  const nome = `crlv/${pasta}/${Date.now()}_${limparNomeArquivo(file.name)}`;
  const { error } = await supa.storage.from('transgest-docs').upload(nome, file, { upsert:false, contentType:file.type || undefined });
  if(error){
    console.error(error);
    toast('Erro ao enviar CRLV: ' + error.message, 'error');
    return null;
  }
  const { data } = supa.storage.from('transgest-docs').getPublicUrl(nome);
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
// ======================== PAGAMENTO EM LOTE ========================
function atualizarSelecaoFin(){
  const chks = [...document.querySelectorAll('.fin-chk:checked')];
  const total = chks.reduce((a, c) => a + (parseFloat(c.dataset.valor)||0), 0);
  const bar = $('fin-lote-bar');
  const allChk = $('fin-check-all');
  if(chks.length > 0){
    bar.style.display = 'flex';
    $('fin-lote-info').textContent = `${chks.length} título${chks.length>1?'s':''} selecionado${chks.length>1?'s':''}`;
    $('fin-lote-total').textContent = '· ' + fmt(total);
  } else {
    bar.style.display = 'none';
  }
  // Atualiza estado do checkbox do cabeçalho
  const todos = [...document.querySelectorAll('.fin-chk')];
  if(allChk){
    allChk.indeterminate = chks.length > 0 && chks.length < todos.length;
    allChk.checked = todos.length > 0 && chks.length === todos.length;
  }
}

function toggleTodosFinanceiro(el){
  const chks = [...document.querySelectorAll('.fin-chk')];
  chks.forEach(c => c.checked = el.checked);
  atualizarSelecaoFin();
}

function limparSelecaoFin(){
  document.querySelectorAll('.fin-chk').forEach(c => c.checked = false);
  const allChk = $('fin-check-all');
  if(allChk){ allChk.checked = false; allChk.indeterminate = false; }
  const bar = $('fin-lote-bar');
  if(bar) bar.style.display = 'none';
}

function abrirPagamentoLote(){
  const chks = [...document.querySelectorAll('.fin-chk:checked')];
  if(!chks.length){ toast('Selecione ao menos um título', 'error'); return; }
  const total = chks.reduce((a, c) => a + (parseFloat(c.dataset.valor)||0), 0);
  $('lote-resumo').textContent = `${chks.length} título${chks.length>1?'s':''} · Total: ${fmt(total)}`;
  $('lote-data').value = today;
  $('modal-pag-lote').classList.add('open');
}

function confirmarPagamentoLote(){
  const dataPag = $('lote-data').value || today;
  if(!dataPag){ toast('Informe a data do pagamento', 'error'); return; }
  const chks = [...document.querySelectorAll('.fin-chk:checked')];
  if(!chks.length){ closeModal('modal-pag-lote'); return; }
  const ids = chks.map(c => parseInt(c.dataset.id));
  let pagos = 0;
  ids.forEach(id => {
    const t = Titulos.find(x => x.id === id);
    if(!t || t.status === 'Pago') return;
    t.status = 'Pago';
    t.dataPagamento = dataPag;
    t.valorPago = parseFloat(t.valor) || 0;
    pagos++;
  });
  registrarLog({
    acao: 'baixou_pagamento_lote',
    tabela: 'tg_titulos',
    registro_id: ids.join(','),
    descricao: `Pagamento em lote em ${dataPag}: ${pagos} título(s) baixados`
  });
  closeModal('modal-pag-lote');
  limparSelecaoFin();
  renderFin();
  toast(`✅ ${pagos} título${pagos>1?'s':''} marcado${pagos>1?'s':''} como pago${pagos>1?'s':''} em ${formatarDataBR(dataPag)}`);
}

// ======================== BAIXA DE PAGAMENTO ========================
let _pagandoId = null;

function marcarPago(id){
  // Abre modal de confirmação em vez de pagar direto
  const t = Titulos.find(x => x.id === id);
  if(!t) return;
  _pagandoId = id;
  $('cpag-forn').textContent = t.forn || '—';
  $('cpag-ref').textContent  = (t.ref && t.ref !== '-' ? t.ref + ' · ' : '') + fmt(t.valor) + ' · venc. ' + formatarDataBR(t.venc);
  $('cpag-data').value  = today;
  $('cpag-valor').value = (parseFloat(t.valor) || 0).toFixed(2);
  $('cpag-juros').value = '';
  $('modal-confirmar-pag').classList.add('open');
}

function confirmarPagamento(){
  const t = Titulos.find(x => x.id === _pagandoId);
  if(!t){ closeModal('modal-confirmar-pag'); return; }

  const dataPag = $('cpag-data').value || today;
  const valorPago = parseFloat($('cpag-valor').value) || parseFloat(t.valor) || 0;
  const juros = parseFloat($('cpag-juros').value) || 0;

  if(!dataPag){ toast('Informe a data do pagamento', 'error'); return; }
  if(valorPago <= 0){ toast('Informe o valor pago', 'error'); return; }

  t.status      = 'Pago';
  t.dataPagamento = dataPag;
  t.valorPago   = Math.round((valorPago + juros) * 100) / 100;
  if(juros > 0) t.juros = juros;

  registrarLog({
    acao: 'baixou_pagamento',
    tabela: 'tg_titulos',
    registro_id: t.ref || t.id,
    descricao: `Pagamento em ${dataPag}: ${t.ref || t.id} — ${t.forn || 'sem fornecedor'} — ${fmt(t.valorPago)}${juros > 0 ? ' (juros: ' + fmt(juros) + ')' : ''}`
  });

  closeModal('modal-confirmar-pag');
  _pagandoId = null;
  renderFin();
  toast('✅ Pagamento registrado em ' + formatarDataBR(dataPag) + (juros > 0 ? ' · Juros: ' + fmt(juros) : ''));
}

