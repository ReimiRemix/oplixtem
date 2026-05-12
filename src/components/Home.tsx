import React from 'react';
import { motion } from 'motion/react';

interface HomeProps {
  onStart: () => void;
}

export default function Home({ onStart }: HomeProps) {
  return (
    <div className="min-h-screen bg-[#0f0f13] text-white font-sans overflow-x-hidden selection:bg-[#4a9eff] selection:text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f13]/80 backdrop-blur-md border-b border-[#2a2a30]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐧</span>
            <span className="font-bold text-lg tracking-wide">WEB Oplix Terminal Simulator</span>
          </div>
          <button 
            onClick={onStart}
            className="px-4 py-2 bg-[#4a9eff] hover:bg-[#3b82f6] transition-colors rounded-md text-sm font-medium"
          >
            ターミナルを開く
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 flex flex-col items-center text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#4a9eff]/10 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <span className="inline-block py-1 px-3 rounded-full bg-[#3b82f6]/10 text-[#4a9eff] text-sm font-medium border border-[#3b82f6]/20 mb-6">
            完全無料でブラウザ完結
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Linuxコマンド初心者に<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a9eff] to-[#a855f7]">おすすめの無料学習サイト</span>
          </h1>
          <p className="text-[#a0a0ab] text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            インストール不要で今すぐターミナル操作を体験でき、実践課題でコマンドラインを基礎から段階的に習得できます。PC・スマホ対応。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 bg-[#4a9eff] hover:bg-[#3b82f6] hover:-translate-y-0.5 active:translate-y-0 transition-all rounded-lg text-lg font-bold shadow-[0_0_20px_rgba(74,158,255,0.3)]"
            >
              🚀 学習を無料で始める
            </button>
            <a 
              href="#features" 
              className="w-full sm:w-auto px-8 py-4 bg-[#2a2a30] hover:bg-[#35353d] transition-colors rounded-lg text-lg font-medium border border-[#3d3d45]"
            >
              特徴を見る
            </a>
          </div>
        </motion.div>
      </section>

      {/* Steps Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 border-t border-[#2a2a30]">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">📈 3ステップで始める学習の流れ</h2>
          <p className="text-[#a0a0ab]">簡単だから続けられる。着実にステップアップ。</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#18181b] border border-[#2a2a30] p-8 rounded-2xl hover:border-[#4a9eff]/30 transition-colors">
            <div className="text-4xl mb-4">👆</div>
            <h3 className="text-xl font-bold mb-3">1. まずは触ってみる</h3>
            <p className="text-[#888891] leading-relaxed">
              ブラウザに内蔵された高性能なターミナルエミュレーターで、インストール不要ですぐにLinux環境を触れます。
            </p>
          </div>
          <div className="bg-[#18181b] border border-[#2a2a30] p-8 rounded-2xl hover:border-[#4a9eff]/30 transition-colors">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-3">2. 課題に挑戦</h3>
            <p className="text-[#888891] leading-relaxed">
              100問以上の実践的なタスクを用意。「現在のディレクトリを確認する」といった初歩からステップアップ。
            </p>
          </div>
          <div className="bg-[#18181b] border border-[#2a2a30] p-8 rounded-2xl hover:border-[#4a9eff]/30 transition-colors">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-bold mb-3">3. 知識を定着</h3>
            <p className="text-[#888891] leading-relaxed">
              成功時に表示される解説を読むことで、なぜそのコマンドを使うのか、どう動くのかを理解して実践力をつけます。
            </p>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">無料でLinuxコマンドを練習できる理由</h2>
        <div className="space-y-6">
          <div className="flex gap-4 p-6 bg-[#18181b] rounded-xl border border-[#2a2a30]">
            <div className="text-[#4a9eff] text-2xl">✓</div>
            <div>
              <h4 className="font-bold text-lg mb-1">ブラウザで完結</h4>
              <p className="text-[#888891]">仮想環境（VirtualBoxなど）の構築や、面倒な初期設定は一切不要。</p>
            </div>
          </div>
          <div className="flex gap-4 p-6 bg-[#18181b] rounded-xl border border-[#2a2a30]">
            <div className="text-[#4a9eff] text-2xl">✓</div>
            <div>
              <h4 className="font-bold text-lg mb-1">段階的・ゲーミフィケーション学習</h4>
              <p className="text-[#888891]">ゲーム感覚でタスクをクリアしていくことで、モチベーションを維持しながら学習できます。</p>
            </div>
          </div>
          <div className="flex gap-4 p-6 bg-[#18181b] rounded-xl border border-[#2a2a30]">
            <div className="text-[#4a9eff] text-2xl">✓</div>
            <div>
              <h4 className="font-bold text-lg mb-1">失敗しても安全</h4>
              <p className="text-[#888891]">ローカルのPCを壊してしまう心配はありません。安心してrmコマンドも打つことができます。</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-br from-[#18181b] to-[#1e1e24] border border-[#2a2a30] rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#4a9eff]/10 blur-[80px] rounded-full" />
          <h2 className="text-3xl font-bold mb-4 relative z-10">さあ、ターミナルの世界へ</h2>
          <p className="text-[#a0a0ab] mb-8 relative z-10 max-w-lg mx-auto">
            黒い画面への苦手意識をなくし、効率的なPC操作への第一歩を踏み出しましょう。
          </p>
          <button 
            onClick={onStart}
            className="px-10 py-4 bg-[#4a9eff] hover:bg-[#3b82f6] hover:scale-105 transition-all outline-none rounded-full text-lg font-bold text-white shadow-lg relative z-10"
          >
            ターミナルを開く →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a2a30] pt-8 pb-12 mt-10">
        <div className="max-w-6xl mx-auto px-6 text-center text-[#666670] text-sm">
          <p>© {new Date().getFullYear()} WEB Oplix Terminal Simulator. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
