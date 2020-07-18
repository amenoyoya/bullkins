<?php
/**
 * 共通利用関数等の定義
 */

session_start();

/**
 * ミドルウェア実行（ミドルウェア用PHPファイル実行）
 * @param string $name
 */
function middleware($name) {
    return require_once(__DIR__ . "/../middlewares/$name.php");
}

/**
 * パーツファイル読み込み
 * @param string $name
 * @param array $variables => extractされてローカル変数に展開されてから、対象コンポネント内で使用可能となる
 */
function component($name, $variables = []) {
    ob_start();
    extract($variables);
    include(__DIR__ . "/../components/$name.php");
    $content = ob_get_contents();
    ob_end_clean();
    return $content;
}

/**
 * CSRF 生成
 */
function generateCSRF() {
    // generate csrf token
    $csrfToken = bin2hex(openssl_random_pseudo_bytes(16));
    // save csrf token to session
    $_SESSION['x-csrf-token'] = $csrfToken;
    return $csrfToken;
}

/**
 * CSRFトークンチェック
 */
function checkCSRF() {
    if (!empty(@$_SESSION['x-csrf-token']) && !empty(@$_SERVER['HTTP_X_CSRF_TOKEN'])) {
        return $_SESSION['x-csrf-token'] === $_SERVER['HTTP_X_CSRF_TOKEN'];
    }
    return false;
}

/**
 * Authentication
 */
define('AUTH_NOT_EXISTS', -1);
define('AUTH_PASSWORD_WRONG', 0);
define('AUTH_VERIFIED', 1);

/**
 * 認証ユーザ保存
 * @param string $id
 */
function saveAuthSession($id) {
    // 認証トークン生成
    $token = bin2hex(openssl_random_pseudo_bytes(16));
    $_SESSION['auth-session-token'] = password_hash($token, PASSWORD_BCRYPT);
    // 認証ユーザ情報保存
    $_SESSION['auth-user-info'] = [
        'id' => $id,
        'token' => $token,
    ];
}

/**
 * 認証ユーザID取得
 * @return string $id => null なら未認証
 */
function loadAuthSession() {
    $info = $_SESSION['auth-user-info'];
    if (!is_array($info) || empty(@$info['id']) || empty(@$_SESSION['auth-session-token'])) {
        return null;
    }
    // 認証トークンの整合性チェック
    if (!isset($info['token']) || !password_verify($info['token'], $_SESSION['auth-session-token'])) {
        return null;
    }
    return $info['id'];
}

/**
 * 認証ユーザセッションをクリア（ログアウト）
 */
function clearAuthSession() {
    unset($_SESSION['auth-session-token']);
    unset($_SESSION['auth-user-info']);
}

/**
 * 認証実行
 * @param string $id
 * @param string $passwd
 * @return int AUTH_***
 */
function auth($id, $passwd) {
    $file = __DIR__ . "/../auth/$id";
    if (!is_file($file)) {
        return AUTH_NOT_EXISTS;
    }
    if (!password_verify($passwd, file_get_contents($file))) {
        return AUTH_PASSWORD_WRONG;
    }
    // セッションにユーザID保存
    saveAuthSession($id);
    return AUTH_VERIFIED;
}
