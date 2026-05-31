<?php
// Root-level proxy for Discord OAuth callback
// Routes to api.php action handler
$_GET['action'] = 'discord-callback';
require __DIR__ . '/api.php';
