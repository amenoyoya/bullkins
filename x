#!/bin/bash

cd $(dirname $0)
export USER_ID="${USER_ID:-$UID}"

case "$1" in
"init")
    mkdir -p ./docker/node/
    mkdir -p ./docker/mongodb/initdb.d/
    tee ./docker/node/Dockerfile << \EOS
FROM mcr.microsoft.com/playwright

# Docker実行ユーザIDを build-arg から取得
ARG USER_ID

RUN if [ "$USER_ID" = "" ] || [ "$USER_ID" = "0" ]; then USER_ID=1026; fi && \
    : '日本語対応' && \
    apt-get update && \
    apt-get -y install locales fonts-ipafont fonts-ipaexfont && \
    echo "ja_JP UTF-8" > /etc/locale.gen && locale-gen && \
    : 'install Google Chrome: /usr/bin/google-chrome' && \
    apt-get install -y wget curl git vim && \
    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt-get install -y ./google-chrome-stable_current_amd64.deb && \
    : 'install autossh' && \
    apt-get install -y autossh && \
    : 'Add user (User ID: $USER_ID)' && \
    if [ "$(getent passwd $USER_ID)" != "" ]; then usermod -u $((USER_ID + 100)) "$(getent passwd $USER_ID | cut -f 1 -d ':')"; fi && \
    useradd -u $USER_ID -m -s /bin/bash worker && \
    apt-get install -y sudo && \
    echo "worker ALL=NOPASSWD: ALL" >> '/etc/sudoers' && \
    : 'Fix permission' && \
    mkdir -p /usr/local/share/.config/ && \
    chown -R worker /usr/local/share/.config/ && \
    : 'cleanup apt-get caches' && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリ: ./ => service://node:/work/
WORKDIR /work/

# 作業ユーザ: Docker実行ユーザ
## => コンテナ側のコマンド実行で作成されるファイルパーミッションをDocker実行ユーザ所有に
USER worker

# Startup script: install node_modules && npm run start
CMD ["/bin/bash", "-c", "yarn && yarn start"]
EOS
    tee ./docker/mongodb/initdb.d/.gitignore << \EOS
/*
!.gitignore
EOS
    tee docker-compose.yml << \EOS
# ver 3.6 >= required: enable '-w' option for 'docker-compose exec'
version: "3.8"

networks:
  # プロジェクト内仮想ネットワーク
  ## 同一ネットワーク内の各コンテナはサービス名で双方向通信可能
  appnet:
    driver: bridge
    # ネットワークIP範囲を指定する場合
    # ipam:
    #   driver: default
    #   config:
    #     # 仮想ネットワークのネットワーク範囲を指定
    #     ## 172.68.0.0/16 の場合、172.68.0.1 ～ 172.68.255.254 のIPアドレスを割り振れる
    #     ## ただし 172.68.0.1 はゲートウェイに使われる
    #     - subnet: 172.68.0.0/16

volumes:
  # volume for redis service container
  redis-data:
    driver: local
  
  # volume for mongodb service container
  mongodb-data:
    driver: local

services:
  # node service container: mcr.microsoft.com/playwright (node:14)
  # $ docker-compose exec node $command ...
  node:
    build:
      context: ./docker/node/
      args:
        # use current working user id
        USER_ID: $USER_ID
    logging:
      driver: json-file
    networks:
      - appnet
    ports:
      # http://localhost:${SERVER_PORT} => http://node:8000
      - "${SERVER_PORT:-8000}:8000"
    # enable terminal
    tty: true
    volumes:
      # ./ => docker:/work/
      - ./:/work/
    environment:
      TZ: Asia/Tokyo
      # playwright インストール時にブラウザダウンロードをスキップ
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: 1
  
  # redis cache service container
  ## tcp://redis:6379
  redis:
    image: redis:6
    logging:
      driver: json-file
    networks:
      - appnet
    volumes:
       - redis-data:/data/
  
  # redis admin panel service container
  ## http://commander:8081
  commander:
    image: rediscommander/redis-commander:latest
    logging:
      driver: json-file
    networks:
      - appnet
    ports:
      # http://localhost:${REDIS_COMMANDER_PORT} => http://commander:8081
      - "${REDIS_COMMANDER_PORT:-6380}:8081"
    environment:
      REDIS_HOSTS: local:redis:6379
      TZ: Asia/Tokyo

  # mongodb service container: mongo db v4.4
  ## mongodb://root:root@mongodb:27017
  mongodb:
    image: mongo:4.4
    logging:
      driver: json-file
    networks:
      - appnet
    volumes:
      # database data persistence
      - mongodb-data:/data/db/
      # initial data sharing
      - ./docker/mongodb/initdb.d/:/docker-entrypoint-initdb.d/
    working_dir: /docker-entrypoint-initdb.d/
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
      TZ: Asia/Tokyo

  # express service container: mongo-express:latest
  ## http://express:8081
  express:
    image: mongo-express:latest
    logging:
      driver: json-file
    networks:
      - appnet
    ports:
      # http://localhost:${MONGODB_EXPRESS_PORT} => http://express:8081
      - "${MONGODB_EXPRESS_PORT:-27080}:8081"
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: root
      ME_CONFIG_MONGODB_ADMINPASSWORD: root
      ME_CONFIG_MONGODB_SERVER: mongodb # service://mongodb
      ME_CONFIG_MONGODB_PORT: 27017
      TZ: Asia/Tokyo
EOS
    tee ./.env << \EOS
# docker ports
SERVER_PORT=8000
REDIS_COMMANDER_PORT=6380
MONGODB_EXPRESS_PORT=27080

# api server config
REDIS_HOST=redis
REDIS_PORT=6379
EOS
    ;;
"node")
    if [ "$w" != "" ]; then
        docker-compose exec -w "/work/$w" node ${@:2:($#-1)}
    else
        docker-compose exec node ${@:2:($#-1)}
    fi
    ;;
*)
    docker-compose $*
    ;;
esac