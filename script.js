let allVacancies = [];
let allPosts = [];
let currentUser = null;
let activeCategory = 'All';

let selectedFilters = {
    loc: 'All',
    type: 'Any',
    salary: '1000'
};

let tempModalAvatar = null;
let tempPostImage = '';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; 


const AVATAR_PALETTES = [
    'linear-gradient(135deg, #0066cc, #4da3ff)',
    'linear-gradient(135deg, #ff5e3a, #ffb199)',
    'linear-gradient(135deg, #0f2c59, #3d6fb5)',
    'linear-gradient(135deg, #8b5cf6, #c4b5fd)',
    'linear-gradient(135deg, #0d9488, #5eead4)',
    'linear-gradient(135deg, #d97706, #fde68a)'
];

function avatarGradient(name) {
    const str = name || 'A';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function jobTypeClass(type) {
    if (type === 'Full-time') return 'type-full';
    if (type === 'Part-time') return 'type-part';
    if (type === 'Contract') return 'type-contract';
    return '';
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkSession();
    renderJobsSkeleton();
    renderPostsSkeleton();
    fetchVacancies();
    fetchPosts();
    initCategories();

    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) {
            document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
        }
    });
});


function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// --- Система Тёмной темы (Dark Mode) ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    showToast(`Switched to ${newTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`);
}

function updateThemeIcon(theme) {
    const iconEl = document.getElementById('theme-icon');
    if (iconEl) {
        iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Переключение разделов (SPA)
function navigateTo(targetView, sectionId = null) {
    const views = ['home', 'feed', 'profile'];

    views.forEach(v => {
        const viewEl = document.getElementById(`${v}-view`);
        if (viewEl) viewEl.classList.remove('active');
    });

    const activeViewEl = document.getElementById(`${targetView}-view`);
    if (activeViewEl) activeViewEl.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    if (targetView === 'home' && !sectionId) {
        document.getElementById('nav-home').classList.add('active');
    } else if (targetView === 'feed') {
        document.getElementById('nav-feed').classList.add('active');
    } else if (sectionId) {
        const navEl = document.getElementById(`nav-${sectionId}`);
        if (navEl) navEl.classList.add('active');
    }

    if (sectionId) {
        setTimeout(() => {
            const target = document.getElementById(sectionId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function quickSearch(keyword) {
    navigateTo('home', 'vacancies');
    const input = document.getElementById('search-input');
    input.value = keyword;
    applyAllFilters();
}

function toggleDropdown(id, event) {
    event.stopPropagation();
    const target = document.getElementById(id);
    const isOpen = target.classList.contains('open');

    document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
    if (!isOpen) {
        target.classList.add('open');
    }
}

function selectOption(type, value, label) {
    selectedFilters[type] = value;
    document.getElementById(`label-${type}`).textContent = label;

    const wrapper = document.getElementById(`dropdown-${type}`);
    wrapper.querySelectorAll('.custom-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.textContent.trim() === label.trim()) {
            opt.classList.add('active');
        }
    });

    wrapper.classList.remove('open');
    applyAllFilters();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success' ? '✓' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

async function checkSession() {
    try {
        const response = await fetch('/api/me');
        const data = await response.json();
        if (data.id) {
            currentUser = data;
            if (!currentUser.name) currentUser.name = 'Abylai B';
        } else {
            currentUser = null;
        }
        updateAuthUI();
    } catch (err) {
        currentUser = null;
        updateAuthUI();
    }
}

function renderJobsSkeleton() {
    const container = document.getElementById('roles-list');
    if (!container) return;
    container.innerHTML = Array(4).fill(`
        <div class="job-card skeleton-card">
            <div class="job-info">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-sub"></div>
            </div>
        </div>
    `).join('');
}

function renderPostsSkeleton() {
    const stream = document.getElementById('posts-stream');
    if (!stream) return;
    stream.innerHTML = Array(2).fill(`
        <div class="post-card skeleton-card">
            <div class="skeleton-line skeleton-title" style="width:35%"></div>
            <div class="skeleton-line" style="width:92%"></div>
            <div class="skeleton-line" style="width:68%"></div>
        </div>
    `).join('');
}

async function fetchVacancies() {
    try {
        const response = await fetch('/api/vacancies');
        if (response.ok) {
            allVacancies = await response.json();
            applyAllFilters();
            updateGlobalStats();
        }
    } catch (err) {
        console.error('Failed to fetch vacancies:', err);
    }
}

async function fetchPosts() {
    try {
        const response = await fetch('/api/posts');
        if (response.ok) {
            allPosts = await response.json();
            renderPosts();
        }
    } catch (err) {
        console.error('Failed to fetch posts:', err);
    }
}

function renderPosts() {
    const stream = document.getElementById('posts-stream');
    if (!stream) return;
    stream.innerHTML = '';

    if (allPosts.length === 0) {
        stream.innerHTML = `
            <div class="post-card empty-state">
                <div class="empty-icon">🗒️</div>
                <div class="empty-title">No posts yet</div>
                <div class="empty-sub">Be the first to share something with the network.</div>
            </div>
        `;
        return;
    }

    allPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';

        const hasAvatarImg = !!post.author_avatar;
        const avatarStyle = hasAvatarImg ? '' : ` style="background:${avatarGradient(post.author_name)}"`;
        const avatarContent = hasAvatarImg
            ? `<img src="${post.author_avatar}">`
            : (post.author_name ? escapeHtml(post.author_name.charAt(0).toUpperCase()) : 'A');

        const imageHtml = post.image
            ? `<div class="post-media-box"><img src="${post.image}" alt="Post attachment" class="post-media-img"></div>`
            : '';

        const canDelete = currentUser && currentUser.id === post.user_id;
        const deleteBtnHtml = canDelete
            ? `<button class="post-action-btn btn-delete-post" onclick="deletePost(${post.id})">
                   <span>🗑</span> Delete
               </button>`
            : '';

        card.innerHTML = `
            <div class="post-card-header">
                <div class="post-author-avatar"${avatarStyle}>${avatarContent}</div>
                <div class="post-author-meta">
                    <span class="post-author-name">${escapeHtml(post.author_name)}</span>
                    <span class="post-author-role">${escapeHtml(post.author_role)}</span>
                </div>
            </div>
            ${post.content ? `<div class="post-body-text">${escapeHtml(post.content)}</div>` : ''}
            ${imageHtml}
            <div class="post-actions-bar">
                <button class="post-action-btn" onclick="likePost(${post.id}, this)">
                    <span>👍</span> <span class="like-count">${post.likes}</span> Likes
                </button>
                <button class="post-action-btn" onclick="showToast('Comments coming soon!')">
                    <span>💬</span> Comment
                </button>
                ${deleteBtnHtml}
            </div>
        `;
        stream.appendChild(card);
    });
}

async function submitNewPost() {
    if (!currentUser) {
        showToast('Please log in to post.', 'error');
        openModal('login-modal');
        return;
    }

    const input = document.getElementById('new-post-content');
    const content = input.value.trim();

    if (!content && !tempPostImage) {
        showToast('Please write something or attach a photo.', 'error');
        return;
    }

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: content,
                image: tempPostImage
            })
        });
        const data = await response.json();

        if (response.ok) {
            input.value = '';
            removePostImage();
            showToast('Post published to feed!');
            fetchPosts();
        } else {
            showToast(data.message || 'Failed to create post.', 'error');
        }
    } catch (err) {
        showToast('Server error while posting.', 'error');
    }
}

async function deletePost(postId) {
    if (!confirm('Delete this post? This cannot be undone.')) return;

    try {
        const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
        const data = await response.json();

        if (response.ok) {
            showToast('Post deleted.');
            fetchPosts();
        } else {
            showToast(data.message || 'Could not delete post.', 'error');
        }
    } catch (err) {
        showToast('Server error while deleting post.', 'error');
    }
}

async function likePost(postId, btn) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
        if (response.ok) {
            const countSpan = btn.querySelector('.like-count');
            countSpan.textContent = parseInt(countSpan.textContent, 10) + 1;
            btn.classList.add('liked');
        }
    } catch (err) {
        console.error('Error liking post:', err);
    }
}

function updateAuthUI() {
    const container = document.getElementById('auth-buttons-container');
    const createPostAvatar = document.getElementById('create-post-avatar');

    if (currentUser) {
        container.innerHTML = `
            <button class="btn-profile" onclick="navigateTo('profile')">Profile</button>
            <button class="btn-logout" onclick="handleLogout()">Log Out</button>
        `;
        syncProfileUI();

        if (createPostAvatar) {
            if (currentUser.avatar) {
                createPostAvatar.style.background = '';
                createPostAvatar.innerHTML = `<img src="${currentUser.avatar}">`;
            } else {
                createPostAvatar.style.background = avatarGradient(currentUser.name);
                createPostAvatar.innerHTML = currentUser.name ? escapeHtml(currentUser.name.charAt(0).toUpperCase()) : 'A';
            }
        }
    } else {
        container.innerHTML = `
            <button class="btn-login" onclick="openModal('login-modal')">Log In</button>
            <button class="btn-signup" onclick="openModal('signup-modal')">Sign Up</button>
        `;
        if (createPostAvatar) {
            createPostAvatar.style.background = '';
            createPostAvatar.innerHTML = 'A';
        }
    }

    // Re-render posts so delete buttons show/hide correctly for the current user
    renderPosts();
}

function initCategories() {
    const pills = document.querySelectorAll('.cat-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.getAttribute('data-category');
            applyAllFilters();
        });
    });
}

function applyAllFilters() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
    const locationVal = selectedFilters.loc;
    const typeVal = selectedFilters.type;
    const salaryVal = parseInt(selectedFilters.salary, 10);

    const filtered = allVacancies.filter(job => {
        const matchesSearch =
            job.title.toLowerCase().includes(searchQuery) ||
            job.company.toLowerCase().includes(searchQuery) ||
            job.category.toLowerCase().includes(searchQuery) ||
            job.location.toLowerCase().includes(searchQuery);

        const matchesCategory = (activeCategory === 'All' || job.category === activeCategory);
        const matchesLocation = (locationVal === 'All' || job.location === locationVal);
        const matchesType = (typeVal === 'Any' || job.type === typeVal);
        const matchesSalary = (job.salary >= salaryVal);

        return matchesSearch && matchesCategory && matchesLocation && matchesType && matchesSalary;
    });

    renderJobs(filtered);
}

function renderJobs(jobs) {
    const container = document.getElementById('roles-list');
    const counter = document.getElementById('roles-counter');
    if (!container) return;

    container.innerHTML = '';
    counter.textContent = `Showing ${jobs.length} of ${allVacancies.length}`;

    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="job-card empty-state">
                <div class="empty-icon">🔍</div>
                <div class="empty-title">No vacancies match your criteria</div>
                <div class="empty-sub">Try resetting the search or filters.</div>
            </div>
        `;
        return;
    }

    jobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div class="job-info">
                <div class="job-title">${escapeHtml(job.title)}</div>
                <div class="job-meta">${escapeHtml(job.company)} • ${escapeHtml(job.location)}</div>
                <div class="job-tags">
                    <span class="job-tag ${jobTypeClass(job.type)}">${escapeHtml(job.type)}</span>
                    <span class="job-tag">$${(job.salary / 1000).toFixed(1)}K / mo</span>
                </div>
            </div>
            <button class="btn-apply" onclick="applyForJob(${job.id})">Apply</button>
        `;
        container.appendChild(card);
    });
}

function updateGlobalStats() {
    document.getElementById('promo-count-badge').textContent = `${allVacancies.length} OPEN ROLES TODAY`;
    document.getElementById('stat-new-roles').textContent = allVacancies.length * 12;
}

function openModal(id) {
    clearErrors();
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    clearErrors();
    document.getElementById(id).classList.remove('active');
}

function clearErrors() {
    document.querySelectorAll('.error-msg').forEach(el => {
        el.textContent = '';
        el.classList.remove('visible');
    });
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.add('visible');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    clearErrors();

    const name = document.getElementById('signup-name').value.trim() || 'Abylai B';
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-pass').value.trim();

    if (!email || !password) {
        showError('signup-error', 'Please fill in all fields.');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            updateAuthUI();
            closeModal('signup-modal');
            navigateTo('profile');
            showToast('Account created successfully!');
        } else {
            showError('signup-error', data.message || 'Registration failed.');
        }
    } catch (err) {
        showError('signup-error', 'Server error. Please try again.');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    clearErrors();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value.trim();

    if (!email || !password) {
        showError('login-error', 'Please fill in all fields.');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            updateAuthUI();
            closeModal('login-modal');
            navigateTo('profile');
            showToast(`Welcome back, ${currentUser.name}!`);
        } else {
            showError('login-error', data.message || 'Login failed.');
        }
    } catch (err) {
        showError('login-error', 'Server error. Please try again.');
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        updateAuthUI();
        navigateTo('home');
        showToast('Logged out successfully.');
    } catch (err) {
        console.error('Logout error:', err);
    }
}

function syncProfileUI() {
    if (!currentUser) return;

    document.getElementById('profile-name-display').textContent = (currentUser.name || 'ABYLAI B').toUpperCase();
    document.getElementById('profile-role-display').textContent = currentUser.role || 'Frontend Developer';
    document.getElementById('profile-loc-display').textContent = currentUser.location || 'Almaty, KZ';
    document.getElementById('profile-about-display').textContent = currentUser.about || 'Passionate developer building high-quality web products.';

    const avatarImg = document.getElementById('profile-user-avatar');
    const placeholder = document.getElementById('avatar-placeholder');

    if (currentUser.avatar) {
        avatarImg.src = currentUser.avatar;
        avatarImg.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        placeholder.style.display = 'flex';
        placeholder.style.background = avatarGradient(currentUser.name);
        placeholder.textContent = (currentUser.name || 'A').charAt(0).toUpperCase();
    }

    const formattedName = (currentUser.name || 'Abylai_B').replace(/\s+/g, '_');
    document.getElementById('resume-filename-display').textContent = `${formattedName}_Resume.pdf`;
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file.', 'error');
        return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        showToast('Image must be smaller than 3MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Avatar = e.target.result;
        currentUser.avatar = base64Avatar;

        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: currentUser.name || 'Abylai B',
                    role: currentUser.role,
                    location: currentUser.location,
                    about: currentUser.about,
                    avatar: base64Avatar
                })
            });

            if (response.ok) {
                syncProfileUI();
                showToast('Avatar updated successfully!');
            } else {
                const data = await response.json();
                showToast(data.message || 'Error uploading avatar.', 'error');
            }
        } catch (err) {
            showToast('Error uploading avatar.', 'error');
        }
    };
    reader.readAsDataURL(file);
}

function handleModalAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file.', 'error');
        return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        showToast('Image must be smaller than 3MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        tempModalAvatar = e.target.result;
        const previewImg = document.getElementById('edit-avatar-preview');
        const placeholder = document.getElementById('edit-avatar-placeholder');

        previewImg.src = tempModalAvatar;
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function openEditProfile() {
    if (!currentUser) return;

    document.getElementById('edit-name').value = currentUser.name || 'Abylai B';
    document.getElementById('edit-role').value = currentUser.role || 'Frontend Developer';
    document.getElementById('edit-location').value = currentUser.location || 'Almaty, KZ';
    document.getElementById('edit-about').value = currentUser.about || 'Passionate developer building high-quality web products.';

    const previewImg = document.getElementById('edit-avatar-preview');
    const placeholder = document.getElementById('edit-avatar-placeholder');
    tempModalAvatar = currentUser.avatar || null;

    if (tempModalAvatar) {
        previewImg.src = tempModalAvatar;
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        previewImg.style.display = 'none';
        placeholder.style.display = 'flex';
        placeholder.parentElement.style.background = avatarGradient(currentUser.name);
        placeholder.textContent = (currentUser.name || 'A').charAt(0).toUpperCase();
    }

    openModal('edit-profile-modal');
}

async function saveProfileChanges(event) {
    event.preventDefault();
    clearErrors();

    const name = document.getElementById('edit-name').value.trim() || 'Abylai B';
    const role = document.getElementById('edit-role').value.trim();
    const location = document.getElementById('edit-location').value.trim();
    const about = document.getElementById('edit-about').value.trim();

    if (!name || !role || !location) {
        showError('edit-error', 'Name, role, and location are required.');
        return;
    }

    const finalAvatar = tempModalAvatar !== null ? tempModalAvatar : (currentUser.avatar || '');

    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role, location, about, avatar: finalAvatar })
        });

        if (response.ok) {
            currentUser.name = name;
            currentUser.role = role;
            currentUser.location = location;
            currentUser.about = about;
            currentUser.avatar = finalAvatar;

            syncProfileUI();
            closeModal('edit-profile-modal');
            showToast('Profile updated successfully!');
        } else {
            const data = await response.json();
            showError('edit-error', data.message || 'Failed to update profile.');
        }
    } catch (err) {
        showError('edit-error', 'Server error. Please try again.');
    }
}

async function applyForJob(jobId) {
    if (!currentUser) {
        showToast('Please log in or sign up to apply.', 'error');
        openModal('login-modal');
        return;
    }

    try {
        const response = await fetch('/api/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vacancy_id: jobId })
        });
        const data = await response.json();

        if (response.ok) {
            showToast('Application submitted successfully!');
        } else {
            showToast(data.message || 'Could not apply for this job.', 'error');
        }
    } catch (err) {
        showToast('Server error while submitting application.', 'error');
    }
}

function triggerResumeDownload() {
    if (!currentUser) return;
    const textContent = `Resume of ${currentUser.name}\nRole: ${currentUser.role}\nLocation: ${currentUser.location}\nAbout: ${currentUser.about}`;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentUser.name.replace(/\s+/g, '_')}_Resume.txt`;
    link.click();
    showToast('Resume downloaded!');
}

function handleContactSubmit(event) {
    event.preventDefault();
    showToast('Message sent! We will get back to you soon.');
    document.getElementById('contact-form').reset();
}

// Выбор фото для поста и генерация предпросмотра
function handlePostImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file.', 'error');
        return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        showToast('Image must be smaller than 3MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        tempPostImage = e.target.result;
        const previewImg = document.getElementById('post-image-preview');
        const previewContainer = document.getElementById('post-image-preview-container');

        previewImg.src = tempPostImage;
        previewContainer.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

// Удаление фото из предпросмотра
function removePostImage() {
    tempPostImage = '';
    document.getElementById('post-file-input').value = '';
    document.getElementById('post-image-preview-container').style.display = 'none';
}