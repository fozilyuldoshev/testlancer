document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-login-btn');
    const alertBox = document.getElementById('login-alert');

    // Handle error messages from URL query
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error && alertBox) {
        let msg = 'Authentication error. Please try again.';
        if (error === 'oauth_not_configured') {
            msg = 'Google OAuth is not configured in .env yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.';
        } else if (error === 'oauth_failed') {
            msg = 'Google authentication failed or was cancelled. Please try again.';
        } else if (error === 'user_creation_failed') {
            msg = 'Unable to create user profile. Please contact administrator.';
        } else if (error === 'session_error') {
            msg = 'Session creation failed. Please try again.';
        }
        alertBox.textContent = msg;
        alertBox.style.display = 'block';
    }

    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            googleBtn.innerHTML = `
                <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="#cbd5e1" stroke-width="4"></circle>
                    <path d="M4 12a8 8 0 018-8v8H4z" fill="#4F46E5"></path>
                </svg>
                <span>Connecting to Google...</span>
            `;
        });
    }
});
