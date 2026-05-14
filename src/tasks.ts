import { GoogleGenAI } from '@google/genai';

export interface TrainingTask {
  id: string;
  level: '初級' | '中級' | '上級' | 'エキスパート';
  title: string;
  desc: string;
  expectedCmd: string;
  validator: (cmd: string, context?: any) => boolean | { valid: boolean; reason?: string } | Promise<boolean | { valid: boolean; reason?: string }>;
  completedMsg: string;
  hint: string;
  explanation?: string;
}

export const initialSshHost = '172.16.158.107';
export const initialSshUser = 'user';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const aiValidator = async (task: TrainingTask, cmd: string) => {
  try {
    const prompt = `Task: ${task.title}\nExpected: ${task.expectedCmd}\nUser command: ${cmd}\nIs this command equivalent and correct for the task? Answer only YES or NO.`;
    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ parts: [{ text: prompt }] }]
    });
    return result.text.trim().toUpperCase().includes('YES');
  } catch (e) {
    return false;
  }
};

export const generateTrainingTasks = (sshHost?: string, sshUser?: string, apiKey?: string): TrainingTask[] => {
  const fileName = 'file.txt';
  const tasks: TrainingTask[] = [
    // --- 初級 (40 tasks: b1 - b40) ---
    { id: 'b1', level: '初級', title: 'SSHでサーバーに接続する', desc: 'リモートサーバーにログインしてください。', expectedCmd: 'ssh user@172.16.158.107', validator: (c) => /ssh\s+user@172\.16\.158\.107/.test(c.trim()), completedMsg: 'ログインに成功しました！', hint: 'ssh user@host', explanation: 'SSH (Secure Shell) は、暗号化通信を使って遠隔地のサーバーを操作するためのプロトコールです。' },
    { id: 'b2', level: '初級', title: 'ファイルの一覧を確認する', desc: '現在のディレクトリにあるファイルを表示してください。', expectedCmd: 'ls', validator: (c) => /^ls/.test(c.trim()), completedMsg: 'ファイルが確認できました。', hint: 'ls', explanation: 'lsコマンドは、指定したディレクトリの内容を表示します。' },
    { id: 'b3', level: '初級', title: '詳細な情報を表示する', desc: 'パーミッションや所有者、サイズなどを含めて表示してください。', expectedCmd: 'ls -l', validator: (c) => /ls\s+.*-l/.test(c.trim()), completedMsg: '詳細情報が表示されました。', hint: 'ls -l', explanation: '-l オプションはロングフォーマット（詳細形式）で表示します。' },
    { id: 'b4', level: '初級', title: '隠しファイルも含めて表示する', desc: '「.」で始まるファイルも含めてすべて表示してください。', expectedCmd: 'ls -a', validator: (c) => /ls\s+.*-a/.test(c.trim()), completedMsg: '隠しファイルが見つかりました。', hint: 'ls -a', explanation: '-a オプションは「all」を意味し、隠しファイルも表示します。' },
    { id: 'b5', level: '初級', title: '現在のディレクトリを表示する', desc: '自分が今どこにいるか（絶対パス）を表示してください。', expectedCmd: 'pwd', validator: (c) => c.trim() === 'pwd', completedMsg: '現在地がわかりました。', hint: 'pwd', explanation: 'pwdは「Print Working Directory」の略です。' },
    { id: 'b6', level: '初級', title: '特定のディレクトリへ移動する', desc: '/etc ディレクトリへ移動してください。', expectedCmd: 'cd /etc', validator: (c, ctx) => ctx?.shell?.pwd() === '/etc', completedMsg: '移動に成功しました。', hint: 'cd /etc', explanation: 'cd はディレクトリを移動するための基本コマンドです。' },
    { id: 'b7', level: '初級', title: 'ルートディレクトリへ移動する', desc: '最上位の階層（/）へ移動してください。', expectedCmd: 'cd /', validator: (c, ctx) => ctx?.shell?.pwd() === '/', completedMsg: 'ルートへ到着しました。', hint: 'cd /', explanation: '「/」はシステムの根幹となるディレクトリです。' },
    { id: 'b8', level: '初級', title: 'ホームディレクトリへ戻る', desc: '自分のホーム（~）に戻ってください。', expectedCmd: 'cd ~', validator: (c, ctx) => ctx?.shell?.pwd() === '/home/user', completedMsg: 'ホームへ戻りました。', hint: 'cd ~', explanation: '「~」はログインユーザーのホームへのショートカットです。' },
    { id: 'b9', level: '初級', title: '新しいディレクトリを作成する', desc: '「backup」というディレクトリを作成してください。', expectedCmd: 'mkdir backup', validator: (c, ctx) => !!ctx?.vfs?.getNode('/home/user/backup'), completedMsg: 'ディレクトリを作成しました。', hint: 'mkdir backup', explanation: 'mkdirは新しいディレクトリを作成します。' },
    { id: 'b10', level: '初級', title: '空のファイルを作成する', desc: '「note.txt」という空のファイルを作成してください。', expectedCmd: 'touch note.txt', validator: (c, ctx) => !!ctx?.vfs?.getNode('/home/user/note.txt'), completedMsg: 'ファイルが作成されました。', hint: 'touch note.txt', explanation: 'touchはファイルを新規作成する場合によく使われます。' },
    { id: 'b11', level: '初級', title: 'ファイルをコピーする', desc: 'note.txt を copy.txt としてコピーしてください。', expectedCmd: 'cp note.txt copy.txt', validator: (c, ctx) => !!ctx?.vfs?.getNode('/home/user/copy.txt'), completedMsg: 'コピーが完了しました。', hint: 'cp', explanation: '既存のファイルを別名で複製します。' },
    { id: 'b12', level: '初級', title: 'ファイル名を変更する', desc: 'copy.txt を result.txt に変更してください。', expectedCmd: 'mv copy.txt result.txt', validator: (c, ctx) => !!ctx?.vfs?.getNode('/home/user/result.txt') && !ctx?.vfs?.getNode('/home/user/copy.txt'), completedMsg: '名前を変更しました。', hint: 'mv', explanation: 'mv は移動だけでなく、名前の変更にも使われます。' },
    { id: 'b13', level: '初級', title: 'ファイルを削除する', desc: 'result.txt を削除してください。', expectedCmd: 'rm result.txt', validator: (c, ctx) => !ctx?.vfs?.getNode('/home/user/result.txt'), completedMsg: 'ファイルを削除しました。', hint: 'rm', explanation: 'Linuxにゴミ箱はないので、削除には注意が必要です。' },
    { id: 'b14', level: '初級', title: '空のディレクトリを削除する', desc: '作成した backup ディレクトリを削除してください。', expectedCmd: 'rmdir backup', validator: (c, ctx) => !ctx?.vfs?.getNode('/home/user/backup'), completedMsg: 'ディレクトリを削除しました。', hint: 'rmdir', explanation: 'rmdirは空のディレクトリ専用の削除コマンドです。' },
    { id: 'b15', level: '初級', title: 'ファイルの内容を表示する', desc: '/etc/hostname の内容を表示してください。', expectedCmd: 'cat /etc/hostname', validator: (c) => /cat\s+\/etc\/hostname/.test(c.trim()), completedMsg: '内容が表示されました。', hint: 'cat', explanation: 'ファイルの中身を標準出力に書き出します。' },
    { id: 'b16', level: '初級', title: 'コマンドのヘルプを確認する', desc: 'ls コマンドのヘルプオプションを使ってください。', expectedCmd: 'ls --help', validator: (c) => /ls\s+--help/.test(c.trim()), completedMsg: 'ヘルプが表示されました。', hint: 'ls --help', explanation: '多くのコマンドは --help で使い方を確認できます。' },
    { id: 'b17', level: '初級', title: '画面の内容を消去する', desc: 'ターミナル画面の表示を一度クリアしてください。', expectedCmd: 'clear', validator: (c) => c.trim() === 'clear', completedMsg: '画面がきれいになりました。', hint: 'clear', explanation: '画面をリフレッシュして見やすくします。' },
    { id: 'b18', level: '初級', title: '現在の日時を表示する', desc: '現在の日付と時刻を表示してください。', expectedCmd: 'date', validator: (c) => c.trim() === 'date', completedMsg: '日時が表示されました。', hint: 'date', explanation: 'システムの現在時刻を確認します。' },
    { id: 'b19', level: '初級', title: 'カレンダーを表示してみる', desc: '今月のカレンダーを表示してください。', expectedCmd: 'cal', validator: (c) => c.trim() === 'cal', completedMsg: 'カレンダーです！', hint: 'cal', explanation: 'テキスト形式のカレンダーを表示します。' },
    { id: 'b20', level: '初級', title: '指定した文字列を画面に出す', desc: '「Linux Training Started」と表示してください。', expectedCmd: 'echo "Linux Training Started"', validator: (c) => /echo\s+.*Linux Training Started/.test(c.trim()), completedMsg: '出力されました。', hint: 'echo', explanation: 'echoは引数をそのまま表示します。' },
    { id: 'b21', level: '初級', title: 'ファイルの上位数行を読み取る', desc: '/etc/passwd の最初の3行のみ表示してください。', expectedCmd: 'head -n 3 /etc/passwd', validator: (c) => /head\s+-n\s+3/.test(c.trim()), completedMsg: '最初の3行です。', hint: 'head', explanation: '大きいファイルの冒頭を確認する際に役立ちます。' },
    { id: 'b22', level: '初級', title: 'ファイルの末尾数行を読み取る', desc: '/etc/services の最後の5行を表示してください。', expectedCmd: 'tail -n 5 /etc/services', validator: (c) => /tail\s+-n\s+5/.test(c.trim()), completedMsg: '最後の5行です。', hint: 'tail', explanation: 'ログの最新の変化を追うのに使われます。' },
    { id: 'b23', level: '初級', title: 'コマンドの実行履歴を確認する', desc: '今までに入力したコマンドの履歴を見てみましょう。', expectedCmd: 'history', validator: (c) => c.trim() === 'history', completedMsg: '履歴が表示されました。', hint: 'history', explanation: 'これまでの実行コマンドを一覧します。' },
    { id: 'b24', level: '初級', title: 'コマンドの実行ファイルの場所を調べる', desc: '「ls」コマンドの実体がどこにあるか表示してください。', expectedCmd: 'which ls', validator: (c) => /which\s+ls/.test(c.trim()), completedMsg: 'フルパスがわかりました。', hint: 'which', explanation: 'PATHの中から実行ファイルを検索します。' },
    { id: 'b25', level: '初級', title: 'ファイルの一覧を逆順にする', desc: 'lsの結果を名前の降順（逆順）で表示してください。', expectedCmd: 'ls -r', validator: (c) => /ls\s+.*-r/.test(c.trim()), completedMsg: '逆順になりました。', hint: 'ls -r', explanation: 'ソート順を反転させます。' },
    { id: 'b26', level: '初級', title: 'OSの詳細情報を確認する', desc: 'Linuxカーネルの情報を全表示してください。', expectedCmd: 'uname -a', validator: (c) => /uname\s+-a/.test(c.trim()), completedMsg: '自己紹介完了！', hint: 'uname', explanation: 'システム情報を取得します。' },
    { id: 'b27', level: '初級', title: 'メモリの使用状況を表示する', desc: '物理メモリの使用量・空き量を表示してください。', expectedCmd: 'free', validator: (c) => c.trim() === 'free', completedMsg: '資源管理ですね。', hint: 'free', explanation: 'メモリとスワップの使用状況です。' },
    { id: 'b28', level: '初級', title: 'システムの稼働時間を調べる', desc: '起動してからの時間と負荷を表示してください。', expectedCmd: 'uptime', validator: (c) => c.trim() === 'uptime', completedMsg: 'よく働いています。', hint: 'uptime', explanation: '稼働時間とロードアベレージです。' },
    { id: 'b29', level: '初級', title: '自分のユーザー名を表示する', desc: '今ログインしている自分のユーザー名を確認してください。', expectedCmd: 'whoami', validator: (c) => c.trim() === 'whoami', completedMsg: 'あなたはログイン中です。', hint: 'whoami', explanation: '現在の実効ユーザー名です。' },
    { id: 'b30', level: '初級', title: 'コマンドに短い別名をつける', desc: '「ls -la」を「ll」で呼び出せるようにしてください。', expectedCmd: "alias ll='ls -la'", validator: (c) => /alias\s+ll=/.test(c.trim()), completedMsg: '便利になりました！', hint: 'alias', explanation: 'よく使う長いコマンドを短縮できます。' },
    { id: 'b31', level: '初級', title: '環境変数を一覧表示する', desc: '設定されている環境変数をすべて表示してください。', expectedCmd: 'env', validator: (c) => c.trim() === 'env' || c.trim() === 'printenv', completedMsg: 'ズラリと出ましたね。', hint: 'env', explanation: '環境に関わる変数のリストです。' },
    { id: 'b32', level: '初級', title: '長いファイルを1画面ずつ読む', desc: '/etc/services を less でスクロールしながら見てください。', expectedCmd: 'less /etc/services', validator: (c) => /less\s+/.test(c.trim()), completedMsg: 'ページャが起動しました。', hint: 'less', explanation: '読み込み時のメモリ消費が少なく、大きなファイル向きです。' },
    { id: 'b33', level: '初級', title: 'ファイルを新しい順に並べる', desc: '更新日時が新しいものから順に表示してください。', expectedCmd: 'ls -t', validator: (c) => /ls\s+.*-t/.test(c.trim()), completedMsg: '最新順になりました。', hint: 'ls -t', explanation: 'タイムスタンプでソートします。' },
    { id: 'b34', level: '初級', title: '分かりやすい単位でサイズ表示する', desc: 'ファイルサイズをKB/MB等で表示（人間が見やすく）してください。', expectedCmd: 'ls -lh', validator: (c) => /ls\s+.*-lh/.test(c.trim()), completedMsg: 'サイズが分かりやすくなりました。', hint: 'ls -lh', explanation: 'Human Readableオプションです。' },
    { id: 'b35', level: '初級', title: '実行パスの環境変数を確認する', desc: '$PATH の値を echo で出力してください。', expectedCmd: 'echo $PATH', validator: (c) => /echo\s+\$PATH/.test(c.trim()), completedMsg: '道筋が見えました。', hint: 'echo $PATH', explanation: 'コマンドを探索する際の基礎知識です。' },
    { id: 'b36', level: '初級', title: '一時的に管理人権限を使う', desc: 'sudo を使って id コマンドを実行してください。', expectedCmd: 'sudo id', validator: (c) => /sudo\s+id/.test(c.trim()), completedMsg: 'スーパーパワー！', hint: 'sudo id', explanation: '一時的に管理者権限を代行します。' },
    { id: 'b37', level: '初級', title: 'ファイルに上書きで保存する', desc: '「Done」という文字を result.txt に書き込んでください。', expectedCmd: 'echo "Done" > result.txt', validator: (c, ctx) => !!ctx?.vfs?.getNode('/home/user/result.txt'), completedMsg: 'リダイレクト成功！', hint: '>', explanation: '「>」は標準出力をファイルへ書き込みます。' },
    { id: 'b38', level: '初級', title: 'ファイルの一部をもっと詳しく調べる', desc: 'fileコマンドで /etc/passwd が何者か確認してください。', expectedCmd: 'file /etc/passwd', validator: (c) => /file\s+/.test(c.trim()), completedMsg: '正体がわかりました。', hint: 'file', explanation: 'ファイル形式を特定します。' },
    { id: 'b39', level: '初級', title: 'マニュアルの特定の章を引く', desc: 'manコマンドでlsのページを開いてください。', expectedCmd: 'man ls', validator: (c) => /man\s+ls/.test(c.trim()), completedMsg: '公式ガイドです。', hint: 'man ls', explanation: 'UNIX/Linuxの世界では最も信頼できる一次ソースです。' },
    { id: 'b40', level: '初級', title: 'シェルを正しく終了する', desc: '現在のSSH接続をexitで終了する準備をしましょう。', expectedCmd: 'exit', validator: (c) => c.trim() === 'exit', completedMsg: 'お疲れ様でした！', hint: 'exit', explanation: 'セッションを切り、ログアウトします。' },

    // --- 中級 (40 tasks: i1 - i40) ---
    { id: 'i1', level: '中級', title: '階層をまとめて作成する', desc: 'dir1/dir2/dir3 を一気に作ってください。', expectedCmd: 'mkdir -p dir1/dir2/dir3', validator: (c) => /mkdir\s+-p/.test(c.trim()), completedMsg: '中間ディレクトリも作れました。', hint: 'mkdir -p', explanation: '-p オプションは「parents」を一括作成します。' },
    { id: 'i2', level: '中級', title: 'ディレクトリを中身ごと複製する', desc: 'dir1 を dir1_bak としてコピーしてください。', expectedCmd: 'cp -r dir1 dir1_bak', validator: (c) => /cp\s+.*-r/.test(c.trim()), completedMsg: '再帰コピー成功。', hint: 'cp -r', explanation: 'ディレクトリのコピーには -r が必須です。' },
    { id: 'i3', level: '中級', title: '再帰的に強制削除を実行する', desc: 'dir1_bak を中身ごと、確認なしで消してください。', expectedCmd: 'rm -rf dir1_bak', validator: (c) => /rm\s+.*-rf/.test(c.trim()), completedMsg: '消滅しました。', hint: 'rm -rf', explanation: '危険ですが、掃除にはよく使われるコマンドです。' },
    { id: 'i4', level: '中級', title: '特定の単語を含む行を抜き出す', desc: '/etc/passwd から「user」を含む行を探してください。', expectedCmd: 'grep user /etc/passwd', validator: (c) => /grep\s+user/.test(c.trim()), completedMsg: '発見！', hint: 'grep', explanation: '文字列検索の基本。' },
    { id: 'i5', level: '中級', title: 'ファイルの権限を数字で指定する', desc: 'test.html を誰でも読み込める（644）にしてください。', expectedCmd: 'chmod 644 test.html', validator: (c) => /chmod\s+644/.test(c.trim()), completedMsg: '一般的な公開設定です。', hint: 'chmod 644', explanation: 'オーナーは読み書き、他人は読み取りのみ。' },
    { id: 'i6', level: '中級', title: 'ファイルの所有者を変更する', desc: 'ファイルの持ち主を「root」に変えてみましょう（sudoが必要）。', expectedCmd: 'sudo chown root test.html', validator: (c) => /chown/.test(c.trim()), completedMsg: '持ち主が変わりました。', hint: 'chown', explanation: 'Change Ownerコマンドです。' },
    { id: 'i7', level: '中級', title: 'シンボリックリンクを作成する', desc: '元のファイルを指し示す「link.txt」を作成してください。', expectedCmd: 'ln -s origin.txt link.txt', validator: (c) => /ln\s+-s/.test(c.trim()), completedMsg: '別名リンク完了。', hint: 'ln -s', explanation: '実体は一つで、名前が複数ある状態です。' },
    { id: 'i8', level: '中級', title: 'ハードリンクを作成する', desc: '実体への参照（ハードリンク）を作成してください。', expectedCmd: 'ln fileA fileB', validator: (c) => /^ln\s+[^s]/.test(c.trim()), completedMsg: '実体を共有しました。', hint: 'ln', explanation: '同じinodeを共有します。' },
    { id: 'i9', level: '中級', title: 'ディスクの使用状況を集計する', desc: '今のディレクトリがどれくらい容量を喰っているか表示してください。', expectedCmd: 'du -sh', validator: (c) => /du\s+.*-sh/.test(c.trim()), completedMsg: '計測完了。', hint: 'du -sh', explanation: 'Disk Usageの要約表示。' },
    { id: 'i10', level: '中級', title: 'ネットワーク疎通を確認する', desc: 'google.com まで信号が届くか確認してください。', expectedCmd: 'ping -c 3 google.com', validator: (c) => /ping/.test(c.trim()), completedMsg: '応答を確認しました。', hint: 'ping', explanation: '接続確認の王道。' },
    { id: 'i11', level: '中級', title: 'IPアドレスを表示する（推奨形式）', desc: 'ipコマンドを使って住所を確認してください。', expectedCmd: 'ip addr', validator: (c) => /ip\s+addr/.test(c.trim()), completedMsg: '確認成功。', hint: 'ip addr', explanation: 'ifconfigに代わる現代的なツールです。' },
    { id: 'i12', level: '中級', title: 'プロセスを名前で検索して絞り込む', desc: '「ssh」という文字列を含むプロセスのみ表示してください。', expectedCmd: 'ps aux | grep ssh', validator: (c) => /ps.*grep/.test(c.trim()), completedMsg: '対象を見つけました！', hint: 'ps aux | grep', explanation: 'パイプの真骨頂です。' },
    { id: 'i13', level: '中級', title: '実行中のプログラムを強制停止させる', desc: 'プロセスに終了シグナルを送ってください。', expectedCmd: 'kill 1234', validator: (c) => /kill/.test(c.trim()), completedMsg: '信号を送りました。', hint: 'kill', explanation: 'プロセスを終了させます。' },
    { id: 'i14', level: '中級', title: '動的なリソース監視を開始する', desc: 'topを起動して負荷を確認してください。', expectedCmd: 'top', validator: (c) => c.trim() === 'top', completedMsg: '監視中……', hint: 'top', explanation: '情報の更新し続けるモニタです。' },
    { id: 'i15', level: '中級', title: '条件に合うファイルを検索して探す', desc: '名前に「config」が含まれるファイルを検索してください。', expectedCmd: 'find . -name "*config*"', validator: (c) => /find.*-name/.test(c.trim()), completedMsg: '発見できましたね。', hint: 'find', explanation: '高度な検索ツールです。' },
    { id: 'i16', level: '中級', title: 'ファイルの差分内容を詳しく見る', desc: 'diffコマンドを試してください。', expectedCmd: 'diff a.txt b.txt', validator: (c) => /diff/.test(c.trim()), completedMsg: '違いが出ました。', hint: 'diff', explanation: 'どこが違うかの比較です。' },
    { id: 'i17', level: '中級', title: 'DNSの情報を問い合わせる', desc: 'ホスト名からIPアドレスを引いてみましょう。', expectedCmd: 'dig google.com', validator: (c) => /dig|nslookup/.test(c.trim()), completedMsg: 'DNSが答えました。', hint: 'dig', explanation: 'ドメインの正体を探ります。' },
    { id: 'i18', level: '中級', title: 'ファイルを圧縮して容量を節約する', desc: 'gzip でファイルを圧縮してください。', expectedCmd: 'gzip data.ext', validator: (c) => /gzip/.test(c.trim()), completedMsg: 'ダイエット成功。', hint: 'gzip', explanation: '圧縮してアーカイブしやすくします。' },
    { id: 'i19', level: '中級', title: '圧縮ファイルを元に戻す', desc: 'gunzip で解凍してください。', expectedCmd: 'gunzip data.ext.gz', validator: (c) => /gunzip/.test(c.trim()), completedMsg: '元通り！', hint: 'gunzip', explanation: '解凍です。' },
    { id: 'i20', level: '中級', title: 'アーカイブファイルを作成する', desc: 'tarコマンドでファイルをまとめてください。', expectedCmd: 'tar -cvf backup.tar work/', validator: (c) => /tar\s+-cvf/.test(c.trim()), completedMsg: 'パック詰め完了。', hint: 'tar -cvf', explanation: '複数のファイルを一つに。' },
    { id: 'i21', level: '中級', title: 'アーカイブを現在の場所に展開する', desc: 'tarファイルをバラして中身を取り出してください。', expectedCmd: 'tar -xvf backup.tar', validator: (c) => /tar\s+-xvf/.test(c.trim()), completedMsg: '取り出し成功。', hint: 'tar -xvf', explanation: '展開作業です。' },
    { id: 'i22', level: '中級', title: '特定の文字列を除外して表示する', desc: 'grepの除外検索（-v）を使ってください。', expectedCmd: 'grep -v "error" log.txt', validator: (c) => /grep\s+-v/.test(c.trim()), completedMsg: 'ノイズが消えました。', hint: 'grep -v', explanation: '逆マッチです。' },
    { id: 'i23', level: '中級', title: 'ファイル内の重複行を一つにまとめる', desc: 'あらかじめソートされたファイルの重複を消してください。', expectedCmd: 'uniq data.txt', validator: (c) => /uniq/.test(c.trim()), completedMsg: 'スッキリしました。', hint: 'uniq', explanation: 'ユニークな行だけを取り出します。' },
    { id: 'i24', level: '中級', title: '指定した列のデータだけを抽出する', desc: 'awk を使って情報の1列目を抜き出してください。', expectedCmd: 'cat file.csv | awk \'{print $1}\'', validator: (c) => /awk/.test(c.trim()), completedMsg: '抜き出し成功。', hint: 'awk', explanation: 'テキスト処理の言語です。' },
    { id: 'i25', level: '中級', title: '文字列のパターンを置換する', desc: 'sed で「old」を「new」に変えて表示してください。', expectedCmd: 'echo old | sed "s/old/new/"', validator: (c) => /sed/.test(c.trim()), completedMsg: '化けましたね！', hint: 'sed', explanation: '流れる文字列を編集します。' },
    { id: 'i26', level: '中級', title: 'URLからデータが取得できるかテストする', desc: 'curl でレスポンスを表示してください。', expectedCmd: 'curl http://localhost', validator: (c) => /curl/.test(c.trim()), completedMsg: '返事が来ました。', hint: 'curl', explanation: 'Webリクエストです。' },
    { id: 'i27', level: '中級', title: '現在のジョブを一時中断する', desc: 'Ctrl+Z に相当する操作を意識してください。', expectedCmd: '^Z', validator: (c) => true, completedMsg: '停止しました。', hint: 'Ctrl+Z', explanation: '仕事を途中で待機させます。' },
    { id: 'i28', level: '中級', title: 'バックグラウンドで処理を再開させる', desc: 'bg コマンドを叩いてください。', expectedCmd: 'bg', validator: (c) => c.trim() === 'bg', completedMsg: '見えない所で動いています。', hint: 'bg', explanation: '背後でジョブを続けます。' },
    { id: 'i29', level: '中級', title: 'ジョブをフォアグラウンドに戻す', desc: 'fg コマンドで目の前に戻してください。', expectedCmd: 'fg', validator: (c) => c.trim() === 'fg', completedMsg: 'おかえり！', hint: 'fg', explanation: '目の前に持ってきます。' },
    { id: 'i30', level: '中級', title: '現在動いているジョブを知る', desc: 'jobs コマンドを実行してください。', expectedCmd: 'jobs', validator: (c) => c.trim() === 'jobs', completedMsg: 'リストアップ完了。', hint: 'jobs', explanation: '管理下の仕事一覧。' },
    { id: 'i31', level: '中級', title: 'サーバーの詳細なパスワード情報を確認する', desc: 'sudo chage -l user を試してください。', expectedCmd: 'sudo chage -l user', validator: (c) => /chage/.test(c.trim()), completedMsg: '有効期限がわかりました。', hint: 'chage', explanation: 'セキュリティ管理の一部。' },
    { id: 'i32', level: '中級', title: '自分の所属グループを表示する', desc: 'id コマンドでもっと詳しく見てみましょう。', expectedCmd: 'id', validator: (c) => c.trim() === 'id', completedMsg: '詳細な属性です。', hint: 'id', explanation: 'UID, GIDの全表示。' },
    { id: 'i33', level: '中級', title: 'エイリアスの設定を解除する', desc: 'unalias ll を実行してください。', expectedCmd: 'unalias ll', validator: (c) => /unalias/.test(c.trim()), completedMsg: '解除完了。', hint: 'unalias', explanation: '別名を消します。' },
    { id: 'i34', level: '中級', title: '新しい環境変数をエクスポートする', desc: 'export 変数名=値 を行ってください。', expectedCmd: 'export MY_VAL=100', validator: (c) => /export/.test(c.trim()), completedMsg: 'グローバル化。', hint: 'export', explanation: '環境全体へ。' },
    { id: 'i35', level: '中級', title: 'ファイルに内容を追記する', desc: '「>>」を使って書き足してください。', expectedCmd: 'echo "extra" >> file.txt', validator: (c) => />>/.test(c.trim()), completedMsg: '足されました。', hint: '>>', explanation: '末尾への追加。' },
    { id: 'i36', level: '中級', title: 'ファイルのinodeを確認する', desc: 'ls -i で番号を見てください。', expectedCmd: 'ls -i', validator: (c) => /ls\s+.*-i/.test(c.trim()), completedMsg: '識別番号です。', hint: 'ls -i', explanation: '物理的な位置を示すID。' },
    { id: 'i37', level: '中級', title: '出力の結果を変数に代入する', desc: 'NOW=$(date) を実行してください。', expectedCmd: 'NOW=$(date)', validator: (c) => /=\$\(date\)/.test(c.trim()), completedMsg: '記録されました。', hint: '$(command)', explanation: 'コマンドの結果を変数へ。' },
    { id: 'i38', level: '中級', title: '一時ファイルを安全に作る準備', desc: 'mktemp を打ってみてください。', expectedCmd: 'mktemp', validator: (c) => /mktemp/.test(c.trim()), completedMsg: '場所の予約です。', hint: 'mktemp', explanation: '衝突しない一時ファイル名。' },
    { id: 'i39', level: '中級', title: '別名実行を確認する', desc: '設定したエイリアスを使ってみてください。', expectedCmd: 'll', validator: (c) => c.trim() === 'll', completedMsg: '快調ですね。', hint: 'll', explanation: 'ショートカットの確認。' },
    { id: 'i40', level: '中級', title: 'パスワード変更手順を試す', desc: 'passwd を入力（実行までは不要）してください。', expectedCmd: 'passwd', validator: (c) => c.trim() === 'passwd', completedMsg: '確認完了。', hint: 'passwd', explanation: 'セキュリティ意識の向上。' },

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

    // --- エキスパート (24 tasks: e1 - e24) ---
    { id: 'e1', level: 'エキスパート', title: 'プロセスツリー', desc: 'プロセスを親子関係のツリー状で表示してください。', expectedCmd: 'ps auxf', validator: (c) => /ps\s+.*f/.test(c.trim()), completedMsg: '家系図。', hint: 'ps auxf' },
    { id: 'e2', level: 'エキスパート', title: '一括置換', desc: '現在のフォルダの全 .txt ファイル内の "old" を "new" に一括置換してください。', expectedCmd: "sed -i 's/old/new/g' *.txt", validator: (c) => /sed\s+-i/.test(c.trim()), completedMsg: '一網打尽。', hint: 'sed -i' },
    { id: 'e3', level: 'エキスパート', title: '容量ワースト', desc: 'ファイルサイズが大きい順にトップ5を表示してください。', expectedCmd: 'ls -lS | head -n 6', validator: (c) => /ls\s+.*S/.test(c.trim()), completedMsg: 'メタボ発見。', hint: 'ls -S' },
    { id: 'e4', level: 'エキスパート', title: '複雑な抽出', desc: '/etc/passwd からユーザー名だけを抽出して表示してください。', expectedCmd: "cut -d: -f1 /etc/passwd", validator: (c) => /cut\s+-d:/.test(c.trim()), completedMsg: '名簿作成。', hint: 'cut -d: -f1' },
    { id: 'e5', level: 'エキスパート', title: 'バックグラウンド再開', desc: 'バックグラウンドで停止しているジョブを、裏側のまま実行再開させてください。', expectedCmd: 'bg %1', validator: (c) => /bg\s+(%1|1)/.test(c.trim()), completedMsg: '裏仕事再開。', hint: 'bg' },
    { id: 'e6', level: 'エキスパート', title: 'ディスク監視', desc: 'ディスクI/Oの状況をリアルタイムで監視してください。', expectedCmd: 'iostat -x 1', validator: (c) => /iostat/.test(c.trim()), completedMsg: '心拍確認。', hint: 'iostat' },
    { id: 'e7', level: 'エキスパート', title: 'ネットワーク監視', desc: 'ネットワークインターフェースの統計情報をリアルタイムで表示してください。', expectedCmd: 'sar -n DEV 1', validator: (c) => /sar/.test(c.trim()), completedMsg: 'トラフィック。', hint: 'sar' },
    { id: 'e8', level: 'エキスパート', title: 'ゾンビプロセス', desc: 'システム内のゾンビプロセスを検索してください。', expectedCmd: "ps aux | grep 'Z'", validator: (c) => /ps\s+.*grep\s+['"]Z['"]/.test(c.trim()), completedMsg: '成仏。', hint: 'grep Z' },
    { id: 'e9', level: 'エキスパート', title: 'ファイル監視', desc: 'log.txt に追記される内容をリアルタイムで表示し続けてください。', expectedCmd: 'tail -f log.txt', validator: (c) => /tail\s+-f/.test(c.trim()), completedMsg: 'ログ監視員。', hint: 'tail -f' },
    { id: 'e10', level: 'エキスパート', title: 'ポートスキャン', desc: '自ホストのオープンしているTCPポートをスキャンしてください。', expectedCmd: 'nmap localhost', validator: (c) => /nmap/.test(c.trim()), completedMsg: 'セキュリティ診断。', hint: 'nmap' },
    { id: 'e11', level: 'エキスパート', title: 'ルート追跡', desc: 'google.com までのネットワーク経路を表示してください。', expectedCmd: 'traceroute google.com', validator: (c) => /traceroute/.test(c.trim()), completedMsg: '旅路。', hint: 'traceroute' },
    { id: 'e12', level: 'エキスパート', title: '巨大ファイル作成', desc: '1GBのダミーファイルを高速に作成してください。', expectedCmd: 'fallocate -l 1G large.file', validator: (c) => /fallocate/.test(c.trim()), completedMsg: '領域確保。', hint: 'fallocate' },
    { id: 'e13', level: 'エキスパート', title: 'バイナリ読込', desc: '実行ファイルの文字列（strings）を抽出して表示してください。', expectedCmd: 'strings /bin/ls', validator: (c) => /strings/.test(c.trim()), completedMsg: '解読。', hint: 'strings' },
    { id: 'e14', level: 'エキスパート', title: 'ファイルシステム', desc: '現在マウントされている全ファイルシステムのタイプ（ext4等）を表示してください。', expectedCmd: 'df -T', validator: (c) => /df\s+-T/.test(c.trim()), completedMsg: '形式確認。', hint: 'df -T' },
    { id: 'e15', level: 'エキスパート', title: 'シェル変更', desc: '自分のログインシェルを /bin/zsh に変更するコマンドは？', expectedCmd: 'chsh -s /bin/zsh', validator: (c) => /chsh/.test(c.trim()), completedMsg: '殻破り。', hint: 'chsh' },
    { id: 'e16', level: 'エキスパート', title: '時刻同期', desc: 'NTPサーバーから正確な時刻を取得し同期させてください。', expectedCmd: 'ntpdate pool.ntp.org', validator: (c) => /ntpdate/.test(c.trim()), completedMsg: '同期完了。', hint: 'ntpdate' },
    { id: 'e17', level: 'エキスパート', title: 'パケットキャプチャ', desc: 'ネットワークパケットのヘッダを表示してください。', expectedCmd: 'tcpdump -i eth0', validator: (c) => /tcpdump/.test(c.trim()), completedMsg: '盗聴中（合法）。', hint: 'tcpdump' },
    { id: 'e18', level: 'エキスパート', title: 'スクリプト実行', desc: 'カレントディレクトリの script.sh を現在のシェルで読み込んで実行してください。', expectedCmd: 'source ./script.sh', validator: (c) => /^(source|\.)\s+\.\/script\.sh/.test(c.trim()), completedMsg: '反映。', hint: 'source' },
    { id: 'e19', level: 'エキスパート', title: 'ファイル数制限', desc: '現在のシェルの最大オープンファイル数（ulimit）を確認してください。', expectedCmd: 'ulimit -n', validator: (c) => /ulimit\s+-n/.test(c.trim()), completedMsg: '限界確認。', hint: 'ulimit -n' },
    { id: 'e20', level: 'エキスパート', title: 'システムコール', desc: 'lsコマンドが発行するシステムコールを追跡してください。', expectedCmd: 'strace ls', validator: (c) => /strace/.test(c.trim()), completedMsg: '内部告発。', hint: 'strace' },
    { id: 'e21', level: 'エキスパート', title: 'ポート指定SSH', desc: '2222番ポートで待ち受けているサーバー 192.168.1.100 にログインしてください。', expectedCmd: 'ssh -p 2222 user@192.168.1.100', validator: (c) => /ssh\s+.*-p\s*2222/.test(c.trim()), completedMsg: 'ポート指定成功。', hint: '-p オプション' },
    { id: 'e22', level: 'エキスパート', title: 'ポートフォワード', desc: 'リモートサーバー(10.0.0.5)のMySQLポート(3306)を、ローカルの8888番ポートに転送してください。', expectedCmd: 'ssh -L 8888:localhost:3306 user@10.0.0.5', validator: (c) => /ssh\s+.*-L\s*8888:localhost:3306/.test(c.trim()), completedMsg: 'トンネル開通。', hint: '-L ローカルポート:リモートホスト:リモートポート' },
    { id: 'e23', level: 'エキスパート', title: '秘密鍵ログイン', desc: 'ホーム内の ~/.ssh/id_rsa を使って、192.168.1.50 にログインしてください。', expectedCmd: 'ssh -i ~/.ssh/id_rsa user@192.168.1.50', validator: (c) => /ssh\s+.*-i/.test(c.trim()), completedMsg: '鍵認証成功。', hint: '-i 秘密鍵パス' },
    { id: 'e24', level: 'エキスパート', title: '設定ファイル確認', desc: 'SSHのクライアント設定ファイル(~/.ssh/config)の内容を確認してください。', expectedCmd: 'cat ~/.ssh/config', validator: (c) => /cat\s+.*\.ssh\/config/.test(c.trim()), completedMsg: '構成確認。', hint: '~/.ssh/config' },
  ];

  return tasks;
};
