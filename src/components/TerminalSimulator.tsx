import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';
import { VirtualFileSystem } from '../lib/vfs';
import { Shell } from '../lib/shell';

export interface ConnectConfig {
  type: 'ssh' | 'serial';
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  privateKey?: string;
  baudRate?: number;
  encoding?: string;
  forwardRules?: ForwardRule[];
}

export interface ForwardRule {
  type: 'local' | 'remote';
  listenPort: number;
  targetHost: string;
  targetPort: number;
}

import { TrainingTask } from '../tasks';

export interface TerminalProps {
  config: ConnectConfig | null;
  onDisconnect: () => void;
  onCommandExecuted?: (cmd: string, isValid?: boolean) => void;
  pendingPaste?: string | null;
  onPasteExecuted?: () => void;
  pasteDelay?: { char: number; line: number };
  onDataReceived?: (data: string) => void;
  onRequestPasteDelay?: (text: string) => void;
  pendingUploadFiles?: File[] | null;
  onUploadExecuted?: () => void;
  copyTrigger?: number;
  currentTask?: TrainingTask;
}

export default function TerminalSimulator({ config, onDisconnect, onCommandExecuted, pendingPaste, onPasteExecuted, pasteDelay, onDataReceived, onRequestPasteDelay, pendingUploadFiles, onUploadExecuted, copyTrigger, currentTask }: TerminalProps) {

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const serialPortRef = useRef<any>(null);
  const serialWriterRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);

  const vfsRef = useRef(new VirtualFileSystem());
  const shellRef = useRef(new Shell(vfsRef.current));

  const [status, setStatus] = useState<string>('Disconnected');
  const history = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);

  const pasteParamsRef = useRef({ pasteDelay, onRequestPasteDelay });
  useEffect(() => {
    pasteParamsRef.current = { pasteDelay, onRequestPasteDelay };
  }, [pasteDelay, onRequestPasteDelay]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      fontSize: 13,
      theme: {
        background: '#0c0c0c',
        foreground: '#cccccc',
        cursor: '#4a9eff',
        selectionBackground: 'rgba(74, 158, 255, 0.3)',
      }
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    setTimeout(() => {
        if (terminalRef.current && xtermRef.current) {
            try {
                if (!xtermRef.current.element) {
                    xtermRef.current.open(terminalRef.current);
                }
                fitAddon.fit();
            } catch (e) {
                console.error("Fit error", e);
            }
        }
    }, 200);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      fitAddon.fit();
      if (socketRef.current && config?.type === 'ssh') {
        socketRef.current.emit('ssh-resize', { cols: term.cols, rows: term.rows });
      }
    };
    window.addEventListener('resize', handleResize);

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      
      const files = Array.from(e.dataTransfer?.files || []);
      for (const file of files) {
        term.writeln(`\r\n\x1b[36m[SFTP] Starting upload for ${file.name} (${Math.round(file.size/1024)} KB)...\x1b[0m`);
        setTimeout(() => {
           term.writeln(`\x1b[32m[SFTP] Upload complete: ${file.name}\x1b[0m\r\n`);
           term.write('\x1b[35mOpkix@Terminal\x1b[0m:\x1b[34m~\x1b[0m$ ');
        }, 500);
      }
    };

    terminalRef.current?.addEventListener('dragover', handleDragOver);
    terminalRef.current?.addEventListener('drop', handleDrop);

    const handlePasteEvent = (e: ClipboardEvent) => {
      const { pasteDelay, onRequestPasteDelay } = pasteParamsRef.current;
      if (pasteDelay && (pasteDelay.char > 0 || pasteDelay.line > 0)) {
        const text = e.clipboardData?.getData('text/plain');
        if (text) {
          e.preventDefault();
          if (onRequestPasteDelay) onRequestPasteDelay(text);
        }
      }
    };
    terminalRef.current?.addEventListener('paste', handlePasteEvent);

    return () => {
      terminalRef.current?.removeEventListener('dragover', handleDragOver);
      terminalRef.current?.removeEventListener('drop', handleDrop);
      terminalRef.current?.removeEventListener('paste', handlePasteEvent);
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  const writeToServer = useCallback((data: string) => {
    if (config?.type === 'ssh' && socketRef.current) {
      socketRef.current.emit('ssh-data', data);
    } else if (config?.type === 'serial' && serialWriterRef.current) {
      serialWriterRef.current.write(new TextEncoder().encode(data));
    }
  }, [config]);

  useEffect(() => {
    if (copyTrigger && copyTrigger > 0) {
      const sel = xtermRef.current?.getSelection();
      if (sel) {
        navigator.clipboard.writeText(sel).catch(()=>{});
        xtermRef.current?.clearSelection();
      }
    }
  }, [copyTrigger]);

  useEffect(() => {
    if (pendingUploadFiles && pendingUploadFiles.length > 0) {
        const term = xtermRef.current;
        const uploadFiles = async () => {
            for (const file of pendingUploadFiles) {
                term?.writeln(`\r\n\x1b[36m[SFTP] Starting upload for ${file.name} (${Math.round(file.size/1024)} KB)...\x1b[0m`);
                await new Promise(res => setTimeout(res, 500));
                term?.writeln(`\x1b[32m[SFTP] Upload complete: ${file.name}\x1b[0m\r\n`);
                term?.write('\x1b[35mOplix@Terminal\x1b[0m:\x1b[34m~\x1b[0m$ ');
            }
            if (onUploadExecuted) onUploadExecuted();
        }
        uploadFiles();
    }
  }, [pendingUploadFiles, onUploadExecuted]);

  useEffect(() => {
    if (pendingPaste && pendingPaste.length > 0) {
      let canceled = false;
      const processPaste = async () => {
        const charDelay = pasteDelay?.char || 0;
        const lineDelay = pasteDelay?.line || 0;
        
        if (charDelay === 0 && lineDelay === 0) {
          writeToServer(pendingPaste);
        } else {
          for (let i = 0; i < pendingPaste.length; i++) {
            if (canceled) break;
            const ch = pendingPaste[i];
            writeToServer(ch);
            if (ch === '\n' || ch === '\r') {
               if (lineDelay > 0) await new Promise(r => setTimeout(r, lineDelay));
            } else {
               if (charDelay > 0) await new Promise(r => setTimeout(r, charDelay));
            }
          }
        }
        if (!canceled && onPasteExecuted) onPasteExecuted();
      };
      processPaste();
      return () => { canceled = true; };
    }
  }, [pendingPaste, writeToServer, onPasteExecuted, pasteDelay]);

  const commandExecRef = useRef(onCommandExecuted);
  useEffect(() => {
     commandExecRef.current = onCommandExecuted;
  }, [onCommandExecuted]);

  const currentTaskRef = useRef(currentTask);
  useEffect(() => {
     currentTaskRef.current = currentTask;
  }, [currentTask]);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !config) {
      if (term && term.buffer.active.cursorX === 0 && term.buffer.active.cursorY === 0) {
          term.writeln(`\x1b[33mNot Connected\x1b[0m`);
      }
      return;
    }

    term.clear();
    term.writeln(`\x1b[36m${config.type} に接続中...\x1b[0m`);

    let currentLine = '';
    let isMock = config.type === 'ssh';
    
    // We bind onData based on mock status later
    let onDataDisposable: any;

    setStatus('接続中...');

    if (isMock) {
      setTimeout(() => {
        setStatus('認証中...');
        setTimeout(() => {
          setStatus('Connected');
          term.writeln('\x1b[32m[トレーニングサーバーにSSH接続されました]\x1b[0m');
          const finalHost = config.host === 'sandbox-vm.linux.local' ? '172.16.158.107' : config.host;
          const finalUser = config.username === 'penguin' ? 'user' : config.username;
          term.write(`\r\n\x1b[35m${finalUser || 'user'}@${finalHost}\x1b[0m:\x1b[34m${shellRef.current.currentDir.replace('/home/user', '~')}\x1b[0m$ `);
          
          if (commandExecRef.current) {
             // Simply mark connection as OK if the first task is SSH login
             if (currentTaskRef.current?.id === 'b1') {
                commandExecRef.current('ssh', true);
             }
          }
        }, 1000);
      }, 500);

      onDataDisposable = term.onData(async (data) => {
        const char = data;
        if (char === '\r') {
           term.writeln('');
           const cmd = currentLine.trim();
           if (cmd) {
               history.current.push(cmd);
               historyIndex.current = history.current.length;
           }
           currentLine = '';
           
           if (cmd) {
             const norm = cmd.trim().replace(/\s+/g, ' ');
             let isValid = false;
             const activeTask = currentTaskRef.current;
             
             // Run the simulation in Virtual Shell
             let shellOutput = '';
             if (cmd === 'clear') {
                 term.clear();
             } else {
                 shellOutput = shellRef.current.execute(cmd);
                 if (shellOutput) {
                     shellOutput.split('\n').forEach(line => term.writeln(line));
                 }
             }

             // Validation logic silently running
             if (activeTask) {
                 if (shellOutput.includes('command not found')) {
                     isValid = false;
                 } else if (activeTask.validator) {
                     const res = await activeTask.validator(norm, { 
                         vfs: vfsRef.current, 
                         shell: shellRef.current,
                         config
                     });
                     if (typeof res === 'object' && res !== null) {
                         isValid = res.valid;
                     } else {
                         isValid = !!res;
                     }
                 } else {
                    isValid = norm === activeTask.expectedCmd;
                 }
             }

             if (commandExecRef.current && cmd) commandExecRef.current(cmd, isValid);

             const ssh = shellRef.current.sshSession;
             const pUser = ssh ? ssh.user : (config.username || 'user');
             const pHost = ssh ? ssh.host : config.host;
             term.write(`\x1b[35m${pUser}@${pHost}\x1b[0m:\x1b[34m${shellRef.current.currentDir.replace('/home/user', '~')}\x1b[0m$ `);

             if (ssh) {
                 setTimeout(() => {
                     term.writeln('exit');
                     term.writeln('logout');
                     term.writeln(`Connection to ${ssh.host} closed.`);
                     shellRef.current.sshSession = null;
                     term.write(`\x1b[35m${config.username || 'user'}@${config.host}\x1b[0m:\x1b[34m${shellRef.current.currentDir.replace('/home/user', '~')}\x1b[0m$ `);
                 }, 1500);
             }
           } else {
             const ssh = shellRef.current.sshSession;
             const pUser = ssh ? ssh.user : (config.username || 'user');
             const pHost = ssh ? ssh.host : config.host;
             term.write(`\x1b[35m${pUser}@${pHost}\x1b[0m:\x1b[34m${shellRef.current.currentDir.replace('/home/user', '~')}\x1b[0m$ `);
           }
        } else if (data === '\x1b[A') { // Up
           if (historyIndex.current > 0) {
               historyIndex.current--;
               const cmd = history.current[historyIndex.current];
               term.write('\r\x1b[K');
               const ssh = shellRef.current.sshSession;
               const pUser = ssh ? ssh.user : (config.username || 'user');
               const pHost = ssh ? ssh.host : config.host;
               term.write(`\x1b[35m${pUser}@${pHost}\x1b[0m:\x1b[34m${shellRef.current.currentDir.replace('/home/user', '~')}\x1b[0m$ ${cmd}`);
               currentLine = cmd;
           }
        } else if (data === '\x1b[B') { // Down
           if (historyIndex.current < history.current.length - 1) {
               historyIndex.current++;
               const cmd = history.current[historyIndex.current];
               term.write('\r\x1b[K');
               const ssh = shellRef.current.sshSession;
               const pUser = ssh ? ssh.user : (config.username || 'user');
               const pHost = ssh ? ssh.host : config.host;
               term.write(`\x1b[35m${pUser}@${pHost}\x1b[0m:\x1b[34m${shellRef.current.currentDir.replace('/home/user', '~')}\x1b[0m$ ${cmd}`);
               currentLine = cmd;
           } else {
               historyIndex.current = history.current.length;
               currentLine = '';
               term.write('\r\x1b[K');
               const ssh = shellRef.current.sshSession;
               const pUser = ssh ? ssh.user : (config.username || 'user');
               const pHost = ssh ? ssh.host : config.host;
               term.write(`\x1b[35m${pUser}@${pHost}\x1b[0m:\x1b[34m${shellRef.current.currentDir.replace('/home/user', '~')}\x1b[0m$ `);
           }
        } else if (char === '\x0C') { // Ctrl+L
           term.clear();
           const ssh = shellRef.current.sshSession;
           const pUser = ssh ? ssh.user : (config.username || 'user');
           const pHost = ssh ? ssh.host : config.host;
           term.write(`\x1b[35m${pUser}@${pHost}\x1b[0m:\x1b[34m${shellRef.current.currentDir.replace('/home/user', '~')}\x1b[0m$ ${currentLine}`);
        } else if (char === '\t') { // Tab
           const commands = ['pwd', 'cd', 'ls', 'cat', 'touch', 'mkdir', 'cp', 'mv', 'rm', 'rmdir', 'chmod', 'chown', 'grep', 'ps', 'top', 'whoami', 'uname', 'hostname', 'id', 'who', 'w', 'df', 'free', 'echo', 'uptime', 'history', 'clear', 'date', 'cal', 'man', 'ssh', 'sudo', 'systemctl', 'ip', 'dig', 'tar', 'sed', 'awk', 'tr', 'find', 'which', 'alias', 'bg', 'fg', 'jobs', 'kill', 'ping', 'curl', 'env', 'passwd', 'read', 'lsattr', 'chattr', 'split', 'dmesg', 'mount', 'strings', 'nmap', 'traceroute', 'tcpdump', 'strace', 'ulimit', 'chsh', 'ntpdate', 'iostat', 'sar', 'fallocate', 'mktemp', 'uuidgen', 'nice', 'renice', 'sysctl', 'objdump', 'rename', 'declare'];
           
           const parts = currentLine.split(' ');
           if (parts.length === 1) { // Command completion
               const matches = commands.filter(c => c.startsWith(parts[0]));
               if (matches.length === 1) {
                   const append = matches[0].substring(parts[0].length) + ' ';
                   currentLine += append;
                   term.write(append);
               } else if (matches.length > 1) {
                   term.writeln('');
                   term.writeln(matches.join('  '));
                   term.write(`\x1b[35m${config.username || 'user'}@${config.host}\x1b[0m:\x1b[34m${shellRef.current.currentDir.replace('/home/user', '~')}\x1b[0m$ ${currentLine}`);
               }
           } else { // File/dir completion
               const partialPath = parts[parts.length - 1];
               let searchDir = shellRef.current.currentDir;
               let searchPrefix = partialPath;
               if (partialPath.includes('/')) {
                  const splitIdx = partialPath.lastIndexOf('/');
                  const dirPart = partialPath.substring(0, splitIdx);
                  searchDir = vfsRef.current.resolvePath(shellRef.current.currentDir, dirPart || '/');
                  searchPrefix = partialPath.substring(splitIdx + 1);
               }
               const node = vfsRef.current.getNode(searchDir);
               if (node && node.type === 'dir' && node.children) {
                  const allNames = Object.keys(node.children);
                  if (searchDir === shellRef.current.currentDir) {
                     allNames.push('.', '..');
                  }
                  const matches = allNames.filter(n => n.startsWith(searchPrefix));
                  if (matches.length === 1) {
                      let append = matches[0].substring(searchPrefix.length);
                      if (node.children[matches[0]]?.type === 'dir') append += '/';
                      else append += ' ';
                      currentLine += append;
                      term.write(append);
                  } else if (matches.length > 1) {
                      term.writeln('');
                      const isDir = (n: string) => node.children?.[n]?.type === 'dir' || n === '.' || n === '..';
                      term.writeln(matches.map(n => isDir(n) ? `\x1b[1;34m${n}\x1b[0m` : n).join('  '));
                      term.write(`\x1b[35m${config.username || 'user'}@${config.host}\x1b[0m:\x1b[34m${shellRef.current.currentDir.replace('/home/user', '~')}\x1b[0m$ ${currentLine}`);
                  }
               }
           }
        } else if (char === '\x7F') { // Backspace
           if (currentLine.length > 0) {
             currentLine = currentLine.slice(0, -1);
             term.write('\b \b');
           }
        } else if (char.startsWith('\x1b')) {
           // Ignore arrow keys and other ANSI escapes in this simple mock
        } else {
           currentLine += char;
           term.write(char);
        }
      });
    } else if (config.type === 'serial') {
      let isReading = true;
      onDataDisposable = term.onData((data) => {
        writeToServer(data);
      });
      const connectSerial = async () => {
        try {
          // Requires HTTPS or localhost
          const nav = navigator as any;
          if (!nav.serial) {
             throw new Error('Web Serial API noot supported in this browser. You may need to open this in a new tab.');
          }
          
          const port = await nav.serial.requestPort();
          await port.open({ baudRate: config.baudRate || 9600 });
          serialPortRef.current = port;
          
          setStatus('Connected');
          term.writeln(`\x1b[32m[Serial Connected at ${config.baudRate || 9600} baud]\x1b[0m`);
          
          serialWriterRef.current = port.writable.getWriter();
          
          // Read loop
          while (port.readable && isReading) {
            const reader = port.readable.getReader();
            serialReaderRef.current = reader;
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                  const text = new TextDecoder(config.encoding || 'utf-8').decode(value);
                  term.write(text);
                  if (onDataReceived) onDataReceived(text);
                }
              }
            } catch (error) {
              console.error(error);
            } finally {
              reader.releaseLock();
            }
          }
        } catch (err: any) {
          setStatus('Error');
          term.writeln(`\r\n\x1b[31m[Serial Error] ${err.message}\x1b[0m`);
        }
      };
      connectSerial();

      return () => {
        isReading = false;
        if (serialReaderRef.current) serialReaderRef.current.cancel();
        if (serialWriterRef.current) serialWriterRef.current.releaseLock();
        if (serialPortRef.current) serialPortRef.current.close();
      }
    }

    return () => {
      if (onDataDisposable) {
        onDataDisposable.dispose();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [config, writeToServer, fitAddonRef, xtermRef]); // Removed onDisconnect and onDataReceived from dependencies to avoid reconnect loops

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0c0c] overflow-hidden">
      {/* Terminal Tabs */}
      <div className="flex bg-[#252526] text-[10px] shrink-0 border-b border-[#3d3d3d]">
        <div className="px-4 py-2 bg-[#0c0c0c] border-t-2 border-[#4a9eff] flex items-center gap-2 border-r border-[#3d3d3d]">
          <span className="font-semibold text-[#ccc]">{config ? (config.type === 'ssh' ? `SSH: ${config.host}` : `Serial: COM (${config.baudRate})`) : 'Disconnected'}</span>
          {config && <button onClick={onDisconnect} className="text-[#666] hover:text-[#ff5f57] font-bold text-xs leading-none">×</button>}
        </div>
        <div className="px-3 py-2 hover:bg-[#2d2d2d] cursor-pointer text-[#888] font-bold">+</div>
      </div>
      
      <div className="flex-1 relative p-1 overflow-hidden">
        <div ref={terminalRef} className="absolute inset-0 p-3" />
      </div>
    </div>
  );
}
