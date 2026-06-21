function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}


// ===== PIN / SEGURANÇA =====

function verificarPin(pin){
  var senha = PropertiesService.getScriptProperties().getProperty('PIN');
  if(!senha){
    return true; // PIN não configurado ainda = acesso liberado
  }
  return pin === senha;
}


// ===== LOG DE ATIVIDADES =====

function registrarLog(acao, produto, detalhes){
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var log = planilha.getSheetByName("Log");

  if(!log){
    log = planilha.insertSheet("Log");
    log.appendRow(["Data","Ação","Produto","Detalhes"]);
  }

  log.appendRow([new Date(), acao, produto, detalhes]);
}

function listarLog(){
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var log = planilha.getSheetByName("Log");

  if(!log){
    return [];
  }

  var dados = log.getDataRange().getValues();

  if(dados.length <= 1){
    return [];
  }

  dados.shift();

  dados.forEach(function(row){
    if(row[0] instanceof Date){
      row[0] = row[0].toISOString();
    }
  });

  dados.reverse();

  return dados.slice(0,15);
}


// ===== GRÁFICO (aba separada na planilha) =====

function atualizarGraficoVendas(){

  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var grafico = planilha.getSheetByName("Gráfico");

  if(!grafico){
    grafico = planilha.insertSheet("Gráfico");
  } else {
    var graficosExistentes = grafico.getCharts();
    graficosExistentes.forEach(function(c){
      grafico.removeChart(c);
    });
    grafico.clear();
  }

  var resumo = resumoProdutosVendidos();

  grafico.appendRow(["Produto","Quantidade Vendida","Valor Arrecadado"]);

  for(var produto in resumo){
    grafico.appendRow([produto, resumo[produto].quantidade, resumo[produto].valor]);
  }

  var ultimaLinha = grafico.getLastRow();

  if(ultimaLinha > 1){

    var range = grafico.getRange(1,1,ultimaLinha,3);

    var chart = grafico.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(range)
      .setPosition(2, 5, 0, 0)
      .setOption('title', 'Vendas por Produto (Valor Arrecadado)')
      .setOption('legend', {position:'none'})
      .build();

    grafico.insertChart(chart);

  }

}


// ===== CADASTRAR PRODUTO =====

function adicionarProduto(produto,categoria,preco,estoque,pin){

  if(!verificarPin(pin)){
    return "Erro: PIN incorreto.";
  }

  if(!produto || produto.toString().trim()===""){
    return "Erro: informe o nome do produto.";
  }

  if(!categoria || categoria.toString().trim()===""){
    return "Erro: informe a categoria.";
  }

  preco = Number(preco);
  estoque = Number(estoque);

  if(isNaN(preco) || preco <= 0){
    return "Erro: preço inválido.";
  }

  if(isNaN(estoque) || estoque < 0){
    return "Erro: estoque inválido.";
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try{

    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var produtos = planilha.getSheetByName("Produtos");
    var dadosExistentes = produtos.getDataRange().getValues();

    var nomeNormalizado = produto.toString().trim().toLowerCase();

    for(var k=1;k<dadosExistentes.length;k++){
      if(dadosExistentes[k][1] && dadosExistentes[k][1].toString().trim().toLowerCase() === nomeNormalizado){
        return "Erro: já existe um produto com esse nome.";
      }
    }

    var id = produtos.getLastRow();

    produtos.appendRow([id, produto, categoria, preco, estoque]);

    registrarLog("Cadastro de produto", produto, "Categoria: "+categoria+" | Preço: R$ "+preco.toFixed(2)+" | Estoque inicial: "+estoque);

    return "Produto cadastrado";

  } finally {
    lock.releaseLock();
  }

}


// ===== LISTAR PRODUTOS =====

function listarProdutos(){

  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var produtos = planilha.getSheetByName("Produtos");
  var dados = produtos.getDataRange().getValues();

  dados.shift();

  return dados;

}


// ===== EXCLUIR PRODUTO =====

function excluirProduto(produto, pin){

  if(!verificarPin(pin)){
    return "Erro: PIN incorreto.";
  }

  if(!produto){
    return "Erro: produto inválido.";
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try{

    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var produtos = planilha.getSheetByName("Produtos");
    var dados = produtos.getDataRange().getValues();

    for(var i=1;i<dados.length;i++){

      if(dados[i][1] === produto){

        produtos.deleteRow(i+1);

        registrarLog("Exclusão de produto", produto, "Produto removido do cadastro (histórico de vendas é mantido).");

        return "Produto excluído.";

      }

    }

    return "Erro: produto não encontrado.";

  } finally {
    lock.releaseLock();
  }

}


// ===== ATUALIZAR PRODUTO (estoque, preço, nome, categoria) =====

function atualizarProduto(produtoAtual, novoNome, novaCategoria, preco, quantidade, lote, pin){

  if(!verificarPin(pin)){
    return "Erro: PIN incorreto.";
  }

  if(!produtoAtual || produtoAtual === "Selecione"){
    return "Erro: selecione um produto.";
  }

  quantidade = Number(quantidade);

  if(isNaN(quantidade) || quantidade < 0){
    return "Erro: quantidade inválida.";
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try{

    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var produtos = planilha.getSheetByName("Produtos");
    var lotes = planilha.getSheetByName("Lotes");
    var vendas = planilha.getSheetByName("Vendas");
    var dados = produtos.getDataRange().getValues();

    for(var i=1;i<dados.length;i++){

      if(dados[i][1]==produtoAtual){

        var categoriaAtual = dados[i][2];
        var precoAtual = Number(dados[i][3]);
        var estoqueAtual = Number(dados[i][4]);

        var nomeFinal =
          (novoNome && novoNome.toString().trim()!=="") ?
          novoNome.toString().trim() :
          produtoAtual;

        // valida duplicidade se o nome estiver mudando
        if(nomeFinal !== produtoAtual){
          var nomeNormalizado = nomeFinal.toLowerCase();
          for(var k=1;k<dados.length;k++){
            if(k!==i && dados[k][1] && dados[k][1].toString().trim().toLowerCase() === nomeNormalizado){
              return "Erro: já existe outro produto com esse nome.";
            }
          }
        }

        var categoriaFinal =
          (novaCategoria && novaCategoria.toString().trim()!=="") ?
          novaCategoria.toString().trim() :
          categoriaAtual;

        var novoPreco =
          (preco==="" || preco===null || preco===undefined) ?
          precoAtual :
          Number(preco);

        var novoEstoque = estoqueAtual + quantidade;

        produtos.getRange(i+1,2).setValue(nomeFinal);
        produtos.getRange(i+1,3).setValue(categoriaFinal);
        produtos.getRange(i+1,4).setValue(novoPreco);
        produtos.getRange(i+1,5).setValue(novoEstoque);

        // mantém histórico consistente se o nome do produto mudou
        if(nomeFinal !== produtoAtual){

          var dadosV = vendas.getDataRange().getValues();
          for(var v=1;v<dadosV.length;v++){
            if(dadosV[v][1]===produtoAtual){
              vendas.getRange(v+1,2).setValue(nomeFinal);
            }
          }

          var dadosL = lotes.getDataRange().getValues();
          for(var l=1;l<dadosL.length;l++){
            if(dadosL[l][1]===produtoAtual){
              lotes.getRange(l+1,2).setValue(nomeFinal);
            }
          }

        }

        if(quantidade > 0){
          lotes.appendRow([new Date(), nomeFinal, quantidade, lote]);
        }

        registrarLog(
          "Atualização de produto",
          nomeFinal,
          "Nome anterior: "+produtoAtual+" | Categoria: "+categoriaFinal+" | Preço: R$ "+novoPreco.toFixed(2)+" | Estoque recebido: "+quantidade+" | Lote: "+lote
        );

        return "Produto atualizado";

      }

    }

    return "Erro: produto não encontrado.";

  } finally {
    lock.releaseLock();
  }

}


// ===== REGISTRAR VENDA =====

function registrarVenda(produto,quantidade,pin){

  if(!verificarPin(pin)){
    return "Erro: PIN incorreto.";
  }

  if(!produto || produto === "Selecione"){
    return "Erro: selecione um produto.";
  }

  quantidade = Number(quantidade);

  if(isNaN(quantidade) || quantidade <= 0){
    return "Erro: quantidade inválida.";
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try{

    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var produtos = planilha.getSheetByName("Produtos");
    var vendas = planilha.getSheetByName("Vendas");
    var dados = produtos.getDataRange().getValues();

    for(var i=1;i<dados.length;i++){

      if(dados[i][1]==produto){

        var preco = Number(dados[i][3]);
        var estoque = Number(dados[i][4]);

        if(estoque >= quantidade){

          var total = preco * quantidade;
          var novoId = vendas.getLastRow();

          produtos.getRange(i+1,5).setValue(estoque - quantidade);

          vendas.appendRow([novoId, produto, quantidade, total, new Date()]);

          registrarLog("Venda", produto, "Quantidade: "+quantidade+" | Total: R$ "+total.toFixed(2));

          atualizarGraficoVendas();

          return "Venda registrada";

        }

        return "Erro: estoque insuficiente.";

      }

    }

    return "Erro: produto não encontrado.";

  } finally {
    lock.releaseLock();
  }

}


// ===== LISTAR VENDAS =====

function listarVendas(){

  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var vendas = planilha.getSheetByName("Vendas");
  var dados = vendas.getDataRange().getValues();

  dados.shift();

  dados.forEach(function(row){
    if(row[4] instanceof Date){
      row[4] = row[4].toISOString();
    }
  });

  return dados;

}


// ===== EXCLUIR VENDA =====

function excluirVenda(idVenda, pin){

  if(!verificarPin(pin)){
    return "Erro: PIN incorreto.";
  }

  idVenda = Number(idVenda);

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try{

    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var vendas = planilha.getSheetByName("Vendas");
    var produtos = planilha.getSheetByName("Produtos");

    var dadosV = vendas.getDataRange().getValues();

    for(var i=1;i<dadosV.length;i++){

      if(Number(dadosV[i][0]) === idVenda){

        var produto = dadosV[i][1];
        var quantidade = Number(dadosV[i][2]);

        vendas.deleteRow(i+1);

        var dadosP = produtos.getDataRange().getValues();

        for(var j=1;j<dadosP.length;j++){

          if(dadosP[j][1] === produto){

            var estoqueAtual = Number(dadosP[j][4]);
            produtos.getRange(j+1,5).setValue(estoqueAtual + quantidade);
            break;

          }

        }

        registrarLog("Exclusão de venda", produto, "ID Venda: "+idVenda+" | Quantidade devolvida ao estoque: "+quantidade);

        atualizarGraficoVendas();

        return "Venda excluída e estoque devolvido.";

      }

    }

    return "Erro: venda não encontrada.";

  } finally {
    lock.releaseLock();
  }

}


// ===== RESUMO POR PRODUTO =====

function resumoProdutosVendidos(){

  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var vendas = planilha.getSheetByName("Vendas");
  var dados = vendas.getDataRange().getValues();

  var resumo = {};

  for(var i=1;i<dados.length;i++){

    var produto = dados[i][1];
    var quantidade = Number(dados[i][2]);
    var valor = Number(dados[i][3]);

    if(!resumo[produto]){
      resumo[produto] = { quantidade:0, valor:0 };
    }

    resumo[produto].quantidade += quantidade;
    resumo[produto].valor += valor;

  }

  return resumo;

}


// ===== RELATÓRIO =====

function gerarRelatorio(){

  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var vendas = planilha.getSheetByName("Vendas");
  var produtos = planilha.getSheetByName("Produtos");

  var dadosV = vendas.getDataRange().getValues();
  var dadosP = produtos.getDataRange().getValues();

  var faturamento = 0;
  var estoqueBaixo = 0;
  var mapa = {};

  for(var i=1;i<dadosV.length;i++){

    faturamento += Number(dadosV[i][3]);

    var produto = dadosV[i][1];

    if(!mapa[produto]){
      mapa[produto] = 0;
    }

    mapa[produto]++;

  }

  for(var j=1;j<dadosP.length;j++){
    if(dadosP[j][4] < 5){
      estoqueBaixo++;
    }
  }

  var maior = 0;
  var mais = "Nenhum";

  for(var p in mapa){
    if(mapa[p] > maior){
      maior = mapa[p];
      mais = p;
    }
  }

  return{
    faturamento: faturamento,
    vendas: dadosV.length-1,
    produtos: dadosP.length-1,
    estoqueBaixo: estoqueBaixo,
    produtoMais: mais
  };

}
