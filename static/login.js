document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-login-btn');
    const devSection = document.getElementById('dev-section');
    const devLoginBtn = document.getElementById('dev-login-btn');
    const devEmailInput = document.getElementById('dev-email-input');
    const quickBtns = document.querySelectorAll('.quick-btn');

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev_mode') === 'true' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        if (devSection) {
            devSection.style.display = 'block';
        }
    }

    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            // Provide immediate feedback while redirecting
            googleBtn.innerHTML = `
                <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="#cbd5e1" stroke-width="4"></circle>
                    <path d="M4 12a8 8 0 018-8v8H4z" fill="#4F46E5"></path>
                </svg>
                <span>Connecting to Google...</span>
            `;
        });
    }

    async function performDevLogin(email) {
        if (!email) {
            alert('Please enter an email address');
            return;
        }

        try {
            const resp = await fetch('/auth/dev-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await resp.json();
            if (resp.ok && data.redirect) {
                window.location.href = data.redirect;
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (err) {
            console.error('Login error:', err);
            window.location.href = `/auth/dev-login?email=${encodeURIComponent(email)}`;
        }
    }

    if (devLoginBtn && devEmailInput) {
        devLoginBtn.addEventListener('click', () => {
            performDevLogin(devEmailInput.value.trim());
        });

        devEmailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performDevLogin(devEmailInput.value.trim());
            }
        });
    }

    quickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const email = btn.dataset.email;
            if (devEmailInput) {
                devEmailInput.value = email;
            }
            performDevLogin(email);
        });
    });
});
