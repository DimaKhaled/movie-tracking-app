let currentUser = null;
let currentStatus = '';
let currentSearch = '';
let currentSort = '';

window.CineTrack = window.CineTrack || { routes: {} };

function csrfHeaders(extra = {}) {
    const token = document.querySelector('meta[name="csrf-token"]');
    const headers = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...extra,
    };
    if (token && token.content) {
        headers['X-CSRF-TOKEN'] = token.content;
    }
    return headers;
}

function routes() {
    return window.CineTrack.routes || {};
}

function authEndpoint(action) {
    const r = routes();
    if (action === 'login') return r.login || './Auth_Ops.php';
    if (action === 'signup') return r.register || './Auth_Ops.php';
    if (action === 'logout') return r.logout || './Auth_Ops.php';
    return './Auth_Ops.php';
}

function moviesListUrl(search, status, sort) {
    const r = routes();
    const base = r.movies;
    if (!base) {
        let url = './DB_Ops.php?action=getAll';
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status) url += `&status=${encodeURIComponent(status)}`;
        if (sort) url += `&sort=${encodeURIComponent(sort)}`;
        return url;
    }
    const u = new URL(base, window.location.origin);
    if (search) u.searchParams.set('search', search);
    if (status) u.searchParams.set('status', status);
    if (sort) u.searchParams.set('sort', sort);
    return u.pathname + u.search;
}

function movieResourceUrl(id) {
    const r = routes();
    const base = r.movies;
    if (!base) {
        return './DB_Ops.php?action=delete';
    }
    const root = new URL(base, window.location.origin);
    const path = root.pathname.replace(/\/$/, '') + '/' + encodeURIComponent(String(id));
    return path;
}

function isUserLoggedIn() {
    return !!currentUser;
}
window.isUserLoggedIn = isUserLoggedIn;

function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return null;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastIn 0.25s ease reverse';
        setTimeout(() => toast.remove(), 200);
    }, duration);

    return toast;
}

function showSuccessToast(message, duration = 3000) {
    return showToast(message, 'success', duration);
}

function showErrorToast(message, duration = 4000) {
    return showToast(message, 'error', duration);
}

function showLoading(containerId = 'loadingState') {
    const loader = document.getElementById(containerId);
    if (loader) loader.classList.remove('hidden');
}

function hideLoading(containerId = 'loadingState') {
    const loader = document.getElementById(containerId);
    if (loader) loader.classList.add('hidden');
}

function showMovieModal() {
    const movieModal = document.getElementById('movieModal');
    if (movieModal) movieModal.classList.remove('hidden');
}

function hideMovieModal() {
    const movieModal = document.getElementById('movieModal');
    if (movieModal) movieModal.classList.add('hidden');
}

function switchToView(viewName) {
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');

    navLinks.forEach((l) => l.classList.remove('active'));
    views.forEach((v) => v.classList.remove('active'));

    const link = document.querySelector(`[data-view="${viewName}"]`);
    if (link) link.classList.add('active');

    const view = document.getElementById(`view-${viewName}`);
    if (view) {
        view.classList.add('active');
        const mainSearch = document.getElementById('main-search');
        if (mainSearch) {
            if (viewName === 'search') {
                mainSearch.classList.add('active');
            } else {
                mainSearch.classList.remove('active');
            }
        }
    }
}

async function requestJSON(url, options = {}) {
    const opts = {
        ...options,
        headers: {
            ...csrfHeaders(),
            ...(options.headers || {}),
        },
    };
    const response = await fetch(url, opts);
    const text = await response.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch (err) {
        throw new Error('Invalid server response.');
    }

    return { response, data };
}

function setAuthMode(mode) {
    const showLoginTab = document.getElementById('showLoginTab');
    const showSignupTab = document.getElementById('showSignupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authError = document.getElementById('authError');
    const authNotice = document.getElementById('authNotice');

    if (authError) authError.textContent = '';
    if (authNotice) {
        authNotice.textContent = '';
        authNotice.classList.add('hidden');
    }

    if (mode === 'signup') {
        showLoginTab?.classList.remove('active');
        showSignupTab?.classList.add('active');
        loginForm?.classList.add('hidden');
        signupForm?.classList.remove('hidden');
        return;
    }

    showSignupTab?.classList.remove('active');
    showLoginTab?.classList.add('active');
    signupForm?.classList.add('hidden');
    loginForm?.classList.remove('hidden');
}

function setAuthNotice(message) {
    const authNotice = document.getElementById('authNotice');
    if (!authNotice) return;
    authNotice.textContent = message;
    authNotice.classList.remove('hidden');
}

function setAppVisibility(isAuthenticated) {
    const authGate = document.getElementById('authGate');
    const app = document.getElementById('app');
    const authHeader = document.getElementById('authHeader');
    const mainNav = document.getElementById('mainNav');

    if (isAuthenticated) {
        authGate?.classList.add('hidden');
        app?.classList.remove('hidden');
        authHeader?.classList.remove('hidden');
        mainNav?.classList.remove('hidden');
        return;
    }

    authGate?.classList.remove('hidden');
    app?.classList.add('hidden');
    authHeader?.classList.add('hidden');
    mainNav?.classList.add('hidden');
}

function renderAuthUser() {
    const authWelcome = document.getElementById('authWelcome');
    if (!authWelcome) return;
    authWelcome.textContent = currentUser ? `Hi, ${currentUser.name}` : '';
}

async function verifySession() {
    try {
        const { data } = await requestJSON(routes().me || './Auth_Ops.php?action=me');
        if (data.success && data.loggedIn && data.user) {
            currentUser = data.user;
            renderAuthUser();
            setAppVisibility(true);
            switchToView('list');
            await Promise.all([getMovies(), loadStats()]);
            return;
        }
    } catch (error) {
        console.error('Session check failed:', error);
    }

    currentUser = null;
    setAppVisibility(false);
}

async function submitAuth(action, payload) {
    const body = new URLSearchParams();
    body.set('action', action);
    Object.entries(payload).forEach(([key, value]) => body.set(key, value));

    const { response, data } = await requestJSON(authEndpoint(action), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!response.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed.');
    }

    return data;
}

async function forceLogout(message = 'Session expired. Please log in again.') {
    currentUser = null;
    setAppVisibility(false);
    renderAuthUser();
    setAuthMode('login');
    hideMovieModal();
    showErrorToast(message);

    try {
        await submitAuth('logout', {});
    } catch (_err) {
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();

    const authError = document.getElementById('authError');
    if (authError) authError.textContent = '';

    const email = document.getElementById('loginEmail')?.value.trim() || '';
    const password = document.getElementById('loginPassword')?.value || '';

    try {
        const data = await submitAuth('login', { email, password });
        currentUser = data.user;
        renderAuthUser();
        setAppVisibility(true);
        switchToView('list');
        showSuccessToast('Welcome back.');
        await Promise.all([getMovies(), loadStats()]);
    } catch (error) {
        if (authError) authError.textContent = error.message;
        showErrorToast(error.message);
    }
}

async function handleSignupSubmit(e) {
    e.preventDefault();

    const authError = document.getElementById('authError');
    if (authError) authError.textContent = '';

    const name = document.getElementById('signupName')?.value.trim() || '';
    const email = document.getElementById('signupEmail')?.value.trim() || '';
    const password = document.getElementById('signupPassword')?.value || '';
    const confirmPassword = document.getElementById('signupConfirmPassword')?.value || '';

    if (password !== confirmPassword) {
        const message = 'Password and confirm password must match.';
        if (authError) authError.textContent = message;
        showErrorToast(message);
        return;
    }

    try {
        await submitAuth('signup', { name, email, password, confirm_password: confirmPassword });

        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        const signupPassword = document.getElementById('signupPassword');
        const signupConfirmPassword = document.getElementById('signupConfirmPassword');

        if (loginEmail) loginEmail.value = email;
        if (loginPassword) loginPassword.value = '';
        if (signupPassword) signupPassword.value = '';
        if (signupConfirmPassword) signupConfirmPassword.value = '';

        setAuthMode('login');
        setAuthNotice('Account created successfully. Please log in.');
    } catch (error) {
        if (authError) authError.textContent = error.message;
        showErrorToast(error.message);
    }
}

async function handleLogout() {
    try {
        await submitAuth('logout', {});
    } catch (error) {
        console.error('Logout error:', error);
    }

    currentUser = null;
    renderAuthUser();
    setAppVisibility(false);
    setAuthMode('login');
    showSuccessToast('Logged out successfully.');
}

async function loadStats() {
    if (!isUserLoggedIn()) return;

    try {
        const { response, data } = await requestJSON(routes().moviesStats || './DB_Ops.php?action=stats', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (response.status === 401) {
            await forceLogout('Please log in to view your stats.');
            return;
        }

        if (!data.success) {
            throw new Error(data.error || "Couldn't get your movies statistics.");
        }

        document.getElementById('statTotal').textContent = data.stats.total_movies || 0;
        document.getElementById('statWatched').textContent = data.stats.by_status?.watched || 0;
        document.getElementById('statWatching').textContent = data.stats.by_status?.watching || 0;
        document.getElementById('statWatchlist').textContent = data.stats.by_status?.watchlist || 0;
        document.getElementById('statAvgRating').textContent = data.stats.overall_avg_rating || '—';
    } catch (error) {
        showErrorToast(error.message || "Couldn't get your movies statistics.");
        console.error('Error:', error);
    }
}

function getBadgeClass(status) {
    const map = {
        watched: 'badge-watched',
        watching: 'badge-watching',
        watchlist: 'badge-watchlist',
    };
    return map[status] || 'badge-watchlist';
}

function renderStars(rating) {
    const value = Math.min(Math.max(rating || 0, 0), 10) / 2;
    const fullStars = Math.floor(value);
    const hasHalf = value % 1 >= 0.25 && value % 1 < 0.75;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    let html = '';
    for (let i = 0; i < fullStars; i++) html += '<span class="star filled">★</span>';

    if (hasHalf) {
        html += `
            <span class="star half-star-wrapper">
                <span class="star-bg">☆</span>
                <span class="star-fg" style="width: ${(value % 1) * 100}%">★</span>
            </span>
        `;
    }

    for (let i = 0; i < emptyStars; i++) html += '<span class="star empty">☆</span>';
    return html;
}

function renderMovies(movies) {
    const grid = document.getElementById('moviesGrid');
    const emptyState = document.getElementById('emptyState');

    if (!grid || !emptyState) return;

    if (!movies || movies.length === 0) {
        grid.innerHTML = '';
        grid.appendChild(emptyState);
        emptyState.style.display = 'block';
        return;
    }

    grid.innerHTML = '';
    grid.appendChild(emptyState);
    emptyState.style.display = 'none';

    movies.forEach((movie) => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.id = movie.id;

        const posterWrap = document.createElement('div');
        posterWrap.className = 'card-poster-wrap';
        posterWrap.style.cssText = 'width:100%;height:200px;overflow:hidden;';

        if (movie.poster) {
            const posterSrc = movie.poster.startsWith('uploads/') ? './' + movie.poster : movie.poster;
            posterWrap.innerHTML = `<img src="${posterSrc}" alt="${movie.title}" class="card-poster" style="width:100%;height:100%;object-fit:cover;">`;
            const img = posterWrap.querySelector('img');
            img.onerror = () => {
                posterWrap.innerHTML = '<div class="card-poster-placeholder">🎬</div>';
            };
        } else {
            posterWrap.innerHTML = '<div class="card-poster-placeholder">🎬</div>';
        }

        const body = document.createElement('div');
        body.className = 'card-body';
        body.innerHTML = `
            <span class="badge ${getBadgeClass(movie.status)}">${movie.status}</span>
            <div class="card-title" title="${movie.title}">${movie.title}</div>
            <div class="card-rating" title="Rating: ${movie.rating || 0}/5">
                ${renderStars(movie.rating)}
            </div>
            <div class="card-meta">${[movie.year, movie.genre].filter(Boolean).join(' • ') || '—'}</div>
            <div class="card-actions">
                <button class="btn-edit" data-action="edit" data-id="${movie.id}">✏️ Edit</button>
                <button class="btn-delete" data-action="delete" data-id="${movie.id}">🗑️ Delete</button>
            </div>
        `;

        card.appendChild(posterWrap);
        card.appendChild(body);

        body.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditMovieModal(movie);
        });

        body.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteMovie(movie.id);
        });

        grid.appendChild(card);
    });
}

async function getMovies(search = '', status = '', sort = '') {
    if (!isUserLoggedIn()) return;

    showLoading('loadingState');

    try {
        const url = moviesListUrl(search, status, sort);

        const { response, data } = await requestJSON(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (response.status === 401) {
            hideLoading();
            await forceLogout('Please log in to continue.');
            return;
        }

        if (!data.success) {
            throw new Error(data.error || "Couldn't get your movies.");
        }

        renderMovies(data.movies);
    } catch (err) {
        showErrorToast(err.message || "Couldn't get your movies.");
        console.error('Error:', err);
    } finally {
        hideLoading('loadingState');
    }
}

const movieModal = document.getElementById('movieModal');
const closeModalBtn = document.getElementById('closeModal');
const cancelModalBtn = document.getElementById('cancelModal');
const saveMovieBtn = document.getElementById('saveMovie');
const uploadArea = document.getElementById('uploadArea');
const posterFileInput = document.getElementById('posterFile');

const fields = {
    movieId: document.getElementById('movieId'),
    imdbId: document.getElementById('imdbId'),
    title: document.getElementById('movieTitle'),
    year: document.getElementById('movieYear'),
    genre: document.getElementById('movieGenre'),
    rating: document.getElementById('movieRating'),
    status: document.getElementById('movieStatus'),
    posterPath: document.getElementById('uploadedPosterPath'),
};

const errors = {
    title: document.getElementById('errTitle'),
    year: document.getElementById('errYear'),
    rating: document.getElementById('errRating'),
    status: document.getElementById('errStatus'),
    poster: document.getElementById('errPoster'),
};

function resetForm() {
    fields.movieId.value = '';
    fields.imdbId.value = '';
    fields.posterPath.value = '';
    fields.title.value = '';
    fields.year.value = '';
    fields.genre.value = '';
    fields.rating.value = '';
    fields.status.value = '';
    posterFileInput.value = '';

    const preview = document.getElementById('filePreview');
    preview.src = '';
    preview.style.display = 'none';

    clearAllErrors();
}

function clearError(fieldKey) {
    if (errors[fieldKey]) errors[fieldKey].textContent = '';

    const inputMap = {
        title: fields.title,
        year: fields.year,
        rating: fields.rating,
        status: fields.status,
    };

    const input = inputMap[fieldKey];
    if (input) input.classList.remove('input-error');
}

function clearAllErrors() {
    Object.values(errors).forEach((el) => {
        if (el) el.textContent = '';
    });
    document.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
}

function setError(fieldKey, message) {
    if (errors[fieldKey]) errors[fieldKey].textContent = message;

    const inputMap = {
        title: fields.title,
        year: fields.year,
        rating: fields.rating,
        status: fields.status,
    };

    const input = inputMap[fieldKey];
    if (input) input.classList.add('input-error');
}

function handlePosterSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
        setError('poster', 'Only JPG, PNG, and WEBP images are allowed.');
        e.target.value = '';
        return;
    }

    if (file.size > maxSize) {
        setError('poster', 'Image must be smaller than 2 MB.');
        e.target.value = '';
        return;
    }

    clearError('poster');

    const preview = document.getElementById('filePreview');
    const reader = new FileReader();
    reader.onload = function (evt) {
        preview.src = evt.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function validateForm() {
    clearAllErrors();
    let isValid = true;

    const title = fields.title.value.trim();
    if (!title) {
        setError('title', 'Title is required.');
        isValid = false;
    } else if (title.length > 255) {
        setError('title', 'Title must be 255 characters or less.');
        isValid = false;
    }

    const yearVal = fields.year.value.trim();
    if (yearVal !== '') {
        const minYear = 1888;
        const maxYear = new Date().getFullYear() + 5;
        const year = parseInt(yearVal, 10);
        if (isNaN(year) || year < minYear || year > maxYear) {
            setError('year', `Year must be between ${minYear} and ${maxYear}.`);
            isValid = false;
        }
    }

    const ratingVal = fields.rating.value.trim();
    if (ratingVal !== '') {
        const rating = parseFloat(ratingVal);
        if (isNaN(rating) || rating < 0 || rating > 10) {
            setError('rating', 'Rating must be between 0 and 10.');
            isValid = false;
        }
    }

    const status = fields.status.value.trim();
    if (!status) {
        setError('status', 'Please select a status.');
        isValid = false;
    }

    return isValid;
}

async function handleSave() {
    if (!isUserLoggedIn()) {
        await forceLogout('Please log in to save movies.');
        return;
    }

    if (!validateForm()) return;

    const year = parseInt(fields.year.value, 10);
    const status = fields.status.value;
    const currentYear = new Date().getFullYear();

    if (!isNaN(year) && year > currentYear && status !== 'watchlist') {
        setError('status', 'Future movies can only have status "watchlist".');
        showErrorToast('Future movies can only have status "watchlist".');
        return;
    }

    const isEdit = fields.movieId.value !== '';
    const formData = new FormData();
    if (!routes().movies) {
        formData.append('action', isEdit ? 'update' : 'add');
        if (isEdit) formData.append('id', fields.movieId.value);
    }

    formData.append('title', fields.title.value.trim());
    formData.append('year', fields.year.value.trim());
    formData.append('genre', fields.genre.value.trim());
    formData.append('rating', fields.rating.value.trim());
    formData.append('status', fields.status.value.trim());
    formData.append('imdb_id', fields.imdbId.value.trim());

    const posterPath = fields.posterPath.value.trim();
    if (posterPath) formData.append('poster', posterPath);

    const file = posterFileInput.files[0];
    if (file) formData.append('posterFile', file);

    saveMovieBtn.disabled = true;
    saveMovieBtn.textContent = isEdit ? 'Updating...' : 'Saving...';

    const legacyUrl = './DB_Ops.php';
    const baseMovies = routes().movies;
    const url = baseMovies
        ? (isEdit ? movieResourceUrl(fields.movieId.value) : baseMovies)
        : legacyUrl;

    try {
        const { response, data } = await requestJSON(url, {
            method: 'POST',
            body: formData,
        });

        if (response.status === 401) {
            await forceLogout('Please log in to manage movies.');
            return;
        }

        if (data.success) {
            showSuccessToast(data.message || (isEdit ? 'Movie updated.' : 'Movie added.'));
            hideMovieModal();
            await Promise.all([getMovies(currentSearch, currentStatus, currentSort), loadStats()]);
            return;
        }

        if (data.errors && Array.isArray(data.errors)) {
            data.errors.forEach((err) => showErrorToast(err));
        } else {
            showErrorToast(data.error || (isEdit ? 'Failed to update movie.' : 'Failed to add movie.'));
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorToast('Network error. Please try again.');
    } finally {
        saveMovieBtn.disabled = false;
        saveMovieBtn.textContent = 'Save Movie';
    }
}

function openEditMovieModal(movie) {
    fields.movieId.value = movie.id ?? '';
    fields.imdbId.value = movie.imdb_id ?? '';
    fields.posterPath.value = movie.poster ?? '';
    fields.title.value = movie.title ?? '';
    fields.year.value = movie.year ?? '';
    fields.genre.value = movie.genre ?? '';
    fields.rating.value = movie.rating ?? '';
    fields.status.value = movie.status ?? '';

    document.getElementById('modalTitle').textContent = 'Edit Movie';

    const preview = document.getElementById('filePreview');
    if (movie.poster) {
        const posterSrc = movie.poster.startsWith('uploads/') ? './' + movie.poster : movie.poster;
        preview.src = posterSrc;
        preview.style.display = 'block';
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }

    posterFileInput.value = '';
    clearAllErrors();
    movieModal.classList.remove('hidden');
}

async function deleteMovie(id) {
    if (!confirm('Delete this movie?')) return;

    try {
        const useLaravel = !!routes().movies;
        const url = useLaravel ? movieResourceUrl(id) : './DB_Ops.php?action=delete';
        const init = useLaravel
            ? { method: 'DELETE' }
            : {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ id }),
            };

        const { response, data } = await requestJSON(url, init);

        if (response.status === 401) {
            await forceLogout('Please log in to manage movies.');
            return;
        }

        if (!data.success) throw new Error(data.error || "Couldn't delete the movie.");

        showSuccessToast('Movie removed successfully.');
        await Promise.all([getMovies(currentSearch, currentStatus, currentSort), loadStats()]);
    } catch (err) {
        showErrorToast(err.message || "Couldn't delete the movie.");
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const listSearch = document.getElementById('listSearch');
    const sortSelect = document.getElementById('sortSelectMain');
    const tabs = document.querySelector('.filter-tabs');
    const addButton = document.getElementById('addMovieBtn');

    document.getElementById('showLoginTab')?.addEventListener('click', () => setAuthMode('login'));
    document.getElementById('showSignupTab')?.addEventListener('click', () => setAuthMode('signup'));
    document.getElementById('loginForm')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('signupForm')?.addEventListener('submit', handleSignupSubmit);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    closeModalBtn?.addEventListener('click', hideMovieModal);
    cancelModalBtn?.addEventListener('click', hideMovieModal);
    saveMovieBtn?.addEventListener('click', handleSave);

    uploadArea?.addEventListener('click', () => posterFileInput.click());
    posterFileInput?.addEventListener('change', handlePosterSelect);

    fields.title?.addEventListener('input', () => clearError('title'));
    fields.year?.addEventListener('input', () => clearError('year'));
    fields.rating?.addEventListener('input', () => clearError('rating'));
    fields.status?.addEventListener('change', () => clearError('status'));

    movieModal?.addEventListener('click', (e) => {
        if (e.target === movieModal) hideMovieModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && movieModal && !movieModal.classList.contains('hidden')) {
            hideMovieModal();
        }
    });

    listSearch?.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim();
        window.clearTimeout(window.__movieSearchTimeout);
        window.__movieSearchTimeout = window.setTimeout(() => {
            getMovies(currentSearch, currentStatus, currentSort);
        }, 300);
    });

    sortSelect?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        getMovies(currentSearch, currentStatus, currentSort);
    });

    tabs?.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab') || e.target.classList.contains('active')) return;

        Array.from(tabs.children).forEach((tab) => tab.classList.remove('active'));
        e.target.classList.add('active');
        currentStatus = e.target.dataset.filter;
        getMovies(currentSearch, currentStatus, currentSort);
    });

    addButton?.addEventListener('click', () => {
        resetForm();
        document.getElementById('modalTitle').textContent = 'Add a Movie';
        showMovieModal();
    });

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach((link) => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            switchToView(this.dataset.view);
        });
    });

    const logo = document.querySelector('.logo');
    const logoIcon = document.querySelector('.logo-icon');
    const logoText = document.querySelector('.logo-text');
    const navToggle = document.getElementById('navToggle');
    const mainNav = document.getElementById('mainNav');

    function goToMyList() {
        switchToView('list');
    }

    logo?.addEventListener('click', goToMyList);
    logoIcon?.addEventListener('click', goToMyList);
    logoText?.addEventListener('click', goToMyList);

    navToggle?.addEventListener('click', function () {
        mainNav?.classList.toggle('nav-open');
    });

    document.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                mainNav?.classList.remove('nav-open');
            }
        });
    });

    await verifySession();
});
