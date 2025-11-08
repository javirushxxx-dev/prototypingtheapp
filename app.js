import { initializeApp as initializeFirebaseApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, onSnapshot, getDoc, updateDoc, deleteDoc, query, orderBy, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyB8dE-UottjPS0dF92H9pfNLO_PcGU05dE", 
    authDomain: "prototypingtheapp.firebaseapp.com", 
    projectId: "prototypingtheapp", 
    storageBucket: "prototypingtheapp.appspot.com", 
    messagingSenderId: "732357781797", 
    appId: "1:732357781797:web:0ff864827857c15b8312cc", 
    measurementId: "G-VSTGVPP0GD"
};

// This uses the key from your secure config.js file
// @ts-ignore (ignore "cannot find name" error for GEMINI_API_KEY)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing App');
    initializeApp();
});

function initializeApp() {
    const configErrorScreen = document.getElementById('config-error-screen');
    
    // @ts-ignore (ignore "cannot find name" error for GEMINI_API_KEY)
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("...") || !GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
        if (configErrorScreen) {
            configErrorScreen.classList.remove('hidden');
            let missing = [];
            if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("...")) {
                missing.push("Firebase Config in app.js");
            }
            // @ts-ignore (ignore "cannot find name" error for GEMINI_API_KEY)
            if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
                missing.push("Gemini API Key in config.js");
            }
            const errorDetails = document.createElement('div');
            errorDetails.innerHTML = `Please add your:<br/><strong>${missing.join('<br/>')}</strong>`;
            errorDetails.className = 'text-lg bg-red-800 p-4 rounded-lg mt-4';
            configErrorScreen.querySelector('div').appendChild(errorDetails);
        }
        return;
    }

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    let currentUserId = null;
    let calendar; 
    let isCalendarInitialized = false;
    let allUserEvents = [];
    let allIncomes = [];
    let allExpenses = [];

    // Set up authentication state listener
    onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'No user');
        if (user) {
            currentUserId = user.uid;
            showScreen('dashboard-screen');
            fetchAndDisplayClients();
            loadEvents();
            fetchAndDisplayTransactions();
        } else {
            currentUserId = null;
            showScreen('auth-screen');
            if (calendar) {
                calendar.destroy();
                isCalendarInitialized = false;
            }
        }
    });

    // Set up all event listeners
    setupEventListeners();

    function setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Auth elements
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const showSignupLink = document.getElementById('show-signup-link');
        const showLoginLink = document.getElementById('show-login-link');
        const logoutButton = document.getElementById('logout-button');

        // Navigation elements
        const manageClientsCard = document.getElementById('manage-clients-card');
        const schedulingCard = document.getElementById('scheduling-card');
        const financialsCard = document.getElementById('financials-card');

        // Auth form switching
        if (showSignupLink) {
            showSignupLink.addEventListener('click', (e) => { 
                e.preventDefault(); 
                console.log('Show signup clicked');
                switchToSignup();
            });
        }

        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => { 
                e.preventDefault(); 
                console.log('Show login clicked');
                switchToLogin();
            });
        }

        // Form submissions
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        if (signupForm) {
            signupForm.addEventListener('submit', handleSignup);
        }

        if (logoutButton) {
            logoutButton.addEventListener('click', () => signOut(auth));
        }

        // Navigation cards
        if (financialsCard) {
            financialsCard.addEventListener('click', () => showScreen('financials-screen'));
        }

        if (manageClientsCard) {
            manageClientsCard.addEventListener('click', () => showScreen('client-management-screen'));
        }

        if (schedulingCard) {
            schedulingCard.addEventListener('click', () => { 
                showScreen('scheduling-screen'); 
                setTimeout(initializeCalendar, 0); 
            });
        }

        // Back to dashboard buttons
        document.querySelectorAll('.back-to-dashboard').forEach(btn => {
            btn.addEventListener('click', () => showScreen('dashboard-screen'));
        });

        // Form submissions
        const newClientForm = document.getElementById('new-client-form');
        const editClientForm = document.getElementById('edit-client-form');
        const transactionForm = document.getElementById('transaction-form');
        const addEventForm = document.getElementById('add-event-form');

        if (transactionForm) {
            transactionForm.addEventListener('submit', handleAddTransaction);
        }

        if (newClientForm) {
            newClientForm.addEventListener('submit', addClient);
        }

        if (editClientForm) {
            editClientForm.addEventListener('submit', handleUpdateClient);
        }

        if (addEventForm) {
            addEventForm.addEventListener('submit', handleAddEvent);
        }

        // Modal controls
        const cancelEditButton = document.getElementById('cancel-edit-button');
        const cancelAddEventButton = document.getElementById('cancel-add-event-button');
        const closeAgendaButton = document.getElementById('close-agenda-button');
        const addNewEventFromAgenda = document.getElementById('add-new-event-from-agenda');

        if (cancelEditButton) {
            cancelEditButton.addEventListener('click', () => {
                document.getElementById('edit-client-modal').classList.add('hidden');
            });
        }

        if (cancelAddEventButton) {
            cancelAddEventButton.addEventListener('click', () => {
                document.getElementById('add-event-modal').classList.add('hidden');
            });
        }

        if (closeAgendaButton) {
            closeAgendaButton.addEventListener('click', () => {
                document.getElementById('daily-agenda-modal').classList.add('hidden');
            });
        }

        if (addNewEventFromAgenda) {
            addNewEventFromAgenda.addEventListener('click', () => {
                document.getElementById('daily-agenda-modal').classList.add('hidden');
                addEventForm.reset();
                document.getElementById('event-start-date').value = document.getElementById('agenda-date').dataset.date;
                document.getElementById('add-event-modal').classList.remove('hidden');
            });
        }

        // Client list interactions
        const clientList = document.getElementById('client-list');
        if (clientList) {
            clientList.addEventListener('click', handleClientListClick);
        }

        // AI features
        const generateFinancialReportButton = document.getElementById('generate-financial-report-button');
        if (generateFinancialReportButton) {
            generateFinancialReportButton.addEventListener('click', generateFinancialReport);
        }

        const closeClientInsightsButton = document.getElementById('close-client-insights-button');
        if (closeClientInsightsButton) {
            closeClientInsightsButton.addEventListener('click', () => {
                document.getElementById('client-insights-modal').classList.add('hidden');
            });
        }

        const closeFinancialReportButton = document.getElementById('close-financial-report-button');
        if (closeFinancialReportButton) {
            closeFinancialReportButton.addEventListener('click', () => {
                document.getElementById('financial-report-modal').classList.add('hidden');
            });
        }

        console.log('Event listeners setup complete');
    }

    // --- Authentication Functions ---
    async function handleLogin(e) { 
        e.preventDefault(); 
        const authErrorMessage = document.getElementById('auth-error-message');
        const loginForm = document.getElementById('login-form');
        authErrorMessage.textContent = '';
        try { 
            await signInWithEmailAndPassword(auth, loginForm['login-email'].value, loginForm['login-password'].value); 
            loginForm.reset(); 
        } catch (err) { 
            console.error('Login error:', err);
            authErrorMessage.textContent = err.message; 
        } 
    }

    async function handleSignup(e) { 
        e.preventDefault(); 
        const authErrorMessage = document.getElementById('auth-error-message');
        const signupForm = document.getElementById('signup-form');
        authErrorMessage.textContent = '';
        try { 
            console.log('Attempting signup with:', signupForm['signup-email'].value);
            await createUserWithEmailAndPassword(auth, signupForm['signup-email'].value, signupForm['signup-password'].value); 
            console.log('Signup successful');
            signupForm.reset(); 
        } catch (err) { 
            console.error('Signup error:', err);
            authErrorMessage.textContent = err.message; 
        } 
    }

    function switchToSignup() {
        console.log('Switching to signup form');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        if (loginForm && signupForm) {
            loginForm.classList.add('hidden'); 
            signupForm.classList.remove('hidden');
            console.log('Forms switched successfully');
        } else {
            console.error('Form elements not found');
        }
    }

    function switchToLogin() {
        console.log('Switching to login form');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        if (loginForm && signupForm) {
            signupForm.classList.add('hidden'); 
            loginForm.classList.remove('hidden');
            console.log('Forms switched successfully');
        } else {
            console.error('Form elements not found');
        }
    }

    // --- Navigation ---
    function showScreen(screenId) {
        console.log('Showing screen:', screenId);
        const allScreens = Array.from(document.querySelectorAll('.screen'));
        allScreens.forEach(screen => {
            screen.classList.add('hidden');
            console.log('Hiding screen:', screen.id);
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            console.log('Screen shown:', screenId);
        } else {
            console.error('Target screen not found:', screenId);
        }
    }

    // --- Dashboard Summary ---
    function updateDashboardSummary() {
        const dashboardProfitEl = document.getElementById('dashboard-profit');
        if (!dashboardProfitEl) return;

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
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
            height: '100%',
            nowIndicator: true,
            selectable: true,
            dateClick: (info) => {
                const addEventForm = document.getElementById('add-event-form');
                addEventForm.reset();
                const isoString = info.date.toISOString();
                document.getElementById('event-start-date').value = isoString.substring(0, 10);
                const timeInput = document.getElementById('event-start-time');
                if (timeInput) {
                    timeInput.value = isoString.substring(11, 16);
                }
                document.getElementById('add-event-modal').classList.remove('hidden');
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
        
        const title = document.getElementById('event-title').value;
        const startDate = document.getElementById('event-start-date').value;
        const timeInput = document.getElementById('event-start-time');
        const startTime = timeInput ? timeInput.value : '09:00';
        const eventClientSelect = document.getElementById('event-client-select');
        const [clientId, clientName] = eventClientSelect.value.split('|');
        
        if (!title || !startDate) {
            alert("Please fill in the description and date.");
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
            document.getElementById('add-event-modal').classList.add('hidden');
        } catch (error) { 
            console.error("Error adding event: ", error); 
        }
    }

    function loadEvents() {
        if (!currentUserId) return;
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
        
        const transactionForm = document.getElementById('transaction-form');
        const type = transactionForm.type.value;
        const description = transactionForm.description.value;
        const amount = parseFloat(transactionForm.amount.value);
        const date = transactionForm.date.value;
        
        if (!description || isNaN(amount) || !date) { 
            alert("Please fill out all fields."); 
            return; 
        }

        const collectionName = type === 'income' ? 'income' : 'expenses';
        try {
            await addDoc(collection(db, 'users', currentUserId, collectionName), { description, amount, date });
            transactionForm.reset();
        } catch (error) { 
            console.error("Error adding transaction: ", error); 
        }
    }

    function fetchAndDisplayTransactions() {
        if (!currentUserId) return;
        const incomeQuery = query(collection(db, 'users', currentUserId, 'income'), orderBy('date', 'desc'));
        const expensesQuery = query(collection(db, 'users', currentUserId, 'expenses'), orderBy('date', 'desc'));

        onSnapshot(incomeQuery, (snapshot) => {
            allIncomes = snapshot.docs.map(doc => doc.data());
            const incomeList = document.getElementById('income-list');
            if (incomeList) {
                incomeList.innerHTML = allIncomes.map(item => `
                    <div class="flex justify-between items-center p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                        <div><p class="font-medium">${item.description}</p><p class="text-xs text-slate-500 dark:text-slate-400">${item.date}</p></div>
                        <p class="font-semibold text-green-600 dark:text-green-400">+$${item.amount.toFixed(2)}</p>
                    </div>`).join('') || `<p class="text-slate-500 text-sm">No income logged yet.</p>`;
            }
            updateFinancialSummary(allIncomes, allExpenses);
        });

        onSnapshot(expensesQuery, (snapshot) => {
            allExpenses = snapshot.docs.map(doc => doc.data());
            const expenseList = document.getElementById('expense-list');
            if (expenseList) {
                expenseList.innerHTML = allExpenses.map(item => `
                    <div class="flex justify-between items-center p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                        <div><p class="font-medium">${item.description}</p><p class="text-xs text-slate-500 dark:text-slate-400">${item.date}</p></div>
                        <p class="font-semibold text-red-600 dark:text-red-400">-$${item.amount.toFixed(2)}</p>
                    </div>`).join('') || `<p class="text-slate-500 text-sm">No expenses logged yet.</p>`;
            }
            updateFinancialSummary(allIncomes, allExpenses);
        });
    }

    function updateFinancialSummary(incomes, expenses) {
        const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
        const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
        const netProfit = totalIncome - totalExpenses;
        const taxEstimate = netProfit > 0 ? netProfit * 0.20 : 0;

        const totalIncomeEl = document.getElementById('total-income');
        const totalExpensesEl = document.getElementById('total-expenses');
        const netProfitEl = document.getElementById('net-profit');
        const taxEstimateEl = document.getElementById('tax-estimate');

        if (totalIncomeEl) totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
        if (totalExpensesEl) totalExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
        if (netProfitEl) netProfitEl.textContent = `$${netProfit.toFixed(2)}`;
        if (taxEstimateEl) taxEstimateEl.textContent = `$${taxEstimate.toFixed(2)}`;
        
        if (netProfitEl) {
            netProfitEl.classList.toggle('text-green-500', netProfit >= 0);
            netProfitEl.classList.toggle('dark:text-green-400', netProfit >= 0);
            netProfitEl.classList.toggle('text-red-500', netProfit < 0);
            netProfitEl.classList.toggle('dark:text-red-400', netProfit < 0);
        }
        
        updateDashboardSummary();
    }

    // --- Client Management Logic ---
    function fetchAndDisplayClients() {
        if (!currentUserId) return;
        onSnapshot(collection(db, 'users', currentUserId, 'clients'), (snapshot) => {
            const clientList = document.getElementById('client-list');
            const eventClientSelect = document.getElementById('event-client-select');
            
            if (clientList) clientList.innerHTML = '';
            if (eventClientSelect) eventClientSelect.innerHTML = '<option value="|None">None (General Event)</option>';
            
            snapshot.forEach((doc) => {
                const client = doc.data();
                if (clientList) {
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
                }
                
                if (eventClientSelect) {
                    const optionElement = document.createElement('option');
                    optionElement.value = `${doc.id}|${client.name}`;
                    optionElement.textContent = client.name;
                    eventClientSelect.appendChild(optionElement);
                }
            });
        });
    }

    async function addClient(e) {
        e.preventDefault();
        if (!currentUserId) return;
        
        const newClientForm = document.getElementById('new-client-form');
        const clientName = newClientForm['client-name'].value;
        const clientContact = newClientForm['client-contact'].value;
        const clientNotes = newClientForm['client-notes'].value;
        
        if (clientName && clientContact) {
            try {
                await addDoc(collection(db, 'users', currentUserId, 'clients'), { name: clientName, contact: clientContact, notes: clientNotes });
                newClientForm.reset();
            } catch (err) { 
                console.error("Error adding client: ", err); 
            }
        }
    }
    
    async function openEditModal(clientId) {
        const clientRef = doc(db, 'users', currentUserId, 'clients', clientId);
        const docSnap = await getDoc(clientRef);
        if (docSnap.exists()) {
            const client = docSnap.data();
            document.getElementById('edit-client-id').value = clientId;
            document.getElementById('edit-client-name').value = client.name;
            document.getElementById('edit-client-contact').value = client.contact;
            document.getElementById('edit-client-notes').value = client.notes;
            document.getElementById('edit-client-modal').classList.remove('hidden');
        }
    }

    async function handleUpdateClient(e) {
        e.preventDefault();
        const clientId = document.getElementById('edit-client-id').value;
        const clientRef = doc(db, 'users', currentUserId, 'clients', clientId);
        await updateDoc(clientRef, {
            name: document.getElementById('edit-client-name').value,
            contact: document.getElementById('edit-client-contact').value,
            notes: document.getElementById('edit-client-notes').value,
        });
        document.getElementById('edit-client-modal').classList.add('hidden');
    }

    async function handleDeleteClient(clientId) {
        const clientRef = doc(db, 'users', currentUserId, 'clients', clientId);
        await deleteDoc(clientRef);
    }

    function handleClientListClick(e) {
        const target = e.target;
        if (target.classList.contains('edit-btn')) openEditModal(target.dataset.id);
        if (target.classList.contains('ai-insights-btn')) generateClientInsights(target.dataset.id);
        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this client?')) {
                handleDeleteClient(target.dataset.id);
            }
        }
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
        const clientInsightsModal = document.getElementById('client-insights-modal');
        const clientInsightsLoading = document.getElementById('client-insights-loading');
        const clientInsightsContent = document.getElementById('client-insights-content');
        
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
        const financialReportModal = document.getElementById('financial-report-modal');
        const financialReportLoading = document.getElementById('financial-report-loading');
        const financialReportContent = document.getElementById('financial-report-content');
        
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
}