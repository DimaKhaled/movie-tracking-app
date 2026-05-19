<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        if (! Auth::check()) {
            return response()->json([
                'success' => true,
                'loggedIn' => false,
            ]);
        }

        $user = Auth::user();

        return response()->json([
            'success' => true,
            'loggedIn' => true,
            'user' => [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
                'email' => (string) $user->email,
            ],
        ]);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $email = strtolower($request->validated('email'));
        $password = $request->validated('password');

        if (! Auth::attempt(['email' => $email, 'password' => $password])) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid email or password.',
            ], 401);
        }

        $request->session()->regenerate();

        $user = Auth::user();

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'user' => [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
                'email' => (string) $user->email,
            ],
        ]);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        User::create([
            'name' => $request->validated('name'),
            'email' => strtolower($request->validated('email')),
            'password_hash' => $request->validated('password'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully. Please log in.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }
}
