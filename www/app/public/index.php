<?php
require_once(__DIR__ . '/$common.php');
middleware('auth'); // 管理者用ページ
// => 認証されていなければ /login/ にリダイレクト
?>

<?= component('header', ['title' => '管理画面', 'bodyattr' => 'class="hold-transition sidebar-mini"'])?>
    <div id="app" class="wrapper">
        <?= component('admin/navbar') ?>
        <?= component('admin/sidebar') ?>
        <?= component('admin/content') ?>
        <?= component('admin/controlbar') ?>
        <?= component('admin/footer') ?>
    </div>
<?= component('footer') ?>