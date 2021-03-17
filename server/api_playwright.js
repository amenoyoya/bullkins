const express = require('express');
const router = express.Router();

const jsyaml = require('../lib/jsyaml');
const {play} = require('../lib/playwright');

/**
 * Browserless Server エラー処理
 * @call from processBrowserless
 * @param {object} modules
 * @param {object} data
 * @param {*} err
 */
async function handleBrowserlessError(modules, data, err) {
  console.error(err);
  if (typeof data.catch === 'function') {
    try {
      await data.catch(modules, err);
    } catch (err) {
      console.error(err);
    }
  }
  try {
    if (typeof data.retry === 'object' && typeof(data.retry.max) === 'number') {
      // 試行回数が retry.max 以下なら retry.delay ミリ秒後（default: 10秒後）に再試行
      if (modules.$retry <= data.retry.max) {
        modules.$retry++;
        setTimeout(async () => {
          await processBrowserless(modules, data);
        }, data.retry.delay || 10 * 1000);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

/**
 * オブジェクトを Browserless Server に送信して処理させる
 * @param {object} modules {}
 * @param {object} data {
 *    retry: {max: number, delay: number} => エラー時の再試行設定
 *    modules: [] => requireして使えるようにしたいmodules (init, done, catch の第1引数 object に登録される)
 *    init: function(modules) return {object} => 最初に実行される関数。戻り値として返したobjectは、play時のシナリオとして利用可能となる
 *    done: function(modules, data) => 最後に実行される関数(playwright実行結果を第2引数に取る)
 *    catch: function(modules, err) => エラー時に実行される関数(playwright実行時エラーを第2引数に取る)
 *    play: [] | {} => playwright実行シナリオ
 * }
 */
async function processBrowserless(modules, data) {
  let customActions = {};

  // module requires
  if (Array.isArray(data.modules)) {
    for (const mod of data.modules) {
      if (typeof mod === 'object' && typeof mod.name === 'string' && typeof mod.module === 'string') {
        modules[mod.name] = require(mod.module);
      } else if (typeof mod === 'string') {
        modules[mod] = require(mod);
      }
    }
  }
  // initialize
  if (typeof data.init === 'function') {
    customActions = await data.init(modules); // init関数の戻り値をカスタムアクションとして登録
  }
  // execute playwright asynchronously
  if (typeof data.play === 'object') {
    play(
      data.play,
      {wsEndpoint: process.env.BROWSERLESS_ENDPOINT},
      customActions
    ).then(async result => {
      try {
        if (typeof data.done === 'function') {
          await data.done(modules, result);
        }
      } catch (err) {
        await handleBrowserlessError(modules, data, err);
      }
    }).catch(async err => {
      await handleBrowserlessError(modules, data, err);
    });
  }
}

/**
 * POST /playwright/: Browserless Server に yaml を送信して処理させる
 * @param {string} yaml yaml-string {
 *    retry: {max: number, delay: number} => エラー時の再試行設定
 *    modules: [] => requireして使えるようにしたいmodules (init, done, catch の第1引数 object に登録される)
 *    init: !!js/function "function(modules) {...}" => 最初に実行される関数。戻り値として返したobjectは、play時のシナリオとして利用可能となる
 *    done: !!js/function "function(modules, data) {...}" => 最後に実行される関数(playwright実行結果を第2引数に取る)
 *    catch: !!js/function "function(modules, err) {...}" => エラー時に実行される関数(playwright実行時エラーを第2引数に取る)
 *    play: [] | {} => playwright実行シナリオ
 * }
 */
router.post('/', async (req, res) => {
  try {
    if (typeof req.body.yaml !== 'string') {
      throw new Error('Post parameter `yaml` must be required');
    }
    const yaml = jsyaml.load(req.body.yaml);
    const modules = {
      $yaml_text: req.body.yaml, // 投げられたyamlテキスト
      $yaml: yaml, // loadしたyamlオブジェクト
      $process: async data => await processBrowserless(modules, data), // Browserless Server 処理関数
      $retry: 0, // 試行回数
    };
    await processBrowserless(modules, yaml);
    res.json({result: true});
  } catch (err) {
    res.status(500).send(err.stack);
  }
});

// export
module.exports = router;