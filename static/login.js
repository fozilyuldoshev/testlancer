document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('google-login-btn');
    const roleInputs = document.querySelectorAll('input[name="role"]');

    googleBtn.addEventListener('click', () => {
        const selectedRole = document.querySelector('input[name="role"]:checked')?.value || 'student';
        
        // Show loading state
        const originalContent = googleBtn.innerHTML;
        googleBtn.innerHTML = `
            <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#cbd5e1" stroke-width="4"></circle>
                <path d="M4 12a8 8 0 018-8v8H4z" fill="#4F46E5"></path>
            </svg>
            <span>Signing in...</span>
        `;
        googleBtn.disabled = true;

        // Store user mock session info
        const user = {
            name: selectedRole === 'teacher' ? 'Prof. Sarah Jenkins' : 'Alex Johnson',
            email: selectedRole === 'teacher' ? 'sarah.jenkins@edu.org' : 'alex.johnson@student.edu',
            role: selectedRole,
            avatar: selectedRole === 'teacher' 
                ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
        };
        localStorage.setItem('currentUser', JSON.stringify(user));

        setTimeout(() => {
            if (selectedRole === 'teacher') {
                window.location.href = '/teacher';
            } else {
                window.location.href = '/student';
            }
        }, 600);
    });
});
