/**
 * Bull.js wrapper for Shell Command Job
 */
const { spawn } = require('child_process');
const Queue = require('bull');
const Redis = require('ioredis');

/**
 * Redis Client
 */
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
});

/**
 * 登録されているジョブQueue名一覧取得
 * @return {string[]}
 */
async function getQueueNames() {
  try {
    return redis.lrange('bull:queues', 0, -1);
  } catch (err) {
    return [];
  }
}

/**
 * Shellコマンド実行 Bull Queue を作成
 * @param {string} name 登録するジョブQueue名
 * @return {bull.Queue}
 */
function ShellQueue(name) {
  const shellQueue = new Queue(
    name,
    {
      redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
      }
    }
  );
  shellQueue.process(async (job, done) => {
    try {
      const process = spawn(
        job.data.command,
        job.data.args || [],
        {
          shell: true,
          ...(job.data.option || {})
        }
      );
      // UPDATE stdout
      process.stdout.on('data', async data => {
        await job.update({
          command: job.data.command,
          args: job.data.args,
          option: job.data.option,
          stdout: (job.data.stdout || '') + data,
          stderr: job.data.stderr || '',
        });
      });
      // UPDATE stderr
      process.stderr.on('data', async data => {
        await job.update({
          command: job.data.command,
          args: job.data.args,
          option: job.data.option,
          stdout: job.data.stdout || '',
          stderr: (job.data.stderr || '') + data
        });
      });
      // on close
      process.on('close', async code => {
        const stderr = job.data.stderr || '';
        if (stderr.length > 0) {
          done(new Error(stderr));
        } else {
          done(null, code);
        }
      });
    } catch (err) {
      done(new Error(stderr));
    }
  });
  return shellQueue;
}

/**
 * Shellコマンド実行 Bull Queue を作成・登録
 * @param {string} name 登録するジョブQueue名
 * @param {string} command 実行コマンド (option.shell: true なら実行コマンド内に引数を書いてもOK)
 * @param {array} args = [] コマンド引数
 * @param {*} option = {} 実行オプション
 * @return {bull.Job}
 */
async function launchJob(name, command, args = [], option = {}) {
  const shellQueue = ShellQueue(name);

  /**
   * Bullにジョブ登録
   * @reference https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#queueadd
   */
  const job = await shellQueue.add(
    {
      command, args, option,
    },
    // cronで反復したい場合: option {repeat: {cron: 'min hour day month week'}}
    //    ミリ秒単位で反復したい場合: option {repeat: {every: milliseconds}}
    // 失敗時に1秒待ってからリトライしたい（最大10回まで）場合:
    //    option {attempts: 10, backoff: {type: 'exponential', delay: 1000}}
    option
  );

  // redis://bull:queues(list) に登録されていないジョブQueue名が指定された場合は追加
  const queues = await getQueueNames();
  if (queues.indexOf(name) < 0) {
    await redis.rpush('bull:queues', name);
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
    queues.push(ShellQueue(name));
  }
  return queues;
}

/**
 * 登録されているQueueに紐づく指定のジョブの詳細情報を取得
 * @param {string} name ジョブQueue名
 * @param {string} id ジョブID
 * @return {object|boolean}
 */
async function getJobInfo(name, id) {
  const shellQueue = ShellQueue(name);
  const job = await shellQueue.getJob(id);
  return job? {
    id: job.id,
    status: await job.getState(),
    name: job.name,
    command: job.data.command,
    args: job.data.args,
    option: job.data.option,
    stdout: job.data.stdout,
    stderr: job.data.stderr,
    code: job.returnvalue,
    delay: job.delay,
    timestamp: job.timestamp,
    attemptsMade: job.attemptsMade,
    stacktrace: job.stacktrace,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  }: false;
}

module.exports = {
  ShellQueue,
  getQueueNames,
  launchJob,
  awakenAllQueues,
  getJobInfo,
};