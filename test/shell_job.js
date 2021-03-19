const axios = require('axios');
const yaml = `
# ジョブを登録するQueueの名前: string
## 指定しない場合は '__BullkinsShellQueue__' が指定される
name: TestShellQueue

# ジョブ登録時オプション: object
# POST /api/bullkins/jobs 時の $yaml.option と同一
option:
  priority: 1

# シェルスクリプト実行時オプション: object
# @ref https://nodejs.org/api/child_process.html child_process.spawn#options
## shell_option.shell: true (default) だと command にシェルスクリプトをそのまま書けるようになる
## shell_option.shell: false では command にコマンドを記述し args にコマンド引数を配列で渡す必要がある
shell_option:
  shell: false

# シェル実行コマンド: string
command: ls

# command に渡す引数: string[]
args:
  - "-la"
`;

axios.post('http://localhost:8000/api/bullkins/shell.jobs', {yaml})
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
