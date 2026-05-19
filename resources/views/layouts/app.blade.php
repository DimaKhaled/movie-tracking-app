<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'CineTrack — Your Personal Film Archive')</title>
    @php
        $cssPath = public_path('css/style.css');
        $cssV = file_exists($cssPath) ? (string) filemtime($cssPath) : '1';
    @endphp
    <link rel="stylesheet" href="{{ asset('css/style.css') }}?v={{ $cssV }}">
    @stack('head')
</head>
<body>

@include('partials.header')

@yield('content')

@include('partials.footer')

@php
    $cineRoutes = [
        'me' => route('auth.me'),
        'login' => route('auth.login'),
        'register' => route('auth.register'),
        'logout' => route('auth.logout'),
        'movies' => url('/movies'),
        'moviesStats' => route('movies.stats'),
        'omdbSearch' => route('omdb.search'),
        'omdbFeatured' => route('omdb.featured'),
    ];
    $jsPath = public_path('js/app.js');
    $apiJsPath = public_path('js/api_ops.js');
    $jsV = file_exists($jsPath) ? (string) filemtime($jsPath) : '1';
    $apiJsV = file_exists($apiJsPath) ? (string) filemtime($apiJsPath) : '1';
@endphp
<script>
    window.CineTrack = { routes: @json($cineRoutes) };
</script>
<script src="{{ asset('js/api_ops.js') }}?v={{ $apiJsV }}"></script>
<script src="{{ asset('js/app.js') }}?v={{ $jsV }}"></script>
@stack('scripts')
</body>
</html>
