// Initial mock data if empty
const DEFAULT_TESTS = [
    {
        id: "test-1",
        title: "Introduction to JavaScript & ES6",
        subject: "Web Development",
        description: "Core concepts of JavaScript, closures, promises, async/await, and modern ES6 features.",
        duration: 30,
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

function getStudentResults() {
    const raw = localStorage.getItem('testlancer_student_results');
    try {
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // User profile
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

    const allTests = getStoredTests();
    // Student only sees Active tests
    const activeTests = allTests.filter(t => t.status === 'Active');
    const studentResults = getStudentResults();

    const testsListContainer = document.getElementById('tests-list-container');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const subjectFilter = document.getElementById('subject-filter');

    // Stats
    const statAvailableTests = document.getElementById('stat-available-tests');
    const statCompletedTests = document.getElementById('stat-completed-tests');
    const statAvgScore = document.getElementById('stat-avg-score');

    if (statAvailableTests) statAvailableTests.textContent = activeTests.length;
    if (statCompletedTests) statCompletedTests.textContent = studentResults.length;
    if (statAvgScore) {
        if (studentResults.length > 0) {
            const sum = studentResults.reduce((acc, r) => acc + (r.scorePercent || 0), 0);
            statAvgScore.textContent = Math.round(sum / studentResults.length) + '%';
        } else {
            statAvgScore.textContent = '--';
        }
    }

    // Populate Subjects
    const subjects = Array.from(new Set(activeTests.map(t => t.subject).filter(Boolean)));
    subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        subjectFilter.appendChild(opt);
    });

    function renderTests() {
        const query = (searchInput?.value || '').toLowerCase().trim();
        const selectedSubject = subjectFilter?.value || 'all';

        const filtered = activeTests.filter(t => {
            const matchesQuery = t.title.toLowerCase().includes(query) ||
                (t.subject && t.subject.toLowerCase().includes(query)) ||
                (t.description && t.description.toLowerCase().includes(query));
            const matchesSubject = selectedSubject === 'all' || t.subject === selectedSubject;
            return matchesQuery && matchesSubject;
        });

        if (filtered.length === 0) {
            testsListContainer.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        testsListContainer.innerHTML = filtered.map(test => {
            const isCompleted = studentResults.some(r => r.testId === test.id);
            const resultInfo = studentResults.find(r => r.testId === test.id);

            return `
                <div class="test-card">
                    <div>
                        <span class="test-badge-subject">${escapeHtml(test.subject || 'General')}</span>
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
                            ${isCompleted ? `
                                <div class="meta-item" style="color: #16a34a; font-weight: 600;">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Score: ${resultInfo.scorePercent}%</span>
                                </div>
                            ` : ''}
                        </div>

                        <div class="test-card-actions">
                            <a href="/take-test?id=${test.id}" class="btn btn-primary">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                <span>${isCompleted ? 'Retake Test' : 'Take Test'}</span>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    if (searchInput) searchInput.addEventListener('input', renderTests);
    if (subjectFilter) subjectFilter.addEventListener('change', renderTests);

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
