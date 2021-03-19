const express = require('express');
const router = express.Router();

const bullkins = require('../lib/bullkins');

// サーバ起動時に登録済みジョブQueueを全て起動
bullkins.awakenAllQueues();

/**
 * GET /bullkins/queues: 登録されている全てのジョブQueue名取得
 * @return {string[]}
 */
router.get('/queues', async (req, res) => {
  res.json(await bullkins.getQueueNames());
});

/**
 * POST /bullkins/jobs: 新規ジョブ登録
 * @param {*} payload
 *    @param {string} yaml @ref ../lib/bullkins.js#launchJob
 * @return {*} {id: string, ...}
 */
router.post('/jobs', async (req, res) => {
  try {
    res.json(await bullkins.launchJob(req.body.yaml));
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

/**
 * POST /bullkins/shell.jobs: 新規 ShellJob 登録
 * @param {*} payload
 *    @param {string} yaml @ref ../lib/bullkins.js#launchShellJob
 * @return {*} {id: string, ...}
 */
 router.post('/shell.jobs', async (req, res) => {
  try {
    res.json(await bullkins.launchShellJob(req.body.yaml));
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

/**
 * POST /bullkins/playwright.jobs: 新規 PlaywrightJob 登録
 * @param {*} payload
 *    @param {string} yaml @ref ../lib/bullkins.js#launchPlaywrightJob
 * @return {*} {id: string, ...}
 */
 router.post('/playwright.jobs', async (req, res) => {
  try {
    res.json(await bullkins.launchPlaywrightJob(req.body.yaml));
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

/**
 * GET /bullkins/jobs/{name}: 指定Queueに登録されている全てのジョブIDを取得
 * @param {string} name QueueName (ジョブ登録時 yaml.name に指定したもの)
 * @return {*} {jobs: string[], repeat_jobs: string[]}
 */
router.get('/jobs/:name', async (req, res) => {
  try {
    res.json(await bullkins.getQueueJobs(req.params.name));
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

/**
 * GET /bullkins/jobs/{name}/{id}: 指定ジョブの情報取得
 * @param {string} name QueueName (ジョブ登録時 POST.yaml.name に指定したもの)
 * @param {string} id ジョブID（ジョブ登録時の Response.id）
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
 * @param {string} name QueueName (ジョブ登録時 POST.yaml.name に指定したもの)
 * @param {string} id ジョブID（ジョブ登録時の Response.id）
 * @return {string}
 */
router.delete('/jobs/:name/:id', async (req, res) => {
  try {
    if (await bullkins.removeJob(req.params.name, req.params.id)) {
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

// export
module.exports = router;