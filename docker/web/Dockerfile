FROM php:7.4-apache

# composer インストール
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
ENV PATH $PATH:~/.composer/vendor/bin

# 開発に必要なパッケージ等のインストール
RUN apt-get update && apt-get install -y git libicu-dev mailutils unzip vim && \
    docker-php-ext-install intl pdo pdo_mysql && \
    : 'enable RewriteEngine' && \
    a2enmod rewrite && \
    : 'create log directory' && \
    mkdir -p /var/log/httpd/ && \
    : 'install phpstan (PHPコード静的解析ツール)' && \
    composer global require phpstan/phpstan && \
    : 'install msmtp (sendmail 互換の送信専用 MTA; ssmtp の後継)' && \
    : 'msmtp-mta も入れておくとデフォルトの MTA を sendmail から置き換えてくれるため便利' && \
    apt-get install -y msmtp msmtp-mta && \
    : 'www-data ユーザで sudo 実行可能に' && \
    apt-get install -y sudo && \
    echo 'www-data ALL=NOPASSWD: ALL' >> '/etc/sudoers' && \
    : 'cleanup apt-get caches' && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリ
## docker://web:/var/www/ => host://./www/
## DocumentRoot: docker://web:/var/www/app/
WORKDIR /var/www/

# 作業者: www-data
USER www-data

# スタートアップコマンド（docker up の度に実行される）
## execute docker://web:/var/www/startup.sh
CMD ["/bin/bash", "/var/www/startup.sh"]
