<?php

namespace App\Providers;

use App\Models\Movie;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Route::bind('movie', function (string $value) {
            if (! auth()->check()) {
                abort(401);
            }

            return Movie::query()
                ->where('id', $value)
                ->where('user_id', auth()->id())
                ->firstOrFail();
        });
    }
}
