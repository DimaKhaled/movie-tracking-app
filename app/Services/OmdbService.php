<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class OmdbService
{
    public function fetchByQuery(string $query, int $page = 1): ?array
    {
        $key = config('services.omdb.api_key');
        if (empty($key)) {
            return null;
        }

        $page = max(1, min(100, $page));
        $url = 'https://www.omdbapi.com/?s='.urlencode($query).'&page='.$page.'&apikey='.$key;

        try {
            $response = Http::timeout(10)->get($url);
        } catch (\Throwable) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        if (! is_array($data) || ($data['Response'] ?? 'False') === 'False') {
            return null;
        }

        return $data;
    }
}
