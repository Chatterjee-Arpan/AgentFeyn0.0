import { Agent } from './types';

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    description: 'Intent & Task Router',
    status: 'idle',
    logs: ['System ready. Awaiting input.'],
  },
  {
    id: 'theorist',
    name: 'Theorist',
    description: 'Physics Engine (Agent 2)',
    status: 'idle',
    logs: ['Standard Model definitions loaded.'],
  },
  {
    id: 'teacher',
    name: 'Teacher',
    description: 'Explanation Bot (Agent 3)',
    status: 'idle',
    logs: ['Pedagogical module active.'],
  },
  {
    id: 'illustrator',
    name: 'Illustrator',
    description: 'SVG Artist (Agent 4)',
    status: 'idle',
    logs: ['Vector engine standby.'],
  },
];