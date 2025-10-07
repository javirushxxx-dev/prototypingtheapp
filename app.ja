import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, onSnapshot, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===================================================================================
// PASTE YOUR FIREBASE CONFIG OBJECT HERE
// ===================================================================================
const firebaseConfig = {
    // apiKey: "...",
    // authDomain: "...",
    // projectId: "...",
    // storageBucket: "...",
    // messagingSenderId: "...",
    // appId: "..."
};
// ===================================================================================

// --- Element References ---
const configErrorScreen = document.getElementById('config-error-screen');

// --- IMMEDIATE CONFIG CHECK ---
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("...")) {
    configErrorScreen.classList.remove('hidden');
} else {
    // --- INITIALIZE APP ---
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    let currentUserId = null;
    let calendar; 
    let isCalendarInitialized = false; // Flag to prevent re-initialization

    // --- Get All Other Element References ---
    const authScreen = document.getElementById('auth-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const clientManagementScreen = document.getElementById('client-management-screen');
    const schedulingScreen = document.getElementById('scheduling-screen');
    const allScreens = [authScreen, dashboardScreen, clientManagementScreen, schedulingScreen];
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLink = document.getElementById('show-login-link');
    const authErrorMessage = document.getElementById('auth-error-message');
    const logoutButton = document.getElementById('logout-button');
    
    const manageClientsCard = document.getElementById('manage-clients-card');
    const schedulingCard = document.getElementById('scheduling-card');
    const backToDashboardButton = document.getElementById('back-to-dashboard');
    const backToDashboardFromSchedule = document.getElementById('back-to-dashboard-from-schedule');
    
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

    // --- Navigation ---
    function showScreen(screenToShow) {
        allScreens.forEach(screen => screen.classList.add('hidden'));
        if (screenToShow) {
            screenToShow.classList.remove('hidden');
        }
    }

    // --- Authentication Logic ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            showScreen(dashboardScreen);
            fetchAndDisplayClients();
            loadEvents();
        } else {
            currentUserId = null;
            showScreen(authScreen);
            clientList.innerHTML = '';
            if (calendar) {
                calendar.destroy();
                isCalendarInitialized = false;
            }
        }
    });

    // --- Calendar Initialization & Logic (FIXED!) ---
    function initializeCalendar() {
        if (isCalendarInitialized) return; // Don't re-initialize

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
            dateClick: (info) => {
                addEventForm.reset();
                document.getElementById('event-start-date').value = info.dateStr;
                addEventModal.classList.remove('hidden');
            },
            eventClick: (info) => {
                alert(`Event: ${info.event.title}\n\n(Future feature: Edit/Delete this event)`);
            },
            // This ensures the calendar resizes correctly if the window size changes
            windowResize: function() {
                calendar.updateSize();
            }
        });
        
        calendar.render();
        isCalendarInitialized = true;
    }

    async function handleAddEvent(e) {
        e.preventDefault();
        if (!currentUserId) return;
        const title = addEventForm['event-title'].value;
        const startDate = addEventForm['event-start-date'].value;
        const clientInfo = addEventForm['event-client-select'].value.split('|');
        const clientId = clientInfo[0];
        const clientName = clientInfo[1];
        const finalTitle = clientName ? `${clientName}: ${title}` : title;

        try {
            const userEventsCollection = collection(db, 'users', currentUserId, 'events');
            await addDoc(userEventsCollection, { title: finalTitle, start: startDate, allDay: true, clientId: clientId || null });
            addEventModal.classList.add('hidden');
        } catch (error) { console.error("Error adding event: ", error); }
    }

    function loadEvents() {
        if (!currentUserId) return;
        const userEventsCollection = collection(db, 'users', currentUserId, 'events');
        onSnapshot(userEventsCollection, (snapshot) => {
            const events = snapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title, start: doc.data().start }));
            if(calendar) {
                calendar.removeAllEvents();
                calendar.addEventSource(events);
            }
        });
    }

    // --- Client Management Logic ---
    function fetchAndDisplayClients() {
        if (!currentUserId) return;
        const userClientsCollection = collection(db, 'users', currentUserId, 'clients');
        onSnapshot(userClientsCollection, (snapshot) => {
            clientList.innerHTML = '';
            eventClientSelect.innerHTML = '<option value="">None (General Event)</option>';
            if (snapshot.empty) {
                clientList.innerHTML = `<p class="text-gray-500">No clients yet. Add one!</p>`;
            }
            snapshot.forEach((doc) => {
                const client = doc.data();
                const clientElement = document.createElement('div');
                clientElement.className = 'bg-white p-4 rounded-lg shadow-sm border';
                clientElement.innerHTML = `
                    <div class="flex-grow">
                        <h3 class="font-bold text-lg text-purple-700">${client.name}</h3>
                        <p class="text-gray-600">${client.contact}</p>
                        <p class="text-gray-500 mt-2 text-sm whitespace-pre-wrap">${client.notes || 'No notes.'}</p>
                    </div>
                    <div class="mt-4 pt-4 border-t flex justify-end space-x-2">
                        <button data-id="${doc.id}" class="edit-btn text-sm font-medium text-blue-600 hover:text-blue-800">Edit</button>
                        <button data-id="${doc.id}" class="delete-btn text-sm font-medium text-red-600 hover:text-red-800">Delete</button>
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
        const clientName = document.getElementById('client-name').value;
        const clientContact = document.getElementById('client-contact').value;
        const clientNotes = document.getElementById('client-notes').value;
        if (clientName && clientContact) {
            try {
                const userClientsCollection = collection(db, 'users', currentUserId, 'clients');
                await addDoc(userClientsCollection, { name: clientName, contact: clientContact, notes: clientNotes, createdAt: new Date() });
                newClientForm.reset();
            } catch (err) { console.error("Error adding document: ", err); }
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

    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', async(e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, loginForm['login-email'].value, loginForm['login-password'].value); loginForm.reset(); authErrorMessage.textContent = ''; } catch (err) { authErrorMessage.textContent = err.message; } });
    signupForm.addEventListener('submit', async(e) => { e.preventDefault(); try { await createUserWithEmailAndPassword(auth, signupForm['signup-email'].value, signupForm['signup-password'].value); signupForm.reset(); authErrorMessage.textContent = ''; } catch (err) { authErrorMessage.textContent = err.message; } });
    logoutButton.addEventListener('click', () => signOut(auth));
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('hidden'); signupForm.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

    // Navigation
    manageClientsCard.addEventListener('click', () => showScreen(clientManagementScreen));
    backToDashboardButton.addEventListener('click', () => showScreen(dashboardScreen));
    backToDashboardFromSchedule.addEventListener('click', () => showScreen(dashboardScreen));
    
    // CALENDAR FIX: Initialize the calendar only when the card is clicked.
    schedulingCard.addEventListener('click', () => {
        showScreen(schedulingScreen);
        // Use a short timeout to ensure the element is visible before rendering
        setTimeout(() => {
            initializeCalendar();
        }, 0);
    });

    // Client Actions
    newClientForm.addEventListener('submit', addClient);
    editClientForm.addEventListener('submit', handleUpdateClient);
    cancelEditButton.addEventListener('click', () => editClientModal.classList.add('hidden'));
    clientList.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) openEditModal(e.target.dataset.id);
        if (e.target.classList.contains('delete-btn')) {
            const btn = e.target;
            if (btn.dataset.confirming) {
                handleDeleteClient(btn.dataset.id);
            } else {
                document.querySelectorAll('.delete-btn[data-confirming="true"]').forEach(b => { b.textContent = 'Delete'; delete b.dataset.confirming; });
                btn.textContent = 'Confirm?';
                btn.dataset.confirming = 'true';
            }
        }
    });

    // Schedule Actions
    addEventForm.addEventListener('submit', handleAddEvent);
    cancelAddEventButton.addEventListener('click', () => addEventModal.classList.add('hidden'));
}

