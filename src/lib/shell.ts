import { VirtualFileSystem } from './vfs';

export class Shell {
  vfs: VirtualFileSystem;
  currentDir: string = '/home/user';
  username: string = 'user';
  hostname: string = 'training';

  constructor(vfs: VirtualFileSystem) {
    this.vfs = vfs;
  }

  execute(commandLine: string): string {
    const cmd = commandLine.trim();
    if (!cmd) return '';
    
    // Simple parsing, respecting quotes
    const args = cmd.match(/("[^"]+"|'[^']+'|\S+)/g)?.map(arg => {
      if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
        return arg.slice(1, -1);
      }
      return arg;
    }) || [];

    if (args.length === 0) return '';
    const executable = args[0];

    try {
      switch (executable) {
        case 'pwd':
          return this.pwd();
        case 'cd':
          return this.cd(args[1]);
        case 'ls':
          return this.ls(args.slice(1));
        case 'cat':
          return this.cat(args.slice(1));
        case 'touch':
          return this.touch(args.slice(1));
        case 'mkdir':
          return this.mkdir(args.slice(1));
        case 'cp':
          return this.cp(args.slice(1));
        case 'mv':
          return this.mv(args.slice(1));
        case 'rm':
          return this.rm(args.slice(1));
        case 'rmdir':
          return this.rmdir(args.slice(1));
        case 'echo':
          return args.slice(1).join(' ');
        case 'clear':
          return '\x1b[2J\x1b[3J\x1b[H';
        case 'date':
          return new Date().toString();
        case 'cal':
          return '      May 2026\nSu Mo Tu We Th Fr Sa\n                1  2\n 3  4  5  6  7  8  9\n10 11 12 13 14 15 16\n17 18 19 20 21 22 23\n24 25 26 27 28 29 30\n31';
        case 'man':
          return this.man(args[1]);
        case 'ssh':
          return `ssh: connect to host ${args[args.length-1] || 'localhost'} port 22: Connection refused`;
        default:
          return `bash: ${executable}: command not found`;
      }
    } catch (err: any) {
      return `bash: ${executable}: ${err.message}`;
    }
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
    let targets: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('-') && arg.length > 1) {
        for (let i = 1; i < arg.length; i++) {
          const char = arg[i];
          if (char === 'a') showHidden = true;
          else if (char === 'l') listFormat = true;
          else return `ls: invalid option -- '${char}'\nTry 'ls --help' for more information.`;
        }
      } else {
        targets.push(arg);
      }
    }

    if (targets.length === 0) targets.push('.');

    let output: string[] = [];

    for (const target of targets) {
      const resolved = this.vfs.resolvePath(this.currentDir, target);
      const node = this.vfs.getNode(resolved);
      
      if (!node) {
        output.push(`ls: cannot access '${target}': No such file or directory`);
        continue;
      }

      if (node.type === 'file') {
         if (listFormat) {
            output.push(`${node.permissions} 1 ${node.owner} ${node.group} ${node.size} ${node.updatedAt.toDateString()} ${node.name}`);
         } else {
            output.push(node.name);
         }
         continue;
      }

      // Format directory contents
      const children = Object.values(node.children || {}).sort((a, b) => a.name.localeCompare(b.name));
      let items = children;
      if (!showHidden) {
          items = items.filter(n => !n.name.startsWith('.'));
      } else {
          // add . and ..
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
         // Just a simple space separated list
         output.push(items.map(n => isDir(n) ? `\x1b[1;34m${n.name}\x1b[0m` : n.name).join('  '));
      }
    }

    return output.join('\n');
  }

  cat(args: string[]): string {
    if (args.length === 0) return '';
    let output = [];
    for (const arg of args) {
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
    for (const arg of args) {
       if (arg.startsWith('-') && arg.length > 1) return `mkdir: invalid option -- '${arg[1]}'`;
       const resolved = this.vfs.resolvePath(this.currentDir, arg);
       if (!this.vfs.mkdir(resolved)) {
           output.push(`mkdir: cannot create directory '${arg}': File exists or no permission`);
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
