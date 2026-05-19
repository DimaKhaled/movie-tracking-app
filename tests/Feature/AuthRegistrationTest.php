<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(VerifyCsrfToken::class);
    }

    public function test_register_creates_user_in_database(): void
    {
        $response = $this->post(route('auth.register'), [
            'name' => 'Nada Ahmed',
            'email' => 'nada@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ]);

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('users', [
            'email' => 'nada@example.com',
            'name' => 'Nada Ahmed',
        ]);

        $user = User::where('email', 'nada@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNotSame('', $user->password_hash);
    }
}
