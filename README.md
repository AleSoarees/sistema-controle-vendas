# Sistema de Controle de Vendas

Sistema web para gestão de vendas, estoque e produtos, desenvolvido com **Google Apps Script** e **Google Sheets** como banco de dados. Criado para uso real por pequenos comerciantes, sem custo de infraestrutura, acessível por qualquer navegador.

## 🔗 Arquivos

- **Code.gs** — lógica do backend (Google Apps Script): cadastro, vendas, estoque, segurança e geração de relatórios.
- **index.html** — interface do usuário (frontend), executada como App da Web vinculado à planilha.

## ⚙️ Funcionalidades

### Cadastro e gestão de produtos
- Cadastro de produtos com nome, categoria, preço e estoque inicial
- Validação contra produtos duplicados
- Edição de nome, categoria, preço e recebimento de novos lotes de estoque
- Exclusão de produtos, preservando o histórico de vendas já registrado

### Registro de vendas
- Desconto automático do estoque ao registrar uma venda
- Confirmação antes de concluir a venda, com cálculo do valor total
- Alerta visual quando a venda deixa o estoque do produto abaixo do mínimo (5 unidades)
- Validação contra vendas com quantidade inválida ou estoque insuficiente

### Histórico e correções
- Histórico das últimas 25 vendas, com a mais recente no topo
- Filtro por produto e por período (data inicial/final)
- Exclusão de vendas registradas por engano, com devolução automática da quantidade ao estoque

### Dashboard e indicadores
- Faturamento total
- Número de vendas e de produtos cadastrados
- Quantidade de produtos com estoque baixo
- Produto mais vendido
- Resumo de quantidade vendida e valor arrecadado por produto
- Gráfico de vendas por produto, gerado automaticamente em uma aba própria da planilha ("Gráfico")

### Busca
- Campo de busca por nome ou categoria na tabela de produtos

### Segurança e auditoria
- Acesso a ações de cadastro, venda, edição e exclusão protegido por PIN (configurável via Propriedades do Script)
- Log de atividades registrando data/hora, ação, produto e detalhes de cada operação realizada no sistema
- Proteção contra duplo-clique (evita registros duplicados em ações simultâneas)

## 🗂️ Estrutura da planilha

O sistema utiliza as seguintes abas na planilha Google Sheets:

| Aba | Conteúdo |
|---|---|
| Produtos | Cadastro de produtos (ID, nome, categoria, preço, estoque) |
| Vendas | Histórico de vendas (ID, produto, quantidade, total, data) |
| Lotes | Histórico de recebimento de estoque |
| Log | Registro de todas as ações realizadas no sistema |
| Gráfico | Gerada e atualizada automaticamente pelo sistema (não editar manualmente) |

## 🚀 Como implantar

1. Crie uma planilha no Google Sheets com as abas `Produtos`, `Vendas` e `Lotes` (com os respectivos cabeçalhos).
2. Abra **Extensões → Apps Script** e cole o conteúdo de `Code.gs` e `index.html` (criando o arquivo HTML chamado `index`).
3. Configure o PIN de acesso em **Configurações do projeto → Propriedades do script** (chave `PIN`).
4. Implante como **App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Compartilhe a planilha com acesso **"Qualquer pessoa com o link" → Leitor**, para que o app funcione corretamente para usuários logados em suas próprias contas Google.

## 🛠️ Tecnologias utilizadas

- Google Apps Script (JavaScript no backend)
- Google Sheets (banco de dados)
- HTML, CSS e JavaScript (frontend)
- Google Charts Service (gráfico nativo na planilha)

## 📌 Observações

- A aba "Gráfico" é recriada automaticamente a cada venda registrada ou excluída — não deve ser editada manualmente.
- O PIN protege contra alterações indevidas, mas não substitui um sistema de login individual por usuário.
