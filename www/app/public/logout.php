<?php
require_once(__DIR__ . '/$common.php');

// ログアウトして /login/ にリダイレクト
clearAuthSession();
header('Location: /login/');
