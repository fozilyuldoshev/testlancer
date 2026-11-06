// Initial mock data if empty
const DEFAULT_TESTS = [
    {
        id: "test-1",
        title: "Introduction to JavaScript & ES6",
        subject: "Web Development",
        description: "Core concepts of JavaScript, closures, promises, async/await, and modern ES6 features.",
        duration: 30, // in minutes
        status: "Active",
        submissionsCount: 28,
        createdAt: "2026-10-15",
        questions: [
            {
                id: "q1",
                question: "What is the output of `typeof null` in JavaScript?",
                options: ["null", "undefined", "object", "number"],
                correctAnswer: 2
            },
            {
                id: "q2",
                question: "Which keyword creates a block-scoped variable?",
                options: ["var", "let", "global", "def"],
                correctAnswer: 1
            },
            {
                id: "q3",
                question: "What does `Promise.all()` return if one promise rejects?",
                options: ["An array of errors", "The rejected promise error immediately", "Undefined", "Null"],
                correctAnswer: 1
            }
        ]
    },
    {
        id: "test-2",
        title: "Python Data Structures & Algorithms",
        subject: "Computer Science",
        description: "Assessing knowledge of lists, dicts, tuples, sets, time complexity, and tree traversal.",
        duration: 45,
        status: "Active",
        submissionsCount: 42,
        createdAt: "2026-10-20",
        questions: [
            {
                id: "q1",
                question: "What is the average time complexity of searching a key in a Python dict?",
                options: ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
                correctAnswer: 2
            },
            {
                id: "q2",
                question: "Which of the following data structures is immutable?",
                options: ["list", "set", "dict", "tuple"],
                correctAnswer: 3
            }
        ]
    },
    {
        id: "test-3",
        title: "Relational Database & SQL Basics",
        subject: "Database Management",
        description: "Queries, joins, indexing, primary & foreign keys, normalization concepts.",
        duration: 25,
        status: "Draft",
        submissionsCount: 0,
        createdAt: "2026-11-01",
        questions: [
            {
                id: "q1",
                question: "Which SQL clause is used to filter rows after an aggregation?",
                options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
                correctAnswer: 1
            }
        ]
    }
];

function getStoredTests() {
    const raw = localStorage.getItem('testlancer_tests');
    if (!raw) {
        localStorage.setItem('testlancer_tests', JSON.stringify(DEFAULT_TESTS));
        return DEFAULT_TESTS;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        return DEFAULT_TESTS;
    }
}

function saveTests(tests) {
    localStorage.setItem('testlancer_tests', JSON.stringify(tests));
}

document.addEventListener('DOMContentLoaded', () => {
    // Check user info
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.name) {
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = user.name;
    }
    if (user.avatar) {
        const userAvatarEl = document.getElementById('user-avatar');
        if (userAvatarEl) userAvatarEl.src = user.avatar;
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = '/login';
        });
    }

    let tests = getStoredTests();
    let testToDeleteId = null;

    const testsListContainer = document.getElementById('tests-list-container');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');

    // Stats elements
    const statTotalTests = document.getElementById('stat-total-tests');
    const statTotalSubmissions = document.getElementById('stat-total-submissions');
    const statActiveTests = document.getElementById('stat-active-tests');

    // Modal elements
    const deleteModal = document.getElementById('delete-modal');
    const deleteTestTitle = document.getElementById('delete-test-title');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    function updateStats() {
        const total = tests.length;
        const totalSubs = tests.reduce((acc, t) => acc + (t.submissionsCount || 0), 0);
        const active = tests.filter(t => t.status === 'Active').length;

        if (statTotalTests) statTotalTests.textContent = total;
        if (statTotalSubmissions) statTotalSubmissions.textContent = totalSubs;
        if (statActiveTests) statActiveTests.textContent = active;
    }

    function renderTests() {
        const query = (searchInput?.value || '').toLowerCase().trim();
        const statusVal = statusFilter?.value || 'all';

        const filtered = tests.filter(t => {
            const matchesQuery = t.title.toLowerCase().includes(query) ||
                (t.subject && t.subject.toLowerCase().includes(query)) ||
                (t.description && t.description.toLowerCase().includes(query));
            const matchesStatus = statusVal === 'all' || t.status === statusVal;
            return matchesQuery && matchesStatus;
        });

        updateStats();

        if (filtered.length === 0) {
            testsListContainer.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        testsListContainer.innerHTML = filtered.map(test => {
            const statusClass = test.status === 'Active' 
                ? 'status-active' 
                : (test.status === 'Draft' ? 'status-draft' : 'status-closed');
            
            return `
                <div class="test-card" data-id="${test.id}">
                    <div>
                        <div class="test-card-header">
                            <span class="test-badge-status ${statusClass}">${test.status}</span>
                            <span style="font-size: 12px; color: #94a3b8; font-weight: 500;">${test.createdAt || 'Recent'}</span>
                        </div>
                        <h2 class="test-title">${escapeHtml(test.title)}</h2>
                        <p class="test-description">${escapeHtml(test.description || 'No description provided.')}</p>
                    </div>

                    <div>
                        <div class="test-meta">
                            <div class="meta-item">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
                                <span>${test.duration} min</span>
                            </div>
                            <div class="meta-item">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                <span>${test.questions ? test.questions.length : 0} Questions</span>
                            </div>
                            <div class="meta-item">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                <span>${test.submissionsCount || 0} Submissions</span>
                            </div>
                        </div>

                        <div class="test-card-actions">
                            <a href="/create-test?id=${test.id}" class="btn btn-sm btn-edit">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                <span>Edit</span>
                            </a>
                            <button type="button" class="btn btn-sm btn-delete" onclick="openDeleteModal('${test.id}')">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.openDeleteModal = function(id) {
        const test = tests.find(t => t.id === id);
        if (!test) return;
        testToDeleteId = id;
        deleteTestTitle.textContent = test.title;
        deleteModal.style.display = 'flex';
    };

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.style.display = 'none';
            testToDeleteId = null;
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (testToDeleteId) {
                tests = tests.filter(t => t.id !== testToDeleteId);
                saveTests(tests);
                renderTests();
                deleteModal.style.display = 'none';
                testToDeleteId = null;
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', renderTests);
    if (statusFilter) statusFilter.addEventListener('change', renderTests);

    renderTests();
});

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
