import { GoogleGenAI, Type } from "@google/genai";

// --- TYPES ---
export interface ExternalLeg {
  role: "incoming" | "outgoing";
  type: "fermion" | "gauge_boson" | "scalar";
  isAntiparticle: boolean;
  name: string;          // canonical: "gluon", "u", "e-"
  displayLabel: string;  // visual: "g", "u", "e⁻"
}

export interface VisualData {
  topology: 'decay' | 's-channel' | 't-channel' | 'contact' | 'associated' | 'self-energy' | 'triangle' | 'unknown';
  propagator_type: 'gluon' | 'photon' | 'weak' | 'scalar' | 'straight' | 'none';
  incoming: string[];
  outgoing: string[];
  external_legs: ExternalLeg[];
}

export interface Agent2Result {
  status: 'valid' | 'invalid';
  physics_description: string;
  visual_data: VisualData;
}

// --- ERROR HANDLING HELPERS ---

function isQuotaError(error: any): boolean {
  const msg = error?.message || '';
  return msg.includes('429') || msg.includes('quota') || error?.status === 429;
}

async function generateContentWithRetry(ai: GoogleGenAI, model: string, params: any, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({
        model: model,
        ...params
      });
    } catch (e: any) {
      lastError = e;
      // Fail fast on quota errors (no point retrying)
      if (isQuotaError(e)) throw e;
      // Exponential backoff for transient errors (500, 503, etc.)
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, i)));
    }
  }
  throw lastError;
}

// --- LOCAL FALLBACK HELPERS ---
const PARTICLE_MAP: Record<string, string> = {
  '\\gamma': 'photon', 'gamma': 'photon', 'photon': 'photon',
  'g': 'gluon', 'gluon': 'gluon',
  'e': 'e-', 'e-': 'e-', 'e+': 'e+',
  'mu': 'mu-', 'mu-': 'mu-', 'mu+': 'mu+',
  'u': 'u', 'd': 'd', 's': 's', 'c': 'c', 'b': 'b', 't': 't',
  'w': 'W', 'z': 'Z'
};

function normalizeToken(token: string): string {
  let t = token.replace(/[{}]/g, '');
  let isAnti = false;
  if (t.startsWith('\\bar') || t.startsWith('anti-')) {
    isAnti = true;
    t = t.replace(/^\\bar\s?|^anti-/, '');
  }
  let cleanName = PARTICLE_MAP[t] || t;
  if (isAnti && !cleanName.startsWith('anti') && !cleanName.includes('+') && !cleanName.endsWith('-')) {
    if (cleanName === 'e-') return 'e+'; 
    return `anti-${cleanName}`;
  }
  return cleanName;
}

function getParticleMetadataLocal(canonicalName: string): Omit<ExternalLeg, 'role'> {
  let type: ExternalLeg['type'] = 'fermion';
  let isAntiparticle = false;
  let displayLabel = canonicalName;
  const isAnti = canonicalName.startsWith('anti-');
  const coreName = isAnti ? canonicalName.replace('anti-', '') : canonicalName;

  if (['gluon', 'photon', 'W', 'Z'].includes(coreName)) type = 'gauge_boson';
  
  // Unicode Mapping
  if (canonicalName === 'photon') displayLabel = 'γ';
  else if (canonicalName === 'gluon') displayLabel = 'g';
  else if (canonicalName === 'e-') displayLabel = 'e⁻';
  else if (canonicalName === 'e+') { displayLabel = 'e⁺'; isAntiparticle = true; }
  else if (canonicalName === 'mu-') displayLabel = 'μ⁻';
  else if (isAnti) displayLabel = `${coreName}\u0305`;

  return { name: canonicalName, type, isAntiparticle, displayLabel };
}

export function runTheoristAgentLocal(input: string): Agent2Result {
  const clean = input.toLowerCase().replace(/\\to|->|→| to /g, ' TO ');
  const [inStr, outStr] = clean.split(' TO ');
  const incoming = inStr ? inStr.split(/\s+/).filter(t=>t).map(normalizeToken) : [];
  const outgoing = outStr ? outStr.split(/\s+/).filter(t=>t).map(normalizeToken) : [];

  const external_legs: ExternalLeg[] = [
    ...incoming.map(n => ({ ...getParticleMetadataLocal(n), role: 'incoming' as const })),
    ...outgoing.map(n => ({ ...getParticleMetadataLocal(n), role: 'outgoing' as const }))
  ];

  return {
    status: 'valid',
    physics_description: 'Running in Local Mode (Quota Exceeded). Approximated physics topology.',
    visual_data: {
      topology: incoming.length === 1 ? 'decay' : 's-channel',
      propagator_type: 'straight',
      incoming,
      outgoing,
      external_legs
    }
  };
}

// --- AGENT 1: ORCHESTRATOR ---
export async function runOrchestratorAgent(input: string): Promise<'ANALYZE_THEORY' | 'PLAN_TOPOLOGY' | 'CHAT'> {
  if (!process.env.API_KEY) return 'PLAN_TOPOLOGY';

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await generateContentWithRetry(ai, 'gemini-2.5-flash', {
      contents: `Classify the intent of this physics query: "${input}".
      
      Rules:
      1. Return "CHAT" if the input is a conversational follow-up, a question about a concept, or asks for an explanation (e.g. "Why?", "Tell me about...", "What is X?").
      2. Return "ANALYZE_THEORY" if the input contains 'Lagrangian', 'Equation', 'Model', 'mathcal{L}', or asks about theoretical formulation.
      3. Return "PLAN_TOPOLOGY" if the input asks to 'Show', 'Draw', 'Visualize' or lists a particle process (e.g. "e- e+ -> ...").
      4. Default to "CHAT" if ambiguous (safest fallback).
      
      Return ONLY the string classification.`,
    });
    const text = response.text?.trim().toUpperCase();
    if (text === 'ANALYZE_THEORY') return 'ANALYZE_THEORY';
    if (text === 'PLAN_TOPOLOGY') return 'PLAN_TOPOLOGY';
    return 'CHAT';
  } catch (e) {
    if (isQuotaError(e)) {
      console.warn("Orchestrator Quota Exceeded. Defaulting to PLAN_TOPOLOGY.");
    } else {
      console.error("Orchestrator Error:", e);
    }
    return 'PLAN_TOPOLOGY';
  }
}

// --- AGENT 2: THEORIST ---
export async function runTheoristAgent(input: string, task: 'ANALYZE_THEORY' | 'PLAN_TOPOLOGY' | 'CHAT'): Promise<Agent2Result> {
  if (!process.env.API_KEY) return runTheoristAgentLocal(input);

  // BYPASS: If Orchestrator says 'CHAT', pass user input to Teacher
  if (task === 'CHAT') {
      return {
          status: 'valid',
          physics_description: `USER_QUESTION: ${input}`, 
          visual_data: {
              topology: 'unknown',
              propagator_type: 'straight',
              incoming: [],
              outgoing: [],
              external_legs: []
          }
      };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const schema = {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, enum: ["valid", "invalid"] },
      physics_description: { type: Type.STRING },
      visual_data: {
        type: Type.OBJECT,
        properties: {
          topology: { type: Type.STRING, enum: ["decay", "s-channel", "t-channel", "contact", "associated", "self-energy", "triangle", "unknown"] },
          propagator_type: { type: Type.STRING, enum: ["gluon", "photon", "weak", "scalar", "straight", "none"] },
          incoming: { type: Type.ARRAY, items: { type: Type.STRING } },
          outgoing: { type: Type.ARRAY, items: { type: Type.STRING } },
          external_legs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING, enum: ["incoming", "outgoing"] },
                type: { type: Type.STRING, enum: ["fermion", "gauge_boson", "scalar"] },
                isAntiparticle: { type: Type.BOOLEAN },
                name: { type: Type.STRING },
                displayLabel: { type: Type.STRING }
              },
              required: ["role", "type", "isAntiparticle", "name", "displayLabel"]
            }
          }
        },
        required: ["topology", "propagator_type", "incoming", "outgoing", "external_legs"]
      }
    },
    required: ["status", "physics_description", "visual_data"]
  };

  try {
    const response = await generateContentWithRetry(ai, 'gemini-3-pro-preview', {
      contents: `You are a Theoretical Physicist. Task: ${task}. Input: "${input}".
      
      CRITICAL RULES FOR JSON OUTPUT:
      1. 'visual_data.propagator_type' MUST be a single string.
      2. 'external_legs' MUST be populated.
      3. **Topology Rules:**
         - For Higgs Gluon Fusion (g g -> H): use topology "triangle".
         - For 1-Loop Self-Energy: use topology "self-energy".
         - For Higgs VBF: use topology "associated".
         
         **SPECIAL RULE FOR GLUON SCATTERING (g g -> g g):**
         - DEFAULT: use topology "t-channel" and propagator_type "gluon" (This is the dominant 3-gluon interaction).
         - ONLY if input specifically says "4-point", "contact", or "quartic": use topology "contact" and propagator_type "none".

      4. For Gluons: set 'type': 'gauge_boson', 'name': 'gluon', 'displayLabel': 'g'.
      5. For Anti-Quarks: set 'type': 'fermion', 'isAntiparticle': true, 'displayLabel': 'u\\u0305' (unicode bar).

      Example Valid JSON:
      {
        "status": "valid",
        "physics_description": "Standard Model process...",
        "visual_data": {
           "topology": "s-channel",
           "propagator_type": "gluon",
           "incoming": ["u", "anti-u"],
           "outgoing": ["g", "g"],
           "external_legs": [
              {"role": "incoming", "name": "u", "type": "fermion", ...},
              {"role": "outgoing", "name": "gluon", "type": "gauge_boson", ...}
           ]
        }
      }
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });

    if (response.text) return JSON.parse(response.text) as Agent2Result;
    throw new Error("Empty response");

  } catch (error) {
    if (isQuotaError(error)) {
        console.warn("Theorist Agent Quota Exceeded. Switching to Local Fallback.");
    } else {
        console.error("Gemini Theorist Error:", error);
    }
    return runTheoristAgentLocal(input);
  }
}

// --- AGENT 3: TEACHER ---
export async function runTeacherAgent(input: string, context?: string): Promise<string> {
  if (!process.env.API_KEY) return input;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await generateContentWithRetry(ai, 'gemini-2.5-flash', {
      contents: `You are a Professional Theoretical Physicist.
      
      INPUT: "${input}"
      PREVIOUS PHYSICS CONTEXT: "${context || 'None'}"

      INSTRUCTIONS:
      1. **CONTEXTUALIZE:** - If the user asks a follow-up question (e.g., "Trace techniques?"), answer it SPECIFICALLY regarding the "PREVIOUS PHYSICS CONTEXT" (e.g., how traces apply to the Moller/QED process mentioned).
         - If the context is empty, give a general but concise professional definition.
      
      2. **STRICT FORMATTING:**
         - **NO LATEX** allowed. Use Unicode (α, →, μ⁻).
         - **NO FILLER**. Do NOT say "Ah, excellent question" or "Let's dive in." Start the answer immediately.
         - **LENGTH:** Max 80 words. Keep it dense and technical.

      3. **TONE:**
         - Professional, Academic, Research-focused.
      
      4. **CLOSING:**
         - End with: "Any other details?"
      `,
    });
    return response.text || input;
  } catch (e) {
    if (isQuotaError(e)) {
        return `[Offline Mode] ${input}`;
    }
    return input;
  }
}