// API_Ops.js - Handles OMDB API operations

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('omdbSearch');
    const apiResults = document.getElementById('apiResults');
    const apiPagination = document.getElementById('apiPagination');
    const discoverTitle = document.getElementById('discoverTitle');

    let discoverMode = 'featured';
    let activeQuery = '';
    let currentPage = 1;
    let totalPages = 1;

    searchBtn.addEventListener('click', performSearch);

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    async function performSearch() {
        if (typeof window.isUserLoggedIn === 'function' && !window.isUserLoggedIn()) {
            showErrorToast('Please login to search and save movies.');
            return;
        }

        const query = searchInput.value.trim();
        if (!query) {
            discoverMode = 'featured';
            activeQuery = '';
            loadFeaturedMovies(1);
            return;
        }

        switchToView('search');

        discoverMode = 'search';
        activeQuery = query;
        loadSearchResults(query, 1);
    }

    function setDiscoverHeading() {
        if (!discoverTitle) return;
        if (discoverMode === 'search' && activeQuery) {
            discoverTitle.textContent = `Search Results for "${activeQuery}"`;
            return;
        }
        discoverTitle.textContent = 'Hot Right Now';
    }

    function renderPagination() {
        if (!apiPagination) return;

        if (totalPages <= 1) {
            apiPagination.classList.add('hidden');
            apiPagination.innerHTML = '';
            return;
        }

        apiPagination.classList.remove('hidden');
        apiPagination.innerHTML = '';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.textContent = 'Prev';
        prevBtn.disabled = currentPage <= 1;
        prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
        apiPagination.appendChild(prevBtn);

        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);

        for (let page = start; page <= end; page++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${page === currentPage ? 'active' : ''}`;
            btn.textContent = String(page);
            btn.addEventListener('click', () => goToPage(page));
            apiPagination.appendChild(btn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
        apiPagination.appendChild(nextBtn);
    }

    function goToPage(page) {
        if (page < 1 || page > totalPages) return;

        if (discoverMode === 'search') {
            loadSearchResults(activeQuery, page);
            return;
        }

        loadFeaturedMovies(page);
    }

    async function loadSearchResults(query, page = 1) {
        apiResults.innerHTML = '<div class="loading-wrap"><span class="spinner"></span><span>Searching...</span></div>';

        try {
            const r = (window.CineTrack && window.CineTrack.routes) || {};
            const url = r.omdbSearch
                ? `${r.omdbSearch}?search=${encodeURIComponent(query)}&page=${page}`
                : `./API_Ops.php?search=${encodeURIComponent(query)}&page=${page}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                const totalResults = parseInt(data?.data?.totalResults || '0', 10);
                currentPage = Number(data.page || page);
                totalPages = Math.max(1, Math.ceil(totalResults / 10));
                setDiscoverHeading();
                renderSearchResults(data.data.Search || []);
                renderPagination();
            } else {
                totalPages = 1;
                renderPagination();
                const msg =
                    data.error ||
                    (Array.isArray(data.errors) ? data.errors[0] : null) ||
                    'Search failed.';
                apiResults.innerHTML = `<div class="error-message">${msg}</div>`;
            }
        } catch (error) {
            totalPages = 1;
            renderPagination();
            console.error('Search error:', error);
            apiResults.innerHTML = '<div class="error-message">Failed to search movies. Please try again.</div>';
        }
    }

    async function loadFeaturedMovies(page = 1) {
        apiResults.innerHTML = '<div class="loading-wrap"><span class="spinner"></span><span>Loading hot movies...</span></div>';

        try {
            const r = (window.CineTrack && window.CineTrack.routes) || {};
            const url = r.omdbFeatured
                ? `${r.omdbFeatured}?page=${page}&per_page=12`
                : `./API_Ops.php?action=featured&page=${page}&per_page=12`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                currentPage = Number(data.page || page);
                totalPages = Number(data.total_pages || 1);
                setDiscoverHeading();
                renderSearchResults(data.data.Search || []);
                renderPagination();
            } else {
                totalPages = 1;
                renderPagination();
                const msg = data.error || 'No featured movies available right now.';
                apiResults.innerHTML = `<div class="error-message">${msg}</div>`;
            }
        } catch (error) {
            totalPages = 1;
            renderPagination();
            console.error('Featured movies error:', error);
            apiResults.innerHTML = '<div class="error-message">Failed to load featured movies.</div>';
        }
    }

    function renderSearchResults(movies) {
        if (!movies || movies.length === 0) {
            apiResults.innerHTML = '<div class="empty-state">No movies found. Try a different search term.</div>';
            return;
        }

        apiResults.innerHTML = '';

        movies.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'api-movie-card';

            const posterUrl = movie.Poster !== 'N/A' ? movie.Poster : null;

            card.innerHTML = `
                <div class="api-card-poster">
                    ${posterUrl ? `<img src="${posterUrl}" alt="${movie.Title}" class="api-poster-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
                    <div class="api-poster-placeholder" style="display: ${posterUrl ? 'none' : 'block'};">🎬</div>
                </div>
                <div class="api-card-body">
                    <div class="api-card-title">${movie.Title}</div>
                    <div class="api-card-meta">${movie.Year}</div>
                    <button class="btn-add-movie" data-imdbid="${movie.imdbID}" data-title="${movie.Title}" data-year="${movie.Year}" data-poster="${posterUrl || ''}">Add to My List</button>
                </div>
            `;

            const addBtn = card.querySelector('.btn-add-movie');
            addBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                addMovieFromSearch(this.dataset);
            });

            apiResults.appendChild(card);
        });
    }

    function addMovieFromSearch(data) {
        if (typeof window.isUserLoggedIn === 'function' && !window.isUserLoggedIn()) {
            showErrorToast('Please login to add movies.');
            return;
        }

        document.getElementById('movieId').value = '';
        document.getElementById('imdbId').value = data.imdbid;
        document.getElementById('uploadedPosterPath').value = data.poster;
        document.getElementById('movieTitle').value = data.title;
        document.getElementById('movieYear').value = data.year;
        document.getElementById('movieGenre').value = '';
        document.getElementById('movieRating').value = '';
        document.getElementById('movieStatus').value = 'watchlist';

        const preview = document.getElementById('filePreview');
        if (data.poster) {
            preview.src = data.poster;
            preview.style.display = 'block';
        } else {
            preview.src = '';
            preview.style.display = 'none';
        }

        document.getElementById('posterFile').value = '';
        clearAllErrors();

        // Show modal
        document.getElementById('modalTitle').textContent = 'Add Movie';
        document.getElementById('movieModal').classList.remove('hidden');
    }

    loadFeaturedMovies(1);
});