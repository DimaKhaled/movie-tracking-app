<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMovieRequest;
use App\Http\Requests\UpdateMovieRequest;
use App\Models\Movie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class MovieController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sort = $request->query('sort', 'created_at');
        $allowedSorts = ['created_at', 'title', 'year', 'rating'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }

        $direction = $sort === 'title' ? 'asc' : 'desc';

        $query = Movie::query()->where('user_id', auth()->id());

        $status = trim((string) $request->query('status', ''));
        if ($status !== '') {
            $query->where('status', $status);
        }

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('title', 'like', $like)->orWhere('genre', 'like', $like);
            });
        }

        $movies = $query->orderBy($sort, $direction)->get();

        return response()->json([
            'success' => true,
            'movies' => $movies,
            'count' => $movies->count(),
        ]);
    }

    public function stats(): JsonResponse
    {
        $userId = auth()->id();

        $totals = Movie::query()
            ->where('user_id', $userId)
            ->selectRaw('COUNT(*) as total_movies, AVG(rating) as overall_avg_rating')
            ->first();

        $byStatus = Movie::query()
            ->where('user_id', $userId)
            ->selectRaw('status, COUNT(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->all();

        $stats = [
            'total_movies' => (int) ($totals->total_movies ?? 0),
            'overall_avg_rating' => $totals && $totals->overall_avg_rating !== null
                ? round((float) $totals->overall_avg_rating, 2)
                : 0,
            'by_status' => $byStatus,
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats,
        ]);
    }

    public function store(StoreMovieRequest $request): JsonResponse
    {
        $userId = auth()->id();
        $title = Str::limit(trim($request->string('title')->toString()), 255, '');

        if ($this->titleExistsForUser($userId, $title)) {
            return response()->json([
                'success' => false,
                'errors' => ['A movie with this title already exists in your list.'],
            ], 422);
        }

        $imdbId = $request->filled('imdb_id') ? trim($request->string('imdb_id')->toString()) : null;
        if ($imdbId && $this->imdbExistsForUser($userId, $imdbId)) {
            return response()->json([
                'success' => false,
                'errors' => ['This movie is already in your list.'],
            ], 422);
        }

        $poster = $this->resolvePosterPath($request, null);

        try {
            $movie = Movie::create([
                'user_id' => $userId,
                'title' => $title,
                'year' => $request->filled('year') ? $request->integer('year') : null,
                'genre' => $request->filled('genre') ? Str::limit(trim($request->string('genre')->toString()), 255, '') : null,
                'rating' => $request->filled('rating') ? (float) $request->input('rating') : null,
                'status' => $request->string('status')->toString(),
                'poster' => $poster,
                'imdb_id' => $imdbId,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($this->isDuplicateImdbError($e)) {
                return response()->json([
                    'success' => false,
                    'errors' => ['This movie is already in your list.'],
                ], 422);
            }

            throw $e;
        }

        return response()->json([
            'success' => true,
            'id' => $movie->id,
            'message' => 'Movie added successfully.',
        ]);
    }

    public function update(UpdateMovieRequest $request, Movie $movie): JsonResponse
    {
        $this->ensureOwned($movie);

        $userId = auth()->id();
        $title = Str::limit(trim($request->string('title')->toString()), 255, '');

        if ($this->titleExistsForUser($userId, $title, $movie->id)) {
            return response()->json([
                'success' => false,
                'errors' => ['A movie with this title already exists in your list.'],
            ], 422);
        }

        $imdbId = $request->filled('imdb_id') ? trim($request->string('imdb_id')->toString()) : null;
        if ($imdbId && $this->imdbExistsForUser($userId, $imdbId, $movie->id)) {
            return response()->json([
                'success' => false,
                'errors' => ['This movie is already in your list.'],
            ], 422);
        }

        $poster = $this->resolvePosterPath($request, $movie->poster);

        $movie->title = $title;
        $movie->year = $request->filled('year') ? $request->integer('year') : null;
        $movie->genre = $request->filled('genre') ? Str::limit(trim($request->string('genre')->toString()), 255, '') : null;
        $movie->rating = $request->filled('rating') ? (float) $request->input('rating') : null;
        $movie->status = $request->string('status')->toString();
        $movie->imdb_id = $imdbId;
        $movie->poster = $poster;

        try {
            $movie->save();
        } catch (\Illuminate\Database\QueryException $e) {
            if ($this->isDuplicateImdbError($e)) {
                return response()->json([
                    'success' => false,
                    'errors' => ['This movie is already in your list.'],
                ], 422);
            }

            throw $e;
        }

        return response()->json([
            'success' => true,
            'message' => 'Movie updated successfully.',
        ]);
    }

    public function destroy(Movie $movie): JsonResponse
    {
        $this->ensureOwned($movie);

        if ($movie->poster && Str::startsWith($movie->poster, 'uploads/')) {
            $path = public_path($movie->poster);
            if (is_file($path)) {
                @unlink($path);
            }
        }

        $movie->delete();

        return response()->json([
            'success' => true,
            'message' => 'Movie deleted successfully.',
        ]);
    }

    private function ensureOwned(Movie $movie): void
    {
        abort_if((int) $movie->user_id !== (int) auth()->id(), 404);
    }

    private function titleExistsForUser(int $userId, string $title, ?int $exceptId = null): bool
    {
        $q = Movie::query()
            ->where('user_id', $userId)
            ->whereRaw('LOWER(title) = ?', [mb_strtolower($title, 'UTF-8')]);

        if ($exceptId !== null) {
            $q->where('id', '!=', $exceptId);
        }

        return $q->exists();
    }

    private function imdbExistsForUser(int $userId, string $imdbId, ?int $exceptId = null): bool
    {
        $q = Movie::query()->where('user_id', $userId)->where('imdb_id', $imdbId);

        if ($exceptId !== null) {
            $q->where('id', '!=', $exceptId);
        }

        return $q->exists();
    }

    private function isDuplicateImdbError(\Illuminate\Database\QueryException $e): bool
    {
        if ((string) $e->getCode() === '23000') {
            return true;
        }

        $msg = $e->getMessage();

        return str_contains($msg, 'UNIQUE constraint') || str_contains($msg, 'Duplicate entry');
    }

    private function resolvePosterPath(StoreMovieRequest|UpdateMovieRequest $request, ?string $currentPoster): ?string
    {
        $file = $request->file('posterFile');
        if ($file instanceof UploadedFile && $file->isValid()) {
            if ($currentPoster && Str::startsWith($currentPoster, 'uploads/')) {
                $old = public_path($currentPoster);
                if (is_file($old)) {
                    @unlink($old);
                }
            }

            return $this->storePosterFile($file);
        }

        if ($request->filled('poster')) {
            return Str::limit(trim($request->string('poster')->toString()), 2048, '');
        }

        return $currentPoster;
    }

    private function storePosterFile(UploadedFile $file): string
    {
        $dir = public_path('uploads');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $mime = $file->getMimeType();
        $extension = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => $file->getClientOriginalExtension() ?: 'jpg',
        };

        $filename = 'poster_'.uniqid('', true).'.'.$extension;
        $file->move($dir, $filename);

        return 'uploads/'.$filename;
    }
}
