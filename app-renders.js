// ── RENDERS: Dashboard, OC, NF, Fin, Pendentes, paginação, tipos OC ──
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

// ======================== PAGINAÇÃO ========================
const _paginas = {};
const PAGE_SIZE = 50;

function getPagina(key){ return _paginas[key] || 1; }
function setPagina(key, p){ _paginas[key] = p; }

function paginar(lista, key){
  const total = lista.length;
  const pagAtual = getPagina(key);
  const totalPags = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pag = Math.min(pagAtual, totalPags);
  _paginas[key] = pag;
  const inicio = (pag - 1) * PAGE_SIZE;
  return { itens: lista.slice(inicio, inicio + PAGE_SIZE), pag, totalPags, total };
}

function renderPaginacao(containerId, key, total, pag, totalPags, onMudanca){
  const el = $(containerId);
  if(!el) return;
  if(totalPags <= 1 && total <= PAGE_SIZE){ el.innerHTML = ''; return; }
  const inicio = (pag - 1) * PAGE_SIZE + 1;
  const fim = Math.min(pag * PAGE_SIZE, total);
  const btnBase = 'padding:4px 10px;font-size:11px;border-radius:6px;border:1px solid var(--border2);background:#F0F4F8;cursor:pointer;font-family:var(--font)';
  const btnActive = 'padding:4px 10px;font-size:11px;border-radius:6px;border:1px solid var(--accent);background:rgba(0,149,122,.12);color:var(--accent);font-weight:600;cursor:pointer;font-family:var(--font)';
  const btnDisabled = 'padding:4px 10px;font-size:11px;border-radius:6px;border:1px solid var(--border2);background:#F0F4F8;opacity:.4;cursor:default;font-family:var(--font)';
  let nums = '';
  const range = 2;
  for(let i = 1; i <= totalPags; i++){
    if(i === 1 || i === totalPags || (i >= pag - range && i <= pag + range)){
      nums += `<button style="${i === pag ? btnActive : btnBase}" onclick="${onMudanca}(${i})">${i}</button>`;
    } else if(i === pag - range - 1 || i === pag + range + 1){
      nums += `<span style="padding:0 4px;color:var(--text3)">…</span>`;
    }
  }
  el.innerHTML = `<div style="display:flex;align-items:center;gap:6px;padding:10px 0;flex-wrap:wrap">
    <span style="font-size:11px;color:var(--text3);margin-right:4px">${inicio}–${fim} de ${total}</span>
    <button style="${pag<=1?btnDisabled:btnBase}" onclick="${onMudanca}(${pag-1})" ${pag<=1?'disabled':''}>‹ Anterior</button>
    ${nums}
    <button style="${pag>=totalPags?btnDisabled:btnBase}" onclick="${onMudanca}(${pag+1})" ${pag>=totalPags?'disabled':''}>Próximo ›</button>
  </div>`;
}

function mudarPaginaOC(p){ setPagina('oc', p); renderOC(); }
function mudarPaginaFin(p){ setPagina('fin', p); renderFin(); }
function mudarPaginaNF(p){ setPagina('nf', p); renderNF(); }

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
  const ocsP=ocsAtivas.filter(o=>(o.nf==='Pendente'||o.nf==='Parcialmente Recebida') && o.status!=='Encerrada s/ NF');

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
  const ocsPendentesNF = OCs.filter(o => o.status!=='Cancelada' && o.status!=='Encerrada s/ NF' && o.nf !== 'Recebida' && o.nf !== 'Sem NF');

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
  ['todas','ativas','canceladas','encerradas','sem-nf'].forEach(f=>{
    const el=$('oc-filter-'+f);
    if(el) el.classList.toggle('on', filtroOCAtual===f);
  });
  renderOC();
}

function badgeStatusOC(oc){
  if(oc.status === 'Cancelada')        return '<span class="oc-status-card cancelada">🚫 Cancelada</span>';
  if(oc.status === 'Encerrada s/ NF')  return '<span class="oc-status-card encerrada-sem-nf">⚠️ Enc. s/ NF</span>';
  return '<span class="oc-status-card ativa">● Ativa</span>';
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
  if(filtroOCAtual==='ativas')     lista = lista.filter(o=>o.status!=='Cancelada' && o.status!=='Encerrada s/ NF');
  if(filtroOCAtual==='canceladas') lista = lista.filter(o=>o.status==='Cancelada');
  if(filtroOCAtual==='encerradas' || filtroOCAtual==='sem-nf') lista = lista.filter(o=>o.status==='Encerrada s/ NF');

  // Filtros avançados da barra de pesquisa
  const ocFiltroForn  = ($('oc-busca-forn')?.value||'').toLowerCase();
  const ocFiltroPlaca = ($('oc-busca-placa')?.value||'').toLowerCase();
  const ocFiltroCat   = $('oc-busca-cat')?.value||'';
  const ocFiltroNF    = $('oc-busca-nf')?.value||'';
  const ocFiltroDe    = $('oc-busca-de')?.value||'';
  const ocFiltroAte   = $('oc-busca-ate')?.value||'';
  if(ocFiltroForn)  lista = lista.filter(o=>(o.forn||'').toLowerCase().includes(ocFiltroForn));
  if(ocFiltroPlaca) lista = lista.filter(o=>(o.placas||'').toLowerCase().includes(ocFiltroPlaca));
  if(ocFiltroCat)   lista = lista.filter(o=>(o.categoria||'')=== ocFiltroCat);
  if(ocFiltroNF)    lista = lista.filter(o=>(o.nf||'')=== ocFiltroNF);
  if(ocFiltroDe)    lista = lista.filter(o=>o.data >= ocFiltroDe);
  if(ocFiltroAte)   lista = lista.filter(o=>o.data <= ocFiltroAte);

  const vazio = filtroOCAtual==='ativas'     ? 'Nenhuma OC ativa encontrada'
    : filtroOCAtual==='canceladas'           ? 'Nenhuma OC cancelada encontrada'
    : (filtroOCAtual==='encerradas'||filtroOCAtual==='sem-nf') ? 'Nenhuma OC encerrada sem NF encontrada'
    : 'Nenhuma OC cadastrada';

  const _ocPag = paginar(lista, 'oc');
  lista = _ocPag.itens;
  renderPaginacao('oc-paginacao', 'oc', _ocPag.total, _ocPag.pag, _ocPag.totalPags, 'mudarPaginaOC');
  $('tb-oc').innerHTML=lista.length?lista.map(o=>{
    const cancelada = o.status === 'Cancelada';
    const rBadge = o.isRateio ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(167,139,250,.14);color:var(--purple);border:1px solid rgba(167,139,250,.25);margin-left:4px">🔀 ${o.rateio.length} caminhões</span>` : '';
    const motivo = cancelada && o.motivoCancelamento ? `<div class="oc-motivo">Motivo: ${o.motivoCancelamento}</div>` : '';
    const num = `<div class="oc-num-wrap"><span>${o.num}</span>${cancelada?'<span class="oc-cancel-tag">Cancelada</span>':''}</div>`;
    const encerradaSemNF = o.status === 'Encerrada s/ NF';
    const semNFBtn = (!cancelada && !encerradaSemNF && o.nf !== 'Recebida')
      ? `<button class="btn btn-amber btn-sm" onclick="abrirEncerrarOCSemNF(${o.id})" title="Encerrar sem NF">⚠️ s/ NF</button>`
      : '';
    const botoes = cancelada
      ? `<button class="btn btn-secondary btn-sm" onclick="gerarPDFOC(${o.id})">📄 PDF</button><button class="btn btn-muted btn-sm" onclick="verHistoricoOC(${o.id})">🕘 Histórico</button>`
      : encerradaSemNF
        ? `<button class="btn btn-secondary btn-sm" onclick="gerarPDFOC(${o.id})">📄 PDF</button><button class="btn btn-muted btn-sm" onclick="verHistoricoOC(${o.id})">🕘 Histórico</button>`
        : `<button class="btn btn-secondary btn-sm" onclick="gerarPDFOC(${o.id})">📄 PDF</button><button class="btn btn-edit btn-sm" onclick="editarOC(${o.id})">✏️</button>${semNFBtn}<button class="btn btn-amber btn-sm" onclick="cancelarOC(${o.id})">🚫 Cancelar</button><button class="btn btn-muted btn-sm" onclick="verHistoricoOC(${o.id})">🕘</button>`;
    const trClass = cancelada ? 'tr-cancelada' : encerradaSemNF ? 'tr-encerrada-sem-nf' : '';
    return `<tr class="${trClass}" data-status="${cancelada?'cancelada':encerradaSemNF?'encerrada':'ativa'}">
    <td class="mono" style="color:var(--accent2);font-size:11px">${num}</td>
    <td style="font-size:11px">${formatarDataBR(o.data)}</td>
    <td style="max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${o.forn}">${o.forn}${motivo}</td>
    <td class="mono" style="font-size:11px">${o.placas}${rBadge}</td>
    <td>${chip(o.tipo,'cgr')}</td>
    <td class="mono">${fmt(o.valor)}</td>
    <td>${badgeStatusOC(o)}</td>
    <td>${chipS(cancelada ? 'Cancelada' : o.nf)}</td>
    <td><div class="action-btns">${botoes}</div></td>
  </tr>`;
  }).join(''):`<tr><td colspan="9" class="empty">${vazio}</td></tr>`;
}

function renderNF(){
  $('nf-count').textContent=NFs.length;
  const _nfPag = paginar(NFs, 'nf');
  renderPaginacao('nf-paginacao', 'nf', _nfPag.total, _nfPag.pag, _nfPag.totalPags, 'mudarPaginaNF');
  $('tb-nf').innerHTML=_nfPag.itens.length?_nfPag.itens.map(n=>{
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
  if($('fin-filtro-sem-nf')) $('fin-filtro-sem-nf').checked=false;
  finFiltroChanged();
}
function limparFiltrosOC(){
  ['oc-busca-forn','oc-busca-placa'].forEach(id=>{const el=$(id);if(el)el.value='';});
  ['oc-busca-cat','oc-busca-nf'].forEach(id=>{const el=$(id);if(el)el.value='';});
  ['oc-busca-de','oc-busca-ate'].forEach(id=>{const el=$(id);if(el)el.value='';});
  renderOC();
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
  const somenteSemNF = $('fin-filtro-sem-nf')?.checked || false;
  return Titulos.filter(t=>{
    const v=parseISODateLocal(t.venc);
    if(status && t.status!==status) return false;
    if(forn && t.forn!==forn) return false;
    if(placa && t.placa!==placa) return false;
    if(somenteSemNF && !t.semNF) return false;
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
  const _listaFin = [...lista].sort((a,b)=>parseISODateLocal(a.venc)-parseISODateLocal(b.venc));
  const _finPag = paginar(_listaFin, 'fin');
  renderPaginacao('fin-paginacao', 'fin', _finPag.total, _finPag.pag, _finPag.totalPags, 'mudarPaginaFin');
  $('tb-fin').innerHTML=_finPag.itens.length?_finPag.itens.map(t=>{
    const d=diasAte(t.venc);
    const vencInfo=t.status==='Pendente' ? (d<0?`<span style="color:var(--red);font-size:10px">${Math.abs(d)}d atraso</span>`:d===0?`<span style="color:var(--red);font-size:10px">vence hoje</span>`:d<=7?`<span style="color:var(--amber);font-size:10px">em ${d}d</span>`:`<span style="color:var(--text3);font-size:10px">em ${d}d</span>`) : `<span style="color:var(--accent);font-size:10px">pago</span>`;
    const pgBtn=t.status==='Pendente'
      ?`<button class="btn btn-save btn-sm" onclick="marcarPago(${t.id})" style="font-size:10px">✓ Pagar</button>`
      :`<span style="font-size:11px;color:var(--accent)">✓ Quitado</span>`;
    const chk = t.status==='Pendente'
      ? `<input type="checkbox" class="fin-chk" data-id="${t.id}" data-valor="${parseFloat(t.valor)||0}" onchange="atualizarSelecaoFin()" style="accent-color:var(--accent2)">`
      : '';
    return `<tr>
      <td style="text-align:center">${chk}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${t.forn}">${t.forn}${t.semNF && t.ocNum ? `<br><span style="font-size:10px;background:rgba(245,166,35,.14);color:var(--amber);border:1px solid rgba(245,166,35,.3);border-radius:6px;padding:1px 6px;font-weight:600;cursor:pointer" onclick="setFiltroOC('encerradas');showScreen('oc',null)" title="Ver OC de origem">📋 OC-${t.ocNum}</span>` : ''}</td>
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
  }).join(''):'<tr><td colspan="12" class="empty">Nenhum título encontrado com esses filtros.</td></tr>';
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
    <td style="font-size:11px">${formatarDataBR(s.data)}</td>
    <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.peca}</td>
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
  const frotaOrdenada=[...Frota].sort((a,b)=>(a.placa||'').localeCompare(b.placa||'','pt-BR'));
  $('frota-cards').innerHTML=frotaOrdenada.length?frotaOrdenada.map(f=>{
    const pct=Math.min(100,Math.round((f.gasto||0)/(f.limite||1)*100));
    const cls=pct>85?'danger':pct>65?'warn':'';
    const color=pct>85?'var(--red)':pct>65?'var(--amber)':'var(--accent)';
    const chipCls=pct>85?'cr':pct>65?'ca':'cg';
    const stCls=statusMap[f.status||'Ativo']||'cg';
    const alertas=vencBadge(f.vlicen,'Licenc.');
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
        ${f.vlicen?`<div>Venc. licenc.: <span style="color:var(--text)">${formatarDataBR(f.vlicen)}</span></div>`:''}
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
    frotaOrdenada.forEach(f=>{
      function checkDoc(data,label){
        if(!data) return;
        const dt=new Date(data+'T00:00:00');
        if(dt<hoje) alertas.push(`⚠ ${f.placa}: <strong>${label} VENCIDO</strong>`);
        else if(dt<=d30) alertas.push(`⏰ ${f.placa}: ${label} vence em ${Math.ceil((dt-hoje)/864e5)} dias`);
      }
      checkDoc(f.vlicen,'Licenciamento');
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
    <td class="mono">${e.qtd}</td><td style="font-size:11px">${formatarDataBR(e.data)}</td>
    <td style="font-size:11px;color:var(--text3)"${vencCls(e.troca)}>${formatarDataBR(e.troca)||'-'}</td>
    <td>${acts(`editarEPISaida(${e.id})`,`excluirEPISaida(${e.id})`)}</td>
  </tr>`).join(''):'<tr><td colspan="6" class="empty">Sem entregas registradas</td></tr>';
}

function renderFrotaTabela(){
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const d30=new Date(hoje); d30.setDate(d30.getDate()+30);
  function vc(data){
    if(!data) return '-';
    const dt=new Date(data+'T00:00:00');
    if(dt<hoje) return `<span style="color:var(--red);font-weight:600">⚠ ${formatarDataBR(data)}</span>`;
    if(dt<=d30) return `<span style="color:var(--amber);font-weight:600">⏰ ${formatarDataBR(data)}</span>`;
    return `<span style="font-size:11px">${formatarDataBR(data)}</span>`;
  }
  const statusMap={'Ativo':'cg','Manutenção':'ca','Inativo':'cgr'};
  const tb=$('tb-frota-tabela');
  if(!tb)return;
  const frotaOrd=[...Frota].sort((a,b)=>(a.placa||'').localeCompare(b.placa||'','pt-BR'));
  tb.innerHTML=frotaOrd.length?frotaOrd.map(f=>{
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
  }).join(''):'<tr><td colspan="12" class="empty">Nenhum veículo cadastrado.</td></tr>';
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
  const pends=OCs.filter(o=>(o.nf==='Pendente'||o.nf==='Parcialmente Recebida') && o.status!=='Cancelada' && o.status!=='Encerrada s/ NF');
  $('tb-pendentes').innerHTML=pends.length?pends.map(o=>{
    const days=Math.round((new Date()-new Date(o.data))/86400000);
    const nfsLancadas = NFs.filter(n=>n.oc===o.num).length;
    const esperadas = o.nfsEsperadas || 1;
    const statusExtra = o.nf==='Parcialmente Recebida'
      ? `<br><span style="font-size:10px;color:var(--accent2)">⚡ ${nfsLancadas}/${esperadas} NFs recebidas</span>`
      : '';
    return `<tr>
      <td class="mono" style="color:var(--accent2)">${o.num}</td>
      <td style="font-size:11px">${formatarDataBR(o.data)}</td>
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

