#!/bin/bash
# -- www-data@docker://web/

# 環境変数 UID が与えられていれば www-data ユーザIDを $UID に合わせる
if [ "$UID" != "" ]; then
    # uid = $UID のダミーユーザ作成
    if [ "$(getent passwd $UID)" = "" ]; then
        sudo useradd -u $UID -g $UID myuser
    fi
    # www-data ユーザIDを変更
    sudo usermod -u $UID www-data
    sudo groupmod -g $UID www-data
    # www-data のホームディレクトリのパーミッション修正
    sudo chown -R www-data:www-data /var/www/
fi

# ~/.msmtprc のパーミッション修正
sudo chown www-data:www-data /var/www/.msmtprc
sudo chmod 600 /var/www/.msmtprc

# プロジェクトディレクトリ作成
if [ ! -d './app' ]; then
    mkdir -p ./app/public/
    echo '<?php phpinfo() ?>' > ./app/public/index.php
fi

# 環境変数を引き継いで Apache を起動させる
sudo -E apachectl -D FOREGROUND
