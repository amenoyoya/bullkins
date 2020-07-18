# metakins

CLI job generator, Admin panel management system.

## Environment

- OS: Ubuntu 20.04
- docker: `19.03.12`
    - docker-compose: `1.24.0`

### Structure
```bash
./
|_ docker/ # dockerコンテナ設定
|   |_ db/ # dbコンテナ（MySQLサーバ）設定
|   |   |_ dump/ # dumpファイルを ホスト <=> コンテナ間でやりとりするためのプロジェクトディレクトリ
|   |   |_ initdb.d/ # 初回投入データ格納
|   |   |_ Dockerfile # ビルド設定
|   |   |_ my.cnf # MySQL設定ファイル => docker://db:/etc/mysql/conf.d/my.cnf
|   |
|   |_ web/ # webコンテナ（本体サイトサーバ）設定
|       |_ conf/
|       |   |_ 000-default.conf # VirtualHost設定ファイル => docker://web:/etc/apache2/sites-available/000-default.conf
|       |   |_ php.ini # PHP設定 => docker://web:/usr/local/etc/php/php.ini
|       |
|       |_ Dockerfile # ビルド設定
|
|_ www/ # www-data ホームディレクトリ => docker://web:/var/www/
|   |_ app/ # プロジェクトディレクトリ
|   |   |_ public/ # DocumentRoot
|   |_ .msmtprc # msmtp (smtp 送信専用 MTA) 設定ファイル
|   |_ startup.sh # webコンテナ起動時に実行されるスクリプト
|
|_ docker-compose.yml # Dockerコンテナ構成
    # - volume://db-data: データベース永続化用ボリューム => docker://db:/var/lib/mysql
    # - docker://web <php:7.4-apache>
    #     - Main WEB server: Apache + PHP
    # - docker://mailhog <mailhog/mailhog>
    #     - local SMTP server + Mail catcher
    # - docker://db <mysql:5.7>
    #     - MySQL database server
    # - docker://pma <phpmyadmin/phpmyadmin>
    #     - MySQL GUI admin panel
```

### Setup
```bash
# ./www/ (docker://web:/var/www) の所有権を docker 実行ユーザに合わせたい場合は環境変数 UID を export する
$ export UID

# db, pma コンテナは比較的重いため、必要なければ web, mailhog コンテナのみ起動する
## -d オプションでバックグラウンド起動できる
$ docker-compose up -d web mailhog

# 全てのコンテナを起動する場合は docker-compose up -d
```

- WEBサーバ: http://localhost:17400
    - `./www/app/public/index.php` 表示
- mailhog Web UI: http://localhost:17401
    - メールを外部 SMTP サーバを通して実際に送信したい場合は `./www/.msmtprc` を編集
