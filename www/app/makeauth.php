<?php
/**
 * 管理者作成スクリプト
 * $ php makeauth.php <ユーザ名> <パスワード>
 */
$user = @$argv[1];
$pass = @$argv[2];

if (empty($user) || empty($pass)) {
    echo "ユーザ名とパスワードを指定してください\n";
    echo "$ php makeauth.php <ユーザ名> <パスワード>\n";
    die();
}

if (!is_dir(__DIR__ . '/auth')) {
    mkdir(__DIR__ . '/auth', 0755);
}

if (file_put_contents(__DIR__ . "/auth/$user", password_hash($pass, PASSWORD_BCRYPT))) {
    echo "ユーザ: $user を作成しました\n";
} else {
    echo "ユーザ: $user を作成出来ませんでした\n";
}
