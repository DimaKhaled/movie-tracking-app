<?php

namespace App\Http\Requests;

class OmdbSearchRequest extends JsonFormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'search' => $this->query('search'),
            'page' => $this->query('page', 1),
        ]);
    }

    public function rules(): array
    {
        return [
            'search' => ['required', 'string', 'min:1', 'max:200'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'search.required' => 'Search term is required',
        ];
    }
}
