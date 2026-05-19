<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class StoreMovieRequest extends JsonFormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->input('year') === '' || $this->input('year') === null) {
            $merge['year'] = null;
        }
        if ($this->input('rating') === '' || $this->input('rating') === null) {
            $merge['rating'] = null;
        }
        if ($this->input('genre') === '') {
            $merge['genre'] = null;
        }
        if ($this->input('imdb_id') === '') {
            $merge['imdb_id'] = null;
        }
        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        $maxYear = (int) date('Y') + 5;

        return [
            'title' => ['required', 'string', 'max:255'],
            'year' => ['nullable', 'integer', 'min:1888', 'max:'.$maxYear],
            'genre' => ['nullable', 'string', 'max:255'],
            'rating' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'status' => ['required', Rule::in(['watchlist', 'watching', 'watched'])],
            'poster' => ['nullable', 'string', 'max:2048'],
            'imdb_id' => ['nullable', 'string', 'max:12'],
            'posterFile' => ['nullable', 'file', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $year = $this->integer('year');
            $status = $this->string('status')->toString();
            $currentYear = (int) date('Y');

            if ($year !== null && $year > $currentYear && $status !== 'watchlist') {
                $validator->errors()->add('status', 'Future movies can only have status "watchlist".');
            }
        });
    }
}
