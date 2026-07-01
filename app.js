document.addEventListener('DOMContentLoaded', () => {
    const btnAnalyze = document.getElementById('btn-analyze');
    const glpiInput = document.getElementById('glpi-input');
    const outputBoard = document.getElementById('output-board');
    const btnCopy = document.getElementById('btn-copy');
    const apiKeyInput = document.getElementById('api-key-input');

    // Load saved API key on startup
    const savedApiKey = localStorage.getItem('agileSquadApiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

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

    let generatedUserStory = '';

    btnAnalyze.addEventListener('click', async () => {
        const text = glpiInput.value.trim();
        const apiKey = apiKeyInput.value.trim();

        if (!text) {
            outputBoard.innerHTML = `
                <div class="empty-state" style="color: #fc8181;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Por favor, cole os dados do chamado GLPI no campo texto.</p>
                </div>`;
            return;
        }

        if (!apiKey) {
            outputBoard.innerHTML = `
                <div class="empty-state" style="color: #fc8181;">
                    <i class="fa-solid fa-key"></i>
                    <p>Faltando Chave de API!</p>
                    <small>Você precisa colar sua Gemini API Key no menu lateral esquerdo para usar a IA.</small>
                </div>`;
            return;
        }

        // Save API key for future visits
        localStorage.setItem('agileSquadApiKey', apiKey);

        // Lock UI
        btnAnalyze.disabled = true;
        btnAnalyze.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conectando à IA...';
        btnCopy.disabled = true;
        outputBoard.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-microchip fa-spin"></i>
                <p>Processando inteligência artificial...</p>
            </div>
        `;
        resetAgents();

        // Simulate parallel start in UI
        setAgentState(agents.po, 'working', 'Analisando Negócio...');
        setAgentState(agents.tech, 'working', 'Avaliando Arquitetura...');
        setAgentState(agents.qa, 'working', 'Levantando Falhas...');

        try {
            // Call Gemini API REST
            const prompt = `Atue como uma Squad Ágil completa contendo 3 especialistas: um Product Owner Sênior, um Engenheiro QA Sênior e um Arquiteto Tech Lead.
Sua missão é analisar o chamado de suporte/requisito abaixo e transformá-lo em uma User Story completa.

CHAMADO GLPI:
"${text}"

FORMATO DA SAÍDA ESPERADA EM MARKDOWN:
# User Story: [Título Curto]

## 📖 Descrição da Funcionalidade
[No formato: Como um... eu quero... para que...]

---
## 🟢 Critérios de Aceite de Negócio (PO)
[Lista de BDD: Dado que... Quando... Então...]

---
## 🔴 Critérios de Aceite de Exceção e Testes (QA)
[Lista de casos extremos, falhas e sad paths em BDD]

---
## 🛠️ Apontamentos Técnicos (Tech Lead)
[Avaliação de arquitetura, banco de dados, logs e segurança]`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || 'Erro na API do Gemini');
            }

            const data = await response.json();
            generatedUserStory = data.candidates[0].content.parts[0].text;

            // Mark agents as done in UI to simulate workflow completion
            setAgentState(agents.po, 'done', 'Critérios Definidos');
            setAgentState(agents.qa, 'done', 'Cenários Prontos');
            setAgentState(agents.tech, 'done', 'Revisão Técnica Concluída');

            // Render Result
            if (typeof marked !== 'undefined') {
                outputBoard.innerHTML = marked.parse(generatedUserStory);
            } else {
                outputBoard.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${generatedUserStory}</pre>`;
            }

        } catch (error) {
            console.error(error);
            outputBoard.innerHTML = `
                <div class="empty-state" style="color: #fc8181;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Falha ao conectar com a IA.</p>
                    <small style="opacity: 0.8;">Verifique se sua API Key é válida.<br>${error.message}</small>
                </div>
            `;
            resetAgents();
        } finally {
            btnAnalyze.innerHTML = '<i class="fa-solid fa-bolt"></i> Acionar Squad de Agentes';
            btnAnalyze.disabled = false;
            btnCopy.disabled = false;
        }
    });

    btnCopy.addEventListener('click', () => {
        if (!generatedUserStory) return;
        navigator.clipboard.writeText(generatedUserStory).then(() => {
            const originalText = btnCopy.innerHTML;
            btnCopy.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
            setTimeout(() => { btnCopy.innerHTML = originalText; }, 2000);
        });
    });
});
