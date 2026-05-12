const fs = require('fs');

let content = fs.readFileSync('src/tasks.ts', 'utf8');

// Update interface
content = content.replace(
  /export interface TrainingTask \{([^}]+)\}/, 
  "export interface TrainingTask {$1  hint?: string;\n}"
);

const tasksMatch = content.match(/export const trainingTasks: TrainingTask\[\] = \[([\s\S]+?)\];/);
if (tasksMatch) {
  let tasksStr = tasksMatch[1];
  
  // A helper to generate a hint from expectedCmd
  tasksStr = tasksStr.replace(/\{ id: '([^']+)', level: '([^']+)', title: '([^']+)', desc: '([^']+)', expectedCmd: '([^']+)', completedMsg: '([^']+)', mockOutput: (.*?) \}/g, 
  (match, id, level, title, desc, expectedCmd, completedMsg, mockOutput) => {
    let hint = '';
    const cmd = expectedCmd.split(' ')[0];
    
    if (expectedCmd === 'login') hint = 'ssh user@host のような形式を思い出してください。';
    else if (cmd === 'pwd') hint = 'Print Working Directory の頭文字です。';
    else if (cmd === 'ls') hint = 'LiSt の略です。-a で隠しファイル、-l で詳細清單です。';
    else if (cmd === 'cd') hint = 'Change Directory の略です。.. は親ディレクトリです。';
    else if (cmd === 'cat') hint = 'conCATenateの略ですが、ファイルの中身を見るためによく使います。';
    else if (cmd === 'touch') hint = 'ファイルのタイムスタンプを更新しますが、空のファイル作成にも使えます。';
    else if (cmd === 'mkdir') hint = 'MaKe DIRectory の略です。';
    else if (cmd === 'cp') hint = 'CoPy の略です。 cp コピー元 コピー先';
    else if (cmd === 'mv') hint = 'MoVe の略です。 mv 移動元 移動先';
    else if (cmd === 'rm' || cmd === 'rmdir') hint = 'ReMove の略です。';
    else if (cmd === 'man') hint = 'MANualの略。困ったら man コマンド名。';
    else if (cmd === 'clear') hint = '画面をクリアするその名の通りのコマンドです。';
    else if (cmd === 'echo') hint = 'やまびこ(echo)のように文字をそのまま出力します。';
    else if (cmd === 'cal') hint = 'CALendar の略です。';
    else if (cmd === 'date') hint = '現在の日付(date)と時刻を表示します。';
    else if (cmd === 'head') hint = '頭(head)から数行を表示します。';
    else if (cmd === 'tail') hint = '尻尾(tail)から数行を表示します。-fはfollow。';
    else if (cmd === 'grep') hint = 'Global Regular Expression Printの略。Grepで検索！';
    else if (cmd === 'ps') hint = 'Process Statusの略。 ps aux が定番です。';
    else if (cmd === 'top') hint = 'リソース消費のトップ(top)のプロセスなどを常時表示します。';
    else if (cmd === 'kill') hint = '指定したプロセスIDをキル(kill)します。-9は強制。';
    else if (cmd === 'find') hint = 'ファイルを見つける(find)。 find [パス] -name [名前]';
    else if (cmd === 'chmod') hint = 'CHange MODeの略。権限変更といえばこれ。';
    else if (cmd === 'chown' || cmd === 'chgrp') hint = 'CHange OWNer または CHange GRouP の略。';
    else if (cmd === 'history') hint = 'コマンドの歴史(history)を表示します。';
    else if (cmd === 'df') hint = 'Disk Freeの略。-h (Human readable)が見やすいです。';
    else if (cmd === 'du') hint = 'Disk Usageの略。こちらも -h が便利です。';
    else if (cmd === 'alias') hint = '別名を意味する英単語です。';
    else if (cmd === 'env') hint = 'ENVironment(環境)を表示します。';
    else if (cmd === 'tar') hint = 'Tape ARchiveの略。-cvfで作成、-xzvfなどで展開。';
    else if (cmd === 'ping') hint = '通信相手までピンポン(ping)と届くか確認。';
    else if (cmd === 'ip') hint = 'IP関連のコマンド。ip a や ip addr。';
    else if (cmd === 'ss') hint = 'Socket Statisticsの略。-tulpn がオススメです。';
    else if (cmd === 'wget') hint = 'Web GETの略。HTTPでファイルをダウンロードします。';
    else if (cmd === 'curl') hint = 'Client URLの略。Webとのやりとりに万能です。';
    else if (cmd === 'useradd') hint = 'USER ADD。その名の通りですね。';
    else if (cmd === 'passwd') hint = 'PASSWorD を変更します。';
    else if (cmd === 'sudo') hint = 'SuperUser DO の略。管理者権限を使います。';
    else if (cmd === 'systemctl') hint = 'System Control。サービスの起動や停止を行います。';
    else if (cmd === 'dig') hint = 'ドメイン情報を掘る(dig)コマンドです。';
    else if (cmd === 'sed') hint = 'Stream EDitorの略。 -i で直接置換できます。';
    else if (cmd === 'awk') hint = '開発者の頭文字から命名された強力なフィルタコマンドです。';
    else if (cmd === 'lsof') hint = 'LiSt Open Filesの略。開いているファイルを調べます。';
    else if (cmd === 'crontab') hint = '定期実行デーモン(cron)のテーブル(tab)を編集(-e)します。';
    else if (cmd === 'zip' || cmd === 'unzip') hint = 'zip 圧縮ファイル名 圧縮対象 の順です。';
    else if (cmd === 'wc') hint = 'Word Countの略です。 -l オプションで行数を数えられます。';
    else if (cmd === 'cut') hint = '切り取る(cut)。 -d で区切り、-f でフィールドを指定。';
    else if (cmd === 'tr') hint = 'TRanslate。文字列の文字単位の置換や削除を行います。';
    else if (cmd === 'sort') hint = '並べ替えです。数字の場合は -n をつけます。';
    else if (cmd === 'uptime') hint = '起動してからの時間(uptime)を表示します。';
    else if (cmd === 'w' || cmd === 'who') hint = '誰(who)がログインしているかを表示します。';
    else if (cmd === 'free') hint = '空き(free)メモリを表示します。-m でMB単位。';
    else if (cmd === 'last') hint = '最後に(last)ログインした履歴などを表示します。';
    else if (cmd === 'dmesg') hint = 'Display MESsaGe(カーネルなど)。ハードのログ。';
    else if (cmd === 'sleep') hint = 'スリープ。 & をつけるとバックグラウンドになります。';
    else if (cmd === 'jobs') hint = '実行中のジョブ一覧を見ます。';
    else if (cmd === 'fg') hint = 'ForeGroundの略。裏で動いている処理を表に出します。';
    else if (cmd === 'nohup') hint = 'NO Hang UP (切断しない)。ログアウトしても止めません。';
    else if (cmd === 'traceroute') hint = 'Trace route。ルートを追跡します。';
    else if (cmd === 'tcpdump') hint = 'パケットをダンプします。';
    else if (cmd === 'apt-get' || cmd === 'apt-cache') hint = 'パッケージ管理aptのコマンドです。';
    else if (cmd === 'rsync') hint = 'Remote SYNChronization。差分同期をします。';
    else if (cmd === 'ssh-keygen') hint = '鍵を作る(Key Gen)コマンドです。';
    else if (cmd === 'scp') hint = 'Secure CoPy。SSH越しにコピーします。';
    else if (cmd === 'tac') hint = 'catの逆ですね。下から表示します。';
    else if (cmd === 'diff' || cmd === 'sdiff') hint = 'DIFFerence。差分をとります。';
    else if (cmd === 'paste') hint = '貼り付ける。横に並べて結合します。';
    else if (cmd === 'nano' || cmd === 'vim') hint = 'ターミナル上のエディタです。';
    else if (cmd === 'id') hint = 'IDentifier。自分自身のユーザー情報を表示します。';
    else if (cmd === 'groupadd') hint = 'GROUP ADD。グループを追加します。';
    else if (cmd === 'ln') hint = 'LiNk。-s がシンボリック(ショートカット)のオプションです。';
    else if (cmd === 'stat') hint = 'STATus。状態を詳細に表示します。';
    else if (cmd === 'which') hint = 'どれ(which)が実行されるコマンドかパスを調べます。';
    else hint = 'コマンドの意味を考えてみましょう';

    return `{ id: '${id}', level: '${level}', title: '${title}', desc: '${desc}', expectedCmd: '${expectedCmd}', completedMsg: '${completedMsg}', hint: '${hint}', mockOutput: ${mockOutput} }`;
  });

  const lessTask = `
  // --- ページャー編 ---
  { id: 'i21', level: '中級', title: '長文ファイルの表示', desc: 'less file.txt を実行して、ページ送りでファイルを確認してください。', expectedCmd: 'less file.txt', completedMsg: 'catでは流れてしまう長いファイルも、lessならゆっくり読めます。qで終了します。', mockOutput: '\\\\x1b[2J\\\\x1b[HThis is a reasonably long file.\\nMore details line 1\\nMore details line 2\\n[EOF]', hint: 'lessコマンドです。「less is more」という慣用句が由来です。' },
`;

  tasksStr = tasksStr.replace('// --- 中級 (Intermediate) ---', '// --- 中級 (Intermediate) ---\n' + lessTask);
  
  content = content.replace(/export const trainingTasks: TrainingTask\[\] = \[([\s\S]+?)\];/, () => {
    return 'export const trainingTasks: TrainingTask[] = [\n' + tasksStr + '];';
  });
  
  fs.writeFileSync('src/tasks.ts', content);
  console.log("Updated tasks.ts");
} else {
  console.log("Tasks match not found");
}
