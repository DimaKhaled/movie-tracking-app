@extends('layouts.app')

@section('content')
<section class="auth-gate" id="authGate">
    <div class="auth-card">
        <h2>Welcome to CineTrack</h2>
        <p>Create your account or login to manage your personal movie list.</p>

        <div class="auth-tabs">
            <button class="auth-tab active" id="showLoginTab" type="button">Login</button>
            <button class="auth-tab" id="showSignupTab" type="button">Sign Up</button>
        </div>

        <form id="loginForm" class="auth-form">
            <div class="form-group">
                <label for="loginEmail">Email</label>
                <input type="text" id="loginEmail" name="email" autocomplete="email" required>
            </div>
            <div class="form-group">
                <label for="loginPassword">Password</label>
                <input type="password" id="loginPassword" name="password" autocomplete="current-password" required>
            </div>
            <button class="btn btn-gold" id="loginBtn" type="submit">Login</button>
        </form>

        <form id="signupForm" class="auth-form hidden">
            <div class="form-group">
                <label for="signupName">Name</label>
                <input type="text" id="signupName" name="name" autocomplete="name" required>
            </div>
            <div class="form-group">
                <label for="signupEmail">Email</label>
                <input type="text" id="signupEmail" name="email" autocomplete="email" required>
            </div>
            <div class="form-group">
                <label for="signupPassword">Password</label>
                <input type="password" id="signupPassword" name="password" autocomplete="new-password" required>
            </div>
            <div class="form-group">
                <label for="signupConfirmPassword">Confirm Password</label>
                <input type="password" id="signupConfirmPassword" name="confirm_password" autocomplete="new-password" required>
            </div>
            <button class="btn btn-gold" id="signupBtn" type="submit">Create Account</button>
        </form>

        <p class="field-error auth-error" id="authError"></p>
        <p class="auth-notice hidden" id="authNotice"></p>
    </div>
</section>

<main class="site-main hidden" id="app">

    <div class="hero">
        <div class="hero-inner">
            <h1 class="hero-title">Track every movie you love</h1>
            <p class="hero-subtitle">Search, save, and rate your favorite films</p>

            <div class="search-bar" id="main-search">
                <input
                    type="text"
                    id="omdbSearch"
                    class="search-input"
                    placeholder="Search by movie title (e.g. Inception)..."
                    autocomplete="off"
                />
                <button id="searchBtn" class="btn btn-gold">Search</button>
            </div>
        </div>
    </div>


    <section class="view active" id="view-list">
        <div class="main-content">

            <div class="section-header">
                <h2 class="section-title">My Movies</h2>
            </div>

            <div class="filter-tabs">
                <button class="tab active" data-filter="">All</button>
                <button class="tab" data-filter="watchlist">Watchlist</button>
                <button class="tab" data-filter="watching">Watching</button>
                <button class="tab" data-filter="watched">Watched</button>
                <button id="addMovieBtn" class="btn btn-gold">Add Movie</button>
            </div>


            <div class="list-controls">
                <input type="text" id="listSearch" placeholder="Search your saved movies..." />
                <select id="sortSelectMain">
                    <option value="created_at">Date Added</option>
                    <option value="title">Title A–Z</option>
                    <option value="year">Year</option>
                    <option value="rating">Rating</option>
                </select>
            </div>

            <div id="notification" class="notification hidden"></div>

            <div class="movies-grid" id="moviesGrid">

                <div class="loading-wrap" id="loadingState">
                    <span class="spinner"></span>
                    <span>Loading your movies...</span>
                </div>

                <div class="empty-state" id="emptyState">
                    <span class="empty-icon">&#127916;</span>
                    <p>No movies yet. Add one using the button above or search in Discover!</p>
                </div>
            </div>

        </div>
    </section>


    <section class="view" id="view-search">
        <div class="main-content">
            <div class="section-header">
                <h2 class="section-title" id="discoverTitle">Search Results</h2>
            </div>
            <div id="apiResults" class="api-results-grid"></div>
            <div id="apiPagination" class="api-pagination hidden"></div>
        </div>
    </section>


    <section class="view" id="view-stats">
        <div class="main-content">

            <div class="section-header">
                <h2 class="section-title">Your Stats</h2>
                <p class="section-sub">A snapshot of your film journey</p>
            </div>

            <div class="stats-row">
                <div class="stat-card">
                    <span class="stat-number" id="statTotal">0</span>
                    <span class="stat-label">Total Saved</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number green" id="statWatched">0</span>
                    <span class="stat-label">Watched</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number blue" id="statWatching">0</span>
                    <span class="stat-label">Watching</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number amber" id="statWatchlist">0</span>
                    <span class="stat-label">Watchlist</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number" id="statAvgRating">—</span>
                    <span class="stat-label">Avg. Rating</span>
                </div>
            </div>

        </div>
    </section>

</main>


<div class="modal-overlay hidden" id="movieModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="modal">
        <div class="modal-header">
            <h3 id="modalTitle">Add a Movie</h3>
            <button class="modal-close" id="closeModal" type="button" aria-label="Close">&times;</button>
        </div>

        <div class="modal-body">

            <input type="hidden" id="movieId" value="">
            <input type="hidden" id="imdbId" name="imdb_id" value="">
            <input type="hidden" id="uploadedPosterPath" name="poster" value="">

            <div class="form-group">
                <label for="movieTitle">Title <span class="required">*</span></label>
                <input type="text" id="movieTitle" name="title" placeholder="e.g. Inception" maxlength="255" autocomplete="off">
                <span class="field-error" id="errTitle"></span>
            </div>

            <div class="form-group">
                <label for="movieRating">My Rating (0–10)</label>
                <input type="number" id="movieRating" name="rating" placeholder="e.g. 9.0" min="0" max="10" step="0.1">
                <span class="field-error" id="errRating"></span>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="movieYear">Year</label>
                    <input type="number" id="movieYear" name="year" placeholder="e.g. 2010" min="1888" max="2200">
                    <span class="field-error" id="errYear"></span>
                </div>
                <div class="form-group">
                    <label for="movieGenre">Genre</label>
                    <input type="text" id="movieGenre" name="genre" placeholder="e.g. Action, Drama" maxlength="255">
                </div>
            </div>

            <div class="form-group">
                <label for="movieStatus">Status <span class="required">*</span></label>
                <select id="movieStatus" name="status">
                    <option value="">-- Select --</option>
                    <option value="watchlist">Watchlist</option>
                    <option value="watching">Watching</option>
                    <option value="watched">Watched</option>
                </select>
                <span class="field-error" id="errStatus"></span>
            </div>

            <div class="form-group">
                <label>Poster Image (optional)</label>
                <div class="file-upload-area" id="uploadArea">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p>Click to upload an image</p>
                    <span>JPG, PNG, WEBP &middot; max 2 MB</span>
                </div>
                <input type="file" id="posterFile" name="posterFile" accept="image/jpeg,image/png,image/webp">
                <img id="filePreview" class="file-preview" alt="Poster preview">
                <div class="form-hint">Leave blank to keep the OMDb image if available.</div>
                <span class="field-error" id="errPoster"></span>
            </div>

        </div>

        <div class="modal-footer">
            <button class="btn btn-outline" id="cancelModal" type="button">Cancel</button>
            <button class="btn btn-gold" id="saveMovie" type="button">Save Movie</button>
        </div>

    </div>
</div>


<div id="toast-container" role="status" aria-live="polite" aria-atomic="true"></div>
@endsection
