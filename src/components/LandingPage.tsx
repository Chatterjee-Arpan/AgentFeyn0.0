import React from 'react';
import { Atom, ArrowRight, Sparkles, Binary, Share2, Download, BookOpen, PenTool } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center text-center p-6">
      
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
           style={{ 
             backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl flex flex-col items-center gap-8 animate-[fadeIn_1s_ease-out]">
        
        {/* Logo Icon */}
        <div className="w-24 h-24 bg-slate-900/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)] mb-4">
          <Atom className="w-12 h-12 text-cyan-400 animate-[spin_10s_linear_infinite]" />
        </div>

        {/* Title & Tagline */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-white">
            Agent<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Feyn</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-light max-w-2xl mx-auto">
            The One Place to <span className="text-cyan-200 font-medium">Forge Your Particle Theories.</span>
          </p>
        </div>

        {/* Feature Grid (Application Focused) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mt-8">
          {[
            { 
              icon: BookOpen, 
              label: "Analyze Lagrangians", 
              desc: "Decipher complex models and theoretical equations." 
            },
            { 
              icon: PenTool, 
              label: "Mould Diagrams", 
              desc: "Forge precise Feynman topologies from pure math." 
            },
            { 
              icon: Sparkles, 
              label: "Visualise & Download", 
              desc: "Render and export publication-ready schematics." 
            }
          ].map((feature, i) => (
            <div key={i} className="p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col items-center gap-3 hover:bg-white/10 transition-colors group">
              <div className="p-3 bg-slate-900 rounded-lg group-hover:scale-110 transition-transform duration-300 border border-slate-700">
                <feature.icon className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="text-lg font-bold text-slate-200">{feature.label}</div>
              <div className="text-sm text-slate-400 leading-relaxed px-2">{feature.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button 
          onClick={onStart}
          className="group relative mt-12 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-lg rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95 flex items-center gap-3"
        >
          <span>Enter the Forge</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-xs text-slate-600 mt-8 font-mono">
          POWERED BY GEMINI 3 PRO
        </p>
      </div>
    </div>
  );
};