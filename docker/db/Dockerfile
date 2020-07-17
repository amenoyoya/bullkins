FROM mysql:5.7

# my.cnf は パーミッション644 である必要があるため以下のように設定
ADD ./my.cnf /etc/mysql/my.cnf
RUN chmod 644 /etc/mysql/my.cnf

# 作業ディレクトリ: host:/./dump/ => docker.db:/var/dump/
WORKDIR /var/dump/
