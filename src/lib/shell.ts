import { VirtualFileSystem } from './vfs';

export class Shell {
  vfs: VirtualFileSystem;
  currentDir: string = '/home/user';
  username: string = 'user';
  hostname: string = 'training';
  sshSession: { user: string; host: string } | null = null;

  constructor(vfs: VirtualFileSystem) {
    this.vfs = vfs;
  }

  execute(commandLine: string): string {
    // Robust split for pipes (including full-width Japanese pipe)
    // Robust split for pipes, respecting quotes
    const pipes: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < commandLine.length; i++) {
        const char = commandLine[i];
        if ((char === '"' || char === "'") && (i === 0 || commandLine[i-1] !== '\\')) {
            if (!inQuote) {
                inQuote = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuote = false;
            }
            current += char;
        } else if ((char === '|' || char === '｜') && !inQuote) {
            pipes.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    pipes.push(current.trim());

    let lastOutput = '';
    for (const pipe of pipes) {
      if (!pipe) continue;
      lastOutput = this.executeSingle(pipe, lastOutput);
    }
    return lastOutput;
  }

  executeSingle(commandLine: string, stdin?: string): string {
    let cmd = commandLine.trim();
    if (!cmd) return '';
    
    // Handle redirection (simple check, doesn't handle quotes yet, but better than before)
    let redirectTarget: string | null = null;
    let append = false;

    // We should search for > or >> outside of quotes
    let redirectIdx = -1;
    let inQuote = false;
    let quoteChar = '';
    for (let i = 0; i < cmd.length; i++) {
        const char = cmd[i];
        if ((char === '"' || char === "'") && (i === 0 || cmd[i-1] !== '\\')) {
            if (!inQuote) { inQuote = true; quoteChar = char; }
            else if (char === quoteChar) inQuote = false;
        } else if (char === '>' && !inQuote) {
            redirectIdx = i;
            if (cmd[i+1] === '>') {
                append = true;
            }
            break;
        }
    }

    if (redirectIdx !== -1) {
        redirectTarget = cmd.substring(redirectIdx + (append ? 2 : 1)).trim();
        cmd = cmd.substring(0, redirectIdx).trim();
    }

    // Simple parsing, respecting quotes
    const args = cmd.match(/("[^"]+"|'[^']+'|\S+)/g)?.map(arg => {
      if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
        return arg.slice(1, -1);
      }
      return arg;
    }) || [];

    if (args.length === 0) return '';
    const executable = args[0];
    let result = '';

    try {
      switch (executable) {
        case 'pwd':
          result = this.pwd();
          break;
        case 'cd':
          result = this.cd(args[1]);
          break;
        case 'ls':
          result = this.ls(args.slice(1));
          break;
        case 'cat':
          result = this.cat(args.slice(1), stdin);
          break;
        case 'touch':
          result = this.touch(args.slice(1));
          break;
        case 'mkdir':
          result = this.mkdir(args.slice(1));
          break;
        case 'cp':
          result = this.cp(args.slice(1));
          break;
        case 'mv':
          result = this.mv(args.slice(1));
          break;
        case 'rm':
          result = this.rm(args.slice(1));
          break;
        case 'rmdir':
          result = this.rmdir(args.slice(1));
          break;
        case 'chmod':
          result = this.chmod(args.slice(1));
          break;
        case 'chown':
          result = `chown: ${args[1]}: Operation not permitted`;
          break;
        case 'grep':
          result = this.grep(args.slice(1), stdin);
          break;
        case 'wc':
          result = this.wc(args.slice(1), stdin);
          break;
        case 'head':
          result = this.head(args.slice(1), stdin);
          break;
        case 'tail':
          result = this.tail(args.slice(1), stdin);
          break;
        case 'sort':
          result = this.sort(args.slice(1), stdin);
          break;
        case 'uniq':
          result = this.uniq(args.slice(1), stdin);
          break;
        case 'sed':
          result = this.sed(args.slice(1), stdin);
          break;
        case 'awk':
          result = this.awk(args.slice(1), stdin);
          break;
        case 'cut':
          result = this.cut(args.slice(1), stdin);
          break;
        case 'tr':
          result = this.tr(args.slice(1), stdin);
          break;
        case 'find':
          result = this.find(args.slice(1));
          break;
        case 'which':
          result = args[1] ? `/usr/bin/${args[1]}` : '';
          break;
        case 'env':
          result = 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\nUSER=user\nSHELL=/bin/bash\nLANG=en_US.UTF-8';
          break;
        case 'ping':
          result = `PING ${args[1] || 'google.com'} (142.250.190.46) 56(84) bytes of data.\n64 bytes from 142.250.190.46: icmp_seq=1 ttl=117 time=15.2 ms\n64 bytes from 142.250.190.46: icmp_seq=2 ttl=117 time=14.8 ms\n^C\n--- ${args[1] || 'google.com'} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss, time 1001ms`;
          break;
        case 'curl':
          result = `HTTP/1.1 200 OK\nContent-Type: text/html\nContent-Length: 156\n\n<html>\n<head><title>Welcome</title></head>\n<body>\n<h1>Hello from the simulated web!</h1>\n</body>\n</html>`;
          break;
        case 'systemctl':
          result = 'UNIT                                LOAD   ACTIVE SUB     DESCRIPTION\nssh.service                         loaded active running OpenBSD Secure Shell server\ncron.service                        loaded active running Regular background program processing daemon\nsystemd-journald.service            loaded active running Journal Service';
          break;
        case 'ip':
          if (args[1] === 'a' || args[1] === 'addr') result = '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet 127.0.0.1/8 scope host lo\n       valid_lft forever preferred_lft forever\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000\n    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff\n    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0\n       valid_lft forever preferred_lft forever';
          else result = 'Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }';
          break;
        case 'ps':
          result = this.ps(args.slice(1));
          break;
        case 'top':
          result = this.top();
          break;
        case 'whoami':
          result = this.username;
          break;
        case 'uname':
          result = args.includes('-a') ? 'Linux training 5.15.0-x86_64 #1 SMP x86_64 GNU/Linux' : 'Linux';
          break;
        case 'hostname':
          result = this.hostname;
          break;
        case 'id':
          result = 'uid=1000(user) gid=1000(user) groups=1000(user),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),116(lxd)';
          break;
        case 'who':
        case 'w':
          result = this.who();
          break;
        case 'df':
          result = 'Filesystem     1K-blocks      Used Available Use% Mounted on\n/dev/sda1       41251136  12485124  26650428  32% /';
          break;
        case 'free':
          result = '              total        used        free      shared  buff/cache   available\nMem:        8165236     2145812     4125812      124812     1893612     5612841\nSwap:       2097148           0     2097148';
          break;
        case 'echo':
          result = args.slice(1).join(' ');
          break;
        case 'uptime':
          result = ' 10:25:31 up 42 days, 14:21,  1 user,  load average: 0.08, 0.05, 0.01';
          break;
        case 'history':
          result = '    1  ls\n    2  cd /var/log\n    3  cat auth.log\n    4  top\n    5  whoami';
          break;
        case 'strace':
          result = `execve("/usr/bin/ls", ["ls"], 0x7ffd...) = 0\nbrk(NULL) = 0x55d...\naccess("/etc/ld.so.preload", R_OK) = -1 ENOENT (No such file or directory)\nopenat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3\nfstat(3, {st_mode=S_IFREG|0644, st_size=32481, ...}) = 0\n...`;
          break;
        case 'nmap':
          result = `Starting Nmap 7.80 ( https://nmap.org ) at 2026-05-12 10:30 JST\nNmap scan report for localhost (127.0.0.1)\nHost is up (0.000041s latency).\nNot shown: 998 closed ports\nPORT    STATE SERVICE\n22/tcp  open  ssh\n80/tcp  open  http\n\nNmap done: 1 IP address (1 host up) scanned in 0.05 seconds`;
          break;
        case 'traceroute':
          result = `traceroute to google.com (142.250.190.46), 30 hops max, 60 byte packets\n 1  172.17.0.1 (172.17.0.1)  0.031 ms  0.010 ms  0.009 ms\n 2  10.0.0.1 (10.0.0.1)  0.254 ms  0.221 ms  0.210 ms\n 3  * * *\n 4  142.250.190.46 (142.250.190.46)  15.2 ms  15.1 ms  15.0 ms`;
          break;
        case 'tcpdump':
          result = `tcpdump: verbose output suppressed, use -v or -vv for full protocol decode\nlistening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes\n10:35:01.123456 IP training.54321 > google.80: Flags [S], seq 123456789, win 64240, options [mss 1460], length 0\n10:35:01.124567 IP google.80 > training.54321: Flags [S.], seq 987654321, ack 123456790, win 65535, options [mss 1460], length 0`;
          break;
        case 'ulimit':
          if (args.includes('-n')) result = '1024';
          else result = 'unlimited';
          break;
        case 'chsh':
          result = `Changing shell for ${this.username}.\nPassword: \nShell changed.`;
          break;
        case 'ntpdate':
          result = '12 May 10:36:01 ntpdate[1589]: adjust time server 162.159.200.1 offset -0.001245 sec';
          break;
        case 'iostat':
          result = 'Linux 5.15.0-x86_64 (training) \t05/12/26 \t_x86_64_\t(2 CPU)\n\navg-cpu:  %user   %nice %system %iowait  %steal   %idle\n           0.50    0.00    1.20    0.05    0.00   98.25\n\nDevice             tps    kB_read/s    kB_wrtn/s    kB_read    kB_wrtn\nsda               2.50        45.20        12.50    2451240     654120';
          break;
        case 'sar':
          result = '10:37:01 AM     IFACE   rxpck/s   txpck/s    rxkB/s    txkB/s   rxcmp/s   txcmp/s  rxmcst/s   %ifutil\n10:37:02 AM        lo      2.00      2.00      0.15      0.15      0.00      0.00      0.00      0.00\n10:37:02 AM      eth0     15.00     12.00      2.45      1.80      0.00      0.00      0.00      0.01';
          break;
        case 'fallocate':
          result = '';
          break;
        case 'strings':
          result = '/lib64/ld-linux-x86-64.so.2\n__libc_start_main\nGLIBC_2.2.5\n...';
          break;
        case 'source':
        case '.':
          result = '';
          break;
        case 'bg':
          result = '[1]+ ls &';
          break;
        case 'fg':
          result = 'ls';
          break;
        case 'jobs':
          result = '[1]+  Stopped                 ls';
          break;
        case 'kill':
          result = '';
          break;
        case 'clear':
          result = '\x1b[2J\x1b[3J\x1b[H';
          break;
        case 'date':
          result = new Date().toString();
          break;
        case 'cal':
          result = '      May 2026\nSu Mo Tu We Th Fr Sa\n                1  2\n 3  4  5  6  7  8  9\n10 11 12 13 14 15 16\n17 18 19 20 21 22 23\n24 25 26 27 28 29 30\n31';
          break;
        case 'man':
          result = this.man(args[1]);
          break;
        case 'ssh':
          const isL = args.includes('-L');
          const isI = args.includes('-i');
          const pIdx = args.indexOf('-p');
          const port = pIdx !== -1 ? args[pIdx + 1] : '22';
          const targetArg = args[args.length - 1] || 'localhost';
          
          let user = 'user';
          let host = targetArg;
          if (targetArg.includes('@')) {
             const parts = targetArg.split('@');
             user = parts[0];
             host = parts[1];
          }

          if (isL) {
             return `Forwarding port from localhost to ${host}... Connected.`;
          }

          // If it's a valid remote host (simulated)
          const isRemote = host.includes('.') || host !== 'localhost';

          if (isI) {
             const keyFile = args[args.indexOf('-i') + 1];
             if (isRemote) {
                this.sshSession = { user, host };
                return `auth: using key file ${keyFile}\nWelcome to ${host}! (SSH session started)`;
             }
             return `auth: using key file ${keyFile}\nWelcome to ${host}!`;
          }
          if (port !== '22') {
             if (isRemote || port === '2222') {
                this.sshSession = { user, host };
                return `Connected to ${host} on port ${port}.\nWelcome to ${host}! (SSH session started)`;
             }
             return `Connected to ${host} on port ${port}.`;
          }
          if (isRemote && !targetArg.includes('localhost')) {
             this.sshSession = { user, host };
             return `Welcome to ${host}! (SSH session started)`;
          }
          return `ssh: connect to host ${targetArg} port 22: Connection refused`;
        case 'sudo':
          if (args[1] === 'su' || args[1] === 'bash' || args[1] === 'sh') {
             result = 'root@training:~# ';
          } else {
             result = `[sudo] password for ${this.username}: `;
          }
          break;
        default:
          result = `bash: ${executable}: command not found`;
          break;
      }
    } catch (err: any) {
      result = `bash: ${executable}: ${err.message}`;
    }

    if (redirectTarget) {
        const resolved = this.vfs.resolvePath(this.currentDir, redirectTarget);
        if (append) {
            this.vfs.appendFile(resolved, result);
        } else {
            this.vfs.writeFile(resolved, result);
        }
        return '';
    }
    return result;
  }

  chmod(args: string[]): string {
    if (args.length < 2) return "chmod: missing operand";
    const mode = args[0];
    const target = args[1];
    const resolved = this.vfs.resolvePath(this.currentDir, target);
    const node = this.vfs.getNode(resolved);
    if (!node) return `chmod: cannot access '${target}': No such file or directory`;
    
    // Simple mock octal update
    let permStr = '----------';
    if (mode === '777') permStr = 'drwxrwxrwx';
    else if (mode === '755') permStr = 'drwxr-xr-x';
    else if (mode === '644') permStr = '-rw-r--r--';
    else if (mode === '600') permStr = '-rw-------';
    else if (mode === '444') permStr = '-r--r--r--';
    
    node.permissions = permStr;
    return "";
  }

  grep(args: string[], stdin?: string): string {
    if (args.length === 0) return "Usage: grep [PATTERN] [FILE]";
    const pattern = args[0];
    let content = '';
    
    if (args.length === 1) {
      content = stdin || '';
    } else {
      const target = args[1];
      const resolved = this.vfs.resolvePath(this.currentDir, target);
      const fileContent = this.vfs.readFile(resolved);
      if (fileContent === null) return `grep: ${target}: No such file or directory`;
      content = fileContent;
    }
    
    return content.split('\n').filter(line => line.includes(pattern)).join('\n');
  }

  wc(args: string[], stdin?: string): string {
    let content = '';
    if (args.length === 0 || (args.length === 1 && args[0].startsWith('-'))) {
      content = stdin || '';
    } else {
      const target = args[args.length - 1];
      const resolved = this.vfs.resolvePath(this.currentDir, target);
      content = this.vfs.readFile(resolved) || '';
    }

    const lines = content === '' ? 0 : content.split('\n').length;
    const words = content.split(/\s+/).filter(w => w !== '').length;
    const chars = content.length;

    if (args.includes('-l')) return lines.toString();
    if (args.includes('-w')) return words.toString();
    if (args.includes('-c')) return chars.toString();
    return ` ${lines}  ${words} ${chars}`;
  }

  head(args: string[], stdin?: string): string {
    let n = 10;
    let content = '';
    const nIndex = args.indexOf('-n');
    if (nIndex !== -1 && args[nIndex + 1]) {
       n = parseInt(args[nIndex + 1]);
    }

    if (args.length === 0 || (args.length === 2 && nIndex !== -1)) {
        content = stdin || '';
    } else {
        const target = args[args.length - 1];
        const resolved = this.vfs.resolvePath(this.currentDir, target);
        content = this.vfs.readFile(resolved) || '';
    }
    return content.split('\n').slice(0, n).join('\n');
  }

  tail(args: string[], stdin?: string): string {
    let n = 10;
    let content = '';
    const nIndex = args.indexOf('-n');
    if (nIndex !== -1 && args[nIndex + 1]) {
       n = parseInt(args[nIndex + 1]);
    }

    if (args.length === 0 || (args.length === 2 && nIndex !== -1)) {
        content = stdin || '';
    } else {
        const target = args[args.length - 1];
        const resolved = this.vfs.resolvePath(this.currentDir, target);
        content = this.vfs.readFile(resolved) || '';
    }
    const lines = content.split('\n');
    return lines.slice(Math.max(0, lines.length - n)).join('\n');
  }

  sort(args: string[], stdin?: string): string {
     let content = (args.length === 0 ? stdin : this.vfs.readFile(this.vfs.resolvePath(this.currentDir, args[0]))) || '';
     return content.split('\n').sort().join('\n');
  }

  uniq(args: string[], stdin?: string): string {
     let content = (args.length === 0 ? stdin : this.vfs.readFile(this.vfs.resolvePath(this.currentDir, args[0]))) || '';
     const lines = content.split('\n');
     if (lines.length === 0) return '';
     const result = [lines[0]];
     for (let i = 1; i < lines.length; i++) {
        if (lines[i] !== lines[i-1]) result.push(lines[i]);
     }
     return result.join('\n');
  }

  sed(args: string[], stdin?: string): string {
     if (args.length < 1) return "sed: missing expression";
     const expr = args[0];
     let content = (args.length === 1 ? stdin : this.vfs.readFile(this.vfs.resolvePath(this.currentDir, args[1]))) || '';
     
     const match = expr.match(/^s\/(.*)\/(.*)\/g?$/);
     if (match) {
        const pattern = match[1];
        const replacement = match[2];
        return content.split('\n').map(line => line.replace(new RegExp(pattern, 'g'), replacement)).join('\n');
     }
     return content;
  }

  awk(args: string[], stdin?: string): string {
     if (args.length < 1) return "awk: missing expression";
     const expr = args[0];
     let content = (args.length === 1 ? stdin : this.vfs.readFile(this.vfs.resolvePath(this.currentDir, args[1]))) || '';
     
     const match = expr.match(/\{print\s+\$(\d+)\}/);
     if (match) {
        const col = parseInt(match[1]) - 1;
        return content.split('\n').map(line => line.split(/\s+/)[col] || '').join('\n');
     }
     return content;
  }

  cut(args: string[], stdin?: string): string {
    let d = '\t';
    let f: number[] = [];
    const dIdx = args.indexOf('-d');
    if (dIdx !== -1 && args[dIdx + 1]) d = args[dIdx + 1];
    const fIdx = args.indexOf('-f');
    if (fIdx !== -1 && args[fIdx + 1]) {
        f = args[fIdx+1].split(',').map(n => parseInt(n) - 1);
    }
    let content = (args.length <= 2 ? stdin : this.vfs.readFile(this.vfs.resolvePath(this.currentDir, args[args.length-1]))) || '';
    if (!content && stdin) content = stdin;

    return content.split('\n').map(line => {
        const parts = line.split(d);
        if (f.length > 0) return f.map(idx => parts[idx] || '').join(d);
        return line;
    }).join('\n');
  }

  tr(args: string[], stdin?: string): string {
    if (args.length < 2) return "tr: missing operand";
    const set1 = args[0];
    const set2 = args[1];
    const content = stdin || '';
    let result = '';
    for (const char of content) {
        const idx = set1.indexOf(char);
        if (idx !== -1 && set2[idx]) result += set2[idx];
        else result += char;
    }
    return result;
  }

  ps(args: string[]): string {
    return '  PID TTY          TIME CMD\n 1245 pts/0    00:00:00 bash\n 1563 pts/0    00:00:00 ps';
  }

  who(): string {
     return 'user     pts/0        2026-05-12 10:00 (192.168.1.50)';
  }

  top(): string {
    return `top - 10:26:05 up 42 days, 14:22,  1 user,  load average: 0.05, 0.04, 0.01
Tasks: 125 total,   1 running, 124 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.3 us,  0.7 sy,  0.0 ni, 99.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   7973.9 total,   4029.1 free,   2095.5 used,   1849.2 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   5480.9 avail Mem 

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 1568 user      20   0   12456   3560   2800 R   0.7   0.0   0:00.05 top
    1 root      20   0  168344  12480   8560 S   0.0   0.2   0:15.24 systemd
  452 root      20   0   45612   5600   4500 S   0.0   0.1   0:02.15 systemd-journal
 1245 user      20   0   18560   5240   3400 S   0.0   0.1   0:00.28 bash`;
  }

  pwd(): string {
    return this.currentDir;
  }

  cd(arg?: string): string {
    if (arg?.startsWith('-') && arg.length > 1) {
        return `bash: cd: ${arg.slice(0, 2)}: invalid option\ncd: usage: cd [-L|[-P [-e]] [-@]] [dir]`;
    }
    const target = arg || '~';
    const resolved = this.vfs.resolvePath(this.currentDir, target);
    const node = this.vfs.getNode(resolved);
    if (!node) return `bash: cd: ${target}: No such file or directory`;
    if (node.type !== 'dir') return `bash: cd: ${target}: Not a directory`;
    this.currentDir = resolved;
    return '';
  }

  ls(args: string[]): string {
    let showHidden = false;
    let listFormat = false;
    let recursive = false;
    let sortBySize = false;
    let targets: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('-') && arg.length > 1) {
        for (let i = 1; i < arg.length; i++) {
          const char = arg[i];
          if (char === 'a') showHidden = true;
          else if (char === 'l') listFormat = true;
          else if (char === 'R') recursive = true;
          else if (char === 'S') sortBySize = true;
          else return `ls: invalid option -- '${char}'\nTry 'ls --help' for more information.`;
        }
      } else {
        targets.push(arg);
      }
    }

    if (targets.length === 0) targets.push('.');

    let output: string[] = [];

    const formatDir = (path: string, isTopLevel: boolean = false) => {
      const resolved = this.vfs.resolvePath(this.currentDir, path);
      const node = this.vfs.getNode(resolved);
      
      if (!node) {
        output.push(`ls: cannot access '${path}': No such file or directory`);
        return;
      }

      if (node.type === 'file') {
         if (listFormat) {
            output.push(`${node.permissions} 1 ${node.owner} ${node.group} ${node.size} ${node.updatedAt.toDateString()} ${node.name}`);
         } else {
            output.push(node.name);
         }
         return;
      }

      if (recursive && !isTopLevel) {
          output.push(`\n${path}:`);
      }

      let children = Object.values(node.children || {}).sort((a, b) => a.name.localeCompare(b.name));
      if (sortBySize) {
          children = [...children].sort((a, b) => b.size - a.size);
      }
      let items = children;
      if (!showHidden) {
          items = items.filter(n => !n.name.startsWith('.'));
      } else {
          const dot = { ...node, name: '.' };
          const dotdot = this.vfs.getNode(this.vfs.resolvePath(resolved, '..')) || this.vfs.root;
          const dotdotClone = { ...dotdot, name: '..' };
          items = [dot, dotdotClone, ...items] as any;
      }

      if (listFormat) {
          let total = 0;
          let lsLines: string[] = [];
          for (const item of items) {
             lsLines.push(`${item.permissions} ${item.type === 'dir' ? 2 : 1} ${item.owner} ${item.group} ${item.size} ${item.updatedAt.toLocaleString('en-US',{month:'short', day:'2-digit'})} ${item.updatedAt.getHours().toString().padStart(2,'0')}:${item.updatedAt.getMinutes().toString().padStart(2,'0')} ${item.name}`);
             total += Math.ceil(item.size / 4096) * 4;
          }
          output.push(`total ${total}\ntotal items\n` + lsLines.join('\n'));
      } else {
         const isDir = (n: any) => n.type === 'dir';
         output.push(items.map(n => isDir(n) ? `\x1b[1;34m${n.name}\x1b[0m` : n.name).join('  '));
      }

      if (recursive) {
          for (const item of children) {
              if (item.type === 'dir') {
                  formatDir(this.vfs.resolvePath(path, item.name));
              }
          }
      }
    };

    for (const target of targets) {
      formatDir(target, true);
    }

    return output.join('\n');
  }

  find(args: string[]): string {
      const results: string[] = [];
      const traverse = (path: string) => {
          const node = this.vfs.getNode(path);
          if (!node) return;
          results.push(path.replace('//', '/'));
          if (node.type === 'dir' && node.children) {
              for (const child of Object.values(node.children)) {
                  traverse(this.vfs.resolvePath(path, child.name));
              }
          }
      };
      const startDir = args[0] || '.';
      traverse(this.vfs.resolvePath(this.currentDir, startDir));
      return results.join('\n');
  }

  cat(args: string[], stdin?: string): string {
    if (args.length === 0) return stdin || '';
    let output = [];
    for (const arg of args) {
       if (arg === '-') {
           output.push(stdin || '');
           continue;
       }
       if (arg.startsWith('-') && arg.length > 1) return `cat: invalid option -- '${arg[1]}'`;
       const resolved = this.vfs.resolvePath(this.currentDir, arg);
       const content = this.vfs.readFile(resolved);
       if (content === null) {
           const node = this.vfs.getNode(resolved);
           if (node && node.type === 'dir') output.push(`cat: ${arg}: Is a directory`);
           else output.push(`cat: ${arg}: No such file or directory`);
       } else {
           output.push(content);
       }
    }
    return output.join('\n');
  }

  touch(args: string[]): string {
    if (args.length === 0) return "touch: missing file operand";
    let output = [];
    for (const arg of args) {
       if (arg.startsWith('-') && arg.length > 1) return `touch: invalid option -- '${arg[1]}'`;
       const resolved = this.vfs.resolvePath(this.currentDir, arg);
       if (!this.vfs.touch(resolved)) {
           output.push(`touch: cannot touch '${arg}': No such file or directory`);
       }
    }
    return output.join('\n');
  }

  mkdir(args: string[]): string {
    if (args.length === 0) return "mkdir: missing operand";
    let output = [];
    let pMode = false;
    let targets = [];
    for (const arg of args) {
       if (arg.startsWith('-') && arg.length > 1) {
           if (arg.includes('p')) pMode = true;
           else return `mkdir: invalid option -- '${arg[1]}'`;
       } else {
           targets.push(arg);
       }
    }
    for (const arg of targets) {
       const resolved = this.vfs.resolvePath(this.currentDir, arg);
       if (pMode) {
           const parts = resolved.split('/').filter(p => p);
           let current = '/';
           for (const part of parts) {
               current += part + '/';
               if (!this.vfs.getNode(current)) {
                   this.vfs.mkdir(current);
               }
           }
       } else {
           if (!this.vfs.mkdir(resolved)) {
               output.push(`mkdir: cannot create directory '${arg}': File exists or no permission`);
           }
       }
    }
    return output.join('\n');
  }

  cp(args: string[]): string {
    let targets = [];
    for (const arg of args) {
       if (arg.startsWith('-') && arg.length > 1) return `cp: invalid option -- '${arg[1]}'`;
       targets.push(arg);
    }
    if (targets.length < 2) return "cp: missing file operand";
    const src = targets[0];
    const dest = targets[1];
    const srcResolved = this.vfs.resolvePath(this.currentDir, src);
    const destResolved = this.vfs.resolvePath(this.currentDir, dest);
    if (!this.vfs.cp(srcResolved, destResolved)) {
        return `cp: cannot stat '${src}': No such file or directory`;
    }
    return "";
  }

  mv(args: string[]): string {
    let targets = [];
    for (const arg of args) {
       if (arg.startsWith('-') && arg.length > 1) return `mv: invalid option -- '${arg[1]}'`;
       targets.push(arg);
    }
    if (targets.length < 2) return "mv: missing file operand";
    const src = targets[0];
    const dest = targets[1];
    const srcResolved = this.vfs.resolvePath(this.currentDir, src);
    const destResolved = this.vfs.resolvePath(this.currentDir, dest);
    if (!this.vfs.mv(srcResolved, destResolved)) {
        return `mv: cannot stat '${src}': No such file or directory`;
    }
    return "";
  }

  rm(args: string[]): string {
    if (args.length === 0) return "rm: missing operand";
    let output = [];
    let recursive = false;
    let targets = [];
    for (const arg of args) {
       if (arg.startsWith('-') && arg.length > 1) {
           for (let i = 1; i < arg.length; i++) {
               const char = arg[i];
               if (char === 'r' || char === 'R') recursive = true;
               else return `rm: invalid option -- '${char}'`;
           }
       } else {
           targets.push(arg);
       }
    }
    if (targets.length === 0) return "rm: missing operand";
    for (const arg of targets) {
       const resolved = this.vfs.resolvePath(this.currentDir, arg);
       const node = this.vfs.getNode(resolved);
       if (!node) {
           output.push(`rm: cannot remove '${arg}': No such file or directory`);
       } else if (node.type === 'dir' && !recursive) {
           output.push(`rm: cannot remove '${arg}': Is a directory`);
       } else {
           if (!this.vfs.rm(resolved, recursive)) {
               output.push(`rm: cannot remove '${arg}': Permission denied or not empty`);
           }
       }
    }
    return output.join('\n');
  }

  rmdir(args: string[]): string {
    if (args.length === 0) return "rmdir: missing operand";
    let output = [];
    for (const arg of args) {
       if (arg.startsWith('-') && arg.length > 1) return `rmdir: invalid option -- '${arg[1]}'`;
       const resolved = this.vfs.resolvePath(this.currentDir, arg);
       const node = this.vfs.getNode(resolved);
       if (!node) {
           output.push(`rmdir: failed to remove '${arg}': No such file or directory`);
       } else if (node.type !== 'dir') {
           output.push(`rmdir: failed to remove '${arg}': Not a directory`);
       } else {
           if (!this.vfs.rm(resolved, false)) {
               output.push(`rmdir: failed to remove '${arg}': Directory not empty`);
           }
       }
    }
    return output.join('\n');
  }

  man(arg: string): string {
    if (!arg) return "What manual page do you want?";
    return `${arg}(1) User Commands ${arg}(1)\nNAME\n       ${arg} - manual for ${arg}\nDESCRIPTION\n       This is a simulated manual page for ${arg}.`;
  }
}
