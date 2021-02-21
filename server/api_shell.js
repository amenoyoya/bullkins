const express = require('express');
const router = express.Router();

const bullkins = require('./lib/bullkins');

// サーバ起動時に登録済みジョブQueueを全て起動
bullkins.awakenAllQueues();

/**
 * GET /shell/queues: 登録されている全てのジョブQueue名取得
 * @return {string[]}
 */
router.get('/queues', async (req, res) => {
  res.json(await bullkins.getQueueNames());
});

/**
 * POST /shell/jobs/{name}: 新規ShellコマンドジョブQueue登録
 * @param {string} name ジョブQueue名
 * @param {*} payload
 *    @param {string} command 実行コマンド (option.shell: true なら実行コマンド内に引数を書いてもOK)
 *    @param {array} args = [] コマンド引数
 *    @param {*} option = {} 実行オプション
 * @return {*} {id: string, ...}
 */
router.post('/jobs/:name', async (req, res) => {
  try {
    const job = await bullkins.launchJob(req.params.name, req.body.command, req.body.args || [], req.body.option || {});
    res.json(job);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

/**
 * GET /shell/jobs/{name}: 指定Queueに登録されている全てのジョブIDを取得
 */
router.get('/jobs/:name', async (req, res) => {
  try {
    const shellQueue = bullkins.ShellQueue(req.params.name);
    res.json({
      jobs: (await shellQueue.getJobs()).map(e => e.id),
      repeat_jobs: await shellQueue.getRepeatableJobs(),
    });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

/**
 * GET /shell/jobs/{name}/{id}: 指定ジョブの情報取得
 * @param {string} name ジョブQueue名
 * @param {string} id ジョブID
 *    Repeatable Job の情報を取得したい場合は `repeat:${repeat_key}:${job_id}` を指定
 * @return {*} {id: string, status: string, stdout: string, stderr: string, code: number, ...}
 */
router.get('/jobs/:name/:id', async (req, res) => {
  try {
    const info = await bullkins.getJobInfo(req.params.name, req.params.id);
    if (info) {
      res.json(info);
    } else {
      res.status(404).send(`${req.params.name}[${req.params.id}] not found`);
    }
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

/**
 * DELETE /shell/jobs/{name}/{id}: 指定ジョブを削除
 * @param {string} name ジョブQueue名
 * @param {string} id ジョブID
 * @return {string}
 */
router.delete('/jobs/:name/:id', async (req, res) => {
  try {
    const shellQueue = bullkins.ShellQueue(req.params.name);
    const job = await shellQueue.getJob(req.params.id);
    if (job) {
      await job.remove();
      res.json({
        deleted: {
          name: req.params.name,
          id: req.params.id,
        }
      });
    } else {
      res.status(404).send(`${req.params.name}[${req.params.id}] not found`);
    }
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

/**
 * DELETE /shell/repeats/{name}: 指定された Repeatable Jobs を停止
 * @param {string} name ジョブQueue名
 * @param {*} payload Repeatable Job 登録時の option.repeat のJSONデータ
 * @param {*}
 */
router.delete('/repeats/:name', async (req, res) => {
  try {
    const shellQueue = bullkins.ShellQueue(req.params.name);
    await shellQueue.removeRepeatable(req.body);
    res.json({
      deleted: {
        name: req.params.name,
        repeat: req.body,
      }
    });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

// export
module.exports = router;
