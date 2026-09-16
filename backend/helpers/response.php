<?php
// ==========================================================
// MGI ERP / HRIS - Standard API Response Helper
// ==========================================================

// Enable CORS for local dev / fetch requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request safely
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

/**
 * Send standard success response
 */
function sendSuccess($data = null, string $message = '', ?array $meta = null, int $code = 200): void {
    http_response_code($code);
    $response = ['success' => true];
    
    if ($message !== '') {
        $response['message'] = $message;
    }
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    if ($meta !== null) {
        $response['meta'] = $meta;
    }
    
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Send standard error response
 */
function sendError(string $message = 'Something went wrong', int $code = 400, ?array $errors = null): void {
    http_response_code($code);
    $response = [
        'success' => false,
        'message' => $message
    ];
    
    if ($errors !== null) {
        $response['errors'] = $errors;
    }
    
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Send validation error response
 */
function sendValidationError(array $errors, string $message = 'Validation error'): void {
    sendError($message, 422, $errors);
}

/**
 * Helper to get JSON input body
 */
function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
