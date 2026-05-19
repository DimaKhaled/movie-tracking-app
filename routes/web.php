<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MovieController;
use App\Http\Controllers\OmdbController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
Route::post('/auth/login', [AuthController::class, 'login'])->name('auth.login');
Route::post('/auth/register', [AuthController::class, 'register'])->name('auth.register');
Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

Route::get('/api/omdb/search', [OmdbController::class, 'search'])->name('omdb.search');
Route::get('/api/omdb/featured', [OmdbController::class, 'featured'])->name('omdb.featured');

Route::middleware('auth')->group(function (): void {
    Route::get('/movies/stats', [MovieController::class, 'stats'])->name('movies.stats');
    Route::get('/movies', [MovieController::class, 'index'])->name('movies.index');
    Route::post('/movies', [MovieController::class, 'store'])->name('movies.store');
    Route::post('/movies/{movie}', [MovieController::class, 'update'])->name('movies.update');
    Route::delete('/movies/{movie}', [MovieController::class, 'destroy'])->name('movies.destroy');
});
