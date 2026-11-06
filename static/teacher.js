document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const testsContainer = document.getElementById('tests-list-container');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const statTotalTests = document.getElementById('stat-total-tests');
    const statTotalSubmissions = document.getElementById('stat-total-submissions');
    const statActiveTests = document.getElementById('stat-active-tests');
    const logoutBtn = document.getElementById('logout-btn');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    // Delete modal elements
    const deleteModal = document.getElementById('delete-modal');
    const deleteTestTitle = document.getElementById('delete-test-title');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // Submissions modal elements
    const submissionsModal = document.getElementById('submissions-modal');
    const submissionsTestTitle = document.getElementById('submissions-test-title');
    const submissionsTableBody = document.getElementById('submissions-table-body');
    const noSubmissionsMsg = document.getElementById('no-submissions-msg');
    const closeSubmissionsBtn = document.getElementById('close-submissions-btn');

    let testsData = [];
    let testToDeleteId = null;

    // Load User info
    async function loadUser() {
        try {
            const resp = await fetch('/api/me');
            if (resp.ok) {
                const data = await resp.json();
                if (data.user) {
                    if (userName) userName.textContent = data.user.name;
                    if (userAvatar && data.user.avatar) userAvatar.src = data.user.avatar;
                }
            }
        } catch (e) {
            console.error('Error fetching user:', e);
        }
    }

    // Load Stats
    async function loadStats() {
        try {
            const resp = await fetch('/api/teacher/stats');
            if (resp.ok) {
                const data = await resp.json();
                const stats = data.stats || {};
                if (statTotalTests) statTotalTests.textContent = stats.total_tests || 0;
                if (statTotalSubmissions) statTotalSubmissions.textContent = stats.total_submissions || 0;
                if (statActiveTests) statActiveTests.textContent = stats.active_tests || 0;
            }
        } catch (e) {
            console.error('Error loading stats:', e);
        }
    }

    // Load Tests
    async function loadTests() {
        try {
            const resp = await fetch('/api/teacher/tests');
            if (resp.ok) {
                const data = await resp.json();
                testsData = data.tests || [];
                renderTests();
            }
        } catch (e) {
            console.error('Error loading tests:', e);
        }
    }

    // Render Tests List
    function renderTests() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const selectedStatus = statusFilter ? statusFilter.value : 'all';

        const filtered = testsData.filter(test => {
            const matchesQuery = 
                (test.title && test.title.toLowerCase().includes(query)) ||
                (test.subject && test.subject.toLowerCase().includes(query)) ||
                (test.description && test.description.toLowerCase().includes(query));
            
            const matchesStatus = (selectedStatus === 'all') || (test.status === selectedStatus);
            return matchesQuery && matchesStatus;
        });

        if (filtered.length === 0) {
            if (testsContainer) testsContainer.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (testsContainer) {
            testsContainer.innerHTML = filtered.map(test => createTestCardHTML(test)).join('');
            attachCardEventListeners();
        }
    }

    function createTestCardHTML(test) {
        const statusClass = test.status === 'Active' ? 'badge-success' : (test.status === 'Draft' ? 'badge-warning' : 'badge-neutral');
        const avgScore = test.avg_score || 0;

        return `
            <div class="test-card" data-id="${test.id}">
                <div class="test-card-header">
                    <span class="test-subject">${escapeHtml(test.subject || 'General')}</span>
                    <span class="badge ${statusClass}">${escapeHtml(test.status || 'Active')}</span>
                </div>
                <h3 class="test-title">${escapeHtml(test.title || 'Untitled Test')}</h3>
                <p class="test-desc">${escapeHtml(test.description || 'No description provided for this test.')}</p>
                
                <div class="test-meta">
                    <div class="meta-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
                        <span>${test.duration || 30} mins</span>
                    </div>
                    <div class="meta-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span>${test.questions_count || 0} Questions</span>
                    </div>
                    <div class="meta-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        <span>${test.submissions_count || 0} taken</span>
                    </div>
                    <div class="meta-item">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span>Avg: ${avgScore}%</span>
                    </div>
                </div>

                <div class="test-card-footer">
                    <span class="test-date">${escapeHtml(test.created_at_str || 'Recently')}</span>
                    <div class="card-actions">
                        <button class="btn btn-outline btn-sm view-submissions-btn" data-id="${test.id}" data-title="${escapeHtml(test.title)}">Submissions</button>
                        <a href="/create-test?id=${test.id}" class="btn-icon-action edit-btn" title="Edit Test">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </a>
                        <button class="btn-icon-action delete-btn" data-id="${test.id}" data-title="${escapeHtml(test.title)}" title="Delete Test">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function attachCardEventListeners() {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                testToDeleteId = btn.getAttribute('data-id');
                const title = btn.getAttribute('data-title');
                if (deleteTestTitle) deleteTestTitle.textContent = `"${title}"`;
                if (deleteModal) deleteModal.style.display = 'flex';
            });
        });

        document.querySelectorAll('.view-submissions-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const testId = btn.getAttribute('data-id');
                const testTitle = btn.getAttribute('data-title');
                openSubmissionsModal(testId, testTitle);
            });
        });
    }

    async function openSubmissionsModal(testId, testTitle) {
        if (submissionsTestTitle) submissionsTestTitle.textContent = `Submissions for "${testTitle}"`;
        if (submissionsTableBody) submissionsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Loading submissions...</td></tr>';
        if (noSubmissionsMsg) noSubmissionsMsg.style.display = 'none';
        if (submissionsModal) submissionsModal.style.display = 'flex';

        try {
            const resp = await fetch(`/api/teacher/tests/${testId}/submissions`);
            if (resp.ok) {
                const data = await resp.json();
                const list = data.submissions || [];
                if (list.length === 0) {
                    if (submissionsTableBody) submissionsTableBody.innerHTML = '';
                    if (noSubmissionsMsg) noSubmissionsMsg.style.display = 'block';
                } else {
                    if (noSubmissionsMsg) noSubmissionsMsg.style.display = 'none';
                    if (submissionsTableBody) {
                        submissionsTableBody.innerHTML = list.map(sub => `
                            <tr>
                                <td>
                                    <div class="table-student-info">
                                        <img src="${sub.student_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + sub.student_email}" class="table-avatar" alt="Avatar">
                                        <div>
                                            <div class="table-name">${escapeHtml(sub.student_name || 'Student')}</div>
                                            <div class="table-email">${escapeHtml(sub.student_email || '')}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><strong>${sub.score}</strong> / ${sub.total_points}</td>
                                <td>${sub.percentage}%</td>
                                <td>
                                    <span class="badge ${sub.passed ? 'badge-success' : 'badge-danger'}">
                                        ${sub.passed ? 'Passed' : 'Failed'}
                                    </span>
                                </td>
                                <td>${sub.time_spent_str || sub.time_spent + 's'}</td>
                                <td>${escapeHtml(sub.created_at_str || '')}</td>
                            </tr>
                        `).join('');
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching submissions:', e);
            if (submissionsTableBody) submissionsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Failed to load submissions.</td></tr>';
        }
    }

    // Modal Close Events
    if (closeSubmissionsBtn) {
        closeSubmissionsBtn.addEventListener('click', () => {
            if (submissionsModal) submissionsModal.style.display = 'none';
        });
    }

    if (submissionsModal) {
        submissionsModal.addEventListener('click', (e) => {
            if (e.target === submissionsModal) submissionsModal.style.display = 'none';
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            if (deleteModal) deleteModal.style.display = 'none';
            testToDeleteId = null;
        });
    }

    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                deleteModal.style.display = 'none';
                testToDeleteId = null;
            }
        });
    }

    // Confirm Delete Test
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!testToDeleteId) return;

            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = 'Deleting...';

            try {
                const resp = await fetch(`/api/teacher/tests/${testToDeleteId}`, {
                    method: 'DELETE'
                });

                if (resp.ok) {
                    if (deleteModal) deleteModal.style.display = 'none';
                    await loadTests();
                    await loadStats();
                } else {
                    const data = await resp.json();
                    alert(data.error || 'Failed to delete test');
                }
            } catch (err) {
                console.error('Delete error:', err);
                alert('An error occurred while deleting the test.');
            } finally {
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.textContent = 'Delete';
                testToDeleteId = null;
            }
        });
    }

    // Filters
    if (searchInput) searchInput.addEventListener('input', renderTests);
    if (statusFilter) statusFilter.addEventListener('change', renderTests);

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initial Load
    loadUser();
    loadStats();
    loadTests();
});
