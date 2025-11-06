import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, onSnapshot, getDoc, updateDoc, deleteDoc, query, orderBy, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===================================================================================
// STEP 1: PASTE YOUR FIREBASE CONFIG OBJECT HERE
// ===================================================================================
const firebaseConfig = { 
    apiKey: "AIzaSyB8dE-UottjPS0dF92H9pfNLO_PcGU05dE", 
    authDomain: "prototypingtheapp.firebaseapp.com", 
    projectId: "prototypingtheapp", 
    storageBucket: "prototypingtheapp.appspot.com", 
    messagingSenderId: "732357781797", 
    appId: "1:732357781797:web:0ff864827857c15b8312cc", 
    measurementId: "G-VSTGVPP0GD"
};
// ===================================================================================

// This uses the key from your secure config.js file
// @ts-ignore (ignore "cannot find name" error for GEMINI_API_KEY)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

const configErrorScreen = document.getElementById('config-error-screen');

// @ts-ignore (ignore "cannot find name" error for GEMINI_API_KEY)
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("...") || !GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
    configErrorScreen.classList.remove('hidden');
    const errorText = document.getElementById('config-error-text');
    let missing = [];
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("...")) {
        missing.push("Firebase Config in app.js");
    }
    // @ts-ignore (ignore "cannot find name" error for GEMINI_API_KEY)
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
        missing.push("Gemini API Key in config.js");
    }
    errorText.innerHTML = `Please add your:<br/><strong>${missing.join('<br/>')}</strong>`;

} else {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    let currentUserId = null;
    let calendar; 
    let isCalendarInitialized = false;
    let allUserEvents = [];
    let allIncomes = [];
    let allExpenses = [];

    // --- Element References (Complete) ---
    const allScreens = Array.from(document.querySelectorAll('.screen'));
    const authScreen = document.getElementById('auth-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const clientManagementScreen = document.getElementById('client-management-screen');
    const schedulingScreen = document.getElementById('scheduling-screen');
    const financialsScreen = document.getElementById('financials-screen');

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutButton = document.getElementById('logout-button');
    const authErrorMessage = document.getElementById('auth-error-message');
    document.getElementById('show-signup-link').addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('hidden'); signupForm.classList.remove('hidden'); });
    document.getElementById('show-login-link').addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });
    
    const manageClientsCard = document.getElementById('manage-clients-card');
    const schedulingCard = document.getElementById('scheduling-card');
    const financialsCard = document.getElementById('financials-card');

    document.querySelectorAll('.back-to-dashboard').forEach(btn => {
        btn.addEventListener('click', () => showScreen(dashboardScreen));
    });

    const newClientForm = document.getElementById('new-client-form');
    const clientList = document.getElementById('client-list');
    const editClientModal = document.getElementById('edit-client-modal');
    const editClientForm = document.getElementById('edit-client-form');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    
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
    
    const transactionForm = document.getElementById('transaction-form');
    const incomeList = document.getElementById('income-list');
    const expenseList = document.getElementById('expense-list');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const netProfitEl = document.getElementById('net-profit');
    const taxEstimateEl = document.getElementById('tax-estimate');
    
    const dashboardTodayBookings = document.getElementById('dashboard-today-bookings');
    const dashboardProfitEl = document.getElementById('dashboard-profit');

    // AI Modals
    const clientInsightsModal = document.getElementById('client-insights-modal');
    const clientInsightsLoading = document.getElementById('client-insights-loading');
    const clientInsightsContent = document.getElementById('client-insights-content');
    document.getElementById('close-client-insights-button').addEventListener('click', () => clientInsightsModal.classList.add('hidden'));

    const financialReportModal = document.getElementById('financial-report-modal');
    const financialReportLoading = document.getElementById('financial-report-loading');
    const financialReportContent = document.getElementById('financial-report-content');
    document.getElementById('generate-financial-report-button').addEventListener('click', generateFinancialReport);
    document.getElementById('close-financial-report-button').addEventListener('click', () => financialReportModal.classList.add('hidden'));


    // --- Navigation ---
    function showScreen(screenToShow) {
        allScreens.forEach(screen => screen.classList.add('hidden'));
        if (screenToShow) screenToShow.classList.remove('hidden');
    }

    // --- Authentication ---
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

    loginForm.addEventListener('submit', async(e) => { 
        e.preventDefault(); 
        authErrorMessage.textContent = '';
        try { 
            await signInWithEmailAndPassword(auth, loginForm['login-email'].value, loginForm['login-password'].value); 
            loginForm.reset(); 
        } catch (err) { 
            authErrorMessage.textContent = err.message; 
        } 
    });

    signupForm.addEventListener('submit', async(e) => { 
        e.preventDefault(); 
        authErrorMessage.textContent = '';
        try { 
            await createUserWithEmailAndPassword(auth, signupForm['signup-email'].value, signupForm['signup-password'].value); 
            signupForm.reset(); 
        } catch (err) { 
            authErrorMessage.textContent = err.message; 
        } 
    });

    logoutButton.addEventListener('click', () => signOut(auth));

    // --- Dashboard Summary ---
    function updateDashboardSummary() {
        // Update Today's Bookings
        const today = new Date().toDateString();
        const todayEvents = allUserEvents.filter(event => new Date(event.start).toDateString() === today);
        dashboardTodayBookings.textContent = todayEvents.length;

        // Update Net Profit
        const totalIncome = allIncomes.reduce((sum, item) => sum + item.amount, 0);
        const totalExpenses = allExpenses.reduce((sum, item) => sum + item.amount, 0);
        const netProfit = totalIncome - totalExpenses;
        
        dashboardProfitEl.textContent = `$${netProfit.toFixed(2)}`;
        dashboardProfitEl.classList.toggle('text-green-500', netProfit >= 0);
        dashboardProfitEl.classList.toggle('dark:text-green-400', netProfit >= 0);
        dashboardProfitEl.classList.toggle('text-red-500', netProfit < 0);
        dashboardProfitEl.classList.toggle('dark:text-red-400', netProfit < 0);
    }

    // --- Calendar Logic ---
    function initializeCalendar() {
        if (isCalendarInitialized) return;
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
            height: '100%',
            nowIndicator: true,
            selectable: true,
            dateClick: (info) => {
                addEventForm.reset();
                const isoString = info.date.toISOString();
                document.getElementById('event-start-date').value = isoString.substring(0, 10);
                document.getElementById('event-start-time').value = isoString.substring(11, 16);
                addEventModal.classList.remove('hidden');
            },
            eventClick: (info) => {
                const startTime = new Date(info.event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                alert(`Event: ${info.event.title}\nTime: ${startTime}`);
            },
        });
        calendar.render();
        isCalendarInitialized = true;
    }

    async function handleAddEvent(e) {
        e.preventDefault();
        if (!currentUserId) return;
        const title = addEventForm['event-title'].value;
        const startDate = addEventForm['event-start-date'].value;
        const startTime = addEventForm['event-start-time'].value;
        const [clientId, clientName] = eventClientSelect.value.split('|');
        
        if (!title || !startDate || !startTime) {
            alert("Please fill in the description, date, and time.");
            return;
        }

        const startDateTime = `${startDate}T${startTime}`;
        const finalTitle = clientName ? `${clientName}: ${title}` : title;
        
        try {
            await addDoc(collection(db, 'users', currentUserId, 'events'), {
                title: finalTitle,
                start: startDateTime,
                clientId: clientId || null
            });
            addEventModal.classList.add('hidden');
        } catch (error) { console.error("Error adding event: ", error); }
    }

    function loadEvents() {
        onSnapshot(collection(db, 'users', currentUserId, 'events'), (snapshot) => {
            allUserEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if(calendar) {
                calendar.removeAllEvents();
                calendar.addEventSource(allUserEvents);
            }
            updateDashboardSummary();
        });
    }

    // --- Financials Logic ---
    async function handleAddTransaction(e) {
        e.preventDefault();
        if (!currentUserId) return;
        const type = transactionForm.type.value;
        const description = transactionForm.description.value;
        const amount = parseFloat(transactionForm.amount.value);
        const date = transactionForm.date.value;
        if (!description || isNaN(amount) || !date) { alert("Please fill out all fields."); return; }

        const collectionName = type === 'income' ? 'income' : 'expenses';
        try {
            await addDoc(collection(db, 'users', currentUserId, collectionName), { description, amount, date });
            transactionForm.reset();
        } catch (error) { console.error("Error adding transaction: ", error); }
    }

    function fetchAndDisplayTransactions() {
        if (!currentUserId) return;
        const incomeQuery = query(collection(db, 'users', currentUserId, 'income'), orderBy('date', 'desc'));
        const expensesQuery = query(collection(db, 'users', currentUserId, 'expenses'), orderBy('date', 'desc'));

        onSnapshot(incomeQuery, (snapshot) => {
            allIncomes = snapshot.docs.map(doc => doc.data());
            incomeList.innerHTML = allIncomes.map(item => `
                <div class="flex justify-between items-center p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                    <div><p class="font-medium">${item.description}</p><p class="text-xs text-slate-500 dark:text-slate-400">${item.date}</p></div>
                    <p class="font-semibold text-green-600 dark:text-green-400">+$${item.amount.toFixed(2)}</p>
                </div>`).join('') || `<p class="text-slate-500 text-sm">No income logged yet.</p>`;
            updateFinancialSummary(allIncomes, allExpenses);
        });
        onSnapshot(expensesQuery, (snapshot) => {
            allExpenses = snapshot.docs.map(doc => doc.data());
            expenseList.innerHTML = allExpenses.map(item => `
                <div class="flex justify-between items-center p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                    <div><p class="font-medium">${item.description}</p><p class="text-xs text-slate-500 dark:text-slate-400">${item.date}</p></div>
                    <p class="font-semibold text-red-600 dark:text-red-400">-$${item.amount.toFixed(2)}</p>
                </div>`).join('') || `<p class="text-slate-500 text-sm">No expenses logged yet.</p>`;
            updateFinancialSummary(allIncomes, allExpenses);
        });
    }

    function updateFinancialSummary(incomes, expenses) {
        const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
        const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
        const netProfit = totalIncome - totalExpenses;
        const taxEstimate = netProfit > 0 ? netProfit * 0.20 : 0;

        totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
        totalExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
        netProfitEl.textContent = `$${netProfit.toFixed(2)}`;
        taxEstimateEl.textContent = `$${taxEstimate.toFixed(2)}`;
        
        netProfitEl.classList.toggle('text-green-500', netProfit >= 0);
        netProfitEl.classList.toggle('dark:text-green-400', netProfit >= 0);
        netProfitEl.classList.toggle('text-red-500', netProfit < 0);
        netProfitEl.classList.toggle('dark:text-red-400', netProfit < 0);
        
        updateDashboardSummary();
    }

    // --- Client Management Logic ---
    function fetchAndDisplayClients() {
        if (!currentUserId) return;
        onSnapshot(collection(db, 'users', currentUserId, 'clients'), (snapshot) => {
            clientList.innerHTML = '';
            eventClientSelect.innerHTML = '<option value="|None">None (General Event)</option>';
            snapshot.forEach((doc) => {
                const client = doc.data();
                const clientElement = document.createElement('div');
                clientElement.className = 'bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700';
                clientElement.innerHTML = `
                    <div class="flex-grow">
                        <h3 class="font-bold text-lg text-indigo-600 dark:text-indigo-400">${client.name}</h3>
                        <p class="text-slate-600 dark:text-slate-400 text-sm">${client.contact}</p>
                        <p class="text-slate-500 mt-2 text-sm whitespace-pre-wrap">${client.notes || ''}</p>
                    </div>
                    <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
                        <button data-id="${doc.id}" class="ai-insights-btn text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1">✨ AI Insights</button>
                        <button data-id="${doc.id}" class="edit-btn text-sm font-medium text-blue-600 hover:text-blue-500">Edit</button>
                        <button data-id="${doc.id}" class="delete-btn text-sm font-medium text-red-600 hover:text-red-500">Delete</button>
                    </div>`;
                clientList.appendChild(clientElement);
                const optionElement = document.createElement('option');
                optionElement.value = `${doc.id}|${client.name}`;
                optionElement.textContent = client.name;
                eventClientSelect.appendChild(optionElement);
            });
        });
    }

    async function addClient(e) {
        e.preventDefault();
        if (!currentUserId) return;
        const clientName = newClientForm['client-name'].value;
        const clientContact = newClientForm['client-contact'].value;
        const clientNotes = newClientForm['client-notes'].value;
        if (clientName && clientContact) {
            try {
                await addDoc(collection(db, 'users', currentUserId, 'clients'), { name: clientName, contact: clientContact, notes: clientNotes });
                newClientForm.reset();
            } catch (err) { console.error("Error adding client: ", err); }
        }
    }
    
    async function openEditModal(clientId) {
        const clientRef = doc(db, 'users', currentUserId, 'clients', clientId);
        const docSnap = await getDoc(clientRef);
        if (docSnap.exists()) {
            const client = docSnap.data();
            editClientForm['edit-client-id'].value = clientId;
            editClientForm['edit-client-name'].value = client.name;
            editClientForm['edit-client-contact'].value = client.contact;
            editClientForm['edit-client-notes'].value = client.notes;
            editClientModal.classList.remove('hidden');
        }
    }

    async function handleUpdateClient(e) {
        e.preventDefault();
        const clientId = editClientForm['edit-client-id'].value;
        const clientRef = doc(db, 'users', currentUserId, 'clients', clientId);
        await updateDoc(clientRef, {
            name: editClientForm['edit-client-name'].value,
            contact: editClientForm['edit-client-contact'].value,
            notes: editClientForm['edit-client-notes'].value,
        });
        editClientModal.classList.add('hidden');
    }

    async function handleDeleteClient(clientId) {
        const clientRef = doc(db, 'users', currentUserId, 'clients', clientId);
        await deleteDoc(clientRef);
    }
    
    // --- Gemini AI Functions ---
    async function callGeminiAPI(prompt, loadingElement, contentElement) {
        // @ts-ignore (ignore "cannot find name" error for GEMINI_API_KEY)
        if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
            contentElement.innerHTML = `<p class="text-red-500 font-semibold">Configuration Error:</p><p>Your Gemini API key is missing from <strong>config.js</strong>.</p>`;
            loadingElement.classList.add('hidden');
            contentElement.classList.remove('hidden');
            return;
        }

        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Gemini API Error:", errorData);
                contentElement.innerHTML = `<p class="text-red-500 font-semibold">API Error ${response.status}:</p><p>${errorData.error?.message || 'Failed to get a response.'}</p>`;
            } else {
                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    const formattedHtml = text
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                        .replace(/\* (.*?)(?:\n|$)/g, '<li class="ml-4 list-disc">$1</li>'); // Bullets
                    contentElement.innerHTML = formattedHtml;
                } else {
                    contentElement.textContent = "Received an empty response from the AI.";
                }
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            contentElement.textContent = "Error: Could not connect to the AI service. Check your network connection.";
        } finally {
            loadingElement.classList.add('hidden');
            contentElement.classList.remove('hidden');
        }
    }

    async function generateClientInsights(clientId) {
        clientInsightsModal.classList.remove('hidden');
        clientInsightsLoading.classList.remove('hidden');
        clientInsightsContent.classList.add('hidden');
        
        const docSnap = await getDoc(doc(db, 'users', currentUserId, 'clients', clientId));
        if (!docSnap.exists() || !docSnap.data().notes) {
            clientInsightsContent.innerHTML = "<p>No notes available for this client to analyze.</p>";
            clientInsightsLoading.classList.add('hidden');
            clientInsightsContent.classList.remove('hidden');
            return;
        }

        const prompt = `As a business assistant, analyze the following client notes. Provide a concise summary (1-2 sentences) and a bulleted list of key takeaways (e.g., preferences, topics to avoid, potential opportunities). Keep it professional and actionable. Notes:\n\n"${docSnap.data().notes}"`;
        await callGeminiAPI(prompt, clientInsightsLoading, clientInsightsContent);
    }
    
    async function generateFinancialReport() {
        financialReportModal.classList.remove('hidden');
        financialReportLoading.classList.remove('hidden');
        financialReportContent.classList.add('hidden');

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const recentIncomes = allIncomes.filter(item => item.date >= thirtyDaysAgo);
        const recentExpenses = allExpenses.filter(item => item.date >= thirtyDaysAgo);

        if (recentIncomes.length === 0 && recentExpenses.length === 0) {
            financialReportContent.innerHTML = "<p>No financial transactions recorded in the last 30 days.</p>";
            financialReportLoading.classList.add('hidden');
            financialReportContent.classList.remove('hidden');
            return;
        }

        const prompt = `As a financial analyst, review the following income and expense transactions from the last 30 days. 
        Provide a 1-paragraph summary of the financial health. 
        Then, list the top 3 income sources and top 3 expense categories.
        
        Income:
        ${recentIncomes.map(item => `- ${item.description}: $${item.amount}`).join('\n')}
        
        Expenses:
        ${recentExpenses.map(item => `- ${item.description}: $${item.amount}`).join('\n')}
        
        Generate the report.`;
        
        await callGeminiAPI(prompt, financialReportLoading, financialReportContent);
    }

    // --- EVENT LISTENERS ---
    financialsCard.addEventListener('click', () => showScreen(financialsScreen));
    manageClientsCard.addEventListener('click', () => showScreen(clientManagementScreen));
    schedulingCard.addEventListener('click', () => { showScreen(schedulingScreen); setTimeout(initializeCalendar, 0); });
    
    transactionForm.addEventListener('submit', handleAddTransaction);
    newClientForm.addEventListener('submit', addClient);
    
    editClientForm.addEventListener('submit', handleUpdateClient);
    cancelEditButton.addEventListener('click', () => editClientModal.classList.add('hidden'));
    
    addEventForm.addEventListener('submit', handleAddEvent);
    cancelAddEventButton.addEventListener('click', () => addEventModal.classList.add('hidden'));
    
    closeAgendaButton.addEventListener('click', () => dailyAgendaModal.classList.add('hidden'));
    addNewEventFromAgenda.addEventListener('click', () => {
        dailyAgendaModal.classList.add('hidden');
        addEventForm.reset();
        document.getElementById('event-start-date').value = agendaDate.dataset.date;
        addEventModal.classList.remove('hidden');
    });

    clientList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-btn')) openEditModal(target.dataset.id);
        if (target.classList.contains('ai-insights-btn')) generateClientInsights(target.dataset.id);
        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this client?')) {
                handleDeleteClient(target.dataset.id);
            }
        }
    });
}
