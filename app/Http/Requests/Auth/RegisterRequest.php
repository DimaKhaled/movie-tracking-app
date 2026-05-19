<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\JsonFormRequest;

class RegisterRequest extends JsonFormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('confirm_password') && ! $this->has('password_confirmation')) {
            $this->merge(['password_confirmation' => $this->input('confirm_password')]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.min' => 'Name must be at least 2 characters.',
            'email.unique' => 'This email is already registered.',
            'password.min' => 'Password must be at least 6 characters.',
            'password.confirmed' => 'Password and confirm password must match.',
        ];
    }
}
