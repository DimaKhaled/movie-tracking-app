<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movies', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id')->nullable()->index('idx_movies_user_id');
            $table->string('title', 255);
            $table->integer('year')->nullable();
            $table->string('genre', 255)->nullable();
            $table->float('rating')->nullable();
            $table->enum('status', ['watchlist', 'watching', 'watched'])->default('watchlist');
            $table->string('poster', 255)->nullable();
            $table->string('imdb_id', 12)->nullable();
            $table->dateTime('created_at')->useCurrent();

            $table->unique(['user_id', 'imdb_id'], 'uniq_user_imdb');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movies');
    }
};
