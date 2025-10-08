import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, onSnapshot, getDoc, updateDoc, deleteDoc, query, orderBy, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyB8dE-UottjPS0dF92H9pfNLO_PcGU05dE", 
    authDomain: "prototypingtheapp.firebaseapp.com", 
    projectId: "prototypingtheapp", 
    storageBucket: "prototypingtheapp.appspot.com", 
    messagingSenderId: "732357781797", 
    appId: "1:732357781797:web:0ff864827857c15b8312cc", 
    measurementId: "G-VSTGVPP0GD" };

// --- GEMINI API SETUP ---
const GEMINI_API_KEY = ""; // Keep this as an empty string.
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;


const configErrorScreen = document.getElementById('config-error-screen');

if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("...")) {
    configErrorScreen.classList.remove('hidden');
} else {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    let currentUserId = null;
    let calendar; 
    let isCalendarInitialized = false;

    // --- Element References (Complete) ---
    const allScreens = Array.from(document.querySelectorAll('.screen'));
    const authScreen = document.getElementById('auth-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const clientManagementScreen = document.getElementById('client-management-screen');
    const schedulingScreen = document.getElementById('scheduling-screen');
    const financialsScreen = document.getElementById('financials-screen');

    // Auth
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLink = document.getElementById('show-login-link');
    const authErrorMessage = document.getElementById('auth-error-message');
    const logoutButton = document.getElementById('logout-button');

    // Navigation
    const manageClientsCard = document.getElementById('manage-clients-card');
    const schedulingCard = document.getElementById('scheduling-card');
    const financialsCard = document.getElementById('financials-card');
    document.querySelectorAll('.back-to-dashboard').forEach(btn => {
        btn.addEventListener('click', () => showScreen(dashboardScreen));
    });

    // Client Management
    const newClientForm = document.getElementById('new-client-form');
    const clientList = document.getElementById('client-list');
    const editClientModal = document.getElementById('edit-client-modal');
    const editClientForm = document.getElementById('edit-client-form');
    const cancelEditButton = document.getElementById('cancel-edit-button');

    // Scheduling
    const calendarEl = document.getElementById('calendar');
    const addEventModal = document.getElementById('add-event-modal');
    const addEventForm = document.getElementById('add-event-form');
    const cancelAddEventButton = document.getElementById('cancel-add-event-button');
    const eventClientSelect = document.getElementById('event-client-select');
    const dailyAgendaModal = document.getElementById('daily-agenda-modal');
    const agendaDate = document.getElementById('agenda-date');
    const agendaEventList = document.getElementById('agenda-event-list');
    const closeAgendaButton = document.getElementById('close-agenda-button');
    const addNewEventFromAgenda = document.getElementById('add-new-event-from-agenda');

    // Financials
    const transactionForm = document.getElementById('transaction-form');
    const incomeList = document.getElementById('income-list');
    const expenseList = document.getElementById('expense-list');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const netProfitEl = document.getElementById('net-profit');
    const taxEstimateEl = document.getElementById('tax-estimate');
    const dashboardProfitEl = document.getElementById('dashboard-profit');

    // Gemini Modal Elements
    const clientInsightsModal = document.getElementById('client-insights-modal');
    const closeClientInsightsButton = document.getElementById('close-client-insights-button');
    const clientInsightsContent = document.getElementById('client-insights-content');
    const clientInsightsLoading = document.getElementById('client-insights-loading');
    const financialReportModal = document.getElementById('financial-report-modal');
    const closeFinancialReportButton = document.getElementById('close-financial-report-button');
    const financialReportContent = document.getElementById('financial-report-content');
    const financialReportLoading = document.getElementById('financial-report-loading');
    const generateFinancialReportButton = document.getElementById('generate-financial-report-button');

    // --- Navigation ---
    function showScreen(screenToShow) {
        allScreens.forEach(screen => screen.classList.add('hidden'));
        if (screenToShow) screenToShow.classList.remove('hidden');
    }

    // --- Gemini API Call Logic ---
    async function callGeminiAPI(prompt) {
        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                console.error("Gemini API Error:", await response.json());
                return `Error: Unable to get a response from the AI. (${response.status})`;
            }
            const result = await response.json();
            return result.candidates?.[0]?.content?.parts?.[0]?.text || "No content received from AI.";
        } catch (error) {
            console.error("Fetch Error:", error);
            return "Error: Could not connect to the AI service.";
        }
    }

    async function generateClientInsights(clientId) {
        clientInsightsModal.classList.remove('hidden');
        clientInsightsLoading.classList.remove('hidden');
        clientInsightsContent.classList.add('hidden');
        const clientRef = doc(db, 'users', currentUserId, 'clients', clientId);
        const docSnap = await getDoc(clientRef);
        if (!docSnap.exists() || !docSnap.data().notes) {
            clientInsightsContent.innerHTML = "No notes available for this client to analyze.";
        } else {
            const notes = docSnap.data().notes;
            const prompt = `As a business assistant, analyze the following client notes. Provide a concise summary and a bulleted list of key takeaways, including potential needs and communication style. Notes:\n\n"${notes}"`;
            const insights = await callGeminiAPI(prompt);
            const formattedInsights = insights.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\* (.*?)(?:\n|$)/g, '<li class="ml-4 list-disc">$1</li>');
            clientInsightsContent.innerHTML = formattedInsights;
        }
        clientInsightsLoading.classList.add('hidden');
        clientInsightsContent.classList.remove('hidden');
    }

    async function generateFinancialReport() {
        financialReportModal.classList.remove('hidden');
        financialReportLoading.classList.remove('hidden');
        financialReportContent.classList.add('hidden');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const incomeQuery = query(collection(db, 'users', currentUserId, 'income'), where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0]));
        const expensesQuery = query(collection(db, 'users', currentUserId, 'expenses'), where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0]));
        const [incomeDocs, expenseDocs] = await Promise.all([getDocs(incomeQuery), getDocs(expensesQuery)]);
        const incomes = incomeDocs.docs.map(doc => doc.data());
        const expenses = expenseDocs.docs.map(doc => doc.data());
        if (incomes.length === 0 && expenses.length === 0) {
            financialReportContent.textContent = "No financial data from the last 30 days to analyze.";
        } else {
            const incomeText = incomes.map(i => `${i.description}: $${i.amount}`).join(', ');
            const expenseText = expenses.map(e => `${e.description}: $${e.amount}`).join(', ');
            const prompt = `You are a financial analyst. Based on this financial data from the last 30 days, provide a concise, one-paragraph summary of this user's financial health. Highlight the largest income source and largest expense category. Be encouraging but realistic.\nIncome Transactions: ${incomeText || 'None'}\nExpense Transactions: ${expenseText || 'None'}`;
            const report = await callGeminiAPI(prompt);
            financialReportContent.textContent = report;
        }
        financialReportLoading.classList.add('hidden');
        financialReportContent.classList.remove('hidden');
    }

    // --- Authentication Logic ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            showScreen(dashboardScreen);
            fetchAndDisplayClients();
            loadEvents();
            fetchAndDisplayTransactions();
        } else {
            currentUserId = null;
            showScreen(authScreen);
            if (calendar) {
                calendar.destroy();
                isCalendarInitialized = false;
            }
        }
    });

    // --- Financials Logic ---
    async function handleAddTransaction(e) {
        e.preventDefault();
        const type = transactionForm.type.value;
        const description = transactionForm.description.value;
        const amount = parseFloat(transactionForm.amount.value);
        const date = transactionForm.date.value;
        if (!description || isNaN(amount) || !date) return alert("Please fill out all fields correctly.");
        const collectionName = type === 'income' ? 'income' : 'expenses';
        await addDoc(collection(db, 'users', currentUserId, collectionName), { description, amount, date });
        transactionForm.reset();
    }

    function fetchAndDisplayTransactions() {
        let allIncomes = [], allExpenses = [];
        const updateSummary = () => {
            const totalIncome = allIncomes.reduce((sum, item) => sum + item.amount, 0);
            const totalExpenses = allExpenses.reduce((sum, item) => sum + item.amount, 0);
            const netProfit = totalIncome - totalExpenses;
            const taxEstimate = netProfit > 0 ? netProfit * 0.20 : 0;
            totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
            totalExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
            netProfitEl.textContent = `$${netProfit.toFixed(2)}`;
            taxEstimateEl.textContent = `$${taxEstimate.toFixed(2)}`;
            dashboardProfitEl.textContent = `$${netProfit.toFixed(2)}`;
            [netProfitEl, dashboardProfitEl].forEach(el => {
                el.classList.toggle('text-green-500', netProfit >= 0);
                el.classList.toggle('dark:text-green-400', netProfit >= 0);
                el.classList.toggle('text-red-500', netProfit < 0);
                el.classList.toggle('dark:text-red-400', netProfit < 0);
            });
        };
        onSnapshot(query(collection(db, 'users', currentUserId, 'income'), orderBy('date', 'desc')), (snapshot) => {
            allIncomes = snapshot.docs.map(doc => doc.data());
            incomeList.innerHTML = allIncomes.map(item => `<div class="flex justify-between items-center p-3 rounded-lg bg-slate-100 dark:bg-slate-700"><div><p class="font-medium">${item.description}</p><p class="text-xs text-slate-500 dark:text-slate-400">${item.date}</p></div><p class="font-semibold text-green-600 dark:text-green-400">+$${item.amount.toFixed(2)}</p></div>`).join('') || `<p class="text-slate-500 text-sm">No income logged yet.</p>`;
            updateSummary();
        });
        onSnapshot(query(collection(db, 'users', currentUserId, 'expenses'), orderBy('date', 'desc')), (snapshot) => {
            allExpenses = snapshot.docs.map(doc => doc.data());
            expenseList.innerHTML = allExpenses.map(item => `<div class="flex justify-between items-center p-3 rounded-lg bg-slate-100 dark:bg-slate-700"><div><p class="font-medium">${item.description}</p><p class="text-xs text-slate-500 dark:text-slate-400">${item.date}</p></div><p class="font-semibold text-red-600 dark:text-red-400">-$${item.amount.toFixed(2)}</p></div>`).join('') || `<p class="text-slate-500 text-sm">No expenses logged yet.</p>`;
            updateSummary();
        });
    }
    
    // --- Client Management Logic ---
    function fetchAndDisplayClients() {
        onSnapshot(collection(db, 'users', currentUserId, 'clients'), (snapshot) => {
            clientList.innerHTML = '';
            eventClientSelect.innerHTML = '<option value="">None (General Event)</option>';
            snapshot.forEach((doc) => {
                const client = doc.data();
                const clientElement = document.createElement('div');
                clientElement.className = 'bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700';
                clientElement.innerHTML = `<div class="flex-grow"><h3 class="font-bold text-lg text-indigo-600 dark:text-indigo-400">${client.name}</h3><p class="text-slate-600 dark:text-slate-400 text-sm">${client.contact}</p><p class="text-slate-500 mt-2 text-sm whitespace-pre-wrap">${client.notes || ''}</p></div><div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center"><button data-id="${doc.id}" class="ai-insights-btn text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1">✨ AI Insights</button><div><button data-id="${doc.id}" class="edit-btn text-sm font-medium text-blue-600 hover:text-blue-500">Edit</button><button data-id="${doc.id}" class="delete-btn text-sm font-medium text-red-600 hover:text-red-500 ml-2">Delete</button></div></div>`;
                clientList.appendChild(clientElement);
                const optionElement = document.createElement('option');
                optionElement.value = `${doc.id}|${client.name}`;
                optionElement.textContent = client.name;
                eventClientSelect.appendChild(optionElement);
            });
        });
    }
    
    async function addClient(e) { e.preventDefault(); await addDoc(collection(db, 'users', currentUserId, 'clients'), { name: newClientForm['client-name'].value, contact: newClientForm['client-contact'].value, notes: newClientForm['client-notes'].value }); newClientForm.reset(); }
    async function openEditModal(clientId) { const docSnap = await getDoc(doc(db, 'users', currentUserId, 'clients', clientId)); if (!docSnap.exists()) return; const client = docSnap.data(); editClientForm['edit-client-id'].value = clientId; editClientForm['edit-client-name'].value = client.name; editClientForm['edit-client-contact'].value = client.contact; editClientForm['edit-client-notes'].value = client.notes; editClientModal.classList.remove('hidden'); }
    async function handleUpdateClient(e) { e.preventDefault(); const clientId = editClientForm['edit-client-id'].value; await updateDoc(doc(db, 'users', currentUserId, 'clients', clientId), { name: editClientForm['edit-client-name'].value, contact: editClientForm['edit-client-contact'].value, notes: editClientForm['edit-client-notes'].value }); editClientModal.classList.add('hidden'); }
    async function handleDeleteClient(clientId) { if (confirm('Are you sure you want to delete this client?')) await deleteDoc(doc(db, 'users', currentUserId, 'clients', clientId)); }

    // --- Calendar Logic ---
    function initializeCalendar() { if (isCalendarInitialized) return; calendar = new FullCalendar.Calendar(calendarEl, { initialView: 'dayGridMonth', headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }, height: '100%', dateClick: (info) => openDailyAgenda(info.date), eventClick: (info) => alert(`Event: ${info.event.title}`) }); calendar.render(); isCalendarInitialized = true; }
    function openDailyAgenda(date) { const dayEvents = calendar.getEvents().filter(event => event.start.toDateString() === date.toDateString()); agendaDate.textContent = `Appointments for ${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`; agendaDate.dataset.date = date.toISOString().split('T')[0]; agendaEventList.innerHTML = dayEvents.length ? dayEvents.map(event => `<div class="p-3 bg-indigo-100 text-indigo-800 rounded-md shadow-sm">${event.title}</div>`).join('') : '<p class="text-slate-500">No appointments scheduled.</p>'; dailyAgendaModal.classList.remove('hidden'); }
    async function handleAddEvent(e) { e.preventDefault(); const [clientId, clientName] = addEventForm['event-client-select'].value.split('|'); const finalTitle = clientName ? `${clientName}: ${addEventForm['event-title'].value}` : addEventForm['event-title'].value; await addDoc(collection(db, 'users', currentUserId, 'events'), { title: finalTitle, start: addEventForm['event-start-date'].value, allDay: true, clientId: clientId || null }); addEventModal.classList.add('hidden'); }
    function loadEvents() { onSnapshot(collection(db, 'users', currentUserId, 'events'), (snapshot) => { const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); if(calendar) { calendar.removeAllEvents(); calendar.addEventSource(events); } }); }

    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', async(e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, loginForm['login-email'].value, loginForm['login-password'].value); } catch (err) { authErrorMessage.textContent = err.message; }});
    signupForm.addEventListener('submit', async(e) => { e.preventDefault(); try { await createUserWithEmailAndPassword(auth, signupForm['signup-email'].value, signupForm['signup-password'].value); } catch (err) { authErrorMessage.textContent = err.message; }});
    logoutButton.addEventListener('click', () => signOut(auth));
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('hidden'); signupForm.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });
    manageClientsCard.addEventListener('click', () => showScreen(clientManagementScreen));
    schedulingCard.addEventListener('click', () => { showScreen(schedulingScreen); setTimeout(initializeCalendar, 0); });
    financialsCard.addEventListener('click', () => showScreen(financialsScreen));
    newClientForm.addEventListener('submit', addClient);
    editClientForm.addEventListener('submit', handleUpdateClient);
    cancelEditButton.addEventListener('click', () => editClientModal.classList.add('hidden'));
    addEventForm.addEventListener('submit', handleAddEvent);
    cancelAddEventButton.addEventListener('click', () => addEventModal.classList.add('hidden'));
    closeAgendaButton.addEventListener('click', () => dailyAgendaModal.classList.add('hidden'));
    addNewEventFromAgenda.addEventListener('click', () => { dailyAgendaModal.classList.add('hidden'); addEventForm.reset(); document.getElementById('event-start-date').value = agendaDate.dataset.date; addEventModal.classList.remove('hidden'); });
    transactionForm.addEventListener('submit', handleAddTransaction);
    generateFinancialReportButton.addEventListener('click', generateFinancialReport);
    closeClientInsightsButton.addEventListener('click', () => clientInsightsModal.classList.add('hidden'));
    closeFinancialReportButton.addEventListener('click', () => financialReportModal.classList.add('hidden'));
    clientList.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button');
        if (!targetButton) return;
        const clientId = targetButton.dataset.id;
        if (targetButton.classList.contains('ai-insights-btn')) generateClientInsights(clientId);
        if (targetButton.classList.contains('edit-btn')) openEditModal(clientId);
        if (targetButton.classList.contains('delete-btn')) handleDeleteClient(clientId);
    });
}

