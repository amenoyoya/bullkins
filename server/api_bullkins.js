const bullkins = require('../lib/bullkins');

module.exports = async (fastify, opts) => {
  // サーバ起動時に登録済みジョブQueueを全て起動
  await bullkins.awakenAllQueues();

  /**
   * GET /api/bullkins/queues: 登録されている全てのジョブQueue名取得
   * @return {string[]}
   */
  fastify.get('/queues', async (request, reply) => {
    try {
      reply.send(await bullkins.getQueueNames());
    } catch (err) {
      reply.code(500).send({error: process.env.DEBUG === 'true'? err.stack: err.toString()});
    }
  });

  /**
   * POST(text/plain) /api/bullkins/jobs: 新規ジョブ登録
   * @param {string} payload(yaml) @ref ../lib/bullkins.js#launchJob
   * @return {*} {id: string, ...}
   */
  fastify.post('/jobs', async (request, reply) => {
    try {
      reply.send(await bullkins.launchJob(request.body));
    } catch (err) {
      reply.code(500).send({error: process.env.DEBUG === 'true'? err.stack: err.toString()});
    }
  });

  /**
   * POST(text/plain) /api/bullkins/shell.jobs: 新規 ShellJob 登録
   * @param {string} payload(yaml) @ref ../lib/bullkins.js#launchShellJob
   * @return {*} {id: string, ...}
   */
  fastify.post('/shell.jobs', async (request, reply) => {
    try {
      reply.send(await bullkins.launchShellJob(request.body));
    } catch (err) {
      reply.code(500).send({error: process.env.DEBUG === 'true'? err.stack: err.toString()});
    }
  });

  /**
   * POST(text/plain) /api/bullkins/playwright.jobs: 新規 PlaywrightJob 登録
   * @param {string} payload(yaml) @ref ../lib/bullkins.js#launchPlaywrightJob
   * @return {*} {id: string, ...}
   */
  fastify.post('/playwright.jobs', async (request, reply) => {
    try {
      reply.send(await bullkins.launchPlaywrightJob(request.body));
    } catch (err) {
      reply.code(500).send({error: process.env.DEBUG === 'true'? err.stack: err.toString()});
    }
  });

  /**
   * GET /api/bullkins/jobs/{name}: 指定Queueに登録されている全てのジョブIDを取得
   * @param {string} name QueueName (ジョブ登録時 yaml.name に指定したもの)
   * @return {*} {jobs: string[], repeat_jobs: string[]}
   */
  fastify.get('/jobs/:name', async (request, reply) => {
    try {
      reply.send(await bullkins.getQueueJobs(request.params.name));
    } catch (err) {
      reply.code(500).send({error: process.env.DEBUG === 'true'? err.stack: err.toString()});
    }
  });

  /**
   * GET /api/bullkins/jobs/{name}/{id}: 指定ジョブの情報取得
   * @param {string} name QueueName (ジョブ登録時 POST.yaml.name に指定したもの)
   * @param {string} id ジョブID（ジョブ登録時の Response.id）
   * @return {*} {id: string, status: string, stdout: string, stderr: string, code: number, ...}
   */
  fastify.get('/jobs/:name/:id', async (request, reply) => {
    try {
      const info = await bullkins.getJobInfo(request.params.name, request.params.id);
      if (info) {
        reply.send(info);
      } else {
        reply.code(404).send({error: `${req.params.name}[${req.params.id}] not found`});
      }
    } catch (err) {
      reply.code(500).send({error: process.env.DEBUG === 'true'? err.stack: err.toString()});
    }
  });

  /**
   * DELETE /api/bullkins/jobs/{name}/{id}: 指定ジョブを削除
   * @param {string} name QueueName (ジョブ登録時 POST.yaml.name に指定したもの)
   * @param {string} id ジョブID（ジョブ登録時の Response.id）
   * @return {string}
   */
  fastify.delete('/jobs/:name/:id', async (request, reply) => {
    try {
      if (await bullkins.removeJob(request.params.name, request.params.id)) {
        reply.send({
          deleted: {
            name: request.params.name,
            id: request.params.id,
          }
        });
      } else {
        reply.code(404).send({error: `${req.params.name}[${req.params.id}] not found`});
      }
    } catch (err) {
      reply.code(500).send({error: process.env.DEBUG === 'true'? err.stack: err.toString()});
    }
  });
};