document.addEventListener('DOMContentLoaded', () => {
    const testForm = document.getElementById('test-form');
    const formHeading = document.getElementById('form-heading');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const questionCountSpan = document.getElementById('question-count');
    const saveBtn = document.getElementById('save-btn');

    // Form inputs
    const testTitleInput = document.getElementById('test-title');
    const testSubjectInput = document.getElementById('test-subject');
    const testDurationInput = document.getElementById('test-duration');
    const testStatusSelect = document.getElementById('test-status');
    const testDescInput = document.getElementById('test-description');

    const urlParams = new URLSearchParams(window.location.search);
    const editTestId = urlParams.get('id');

    let questions = [];

    // Load existing test data if in edit mode
    async function loadTestForEdit() {
        if (!editTestId) {
            // Default with 2 starter questions
            addQuestion();
            addQuestion();
            return;
        }

        if (formHeading) formHeading.textContent = 'Edit Test';
        if (saveBtn) saveBtn.querySelector('span').textContent = 'Update Test';

        try {
            const resp = await fetch(`/api/teacher/tests/${editTestId}`);
            if (resp.ok) {
                const data = await resp.json();
                const test = data.test;
                if (test) {
                    testTitleInput.value = test.title || '';
                    testSubjectInput.value = test.subject || '';
                    testDurationInput.value = test.duration || 30;
                    testStatusSelect.value = test.status || 'Active';
                    testDescInput.value = test.description || '';

                    if (test.questions && test.questions.length > 0) {
                        questions = test.questions.map(q => ({
                            id: q.id,
                            uuid: q.uuid,
                            text: q.text || '',
                            points: q.points || 1,
                            options: (q.options || []).map(o => ({
                                id: o.id,
                                text: o.text || '',
                                is_correct: Boolean(o.is_correct)
                            }))
                        }));
                        renderQuestions();
                    } else {
                        addQuestion();
                    }
                }
            } else {
                alert('Failed to load test details for editing.');
                window.location.href = '/teacher';
            }
        } catch (e) {
            console.error('Error fetching test:', e);
            alert('Failed to load test for editing.');
        }
    }

    function updateQuestionCount() {
        if (questionCountSpan) {
            questionCountSpan.textContent = questions.length;
        }
    }

    function addQuestion() {
        const newQ = {
            id: null,
            text: '',
            points: 1,
            options: [
                { text: '', is_correct: true },
                { text: '', is_correct: false },
                { text: '', is_correct: false },
                { text: '', is_correct: false }
            ]
        };
        questions.push(newQ);
        renderQuestions();
    }

    function renderQuestions() {
        if (!questionsContainer) return;

        questionsContainer.innerHTML = questions.map((q, qIndex) => {
            const optionsHTML = q.options.map((opt, oIndex) => `
                <div class="option-row">
                    <label class="correct-radio-label" title="Mark as correct answer">
                        <input type="radio" name="correct_opt_${qIndex}" value="${oIndex}" ${opt.is_correct ? 'checked' : ''} data-q="${qIndex}" data-o="${oIndex}" class="correct-option-radio">
                        <span class="custom-radio"></span>
                    </label>
                    <input type="text" class="form-control option-text-input" placeholder="Option ${oIndex + 1}" value="${escapeAttr(opt.text)}" data-q="${qIndex}" data-o="${oIndex}" required>
                    ${q.options.length > 2 ? `
                        <button type="button" class="btn-icon-danger remove-option-btn" data-q="${qIndex}" data-o="${oIndex}" title="Remove Option">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    ` : ''}
                </div>
            `).join('');

            return `
                <div class="question-card" data-q="${qIndex}">
                    <div class="question-header">
                        <div class="question-title-group">
                            <span class="question-number">Question ${qIndex + 1}</span>
                            <div class="points-input-wrap">
                                <label>Points:</label>
                                <input type="number" class="form-control points-input" value="${q.points || 1}" min="1" max="100" data-q="${qIndex}">
                            </div>
                        </div>
                        ${questions.length > 1 ? `
                            <button type="button" class="btn-icon-danger delete-question-btn" data-q="${qIndex}" title="Delete Question">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        ` : ''}
                    </div>

                    <div class="form-group">
                        <textarea class="form-control question-text-input" rows="2" placeholder="Enter question statement..." data-q="${qIndex}" required>${escapeHtml(q.text)}</textarea>
                    </div>

                    <div class="options-wrapper">
                        <label class="options-label">Answer Options (Select the correct option)</label>
                        <div class="options-list">
                            ${optionsHTML}
                        </div>
                        ${q.options.length < 6 ? `
                            <button type="button" class="btn btn-outline btn-sm add-option-btn" data-q="${qIndex}" style="margin-top: 10px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                <span>Add Choice</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        updateQuestionCount();
        attachQuestionEventListeners();
    }

    function attachQuestionEventListeners() {
        // Question text input
        document.querySelectorAll('.question-text-input').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const qIdx = parseInt(e.target.dataset.q);
                questions[qIdx].text = e.target.value;
            });
        });

        // Question points input
        document.querySelectorAll('.points-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const qIdx = parseInt(e.target.dataset.q);
                questions[qIdx].points = Math.max(1, parseInt(e.target.value) || 1);
            });
        });

        // Option text input
        document.querySelectorAll('.option-text-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const qIdx = parseInt(e.target.dataset.q);
                const oIdx = parseInt(e.target.dataset.o);
                questions[qIdx].options[oIdx].text = e.target.value;
            });
        });

        // Correct option radio
        document.querySelectorAll('.correct-option-radio').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const qIdx = parseInt(e.target.dataset.q);
                const oIdx = parseInt(e.target.dataset.o);
                questions[qIdx].options.forEach((opt, idx) => {
                    opt.is_correct = (idx === oIdx);
                });
            });
        });

        // Delete question
        document.querySelectorAll('.delete-question-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qIdx = parseInt(btn.dataset.q);
                questions.splice(qIdx, 1);
                renderQuestions();
            });
        });

        // Add option
        document.querySelectorAll('.add-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qIdx = parseInt(btn.dataset.q);
                questions[qIdx].options.push({ text: '', is_correct: false });
                renderQuestions();
            });
        });

        // Remove option
        document.querySelectorAll('.remove-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qIdx = parseInt(btn.dataset.q);
                const oIdx = parseInt(btn.dataset.o);
                const wasCorrect = questions[qIdx].options[oIdx].is_correct;
                questions[qIdx].options.splice(oIdx, 1);
                if (wasCorrect && questions[qIdx].options.length > 0) {
                    questions[qIdx].options[0].is_correct = true;
                }
                renderQuestions();
            });
        });
    }

    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', addQuestion);
    }

    // Save Test Submission
    if (testForm) {
        testForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate questions
            if (questions.length === 0) {
                alert('Please add at least one question to the test.');
                return;
            }

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (!q.text.trim()) {
                    alert(`Question ${i + 1} statement cannot be empty.`);
                    return;
                }
                if (q.options.length < 2) {
                    alert(`Question ${i + 1} must have at least 2 options.`);
                    return;
                }
                const hasCorrect = q.options.some(o => o.is_correct);
                if (!hasCorrect) {
                    alert(`Please select a correct answer for Question ${i + 1}.`);
                    return;
                }
                for (let j = 0; j < q.options.length; j++) {
                    if (!q.options[j].text.trim()) {
                        alert(`Option ${j + 1} in Question ${i + 1} cannot be empty.`);
                        return;
                    }
                }
            }

            const payload = {
                title: testTitleInput.value.trim(),
                subject: testSubjectInput.value.trim(),
                duration: parseInt(testDurationInput.value) || 30,
                status: testStatusSelect.value,
                description: testDescInput.value.trim(),
                questions: questions.map(q => ({
                    text: q.text.trim(),
                    points: q.points || 1,
                    options: q.options.map(o => ({
                        text: o.text.trim(),
                        is_correct: Boolean(o.is_correct)
                    }))
                }))
            };

            const submitBtn = testForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.querySelector('span').textContent = 'Saving...';
            }

            try {
                let url = '/api/teacher/tests';
                let method = 'POST';

                if (editTestId) {
                    url = `/api/teacher/tests/${editTestId}`;
                    method = 'PUT';
                }

                const resp = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (resp.ok) {
                    window.location.href = '/teacher';
                } else {
                    const data = await resp.json();
                    alert(data.error || 'Failed to save test.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.querySelector('span').textContent = editTestId ? 'Update Test' : 'Save Test';
                    }
                }
            } catch (err) {
                console.error('Error saving test:', err);
                alert('A network error occurred while saving the test.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.querySelector('span').textContent = editTestId ? 'Update Test' : 'Save Test';
                }
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
    loadTestForEdit();
});
