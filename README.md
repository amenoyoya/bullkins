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

## API

### Bullkins REST API
```bash
# ----
# Queue名: TestShell のQueueに新規ジョブ登録
## payload.command: $HOME/app/nodejs/test/test-command.sh 実行
$ curl -X POST -H 'Content-Type:application/json' -d '{
  "command": "/bin/bash $HOME/app/nodejs/test/test-command.sh"
}' http://localhost:3000/server/shell/jobs/TestShell

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
}' http://localhost:3000/server/shell/jobs/GetDateShell

# => {"id": "repeat:xxx:xxx", "name": "__default__", ...}

# ----
# 登録済みの全てのQueue名を取得
$ curl http://localhost:3000/server/shell/queues

# => ["TestShell", "GetDateShell"]

# ----
# Queue名: TestShell のQueueに登録されている ID: 1 のジョブ情報を取得
$ curl http://localhost:3000/server/shell/jobs/TestShell/1

# => {"id": 1, "status": "active", "stdout": "...", ...}

# ----
# Queue名: TestShell のQueueに登録されている ID: 1 のジョブを削除
$ curl -X DELETE http://localhost:3000/server/shell/jobs/TestShell/1

# ----
# Queue名: GetDateShell のQueueに登録されている全てのジョブIDを取得
$ curl http://localhost:3000/server/shell/jobs/GetDateShell

# => [
#   "jobs": ["repeat:xxx:xxxx", ...],
#   "repeat_jobs": [{"key": "__default__::10000", ...}, ...]
# ]

# ----
# Repeatable Job として登録したジョブを停止（削除）
## payload: repeat条件のJSONデータを指定
$ curl -X DELETE -H 'Content-Type:application/json' -d '{"every": 10000}' http://localhost:3000/server/shell/jobs/GetDateShell
```
