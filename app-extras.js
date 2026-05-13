// ── EXTRAS: Divergência, Rel OC×Fin, Energisa, Mensal, Despesas, Pipas, Consulta, Importação, Backup, Init ──
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
  const nfsExistentes = NFs.filter(nf => String(nf.oc) === String(ocNum) && nf.id !== nfEditandoId);
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


// ======================== RELATÓRIO OC × FINANCEIRO ========================
function limparFiltrosRelOCFin(){
  ['rocf-forn'].forEach(id=>{const el=$(id);if(el)el.value='';});
  ['rocf-cat','rocf-status'].forEach(id=>{const el=$(id);if(el)el.value='';});
  ['rocf-de','rocf-ate'].forEach(id=>{const el=$(id);if(el)el.value='';});
  renderRelOCFin();
}

function renderRelOCFin(){
  const de   = ($('rocf-de')?.value   || '');
  const ate  = ($('rocf-ate')?.value  || '');
  const forn = ($('rocf-forn')?.value || '');
  const cat  = ($('rocf-cat')?.value  || '');
  const stat = ($('rocf-status')?.value || '');

  let ocs = OCs.filter(o => o.status !== 'Cancelada');
  if(de)   ocs = ocs.filter(o => o.data >= de);
  if(ate)  ocs = ocs.filter(o => o.data <= ate);
  if(forn) ocs = ocs.filter(o => (o.forn||'').toLowerCase().includes(forn.toLowerCase()));
  if(cat)  ocs = ocs.filter(o => (o.categoria||'') === cat);

  const linhas = ocs.map(oc => {
    const titulosVinc = Titulos.filter(t =>
      t.ocNum === oc.num || t.ocId === oc.id ||
      (t.ref && t.ref.includes('OC-' + oc.num))
    );
    const nfsVinc = NFs.filter(n => n.oc === oc.num);
    const valorPago     = titulosVinc.filter(t=>t.status==='Pago').reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
    const valorPendente = titulosVinc.filter(t=>t.status==='Pendente').reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
    const valorTitulos  = valorPago + valorPendente;
    const diff = Math.round((valorTitulos - (parseFloat(oc.valor)||0)) * 100) / 100;
    return { oc, nfsVinc, titulosVinc, valorPago, valorPendente, valorTitulos, diff };
  });

  let filtradas = linhas;
  if(stat === 'pago')     filtradas = linhas.filter(l => l.valorPago > 0 && l.valorPendente === 0);
  if(stat === 'pendente') filtradas = linhas.filter(l => l.valorPendente > 0);
  if(stat === 'sem-tit')  filtradas = linhas.filter(l => l.titulosVinc.length === 0);
  if(stat === 'diverge')  filtradas = linhas.filter(l => Math.abs(l.diff) > 0.02);

  const totalOCVal = filtradas.reduce((a,l)=>a+(parseFloat(l.oc.valor)||0),0);
  const totalPago  = filtradas.reduce((a,l)=>a+l.valorPago,0);
  const totalPend  = filtradas.reduce((a,l)=>a+l.valorPendente,0);
  const semTitulo  = filtradas.filter(l=>l.titulosVinc.length===0).length;

  const kpiEl = $('rocf-kpis');
  if(kpiEl) kpiEl.innerHTML =
    `<div class="stat-card"><div class="stat-label">OCs no filtro</div><div class="stat-value" style="font-size:18px">${filtradas.length}</div><div class="stat-sub">${fmt(totalOCVal)} em valor</div></div>`+
    `<div class="stat-card"><div class="stat-label">Valor Pago</div><div class="stat-value" style="font-size:18px;color:var(--accent)">${fmt(totalPago)}</div><div class="stat-sub">títulos quitados</div></div>`+
    `<div class="stat-card"><div class="stat-label">Valor Pendente</div><div class="stat-value" style="font-size:18px;color:var(--amber)">${fmt(totalPend)}</div><div class="stat-sub">títulos a pagar</div></div>`+
    `<div class="stat-card"><div class="stat-label">Sem Título</div><div class="stat-value" style="font-size:18px;color:var(--red)">${semTitulo}</div><div class="stat-sub">OCs sem vínculo financeiro</div></div>`;

  const tb = $('tb-rocf');
  if(!tb) return;
  if(!filtradas.length){
    tb.innerHTML = '<tr><td colspan="9" class="empty">Nenhuma OC encontrada com esses filtros.</td></tr>';
    return;
  }
  tb.innerHTML = filtradas.map(({ oc, titulosVinc, valorPago, valorPendente, diff }) => {
    const statusFin = titulosVinc.length === 0
      ? chip('Sem Título','cr')
      : valorPendente === 0 ? chip('✓ Quitado','cg')
      : valorPago > 0      ? chip('Parc. Pago','ca')
      :                       chip('Pendente','cgr');
    const diffBadge = Math.abs(diff) > 0.02
      ? `<span style="font-size:10px;color:var(--red);font-weight:600">${diff>0?'+':'-'}${fmt(Math.abs(diff))}</span>`
      : `<span style="font-size:10px;color:var(--accent)">✓</span>`;
    const titLinks = titulosVinc.length
      ? `<span style="font-size:10px;color:var(--accent2)">${titulosVinc.length} título${titulosVinc.length>1?'s':''}</span>`
      : `<span style="font-size:10px;color:var(--red)">nenhum</span>`;
    return `<tr>
      <td class="mono" style="color:var(--accent2);font-size:11px">${oc.num}</td>
      <td style="font-size:11px">${formatarDataBR(oc.data)}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${oc.forn}">${oc.forn}</td>
      <td>${chip(oc.tipo||'—','cgr')}</td>
      <td class="mono">${fmt(oc.valor)}</td>
      <td class="mono" style="color:var(--accent)">${valorPago>0?fmt(valorPago):'—'}</td>
      <td class="mono" style="color:var(--amber)">${valorPendente>0?fmt(valorPendente):'—'}</td>
      <td>${diffBadge} ${titLinks}</td>
      <td>${statusFin}</td>
    </tr>`;
  }).join('');
}

function exportRelOCFinXLSX(){
  if(typeof XLSX === 'undefined'){ toast('Biblioteca XLSX não carregou','error'); return; }
  const de = $('rocf-de')?.value || '';
  const ate = $('rocf-ate')?.value || '';
  let ocs = OCs.filter(o => o.status !== 'Cancelada');
  if(de) ocs = ocs.filter(o => o.data >= de);
  if(ate) ocs = ocs.filter(o => o.data <= ate);
  const rows = [
    ['Relatório OC × Financeiro — TransGest'],
    ['Exportado em', new Date().toLocaleString('pt-BR')],
    [],
    ['Nº OC','Data','Fornecedor','Categoria','Valor OC','Valor Pago','Valor Pendente','Nº Títulos','Status Financeiro']
  ];
  ocs.forEach(oc => {
    const tits = Titulos.filter(t => t.ocNum===oc.num || t.ocId===oc.id || (t.ref&&t.ref.includes('OC-'+oc.num)));
    const pago = tits.filter(t=>t.status==='Pago').reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
    const pend = tits.filter(t=>t.status==='Pendente').reduce((a,t)=>a+(parseFloat(t.valor)||0),0);
    const statusFin = tits.length===0?'Sem Título':pend===0?'Quitado':pago>0?'Parc. Pago':'Pendente';
    rows.push([oc.num, oc.data, oc.forn, oc.tipo||'—', oc.valor, pago||0, pend||0, tits.length, statusFin]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [8,10,28,16,12,12,12,8,14].map(w=>({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'OC x Financeiro');
  XLSX.writeFile(wb, 'relatorio_oc_financeiro_' + today + '.xlsx');
  toast('📊 Excel gerado!');
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

// Calcula o total de uma categoria num mês/ano — NFs + Títulos avulsos
function rmValorCatMes(cats, ano, mes){
  const prefixo = `${ano}-${String(mes).padStart(2,'0')}`;

  // 1) NFs pela data de emissão (exclui as aguardando faturamento)
  const totalNFs = NFs.filter(nf => {
    const cat = nf.categoria || 'manutencao';
    if(!cats.includes(cat)) return false;
    if(nf.pgto === 'Aguardando Faturamento') return false;
    return (nf.data||'').startsWith(prefixo);
  }).reduce((a,nf) => a + (parseFloat(nf.valor)||0), 0);

  // 2) Títulos avulsos (sem NF vinculada) pela data de emissão/competência
  // Evita dupla contagem: exclui títulos que foram gerados por NFs (ref começa com número de NF conhecida)
  const nfNums = new Set(NFs.map(nf => nf.num).filter(Boolean));
  const totalTitulos = Titulos.filter(t => {
    const cat = t.categoria || t.tipo || '';
    // Mapeia o tipo do título para a categoria do resumo
    const catMapeada = (() => {
      if(cat === 'impostos' || cat === 'Imposto ISSQN' || cat === 'Imposto INSS' || cat === 'FGTS') return 'impostos';
      if(cat === 'funcionarios' || cat === 'Folha de Pagamento') return 'funcionarios';
      if(cat === 'diarias') return 'diarias';
      if(cat === 'consorcios') return 'consorcios';
      if(cat === 'gratificacoes' || cat === 'Gratificações') return 'gratificacoes';
      if(cat === 'seguros' || cat === 'Seguro') return 'seguros';
      if(cat === 'adiantamentos' || cat === 'Adiantamentos') return 'adiantamentos';
      if(cat === 'colaboradores') return 'colaboradores';
      if(cat === 'combustiveis') return 'combustiveis';
      if(cat === 'manutencao') return 'manutencao';
      if(cat === 'scherer') return 'scherer';
      if(cat === 'scherer_ambi') return 'scherer_ambi';
      if(cat === 'outros' || cat === 'Outros' || cat === 'Aluguel' || cat === 'Compromisso Anterior') return 'outros';
      return null;
    })();
    if(!catMapeada || !cats.includes(catMapeada)) return false;
    // Exclui títulos que já vieram de uma NF (evita dupla contagem)
    if(t.ref && nfNums.has(t.ref)) return false;
    // Usa data de emissão/competência do título
    const dataRef = (t.emissao || t.venc || '');
    return dataRef.startsWith(prefixo);
  }).reduce((a,t) => a + (parseFloat(t.valor)||0), 0);

  return totalNFs + totalTitulos;
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
    const valorNF = parseFloat(nf.valor) || 0;
    if(oc && oc.isRateio && Array.isArray(oc.rateio) && oc.rateio.length){
      // OC RATEADA: distribui o valor da NF proporcionalmente ao rateio da OC
      const valorOC = parseFloat(oc.valor) || 0;
      if(valorOC > 0){
        oc.rateio.forEach(r => {
          if(r.placa === placa){
            const proporcao = (parseFloat(r.valor) || 0) / valorOC;
            total += proporcao * valorNF;
          }
        });
      }
    } else {
      // OC SIMPLES: prioriza a placa registrada na OC; fallback para nf.dest
      const placaEfetiva = (oc && oc.placas && oc.placas !== '-') ? oc.placas : (nf.dest || '');
      if(placaEfetiva === placa) total += valorNF;
    }
  });
  // Títulos avulsos com placa no mês (sem NF vinculada) — usa emissão como competência
  Titulos.forEach(t => {
    if(!t.placa || t.placa !== placa) return;
    const dataRef = (t.emissao || t.venc || '');
    if(!dataRef.startsWith(prefixo)) return;
    // Evita dupla contagem — só conta títulos que não vieram de uma NF
    if(t.nf) return;
    total += parseFloat(t.valor) || 0;
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
  'marcarPago'
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
  // cancelarOC: gerencia o próprio save via confirmDelete interceptado
  // confirmarEncerrarOCSemNF: async direta com saveEntidade
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


// ======================== IMPORTADOR EXCEL — PIPAS ========================
function abrirImportadorPipa(){
  const input = document.getElementById('input-import-pipa');
  if(input){ input.value = ''; input.click(); }
}

async function importarPipaXLSX(event){
  const file = event.target.files[0];
  if(!file) return;

  toast('⏳ Lendo planilha...', 'success');

  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'arraybuffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if(!rows.length){ toast('Planilha vazia ou sem dados.', 'error'); return; }

    // Detecta colunas automaticamente (case-insensitive)
    const sample = rows[0];
    const keys = Object.keys(sample);
    const findCol = (...opts) => keys.find(k => opts.some(o => k.toLowerCase().includes(o.toLowerCase()))) || '';

    const colData      = findCol('data','date');
    const colHora      = findCol('hora','hour','time');
    const colLitros    = findCol('peso','litro','volume','qty','qtd','quantidade');
    const colPlaca     = findCol('placa','plate','veículo','veiculo');
    const colDestino   = findCol('descarga','destino','local de desc','destination','local desc');
    const colMotorista = findCol('motorista','driver','motor');

    if(!colPlaca || !colLitros){
      toast('Não foi possível identificar as colunas. Verifique o arquivo.', 'error');
      return;
    }

    let importadas = 0;
    let ignoradas  = 0;
    const novas = [];

    rows.forEach(row => {
      const placa     = String(row[colPlaca]||'').trim().toUpperCase();
      const litros    = parseFloat(row[colLitros]) || 0;
      const destino   = String(row[colDestino]||'').trim() || 'Não informado';
      const motorista = String(row[colMotorista]||'').trim() || '-';

      // Data
      let dataISO = today;
      if(colData && row[colData]){
        const d = row[colData];
        if(d instanceof Date){
          dataISO = d.toISOString().slice(0,10);
        } else if(typeof d === 'string' && d.match(/\d{4}-\d{2}-\d{2}/)){
          dataISO = d.slice(0,10);
        } else if(typeof d === 'string' && d.match(/\d{2}\/\d{2}\/\d{4}/)){
          const [dd,mm,yyyy] = d.split('/');
          dataISO = `${yyyy}-${mm}-${dd}`;
        }
      }

      // Hora
      let hora = '';
      if(colHora && row[colHora]){
        const h = row[colHora];
        if(h instanceof Date){
          hora = h.toTimeString().slice(0,5);
        } else if(typeof h === 'string'){
          hora = h.slice(0,5);
        } else if(typeof h === 'number'){
          // Excel armazena hora como fração do dia
          const totalMin = Math.round(h * 24 * 60);
          const hh = String(Math.floor(totalMin/60)).padStart(2,'0');
          const mm = String(totalMin % 60).padStart(2,'0');
          hora = `${hh}:${mm}`;
        }
      }

      if(!placa || litros <= 0){ ignoradas++; return; }

      // Verifica duplicata por data+placa+litros+hora
      const jaTem = ViagensPipa.some(v =>
        v.placa === placa &&
        v.data  === dataISO &&
        Math.abs((parseFloat(v.litros)||0) - litros) < 1 &&
        (!hora || v.hora === hora)
      );
      if(jaTem){ ignoradas++; return; }

      novas.push({
        id:        _nextPipaId++,
        data:      dataISO,
        hora:      hora,
        placa:     placa,
        litros:    litros,
        destino:   destino,
        motorista: motorista,
        importado: true
      });
      importadas++;
    });

    if(!novas.length){
      toast(`Nenhuma viagem nova encontrada. ${ignoradas} já existiam ou eram inválidas.`, 'error');
      return;
    }

    // Insere no início (mais recentes primeiro)
    ViagensPipa.unshift(...novas);

    // Persiste no Supabase
    await saveEntidade('ViagensPipa', novas);
    await saveCounters();

    renderPipas();
    toast(`✅ ${importadas} viagem(ns) importada(s)! ${ignoradas > 0 ? ignoradas + ' duplicada(s)/inválida(s) ignorada(s).' : ''}`);

  } catch(e){
    console.error('Erro importação pipa:', e);
    toast('Erro ao importar: ' + e.message, 'error');
  }

  event.target.value = '';
}

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


// ======================== BACKUP AUTOMÁTICO ========================
let _backupTimer = null;
const BACKUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

function iniciarBackupAutomatico(){
  if(_backupTimer) clearInterval(_backupTimer);
  _backupTimer = setInterval(()=>{ fazerBackupAuto(false); }, BACKUP_INTERVAL_MS);
  console.log('[BACKUP] Agendado a cada 30 minutos.');
}

async function fazerBackupAuto(manual = false){
  if(!_stateLoaded) return;
  const payload = {
    ts: new Date().toISOString(),
    Fornecedores, OCs, NFs, Titulos, Produtos, Estoque, Saidas,
    Frota, EPIEstoque, EPIEntregas, Colaboradores, Faturamentos,
    HistoricoOC, ViagensPipa
  };
  try {
    const { error } = await supa.from('tg_backups').upsert(
      [{ id: 1, data: payload, updated_at: payload.ts }], { onConflict: 'id' }
    );
    if(error) throw error;
    if(manual) toast('✅ Backup salvo no servidor com sucesso!');
    else console.log('[BACKUP AUTO] ✅ Salvo em', payload.ts);
  } catch(e){
    console.error('[BACKUP] Erro:', e.message);
    if(manual) toast('⚠️ Erro ao salvar backup: ' + e.message, 'error');
  }
}

function exportarBackupJSON(){
  const payload = {
    exportadoEm: new Date().toISOString(),
    versao: '2.0',
    Fornecedores, OCs, NFs, Titulos, Produtos, Estoque, Saidas,
    Frota, EPIEstoque, EPIEntregas, Colaboradores, Faturamentos,
    HistoricoOC, ViagensPipa
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'transgest_backup_' + today + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('📥 Backup JSON exportado!');
}

// ======================== INIT ========================

document.querySelectorAll('input[type=date]').forEach(el=>{
  if(!el.value) el.value = today;
});

populateSelects();
toggleP();
// renderAll() é chamado após o login bem-sucedido
