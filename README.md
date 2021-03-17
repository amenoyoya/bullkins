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

***

##  Bullkins REST API

⚡ シェルスクリプトを非同期的に実行・スケジューリングするためのAPI

- 新規ジョブ登録: `POST /api/shell/jobs/{QueueName}`
    - POST data (Content-Type: application/json):
        - **command**: `string`
            - ジョブとして登録するシェルスクリプトを指定
        - **option**: `object`
            - **priority**: `number`
                - 実行優先順位（1が最優先）
            - **delay**: `number`
                - ジョブの開始を指定ミリ秒遅延
            - **attempts**: `number`
                - ジョブ失敗時にリトライする試行回数（これを指定しない限りリトライされない）
            - **backoff**: `object`
                - **type**: `string` (`fixed`|`exponential`)
                    - ジョブ失敗時のリトライ方法
                    - `fixed`の場合は、`delay`ミリ秒固定で遅延してからリトライ
                    - `exponential`の場合は、失敗を繰り返すごとに徐々にリトライ間隔を伸ばす
                - **delay**: `number`
                    - ジョブ失敗のリトライの際に待機するミリ秒数
            - **lifo**: `boolean`
                - trueを指定した場合は、ジョブをキュー最後尾ではなく先頭に登録する
            - **timeout**: `number`
                - 指定ミリ秒経過した際にタイムアウトエラーとする
            - **jobId**: `number`|`string`
                - ジョブIDをデフォルトのものから変える際に指定
            - **removeOnComplete**: `boolean`
                - trueを指定した場合は、ジョブ完了時にジョブを削除する
            - **removeOnFail**: `boolean`
                - trueを指定した場合は、ジョブ失敗時（リトライも全て失敗した後）にジョブを削除する
            - **stackTraceLimit**: `number`
                - StackTraceの保持行数を設定
            - **repeat**: `object`
                - **cron**: `string`
                    - cron式（`分 時 日 月 週`）で反復実行
                - **every**: `number`
                    - 指定ミリ秒ごとに反復実行
                - **tz**: `string`
                    - 反復実行のTimeZoneを設定
                - **startDate**: `Date`|`string`|`number`
                    - 反復実行の開始日時を指定
                - **endDate**: `Date`|`string`|`number`
                    - 反復実行の終了日時を設定
                - **limit**: `number`
                    - 最大反復回数を設定
                - **count**: `number`
                    - 反復回数のカウンタ開始値を設定
    - Response: `object`
        - **id**: `string`
            - ジョブID
        - その他、ジョブに関する情報
- 登録済みの全てのQueue名を取得: `GET /api/shell/queues`
    - Response: `string[]`
        - 登録済みQueue名一覧
- 指定Queueに登録されている全てのジョブIDを取得: `GET /api/shell/jobs/{QueueName}`
    - Response: `object`
        - **jobs**: `string[]`
            - 通常ジョブIDの一覧
        - **repeat_jobs**: `string[]`
            - 反復ジョブIDの一覧
- ジョブ情報取得: `GET /api/shell/jobs/{QueueName}/{JobID}`
    - Response: `object`
        - **id**: `string`
            - ジョブID
        - その他、ジョブに関する情報
- ジョブ削除: `DELETE /api/shell/jobs/{QueueName}/{JobID}`
- 反復ジョブとして登録したジョブを停止（削除）: `DELETE /api/shell/jobs/{QueueName}`
    - POST Data (Content-Type: application/json):
        - ジョブ登録時に `option.repeat` に指定したデータを送信する

```bash
# ----
# Queue名: TestShell のQueueに新規ジョブ登録
## payload.command: $HOME/app/nodejs/test/test-command.sh 実行
$ curl -X POST -H 'Content-Type:application/json' -d '{
  "command": "/bin/bash $HOME/app/nodejs/test/test-command.sh"
}' http://localhost:8000/api/shell/jobs/TestShell

# => {"id": "1", "name": "__default__", ...}

# ----
# Queue名: GetDateShell のQueueに新規ジョブ登録
## payload.command: date関数の実行結果をecho
## payload.repeat: 10秒ごとに繰り返し実行
$ curl -X POST -H 'Content-Type:application/json' -d '{
  "command": "echo $(date)",
  "option": {
    "repeat": {"every": 10000}
  }
}' http://localhost:8000/api/shell/jobs/GetDateShell

# => {"id": "repeat:xxx:xxx", "name": "__default__", ...}

# ----
# 登録済みの全てのQueue名を取得
$ curl http://localhost:8000/api/shell/queues

# => ["TestShell", "GetDateShell"]

# ----
# Queue名: TestShell のQueueに登録されている ID: 1 のジョブ情報を取得
$ curl http://localhost:8000/api/shell/jobs/TestShell/1

# => {"id": 1, "status": "active", "stdout": "...", ...}

# ----
# Queue名: TestShell のQueueに登録されている ID: 1 のジョブを削除
$ curl -X DELETE http://localhost:8000/api/shell/jobs/TestShell/1

# ----
# Queue名: GetDateShell のQueueに登録されている全てのジョブIDを取得
$ curl http://localhost:8000/api/shell/jobs/GetDateShell

# => [
#   "jobs": ["repeat:xxx:xxxx", ...],
#   "repeat_jobs": [{"key": "__default__::10000", ...}, ...]
# ]

# ----
# Repeatable Job として登録したジョブを停止（削除）
## payload: repeat条件のJSONデータを指定
$ curl -X DELETE -H 'Content-Type:application/json' -d '{"every": 10000}' http://localhost:8000/api/shell/jobs/GetDateShell
```

***

## Playwright REST API

⚡ ヘッドレスブラウザを用いてスクレイピングを行うためのAPI

- スクレイピングシナリオの登録: `POST /api/playwright`
    - POST Data (Content-Type: application/json):
        - **yaml**: `string`
            - スクレイピングシナリオをYaml形式のテキストで送信する

### Yaml Data
```yaml
# エラー時のリトライ設定: $yaml.retry
#   {max: number => 最大試行回数, delay: number => リトライまでの待機時間（ミリ秒, default: 10秒）}
## 以下の場合、1秒後再試行（最大3回）
retry:
  max: 3
  delay: 10000

# 使用モジュール: $yaml.modules string[]|object[]
#   配列の要素が string の場合、指定のモジュールが require され、modules[指定文字列] にセットされる
#   配列の要素が object の場合、object.module のモジュールが require され、modules[object.name] にセットされる
#   上記の modules 変数は、init, done, catch 関数の第1引数から参照可能
# - 使用可能なモジュールはサーバサイドにインストールされているものに限る
## 以下の場合
## - modules.mbd = require('mongodb')
## - modules.dayjs = require('dayjs')
modules:
  - name: mdb
    module: mongodb
  - dayjs

# 最初に実行される関数: $yaml.init (modules: object) => object
#   第1引数に $yaml.modules で指定した modules オブジェクトが渡される
#     その他参照可能な変数
#     - modules.$yaml_text: string このYamlテキスト
#     - modules.$yaml: object このYamlテキストをパージしてJSONオブジェクト化したもの
#     - modules.$retry: number エラー発生回数（試行回数）
#     - modules.$process: ($yaml: object) => null このYamlオブジェクトを再度処理するため関数
#   戻り値に指定したオブジェクトは Playwright 用のカスタムアクションとして登録される
#     カスタムアクション関数: (browser: playwright.Page, scenario: any) => any
init: !!js/function |-
  async function(mod) {
    /**
     * MongoDB Client
     */
    mod.mongodb_client = new mod.mbd.MongoClient('mongodb://root:root@mongodb:27017', { useUnifiedTopology: true });
    await mod.mongodb_client.connect();

    const db = mod.mongodb_client.db('test');
    mod.mongodb_find = async (collection, query) => await db.collection(collection, query).toArray();
    mod.mongodb_insert = async (collection, data) => Array.isArray(data)?
      await db.collection(collection).insertMany(data): await db.collection(collection).insertOne(data);
    mod.mongodb_update = async (collection, query, data) => Array.isArray(data)?
      await db.collection(collection).updateMany(query, data): await db.collection(collection).updateOne(query, data);
    mod.mongodb_delete = async (collection, query) => await db.collection(collection).deleteMany(query);

    /**
     * Playwright Custom Actions
     */
    return {
      // Google Search Action: (browser: playwright.Page, url: string) => {titles: string[], next: string|boolesn}
      google: async (browser, url) => {
        // MongoDB にログ保存
        await mod.mongodb_insert('logs', {url, date: mod.dayjs().format('YYYY-MM-DD hh:mm:ss')});

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

# Playwright 実行シナリオ: $yaml.play object|object[]
# デフォルトのアクション: @ref ./lib/playwright.js
# - goto: string|object 指定URLにアクセス
# - wait: string|number 指定セレクタが出現するまで or 一定時間待機
# - scrape: object|object[] 指定条件でスクレイピング
#   {selector: string XPath|CSSセレクタ, attributes: string[] 取得するHTML属性, actions: object[] 要素に対して行うアクション}
#       action {action: string 'click'|'fill'|..., args: any[] アクションに渡す引数}
# - screenshot: object アクセス中のページのスクリーンショットを撮る
#   {path: ファイル保存先, s3: {AWS S3 アップロード設定}, fullPage: boolean, ...}
# - download: option 指定アクション実行後に発生するダウンロードイベントをキャッチしファイルに保存する
#   {path: ファイル保存先, actions: [{action: string, args: any[]}]}
# - callback: function(playwright.Page) => any 任意関数実行
play:
  # カスタムアクション 'google' を実行
  ## https://www.google.com/search?q=test をスクレイピング
  google: 'https://www.google.com/search?q=test'

# 独自定義変数: カウンタ
count: 0

# Playwright 実行後関数: $yaml.done (modules: object, result: any)
# 第1引数の modules については、init関数と同一
# 第2引数には Playwright 実行後の結果（play の戻り値）が渡る
done: !!js/function |-
  async function(mod, result) {
    // result.google にカスタムアクションの実行結果が入っている
    // MongoDBにtitles保存
    await mod.mongodb_insert('titles', result.google.titles.map(title => {return {title};}));

    // close MongoDB Client
    await mod.mongodb_client.close();

    // 次のページURLがある場合再帰処理（ただし5回まで）
    if (result.google.next && ++mod.$yaml.count < 5) {
      console.log(mod.$yaml.count);
      // mod.$yaml = this yaml object
      // mod.$yaml.play.google <= set next url
      mod.$yaml.play.google = result.google.next;
      await mod.$process(mod.$yaml);
    }
  }

# エラー処理: $yaml.catch (modules: object, error: object)
# 第1引数の modules については、init関数と同一
# 第2引数にはエラーオブジェクトが渡る
catch: !!js/function |-
  async function(mod, err) {
    // エラー内容を MongoDB に保存
    await mod.mongodb_insert('error_logs', {error: err.stack, date: mod.dayjs().format('YYYY-MM-DD hh:mm:ss')});

    // close MongoDB Client
    await mod.mongodb_client.close();
  }
```
