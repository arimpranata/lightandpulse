<?php
/**
 * Copy this file to config.php (same folder) and fill in the database details
 * from Hostinger hPanel → Databases → MySQL Databases.
 *
 * config.php is git-ignored and blocked from web access by .htaccess.
 */
return [
    'db' => [
        // On Hostinger the MySQL host is "localhost" for sites on the same account.
        'host' => 'localhost',
        'port' => 3306,
        // Hostinger prefixes names with your account id, e.g. u123456789_bali.
        'name' => 'u123456789_bali',
        'user' => 'u123456789_bali',
        'password' => 'change-me',
    ],

    // Origins allowed to call the API from a browser. Use '*' for any origin,
    // or list your domains, e.g. ['https://bali.example.com'].
    // Native iOS/Android apps are not affected by CORS.
    'cors_origins' => ['*'],

    // Seconds clients and CDNs may cache GET responses.
    'cache_seconds' => 300,

    // Show database error details in responses. Keep false in production.
    'debug' => false,
];
