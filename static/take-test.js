document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const testTitleEl = document.getElementById('test-title');
    const testSubjectEl = document.getElementById('test-subject');
    const timeRemainingEl = document.getElementById('time-remaining');
    const submitHeaderBtn = document.getElementById('submit-header-btn');
    const exitTestBtn = document.getElementById('exit-test-btn');
    
    const paletteContainer = document.getElementById('questions-palette');
    const questionSequenceEl = document.getElementById('question-sequence');
    const questionStatusTag = document.getElementById('question-status-tag');
    const questionTextEl = document.getElementById('question-text');
    const answersListEl = document.getElementById('answers-list');
    
    const prevBtn = document.getElementById('prev-question-btn');
    const nextBtn = document.getElementById('next-question-btn');
    const finishBtn = document.getElementById('finish-test-btn');

    // Result Modal Elements
    const resultModal = document.getElementById('result-modal');
    const resultTitle = document.getElementById('result-title');
    const resultSubtitle = document.getElementById('result-subtitle');
    const scorePercentageEl = document.getElementById('score-percentage');
    const scoreFractionEl = document.getElementById('score-fraction');
    const correctCountEl = document.getElementById('correct-count');
    const incorrectCountEl = document.getElementById('incorrect-count');
    const timeSpentEl = document.getElementById('time-spent');
    const resultBadgeIcon = document.getElementById('result-badge-icon');

    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('id');

    let testData = null;
    let questions = [];
    let currentIndex = 0;
    let userAnswers = {}; // { question_id: option_id }
    let timerInterval = null;
    let secondsRemaining = 0;
    let totalSeconds = 0;
    let isSubmitted = false;

    // Fetch Test Data
    async function loadTest() {
        if (!testId) {
            alert('No test selected.');
            window.location.href = '/student';
            return;
        }

        try {
            const resp = await fetch(`/api/student/tests/${testId}`);
            if (resp.ok) {
                const data = await resp.json();
                testData = data.test;
                if (!testData || !testData.questions || testData.questions.length === 0) {
                    alert('This test has no questions yet.');
                    window.location.href = '/student';
                    return;
                }

                questions = testData.questions;
                if (testTitleEl) testTitleEl.textContent = testData.title || 'Test';
                if (testSubjectEl) testSubjectEl.textContent = testData.subject || 'General';

                const durationMins = parseInt(testData.duration) || 30;
                totalSeconds = durationMins * 60;
                secondsRemaining = totalSeconds;

                startTimer();
                renderPalette();
                displayQuestion(0);
            } else {
                alert('Failed to load test. Please try again.');
                window.location.href = '/student';
            }
        } catch (e) {
            console.error('Error fetching test:', e);
            alert('Error loading test data.');
            window.location.href = '/student';
        }
    }

    // Timer
    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            secondsRemaining--;
            updateTimerDisplay();

            if (secondsRemaining <= 0) {
                clearInterval(timerInterval);
                alert('Time is up! Submitting your test automatically.');
                submitTest();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        if (!timeRemainingEl) return;
        const mins = Math.floor(Math.max(0, secondsRemaining) / 60);
        const secs = Math.max(0, secondsRemaining) % 60;
        timeRemainingEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        // Low time warning (< 2 mins)
        const timerBox = document.getElementById('timer-box');
        if (timerBox && secondsRemaining <= 120) {
            timerBox.classList.add('timer-warning');
        }
    }

    // Question Palette
    function renderPalette() {
        if (!paletteContainer) return;

        paletteContainer.innerHTML = questions.map((q, idx) => {
            const isAnswered = userAnswers[q.id] !== undefined;
            const isCurrent = idx === currentIndex;
            let statusClass = 'unanswered';
            if (isAnswered) statusClass = 'answered';
            if (isCurrent) statusClass += ' current';

            return `
                <button type="button" class="palette-btn ${statusClass}" data-index="${idx}">
                    ${idx + 1}
                </button>
            `;
        }).join('');

        paletteContainer.querySelectorAll('.palette-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                displayQuestion(idx);
            });
        });
    }

    // Display Active Question
    function displayQuestion(index) {
        if (index < 0 || index >= questions.length) return;
        currentIndex = index;

        const q = questions[currentIndex];
        if (questionSequenceEl) questionSequenceEl.textContent = `Question ${currentIndex + 1} of ${questions.length} (${q.points || 1} pt)`;
        if (questionTextEl) questionTextEl.textContent = q.text || '';

        const isAnswered = userAnswers[q.id] !== undefined;
        if (questionStatusTag) {
            questionStatusTag.textContent = isAnswered ? 'Answered' : 'Unanswered';
            questionStatusTag.className = `question-status-tag ${isAnswered ? 'tag-answered' : 'tag-unanswered'}`;
        }

        // Render Options
        if (answersListEl) {
            answersListEl.innerHTML = (q.options || []).map((opt, optIdx) => {
                const optLetter = String.fromCharCode(65 + optIdx);
                const isSelected = userAnswers[q.id] === opt.id;

                return `
                    <label class="answer-option ${isSelected ? 'selected' : ''}" data-option-id="${opt.id}">
                        <input type="radio" name="question_option" value="${opt.id}" ${isSelected ? 'checked' : ''}>
                        <span class="option-letter">${optLetter}</span>
                        <span class="option-text">${escapeHtml(opt.text)}</span>
                    </label>
                `;
            }).join('');

            answersListEl.querySelectorAll('.answer-option').forEach(label => {
                label.addEventListener('click', () => {
                    const optId = parseInt(label.dataset.optionId);
                    userAnswers[q.id] = optId;
                    
                    // Update UI state
                    answersListEl.querySelectorAll('.answer-option').forEach(l => l.classList.remove('selected'));
                    label.classList.add('selected');

                    if (questionStatusTag) {
                        questionStatusTag.textContent = 'Answered';
                        questionStatusTag.className = 'question-status-tag tag-answered';
                    }

                    renderPalette();
                });
            });
        }

        // Nav Buttons
        if (prevBtn) prevBtn.disabled = (currentIndex === 0);
        
        if (currentIndex === questions.length - 1) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (finishBtn) finishBtn.style.display = 'inline-flex';
        } else {
            if (nextBtn) nextBtn.style.display = 'inline-flex';
            if (finishBtn) finishBtn.style.display = 'none';
        }

        renderPalette();
    }

    // Nav Events
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) displayQuestion(currentIndex - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentIndex < questions.length - 1) displayQuestion(currentIndex + 1);
        });
    }

    // Submit Action
    async function submitTest() {
        if (isSubmitted) return;
        isSubmitted = true;
        clearInterval(timerInterval);

        const timeSpent = Math.max(0, totalSeconds - secondsRemaining);

        // Disable buttons
        if (submitHeaderBtn) submitHeaderBtn.disabled = true;
        if (finishBtn) finishBtn.disabled = true;

        try {
            const resp = await fetch(`/api/student/tests/${testId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    answers: userAnswers,
                    time_spent: timeSpent
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                const result = data.result || {};
                showResultsModal(result);
            } else {
                const errData = await resp.json();
                alert(errData.error || 'Failed to submit test');
                isSubmitted = false;
            }
        } catch (err) {
            console.error('Submit error:', err);
            alert('A network error occurred while submitting your test.');
            isSubmitted = false;
        }
    }

    function showResultsModal(result) {
        const passed = Boolean(result.passed);
        const percentage = result.percentage || 0;

        if (scorePercentageEl) scorePercentageEl.textContent = `${percentage}%`;
        if (scoreFractionEl) scoreFractionEl.textContent = `${result.score || 0} / ${result.total_points || 0} points`;
        if (correctCountEl) correctCountEl.textContent = result.correct_count || 0;
        if (incorrectCountEl) incorrectCountEl.textContent = result.incorrect_count || 0;
        if (timeSpentEl) timeSpentEl.textContent = result.time_spent_str || `${result.time_spent || 0}s`;

        if (resultTitle) {
            resultTitle.textContent = passed ? 'Congratulations! Test Passed 🎉' : 'Test Completed';
        }
        if (resultSubtitle) {
            resultSubtitle.textContent = passed 
                ? `You reached the passing grade (${result.passing_score}% required).`
                : `You scored ${percentage}%. The passing threshold was ${result.passing_score}%.`;
        }

        if (resultBadgeIcon) {
            resultBadgeIcon.className = `result-badge-icon ${passed ? 'passed' : 'failed'}`;
        }

        if (resultModal) {
            resultModal.style.display = 'flex';
        }
    }

    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            const answeredCount = Object.keys(userAnswers).length;
            const unansweredCount = questions.length - answeredCount;

            let msg = 'Are you sure you want to finish and submit your test?';
            if (unansweredCount > 0) {
                msg = `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`;
            }

            if (confirm(msg)) {
                submitTest();
            }
        });
    }

    if (submitHeaderBtn) {
        submitHeaderBtn.addEventListener('click', () => {
            const answeredCount = Object.keys(userAnswers).length;
            const unansweredCount = questions.length - answeredCount;

            let msg = 'Are you sure you want to finish and submit your test?';
            if (unansweredCount > 0) {
                msg = `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`;
            }

            if (confirm(msg)) {
                submitTest();
            }
        });
    }

    if (exitTestBtn) {
        exitTestBtn.addEventListener('click', (e) => {
            if (!isSubmitted && !confirm('Are you sure you want to exit? Your test progress will not be saved.')) {
                e.preventDefault();
            }
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

    // Init
    loadTest();
});
