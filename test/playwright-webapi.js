/**
 * Playwright API test
 */
const axios = require('axios');
const yaml = `
# エラー時: 1秒後再試行（最大3回）
retry:
  max: 3
  delay: 10000

# 使用モジュール（サーバサイドにインストールされているものに限る）
modules:
  - mongodb
  - dayjs

# 最初に実行される関数
init: !!js/function |-
  async function(mod) {
    /**
     * MongoDB Client
     */
    mod.mongodb_client = new mod.mongodb.MongoClient('mongodb://root:root@mongodb:27017', { useUnifiedTopology: true });
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

# Playwright 実行シナリオ
play:
  # カスタムアクション 'google' を実行
  ## https://www.google.com/search?q=test をスクレイピング
  google: 'https://www.google.com/search?q=test'

# 独自定義変数: カウンタ
count: 0

# Playwright 実行後関数
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

# エラー処理
catch: !!js/function |-
  async function(mod, err) {
    // エラー内容を MongoDB に保存
    await mod.mongodb_insert('error_logs', {error: err.stack, date: mod.dayjs().format('YYYY-MM-DD hh:mm:ss')});

    // close MongoDB Client
    await mod.mongodb_client.close();
  }
`;

axios.post('http://localhost:8000/api/playwright', {yaml})
  .then(res => console.log(res.data))
  .catch(err => console.error(err.response.data));