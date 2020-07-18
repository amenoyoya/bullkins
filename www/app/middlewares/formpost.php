<?php
/**
 * フォームポスト受信用ミドルウェア
 */

// POST以外のメソッドは無効
if ($_SERVER["REQUEST_METHOD"] !== 'POST') {
    http_response_code(400);
    die('無効なリクエストメソッドです');
}

// HTTP_X_CSRF_TOKEN が無効なら 400 エラー
if (!checkCSRF()) {
    http_response_code(400);
    die('無効なHTTPリクエストです');
}

// 送信されたJSONデータをパース
$_POST['<JSON>'] = json_decode(file_get_contents('php://input'), true);
