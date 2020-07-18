<?php
require_once(__DIR__ . '/$common.php');
middleware('auth'); // 管理者用ページ
// => 認証されていなければ /login/ にリダイレクト
?>

<?= component('header', ['title' => 'ログイン', 'bodyattr' => 'class="hold-transition login-page"'])?>
    <div id="app" class="content">
        管理者ページ
    </div>
<?= component('footer') ?>