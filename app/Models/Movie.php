<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Movie extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'title',
        'year',
        'genre',
        'rating',
        'status',
        'poster',
        'imdb_id',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'rating' => 'float',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
