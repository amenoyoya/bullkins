const { chromium } = require('playwright');
const AWS = require('aws-sdk');
const omit = require('./omit');

/**
 * HTML要素スクレイピング
 * @param {Page} page 
 * @param {object} condition {
 *    selector: xpath or cssSelector,
 *    attributes: ['innerText'|'innerHTML'|'outerHTML'|'href'|'$style'|...],
 *    actions: [{action: 'click'|'dblclick'|'check'|'fill'|..., args: [...]}, ...]
 * }
 * @return {object[]} 
 */
const scrapeHTML = async (page, condition) => {
  try {
    const result = [];
    for (const el of await page.$$(condition.selector)) {
      // HTML要素へのアクション実行
      const action_result = {};
      if (Array.isArray(condition.actions)) {
        for (const action of condition.actions) {
          try {
            if (typeof el[action.action] === 'function') {
              action.args? await el[action.action](...action.args): await el[action.action]();
              action_result[action.action] = {result: true};
            } else {
              action_result[action.action] = {result: false};
            }
          } catch (err) {
            action_result[action.action] = {
              result: false,
              error: err.stack,
            };
          }
        }
      }
      // HTML要素属性の取得
      const attr_result = Array.isArray(condition.attributes)? await el.evaluate((el, attributes) => {
        const result = {};
        for (const attr of attributes) {
          // '$style'を指定された場合は getComputedStyle の返り値を取得
          if (attr === '$style') {
            result[attr] = getComputedStyle(el);
          } else {
            result[attr] = el[attr];
          }
        }
        return result;
      }, condition.attributes): {};
      // 結果の push
      result.push({
        '$actions': Object.keys(action_result).length > 0? action_result: undefined,
        ...attr_result,
      });
    }
    return result;
  } catch (err) {
    return {
      result: false,
      error: err.stack,
    };
  }
};

const pageActions = {
  /**
   * ページ遷移
   * @param {Page} page
   * @param {string|object} url objectの場合 {url: string, referer: string, timeout: number(ms), waitUntil: "load"|"domcontentloaded"|"networkidle"}
   * @return {*}
   */
  goto: async (page, url) => {
    try {
      if (typeof url === 'object') {
        await page.goto(url.url, omit(url, ['url']));
      } else {
        await page.goto(url);
      }
      return {result: true, url: await page.url()};
    } catch (err) {
      return {
        result: false,
        error: err.stack,
      };
    }
  },

  /**
   * 一定時間 or セレクタ出現まで待機
   * @param {Page} page 
   * @param {string|number} waiting 
   * @return {*}
   */
  wait: async (page, waiting) => {
    try {
      if (typeof waiting === 'number') await page.waitForTimeout(waiting);
      else if (typeof waiting === 'string') await page.waitForSelector(waiting);
      else await page.waitForNavigation();
      return {
        result: true
      };
    } catch (err) {
      return {
        result: false,
        error: err.stack,
      };
    }
  },

  /**
   * HTML要素スクレイピング
   * @param {Page} page 
   * @param {object|object[]} conditions {
   *    selector: xpath or cssSelector,
   *    attributes: ['innerText'|'innerHTML'|'outerHTML'|'href'|'$style'|...],
   *    actions: [{action: 'click'|'dblclick'|'check'|'fill'|..., args: [...]}, ...]
   * }
   * @return {object[]} 
   */
  scrape: async (page, conditions) => {
    if (Array.isArray(conditions)) {
      const result = [];
      for (const condition of conditions) {
        result.push(await scrapeHTML(page, condition));
      }
      return result;
    }
    return await scrapeHTML(page, conditions);
  },

  /**
   * スクリーンショット撮影
   * @param {Page} page 
   * @param {*} option {path: ファイル保存先, s3: {AWS S3 アップロード設定}, fullPage: boolean, ...}
   * @return {*} 
   */
  screenshot: async (page, option) => {
    try {
      const buffer = await page.screenshot(option);
      if (typeof option.s3 === 'object') {
        // AWS S3 アップロード
        const s3 = new AWS.S3({
          apiVersion: '2006-03-01',
          endpoint: option.s3.endpoint || process.env.AWS_S3_ENDPOINT,
          s3ForcePathStyle: option.s3.forcePathStyle || process.env.AWS_S3_PATH_STYLE || false,
          region: option.s3.region || process.env.AWS_S3_REGION || 'ap-northeast-1',
          credentials: new AWS.Credentials({
            accessKeyId: option.s3.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: option.s3.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
          }),
        });
        return {
          result: true,
          uploaded: await s3.putObject({
            Bucket: option.s3.bucket || process.env.AWS_S3_BUCKET,
            Key: option.s3.path,
            Body: buffer,
            ACL: option.s3.acl || 'public-read', // public読み取り許可
            ContentType: 'image/png',
          }).promise(),
        };
      }
      return {
        result: true,
        buffer,
      };
    } catch (err) {
      return {
        result: false,
        error: err.stack,
      };
    }
  },

  /**
   * 指定アクション実行後に発生するダウンロードイベントをキャッチしファイルに保存する
   * @param {*} page 
   * @param {object} option {path: ファイル保存先, actions: [{action: string, args: *[]}]}
   * @return {*}
   * 
   * @example aタグをクリックした際に発生するダウンロードイベントをキャッチして 'result.txt' に保存する
   *    await download(page, {
   *      path: 'result.txt',
   *      actions: [{action: 'click', args: ['//a']}]
   *    })
   */
  download: async (page, option) => {
    try {
      const actions = [];
      for (const action of option.actions) {
        if (typeof page[action.action] === 'function') {
          actions.push(action.args? page[action.action](...action.args): page[action.action]());
        }
      }
      const [ dl ] = await Promise.all([
        page.waitForEvent('download'), // wait for download to start
        ...actions
      ]);
      // wait for download to complete
      await dl.saveAs(option.path);
      return {result: true, path: option.path};
    } catch (err) {
      return {result: false, error: err.stack};
    }
  },

  /**
   * 任意関数実行
   * @param {Page} page
   * @param {function(Page)} func
   * @return {*} 
   */
  callback: async (page, func) => {
    return await func(page);
  },
};

/**
 * Playwright 実行メイン
 * @param {Page} page
 * @param {object} scenario
 * @param {object} customActions = {} 独自実行関数定義テーブル
 * @return {*}
 */
const execute = async (page, scenario, customActions) => {
  const result = {};
  // Pageアクション定義
  page.actions = {...pageActions, ...customActions};
  // Pageアクションをシナリオに沿って実行
  for (const action of Object.keys(page.actions)) {
    if (scenario[action] && typeof page.actions[action] === 'function') {
      result[action] = await page.actions[action](page, scenario[action]);
    }
  }
  return result;
};

/**
 * スクレイピングシナリオ実行
 * @param {*} payload
 * @param {object} option = {}
 * @param {object} customActions = {} 独自実行関数定義テーブル
 * @return {*}
 */
const play = (payload, option = {}, customActions = {}) => {
  let browser;
  return (async () => {
    if (option.wsEndpoint) {
      // wsEndpoint が指定されている場合は WebSocket 経由でブラウザレス実行
      browser = await chromium.connect(option);
    } else {
      browser = await chromium.launch({
        executablePath: '/usr/bin/google-chrome',
        ...option
      });
    }

    const context = await browser.newContext({
      locale: 'ja',
      acceptDownloads: true,
    });
    const page = await context.newPage();
    
    // Playwright 実行
    if (Array.isArray(payload)) {
      const result = [];
      for (const scenario of payload) {
        result.push(await execute(page, scenario, customActions));
      }
      if (!option.noclose) {
        await browser.close();
      }
      return result;
    } else {
      const result = await execute(page, payload, customActions);
      if (!option.noclose) {
        await browser.close();
      }
      return result;
    }
  })().catch(error => {
    // console.log(JSON.stringify({error: error.stack}))
    console.log(error);
    browser.close();
  });
};

/**
 * URLのデータを非同期ダウンロード
 * @param {string} url
 * @param {string} save_path
 */
const fetch = (url, save_path) => {
  require('request')(url).pipe(require('fs').createWriteStream(save_path));
};

module.exports = {
  play, fetch
};