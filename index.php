<?php
// Auto redirect from project root to frontend/login.html
$base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
header("Location: " . $base . "/frontend/login.html");
exit();
