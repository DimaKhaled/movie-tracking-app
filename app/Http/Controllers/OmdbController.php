<?php

namespace App\Http\Controllers;

use App\Http\Requests\OmdbSearchRequest;
use App\Services\OmdbService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OmdbController extends Controller
{
    public function __construct(
        private readonly OmdbService $omdb
    ) {}

    public function search(OmdbSearchRequest $request): JsonResponse
    {
        if (empty(config('services.omdb.api_key'))) {
            return response()->json([
                'success' => false,
                'error' => 'Movie search is not configured. Please contact the site administrator.',
            ], 503);
        }

        $validated = $request->validated();
        $search = trim($validated['search']);
        $page = isset($validated['page']) ? max(1, (int) $validated['page']) : 1;

        $data = $this->omdb->fetchByQuery($search, $page);

        if ($data === null || ($data['Response'] ?? 'False') === 'False') {
            return response()->json([
                'success' => false,
                'error' => $data['Error'] ?? 'No results found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'page' => $page,
            'data' => $data,
        ]);
    }

    public function featured(Request $request): JsonResponse
    {
        if (empty(config('services.omdb.api_key'))) {
            return response()->json([
                'success' => false,
                'error' => 'Movie search service is temporarily unavailable. Please try again later.',
            ], 503);
        }

        $page = max(1, (int) $request->query('page', 1));
        $perPage = (int) $request->query('per_page', 12);
        $perPage = max(8, min(20, $perPage));

        $featuredQueries = [
            '2024',
            '2023',
            'Marvel',
            'Batman',
            'Dune',
            'Mission Impossible',
            'Top Gun',
            'Avengers',
            'Fast and Furious',
            'Harry Potter',
        ];

        $maxPagesPerQuery = 4;
        $targetPoolSize = max($perPage * 6, 72);
        $seen = [];
        $featured = [];

        foreach ($featuredQueries as $query) {
            for ($i = 1; $i <= $maxPagesPerQuery; $i++) {
                $data = $this->omdb->fetchByQuery($query, $i);
                if (! $data || empty($data['Search'])) {
                    break;
                }

                foreach ($data['Search'] as $movie) {
                    $imdbId = $movie['imdbID'] ?? '';
                    if ($imdbId === '' || isset($seen[$imdbId])) {
                        continue;
                    }

                    $seen[$imdbId] = true;
                    $featured[] = $movie;

                    if (count($featured) >= $targetPoolSize) {
                        break 3;
                    }
                }
            }
        }

        $totalResults = count($featured);
        $totalPages = (int) max(1, ceil($totalResults / $perPage));
        $page = min($page, $totalPages);
        $offset = ($page - 1) * $perPage;
        $slice = array_slice($featured, $offset, $perPage);

        return response()->json([
            'success' => true,
            'mode' => 'featured',
            'page' => $page,
            'per_page' => $perPage,
            'total_results' => $totalResults,
            'total_pages' => $totalPages,
            'data' => ['Search' => $slice],
        ]);
    }
}
