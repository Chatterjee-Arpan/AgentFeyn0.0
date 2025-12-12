import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Brain, Atom, BrainCircuit, RotateCcw } from 'lucide-react'; 
import { DiagramRenderer } from './components/TikzRenderer';
import { LandingPage } from './components/LandingPage'; 
import { AgentSidebar } from './components/AgentSidebar'; // Re-added Sidebar import
import { 
  runOrchestratorAgent, 
  runTheoristAgent, 
  runTeacherAgent, 
  Agent2Result 
} from './physics';
import { generateDiagram } from './renderer';
import { Agent, AgentRole, ChatMessage } from './types';
import { INITIAL_AGENTS } from './constants';

function App() {
  // --- STATE: VIEW CONTROL ---
  const [view, setView] = useState<'landing' | 'workspace'>('landing');

  // --- STATE: APP LOGIC ---
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [diagramSvg, setDiagramSvg] = useState<string>('');
  const [result, setResult] = useState<Agent2Result | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateAgent = (id: AgentRole, status: Agent['status'], log?: string) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === id) {
        return {
          ...agent,
          status,
          logs: log ? [...agent.logs, log] : agent.logs
        };
      }
      return agent;
    }));
  };

  const addChatMessage = (role: AgentRole, text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'agent',
      agentId: role,
      content: text,
      timestamp: new Date()
    }]);
  };

  const runSimulation = async (queryText: string) => {
    if (isSimulating) return;
    setIsSimulating(true);
    setDiagramSvg(''); 
    setResult(null);

    setAgents(prev => prev.map(agent => ({ ...agent, status: 'idle', logs: [] })));

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'user',
      content: queryText,
      timestamp: new Date()
    }]);

    updateAgent('orchestrator', 'working', 'Classifying user intent...');
    const task = await runOrchestratorAgent(queryText);
    updateAgent('orchestrator', 'success', `Task Assigned: ${task}`);
    await new Promise(r => setTimeout(r, 400)); 

    updateAgent('theorist', 'working', 'Thinking... (Validating physics & topology)');
    
    let theoristResult: Agent2Result;
    try {
        theoristResult = await runTheoristAgent(queryText, task);
    } catch (e) {
        updateAgent('theorist', 'error', 'Physics Engine Malfunction.');
        setIsSimulating(false);
        return;
    }
    
    setResult(theoristResult);
    updateAgent('theorist', 'success', `Analysis Complete. Valid: ${theoristResult.status}`);
    
    if (theoristResult.status === 'invalid') {
       addChatMessage('theorist', theoristResult.physics_description);
       setIsSimulating(false);
       return;
    }

    const p3 = (async () => {
        updateAgent('teacher', 'working', 'Drafting response...');
        const teacherResponse = await runTeacherAgent(
             theoristResult.physics_description, 
             result?.physics_description 
        );
        addChatMessage('teacher', teacherResponse);
        updateAgent('teacher', 'success', 'Response sent.');
    })();

    const p4 = (async () => {
        if (task === 'PLAN_TOPOLOGY' && theoristResult.visual_data.topology !== 'unknown') {
            updateAgent('illustrator', 'working', 'Generating vector geometry...');
            const svg = generateDiagram(theoristResult.visual_data);
            await new Promise(r => setTimeout(r, 600)); 
            setDiagramSvg(svg);
            updateAgent('illustrator', 'success', 'Diagram rendered.');
        } else {
            updateAgent('illustrator', 'waiting', 'No diagram required for theory task.');
        }
    })();

    await Promise.all([p3, p4]);
    setIsSimulating(false);
  };

  const handleManualSubmit = () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    runSimulation(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleManualSubmit();
    }
  };

  // --- RENDER: LANDING PAGE ---
  if (view === 'landing') {
    return <LandingPage onStart={() => setView('workspace')} />;
  }

  // --- RENDER: WORKSPACE ---
  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      
      {/* Sidebar (Preserved) */}
      <AgentSidebar agents={agents} />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header - RENAMED TO AgentFeyn */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center">
                <Atom className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white">
                Agent<span className="text-cyan-400">Feyn</span>
              </h1>
              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                 POWERED BY GEMINI 3 PRO
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
             <button 
              onClick={() => runSimulation('e- e+ -> mu- mu+')}
              disabled={isSimulating}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-[10px] font-medium rounded-lg transition-colors border border-slate-700"
            >
              <Brain className="w-3 h-3" />
              QED Demo
            </button>
             <button 
              onClick={() => runSimulation('u anti-u -> g g')}
              disabled={isSimulating}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 disabled:opacity-50 text-cyan-200 text-[10px] font-medium rounded-lg transition-colors border border-cyan-500/30"
            >
              <Sparkles className="w-3 h-3" />
              QCD Demo
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Chat Column */}
          <div className="flex-1 flex flex-col min-w-[350px] border-r border-slate-800 bg-slate-900/20">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-60">
                   <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                      <BrainCircuit className="w-8 h-8 text-slate-500" />
                   </div>
                   <p className="font-mono text-xs">Awaiting Physics Query...</p>
                </div>
              )}
              
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`
                    max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                    ${msg.sender === 'user' 
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-sm' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'}
                  `}>
                    {msg.sender === 'agent' && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                            {msg.agentId?.toUpperCase()}
                          </span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="E.g. 'Show me Moller scattering' or 'Analyze QED Lagrangian'"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600 font-mono"
                />
                <button 
                  onClick={handleManualSubmit}
                  disabled={!input.trim() && !isSimulating}
                  className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Visualization Column */}
          <div className="flex-1 p-6 bg-slate-950 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-cyan-500" />
                Visual Output
              </h2>
              {diagramSvg && (
                <div className="flex gap-2 text-[10px]">
                   <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono">RENDER_SUCCESS</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 bg-slate-900/30 border border-slate-800/50 shadow-inner rounded-xl overflow-hidden relative">
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20"></div>
              
              <DiagramRenderer 
                svgContent={diagramSvg} 
                loading={isSimulating && !diagramSvg && result?.visual_data?.topology !== 'unknown'}
              />
            </div>
            
            {/* Meta Data Grid */}
            <div className="mt-4 grid grid-cols-3 gap-4">
               <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">Topology</span>
                  <span className="text-sm font-mono text-cyan-300">
                    {diagramSvg && result ? result.visual_data.topology : '-'}
                  </span>
               </div>
               <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">Propagator</span>
                  <span className="text-sm font-mono text-cyan-300">
                     {diagramSvg && result ? result.visual_data.propagator_type : '-'}
                  </span>
               </div>
               <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">Interaction</span>
                  <span className="text-sm font-mono text-cyan-300">
                    {diagramSvg && result 
                       ? (result.visual_data.propagator_type === 'gluon' ? 'QCD (Strong)' 
                          : result.visual_data.propagator_type === 'photon' ? 'QED (EM)' : 'Weak')
                       : '-'}
                  </span>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;