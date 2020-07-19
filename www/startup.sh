#!/bin/bash
# -- sudo www-data@docker://web/

# 環境変数 UID が与えられていれば www-data ユーザIDを $UID に合わせる
if [ "$UID" != "" ]; then
    # uid = $UID のダミーユーザ作成
    if [ "$(getent passwd $UID)" = "" ]; then
        useradd -u $UID -g $UID myuser
    fi
    # www-data ユーザIDを変更
    usermod -u $UID www-data
    groupmod -g $UID www-data
    # www-data のホームディレクトリのパーミッション修正
    chown -R www-data:www-data /var/www/
fi

# ~/.msmtprc のパーミッション修正
chown www-data:www-data /var/www/.msmtprc
chmod 600 /var/www/.msmtprc

# プロジェクトディレクトリ作成
if [ ! -d './app' ]; then
    mkdir -p ./app/public/
    echo '<?php phpinfo() ?>' > ./app/public/index.php
fi

# Apache をフォアグランド起動
apachectl -D FOREGROUND
