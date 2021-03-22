const path = require('path');
const Queue = require('bull');
const Redis = require('ioredis');
const jsyaml = require('./jsyaml');
const { connectMongoDB } = require('./mongodb');

/**
 * root directory
 */
const root_dir = path.resolve('./');

/**
 * Redis Client
 */
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
});

/**
 * MongoDB Client
 */
let mongodb = null;
(async () => {
  if (process.env.MONGODB_ENDPOINT) {
    mongodb = await connectMongoDB(process.env.MONGODB_ENDPOINT);
  }
})();

/**
 * @private
 * 
 * Bullkinsメイン処理
 * @param {*} job {id: string, name: string, ..., data: {yaml: 実行メインYamlテキスト}}
 * @param {function(result: object, error: Error) => null} done
 */
async function processBullkins(job, done) {
  let yaml;

  try {
    // load yaml
    yaml = jsyaml.load(job.data.yaml);

    // YamlオブジェクトをJobオブジェクトにセット
    job.$yaml = yaml;

    // set Redis Client
    job.$redis = redis;

    // set MongoDB Client
    job.$mongodb = mongodb;

    // ジョブ完了処理関数
    job.$done = (returnvalue, error = null) => {
      done(error, returnvalue);
    }

    // エラー処理関数
    job.$throw = async err => {
      if (typeof yaml.error === 'function') {
        try {
          await yaml.error(job, err);
        } catch (err) {
          return job.$done(null, new Error(err));
        }
      }
      job.$done(null, new Error(err));
    };
  } catch (err) {
    return done(new Error(err));
  }
  
  try {
    // module requires
    job.$module = {};
    if (Array.isArray(yaml.modules)) {
      for (const mod of yaml.modules) {
        if (typeof mod === 'object' && typeof mod.name === 'string' && typeof mod.module === 'string') {
          job.$module[mod.name] = require(mod.module.replace(/^~\//, `${root_dir}/`).replace(/^\.\//, `${__dirname}/`));
        } else if (typeof mod === 'string') {
          job.$module[mod] = require(mod.replace(/^~\//, `${root_dir}/`).replace(/^\.\//, `${__dirname}/`));
        }
      }
    }

    // yaml.main関数: メイン処理. 必ず関数内で job.$done(returnvalue) メソッドを呼び出すこと
    if (typeof yaml.main === 'function') {
      await yaml.main(job);
    } else {
      throw new Error('yaml.main function not found');
    }
  } catch (err) {
    await job.$throw(err);
  }
}

/**
 * Bullkins Queue object
 * @param {string} name 登録するジョブQueue名
 * @return {bull.Queue}
 */
function BullkinsQueue(name) {
  const queue = new Queue(
    name,
    {
      redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
      }
    }
  );
  queue.process(processBullkins);
  return queue;
}

/**
 * 登録されている Job Queue Name 一覧取得
 * @return {string[]}
 */
async function getQueueNames() {
  try {
    return await redis.lrange('bullkins:queues', 0, -1);
  } catch (err) {
    return [];
  }
}

/**
 * Yaml形式のテキストを元に Bull Queue Job を登録する
 * @param {string} yaml_text {
 *    modules: [] => requireして使えるようにしたいmodules (job.$module に登録される)
 *    name: string => Job Queue Name（default: '__BullkinsQueue__'）
 *    main: !!js/function "function(job) {...}" => メイン関数
 *      第1引数: Job情報 object {
 *        $done: (returnvalue: any) => null ジョブを完了させる関数
 *          main関数の最後で必ず呼び出すこと（呼び出さない限りジョブが完了しない）
 *        $throw: (error: Error) => null ジョブを failed 状態で完了させる関数
 *          内部で yaml.error 関数も呼び出される
 *        $module: object yaml.modules で指定したモジュールが登録されているテーブル
 *        $yaml: object Yaml テキストを load した object
 *        $redis: ioredis.Redis Redis Client
 *        $mongodb: object @ref ./mongodb.js
 *        data.yaml: string Source Yaml Text
 *        ...bull.Job
 *      }
 *    error: !!js/function "function(job, err,) {...}" => エラー時に実行される関数
 *      第1引数: Job情報 main関数のものと同一
 *      第2引数: Error object
 *    option: object => ジョブ登録時のオプション {
 *      priority: number 実行優先順位（1が最優先）
 *      delay: number ジョブの開始を指定ミリ秒遅延
 *      attempts: number ジョブ失敗時にリトライする試行回数（これを指定しない限りリトライされない）
 *      backoff: object {
 *        type: string (`fixed`|`exponential`)
 *          - ジョブ失敗時のリトライ方法
 *          - `fixed`の場合は、`delay`ミリ秒固定で遅延してからリトライ
 *          - `exponential`の場合は、失敗を繰り返すごとに徐々にリトライ間隔を伸ばす
 *        delay: number ジョブ失敗のリトライの際に待機するミリ秒数
 *      }
 *      lifo: boolean trueを指定した場合は、ジョブをキュー最後尾ではなく先頭に登録する
 *      timeout: number 指定ミリ秒経過した際にタイムアウトエラーとする
 *      jobId: number|string ジョブIDをデフォルトのものから変える際に指定
 *      removeOnComplete: boolean trueを指定した場合は、ジョブ完了時にジョブを削除する
 *      removeOnFail: boolean trueを指定した場合は、ジョブ失敗時（リトライも全て失敗した後）にジョブを削除する
 *      stackTraceLimit: number StackTraceの保持行数を設定
 *      repeat: object {
 *        cron: string cron式（`分 時 日 月 週`）で反復実行
 *        every: number 指定ミリ秒ごとに反復実行
 *        tz: string 反復実行のTimeZoneを設定
 *        startDate: Date|string|number 反復実行の開始日時を指定
 *        endDate: Date|string|number 反復実行の終了日時を設定
 *        limit: number 最大反復回数を設定
 *        count: number 反復回数のカウンタ開始値を設定
 *      }
 *    }
 * @return {bull.Job}
 */
async function launchJob(yaml_text) {
  const yaml = jsyaml.load(yaml_text);
  const name = yaml.name || '__BullkinsQueue__';
  const job = BullkinsQueue(name).add({ yaml: yaml_text }, yaml.option || {});

  // redis://bullkins:queues(list) に登録されていない Job Queue Name が指定された場合は追加
  const queues = await getQueueNames();
  if (queues.indexOf(name) < 0) {
    await redis.rpush('bullkins:queues', name);
  }
  return job;
}

/**
 * 登録されているQueueを全て起動
 * @return {bull.Queue[]}
 */
async function awakenAllQueues() {
  const queues = [];
  for (const name of await getQueueNames()) {
    queues.push(BullkinsQueue(name));
  }
  return queues;
}

/**
 * 指定Queueに登録されている全てのジョブIDを取得
 * @param {string} name Job Queue Name
 * @return {object} {jobs: string[], repeat_jobs: object{key: string, name: string, id: string, ...}[]}
 */
async function getQueueJobs(name) {
  const queue = BullkinsQueue(name);
  return {
    jobs: (await queue.getJobs()).map(e => e.id),
    repeat_jobs: await queue.getRepeatableJobs(),
  };
}

/**
 * 登録されているQueueに紐づく指定のジョブの詳細情報を取得
 * @param {string} name Job Queue Name
 * @param {string} id Job ID
 *    Repeatable Job の情報を取得したい場合は `repeat:${repeat_key}:${job_id}` を指定
 * @return {object|boolean}
 */
async function getJobInfo(name, id) {
  const queue = BullkinsQueue(name);
  const job = await queue.getJob(id);
  return job? {
    id: job.id,
    status: await job.getState(),
    name: job.name,
    data: job.data,
    returnvalue: job.returnvalue,
    delay: job.delay,
    timestamp: job.timestamp,
    attemptsMade: job.attemptsMade,
    stacktrace: job.stacktrace,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  }: false;
}

/**
 * 登録されているQueueに紐づく指定のジョブを削除
 * @param {string} name Job Queue Name
 * @param {string} id Job ID
 * @return {boolean}
 */
async function removeJob(name, id) {
  const queue = BullkinsQueue(name);
  const job = await queue.getJob(id);
  if (!job) {
    return false;
  }
  // id: `repeat:${repeat_key}:${job_id}` の場合は Repeatable Job 削除（リピート停止）
  if (id.match(/^repeat:/)) {
    // リピート登録時の option を指定して削除
    const yaml = jsyaml.load(job.data.yaml);
    await queue.removeRepeatable(yaml.option.repeat);
    return true;
  }
  // 通常ジョブ削除
  await job.remove();
  return true;
}

// --- /core ---

/**
 * Shell Job 登録
 * @param {string} yaml_text {
 *    name: string => Job Queue Name（default: '__BullkinsShellQueue__'）
 *    command: string => メイン実行コマンド
 *    args: string[] => command に渡す引数（default: []）
 *    shell_option: object => シェル実行オプション（@ref https://nodejs.org/api/child_process.html child_process.spawn#options）
 *    error: !!js/function "function(job, err) {...}" => エラー時に実行される関数
 *    option: object => ジョブ登録時のオプション
 * }
 * @return {bull.Job}
 */
async function launchShellJob(yaml_text) {
  const yaml = jsyaml.load(yaml_text);

  // queue name
  yaml.name = yaml.name || '__BullkinsShellQueue__';

  // use module: child_process
  yaml.modules = ['child_process'];
  
  // main function
  yaml.main = async (job) => {
    const process = job.$module.child_process.spawn(
      job.$yaml.command,
      job.$yaml.args || [],
      Object.assign({ shell: true }, job.$yaml.shell_option || {})
    );
    // UPDATE stdout
    process.stdout.on('data', async data => {
      await job.update({
        yaml: job.data.yaml,
        stdout: (job.data.stdout || '') + data,
        stderr: job.data.stderr || '',
      });
    });
    // UPDATE stderr
    process.stderr.on('data', async data => {
      await job.update({
        yaml: job.data.yaml,
        stdout: job.data.stdout || '',
        stderr: (job.data.stderr || '') + data
      });
    });
    // on close
    process.on('close', async code => {
      const stderr = job.data.stderr || '';
      if (stderr.length > 0) {
        job.$throw(new Error(stderr));
      } else {
        job.$done(code);
      }
    });
  };

  // カスタマイズしたYamlオブジェクトを文字列化して launchJob に渡す
  return await launchJob(jsyaml.dump(yaml));
}

/**
 * Playwright Job 登録
 * @param {string} yaml_text {
 *    name: string => Job Queue Name（default: '__BullkinsPlaywrightQueue__'）
 *    modules: [] => requireして使えるようにしたいmodules (job.$module に登録される. job.$module.playwright は常に利用可能)
 *    init: !!js/function "function(job) {...}" => 初期実行関数
 *      return {object}: Playwright実行シナリオのカスタムアクションを定義可能
 *        {action_name: function(page: playwright.Page, values: any) => any}
 *    play: object|object[] => Playwright実行シナリオ @ref ./playwright.js
 *      - goto: string|object 指定URLにアクセス
 *      - wait: string|number 指定セレクタが出現するまで or 一定時間待機
 *      - scrape: object|object[] 指定条件でスクレイピング
 *        {selector: string XPath|CSSセレクタ, attributes: string[] 取得するHTML属性, actions: object[] 要素に対して行うアクション}
 *          action {action: string 'click'|'fill'|..., args: any[] アクションに渡す引数}
 *      - screenshot: object アクセス中のページのスクリーンショットを撮る
 *        {path: ファイル保存先, s3: {AWS S3 アップロード設定}, fullPage: boolean, ...}
 *      - download: option 指定アクション実行後に発生するダウンロードイベントをキャッチしファイルに保存する
 *        {path: ファイル保存先, actions: [{action: string, args: any[]}]}
 *      - callback: function(page: playwright.Page) => any 任意関数実行
 *    then: !!js/function "function(job, result)" => Playwright実行後に処理される関数
 *      第2引数: object|object[] => play で渡された各種Playwrightアクションの実行結果が入っている
 *    error: !!js/function "function(job, err) {...}" => エラー時に実行される関数
 *    option: object => ジョブ登録時のオプション
 * }
 * @return {bull.Job}
 */
 async function launchPlaywrightJob(yaml_text) {
  const yaml = jsyaml.load(yaml_text);

  // queue name
  yaml.name = yaml.name || '__BullkinsPlaywrightQueue__';

  // use module: ./playwright.js
  yaml.modules = Array.isArray(yaml.modules)?
    [...yaml.modules, {name: 'playwright', module: './playwright.js'}]
    : [{name: 'playwright', module: './playwright.js'}];
  
  // main function
  yaml.main = async (job) => {
    try {
      let customActions = {};
      // initialize
      if (typeof job.$yaml.init === 'function') {
        customActions = await job.$yaml.init(job); // init関数の戻り値をカスタムアクションとして登録
      }
      // execute playwright
      if (typeof job.$yaml.play === 'object') {
        const result = await job.$module.playwright.play(
          job.$yaml.play,
          {wsEndpoint: process.env.BROWSERLESS_ENDPOINT},
          customActions
        );
        // then
        if (typeof job.$yaml.then === 'function') {
          await job.$yaml.then(job, result);
        }
        job.$done('Playwright scenario has played');
      }
      job.$done('Playwright scenario (yaml.play) not found');
    } catch (err) {
      job.$throw(err);
    }
  };

  // カスタマイズしたYamlオブジェクトを文字列化して launchJob に渡す
  return await launchJob(jsyaml.dump(yaml));
}

module.exports = {
  BullkinsQueue,
  getQueueNames,
  launchJob,
  awakenAllQueues,
  getQueueJobs,
  getJobInfo,
  removeJob,

  launchShellJob,
  launchPlaywrightJob,
};