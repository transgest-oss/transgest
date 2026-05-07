// ── RELATÓRIOS: Financeiro, Colaboradores, Usuários, Export XLSX/PDF ──
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

