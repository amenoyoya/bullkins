<?php
require_once(__DIR__ . '/$common.php');
middleware('auth'); // 管理者用ページ
// => 認証されていなければ /login/ にリダイレクト
?>

<?= component('header', ['title' => '管理画面', 'bodyattr' => 'class="hold-transition sidebar-mini"'])?>
    <div id="app" class="wrapper">
        <?= component('navbar') ?>
    </div>
<?= component('footer') ?>