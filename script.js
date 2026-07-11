const STORAGE_KEY = 'portfolio-projects';

const defaultProjects = [
    { id: 1, title: 'Network Scanner', description: 'A simple Python script to scan local ports and detect system vulnerabilities.', category: 'python' },
    { id: 2, title: 'Portfolio Site', description: 'Responsive personal portfolio migrated fully to modern Bootstrap 5 grid layout.', category: 'web' },
    { id: 3, title: 'Password Generator', description: 'Java application that generates strong, randomized passwords for users.', category: 'java' },
    { id: 4, title: 'Login Validator', description: 'Basic login authentication system implementing secure password hashing algorithms.', category: 'python' },
    { id: 5, title: 'Data Cipher', description: 'Simple standalone software implementing classic encryption rules like Caesar ciphers.', category: 'java' },
    { id: 6, title: 'Web Layout Practice', description: 'Various practice and homework tasks based on web engineering lectures.', category: 'web' }
];

function loadProjects() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultProjects;
}

function saveProjects(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

let projects = loadProjects();
let activeFilter = 'all';

const grid = document.querySelector('#projects-grid');
const addForm = document.querySelector('#add-project-form');
const titleInput = document.querySelector('#project-title-input');
const descInput = document.querySelector('#project-desc-input');
const categoryInput = document.querySelector('#project-category-input');

function renderProjects() {
    grid.innerHTML = '';
    
    console.table(projects);
    console.log('Event: Rendering projects grid. Total items:', projects.length);

    projects.forEach(p => {
        if (activeFilter !== 'all' && p.category !== activeFilter) {
            return;
        }

        const cardCol = document.createElement('div');
        cardCol.className = 'col-12 col-sm-6 col-lg-4 project-card';

        let imgSrc = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500';
        if (p.category === 'python') imgSrc = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500';
        if (p.category === 'java') imgSrc = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500';

        cardCol.insertAdjacentHTML('beforeend', `
            <div class="card h-100 shadow-sm">
                <img src="${imgSrc}" class="card-img-top" alt="${p.title}" style="height: 180px; object-fit: cover;">
                <div class="card-body d-flex flex-column justify-content-between">
                    <div>
                        <h5 class="card-title fw-bold">${p.title}</h5>
                        <p class="card-text text-muted small">${p.description}</p>
                        <span class="badge bg-dark text-capitalize">${p.category}</span>
                    </div>
                    <button class="btn btn-sm btn-danger mt-3 remove-btn fw-bold">Remove</button>
                </div>
            </div>
        `);

        cardCol.querySelector('.remove-btn').addEventListener('click', () => {
            projects = projects.filter(item => item.id !== p.id);
            saveProjects(projects);
            renderProjects();
            console.log('Event: Removed project', p.id);
        });

        grid.append(cardCol);
    });
}

renderProjects();

addForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newProject = {
        id: Date.now(),
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
        category: categoryInput.value
    };

    projects.push(newProject);
    saveProjects(projects);
    renderProjects();
    addForm.reset();
    
    console.log('Event: Added project:', newProject);
});

setInterval(() => {
    const timestampEl = document.querySelector('#last-updated');
    if (timestampEl) {
        timestampEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
}, 1000);

const filterBtns = document.querySelectorAll('.filter-btn');

filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        activeFilter = e.target.dataset.category;
        
        filterBtns.forEach(b => b.classList.replace('btn-dark', 'btn-outline-dark'));
        e.target.classList.replace('btn-outline-dark', 'btn-dark');
        
        renderProjects();
    });
});

const themeBtn = document.querySelector('#theme-toggle');
let isDark = false;

themeBtn.addEventListener('click', () => {
    isDark = !isDark;
    document.body.classList.toggle('dark-mode', isDark);
    console.log('Theme changed. Dark mode state:', isDark);
});

const msgInput = document.querySelector('#message');
const counter = document.querySelector('#char-counter');

msgInput.addEventListener('input', () => {
    const len = msgInput.value.length;
    counter.textContent = `${len}/1000`;
});

const contactForm = document.querySelector('#contact');
contactForm.addEventListener('submit', e => {
    e.preventDefault();
    clearErrors(contactForm);
    contactForm.checkValidity() ? submitSuccess() : showErrors(contactForm);
});

function showErrors(formEl) {
    formEl.querySelectorAll(':invalid').forEach(el => {
        const id = el.id + '-error';
        document.getElementById(id)?.removeAttribute('hidden');
        el.setAttribute('aria-invalid', 'true');
    });
    const firstInvalid = formEl.querySelector(':invalid');
    if (firstInvalid) firstInvalid.focus();
}

function clearErrors(formEl) {
    formEl.querySelectorAll('[aria-invalid]').forEach(el => {
        el.removeAttribute('aria-invalid');
        const err = document.getElementById(el.id + '-error');
        err?.setAttribute('hidden', '');
    });
}

function submitSuccess() {
    const spinner = document.getElementById('submitSpinner');
    const btnText = document.getElementById('submitText');
    const btn = document.getElementById('submitBtn');
    
    spinner.classList.remove('d-none');
    btnText.textContent = 'Sending...';
    btn.disabled = true;

    setTimeout(() => {
        spinner.classList.add('d-none');
        btnText.textContent = 'Send message';
        btn.disabled = false;
        contactForm.reset();
        counter.textContent = '0/1000';
    }, 2000);
}