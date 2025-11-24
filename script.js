// --- 1. Constantes e Dados ---

const COST_PER_SQM = 40.00; 
const OS_PASSWORD = 'OS123'; 

// Perfis de Acesso
const VALID_USERNAME = 'empts2025'; // Administrador
const VALID_PASSWORD = 'empts2025T'; // Senha Admin

const VIEWER_USERNAME = 'viewer'; // Visualizador
const VIEWER_PASSWORD = 'viewos';

// Lista de serviços (mostrada apenas para o Admin)
const services = [
    { 
        title: '🚧 Cadastro de Metragem', 
        description: 'Funcionalidade em desenvolvimento. Em breve disponível!',
        action: 'Em Breve',
        id: 'cadastro',
        disabled: true // Desativa o card
    },
    { 
        title: '🧮 Calcular Metragem', 
        description: 'Ferramenta interativa para calcular metragens de novas áreas ou projetos.',
        action: 'Abrir Calculadora',
        id: 'calculadora',
        disabled: false
    },
    { 
        title: '📝 Ordem de Serviço (OS)', 
        description: 'Crie, acompanhe e gerencie todas as ordens de serviço pendentes e concluídas.',
        action: 'Nova Ordem',
        id: 'os',
        disabled: false
    },
];

let calculationResults = []; // Array local para a calculadora

// --- 2. Elementos DOM ---

const loginPage = document.getElementById('login-page');
const servicesPage = document.getElementById('services-page');
const calculatorPage = document.getElementById('calculator-page'); 
const osPage = document.getElementById('os-page'); 
const osViewPage = document.getElementById('os-view-page');

const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const viewerLogoutButton = document.getElementById('viewer-logout-button');
const backButton = document.getElementById('back-to-services-button');
const backButtonOS = document.getElementById('back-to-services-from-os');
const errorMessage = document.getElementById('error-message');
const servicesGrid = document.getElementById('services-grid');

// Elementos da Calculadora
const calculationForm = document.getElementById('calculation-form');
const resultsTableBody = document.querySelector('#results-table tbody');
const grandTotalCell = document.getElementById('grand-total-cell');
const exportPdfButton = document.getElementById('export-pdf-button');

// Elementos da OS (Criação)
const osForm = document.getElementById('os-form');

// Elementos da OS (Visualização)
const osListContainer = document.getElementById('os-list');


// --- 3. Funções de Navegação e Controle ---

function showPage(pageId) {
    // Esconde todas as páginas
    loginPage.classList.add('hidden');
    servicesPage.classList.add('hidden');
    calculatorPage.classList.add('hidden');
    osPage.classList.add('hidden'); 
    osViewPage.classList.add('hidden');

    // Mostra a página solicitada
    document.getElementById(pageId).classList.remove('hidden');
    
    if (pageId === 'services-page') {
        renderServiceCards();
    }
}

function showServicesPage() {
    showPage('services-page');
}

function showLoginPage() {
    showPage('login-page');
    loginForm.reset();
    errorMessage.style.display = 'none';
}

function showCalculatorPage() {
    showPage('calculator-page');
    calculationForm.reset();
    calculationResults = [];
    updateResultsTable();
}

function showOSPage() {
    showPage('os-page');
    osForm.reset();
}

// Busca dados do Firestore e renderiza a lista
async function showOSViewPage() {
    showPage('os-view-page'); 
    renderOSList(); 
}

// NOVO: Função para atualizar o status no Firebase (usado pelo botão "Concluir")
async function updateOSStatus(osId) {
    const newStatus = prompt("Digite a nova observação/status (ex: 'Serviço Concluído por Técnico X'):");
    if (!newStatus) return;

    try {
        // Atualiza o documento no Firestore
        await db.collection("ordersOfService").doc(osId).update({
            status: newStatus,
            concluido: true,
            dataConclusao: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert(`Status da OS ${osId} atualizado para: ${newStatus}`);
        renderOSList(); // Recarrega a lista
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        alert("Falha ao atualizar status. Verifique as regras de escrita do Firestore.");
    }
}
window.updateOSStatus = updateOSStatus; // Torna a função acessível globalmente


// NOVO: Função que busca dados do Firebase e desenha os cards
async function renderOSList() {
    osListContainer.innerHTML = '<h4>Carregando Ordens de Serviço...</h4>'; 

    try {
        // Busca a coleção de OSs, ordenando pela mais recente
        const snapshot = await db.collection("ordersOfService")
                                 .orderBy("timestamp", "desc")
                                 .get();

        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        osListContainer.innerHTML = ''; 
        
        if (orders.length === 0) {
            osListContainer.innerHTML = '<p class="warning-text" style="background-color: #e6e6e6; color: #333; border: 1px solid #ccc;">Nenhuma Ordem de Serviço aberta no momento.</p>';
            return;
        }

        // Renderiza cada OS
        orders.forEach((os, index) => {
            const urgencyColor = os.urgency === 'urgente' ? 'red' : os.urgency === 'media' ? 'orange' : 'green';
            const statusText = os.status || 'Pendente';
            const isConcluido = os.concluido || false;
            const statusColor = isConcluido ? '#28a745' : '#ffc107';
            
            // Botão de conclusão/atualização
            const concluirButton = isConcluido
                ? `<button disabled style="background-color: #6c757d; margin-top: 10px;">OS Concluída</button>`
                : `<button onclick="updateOSStatus('${os.id}')" style="background-color: #28a745; margin-top: 10px;">Marcar como Concluído</button>`;


            const osCard = document.createElement('div');
            osCard.classList.add('info-card');
            osCard.style.borderLeftColor = statusColor;

            osCard.innerHTML = `
                <h3>OS #${index + 1}: ${os.description.substring(0, 40)}...</h3>
                <p>Localização: ${os.location}</p>
                <p>Urgência: <span style="color: ${urgencyColor}; font-weight: bold;">${os.urgency.toUpperCase()}</span></p>
                <p>Status: <strong style="color: ${statusColor};">${statusText}</strong></p>
                ${concluirButton}
            `;
            osListContainer.appendChild(osCard);
        });

    } catch (error) {
        console.error("Erro ao carregar Ordens de Serviço:", error);
        osListContainer.innerHTML = '<p class="error-text">❌ Erro ao conectar ao banco de dados. Verifique a chave Firebase e as regras de segurança/Storage.</p>';
    }
}


function renderServiceCards() {
    servicesGrid.innerHTML = ''; 

    services.forEach((service) => {
        const card = document.createElement('div');
        
        // Adiciona a classe disabled se necessário
        if (service.disabled) {
            card.classList.add('disabled-card');
        } else {
            card.classList.add('service-card');
        }
        
        // Desativa o clique se o serviço estiver desabilitado
        const onClickAction = service.disabled 
            ? `alert('Funcionalidade em desenvolvimento. Aguarde!');` 
            : `startService('${service.id}', '${service.title}')`;
        
        const buttonText = service.disabled ? service.action : service.action;
        const buttonDisabled = service.disabled ? 'disabled' : '';
        const buttonStyle = service.disabled ? 'background-color: #6c757d; cursor: not-allowed;' : '';


        card.innerHTML = `
            <h3>${service.title}</h3>
            <p>${service.description}</p>
            <button onclick="${onClickAction}" ${buttonDisabled} style="${buttonStyle}">${buttonText}</button>
        `;
        
        servicesGrid.appendChild(card);
    });
}

function startService(id, title) {
    if (id === 'calculadora') {
        showCalculatorPage();
        return; 
    }
    
    if (id === 'os') {
        const userPassword = prompt(`Para acessar a ${title}, digite a senha de autorização:`);

        if (userPassword === OS_PASSWORD) {
            showOSPage(); 
        } else if (userPassword !== null && userPassword !== "") {
            alert("❌ Senha incorreta! Acesso negado.");
        } else {
             alert("Acesso cancelado ou senha não digitada.");
        }
        return; 
    }

    alert(`Ação de serviço: "${title}" foi iniciada. \nEm um projeto real, esta função faria o redirecionamento para a página de detalhes/formulário do serviço '${id}'.`);
}


// --- 4. Lógica da Calculadora ---

const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function updateResultsTable() {
    resultsTableBody.innerHTML = ''; 
    let grandTotal = 0;

    calculationResults.forEach(item => {
        const row = resultsTableBody.insertRow();
        const totalValue = item.sqm * COST_PER_SQM;
        grandTotal += totalValue;

        row.insertCell().textContent = item.companyName;
        row.insertCell().textContent = item.roomNumber;
        row.insertCell().textContent = `${item.sqm} m²`;
        row.insertCell().textContent = formatCurrency(totalValue);
    });

    grandTotalCell.textContent = formatCurrency(grandTotal);
    exportPdfButton.disabled = calculationResults.length === 0;
}

calculationForm.addEventListener('submit', function(event) {
    event.preventDefault(); 

    const companyName = document.getElementById('company-name').value.trim();
    const roomNumber = document.getElementById('room-number').value.trim();
    const sqm = parseFloat(document.getElementById('sqm').value);

    if (companyName && roomNumber && sqm > 0) {
        const newEntry = {
            companyName,
            roomNumber,
            sqm
        };
        calculationResults.push(newEntry);
        updateResultsTable();
        calculationForm.reset(); 
    }
});


// --- 5. Lógica da Ordem de Serviço (Criação e Salvamento no Firebase) ---

// A lógica de imagem foi removida, mantendo apenas a submissão de texto

osForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    const location = document.getElementById('os-location').value;
    const description = document.getElementById('os-description').value;
    const urgency = document.getElementById('os-urgency').value;
    
    // Lista de imagens vazia, pois a funcionalidade foi removida
    let imageUrls = []; 
    
    // 1. Cria e Salva o objeto OS no Firestore
    const newOS = {
        location: location,
        description: description,
        urgency: urgency,
        imageUrls: imageUrls, 
        status: 'Pendente', // Status inicial
        concluido: false,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection("ordersOfService").add(newOS);
        alert(`✅ Ordem de Serviço Registrada com sucesso no Banco de Dados!`);
    } catch (error) {
        console.error("ERRO CRÍTICO AO SALVAR DADOS:", error);
        alert("❌ FALHA AO SALVAR DADOS! Verifique as regras de permissão (Firestore) no Console do Firebase.");
        return;
    }

    // 2. Limpeza e Navegação
    osForm.reset();
    showServicesPage(); 
});


// --- 6. Lógica do PDF ---

exportPdfButton.addEventListener('click', function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Cálculo de Metragem', 10, 20);
    doc.setFontSize(10);
    doc.text(`Data da Geração: ${new Date().toLocaleDateString('pt-BR')}`, 10, 26);
    doc.line(10, 28, 200, 28); 

    const headers = [
        ['Empresa', 'Sala', 'Metragem (m²)', 'Valor Total (R$)']
    ];
    
    const data = calculationResults.map(item => {
        const totalValue = item.sqm * COST_PER_SQM;
        return [
            item.companyName,
            item.roomNumber,
            `${item.sqm} m²`,
            formatCurrency(totalValue)
        ];
    });

    const grandTotalValue = calculationResults.reduce((acc, item) => acc + (item.sqm * COST_PER_SQM), 0);

    doc.autoTable({
        head: headers,
        body: data,
        startY: 35,
        styles: { fontSize: 10, cellPadding: 2, textColor: [33, 33, 33] },
        // NOVO: Cores Verdes
        headStyles: { fillColor: [40, 167, 69], textColor: 255, fontStyle: 'bold' },
        foot: [
            ['TOTAL GERAL', '', '', formatCurrency(grandTotalValue)]
        ],
        footStyles: { fontStyle: 'bold', fillColor: [200, 230, 201] }
    });

    doc.save('Relatorio_Metragem.pdf');
    alert('PDF gerado com sucesso!');
});


// --- 7. Event Listeners Finais ---

// Lógica do Login (Verifica os dois perfis)
loginForm.addEventListener('submit', function(event) {
    event.preventDefault(); 
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;

    if (usernameInput === VALID_USERNAME && passwordInput === VALID_PASSWORD) {
        // PERFIL 1: Administrador/Criador
        errorMessage.style.display = 'none';
        showServicesPage();
    } else if (usernameInput === VIEWER_USERNAME && passwordInput === VIEWER_PASSWORD) {
        // PERFIL 2: Visualizador
        errorMessage.style.display = 'none';
        showOSViewPage(); 
    } else {
        errorMessage.style.display = 'block';
    }
});

// Botões Voltar e Logout
logoutButton.addEventListener('click', showLoginPage);
viewerLogoutButton.addEventListener('click', showLoginPage);
backButton.addEventListener('click', showServicesPage);
backButtonOS.addEventListener('click', showServicesPage);

// Garante que a função startService seja acessível globalmente
window.startService = startService;

// Estado inicial: Garante que a página de login esteja visível ao carregar
showLoginPage();