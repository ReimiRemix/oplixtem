export type TaskLevel = '初級' | '中級' | '上級' | 'エキスパート';

export interface TrainingTask {
  id: string;
  level: TaskLevel;
  title: string;
  desc: string;
  expectedCmd: string;
  validator?: (cmd: string, config?: any) => boolean | Promise<boolean> | { valid: boolean, reason?: string } | Promise<{ valid: boolean, reason?: string }>;
  completedMsg: string;
  mockOutput?: string | string[];
  hint?: string;
}

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const aiValidator = async (task: TrainingTask, cmd: string): Promise<{ valid: boolean, reason?: string }> => {
  const norm = cmd.trim().replace(/\s+/g, ' ');
  if (norm === task.expectedCmd) {
    return { valid: true };
  }

  const prompt = `
    You are a strict Linux terminal exercise evaluator.
    The task is: "${task.title}".
    The description is: "${task.desc}".
    The explicitly expected command is: "${task.expectedCmd}".
    The user entered command: "${cmd}".
    
    Evaluate if the user's command successfully achieves the task.
    You MUST be extremely strict. If the user command is just random characters like "aaa", or it's a completely unrelated command, or it's missing required arguments that affect the result in Linux, you MUST evaluate it as false.
    The explicitly expected command is just one way, but if their command does exactly the same thing, it's valid. Otherwise it's invalid.
    Output your response in valid JSON format ONLY, without markdown code blocks, like this:
    {
      "valid": false,
      "reason": "あなたが入力したコマンドは〇〇ですが、正しくは〇〇です。"
    }
  `;
  
  try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });
      const text = response.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
          try {
              const result = JSON.parse(match[0]);
              return { valid: result.valid === true || result.valid === "true", reason: result.reason };
          } catch (e) {
              console.error("JSON parse error:", e);
          }
      }
      return { valid: false, reason: "AIの判定に失敗しました。もう一度入力してください。" };
  } catch (e) {
      console.error("AI validation failed", e);
      return { valid: false, reason: "AIの判定に失敗しました。" };
  }
};

export const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
export const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(arr.length) * arr.length / arr.length] || arr[0]; // simple fix for potentially undefined

export const initialSshHost = `172.16.${getRandomInt(1, 200)}.${getRandomInt(1, 254)}`;
export const initialSshUser = getRandomItem(['user', 'admin', 'dev', 'guest', 'operator']);
export const initialSshPass = 'password';

export const generateTrainingTasks = (sshHost: string, sshUser: string, sshPort: string): TrainingTask[] => {
  const fileName = 'file.txt';
  
  const tasks: TrainingTask[] = [
    // --- 初級 (20 tasks) ---
    { id: 'b1', level: '初級', title: 'SSHログイン', desc: `SSH経由でサーバーにログインしてください。\nHost: ${sshHost}\nUser: ${sshUser}\nPassword: ${initialSshPass}${sshPort !== '22' ? `\nPort: ${sshPort}` : ''}`, expectedCmd: `ssh ${sshPort!=='22' ? '-p '+sshPort+' ' : ''}${sshUser}@${sshHost}`, validator: async (c, config) => {
      if (config && config.type === 'ssh') {
        if (config.host === sshHost && config.username === sshUser && config.password === initialSshPass && (config.port?.toString() || '22') === sshPort.toString()) return { valid: true };
      }
      return c.trim().replace(/\s+/g, ' ') === `ssh ${sshPort!=='22' ? '-p '+sshPort+' ' : ''}${sshUser}@${sshHost}`;
    }, completedMsg: 'ログインに成功しました！', hint: 'ssh user@host の形式です。' },
    { id: 'b2', level: '初級', title: '現在位置の確認', desc: '現在の作業ディレクトリパスを表示してください。', expectedCmd: 'pwd', validator: (c) => c.trim() === 'pwd', completedMsg: '正解です！', hint: 'Print Working Directory' },
    { id: 'b3', level: '初級', title: 'ファイルの一覧表示', desc: '現在のディレクトリ内のファイルを表示してください。', expectedCmd: 'ls', validator: (c) => /^ls(\s+)?$/.test(c.trim()), completedMsg: '表示できました。', hint: 'LiSt' },
    { id: 'b4', level: '初級', title: '隠しファイルを含む一覧', desc: '隠しファイルを含むすべてのファイルを表示してください。', expectedCmd: 'ls -a', validator: (c) => /^ls\s+(-a|-la|-al)(\s+.*)?$/.test(c.trim().replace(/\s+/g, ' ')), completedMsg: '隠しファイルが見えました。', hint: 'All' },
    { id: 'b5', level: '初級', title: 'ファイルのリスト表示', desc: '詳細（パーミッション等）を含めて表示してください。', expectedCmd: 'ls -l', validator: (c) => /^ls\s+(-l|-la|-al)(\s+.*)?$/.test(c.trim().replace(/\s+/g, ' ')), completedMsg: '詳細が確認できます。', hint: 'Long format' },
    { id: 'b6', level: '初級', title: 'ディレクトリの移動', desc: '/etc ディレクトリへ移動してください。', expectedCmd: 'cd /etc', validator: (c) => /^cd\s+\/etc\/?$/.test(c.trim().replace(/\s+/g, ' ')), completedMsg: '移動成功。', hint: 'Change Directory' },
    { id: 'b7', level: '初級', title: '親ディレクトリへ', desc: '1つ上のディレクトリに移動してください。', expectedCmd: 'cd ..', validator: (c) => /^cd\s+\.\.\/?$/.test(c.trim().replace(/\s+/g, ' ')), completedMsg: '戻りました。', hint: '.. は親です。' },
    { id: 'b8', level: '初級', title: 'ホームへ戻る', desc: '自分のホームディレクトリに戻ってください。', expectedCmd: 'cd', validator: (c) => /^cd(\s+~)?$/.test(c.trim()), completedMsg: 'ただいま。', hint: 'cd のみ。' },
    { id: 'b9', level: '初級', title: '内容の表示', desc: `${fileName} の内容を画面に出力してください。`, expectedCmd: `cat ${fileName}`, validator: (c) => c.trim().replace(/\s+/g, ' ') === `cat ${fileName}`, completedMsg: '読めました。', hint: 'cat' },
    { id: 'b10', level: '初級', title: '空ファイル作成', desc: `touchで ${fileName} という名前のファイルを作成してください。`, expectedCmd: `touch ${fileName}`, validator: (c) => c.trim().replace(/\s+/g, ' ') === `touch ${fileName}`, completedMsg: '作成完了。', hint: 'touch filename' },
    { id: 'b11', level: '初級', title: 'ディレクトリ作成', desc: 'mkdirで myproject というディレクトリを作成してください。', expectedCmd: 'mkdir myproject', validator: (c) => c.trim().replace(/\s+/g, ' ') === 'mkdir myproject', completedMsg: '箱ができました。', hint: 'MaKe DIRectory' },
    { id: 'b12', level: '初級', title: 'コピー', desc: `${fileName} を backup.txt にコピーしてください。`, expectedCmd: 'cp file.txt backup.txt', validator: (c) => c.trim().replace(/\s+/g, ' ') === 'cp file.txt backup.txt', completedMsg: '複製完了。', hint: 'CoPy' },
    { id: 'b13', level: '初級', title: '名前変更', desc: 'backup.txt の名前を old_backup.txt に変更してください。', expectedCmd: 'mv backup.txt old_backup.txt', validator: (c) => c.trim().replace(/\s+/g, ' ') === 'mv backup.txt old_backup.txt', completedMsg: '変更されました。', hint: 'MoVe' },
    { id: 'b14', level: '初級', title: '削除', desc: 'old_backup.txt を削除してください。', expectedCmd: 'rm old_backup.txt', validator: (c) => c.trim().replace(/\s+/g, ' ') === 'rm old_backup.txt', completedMsg: '消えました。', hint: 'ReMove' },
    { id: 'b15', level: '初級', title: 'ディレクトリ削除', desc: '空の myproject ディレクトリを削除してください。', expectedCmd: 'rmdir myproject', validator: (c) => ['rmdir myproject', 'rm -r myproject'].includes(c.trim().replace(/\s+/g, ' ')), completedMsg: '更地。', hint: 'rmdir' },
    { id: 'b16', level: '初級', title: 'マニュアル', desc: 'mvコマンドの使い方（manページ）を見てください。', expectedCmd: 'man mv', validator: (c) => c.trim().replace(/\s+/g, ' ') === 'man mv', completedMsg: '使い方が書いてあります。', hint: 'man' },
    { id: 'b17', level: '初級', title: 'クリア', desc: '画面を綺麗にしてください。', expectedCmd: 'clear', validator: (c) => c.trim() === 'clear', completedMsg: 'スッキリ。', hint: 'clear' },
    { id: 'b18', level: '初級', title: '出力', desc: '"Hello Linux" と出力してください。', expectedCmd: 'echo Hello Linux', validator: (c) => /^echo\s+("?'?Hello\s+Linux"?'?|Hello\s+Linux)$/.test(c.trim().replace(/\s+/g, ' ')), completedMsg: 'Hello!', hint: 'echo' },
    { id: 'b19', level: '初級', title: 'カレンダー', desc: '今月のカレンダーを確認してください。', expectedCmd: 'cal', validator: (c) => c.trim() === 'cal', completedMsg: '今日は何日？', hint: 'cal' },
    { id: 'b20', level: '初級', title: '日付', desc: '現在の日時を表示してください。', expectedCmd: 'date', validator: (c) => c.trim() === 'date', completedMsg: 'Time is money.', hint: 'date' },

    // --- 中級 (40 tasks) ---
    { id: 'i1', level: '中級', title: '階層作成', desc: 'mkdir -p を使い a/b/c という多重ディレクトリを作成してください。', expectedCmd: 'mkdir -p a/b/c', validator: (c) => c.trim().replace(/\s+/g, ' ') === 'mkdir -p a/b/c', completedMsg: '深いディレクトリができました。', hint: '-p オプション' },
    { id: 'i2', level: '中級', title: '複数コピー', desc: 'file1.txt と file2.txt を同時に mydir フォルダへコピーしてください。', expectedCmd: 'cp file1.txt file2.txt mydir/', validator: (c) => /cp\s+file1\.txt\s+file2\.txt\s+mydir\/?/.test(c.trim().replace(/\s+/g, ' ')), completedMsg: 'まとめてコピー！', hint: '引数を並べます。' },
    { id: 'i3', level: '中級', title: '確認付き移動', desc: '上書き確認を有効にしてファイルを移動してください。', expectedCmd: 'mv -i file.txt target/', validator: (c) => /mv\s+-i\s+file\.txt\s+target\//.test(c.trim()), completedMsg: '安全な移動。', hint: '-i オプション' },
    { id: 'i4', level: '中級', title: 'フォルダコピー', desc: 'ディレクトリを中身ごと（再帰的に）コピーしてください。', expectedCmd: 'cp -r dir1 dir2', validator: (c) => /cp\s+-r\s+dir1\s+dir2/.test(c.trim()), completedMsg: '丸ごと。', hint: 'Recursive' },
    { id: 'i5', level: '中級', title: '確認付き削除', desc: '削除前に確認が出るようにファイルを消してください。', expectedCmd: 'rm -i file.txt', validator: (c) => /rm\s+-i\s+file\.txt/.test(c.trim()), completedMsg: '後悔しませんね？', hint: 'Interactive' },
    { id: 'i6', level: '中級', title: '先頭表示', desc: 'ファイルの冒頭10行を確認してください。', expectedCmd: 'head file.txt', validator: (c) => /head\s+file\.txt/.test(c.trim()), completedMsg: '初めまして。', hint: 'head' },
    { id: 'i7', level: '中級', title: '末尾表示', desc: 'ファイルの最後10行を確認してください。', expectedCmd: 'tail file.txt', validator: (c) => /tail\s+file\.txt/.test(c.trim()), completedMsg: 'おしまい。', hint: 'tail' },
    { id: 'i8', level: '中級', title: '検索', desc: 'ファイル内から "error" という文字を検索してください。', expectedCmd: 'grep error log.txt', validator: (c) => /grep\s+error\s+log\.txt/.test(c.trim()), completedMsg: '発見。', hint: 'grep matches' },
    { id: 'i9', level: '中級', title: '逆検索', desc: '"fix" という文字を含まない行のみ表示してください。', expectedCmd: 'grep -v fix log.txt', validator: (c) => /grep\s+-v\s+fix\s+log\.txt/.test(c.trim()), completedMsg: '除外完了。', hint: '-v オプション' },
    { id: 'i10', level: '中級', title: 'パーミッション', desc: 'ファイルを「所有者のみ読み書き可能」に変更してください。', expectedCmd: 'chmod 600 private.txt', validator: (c) => /chmod\s+600\s+private\.txt/.test(c.trim()), completedMsg: '秘密厳守。', hint: 'chmod 600' },
    { id: 'i11', level: '中級', title: '詳細パーミッション', desc: '誰でも読み取り可能、所有者のみ書き込み可能に設定してください。', expectedCmd: 'chmod 644 public.txt', validator: (c) => /chmod\s+644\s+public\.txt/.test(c.trim()), completedMsg: '公開。', hint: 'chmod 644' },
    { id: 'i12', level: '中級', title: '全プロセス', desc: '実行中の全プロセスを確認してください。', expectedCmd: 'ps aux', validator: (c) => /ps\s+aux/.test(c.trim()), completedMsg: '監視中。', hint: 'ps aux' },
    { id: 'i13', level: '中級', title: '再帰リスト', desc: 'サブディレクトリも含めたすべてのファイルを一覧表示してください。', expectedCmd: 'ls -R', validator: (c) => /ls\s+-R/.test(c.trim()), completedMsg: '隅々まで。', hint: '-R オプション' },
    { id: 'i14', level: '中級', title: 'リダイレクト', desc: 'echoの出力を list.txt に保存してください。', expectedCmd: 'echo "test" > list.txt', validator: (c) => /echo\s+.*>\s+list\.txt/.test(c.trim()), completedMsg: '書き込みました。', hint: '> 使用' },
    { id: 'i15', level: '中級', title: '追記', desc: '既存のファイル log.txt の末尾に "done" を追記してください。', expectedCmd: 'echo "done" >> log.txt', validator: (c) => /echo\s+.*>>\s+log\.txt/.test(c.trim()), completedMsg: '継ぎ足し。', hint: '>> 使用' },
    { id: 'i16', level: '中級', title: '並び替え', desc: 'ファイル names.txt の内容をアルファベット順に並び替えてください。', expectedCmd: 'sort names.txt', validator: (c) => /sort\s+names\.txt/.test(c.trim()), completedMsg: '整列。', hint: 'sort' },
    { id: 'i17', level: '中級', title: '重複排除', desc: '連続する重複行を1つにまとめて表示してください。', expectedCmd: 'uniq data.txt', validator: (c) => /uniq\s+data\.txt/.test(c.trim()), completedMsg: 'スッキリ。', hint: 'uniq' },
    { id: 'i18', level: '中級', title: '行数カウント', desc: 'ファイルの行数を数えてください。', expectedCmd: 'wc -l file.txt', validator: (c) => /wc\s+-l\s+file\.txt/.test(c.trim()), completedMsg: '計上。', hint: 'Word Count' },
    { id: 'i19', level: '中級', title: '差分確認', desc: 'file1 と file2 の内容の差を表示してください。', expectedCmd: 'diff file1 file2', validator: (c) => /diff\s+file1\s+file2/.test(c.trim()), completedMsg: '間違い探し。', hint: 'diff' },
    { id: 'i20', level: '中級', title: 'シンボリックリンク', desc: 'original.txt へのショートカット link.txt を作成してください。', expectedCmd: 'ln -s original.txt link.txt', validator: (c) => /ln\s+-s\s+original\.txt\s+link\.txt/.test(c.trim()), completedMsg: '分身。', hint: 'ln -s' },
    { id: 'i21', level: '中級', title: 'ファイル検索', desc: '現在のフォルダ以下から ".txt" で終わるファイルを検索してください。', expectedCmd: 'find . -name "*.txt"', validator: (c) => /find\s+\.\s+-name\s+["']?\*\.txt["']?/.test(c.trim()), completedMsg: '見つけました。', hint: 'find' },
    { id: 'i22', level: '中級', title: 'コマンド所在', desc: 'lsコマンドの実体ファイルがどこにあるか調べてください。', expectedCmd: 'which ls', validator: (c) => /which\s+ls/.test(c.trim()), completedMsg: 'そこにあります。', hint: 'which' },
    { id: 'i23', level: '中級', title: '別名設定', desc: '"ll" と打つと "ls -l" が実行されるように設定してください。', expectedCmd: 'alias ll="ls -l"', validator: (c) => /alias\s+ll=["']ls\s+-l["']/.test(c.trim()), completedMsg: '時短テク。', hint: 'alias' },
    { id: 'i24', level: '中級', title: '履歴', desc: '過去に実行したコマンドのリストを表示してください。', expectedCmd: 'history', validator: (c) => c.trim() === 'history', completedMsg: '思い出。', hint: 'history' },
    { id: 'i25', level: '中級', title: '容量確認', desc: '現在のフォルダの使用容量を人間が読める形式で表示してください。', expectedCmd: 'du -sh', validator: (c) => /du\s+-sh/.test(c.trim()), completedMsg: '重い。', hint: 'Disk Usage' },
    { id: 'i26', level: '中級', title: '空き容量', desc: 'ディスク全体の空き状況を表示してください。', expectedCmd: 'df -h', validator: (c) => /df\s+-h/.test(c.trim()), completedMsg: 'まだまだ入ります。', hint: 'Disk Free' },
    { id: 'i27', level: '中級', title: 'メモリ', desc: 'メモリの使用状況を表示してください。', expectedCmd: 'free -m', validator: (c) => /free\s+-m/.test(c.trim()), completedMsg: '余裕あり。', hint: 'free' },
    { id: 'i28', level: '中級', title: 'システム情報', desc: 'カーネルのバージョンなど、システムの詳細を表示してください。', expectedCmd: 'uname -a', validator: (c) => /uname\s+-a/.test(c.trim()), completedMsg: '自己紹介。', hint: 'uname' },
    { id: 'i29', level: '中級', title: 'ホスト名', desc: 'このマシンのネットワーク上の名前を確認してください。', expectedCmd: 'hostname', validator: (c) => c.trim() === 'hostname', completedMsg: '名乗ります。', hint: 'hostname' },
    { id: 'i30', level: '中級', title: 'ユーザーID', desc: '現在のユーザーのUIDや所属グループを確認してください。', expectedCmd: 'id', validator: (c) => c.trim() === 'id', completedMsg: '私です。', hint: 'id' },
    { id: 'i31', level: '中級', title: 'グループ', desc: '自分が所属しているグループ名を表示してください。', expectedCmd: 'groups', validator: (c) => c.trim() === 'groups', completedMsg: '仲間。', hint: 'groups' },
    { id: 'i32', level: '中級', title: '稼働時間', desc: '起動してからどれくらい経ったか確認してください。', expectedCmd: 'uptime', validator: (c) => c.trim() === 'uptime', completedMsg: '頑張ってます。', hint: 'uptime' },
    { id: 'i33', level: '中級', title: 'ログイン中', desc: '現在ログインしているユーザーの一覧を見てください。', expectedCmd: 'who', validator: (c) => /^(who|w)$/.test(c.trim()), completedMsg: '誰かいます。', hint: 'who' },
    { id: 'i34', level: '中級', title: '最新ログイン', desc: '最近ログインした履歴を確認してください。', expectedCmd: 'last', validator: (c) => c.trim() === 'last', completedMsg: '足跡。', hint: 'last' },
    { id: 'i35', level: '中級', title: 'プロセス監視', desc: 'CPU負荷の高いプロセスをリアルタイムで監視してください。', expectedCmd: 'top', validator: (c) => c.trim() === 'top', completedMsg: '監視！', hint: 'top (qで終了)' },
    { id: 'i36', level: '中級', title: '変数の設定', desc: '環境変数 MYNAME に "LinuxUser" をセットしてください。', expectedCmd: 'export MYNAME=LinuxUser', validator: (c) => /export\s+MYNAME=LinuxUser/.test(c.trim()), completedMsg: 'セット。', hint: 'export' },
    { id: 'i37', level: '中級', title: '変数の確認', desc: '環境変数 PATH の中身を表示してください。', expectedCmd: 'echo $PATH', validator: (c) => /echo\s+\$PATH/.test(c.trim()), completedMsg: '道のり。', hint: '$ を前に。' },
    { id: 'i38', level: '中級', title: '接続確認', desc: 'google.com へ通信が届くか確認してください（数回で止める想定）。', expectedCmd: 'ping -c 4 google.com', validator: (c) => /ping\s+.*google\.com/.test(c.trim()), completedMsg: '応答あり。', hint: 'ping' },
    { id: 'i39', level: '中級', title: 'URL取得', desc: 'Web上のデータを画面に取得してください。', expectedCmd: 'curl http://example.com', validator: (c) => /curl\s+.*example\.com/.test(c.trim()), completedMsg: 'ダウンロード。', hint: 'curl' },
    { id: 'i40', level: '中級', title: '環境変数一覧', desc: '現在設定されているすべての環境変数を表示してください。', expectedCmd: 'env', validator: (c) => c.trim() === 'env', completedMsg: 'ズラリ。', hint: 'env' },

    // --- 上級 (40 tasks) ---
    { id: 'a1', level: '上級', title: 'パイプ連携', desc: 'lsの出力をgrepに渡し、"txt"が含まれる行だけ抽出してください。', expectedCmd: 'ls | grep txt', validator: (c) => c.trim().replace(/\s+/g, ' ') === 'ls | grep txt', completedMsg: '繋がる力。', hint: '| 使用' },
    { id: 'a2', level: '上級', title: '行数集計', desc: '現在のディレクトリのファイル数を数えてください。', expectedCmd: 'ls | wc -l', validator: (c) => /ls\s*\|\s*wc\s+-l/.test(c.trim()), completedMsg: 'カウント！', hint: 'ls と wc を繋ぐ' },
    { id: 'a3', level: '上級', title: '置換', desc: 'sedを使い "apple" を "orange" に置換して出力してください。', expectedCmd: "echo apple | sed 's/apple/orange/g'", validator: (c) => /sed\s+['"]?s\/apple\/orange\/g['"]?/.test(c.trim()), completedMsg: '化けました。', hint: 'sed s/old/new/g' },
    { id: 'a4', level: '上級', title: '抽出', desc: 'awkを使い、スペース区切りの2番目の列だけ表示してください。', expectedCmd: "echo 'A B C' | awk '{print $2}'", validator: (c) => /awk\s+['"]\{print\s+\$2\}['"]/.test(c.trim()), completedMsg: '抜き出し。', hint: 'awk print $2' },
    { id: 'a5', level: '上級', title: '大文字変換', desc: 'trを使い、小文字をすべて大文字に変換してください。', expectedCmd: "echo hello | tr 'a-z' 'A-Z'", validator: (c) => /tr\s+.*[a-zA-Z]/.test(c.trim()), completedMsg: 'BIG!', hint: 'tr' },
    { id: 'a6', level: '上級', title: '圧縮', desc: 'tarを使って mydir フォルダを backup.tar にまとめてください。', expectedCmd: 'tar -cvf backup.tar mydir', validator: (c) => /tar\s+-cvf\s+backup\.tar\s+mydir/.test(c.trim()), completedMsg: 'パック。', hint: 'tar -cvf' },
    { id: 'a7', level: '上級', title: '解凍', desc: 'backup.tar の中身を展開してください。', expectedCmd: 'tar -xvf backup.tar', validator: (c) => /tar\s+-xvf\s+backup\.tar/.test(c.trim()), completedMsg: 'オープン。', hint: 'tar -xvf' },
    { id: 'a8', level: '上級', title: 'ファイルの型', desc: '中身がテキストかバイナリか判別してください。', expectedCmd: 'file mystery.dat', validator: (c) => /file\s+ mystery\.dat/.test(c.trim().replace(/\s+/g,' ')), completedMsg: '正体見たり。', hint: 'file' },
    { id: 'a9', level: '上級', title: 'ハッシュ値', desc: 'ファイルのMD5ハッシュ値を計算してください。', expectedCmd: 'md5sum file.txt', validator: (c) => /md5sum\s+file\.txt/.test(c.trim()), completedMsg: '整合性チェック。', hint: 'md5sum' },
    { id: 'a10', level: '上級', title: 'Base64', desc: '文字列 "Linux" をBase64エンコードしてください。', expectedCmd: 'echo Linux | base64', validator: (c) => /echo\s+Linux\s*\|\s*base64/.test(c.trim()), completedMsg: '暗号風。', hint: 'base64' },
    { id: 'a11', level: '上級', title: 'プロセスの強制終了', desc: 'PID 1234 のプロセスを強制終了させてください。', expectedCmd: 'kill -9 1234', validator: (c) => /kill\s+-9\s+1234/.test(c.trim()), completedMsg: '粛清。', hint: 'kill -9' },
    { id: 'a12', level: '上級', title: 'バックグラウンド', desc: 'コマンドをバックグラウンドで実行してください。', expectedCmd: 'sleep 100 &', validator: (c) => /&\s*$/.test(c.trim()), completedMsg: '裏方で。', hint: '& を末尾に。' },
    { id: 'a13', level: '上級', title: 'ジョブ確認', desc: '現在保留中または実行中のジョブ一覧を見てください。', expectedCmd: 'jobs', validator: (c) => c.trim() === 'jobs', completedMsg: '仕事中。', hint: 'jobs' },
    { id: 'a14', level: '上級', title: 'フォアグラウンドへ', desc: '停止中のジョブ1番を前面に戻してください。', expectedCmd: 'fg %1', validator: (c) => /fg\s+(%1|1)/.test(c.trim()), completedMsg: '復帰。', hint: 'fg' },
    { id: 'a15', level: '上級', title: 'ポート使用状況', desc: 'どのポートが使用されているか一覧表示してください。', expectedCmd: 'netstat -tunlp', validator: (c) => /netstat\s+.*n/.test(c.trim()), completedMsg: '通信路確認。', hint: 'netstat' },
    { id: 'a16', level: '上級', title: 'IPアドレス', desc: '自分のIPアドレス等のネットワーク情報を表示してください。', expectedCmd: 'ip addr', validator: (c) => /^(ip\s+addr|ifconfig)$/.test(c.trim()), completedMsg: '住所確認。', hint: 'ip addr' },
    { id: 'a17', level: '上級', title: 'DNS照会', desc: 'google.com のIPアドレスを問い合わせてください。', expectedCmd: 'dig google.com', validator: (c) => /^(dig|nslookup)\s+google\.com/.test(c.trim()), completedMsg: '電話帳。', hint: 'dig' },
    { id: 'a18', level: '上級', title: '時刻合わせ', desc: '日付と時刻を 2026/01/01 12:00 に（表示上）合わせてください。', expectedCmd: 'date -s "2026-01-01 12:00:00"', validator: (c) => /date\s+-s/.test(c.trim()), completedMsg: 'タイムトラベル。', hint: 'date -s' },
    { id: 'a19', level: '上級', title: '標準エラー', desc: 'エラーメッセージのみを error.log に保存してください。', expectedCmd: 'command 2> error.log', validator: (c) => /2>\s*error\.log/.test(c.trim()), completedMsg: 'エラーだけ。', hint: '2>' },
    { id: 'a20', level: '上級', title: '全出力保存', desc: '標準出力と標準エラーの両方を all.log に保存してください。', expectedCmd: 'command > all.log 2>&1', validator: (c) => />\s*all\.log\s+2>&1/.test(c.trim()), completedMsg: 'ぜんぶ。', hint: '2>&1' },
    { id: 'a21', level: '上級', title: 'ファイルの分割', desc: '大きなファイル big.txt を100行ごとに分割してください。', expectedCmd: 'split -l 100 big.txt', validator: (c) => /split\s+-l\s+100/.test(c.trim()), completedMsg: '小分け。', hint: 'split' },
    { id: 'a22', level: '上級', title: '結合', desc: '分割されたファイル xaa xab を合体させて元に戻してください。', expectedCmd: 'cat xaa xab > original.txt', validator: (c) => /cat\s+xaa\s+xab\s*>\s*original\.txt/.test(c.trim()), completedMsg: '合体。', hint: 'cat >' },
    { id: 'a23', level: '上級', title: 'ハードリンク', desc: 'ファイル file1 へのハードリンク link1 を作成してください。', expectedCmd: 'ln file1 link1', validator: (c) => /ln\s+file1\s+link1/.test(c.trim()) && !/-s/.test(c.trim()), completedMsg: '実体の共有。', hint: 'ln' },
    { id: 'a24', level: '上級', title: '所有者変更', desc: 'ファイルの所有者を root に変更してください。', expectedCmd: 'chown root file.txt', validator: (c) => /chown\s+root/.test(c.trim()), completedMsg: '管理下。', hint: 'chown' },
    { id: 'a25', level: '上級', title: 'グループ変更', desc: 'ファイルの所属グループを admin に変更してください。', expectedCmd: 'chgrp admin file.txt', validator: (c) => /chgrp\s+admin/.test(c.trim()), completedMsg: 'グループ入り。', hint: 'chgrp' },
    { id: 'a26', level: '上級', title: '検索して実行', desc: '全 .log ファイルを検索し、すべて削除してください。', expectedCmd: 'find . -name "*.log" -exec rm {} \\;', validator: (c) => /find\s+.*\s*-exec/.test(c.trim()), completedMsg: '一括処分。', hint: 'find -exec' },
    { id: 'a27', level: '上級', title: '重複行カウント', desc: 'ファイル内の各行が何回出現するか集計してください。', expectedCmd: 'sort data.txt | uniq -c', validator: (c) => /sort\s*\|\s*uniq\s+-c/.test(c.trim()), completedMsg: '統計。', hint: 'uniq -c' },
    { id: 'a28', level: '上級', title: 'メモリ情報', desc: 'カーネルのメッセージログ（起動時の状況など）を表示してください。', expectedCmd: 'dmesg', validator: (c) => c.trim() === 'dmesg', completedMsg: '深淵。', hint: 'dmesg' },
    { id: 'a29', level: '上級', title: 'ディスク状況', desc: 'マウントされているデバイスの一覧を表示してください。', expectedCmd: 'mount', validator: (c) => c.trim() === 'mount', completedMsg: '接合確認。', hint: 'mount' },
    { id: 'a30', level: '上級', title: 'サービス状態', desc: 'nginxサービスの状態を確認してください。', expectedCmd: 'systemctl status nginx', validator: (c) => /systemctl\s+status/.test(c.trim()), completedMsg: '元気かな？', hint: 'systemctl' },
    { id: 'a31', level: '上級', title: 'エイリアス永続化', desc: '.bashrc ファイルを確認してください。', expectedCmd: 'cat ~/.bashrc', validator: (c) => /bashrc/.test(c.trim()), completedMsg: '設定の要。', hint: '.bashrc' },
    { id: 'a32', level: '上級', title: 'パスワード変更', desc: '自分のパスワードを変更するコマンドは？', expectedCmd: 'passwd', validator: (c) => /passwd/.test(c.trim()), completedMsg: '守秘。', hint: 'passwd' },
    { id: 'a33', level: '上級', title: '変数の削除', desc: '環境変数 MYNAME を消去してください。', expectedCmd: 'unset MYNAME', validator: (c) => /unset\s+MYNAME/.test(c.trim()), completedMsg: '忘却。', hint: 'unset' },
    { id: 'a34', level: '上級', title: '読み取り', desc: 'スクリプト内でユーザーの入力を変数 "val" に受け取ってください。', expectedCmd: 'read val', validator: (c) => /read\s+val/.test(c.trim()), completedMsg: '聞き取り。', hint: 'read' },
    { id: 'a35', level: '上級', title: 'ファイル属性', desc: 'ファイルの隠された属性（i:不変など）を確認してください。', expectedCmd: 'lsattr file.txt', validator: (c) => /lsattr/.test(c.trim()), completedMsg: '真実の姿。', hint: 'lsattr' },
    { id: 'a36', level: '上級', title: '不変設定', desc: '誰も削除できないようにファイルに不変属性を付けてください。', expectedCmd: 'chattr +i file.txt', validator: (c) => /chattr\s+\+i/.test(c.trim()), completedMsg: '絶対不変。', hint: 'chattr +i' },
    { id: 'a37', level: '上級', title: '空ファイル探し', desc: '容量が0のファイルだけを検索してください。', expectedCmd: 'find . -size 0', validator: (c) => /find\s+.*\s*-size\s+0/.test(c.trim()), completedMsg: '空っぽ。', hint: '-size 0' },
    { id: 'a38', level: '上級', title: 'ディレクトリのみ', desc: 'ディレクトリだけを表示するように ls を実行してください。', expectedCmd: 'ls -d */', validator: (c) => /ls\s+-d/.test(c.trim()), completedMsg: '箱だけ。', hint: 'ls -d' },
    { id: 'a39', level: '上級', title: '重複なし結合', desc: '2つのファイルを合体させ、重複行を消して表示してください。', expectedCmd: 'cat f1 f2 | sort | uniq', validator: (c) => /cat\s+.*\s*\|\s*sort\s*\|\s*uniq/.test(c.trim()), completedMsg: '融合。', hint: 'cat sort uniq' },
    { id: 'a40', level: '上級', title: '全ルート', desc: 'rootユーザー（管理者）に切り替えてください。', expectedCmd: 'sudo su -', validator: (c) => /sudo\s+(su|sh|bash)/.test(c.trim()), completedMsg: '万能感。', hint: 'sudo su' },
  ];

  return tasks.map(t => ({ ...t, validator: t.validator || ((c: string) => aiValidator(t, c)) }));
};
