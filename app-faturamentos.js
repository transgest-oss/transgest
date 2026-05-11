// ── FATURAMENTOS: PDF, Faturamentos, NF Rápida, Fornecedores, Produtos ──
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
  const numNF = $('f-nfr-num').value.trim();
  if(numNF){
    const duplicada = NFs.find(n => n.num === numNF && n.forn === forn);
    if(duplicada){ toast(`NF ${numNF} já foi lançada para ${forn}!`,'error'); return; }
  }

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

