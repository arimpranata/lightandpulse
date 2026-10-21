<?php
declare(strict_types=1);

/**
 * Bali Guide REST API (read-only).
 *
 *   GET /api/health              Service and database status
 *   GET /api/content             Everything the app needs, in one request
 *   GET /api/places              ?category=temple&region=ubud&q=lake&featured=1
 *   GET /api/places/{id}
 *   GET /api/categories
 *   GET /api/regions
 *   GET /api/itineraries
 *   GET /api/itineraries/{id}
 *   GET /api/guide               Currencies, phrases, tips and emergency numbers
 */

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/repository.php';

send_cors_headers();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($method !== 'GET') {
    header('Allow: GET, OPTIONS');
    respond_error(405, 'Method not allowed.');
}

// Path relative to the folder this script lives in, so the API works from
// /api, a subfolder, or a subdomain without changes.
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($base !== '' && str_starts_with($path, $base)) {
    $path = substr($path, strlen($base));
}
$path = preg_replace('#^/index\.php#', '', $path);
$segments = array_values(array_filter(explode('/', $path), fn ($s) => $s !== ''));
$segments = array_map('rawurldecode', $segments);

try {
    switch ($segments[0] ?? '') {
        case '':
            respond([
                'name' => 'Bali Guide API',
                'endpoints' => [
                    '/health', '/content', '/places', '/places/{id}', '/categories', '/regions',
                    '/itineraries', '/itineraries/{id}', '/guide',
                ],
            ]);

        case 'health':
            db()->query('SELECT 1');
            respond(['status' => 'ok', 'database' => 'connected', 'time' => gmdate('c')]);

        case 'content':
            respond([
                'categories' => fetch_categories(),
                'regions' => fetch_regions(),
                'places' => fetch_places(),
                'itineraries' => fetch_itineraries(),
                'guide' => fetch_guide(),
            ]);

        case 'places':
            if (isset($segments[1])) {
                $places = fetch_places(['id' => $segments[1]]);
                $places === [] ? respond_error(404, 'Place not found.') : respond($places[0]);
            }
            respond(fetch_places([
                'category' => (string) ($_GET['category'] ?? ''),
                'region' => (string) ($_GET['region'] ?? ''),
                'q' => (string) ($_GET['q'] ?? ''),
                'featured' => filter_var($_GET['featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
            ]));

        case 'categories':
            respond(fetch_categories());

        case 'regions':
            respond(fetch_regions());

        case 'itineraries':
            if (isset($segments[1])) {
                $itineraries = fetch_itineraries($segments[1]);
                $itineraries === [] ? respond_error(404, 'Itinerary not found.') : respond($itineraries[0]);
            }
            respond(fetch_itineraries());

        case 'guide':
            respond(fetch_guide());

        default:
            respond_error(404, 'Not found.');
    }
} catch (PDOException $e) {
    error_log('Bali Guide API database error: ' . $e->getMessage());
    respond_error(503, (config()['debug'] ?? false) ? $e->getMessage() : 'Database unavailable.');
}
