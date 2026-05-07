// ── SUPABASE: Tabelas, auditoria, login/logout, persistência, avulso, pag.rápido ──
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
  iniciarBackupAutomatico();
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

