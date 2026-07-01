document.addEventListener('DOMContentLoaded', () => {
    const btnAnalyze = document.getElementById('btn-analyze');
    const glpiInput = document.getElementById('glpi-input');
    const glpiAnswers = document.getElementById('glpi-answers');
    const outputBoard = document.getElementById('output-board');
    const btnCopy = document.getElementById('btn-copy');
    const apiKeyInput = document.getElementById('api-key-input');

    // Load saved API key on startup safely
    try {
        const savedApiKey = localStorage.getItem('agileSquadApiKey');
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
        }
    } catch (e) {
        console.warn('Local storage not available.');
    }

    // Load Knowledge Base
    let pontoidKnowledge = '';
    fetch('knowledge_base.txt')
        .then(response => response.text())
        .then(text => {
            pontoidKnowledge = text;
            console.log('Base de Conhecimento Ponto iD carregada.');
        })
        .catch(err => console.warn('Não foi possível carregar a base de conhecimento', err));

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
        const answers = glpiAnswers ? glpiAnswers.value.trim() : '';
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

        // Save API key for future visits safely
        try {
            localStorage.setItem('agileSquadApiKey', apiKey);
        } catch (e) {
            console.warn('Local storage not available.');
        }

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
            // Dynamic Model Discovery to prevent 404 errors
            let selectedModel = 'models/gemini-1.5-flash';
            try {
                const modelsResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (modelsResp.ok) {
                    const modelsData = await modelsResp.json();
                    const available = modelsData.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));
                    if (available.length > 0) {
                        // Prefer 1.5 flash, then 1.5 pro, then fallback to anything
                        const flash = available.find(m => m.name.includes('1.5-flash'));
                        const pro = available.find(m => m.name.includes('1.5-pro'));
                        selectedModel = flash ? flash.name : (pro ? pro.name : available[0].name);
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch models list, using default.', e);
            }

            // Strip "models/" prefix if present in the selectedModel name to avoid models/models/ duplication
            const finalModelName = selectedModel.replace('models/', '');

            let prompt = `Você é uma Squad Ágil profissional de alto nível especializada no sistema Ponto iD (SGE - Sistema de Gestão Escolar e PPI - Programa Primeira Infância). A Squad é composta por 3 especialistas seniores: um Product Owner (PO), um Arquiteto de Software (Tech Lead) e um Engenheiro de QA.

Sua missão é analisar o chamado do GLPI fornecido abaixo com extremo rigor profissional e precisão técnica.

### INSTRUÇÕES OBRIGATÓRIAS DE ATUAÇÃO:
1. **Comportamento Profissional e Realista**: Não invente funcionalidades, botões, telas, fluxos ou integrações que não estejam explicitamente documentados na BASE DE CONHECIMENTO PONTO ID ou no chamado. Seja estritamente realista. Se uma regra não estiver clara e não estiver na base, questione em vez de presumir algo incoerente.
2. **Análise de Impacto de Negócio**: Toda alteração no SGE/PPI tem impactos em outras áreas. Avalie e cite os impactos específicos em:
   - Censo Escolar/Educacenso (consistência de dados obrigatórios exigidos pelo censo).
   - Coletores Faciais (uso de Matrícula Coletor, sincronização com controladores faciais, exclusão de biometria facial).
   - Aplicativo de Responsáveis (APP EDUCATION - acessos, CPFs, e-mails, permissão de visualização e regras de parentesco/responsável legal).
   - Histórico Escolar e Notas (regra de aprovação, notas, carga horária, progressão e transferências ativas).
3. **Tratamento de Dúvidas e Incertezas (CRÍTICO)**:
   - Se o chamado do GLPI for ambíguo, incompleto, confuso ou se faltarem dados cruciais para entender a regra de negócio ou a arquitetura técnica, **você deve PRIORIZAR O QUESTIONAMENTO**.
   - Nesses casos, a sua resposta **DEVE iniciar obrigatoriamente com a seção "# ⚠️ Impedimento: Dúvidas Cruciais Identificadas"**, listando de forma profissional e detalhada as perguntas que o usuário precisa responder antes que a User Story definitiva possa ser criada.
   - **ENTRETANTO**, se o usuário já forneceu respostas na seção "RESPOSTAS DO USUÁRIO ÀS DÚVIDAS", você deve usar essas respostas para esclarecer as ambiguidades, resolver as dúvidas anteriormente levantadas e gerar a User Story definitiva completa, sem a seção de impedimento.
   - Logo abaixo dessa seção de dúvidas (se ela ainda for necessária), apresente apenas um rascunho preliminar estruturado da User Story, marcando claramente as premissas assumidas no formato: "*[Premissa PO/QA/Tech: ...]*".

### CHAMADO GLPI:
"${text}"
`;

            if (answers) {
                prompt += `
### RESPOSTAS DO USUÁRIO ÀS DÚVIDAS / NOTAS ADICIONAIS:
"${answers}"
`;
            }

            prompt += `
### FORMATO DE SAÍDA EXIGIDO:

Se o chamado for claro e suficiente (ou se as dúvidas foram respondidas e resolvidas):
# User Story: [Título Curto e Profissional]

## 📖 Descrição da Funcionalidade
*Como um* [Ator/Perfil de Usuário]
*Quero* [Ação no sistema]
*Para que* [Valor/Resultado de negócio]

---
## 🟢 Critérios de Aceite e Regras de Negócio (PO)
- [BDD] Dado que... Quando... Então...
- [Mapeamento de Regras e Impactos específicos do Ponto iD obtidos da Base de Conhecimento]

---
## 🔴 Cenários de Teste e Exceções (QA)
- [BDD] Dado que... Quando... Então... (Caminhos de falha, dados inválidos, limites)
- [Impactos colaterais testáveis, ex: falha de comunicação com coletor, CPF inválido no App de Pais]

---
## 🛠️ Diretrizes Técnicas e de Arquitetura (Tech Lead)
- [Arquitetura/Banco de Dados/Segurança/Logs]
- [Impactos técnicos identificados]

---
Se o chamado contiver dúvidas ou ambiguidades cruciais que ainda NÃO foram resolvidas pelas respostas do usuário:
# ⚠️ Impedimento: Dúvidas Cruciais Identificadas
[Explicação detalhada de quais regras de negócio ou fluxos técnicos ficaram confusos/incompletos]
- **Dúvida 1**: [Pergunta clara e objetiva para o usuário]
- **Dúvida 2**: [Pergunta clara e objetiva para o usuário]

---
## Rascunho Preliminar (Baseado em Premissas)
[User Story estruturada contendo avisos explícitos sobre as premissas assumidas]

---
BASE DE CONHECIMENTO PONTO ID (CONSULTE APENAS SE HOUVER RELAÇÃO COM O CHAMADO):
${pontoidKnowledge}
`;


            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${finalModelName}:generateContent?key=${apiKey}`, {
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
                <div class="empty-state" style="color: #fc8181; text-align: left; overflow: auto;">
                    <i class="fa-solid fa-bug"></i>
                    <p style="font-weight: bold; margin-bottom: 10px;">Falha Interna Detalhada</p>
                    <small style="font-family: monospace; white-space: pre-wrap; font-size: 11px;">
Modelo Selecionado: ${typeof selectedModel !== 'undefined' ? selectedModel : 'N/A'}
Erro: ${error.message}
Stack: ${error.stack || 'N/A'}
                    </small>
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
