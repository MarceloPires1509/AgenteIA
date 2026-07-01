document.addEventListener('DOMContentLoaded', () => {
    const btnAnalyze = document.getElementById('btn-analyze');
    const glpiInput = document.getElementById('glpi-input');
    const outputBoard = document.getElementById('output-board');
    const btnCopy = document.getElementById('btn-copy');

    // Agents UI Elements
    const agents = {
        po: { card: document.getElementById('agent-po'), status: document.querySelector('#agent-po .status') },
        tech: { card: document.getElementById('agent-tech'), status: document.querySelector('#agent-tech .status') },
        qa: { card: document.getElementById('agent-qa'), status: document.querySelector('#agent-qa .status') }
    };

    const setAgentState = (agent, state, text) => {
        agent.card.classList.remove('active');
        agent.status.className = `status ${state}`;
        agent.status.innerText = text;
        
        if (state === 'working') {
            agent.card.classList.add('active');
        }
    };

    const resetAgents = () => {
        Object.values(agents).forEach(agent => setAgentState(agent, 'idle', 'Aguardando...'));
    };

    const mockUserStory = `
# User Story: Resolução de Bug na Exportação de PDF (GLPI)

> [!NOTE]
> Gerado automaticamente via análise da Squad de Agentes a partir do chamado GLPI.

## Descrição da Funcionalidade

**Como um** Usuário do sistema,
**eu quero** conseguir exportar o boletim do aluno em formato PDF sem erros,
**para que** eu possa entregar o documento impresso aos responsáveis ou arquivá-lo digitalmente.

---

## 🟢 Critérios de Aceite de Negócio (PO)
* **Dado** que estou na tela do boletim do aluno,
* **Quando** clico no botão "Exportar PDF",
* **Então** o sistema deve gerar e baixar o arquivo corretamente, sem retornar a tela de Erro 500.

---

## 🔴 Critérios de Aceite de Exceção (QA)
* **Dado** que o serviço de geração de PDF (backend) sofra timeout devido ao volume de dados,
* **Quando** a geração falhar,
* **Então** o sistema deve exibir uma mensagem amigável ao usuário ("Falha ao gerar o PDF. Tente novamente em instantes.") em vez de estourar um Erro 500 no navegador.
* **E** o log de erro no servidor deve capturar o stacktrace original para o suporte nível 2.

---

## 🛠️ Apontamentos Técnicos (Tech Lead)
* **Causa Raiz:** O erro 500 relatado geralmente ocorre devido ao esgotamento de memória no servidor Node.js/PHP ao processar relatórios muito grandes (turmas inteiras), ou a biblioteca de renderização (ex: Puppeteer/wkhtmltopdf) sendo interrompida pelo SO.
* **Resolução Proposta:** 
  1. Adicionar logs detalhados ao bloco \`try/catch\` da rota de exportação.
  2. Implementar \`timeout\` seguro na requisição (ex: 60s max).
  3. Sugestão arquitetural: Alterar o download direto para um modelo assíncrono (o sistema envia o PDF para o painel de notificações do usuário quando o processamento em *background* terminar).
`;

    btnAnalyze.addEventListener('click', async () => {
        const text = glpiInput.value.trim();
        if (!text) {
            alert('Por favor, cole os dados do chamado GLPI primeiro.');
            return;
        }

        // Lock UI
        btnAnalyze.disabled = true;
        btnAnalyze.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Orquestrando Agentes...';
        btnCopy.disabled = true;
        outputBoard.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-microchip fa-spin"></i>
                <p>Processando pipeline de IA...</p>
            </div>
        `;
        resetAgents();

        // Simulate Pipeline
        // Step 1: PO starts analyzing
        setAgentState(agents.po, 'working', 'Analisando Negócio...');
        await sleep(2500);
        setAgentState(agents.po, 'done', 'Critérios Definidos');

        // Step 2: Tech and QA run in parallel
        setAgentState(agents.tech, 'working', 'Avaliando Arquitetura...');
        setAgentState(agents.qa, 'working', 'Levantando Falhas...');
        await sleep(3000);
        
        setAgentState(agents.qa, 'done', 'Cenários Prontos');
        await sleep(1000); // Tech lead takes a bit longer
        setAgentState(agents.tech, 'done', 'Revisão Técnica Concluída');

        // Step 3: Render Result
        btnAnalyze.innerHTML = '<i class="fa-solid fa-bolt"></i> Acionar Squad de Agentes';
        btnAnalyze.disabled = false;
        btnCopy.disabled = false;

        // If marked.js is loaded, parse markdown
        if (typeof marked !== 'undefined') {
            outputBoard.innerHTML = marked.parse(mockUserStory);
        } else {
            // Fallback
            outputBoard.innerHTML = \`<pre style="white-space: pre-wrap; font-family: inherit;">\${mockUserStory}</pre>\`;
        }
    });

    btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(mockUserStory).then(() => {
            const originalText = btnCopy.innerHTML;
            btnCopy.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
            setTimeout(() => { btnCopy.innerHTML = originalText; }, 2000);
        });
    });

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});
