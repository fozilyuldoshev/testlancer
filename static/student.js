document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const testsContainer = document.getElementById('tests-list-container');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const subjectFilter = document.getElementById('subject-filter');
    const statAvailableTests = document.getElementById('stat-available-tests');
    const statCompletedTests = document.getElementById('stat-completed-tests');
    const statAvgScore = document.getElementById('stat-avg-score');
    const statRank = document.getElementById('stat-rank');
    const logoutBtn = document.getElementById('logout-btn');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    // Tabs
    const tabTests = document.getElementById('tab-tests');
    const tabLeaderboard = document.getElementById('tab-leaderboard');
    const testsView = document.getElementById('tests-view-container');
    const leaderboardView = document.getElementById('leaderboard-view-container');
    const leaderboardTableBody = document.getElementById('leaderboard-table-body');
    const emptyLeaderboard = document.getElementById('empty-leaderboard');

    let testsData = [];
    let leaderboardData = [];

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
            const resp = await fetch('/api/student/stats');
            if (resp.ok) {
                const data = await resp.json();
                const stats = data.stats || {};
                if (statAvailableTests) statAvailableTests.textContent = stats.available_tests || 0;
                if (statCompletedTests) statCompletedTests.textContent = stats.completed_tests || 0;
                if (statAvgScore) statAvgScore.textContent = `${stats.avg_score || 0}%`;
                if (statRank) statRank.textContent = stats.rank || '-';
            }
        } catch (e) {
            console.error('Error loading stats:', e);
        }
    }

    // Load Tests
    async function loadTests() {
        try {
            const resp = await fetch('/api/student/tests');
            if (resp.ok) {
                const data = await resp.json();
                testsData = data.tests || [];
                populateSubjectFilter();
                renderTests();
            }
        } catch (e) {
            console.error('Error loading tests:', e);
        }
    }

    // Populate Subjects Filter
    function populateSubjectFilter() {
        if (!subjectFilter) return;
        const currentVal = subjectFilter.value;
        const subjects = Array.from(new Set(testsData.map(t => t.subject).filter(Boolean)));
        
        subjectFilter.innerHTML = '<option value="all">All Subjects</option>' + 
            subjects.map(s => `<option value="${escapeAttr(s)}" ${s === currentVal ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
    }

    // Render Tests
    function renderTests() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const selectedSubject = subjectFilter ? subjectFilter.value : 'all';

        const filtered = testsData.filter(test => {
            const matchesQuery = 
                (test.title && test.title.toLowerCase().includes(query)) ||
                (test.subject && test.subject.toLowerCase().includes(query)) ||
                (test.description && test.description.toLowerCase().includes(query));
            
            const matchesSubject = (selectedSubject === 'all') || (test.subject === selectedSubject);
            return matchesQuery && matchesSubject;
        });

        if (filtered.length === 0) {
            if (testsContainer) testsContainer.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (testsContainer) {
            testsContainer.innerHTML = filtered.map(test => createTestCardHTML(test)).join('');
        }
    }

    function createTestCardHTML(test) {
        const hasTaken = Boolean(test.has_taken);
        const lastPercentage = test.latest_percentage || 0;
        const passed = Boolean(test.latest_passed);

        return `
            <div class="test-card" data-id="${test.id}">
                <div class="test-card-header">
                    <span class="test-subject">${escapeHtml(test.subject || 'General')}</span>
                    ${hasTaken ? `
                        <span class="badge ${passed ? 'badge-success' : 'badge-danger'}">
                            ${passed ? 'Passed' : 'Failed'} (${lastPercentage}%)
                        </span>
                    ` : `
                        <span class="badge badge-indigo">New</span>
                    `}
                </div>
                
                <h3 class="test-title">${escapeHtml(test.title || 'Untitled Test')}</h3>
                <p class="test-desc">${escapeHtml(test.description || 'No instructions provided for this test.')}</p>

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
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Pass: ${test.passing_score || 70}%</span>
                    </div>
                </div>

                <div class="test-card-footer">
                    <span class="teacher-info">By ${escapeHtml(test.teacher_name || 'Teacher')}</span>
                    <a href="/take-test?id=${test.id}" class="btn ${hasTaken ? 'btn-outline' : 'btn-primary'} btn-sm">
                        <span>${hasTaken ? 'Retake Test' : 'Take Test'}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </a>
                </div>
            </div>
        `;
    }

    // Load Leaderboard
    async function loadLeaderboard() {
        if (!leaderboardTableBody) return;
        leaderboardTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px;">Loading leaderboard rankings...</td></tr>';
        
        try {
            const resp = await fetch('/api/leaderboard');
            if (resp.ok) {
                const data = await resp.json();
                leaderboardData = data.leaderboard || [];
                renderLeaderboard();
            }
        } catch (e) {
            console.error('Error loading leaderboard:', e);
            leaderboardTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Failed to load leaderboard.</td></tr>';
        }
    }

    function renderLeaderboard() {
        if (!leaderboardTableBody) return;

        if (leaderboardData.length === 0) {
            leaderboardTableBody.innerHTML = '';
            if (emptyLeaderboard) emptyLeaderboard.style.display = 'block';
            return;
        }

        if (emptyLeaderboard) emptyLeaderboard.style.display = 'none';

        leaderboardTableBody.innerHTML = leaderboardData.map(entry => {
            let rankBadge = `#${entry.rank}`;
            if (entry.rank === 1) rankBadge = '🥇 #1';
            else if (entry.rank === 2) rankBadge = '🥈 #2';
            else if (entry.rank === 3) rankBadge = '🥉 #3';

            return `
                <tr class="${entry.rank <= 3 ? 'top-rank-row' : ''}">
                    <td>
                        <span class="rank-badge rank-${entry.rank}">${rankBadge}</span>
                    </td>
                    <td>
                        <div class="table-student-info">
                            <img src="${entry.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + entry.email}" class="table-avatar" alt="Avatar">
                            <div>
                                <div class="table-name">${escapeHtml(entry.name || 'Student')}</div>
                                <div class="table-email">${escapeHtml(entry.email || '')}</div>
                            </div>
                        </div>
                    </td>
                    <td><strong>${entry.tests_completed || 0}</strong></td>
                    <td><strong class="points-text">${entry.total_points || 0} pts</strong></td>
                    <td>${entry.avg_percentage || 0}%</td>
                    <td><span class="badge badge-success">${entry.best_percentage || 0}%</span></td>
                </tr>
            `;
        }).join('');
    }

    // Tab Switch Events
    if (tabTests && tabLeaderboard) {
        tabTests.addEventListener('click', () => {
            tabTests.classList.add('active');
            tabLeaderboard.classList.remove('active');
            if (testsView) testsView.style.display = 'block';
            if (leaderboardView) leaderboardView.style.display = 'none';
        });

        tabLeaderboard.addEventListener('click', () => {
            tabLeaderboard.classList.add('active');
            tabTests.classList.remove('active');
            if (testsView) testsView.style.display = 'none';
            if (leaderboardView) leaderboardView.style.display = 'block';
            loadLeaderboard();
        });
    }

    // Filters
    if (searchInput) searchInput.addEventListener('input', renderTests);
    if (subjectFilter) subjectFilter.addEventListener('change', renderTests);

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

    function escapeAttr(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Init
    loadUser();
    loadStats();
    loadTests();
});
