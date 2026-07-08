const themeBtn = document.querySelector('#theme-toggle');
const msgInput = document.querySelector('#message');
const counter = document.querySelector('#char-counter');
const filterBtns = document.querySelectorAll('.filter-btn');
const form = document.querySelector('#contact');

let isDark = false;

const portfolioInfo = [
    { feature: "Theme Toggle", status: "Ready" },
    { feature: "Character Counter", status: "Ready" },
    { feature: "Project Filter", status: "Ready" }
];
console.table(portfolioInfo); 

function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('dark-mode', isDark);
}

themeBtn.addEventListener('click', () => {
    toggleTheme();
    console.log('Theme toggled. Current dark mode state:', isDark); 
});

msgInput.addEventListener('input', () => {
    const len = msgInput.value.length;
    counter.textContent = `${len}/1000`;
    console.log('Current characters count:', len); 
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {

        const category = e.target.dataset.category;
        console.log('Filtering projects by category:', category); 

        document.querySelectorAll('.project-card').forEach(card => {
            const show = category === 'all' || card.dataset.category === category;
            card.classList.toggle('d-none', !show);
        });
    });
});

form.addEventListener('submit', e => {
    e.preventDefault();
    clearErrors(form);
    form.checkValidity() ? submitSuccess() : showErrors(form);
});

function showErrors(form) {
    form.querySelectorAll(':invalid').forEach(el => {
        const id = el.id + '-error';
        document.getElementById(id)?.removeAttribute('hidden');
        el.setAttribute('aria-invalid', 'true');
    });
    
    const firstInvalid = form.querySelector(':invalid');
    if (firstInvalid) {
        firstInvalid.focus();
    }
}

function clearErrors(form) {
    form.querySelectorAll('[aria-invalid]').forEach(el => {
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
        form.reset();
        counter.textContent = '0/1000'; 
    }, 2000);
}