export type AgentRole = 'orchestrator' | 'theorist' | 'teacher' | 'illustrator';

export type AgentStatus = 'idle' | 'working' | 'success' | 'error' | 'waiting';

export interface Agent {
  id: AgentRole;
  name: string;
  description: string;
  status: AgentStatus;
  logs: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  agentId?: AgentRole;
  content: string;
  timestamp: Date;
}

export interface SimulationStep {
  agentId: AgentRole;
  logMessage: string;
  chatMessage?: string;
  delay: number; // Simulated processing time in ms
}