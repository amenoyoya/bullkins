<?php
/**
 * 管理者ページ用ミドルウェア
 */

// 認証されているか確認
// 認証されていれば $_SERVER['auth-user-id'] にユーザID格納
if (null === ($_SERVER['auth-user-id'] = loadAuthSession())) {
    // login画面にリダイレクト
    header('Location: /login/?redirect=' . urlencode($_SERVER['REQUEST_URI']));
    die;
}
