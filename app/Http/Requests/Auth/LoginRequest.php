<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\JsonFormRequest;

class LoginRequest extends JsonFormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Please enter your email.',
            'email.email' => 'Please enter a valid email.',
            'password.required' => 'Please enter your password.',
        ];
    }
}
