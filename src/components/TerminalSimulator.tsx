import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

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

interface TerminalProps {
  config: ConnectConfig | null;
  onDisconnect: () => void;
  pendingMacro?: string | null;
  onMacroExecuted?: () => void;
  pendingPaste?: string | null;
  onPasteExecuted?: () => void;
  pasteDelay?: { char: number; line: number };
  onDataReceived?: (data: string) => void;
  onRequestPasteDelay?: (text: string) => void;
  pendingUploadFiles?: File[] | null;
  onUploadExecuted?: () => void;
  copyTrigger?: number;
}

export default function TerminalSimulator({ config, onDisconnect, pendingMacro, onMacroExecuted, pendingPaste, onPasteExecuted, pasteDelay, onDataReceived, onRequestPasteDelay, pendingUploadFiles, onUploadExecuted, copyTrigger }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const serialPortRef = useRef<any>(null);
  const serialWriterRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);

  const [status, setStatus] = useState<string>('Disconnected');

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
    term.open(terminalRef.current);
    fitAddon.fit();

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
      if (!config || config.type !== 'ssh' || !socketRef.current) return;
      
      const files = Array.from(e.dataTransfer?.files || []);
      for (const file of files) {
        term.writeln(`\r\n\x1b[36m[SFTP] Starting upload for ${file.name} (${Math.round(file.size/1024)} KB)...\x1b[0m`);
        try {
          const arrayBuffer = await file.arrayBuffer();
          socketRef.current.emit('ssh-sftp-upload', {
            filename: file.name,
            path: './' + file.name,
            data: arrayBuffer
          });
        } catch (err) {
          term.writeln(`\r\n\x1b[31m[SFTP Error] Could not read file.\x1b[0m\r\n`);
        }
      }
    };

    terminalRef.current?.addEventListener('dragover', handleDragOver);
    terminalRef.current?.addEventListener('drop', handleDrop);

    const handlePasteEvent = (e: ClipboardEvent) => {
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
  }, [pasteDelay, onRequestPasteDelay]);

  const writeToServer = useCallback((data: string) => {
    if (config?.type === 'ssh' && socketRef.current) {
      socketRef.current.emit('ssh-data', data);
    } else if (config?.type === 'serial' && serialWriterRef.current) {
      serialWriterRef.current.write(new TextEncoder().encode(data));
    }
  }, [config]);

  useEffect(() => {
    if (pendingMacro && pendingMacro.trim()) {
      const executeMacro = (command: string) => {
        const processedCmd = command.replace(/\\n/g, '\r\n').replace(/\\r/g, '\r');
        writeToServer(processedCmd);
      };
      executeMacro(pendingMacro);
      if (onMacroExecuted) onMacroExecuted();
    }
  }, [pendingMacro, writeToServer, onMacroExecuted]);

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
    if (pendingUploadFiles && pendingUploadFiles.length > 0 && socketRef.current) {
        const term = xtermRef.current;
        const uploadFiles = async () => {
            for (const file of pendingUploadFiles) {
                term?.writeln(`\r\n\x1b[36m[SFTP] Starting upload for ${file.name} (${Math.round(file.size/1024)} KB)...\x1b[0m`);
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    socketRef.current?.emit('ssh-sftp-upload', {
                        filename: file.name,
                        path: './' + file.name,
                        data: arrayBuffer
                    });
                } catch (err) {
                    term?.writeln(`\r\n\x1b[31m[SFTP Error] Could not read file.\x1b[0m\r\n`);
                }
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

  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !config) {
      if (term && term.buffer.active.cursorX === 0 && term.buffer.active.cursorY === 0) {
          term.writeln(`\x1b[33mNot Connected\x1b[0m`);
      }
      return;
    }

    term.clear();
    term.writeln(`\x1b[36mConnecting to ${config.type}...\x1b[0m`);

    const onDataDisposable = term.onData((data) => {
      writeToServer(data);
    });

    setStatus('Connecting...');

    if (config.type === 'ssh') {
      const socket = io();
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('ssh-connect', {
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          privateKey: config.privateKey,
        });
      });

      socket.on('ssh-ready', () => setStatus('Authenticating...'));
      socket.on('ssh-shell-started', () => {
        setStatus('Connected');
        term.writeln('\x1b[32m[SSH Connected]\x1b[0m');
        if (fitAddonRef.current) {
          socket.emit('ssh-resize', { cols: term.cols, rows: term.rows });
        }
        
        // Start Port Forwarding if configured
        if (config.forwardRules && config.forwardRules.length > 0) {
          config.forwardRules.forEach((rule) => {
             if (rule.type === 'local') {
               socket.emit('ssh-forward-local', { localPort: rule.listenPort, targetHost: rule.targetHost, targetPort: rule.targetPort });
               term.writeln(`\x1b[36m[Forward local] port ${rule.listenPort} -> ${rule.targetHost}:${rule.targetPort}\x1b[0m`);
             } else if (rule.type === 'remote') {
               // Update the logic in server.ts to handle targetHost and targetPort for remote forwarding properly.
               socket.emit('ssh-forward-remote', { remotePort: rule.listenPort, targetHost: rule.targetHost, targetPort: rule.targetPort });
               term.writeln(`\x1b[36m[Forward remote] port ${rule.listenPort} -> ${rule.targetHost}:${rule.targetPort}\x1b[0m`);
             }
          });
        }
      });
      socket.on('ssh-forward-started', (info) => {
         term.writeln(`\x1b[32m[Forward setup successful] ${info.type} port ${info.localPort}\x1b[0m`);
      });
      socket.on('ssh-data', (data) => {
        let text = data;
        if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
           text = new TextDecoder(config.encoding || 'utf-8').decode(data);
        } else if (typeof data === 'string') {
           text = data;
        }
        term.write(text);
        if (onDataReceived) onDataReceived(text);
      });
      socket.on('ssh-error', (err) => {
        setStatus('Error');
        term.writeln(`\r\n\x1b[31m[SSH Error] ${err}\x1b[0m`);
      });
      socket.on('ssh-close', () => {
        setStatus('Disconnected');
        term.writeln('\r\n\x1b[33m[Connection closed]\x1b[0m');
        onDisconnect();
      });

    } else if (config.type === 'serial') {
      let isReading = true;
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
      onDataDisposable.dispose();
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
