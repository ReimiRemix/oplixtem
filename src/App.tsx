import React, { useState, useEffect, useRef } from 'react';
import TerminalSimulator, { ConnectConfig, ForwardRule } from './components/TerminalSimulator';

export default function App() {
  const [activeConfig, setActiveConfig] = useState<ConnectConfig | null>(null);
  
  // Connection Form State
  const [sshHost, setSshHost] = useState('');
  const [sshUser, setSshUser] = useState('');
  const [sshPass, setSshPass] = useState('');
  const [sshPort, setSshPort] = useState('22');
  const [authMethod, setAuthMethod] = useState<'password' | 'key'>('password');
  const [sshKey, setSshKey] = useState('');
  
  const [serialBaud, setSerialBaud] = useState('115200');

  // Setup Steps
  const [setupStep, setSetupStep] = useState<'new_conn'|'security_warning'|'ssh_auth'|'additional'|'ssh_forwarding'|null>('new_conn');
  const [connType, setConnType] = useState<'tcpip' | 'serial'>('tcpip');
  const [tcpService, setTcpService] = useState<'telnet'|'ssh'|'other'>('ssh');
  
  // Connection Form State
  const [autoLog, setAutoLog] = useState(false);
  const [delayChar, setDelayChar] = useState(0);
  const [delayLine, setDelayLine] = useState(0);
  const [encoding, setEncoding] = useState('utf-8');
  const [pendingPaste, setPendingPaste] = useState<string | null>(null);
  const sessionLogRef = useRef<string>('');
  
  // Menu and Tool State
  const [lang, setLang] = useState<'en'|'ja'>('ja');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const translations = {
    en: {
      file: 'File', edit: 'Edit', setup: 'Setup', control: 'Control', window: 'Window', help: 'Help',
      newConn: 'New connection...', dupSession: 'Duplicate session',
      log: 'Log...', pauseLog: 'Pause Logging', resumeLog: 'Resume Logging', commentLog: 'Comment to Log...', viewLog: 'View Log', showLogDialog: 'Show Log dialog...', stopLog: 'Stop Logging',
      sendFile: 'Send file...', transfer: 'Transfer', sshScp: 'SSH SCP...', changeDir: 'Change directory...', replayLog: 'Replay Log...', print: 'Print...',
      disconnect: 'Disconnect', exit: 'Exit', exitAll: 'Exit All',
      copy: 'Copy', paste: 'Paste', pasteCr: 'Paste<CR>',
      terminal: 'Terminal...', font: 'Font...', keyboard: 'Keyboard...', serialPort: 'Serial port...', proxy: 'Proxy...',
      ssh: 'SSH...', sshAuth: 'SSH Authentication...', sshFwd: 'SSH Forwarding...', sshKeygen: 'SSH Keygenerator...', tcpip: 'TCP/IP...', general: 'General...', addSettings: 'Additional settings...',
      saveSetup: 'Save setup...', restoreSetup: 'Restore setup...', setupDir: 'Setup directory...', loadKeyMap: 'Load key map...',
      macro: 'Macro', noWindows: 'No windows...', about: 'About Web OplixTerminal...',
      pDelay: 'Paste Delay', charDelay: 'Char Delay (ms):', lineDelay: 'Line Delay (ms):', encoding: 'Character Encoding',
      connSetup: 'OplixTerminal Setup', connection: 'Connection'
    },
    ja: {
      file: 'ファイル', edit: '編集', setup: '設定', control: 'コントロール', window: 'ウィンドウ', help: 'ヘルプ',
      newConn: '新しい接続...', dupSession: 'セッションの複製',
      log: 'ログ...', pauseLog: 'ログ記録を一時停止', resumeLog: 'ログ記録を再開', commentLog: 'ログにコメント...', viewLog: 'ログの表示', showLogDialog: 'ログダイアログを表示...', stopLog: 'ログ記録を終了',
      sendFile: 'ファイル送信...', transfer: '転送', sshScp: 'SSH SCP...', changeDir: 'ディレクトリ変更...', replayLog: 'ログ再生...', print: '印刷...',
      disconnect: '切断', exit: '終了', exitAll: 'すべて終了',
      copy: 'コピー', paste: '貼り付け', pasteCr: '貼り付け<CR>',
      terminal: '端末...', font: 'フォント...', keyboard: 'キーボード...', serialPort: 'シリアルポート...', proxy: 'プロキシ...',
      ssh: 'SSH...', sshAuth: 'SSH 認証...', sshFwd: 'SSH 転送...', sshKeygen: 'SSH 鍵生成...', tcpip: 'TCP/IP...', general: '全般...', addSettings: '追加設定...',
      saveSetup: '設定を保存...', restoreSetup: '設定を復元...', setupDir: '設定ディレクトリ...', loadKeyMap: 'キーマップ読み込み...',
      macro: 'マクロ', noWindows: 'ウィンドウなし...', about: 'Web OplixTerminal について...',
      pDelay: 'ペースト遅延', charDelay: '文字遅延 (ms):', lineDelay: '行遅延 (ms):', encoding: '文字エンコーディング',
      connSetup: 'OplixTerminal 設定', connection: '接続'
    }
  };
  const t = translations[lang];

  const [isLogging, setIsLogging] = useState(false);
  const [logPaused, setLogPaused] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[] | null>(null);
  const [copyTrigger, setCopyTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMenu]);

  // Forwarding State
  const [showSSHForwarding, setShowSSHForwarding] = useState(false);
  const [forwardRules, setForwardRules] = useState<ForwardRule[]>([]);
  const [newRuleType, setNewRuleType] = useState<'local'|'remote'>('local');
  const [newListenPort, setNewListenPort] = useState(8080);
  const [newTargetHost, setNewTargetHost] = useState('localhost');
  const [newTargetPort, setNewTargetPort] = useState(80);

  // Macro State
  const [macros, setMacros] = useState<{name: string; command: string}[]>([]);
  const [newMacroName, setNewMacroName] = useState('');
  const [newMacroCmd, setNewMacroCmd] = useState('');
  const [showMacroEditor, setShowMacroEditor] = useState(false);
  
  // App State
  const [pendingMacro, setPendingMacro] = useState<string | null>(null);
  const [timeStr, setTimeStr] = useState('');
  const [quickCmd, setQuickCmd] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('wt-macros');
    if (saved) {
      try { setMacros(JSON.parse(saved)); } catch (e) {}
    }
    const savedAdditional = localStorage.getItem('wt-additional');
    if (savedAdditional) {
      try {
        const parsed = JSON.parse(savedAdditional);
        if (parsed.autoLog !== undefined) setAutoLog(parsed.autoLog);
        if (parsed.delayChar !== undefined) setDelayChar(parsed.delayChar);
        if (parsed.delayLine !== undefined) setDelayLine(parsed.delayLine);
        if (parsed.encoding !== undefined) setEncoding(parsed.encoding);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('wt-macros', JSON.stringify(macros));
  }, [macros]);

  useEffect(() => {
    localStorage.setItem('wt-additional', JSON.stringify({ autoLog, delayChar, delayLine, encoding }));
  }, [autoLog, delayChar, delayLine, encoding]);

  const downloadSessionLog = () => {
    if (!sessionLogRef.current) return;
    const blob = new Blob([sessionLogRef.current], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oplixterminal_log_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (autoLog || isLogging) sessionLogRef.current = '';
    if (autoLog && !isLogging) setIsLogging(true);
    if (connType === 'tcpip' && tcpService === 'ssh') {
      if (!sshHost || !sshUser) return;
      setActiveConfig({ type: 'ssh', host: sshHost, username: sshUser, password: authMethod === 'password' ? sshPass : undefined, privateKey: authMethod === 'key' ? sshKey : undefined, port: sshPort, forwardRules, encoding });
    } else if (connType === 'serial') {
      setActiveConfig({ type: 'serial', baudRate: parseInt(serialBaud, 10), encoding });
    } else if (connType === 'tcpip' && tcpService === 'telnet') {
      setActiveConfig({ type: 'ssh', host: sshHost, username: 'anonymous', port: sshPort, encoding });
    }
    setSetupStep(null);
  };

  const handleAddMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMacroName || !newMacroCmd) return;
    setMacros([...macros, { name: newMacroName, command: newMacroCmd }]);
    setNewMacroName('');
    setNewMacroCmd('');
    setShowMacroEditor(false);
  };

  const removeMacro = (index: number) => {
    setMacros(macros.filter((_, i) => i !== index));
  };
  
  const handleQuickCmd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickCmd.trim() && activeConfig) {
      setPendingMacro(quickCmd + '\\n');
      setQuickCmd('');
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1e1e] text-[#cccccc] font-sans select-none overflow-hidden">
      {/* Title Bar */}
      <div className="flex items-center justify-between bg-[#2d2d2d] px-3 py-1 border-b border-[#3d3d3d] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#4a9eff] rounded-sm flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">T</span>
          </div>
          <span className="text-xs font-medium">Web OplixTerminal {activeConfig ? `- [${activeConfig.type === 'ssh' ? `${activeConfig.host}:${activeConfig.port || 22}` : `COM (${activeConfig.baudRate})`} - ${activeConfig.type === 'ssh' ? 'SSH2' : 'SERIAL'}]` : '- [Disconnected]'}</span>
        </div>
        <div className="flex gap-4">
          {activeConfig ? (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-[10px] text-green-400">CONNECTED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#555]"></div>
              <span className="text-[10px] text-[#888]">DISCONNECTED</span>
            </div>
          )}
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#444] hover:bg-[#555] cursor-pointer"></div>
            <div className="w-3 h-3 rounded-full bg-[#444] hover:bg-[#555] cursor-pointer" onClick={() => setSetupStep('new_conn')}></div>
            <div className="w-3 h-3 rounded-full bg-[#ff5f57] cursor-pointer" onClick={() => {setActiveConfig(null); setSetupStep('new_conn');}}></div>
          </div>
        </div>
      </div>

      {/* Menu Bar */}
      <div className="flex px-3 bg-[#252526] text-[11px] border-b border-[#3d3d3d] shrink-0 relative z-50">
        <div className="relative group" onMouseEnter={() => activeMenu && setActiveMenu('file')}>
           <div className={`px-2 py-1 cursor-pointer ${activeMenu === 'file' ? 'bg-[#444] text-white' : 'hover:bg-[#444]'}`} onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}>{t.file}</div>
           {activeMenu === 'file' && (
             <div className="absolute top-full left-0 bg-[#252526] border border-[#3d3d3d] shadow-lg py-1 min-w-[220px] text-[#ccc]" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { setSetupStep('new_conn'); setActiveMenu(null); }}>{t.newConn}</div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { window.open(window.location.href, '_blank'); setActiveMenu(null); }}>{t.dupSession}</div>
                <div className="h-px bg-[#3d3d3d] my-1.5"></div>
                <div className={`px-5 py-1.5 flex justify-between cursor-pointer ${isLogging ? 'text-gray-500' : 'hover:bg-[#4a9eff] hover:text-white'}`} onClick={() => { if(!isLogging){ setIsLogging(true); setLogPaused(false); alert("Logging started (stored in memory until stopped)."); } setActiveMenu(null); }}><span>{t.log}</span></div>
                <div className={`px-5 py-1.5 cursor-pointer ${isLogging ? 'hover:bg-[#4a9eff] hover:text-white' : 'text-gray-500 cursor-not-allowed'}`} onClick={() => { if(isLogging) setLogPaused(!logPaused); setActiveMenu(null); }}>{logPaused ? t.resumeLog : t.pauseLog}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.commentLog}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.viewLog}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.showLogDialog}</div>
                <div className={`px-5 py-1.5 cursor-pointer ${isLogging ? 'hover:bg-[#4a9eff] hover:text-white' : 'text-gray-500 cursor-not-allowed'}`} onClick={() => { if(isLogging) { downloadSessionLog(); setIsLogging(false); } setActiveMenu(null); }}>{t.stopLog}</div>
                <div className="h-px bg-[#3d3d3d] my-1.5"></div>
                <div className={`px-5 py-1.5 cursor-pointer ${(activeConfig && activeConfig.type === 'ssh') ? 'hover:bg-[#4a9eff] hover:text-white' : 'text-gray-500 cursor-not-allowed'}`} onClick={() => { if(activeConfig && activeConfig.type === 'ssh') fileInputRef.current?.click(); setActiveMenu(null); }}>{t.sendFile}</div>
                <div className="flex justify-between px-5 py-1.5 text-gray-500 cursor-not-allowed"><span>{t.transfer}</span><span>▶</span></div>
                <div className={`px-5 py-1.5 flex justify-between cursor-pointer ${(activeConfig && activeConfig.type === 'ssh') ? 'hover:bg-[#4a9eff] hover:text-white' : 'text-gray-500 cursor-not-allowed'}`} onClick={() => { if(activeConfig && activeConfig.type === 'ssh') fileInputRef.current?.click(); setActiveMenu(null); }}><span>{t.sshScp}</span></div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.changeDir}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.replayLog}</div>
                <div className="h-px bg-[#3d3d3d] my-1.5"></div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { window.print(); setActiveMenu(null); }}>{t.print}</div>
                <div className="h-px bg-[#3d3d3d] my-1.5"></div>
                <div className={`px-5 py-1.5 cursor-pointer ${activeConfig ? 'hover:bg-[#4a9eff] hover:text-white' : 'text-gray-500 cursor-not-allowed'}`} onClick={() => { if(activeConfig) { setActiveConfig(null); setSetupStep('new_conn'); } setActiveMenu(null); }}>{t.disconnect}</div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { window.location.reload(); setActiveMenu(null); }}>{t.exit}</div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { window.close(); window.location.reload(); setActiveMenu(null); }}>{t.exitAll}</div>
             </div>
           )}
        </div>

        <div className="relative group" onMouseEnter={() => activeMenu && setActiveMenu('edit')}>
           <div className={`px-2 py-1 cursor-pointer ${activeMenu === 'edit' ? 'bg-[#444] text-white' : 'hover:bg-[#444]'}`} onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'edit' ? null : 'edit'); }}>{t.edit}</div>
           {activeMenu === 'edit' && (
             <div className="absolute top-full left-0 bg-[#252526] border border-[#3d3d3d] shadow-lg py-1 min-w-[170px] text-[#ccc]" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { setCopyTrigger(c => c + 1); setActiveMenu(null); }}>{t.copy}</div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { navigator.clipboard.readText().then(text => setPendingPaste(text)).catch(()=>{}); setActiveMenu(null); }}>{t.paste}</div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer flex justify-between" onClick={() => { navigator.clipboard.readText().then(text => setPendingPaste(text + '\n')).catch(()=>{}); setActiveMenu(null); }}><span>{t.pasteCr}</span></div>
             </div>
           )}
        </div>

        <div className="relative group" onMouseEnter={() => activeMenu && setActiveMenu('setup')}>
           <div className={`px-2 py-1 cursor-pointer ${activeMenu === 'setup' ? 'bg-[#444] text-white' : 'hover:bg-[#444]'}`} onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'setup' ? null : 'setup'); }}>{t.setup}</div>
           {activeMenu === 'setup' && (
             <div className="absolute top-full left-0 bg-[#252526] border border-[#3d3d3d] shadow-lg py-1 min-w-[170px] text-[#ccc]" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { setSetupStep('additional'); setActiveMenu(null); }}>{t.terminal}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">Window...</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.font}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.keyboard}</div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { setConnType('serial'); setSetupStep('new_conn'); setActiveMenu(null); }}>{t.serialPort}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.proxy}</div>
                <div className="h-px bg-[#3d3d3d] my-1.5"></div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { setConnType('tcpip'); setSetupStep('new_conn'); setActiveMenu(null); }}>{t.ssh}</div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { setConnType('tcpip'); setSetupStep('ssh_auth'); setActiveMenu(null); }}>{t.sshAuth}</div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { setSetupStep('ssh_forwarding'); setActiveMenu(null); }}>{t.sshFwd}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.sshKeygen}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.tcpip}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.general}</div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { setSetupStep('additional'); setActiveMenu(null); }}>{t.addSettings}</div>
                <div className="h-px bg-[#3d3d3d] my-1.5"></div>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { alert('Settings are automatically saved continuously to browser localStorage.'); setActiveMenu(null); }}>{t.saveSetup}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.restoreSetup}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.setupDir}</div>
                <div className="px-5 py-1.5 text-gray-500 cursor-not-allowed">{t.loadKeyMap}</div>
             </div>
           )}
        </div>

        <div className="relative group" onMouseEnter={() => activeMenu && setActiveMenu('control')}>
           <div className={`px-2 py-1 cursor-pointer ${activeMenu === 'control' ? 'bg-[#444] text-white' : 'hover:bg-[#444]'}`} onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'control' ? null : 'control'); }}>{t.control}</div>
           {activeMenu === 'control' && (
             <div className="absolute top-full left-0 bg-[#252526] border border-[#3d3d3d] shadow-lg py-1 min-w-[170px] text-[#ccc]" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { setShowMacroEditor(true); setActiveMenu(null); }}>{t.macro}</div>
             </div>
           )}
        </div>

        <div className="relative group" onMouseEnter={() => activeMenu && setActiveMenu('window')}>
           <div className={`px-2 py-1 cursor-pointer ${activeMenu === 'window' ? 'bg-[#444] text-white' : 'hover:bg-[#444]'}`} onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'window' ? null : 'window'); }}>{t.window}</div>
           {activeMenu === 'window' && (
             <div className="absolute top-full left-0 bg-[#252526] border border-[#3d3d3d] shadow-lg py-1 min-w-[170px] text-[#ccc]" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer italic text-gray-500">{t.noWindows}</div>
             </div>
           )}
        </div>

        <div className="relative group" onMouseEnter={() => activeMenu && setActiveMenu('help')}>
           <div className={`px-2 py-1 cursor-pointer ${activeMenu === 'help' ? 'bg-[#444] text-white' : 'hover:bg-[#444]'}`} onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'help' ? null : 'help'); }}>{t.help}</div>
           {activeMenu === 'help' && (
             <div className="absolute top-full left-0 bg-[#252526] border border-[#3d3d3d] shadow-lg py-1 min-w-[170px] text-[#ccc]" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-1.5 hover:bg-[#4a9eff] hover:text-white cursor-pointer" onClick={() => { alert('Web OplixTerminal\nCreated for AI Studio\nIncludes SFTP Drop Upload and Session Logging.'); setActiveMenu(null); }}>{t.about}</div>
             </div>
           )}
        </div>

        <div className="ml-auto flex items-center pr-2 text-[#888] gap-4">
          <select value={lang} onChange={e => setLang(e.target.value as 'en'|'ja')} className="bg-[#1e1e1e] border border-[#3d3d3d] text-[10px] rounded px-1.5 py-0.5 focus:outline-none">
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
          <span className="cursor-default uppercase tracking-widest text-[9px]">V5.0.0-REACT</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 bg-[#2d2d2d] border-b border-[#3d3d3d] shrink-0">
        <button onClick={() => setSetupStep('new_conn')} className="px-2 py-1 hover:bg-[#444] rounded text-[10px] flex flex-col items-center gap-0.5">
          <span className="block text-xs leading-none">⚡</span>
          <span>Connect</span>
        </button>
        <div className="w-px h-6 bg-[#444] mx-1"></div>
        <button className="px-2 py-1 hover:bg-[#444] rounded text-[10px] flex flex-col items-center gap-0.5" onClick={() => setCopyTrigger(c => c + 1)}>
          <span className="block text-xs leading-none">📋</span>
          <span>Copy</span>
        </button>
        <button className="px-2 py-1 hover:bg-[#444] rounded text-[10px] flex flex-col items-center gap-0.5" onClick={() => {
           navigator.clipboard.readText().then(text => setPendingPaste(text)).catch(()=>{});
        }}>
          <span className="block text-xs leading-none">📥</span>
          <span>Paste</span>
        </button>
        <button className={`px-2 py-1 hover:bg-[#444] rounded text-[10px] flex flex-col items-center gap-0.5 ${isLogging ? 'bg-[#444] text-white' : ''}`} onClick={() => {
           if (isLogging) { downloadSessionLog(); setIsLogging(false); }
           else { setIsLogging(true); setLogPaused(false); alert("Logging started"); }
        }}>
          <span className="block text-xs leading-none">💾</span>
          <span>{isLogging ? 'Stop Log' : 'Log'}</span>
        </button>
        <button className="px-2 py-1 hover:bg-[#444] rounded text-[10px] flex flex-col items-center gap-0.5 disabled:opacity-50" disabled={!activeConfig || activeConfig.type !== 'ssh'} onClick={() => fileInputRef.current?.click()}>
          <span className="block text-xs leading-none">📤</span>
          <span>SCP</span>
        </button>
        <div className="w-px h-6 bg-[#444] mx-1"></div>
        <button className="px-2 py-1 hover:bg-[#444] rounded text-[10px] flex flex-col items-center gap-0.5" onClick={() => setShowMacroEditor(!showMacroEditor)}>
          <span className="block text-xs leading-none">📜</span>
          <span>Macro</span>
        </button>
        <div className="w-px h-6 bg-[#444] mx-1"></div>
        <div className="flex bg-[#1e1e1e] rounded border border-[#3d3d3d] mx-2 px-2 py-1 items-center gap-2">
          <span className="text-[9px] text-[#888]">SEND:</span>
          <input type="text" className="bg-transparent outline-none text-[10px] w-48 text-[#ccc] disabled:opacity-50" placeholder={activeConfig ? "Quick command..." : "Not connected"} value={quickCmd} onChange={e => setQuickCmd(e.target.value)} onKeyDown={handleQuickCmd} disabled={!activeConfig} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar (Macros & Scripts) */}
        <div className="w-56 bg-[#252526] border-r border-[#3d3d3d] flex flex-col shrink-0">
          <div className="p-3 text-[10px] font-bold text-[#888] uppercase tracking-wider border-b border-[#3d3d3d] flex justify-between items-center">
             <span>Available Macros</span>
             <button onClick={() => setShowMacroEditor(true)} className="hover:text-white">+</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {macros.length === 0 && !showMacroEditor && (
              <div className="text-[10px] text-[#666] italic p-2 text-center">No macros saved.</div>
            )}
            {macros.map((m, i) => (
              <div key={i} className="p-2 bg-[#2d2d2d] rounded border border-[#3d3d3d] hover:border-[#4a9eff] cursor-pointer group flex items-start justify-between" onClick={() => activeConfig && setPendingMacro(m.command)}>
                <div className="overflow-hidden">
                  <div className="text-[11px] text-[#4a9eff] font-medium truncate">{m.name}</div>
                  <div className="text-[9px] text-[#666] group-hover:text-[#888] truncate pr-2 mt-0.5 font-mono">{m.command}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeMacro(i); }} className="text-[#666] hover:text-[#ff5f57] text-xs px-1" title="Delete">×</button>
              </div>
            ))}
          </div>
          
          {showMacroEditor && (
            <div className="p-3 border-t border-[#3d3d3d] bg-[#1e1e1e]">
              <div className="mb-2">
                <input type="text" placeholder="Macro Name" value={newMacroName} onChange={e=>setNewMacroName(e.target.value)} className="w-full bg-[#0c0c0c] text-[#ccc] border border-[#3d3d3d] rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[#4a9eff] mb-2" />
                <textarea placeholder="Command (use \n for newline)" value={newMacroCmd} onChange={e=>setNewMacroCmd(e.target.value)} className="w-full bg-[#0c0c0c] text-[#ccc] border border-[#3d3d3d] rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[#4a9eff] h-16 resize-none font-mono"></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowMacroEditor(false)} className="text-[10px] text-[#888] hover:text-white">Cancel</button>
                <button type="button" onClick={handleAddMacro} className="text-[10px] bg-[#4a9eff] hover:bg-[#3b82f6] text-white px-3 py-1 rounded font-medium">Save</button>
              </div>
            </div>
          )}

          <div className="p-3 border-t border-[#3d3d3d] bg-[#1e1e1e]">
            <div className="text-[9px] text-[#666] mb-2 font-bold tracking-wider">QUICK STATS</div>
            <div className="flex justify-between text-[10px]">
              <span>RX: {activeConfig ? '2.4 MB' : '0 B'}</span>
              <span className="text-green-500">{activeConfig ? '▲ 12kb/s' : '--'}</span>
            </div>
            <div className="flex justify-between text-[10px] mt-1">
              <span>TX: {activeConfig ? '842 KB' : '0 B'}</span>
              <span className="text-blue-500">{activeConfig ? '▼ 2kb/s' : '--'}</span>
            </div>
          </div>
        </div>

        {/* Terminal Pane / Setup Dialog */}
        <div className="flex-1 flex flex-col bg-[#0c0c0c] relative">
          {setupStep !== null ? (
            <div className="absolute inset-0 bg-[#1e1e1e] flex items-center justify-center p-8 z-10 text-[#ccc]">
              {/* Common Dialog Header */}
              {setupStep === 'new_conn' && (
                <form className="w-full max-w-md bg-[#252526] border border-[#3d3d3d] shadow-2xl flex flex-col items-stretch" onSubmit={(e) => { e.preventDefault(); if(connType==='tcpip' && tcpService==='ssh') setSetupStep('security_warning'); else { handleConnect(e); } }}>
                  <div className="bg-[#2d2d2d] px-4 py-2 text-xs font-bold text-[#ccc] border-b border-[#3d3d3d] flex justify-between items-center">
                    <span>New connection</span>
                    <button type="button" onClick={() => setSetupStep(null)} className="text-[#888] hover:text-white text-sm leading-none">✕</button>
                  </div>
                  <div className="p-6 flex flex-col gap-6">
                    {/* TCP/IP Section */}
                    <div className="flex items-start gap-4">
                       <input type="radio" id="tcpip" checked={connType === 'tcpip'} onChange={() => setConnType('tcpip')} className="mt-1 accent-[#4a9eff]" />
                       <div className="flex flex-col gap-4 flex-1">
                          <label htmlFor="tcpip" className="font-bold text-xs mt-0.5 cursor-pointer">TCP/IP</label>
                          <div className="ml-2 flex items-center gap-4">
                             <span className="w-16 text-right text-xs text-[#888]">Host:</span>
                             <div className="relative flex-1">
                               <input type="text" list="historyHosts" value={sshHost} onChange={e => setSshHost(e.target.value)} className="w-full bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#4a9eff]" required={connType==='tcpip'} disabled={connType!=='tcpip'} />
                               <datalist id="historyHosts">
                                  <option value="192.168.1.1" />
                                  <option value="localhost" />
                               </datalist>
                             </div>
                          </div>
                          
                          <div className="ml-2 flex items-center gap-4">
                             <span className="w-16 text-right text-xs text-[#888]">Service:</span>
                             <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={tcpService === 'telnet'} onChange={()=>setTcpService('telnet')} disabled={connType!=='tcpip'} className="accent-[#4a9eff]" /> Telnet</label>
                                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={tcpService === 'ssh'} onChange={()=>setTcpService('ssh')} disabled={connType!=='tcpip'} className="accent-[#4a9eff]" /> SSH</label>
                                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={tcpService === 'other'} onChange={()=>setTcpService('other')} disabled={connType!=='tcpip'} className="accent-[#4a9eff]" /> Other</label>
                             </div>
                          </div>
                          
                          <div className="ml-2 flex items-center gap-4">
                             <span className="w-16 text-right text-xs text-[#888]">TCP port#:</span>
                             <input type="number" value={sshPort} onChange={e => setSshPort(e.target.value)} className="w-24 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#4a9eff]" disabled={connType!=='tcpip'} />
                             
                             {tcpService === 'ssh' && (
                                <div className="ml-4 flex items-center gap-3">
                                   <span className="text-right text-xs text-[#888]">SSH version:</span>
                                   <select className="w-24 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#4a9eff] disabled:opacity-50" disabled={true}><option>SSH2</option></select>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                    
                    {/* Serial Section */}
                    <div className="flex items-start gap-4 pt-6 border-t border-[#3d3d3d]">
                       <input type="radio" id="serial" checked={connType === 'serial'} onChange={() => setConnType('serial')} className="mt-1 accent-[#4a9eff]" />
                       <div className="flex flex-col gap-4 flex-1">
                          <label htmlFor="serial" className="font-bold text-xs mt-0.5 cursor-pointer">Serial</label>
                          <div className="ml-2 flex items-center gap-4">
                             <span className="w-16 text-right text-xs text-[#888]">Port:</span>
                             <select className="flex-1 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#4a9eff] disabled:opacity-50" disabled={connType!=='serial'}>
                               <option>COM1: USB Serial Port</option>
                               <option>COM2: Bluetooth</option>
                             </select>
                          </div>
                          {connType === 'serial' && (
                             <div className="ml-2 flex items-center gap-4">
                                <span className="w-16 text-right text-xs text-[#888]">Baud Rate:</span>
                                <select value={serialBaud} onChange={e => setSerialBaud(e.target.value)} className="w-32 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#4a9eff]">
                                  <option value="9600">9600</option>
                                  <option value="115200">115200</option>
                                </select>
                             </div>
                          )}
                       </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-[#3d3d3d] bg-[#2d2d2d] flex justify-end gap-3 rounded-b">
                     <button type="button" onClick={() => setSetupStep(null)} className="px-4 py-1.5 text-xs text-[#bbb] hover:bg-[#3d3d3d] rounded transition-colors">Cancel</button>
                     <button type="submit" className="px-6 py-1.5 text-xs bg-[#4a9eff] hover:bg-[#3b82f6] text-white rounded font-medium transition-colors">OK</button>
                  </div>
                </form>
              )}
              
              {setupStep === 'security_warning' && (
                <div className="w-full max-w-md bg-[#252526] border border-[#3d3d3d] shadow-2xl flex flex-col items-stretch">
                  <div className="bg-[#2d2d2d] px-4 py-2 text-xs font-bold text-[#ccc] border-b border-[#3d3d3d] flex justify-between items-center">
                    <span className="text-[#ff9800]">SECURITY WARNING</span>
                    <button type="button" onClick={() => setSetupStep('new_conn')} className="text-[#888] hover:text-white text-sm leading-none">✕</button>
                  </div>
                  <div className="p-6 pb-4 text-xs">
                     <div className="flex items-center gap-3 text-[#ff9800] font-bold mb-4">
                        <span className="text-xl">⚠️</span>
                        <span>WARNING: SECURITY OF THIS HOST IS NOT GIVEN</span>
                     </div>
                     <p className="leading-relaxed text-[#ccc]">
                       Connecting to this host is not recommended unless you are absolutely sure of its identity. Are you sure you want to proceed and connect?
                     </p>
                  </div>
                  <div className="p-4 bg-[#2d2d2d] border-t border-[#3d3d3d] flex justify-end gap-3 rounded-b">
                     <button type="button" onClick={() => setSetupStep('new_conn')} className="px-4 py-1.5 text-xs text-[#bbb] hover:bg-[#3d3d3d] rounded transition-colors">Cancel</button>
                     <button type="button" onClick={() => setSetupStep('ssh_auth')} className="px-6 py-1.5 text-xs bg-[#ff9800] hover:bg-[#f57c00] text-white rounded font-medium transition-colors">Continue</button>
                  </div>
                </div>
              )}

              {setupStep === 'ssh_auth' && (
                <form className="w-full max-w-md bg-[#252526] border border-[#3d3d3d] shadow-2xl flex flex-col items-stretch" onSubmit={(e) => { e.preventDefault(); handleConnect(e); }}>
                  <div className="bg-[#2d2d2d] px-4 py-2 text-xs font-bold text-[#ccc] border-b border-[#3d3d3d] flex justify-between items-center">
                    <span>SSH Authentication</span>
                    <button type="button" onClick={() => setSetupStep('new_conn')} className="text-[#888] hover:text-white text-sm leading-none">✕</button>
                  </div>
                  <div className="p-6 flex flex-col gap-4">
                     <div className="text-xs mb-2 font-bold text-[#4a9eff]">
                        Authentication required.
                     </div>
                     <div className="flex gap-4 items-center">
                        <span className="w-24 text-right text-xs text-[#888]">User name:</span>
                        <input type="text" value={sshUser} onChange={e=>setSshUser(e.target.value)} className="flex-1 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#4a9eff]" required />
                     </div>
                     <div className="flex gap-4 items-center">
                        <span className="w-24 text-right text-xs text-[#888]">Passphrase:</span>
                        <input type="password" value={sshPass} onChange={e=>setSshPass(e.target.value)} className="flex-1 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#4a9eff]" />
                     </div>
                     
                     <div className="flex gap-4 items-start mt-2">
                        <span className="w-24 text-right text-xs text-[#888]">Methods:</span>
                        <div className="flex-1 space-y-3">
                            <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={authMethod==='password'} onChange={()=>setAuthMethod('password')} className="accent-[#4a9eff]" /> Plain password in memory</label>
                            <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={authMethod==='key'} onChange={()=>setAuthMethod('key')} className="accent-[#4a9eff]" /> RSA/DSA/ECDSA/ED25519 key</label>
                            {authMethod === 'key' && (
                               <textarea value={sshKey} onChange={e=>setSshKey(e.target.value)} placeholder="-----BEGIN PRIVATE KEY-----" className="mt-2 w-full h-24 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-2 text-[10px] font-mono resize-none focus:outline-none focus:border-[#4a9eff]" required />
                            )}
                        </div>
                     </div>
                  </div>
                  <div className="p-4 bg-[#2d2d2d] border-t border-[#3d3d3d] flex justify-end gap-3 rounded-b">
                     <button type="button" onClick={() => setSetupStep('new_conn')} className="px-4 py-1.5 text-xs text-[#bbb] hover:bg-[#3d3d3d] rounded transition-colors">Cancel</button>
                     <button type="submit" className="px-6 py-1.5 text-xs bg-[#4a9eff] hover:bg-[#3b82f6] text-white rounded font-medium transition-colors">OK</button>
                  </div>
                </form>
              )}

              {setupStep === 'additional' && (
                <div className="w-full max-w-sm bg-[#252526] border border-[#3d3d3d] shadow-2xl flex flex-col items-stretch">
                  <div className="bg-[#2d2d2d] px-4 py-2 text-xs font-bold text-[#ccc] border-b border-[#3d3d3d] flex justify-between items-center">
                    <span>Additional settings</span>
                    <button type="button" onClick={() => setSetupStep(null)} className="text-[#888] hover:text-white text-sm leading-none">✕</button>
                  </div>
                  <div className="p-6 flex flex-col gap-6 text-xs">
                     <div className="space-y-2">
                        <span className="text-[#4a9eff] font-bold border-b border-[#3d3d3d] pb-1 block">Logging</span>
                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                           <input type="checkbox" checked={autoLog} onChange={e=>setAutoLog(e.target.checked)} className="accent-[#4a9eff]" /> 
                           Auto log (download on disconnect)
                        </label>
                     </div>
                     
                     <div className="space-y-4 pt-2">
                        <span className="text-[#4a9eff] font-bold border-b border-[#3d3d3d] pb-1 block">Transmit setup</span>
                        <div className="flex gap-4 items-center">
                           <label className="text-[#888] w-24">Delay / Char</label>
                           <div className="flex items-center gap-2">
                             <input type="number" value={delayChar} onChange={e=>setDelayChar(parseInt(e.target.value)||0)} className="w-20 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-2 py-1 focus:outline-none focus:border-[#4a9eff]" /> ms
                           </div>
                        </div>
                        <div className="flex gap-4 items-center">
                           <label className="text-[#888] w-24">Delay / Line</label>
                           <div className="flex items-center gap-2">
                             <input type="number" value={delayLine} onChange={e=>setDelayLine(parseInt(e.target.value)||0)} className="w-20 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-2 py-1 focus:outline-none focus:border-[#4a9eff]" /> ms
                           </div>
                        </div>
                     </div>
                     
                     <div className="space-y-3 pt-2">
                        <span className="text-[#4a9eff] font-bold border-b border-[#3d3d3d] pb-1 block">Terminal</span>
                        <div className="flex gap-4 items-center mt-3">
                           <span className="text-[#888] w-24">Encoding:</span>
                           <select value={encoding} onChange={e=>setEncoding(e.target.value)} className="w-32 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-2 py-1 focus:outline-none focus:border-[#4a9eff]">
                              <option value="utf-8">UTF-8</option>
                              <option value="shift-jis">Shift-JIS</option>
                              <option value="euc-jp">EUC-JP</option>
                           </select>
                        </div>
                     </div>
                  </div>
                  <div className="p-4 bg-[#2d2d2d] border-t border-[#3d3d3d] flex justify-end gap-3 rounded-b">
                     <button type="button" onClick={() => setSetupStep(null)} className="px-6 py-1.5 text-xs bg-[#4a9eff] hover:bg-[#3b82f6] text-white rounded font-medium transition-colors">OK</button>
                  </div>
                </div>
              )}

              {setupStep === 'ssh_forwarding' && (
                <div className="w-full max-w-lg bg-[#252526] border border-[#3d3d3d] shadow-2xl flex flex-col items-stretch">
                  <div className="bg-[#2d2d2d] px-4 py-2 text-xs font-bold text-[#ccc] border-b border-[#3d3d3d] flex justify-between items-center">
                    <span>SSH Port Forwarding Setup</span>
                    <button type="button" onClick={() => setSetupStep(null)} className="text-[#888] hover:text-white text-sm leading-none">✕</button>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex gap-6">
                       <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={newRuleType === 'local'} onChange={()=>setNewRuleType('local')} className="accent-[#4a9eff]"/> Local</label>
                       <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="radio" checked={newRuleType === 'remote'} onChange={()=>setNewRuleType('remote')} className="accent-[#4a9eff]"/> Remote</label>
                    </div>
                    <div className="grid grid-cols-[80px_1fr] gap-y-4 gap-x-4 items-center">
                       <span className="text-xs text-[#888] text-right">Listen Port:</span>
                       <input type="number" value={newListenPort} onChange={e=>setNewListenPort(parseInt(e.target.value)||0)} className="w-24 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#4a9eff]" />
                       
                       <span className="text-xs text-[#888] text-right">Target Host:</span>
                       <input type="text" value={newTargetHost} onChange={e=>setNewTargetHost(e.target.value)} className="w-full bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#4a9eff]" />
                       
                       <span className="text-xs text-[#888] text-right">Target Port:</span>
                       <input type="number" value={newTargetPort} onChange={e=>setNewTargetPort(parseInt(e.target.value)||0)} className="w-24 bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#4a9eff]" />
                    </div>
                    <div className="flex justify-end">
                       <button type="button" onClick={() => {
                          setForwardRules([...forwardRules, { type: newRuleType, listenPort: newListenPort, targetHost: newTargetHost, targetPort: newTargetPort }]);
                       }} className="px-4 py-1.5 bg-[#333] hover:bg-[#444] border border-[#3d3d3d] rounded text-xs text-white transition-colors">Add Rule</button>
                    </div>
                    
                    <div className="border border-[#3d3d3d] bg-[#1e1e1e] h-32 overflow-y-auto rounded block">
                       {forwardRules.length === 0 && <div className="p-4 text-xs text-[#666] italic text-center">No forwarding rules configured.</div>}
                       {forwardRules.map((r, i) => (
                         <div key={i} className="flex justify-between items-center p-3 text-xs border-b border-[#3d3d3d] last:border-0 hover:bg-[#2a2a2b]">
                           <span><span className="uppercase text-[#4a9eff] font-bold text-[10px] w-14 inline-block">{r.type}</span> {r.listenPort} → {r.targetHost}:{r.targetPort}</span>
                           <button onClick={() => setForwardRules(forwardRules.filter((_, idx)=>idx!==i))} className="text-[#888] hover:text-[#ff5f57] transition-colors">Delete</button>
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="p-4 bg-[#2d2d2d] border-t border-[#3d3d3d] flex justify-end gap-3 rounded-b">
                    <button type="button" onClick={() => setSetupStep(null)} className="px-6 py-1.5 text-xs bg-[#4a9eff] hover:bg-[#3b82f6] text-white rounded font-medium transition-colors">Done</button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <TerminalSimulator 
               config={activeConfig} 
               onDisconnect={() => { 
                 if ((autoLog || isLogging) && sessionLogRef.current) downloadSessionLog();
                 setActiveConfig(null); 
                 setSetupStep('new_conn'); 
                 setIsLogging(false);
               }} 
               pendingMacro={pendingMacro}
               onMacroExecuted={() => setPendingMacro(null)}
               pendingPaste={pendingPaste}
               onPasteExecuted={() => setPendingPaste(null)}
               pasteDelay={{ char: delayChar, line: delayLine }}
               onDataReceived={(data) => {
                 if (isLogging && !logPaused) sessionLogRef.current += data;
                 if (autoLog && !isLogging) sessionLogRef.current += data; // fallback
               }}
               onRequestPasteDelay={(text) => setPendingPaste(text)}
               pendingUploadFiles={pendingUploadFiles}
               onUploadExecuted={() => setPendingUploadFiles(null)}
               copyTrigger={copyTrigger}
            />

        </div>
      </div>

      <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => {
        if (e.target.files) {
          setPendingUploadFiles(Array.from(e.target.files));
          e.target.value = '';
        }
      }} />

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 h-6 bg-[#007acc] text-white text-[10px] shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-bold uppercase tracking-tight">{activeConfig?.type === 'ssh' ? 'SSH2' : activeConfig?.type === 'serial' ? 'SERIAL' : 'OFFLINE'}</span>
          {activeConfig && (
            <div className="flex gap-3 text-white/80">
              <span>{activeConfig.type === 'ssh' ? `IP: ${activeConfig.host}` : `BAUD: ${activeConfig.baudRate}`}</span>
              {activeConfig.port && <span>PORT: {activeConfig.port}</span>}
              <span>UTF-8</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono">80x24</span>
          <span className="font-mono">VT100</span>
          <div className="flex items-center gap-1">
            <span>CAPS</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
            <span>NUM</span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-300"></div>
          </div>
          <span className="font-mono">{timeStr}</span>
        </div>
      </div>
    </div>
  );
}

