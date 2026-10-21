<?php
declare(strict_types=1);

/**
 * Database queries. Every function returns data in the same shape as the
 * TypeScript types in app/src/data, so the app can use API data and its
 * bundled fallback interchangeably.
 */

/** Groups rows of [$key => ..., 'body' => ...] into $key => [body, ...]. */
function group_bodies(array $rows, string $key): array
{
    $grouped = [];
    foreach ($rows as $row) {
        $grouped[$row[$key]][] = $row['body'];
    }
    return $grouped;
}

function fetch_categories(): array
{
    $rows = db()->query('SELECT id, label, icon, color_from, color_to FROM categories ORDER BY sort_order, id')->fetchAll();
    return array_map(fn (array $r) => [
        'id' => $r['id'],
        'label' => $r['label'],
        'icon' => $r['icon'],
        'gradient' => [$r['color_from'], $r['color_to']],
    ], $rows);
}

function fetch_regions(): array
{
    $rows = db()->query('SELECT id, label FROM regions ORDER BY sort_order, id')->fetchAll();
    return array_column($rows, 'label', 'id');
}

/**
 * @param array{category?: string, region?: string, q?: string, featured?: bool, id?: string} $filters
 */
function fetch_places(array $filters = []): array
{
    $where = ['published = 1'];
    $params = [];
    foreach (['id' => 'id', 'category' => 'category_id', 'region' => 'region_id'] as $filter => $column) {
        if (isset($filters[$filter]) && $filters[$filter] !== '') {
            $where[] = "$column = :$filter";
            $params[$filter] = $filters[$filter];
        }
    }
    if (!empty($filters['featured'])) {
        $where[] = 'featured = 1';
    }
    if (isset($filters['q']) && trim($filters['q']) !== '') {
        $where[] = '(name LIKE :q1 OR tagline LIKE :q2 OR area LIKE :q3)';
        $like = '%' . addcslashes(trim($filters['q']), '%_\\') . '%';
        $params += ['q1' => $like, 'q2' => $like, 'q3' => $like];
    }

    $statement = db()->prepare(
        'SELECT id, name, tagline, category_id, region_id, area, description, best_time, hours, fee,
                duration, latitude, longitude, featured
         FROM places WHERE ' . implode(' AND ', $where) . ' ORDER BY sort_order, name'
    );
    $statement->execute($params);
    $rows = $statement->fetchAll();
    if ($rows === []) {
        return [];
    }

    $ids = array_column($rows, 'id');
    $in = implode(', ', array_fill(0, count($ids), '?'));
    $highlights = db()->prepare("SELECT place_id, body FROM place_highlights WHERE place_id IN ($in) ORDER BY sort_order, id");
    $highlights->execute($ids);
    $highlights = group_bodies($highlights->fetchAll(), 'place_id');
    $tips = db()->prepare("SELECT place_id, body FROM place_tips WHERE place_id IN ($in) ORDER BY sort_order, id");
    $tips->execute($ids);
    $tips = group_bodies($tips->fetchAll(), 'place_id');

    return array_map(fn (array $r) => [
        'id' => $r['id'],
        'name' => $r['name'],
        'tagline' => $r['tagline'],
        'category' => $r['category_id'],
        'region' => $r['region_id'],
        'area' => $r['area'],
        'description' => $r['description'],
        'highlights' => $highlights[$r['id']] ?? [],
        'tips' => $tips[$r['id']] ?? [],
        'bestTime' => $r['best_time'],
        'hours' => $r['hours'],
        'fee' => $r['fee'],
        'duration' => $r['duration'],
        'coordinates' => ['latitude' => (float) $r['latitude'], 'longitude' => (float) $r['longitude']],
        'featured' => (bool) $r['featured'],
    ], $rows);
}

function fetch_itineraries(?string $id = null): array
{
    $sql = 'SELECT id, title, summary, color_from, color_to FROM itineraries WHERE published = 1';
    $params = [];
    if ($id !== null) {
        $sql .= ' AND id = :id';
        $params['id'] = $id;
    }
    $statement = db()->prepare($sql . ' ORDER BY sort_order, id');
    $statement->execute($params);
    $itineraries = $statement->fetchAll();
    if ($itineraries === []) {
        return [];
    }

    $ids = array_column($itineraries, 'id');
    $in = implode(', ', array_fill(0, count($ids), '?'));
    $statement = db()->prepare(
        "SELECT d.id AS day_id, d.itinerary_id, d.title, s.place_id, s.time_label, s.note
         FROM itinerary_days d
         LEFT JOIN itinerary_stops s ON s.day_id = d.id
         WHERE d.itinerary_id IN ($in)
         ORDER BY d.sort_order, d.id, s.sort_order, s.id"
    );
    $statement->execute($ids);

    $days = [];
    foreach ($statement->fetchAll() as $row) {
        $days[$row['itinerary_id']][$row['day_id']] ??= ['title' => $row['title'], 'stops' => []];
        if ($row['place_id'] !== null) {
            $days[$row['itinerary_id']][$row['day_id']]['stops'][] = [
                'time' => $row['time_label'],
                'placeId' => $row['place_id'],
                'note' => $row['note'],
            ];
        }
    }

    return array_map(fn (array $r) => [
        'id' => $r['id'],
        'title' => $r['title'],
        'summary' => $r['summary'],
        'gradient' => [$r['color_from'], $r['color_to']],
        'days' => array_values($days[$r['id']] ?? []),
    ], $itineraries);
}

function fetch_guide(): array
{
    $pdo = db();
    $tips = $pdo->query('SELECT section, icon, title, body FROM guide_tips ORDER BY section, sort_order, id')->fetchAll();
    $section = fn (string $name) => array_values(array_map(
        fn (array $t) => ['icon' => $t['icon'], 'title' => $t['title'], 'body' => $t['body']],
        array_filter($tips, fn (array $t) => $t['section'] === $name)
    ));

    return [
        'currencies' => array_map(fn (array $c) => [
            'code' => $c['code'],
            'label' => $c['label'],
            'perUnitIdr' => (float) $c['per_unit_idr'],
        ], $pdo->query('SELECT code, label, per_unit_idr FROM currencies ORDER BY sort_order, code')->fetchAll()),
        'phrases' => array_map(
            fn (array $p) => array_filter($p, fn ($value) => $value !== null),
            $pdo->query('SELECT phrase, meaning, note FROM phrases ORDER BY sort_order, id')->fetchAll()
        ),
        'essentials' => $section('essentials'),
        'etiquette' => $section('etiquette'),
        'emergency' => $pdo->query('SELECT icon, label, number FROM emergency_contacts ORDER BY sort_order, id')->fetchAll(),
    ];
}
