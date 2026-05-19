<?php

namespace Tests\Unit;

use App\Services\OmdbService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OmdbServiceTest extends TestCase
{
    public function test_fetch_by_query_returns_null_when_http_fails(): void
    {
        config(['services.omdb.api_key' => 'test-key']);

        Http::fake([
            'www.omdbapi.com/*' => Http::response(null, 500),
        ]);

        $service = new OmdbService;

        $this->assertNull($service->fetchByQuery('Inception', 1));
    }

    public function test_fetch_by_query_returns_null_without_api_key(): void
    {
        config(['services.omdb.api_key' => '']);

        Http::fake();

        $service = new OmdbService;

        $this->assertNull($service->fetchByQuery('anything', 1));
    }
}
