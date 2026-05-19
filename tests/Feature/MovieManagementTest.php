<?php

namespace Tests\Feature;

use App\Models\Movie;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MovieManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(VerifyCsrfToken::class);
    }

    public function test_authenticated_user_can_create_movie_via_http(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('movies.store'), [
            'title' => 'Inception',
            'year' => 2010,
            'genre' => 'Sci-Fi',
            'rating' => 9.0,
            'status' => 'watched',
            'imdb_id' => 'tt1375666',
        ]);

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('movies', [
            'user_id' => $user->id,
            'title' => 'Inception',
            'imdb_id' => 'tt1375666',
            'status' => 'watched',
        ]);
    }

    public function test_movie_list_returns_json_for_authenticated_user(): void
    {
        $user = User::factory()->create();
        Movie::create([
            'user_id' => $user->id,
            'title' => 'Dune',
            'year' => 2021,
            'genre' => 'Sci-Fi',
            'rating' => 8.5,
            'status' => 'watchlist',
            'poster' => null,
            'imdb_id' => null,
        ]);

        $response = $this->actingAs($user)->get(route('movies.index'));

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('count', 1)
            ->assertJsonFragment(['title' => 'Dune']);
    }
}
