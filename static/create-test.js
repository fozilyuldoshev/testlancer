function getStoredTests() {
    const raw = localStorage.getItem('testlancer_tests');
    return raw ? JSON.parse(raw) : [];
}

function saveTests(tests) {
    localStorage.setItem('testlancer_tests', JSON.stringify(tests));
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('id');

    const formHeading = document.getElementById('form-heading');
    const saveBtn = document.getElementById('save-btn');
    const testTitleInput = document.getElementById('test-title');
    const testSubjectInput = document.getElementById('test-subject');
    const testDurationInput = document.getElementById('test-duration');
    const testStatusInput = document.getElementById('test-status');
    const testDescInput = document.getElementById('test-description');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const questionCountSpan = document.getElementById('question-count');
    const testForm = document.getElementById('test-form');

    let tests = getStoredTests();
    let currentTest = null;
    let questionsList = [];

    if (testId) {
        currentTest = tests.find(t => t.id === testId);
        if (currentTest) {
            formHeading.textContent = 'Edit Test';
            document.title = `Edit Test: ${currentTest.title} - Testlancer`;
            testTitleInput.value = currentTest.title || '';
            testSubjectInput.value = currentTest.subject || '';
            testDurationInput.value = currentTest.duration || 30;
            testStatusInput.value = currentTest.status || 'Active';
            testDescInput.value = currentTest.description || '';
            
            if (currentTest.questions && currentTest.questions.length > 0) {
                questionsList = JSON.parse(JSON.stringify(currentTest.questions));
            }
        }
    }

    // If no questions yet, create one default empty question
    if (questionsList.length === 0) {
        questionsList.push({
            id: 'q_' + Date.now() + '_1',
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0
        });
    }

    function renderQuestions() {
        questionCountSpan.textContent = questionsList.length;
        questionsContainer.innerHTML = '';

        questionsList.forEach((q, qIndex) => {
            const card = document.createElement('div');
            card.className = 'question-card';
            card.dataset.index = qIndex;

            const letterLabels = ['A', 'B', 'C', 'D'];

            card.innerHTML = `
                <div class="question-card-header">
                    <span class="question-number-badge">Question ${qIndex + 1}</span>
                    ${questionsList.length > 1 ? `
                        <button type="button" class="btn-danger-icon" title="Remove Question" onclick="removeQuestion(${qIndex})">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    ` : ''}
                </div>
                
                <div class="form-group" style="margin-bottom: 16px;">
                    <label>Question Text <span class="required">*</span></label>
                    <input type="text" class="form-control question-text-input" placeholder="Type question prompt here..." value="${escapeHtml(q.question)}" required>
                </div>

                <div class="form-group">
                    <label>Answer Choices (Select radio button for the correct answer)</label>
                    <div class="options-grid">
                        ${[0, 1, 2, 3].map(optIdx => `
                            <div class="option-item">
                                <input type="radio" name="correct_opt_${qIndex}" class="option-radio" value="${optIdx}" ${q.correctAnswer === optIdx ? 'checked' : ''} title="Mark as correct answer">
                                <span class="option-label">${letterLabels[optIdx]}.</span>
                                <input type="text" class="option-input" placeholder="Option ${letterLabels[optIdx]}" value="${escapeHtml(q.options[optIdx] || '')}" required>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Listeners for inputs
            const textInput = card.querySelector('.question-text-input');
            textInput.addEventListener('input', (e) => {
                questionsList[qIndex].question = e.target.value;
            });

            const optInputs = card.querySelectorAll('.option-input');
            optInputs.forEach((optInput, optIdx) => {
                optInput.addEventListener('input', (e) => {
                    questionsList[qIndex].options[optIdx] = e.target.value;
                });
            });

            const radios = card.querySelectorAll('.option-radio');
            radios.forEach((radio, optIdx) => {
                radio.addEventListener('change', () => {
                    questionsList[qIndex].correctAnswer = optIdx;
                });
            });

            questionsContainer.appendChild(card);
        });
    }

    window.removeQuestion = function(index) {
        if (questionsList.length <= 1) return;
        questionsList.splice(index, 1);
        renderQuestions();
    };

    addQuestionBtn.addEventListener('click', () => {
        questionsList.push({
            id: 'q_' + Date.now() + '_' + (questionsList.length + 1),
            question: '',
            options: ['', '', '', ''],
            correctAnswer: 0
        });
        renderQuestions();
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    });

    testForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = testTitleInput.value.trim();
        const subject = testSubjectInput.value.trim();
        const duration = parseInt(testDurationInput.value, 10) || 30;
        const status = testStatusInput.value;
        const description = testDescInput.value.trim();

        if (!title) {
            alert('Please enter a test title.');
            testTitleInput.focus();
            return;
        }

        // Validate questions
        for (let i = 0; i < questionsList.length; i++) {
            const q = questionsList[i];
            if (!q.question.trim()) {
                alert(`Please enter a question prompt for Question ${i + 1}`);
                return;
            }
            for (let j = 0; j < 4; j++) {
                if (!q.options[j] || !q.options[j].trim()) {
                    alert(`Please fill in option ${['A', 'B', 'C', 'D'][j]} for Question ${i + 1}`);
                    return;
                }
            }
        }

        const dateStr = new Date().toISOString().split('T')[0];

        if (currentTest) {
            // Update
            currentTest.title = title;
            currentTest.subject = subject;
            currentTest.duration = duration;
            currentTest.status = status;
            currentTest.description = description;
            currentTest.questions = questionsList;
            
            const idx = tests.findIndex(t => t.id === currentTest.id);
            if (idx !== -1) {
                tests[idx] = currentTest;
            }
        } else {
            // Create
            const newTest = {
                id: 'test-' + Date.now(),
                title: title,
                subject: subject,
                duration: duration,
                status: status,
                description: description,
                submissionsCount: 0,
                createdAt: dateStr,
                questions: questionsList
            };
            tests.unshift(newTest);
        }

        saveTests(tests);
        window.location.href = '/teacher';
    });

    renderQuestions();
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
