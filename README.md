# bullkins

⚡ Bull.js based Shell Command Queue System ⚡

- Jenkinsのようにシェルの実行・スケジューリングを管理するマネジメントシステム
- Jenkinsほど高機能である必要はなく、APIベースで実行できるシンプルなシステムが必要だったため実装
- cronベースのスケジューリングシステムでは秒単位の実行ができないため、Node.js（Bull.js）をコアに採用
- Browserless API に対応
    - Browserless Server: https://github.com/amenoyoya/browserless

## Environment

- Shell: bash
- Node.js: `14.15.4`
    - Yarn package manager: `1.22.10`

### Docker containers
- networks:
    - **appnet**: `local`
        - All docker containers in this project will be belonged to this network
- volumes:
    - **redis-data**: `local`
        - Volume for redis service container
    - **mongodb-data**: `local`
        - Volume for mongodb service container
- services:
    - **node**: `mcr.microsoft.com/playwright` (Node.js 14.x)
        - Node.js service container
        - routes:
            - HTTP: http://localhost:{SERVER_PORT:-8000} => http://node:8000
    - **redis**: `redis:6`
        - Redis in-memory KVS database service container
        - routes:
            - TCP: tcp://redis:6379
    - **commander**: `rediscommander/redis-commander:latest`
        - Redis admin panel service container
        - routes:
            - HTTP: http://localhost:{REDIS_COMMANDER_PORT:-6380} => http://commander:8081
    - **mongodb**: `mongo:4.4`
        - MongoDB service container
        - routes:
            - TCP: `mongodb://root:root@mongodb:27017`
    - **express**: `mongo-express:latest`
        - MongoDB admin panel service container
        - routes:
            - http://localhost:{MONGODB_EXPRESS_PORT:-27080} => http://express:8081

### Setup
```bash
# Add execution permission to the CLI tool
$ chmod +x ./x

# Build the docker containers
$ ./x build

# Launch the docker containers
$ ./x up -d
```

***

##  Bullkins REST API

⚡ Yaml形式のテキストを送信することで、Yaml内で定義した Node.js 関数を非同期的に実行・スケジューリングするためのAPI

### 新規ジョブ登録
- POST `/api/bullkins/jobs`
    - POST data (Content-Type: application/json):
        - **yaml**: `string`
            - ジョブとして登録する各種関数等をYaml形式のテキストにまとめて送信する
    - Response: `object`
        - **id**: `string`
            - ジョブID
        - その他、ジョブに関する情報

#### Yaml format
```yaml
# ジョブを登録するQueueの名前: string
## 指定しない場合は '__BullkinsQueue__' が指定される
name: TestRepeatBullkinsQueue

# ジョブ登録時のオプション: object
# - priority: number 実行優先順位（1が最優先）
# - delay: number ジョブの開始を指定ミリ秒遅延
# - attempts: number ジョブ失敗時にリトライする試行回数（これを指定しない限りリトライされない）
# - backoff: object
#     - type: string (`fixed`|`exponential`)
#         + ジョブ失敗時のリトライ方法
#         + `fixed`の場合は、`delay`ミリ秒固定で遅延してからリトライ
#         + `exponential`の場合は、失敗を繰り返すごとに徐々にリトライ間隔を伸ばす
#     - delay: number ジョブ失敗のリトライの際に待機するミリ秒数
# - lifo: boolean trueを指定した場合は、ジョブをキュー最後尾ではなく先頭に登録する
# - timeout: number 指定ミリ秒経過した際にタイムアウトエラーとする
# - jobId: number|string ジョブIDをデフォルトのものから変える際に指定
# - removeOnComplete: boolean trueを指定した場合は、ジョブ完了時にジョブを削除する
# - removeOnFail: boolean trueを指定した場合は、ジョブ失敗時（リトライも全て失敗した後）にジョブを削除する
# - stackTraceLimit: number StackTraceの保持行数を設定
# - repeat: object
#     - cron: string cron式（`分 時 日 月 週`）で反復実行
#     - every: number 指定ミリ秒ごとに反復実行
#     - tz: string 反復実行のTimeZoneを設定
#     - startDate: Date|string|number 反復実行の開始日時を指定
#     - endDate: Date|string|number 反復実行の終了日時を設定
#     - limit: number 最大反復回数を設定
#     - count: number 反復回数のカウンタ開始値を設定
## 例) 5回まで毎分実行し、失敗時は最大10回まで10秒ごとに再試行する
option:
  repeat:
    cron: "*/1 * * * *"
    limit: 5
  attempts: 10
  backoff:
    type: fixed
    delay: 10000

# 使用モジュール: string[]|object[]
#   配列の要素が string の場合、指定のモジュールが require され job.$module[指定文字列] にセットされる
#   配列の要素が object の場合、object.module のモジュールが require され job.$module[object.name] にセットされる
#   ※ 上記の job 変数は main, error 関数の第1引数から参照可能
#   ※ 使用可能なモジュールはサーバサイドにインストールされているものに限る
## 以下の場合
## - job.$module.NeDB = require('./lib/nedb.js')
## - job.$module.dayjs = require('dayjs')
modules:
  - name: NeDB
    module: ~/lib/nedb.js
  - dayjs

# メイン関数: (job: object) => null
# - 第1引数: Job情報 object
#     - $done: (returnvalue: any) => null ジョブを完了させる関数
#         - main関数の最後で必ず呼び出すこと（呼び出さない限りジョブが完了しない）
#     - $throw: (error: Error) => null ジョブを failed 状態で完了させる関数
#         - 内部で yaml.error 関数も呼び出される
#     - $module: object $yaml.modules で指定したモジュールが登録されているテーブル
#     - $yaml: object Yamlテキストを load した object
#     - $redis: ioredis.Redis Redis Client
#     - $mongodb: object @ref lib/mongodb.js#connectMongoDB
#     - data.yaml: string Source Yaml Text
#     - ...bull.Job
main: !!js/function |-
  async function(job) {
    // 現在日時を NeDB.logs に insert
    const result = await job.$module.NeDB('logs', 'open', './test/nedb').insert({
      date: job.$module.dayjs().format('YYYY-MM-DD HH:mm:ss')
    });
    // insert結果を returnValue としてジョブ完了
    job.$done(result);
  }

# エラー処理: (job: object, error: Error) => null
# - 第1引数: main関数の第1引数（ジョブ情報）と同一
# - 第2引数: エラーオブジェクト
error: !!js/function |-
  async function(job, err) {
    // エラー内容を MongoDB に保存
    if (job.$mongodb) {
      await job.$mongodb.db('test').collection('errors').insert({
        error: err.stack,
        date: job.$module.dayjs().format('YYYY-MM-DD HH:mm:ss'),
      });
    }
  }
```

#### POST
```javascript
const axios = require('axios');
const fs = require('fs');

axios.post('http://localhost:8000/api/bullkins/jobs', {yaml: fs.readFileSync('your-target-yaml.yml', 'utf-8')})
  .then(res => console.log(res.data))
  .catch(err => console.error(err.response.data));
```

### 登録済みの全てのQueue名を取得
- GET `/api/bullkins/queues`
    - Response: `string[]`
        - 登録済みQueue名一覧

```bash
# 登録済みの全てのQueue名を取得
$ curl http://localhost:8000/api/bullkins/queues

# => ["__BullkinsQueue__", "TestRepeatBullkinsQueue"]
```

### 指定Queueに登録されている全てのジョブIDを取得
- GET `/api/bullkins/jobs/{QueueName}`
    - Response: `object`
        - **jobs**: `string[]`
            - ジョブIDの一覧
        - **repeat_jobs**: `object{key: string, name: string, id: string, ...}[]`
            - 反復ジョブ情報の一覧

```bash
# Queue:TestRepeatBullkinsQueue に登録されている全てのジョブIDを取得
$ curl http://localhost:8000/api/bullkins/jobs/TestRepeatBullkinsQueue

# => {
#   "jobs": ["repeat:xxx:xxxx", ...],
#   "repeat_jobs": [{"key": "__default__::10000", ...}, ...]
# }
```

### ジョブ情報取得
- GET `/api/bullkins/jobs/{QueueName}/{JobID}`
    - Response: `object`
        - **id**: `string`
            - ジョブID
        - その他、ジョブに関する情報

```bash
# Queue:TestRepeatBullkinsQueue に登録されている JobID: repeat:8c67330a4d444f9e84a1bb899165c85a:1616157960000 のジョブ情報を取得
$ curl http://localhost:8000/api/bullkins/jobs/TestRepeatBullkinsQueue/repeat:8c67330a4d444f9e84a1bb899165c85a:1616157960000

# => {
#   "id": "repeat:8c67330a4d444f9e84a1bb899165c85a:1616157960000",
#   "status": "completed",
#   ...
# }
```

### ジョブ削除
- DELETE `/api/bullkins/jobs/{QueueName}/{JobID}`
    - Response: `object`
        - **name**: `string`
            - Job Queue Name
        - **id**: `string`
            - Job ID

```bash
# Queue:TestShellQueue に登録されている ID: 1 のジョブを削除
$ curl -X DELETE http://localhost:8000/api/bullkins/jobs/TestShellQueue/1

# Repeatable Job として登録したジョブを停止（削除）
## Repeatable Job ID: `repeat:{repeat_key}:{job_id}`
## Repeatable Job の job_id は複数登録されているはずだが、リピートを停止する場合はどれを指定しても良い
$ curl -X DELETE http://localhost:8000/api/bullkins/jobs/TestRepeatBullkinsQueue/repeat:8c67330a4d444f9e84a1bb899165c85a:1616157960000
```

***

## Bullkins Shell API

⚡ Bullkins REST API の内、特にシェルスクリプトの非同期実行・スケジューリングを行うための API

- POST `/api/bullkins/shell.jobs`
    - POST data (Content-Type: application/json):
        - **yaml**: `string`
            - ジョブとして登録する各種コマンド等をYaml形式のテキストにまとめて送信する
    - Response: `object`
        - **id**: `string`
            - ジョブID
        - その他、ジョブに関する情報

### Yaml format
```yaml
# ジョブを登録するQueueの名前: string
## 指定しない場合は '__BullkinsShellQueue__' が指定される
name: TestShellQueue

# ジョブ登録時オプション: object
# POST /api/bullkins/jobs 時の $yaml.option と同一
option:
  priority: 1

# シェルスクリプト実行時オプション: object
# @ref https://nodejs.org/api/child_process.html child_process.spawn#options
## shell_option.shell: true (default) だと command にシェルスクリプトをそのまま書けるようになる
## shell_option.shell: false では command にコマンドを記述し args にコマンド引数を配列で渡す必要がある
shell_option:
  shell: false

# シェル実行コマンド: string
command: ls

# command に渡す引数: string[]
args:
  - "-la"
```

***

## Playwright REST API

⚡ Bullkins REST API の内、特にヘッドレスブラウザを用いてスクレイピングを行うための API

- POST `/api/bullkins/playwright.jobs`
    - POST data (Content-Type: application/json):
        - **yaml**: `string`
            - スクレイピングシナリオ等をYaml形式のテキストにまとめて送信する
    - Response: `object`
        - **id**: `string`
            - ジョブID
        - その他、ジョブに関する情報

### Yaml format
```yaml
# ジョブを登録するQueueの名前: string
## 指定しない場合は '__BullkinsPlaywrightQueue__' が指定される
name: TestScrapingQueue

# ジョブ登録時オプション: object
# POST /api/bullkins/jobs 時の $yaml.option と同一
## 以下の場合、失敗時は5分毎に5回まで再試行する（失敗が繰り返される度に徐々に待機時間を長くする）
option:
  attempts: 5
  backoff:
    type: exponential
    delay: 300000

# 使用モジュール: string[]|object[]
# POST /api/bullkins/jobs 時の $yaml.modules と同一
modules:
  - dayjs

# 最初に実行される関数: (job: object) => object
# - 第1引数: ジョブ情報（POST /api/bullkins/jobs 時の $yaml.main 関数の第1引数と同一）
# - 戻り値に指定したオブジェクトは Playwright 用のカスタムアクションとして登録される
#     - カスタムアクション関数: (browser: playwright.Page, scenario: any) => any
init: !!js/function |-
  async function(job) {
    /**
     * Playwright Custom Actions
     */
    return {
      // Google Search Action: (browser: playwright.Page, url: string) => {titles: string[], next: string|boolesn}
      google: async (browser, url) => {
        // MongoDB にログ保存
        await job.$mongodb.db('test').collection('logs').insert({
          url,
          date: job.$module.dayjs().format('YYYY-MM-DD HH:mm:ss')
        });

        const goto = await browser.actions.goto(browser, {url, waitUntil: 'networkidle'});
        if (!goto.result) return {titles: [], next: false};

        // scrape titles, next page url
        const scrape = await browser.actions.scrape(browser, [
          {selector: '//h3[contains(@class,"DKV0Md")]', attributes: ['innerText']},
          {selector: '//a[@id="pnnext"]', attributes: ['href']},
        ]);
        return {
          titles: scrape[0].map(e => e.innerText),
          next: scrape[1].length > 0? scrape[1][0].href: false,
        }
      }
    };
  }

# Playwright 実行シナリオ: object|object[]
# デフォルトのアクション: @ref ./lib/playwright.js
# - goto: string|object 指定URLにアクセス
# - wait: string|number 指定セレクタが出現するまで or 一定時間待機
# - scrape: object|object[] 指定条件でスクレイピング
#     - {selector: string XPath|CSSセレクタ, attributes: string[] 取得するHTML属性, actions: object[] 要素に対して行うアクション}
#         - action {action: string 'click'|'fill'|..., args: any[] アクションに渡す引数}
# - screenshot: object アクセス中のページのスクリーンショットを撮る
#     - {path: ファイル保存先, s3: {AWS S3 アップロード設定}, fullPage: boolean, ...}
# - download: option 指定アクション実行後に発生するダウンロードイベントをキャッチしファイルに保存する
#     - {path: ファイル保存先, actions: [{action: string, args: any[]}]}
# - callback: function(playwright.Page) => any 任意関数実行
play:
  # カスタムアクション 'google' を実行
  ## https://www.google.com/search?q=test をスクレイピング
  google: 'https://www.google.com/search?q=test'

# 独自定義変数: カウンタ
count: 0

# Playwright 実行後関数: (job: object, result: object|object[]) => null
# - 第1引数: ジョブ情報（POST /api/bullkins/jobs 時の $yaml.main 関数の第1引数と同一）
# - 第2引数: Playwright実行結果 object|object[]
then: !!js/function |-
  async function(job, result) {
    // result.google にカスタムアクションの実行結果が入っている
    // MongoDBにtitles保存
    await job.$mongodb.db('test').collection('titles').insert(
      result.google.titles.map(title => {return {title};}
    ));

    // 次のページURLがある場合再帰処理（ただし5回まで）
    if (result.google.next && ++job.$yaml.count < 5) {
      // job.$yaml = this yaml object
      // job.$yaml.play.google <= set next url
      job.$yaml.play.google = result.google.next;

      // 再帰処理したい場合は $yaml.main 関数を呼び出す
      await job.$yaml.main(job);
    }
  }

# エラー処理: (job: object, error: Error) => null
# POST /api/bullkins/jobs 時の $yaml.error と同一
error: !!js/function |-
  async function(job, err) {
    // エラー内容を MongoDB に保存
    await job.$mongodb.db('test').collection('error_logs').insert({
      error: err.stack,
      date: mod.dayjs().format('YYYY-MM-DD HH:mm:ss')
    });
  }
```

### 外部 Browserless サーバを利用する場合
デフォルトでは、Browserはローカルから起動するが、それではメモリ不足になる可能性がある場合、外部に Browserless サーバを立てて利用することができる

自分で立てる場合は https://github.com/amenoyoya/browserless が利用可能

クラウドサービスを利用する場合は https://www.browserless.io/ が利用可能

#### ./.env
```bash
# 環境変数 BROWSERLESS_ENDPOINT を指定することで外部サービスを利用できるようになる
BROWSERLESS_ENDPOINT='wss://chrome.browserless.io?token=YOUR-API-TOKEN'
```
