import React, { useEffect, useRef } from 'react';
import { Agent, AgentRole } from '../types';
import { Bot, Brain, PenTool, Activity, CheckCircle, Clock, BookOpen } from 'lucide-react';

interface AgentSidebarProps {
  agents: Agent[];
}

const AgentIcon: React.FC<{ role: AgentRole; className?: string }> = ({ role, className }) => {
  switch (role) {
    case 'orchestrator': return <Bot className={className} />;
    case 'theorist': return <Brain className={className} />;
    case 'teacher': return <BookOpen className={className} />; // New Teacher Icon
    case 'illustrator': return <PenTool className={className} />;
    default: return <Bot className={className} />;
  }
};

const StatusIndicator: React.FC<{ status: Agent['status'] }> = ({ status }) => {
  switch (status) {
    case 'working': return <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />;
    case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case 'error': return <div className="w-3 h-3 rounded-full bg-red-500" />;
    case 'waiting': return <Clock className="w-4 h-4 text-amber-400" />;
    default: return <div className="w-3 h-3 rounded-full bg-slate-600" />;
  }
};

const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [agent.logs]);

  const isActive = agent.status === 'working';
  const isSuccess = agent.status === 'success';

  return (
    <div className={`
      relative p-4 rounded-xl border transition-all duration-300
      ${isActive 
        ? 'bg-slate-800/80 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
        : isSuccess 
          ? 'bg-slate-900/50 border-emerald-900/30' 
          : 'bg-slate-900/30 border-slate-800'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
            <AgentIcon role={agent.id} className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${isActive ? 'text-cyan-100' : 'text-slate-300'}`}>
              {agent.name}
            </h3>
            <p className="text-xs text-slate-500">{agent.description}</p>
          </div>
        </div>
        <StatusIndicator status={agent.status} />
      </div>

      {/* Terminal/Logs Area */}
      <div 
        ref={logRef}
        className="h-24 overflow-y-auto font-mono text-xs bg-black/40 rounded p-2 border border-slate-800/50 space-y-1"
      >
        {agent.logs.map((log, i) => (
          <div key={i} className="text-slate-400 border-l-2 border-slate-700 pl-2">
            <span className="opacity-50 select-none mr-2">{'>'}</span>
            {log}
          </div>
        ))}
        {isActive && (
          <div className="text-cyan-500 animate-pulse pl-2">_</div>
        )}
      </div>
    </div>
  );
};

export const AgentSidebar: React.FC<AgentSidebarProps> = ({ agents }) => {
  return (
    <div className="w-80 border-r border-slate-800 bg-slate-950 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">Active Agents</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
};