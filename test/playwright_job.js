const axios = require('axios');
const yaml = `
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
    await job.$mongodb.db('test').collection('titles').insert({
      titles: result.google.titles.map(title => {return {title};}),
      date: job.$module.dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });

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
`;

axios.post('http://localhost:8000/api/bullkins/playwright.jobs', yaml, {headers: {'Content-Type': 'text/plain'}})
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
