function getStoredTests() {
    const raw = localStorage.getItem('testlancer_tests');
    return raw ? JSON.parse(raw) : [];
}

function saveStudentResult(result) {
    const raw = localStorage.getItem('testlancer_student_results');
    const list = raw ? JSON.parse(raw) : [];
    
    // Remove previous attempt for same test if any
    const updated = list.filter(r => r.testId !== result.testId);
    updated.unshift(result);
    localStorage.setItem('testlancer_student_results', JSON.stringify(updated));
}

function incrementTestSubmissions(testId) {
    const raw = localStorage.getItem('testlancer_tests');
    if (!raw) return;
    try {
        const tests = JSON.parse(raw);
        const t = tests.find(item => item.id === testId);
        if (t) {
            t.submissionsCount = (t.submissionsCount || 0) + 1;
            localStorage.setItem('testlancer_tests', JSON.stringify(tests));
        }
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('id');

    const tests = getStoredTests();
    const test = tests.find(t => t.id === testId);

    if (!test || !test.questions || test.questions.length === 0) {
        alert('Test not found or has no questions available.');
        window.location.href = '/student';
        return;
    }

    // Set Header Info
    document.getElementById('test-title').textContent = test.title;
    document.getElementById('test-subject').textContent = test.subject || 'General';
    document.title = `Taking: ${test.title} - Testlancer`;

    let currentQuestionIndex = 0;
    const totalQuestions = test.questions.length;
    const userAnswers = {}; // { 0: optionIndex, 1: optionIndex, ... }

    const questionsPalette = document.getElementById('questions-palette');
    const questionSequence = document.getElementById('question-sequence');
    const questionStatusTag = document.getElementById('question-status-tag');
    const questionText = document.getElementById('question-text');
    const answersList = document.getElementById('answers-list');
    const prevBtn = document.getElementById('prev-question-btn');
    const nextBtn = document.getElementById('next-question-btn');
    const finishBtn = document.getElementById('finish-test-btn');
    const submitHeaderBtn = document.getElementById('submit-header-btn');

    // Timer setup
    let totalSeconds = (test.duration || 30) * 60;
    const initialSeconds = totalSeconds;
    const timeRemainingEl = document.getElementById('time-remaining');
    const timerBox = document.getElementById('timer-box');

    function updateTimerDisplay() {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        timeRemainingEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (totalSeconds <= 300) {
            timerBox.style.backgroundColor = '#fef2f2';
            timerBox.style.color = '#dc2626';
            timerBox.style.borderColor = '#fca5a5';
        }
    }

    updateTimerDisplay();

    const timerInterval = setInterval(() => {
        totalSeconds--;
        if (totalSeconds <= 0) {
            clearInterval(timerInterval);
            timeRemainingEl.textContent = "00:00";
            alert("Time's up! Your test will now be submitted.");
            finishTest();
        } else {
            updateTimerDisplay();
        }
    }, 1000);

    // Build Palette
    function renderPalette() {
        questionsPalette.innerHTML = '';
        for (let i = 0; i < totalQuestions; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'palette-btn';
            btn.textContent = i + 1;

            const isAnswered = userAnswers[i] !== undefined;
            const isCurrent = i === currentQuestionIndex;

            if (isAnswered) btn.classList.add('answered');
            if (isCurrent) btn.classList.add('current');

            btn.addEventListener('click', () => {
                currentQuestionIndex = i;
                renderCurrentQuestion();
                renderPalette();
            });

            questionsPalette.appendChild(btn);
        }
    }

    function renderCurrentQuestion() {
        const q = test.questions[currentQuestionIndex];
        questionSequence.textContent = `Question ${currentQuestionIndex + 1} of ${totalQuestions}`;

        const isAnswered = userAnswers[currentQuestionIndex] !== undefined;
        if (isAnswered) {
            questionStatusTag.textContent = 'Answered';
            questionStatusTag.classList.add('is-answered');
        } else {
            questionStatusTag.textContent = 'Unanswered';
            questionStatusTag.classList.remove('is-answered');
        }

        questionText.textContent = q.question;

        const letterLabels = ['A', 'B', 'C', 'D'];
        answersList.innerHTML = '';

        q.options.forEach((optText, optIdx) => {
            const isSelected = userAnswers[currentQuestionIndex] === optIdx;
            const optDiv = document.createElement('div');
            optDiv.className = `answer-option ${isSelected ? 'selected' : ''}`;
            optDiv.innerHTML = `
                <div class="option-badge">${letterLabels[optIdx]}</div>
                <div class="option-text-val">${escapeHtml(optText)}</div>
            `;

            optDiv.addEventListener('click', () => {
                userAnswers[currentQuestionIndex] = optIdx;
                renderCurrentQuestion();
                renderPalette();
            });

            answersList.appendChild(optDiv);
        });

        // Navigation button states
        prevBtn.disabled = currentQuestionIndex === 0;

        if (currentQuestionIndex === totalQuestions - 1) {
            nextBtn.style.display = 'none';
            finishBtn.style.display = 'inline-flex';
        } else {
            nextBtn.style.display = 'inline-flex';
            finishBtn.style.display = 'none';
        }
    }

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderCurrentQuestion();
            renderPalette();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            currentQuestionIndex++;
            renderCurrentQuestion();
            renderPalette();
        }
    });

    function finishTest() {
        clearInterval(timerInterval);

        let correctCount = 0;
        test.questions.forEach((q, idx) => {
            if (userAnswers[idx] === q.correctAnswer) {
                correctCount++;
            }
        });

        const scorePercent = Math.round((correctCount / totalQuestions) * 100);
        const incorrectCount = totalQuestions - correctCount;
        const timeSpentSeconds = initialSeconds - Math.max(0, totalSeconds);
        const timeSpentMins = Math.ceil(timeSpentSeconds / 60);

        // Save result
        saveStudentResult({
            testId: test.id,
            testTitle: test.title,
            subject: test.subject,
            scorePercent: scorePercent,
            correctCount: correctCount,
            totalQuestions: totalQuestions,
            completedAt: new Date().toISOString()
        });

        incrementTestSubmissions(test.id);

        // Show Results Modal
        document.getElementById('score-percentage').textContent = `${scorePercent}%`;
        document.getElementById('score-fraction').textContent = `${correctCount} / ${totalQuestions} correct answers`;
        document.getElementById('correct-count').textContent = correctCount;
        document.getElementById('incorrect-count').textContent = incorrectCount;
        document.getElementById('time-spent').textContent = `${timeSpentMins}m`;

        const resultModal = document.getElementById('result-modal');
        resultModal.style.display = 'flex';
    }

    finishBtn.addEventListener('click', () => {
        const answeredCount = Object.keys(userAnswers).length;
        if (answeredCount < totalQuestions) {
            const unansweredCount = totalQuestions - answeredCount;
            if (!confirm(`You still have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`)) {
                return;
            }
        }
        finishTest();
    });

    submitHeaderBtn.addEventListener('click', () => {
        const answeredCount = Object.keys(userAnswers).length;
        if (answeredCount < totalQuestions) {
            const unansweredCount = totalQuestions - answeredCount;
            if (!confirm(`You still have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`)) {
                return;
            }
        }
        finishTest();
    });

    renderCurrentQuestion();
    renderPalette();
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
