// ── OPERAÇÕES: Estoque, Saídas, Frota, EPI ──
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
  // CRLV
  if($('f-fr-crlv-file')) $('f-fr-crlv-file').value='';
  if($('fr-crlv-atual')){
    $('fr-crlv-atual').style.display = o.crlv ? 'block' : 'none';
    $('fr-crlv-atual').innerHTML = o.crlv
      ? `📄 CRLV atual: <a href="${o.crlv}" target="_blank" rel="noopener">abrir arquivo</a><br><span style="color:var(--text3)">Escolha outro arquivo somente se quiser substituir.</span>`
      : '';
  }
  $('modal-frota-title').textContent='Editar Caminhão';
  $('btn-save-frota').textContent='💾 Atualizar';
  $('modal-frota').classList.add('open');
}
async function salvarFrota(){
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

  // Upload CRLV
  const btn = $('btn-save-frota');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Salvando...'; }
  const crlvNovo = await uploadCRLV('f-fr-crlv-file');
  if(crlvNovo === null){
    if(btn){ btn.disabled=false; btn.textContent=editing.frota?'💾 Atualizar':'💾 Salvar'; }
    return;
  }

  if(editing.frota){
    const i=Frota.findIndex(x=>x.id===editing.frota);
    obj.gasto=Frota[i].gasto||0;
    obj.crlv = crlvNovo || Frota[i].crlv || '';
    Frota[i]={...Frota[i],...obj};
    editing.frota=null; toast('Caminhão atualizado!');
  } else {
    obj.id=newId('frota'); obj.crlv=crlvNovo||''; Frota.push(obj); toast('Caminhão cadastrado!');
  }
  if(btn){ btn.disabled=false; btn.textContent='💾 Salvar'; }
  closeModal('modal-frota');
  $('modal-frota-title').textContent='Cadastrar Caminhão';
  $('btn-save-frota').textContent='💾 Salvar';
  ['f-fr-tipo','f-fr-cor','f-fr-anomodelo','f-fr-chassi','f-fr-renavam','f-fr-status',
   'f-fr-vlicen'].forEach(id=>{
    const el=$(id); if(el) el.value=id==='f-fr-tipo'?'Caminhão':id==='f-fr-status'?'Ativo':'';
  });
  if($('f-fr-crlv-file')) $('f-fr-crlv-file').value='';
  if($('fr-crlv-atual')){ $('fr-crlv-atual').style.display='none'; $('fr-crlv-atual').innerHTML=''; }
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

