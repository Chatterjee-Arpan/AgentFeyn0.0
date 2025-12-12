import { VisualData, ExternalLeg } from './physics';

const COLORS = {
    fermion: '#f8fafc',
    gluon: '#ef4444',
    photon: '#3b82f6',
    weak: '#10b981', 
    text: '#94a3b8'
};

// --- LABEL CLEANING ---
function cleanLabel(latex: string): string {
  if (!latex) return "";
  let clean = latex;
  clean = clean.replace(/\\bar{([^}]+)}/g, "$1\u0305").replace(/\\bar\s+/g, "").replace(/[{}$^]/g, ""); 

  const map: Record<string, string> = {
    "\\nu": "ν", "nu": "ν", "neutrino": "ν",
    "\\mu": "μ", "mu": "μ", "\\tau": "τ", "tau": "τ",
    "\\gamma": "γ", "gamma": "γ", "photon": "γ",
    "\\pi": "π", "pi": "π",
    "e": "e", "g": "g", "W": "W", "Z": "Z", "H": "H"
  };

  Object.keys(map).forEach(key => { clean = clean.split(key).join(map[key]); });
  clean = clean.replace("-", "⁻").replace("+", "⁺");
  
  const subMap: Record<string, string> = { "e": "ₑ", "μ": "ᵤ", "τ": "ₜ", "u": "ᵤ", "d": "ᵈ" };
  clean = clean.replace(/_([a-zA-Z0-9\u0370-\u03FF]+)/g, (_, match) => {
      let m = match;
      if (map[`\\${match}`]) m = map[`\\${match}`]; 
      else if (map[match]) m = map[match];
      return subMap[m] || `_${m}`;
  });

  return clean;
}

// --- HELPER: CHARGE DETECTION ---
const getCharge = (label: string, name: string): number => {
    // 1. Explicit symbols
    if (label.includes('⁺') || label.includes('+')) return 1;
    if (label.includes('⁻') || label.includes('-')) return -1;
    
    // 2. Standard Model Defaults
    const n = name.toLowerCase();
    if (n === 'p' || n === 'u' || n === 'c' || n === 't' || n === 'w+') return 1;
    if (n === 'e' || n === 'mu' || n === 'tau' || n === 'd' || n === 's' || n === 'b' || n === 'w-') return -1;
    
    return 0;
};

// --- PATH GENERATORS ---

const generateWavyPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const ux = dx / dist;
    const uy = dy / dist;
    const nx = -uy;
    const ny = ux;
    const amplitude = 5; 
    const frequency = 0.15; 
    const steps = Math.max(20, Math.floor(dist)); 
    let d = `M ${x1} ${y1}`;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps; 
        const pos = t * dist;
        const wave = Math.sin(pos * frequency * 2 * Math.PI) * amplitude;
        const px = x1 + (ux * pos) + (nx * wave);
        const py = y1 + (uy * pos) + (ny * wave);
        d += ` L ${px} ${py}`;
    }
    return d;
};

const generateCurlyPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const loops = Math.floor(dist / 10);
    const step = dist / loops;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    let d = `M ${x1} ${y1}`;
    for (let i = 0; i < loops; i++) {
        const t = i * step;
        const cp1x = x1 + (t + step*0.3) * cosA - 10 * sinA;
        const cp1y = y1 + (t + step*0.3) * sinA + 10 * cosA;
        const cp2x = x1 + (t + step*0.7) * cosA + 7 * sinA;
        const cp2y = y1 + (t + step*0.7) * sinA - 7 * cosA;
        const endx = x1 + (t + step) * cosA;
        const endy = y1 + (t + step) * sinA;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endx} ${endy}`;
    }
    return d;
};

// --- RENDER HELPERS ---

const renderArrow = (x1: number, y1: number, x2: number, y2: number, color: string, reverse: boolean = false) => {
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const rot = reverse ? angle + 180 : angle;
    return `<path d="M-8,-5 L8,0 L-8,5 z" fill="${color}" transform="translate(${midX},${midY}) rotate(${rot})" />`;
};

const renderLeg = (x1: number, y1: number, x2: number, y2: number, leg: ExternalLeg | any, labelPos: 'start' | 'end') => {
    const type = leg?.type || 'fermion';
    const name = leg?.name || '';
    const label = cleanLabel(leg?.displayLabel || '?');
    
    let path = `M ${x1} ${y1} L ${x2} ${y2}`;
    let color = COLORS.fermion;
    let showArrow = false;
    let dash = '';

    if (name === 'gluon' || name === 'g') {
        path = generateCurlyPath(x1, y1, x2, y2);
        color = COLORS.gluon;
    } else if (name === 'photon' || name === 'gamma') {
        path = generateWavyPath(x1, y1, x2, y2);
        color = COLORS.photon;
    } else if (name.includes('W') || name.includes('Z')) {
        path = generateWavyPath(x1, y1, x2, y2); 
        dash = ''; 
        color = COLORS.weak;
    } else if (name.includes('Higgs') || name === 'H') {
        path = `M ${x1} ${y1} L ${x2} ${y2}`; // Straight
        dash = '6,4'; // Dashed
        color = COLORS.weak;
    } else {
        showArrow = true;
        color = COLORS.fermion;
    }

    let svg = `<path d="${path}" stroke="${color}" stroke-width="2" fill="none" stroke-dasharray="${dash}" />`;
    
    if (showArrow) {
        svg += renderArrow(x1, y1, x2, y2, color, leg?.isAntiparticle);
    }

    const lx = labelPos === 'start' ? x1 - 30 : x2 + 30;
    const ly = labelPos === 'start' ? y1 : y2;
    const dy = (y1 > 250) ? 10 : -10; 
    
    svg += `<text x="${lx}" y="${ly}" dy="${dy}" fill="${COLORS.text}" font-size="14" font-family="sans-serif" text-anchor="middle" font-weight="bold">${label}</text>`;

    return svg;
};

// --- VERTEX DOT RENDERER ---
const renderVertex = (x: number, y: number, color: string = COLORS.gluon) => {
    return `<circle cx="${x}" cy="${y}" r="5" fill="${color}" />`;
};

export function generateDiagram(data: VisualData): string {
    const { topology, propagator_type } = data;
    
    let legs = data.external_legs || [];
    if (!legs || legs.length === 0) {
        legs = [
            ...data.incoming.map(n => ({ role: 'incoming', name: n, type: (n==='gluon'||n==='photon')?'gauge_boson':'fermion', displayLabel: n })),
            ...data.outgoing.map(n => ({ role: 'outgoing', name: n, type: (n==='gluon'||n==='photon')?'gauge_boson':'fermion', displayLabel: n }))
        ] as any;
    }

    const legsIn = legs.filter(l => l.role === 'incoming');
    const legsOut = legs.filter(l => l.role === 'outgoing');

    // --- PROPAGATOR GENERATOR ---
    const getPropagator = (x1: number, y1: number, x2: number, y2: number) => {
        let svg = "";
        let pColor = COLORS.text;
        let pLabel = "";
        
        if (propagator_type === 'weak') {
            svg = `<path d="${generateWavyPath(x1, y1, x2, y2)}" stroke="${COLORS.weak}" stroke-width="2" fill="none" />`;
            pColor = COLORS.weak;
            // Determine W+, W-, or Z based on incoming charge conservation
            let netCharge = 0;
            legsIn.forEach(l => {
                const q = getCharge(cleanLabel(l.displayLabel), l.name);
                netCharge += (l.isAntiparticle ? -q : q);
            });
            // If roughly neutral, assume Z. If charged, W+ or W-
            if (Math.abs(netCharge) < 0.1) pLabel = "Z";
            else pLabel = netCharge > 0 ? "W⁺" : "W⁻";

        } else if (propagator_type === 'gluon') {
            svg = `<path d="${generateCurlyPath(x1, y1, x2, y2)}" stroke="${COLORS.gluon}" stroke-width="2" fill="none" />`;
            pColor = COLORS.gluon; pLabel = "g";
        } else if (propagator_type === 'photon') {
            svg = `<path d="${generateWavyPath(x1, y1, x2, y2)}" stroke="${COLORS.photon}" stroke-width="2" fill="none" />`;
            pColor = COLORS.photon; pLabel = "γ";
        } else if (propagator_type === 'scalar') {
            svg = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.weak}" stroke-width="2" stroke-dasharray="6,4" />`;
            pColor = COLORS.weak; pLabel = "H";
        } else {
            // STRAIGHT (FERMION)
            svg = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.fermion}" stroke-width="2" />`;
            svg += renderArrow(x1, y1, x2, y2, COLORS.fermion);
            pColor = COLORS.fermion; pLabel = "f";
        }
        return { svg, color: pColor, label: pLabel };
    };

    let content = "";
    let px1=0, py1=0, px2=0, py2=0;
    let propObj = { svg: "", color: "", label: "" };

    // --- TOPOLOGY TEMPLATES ---

    if (topology === 'contact') {
        content += renderLeg(100, 100, 400, 250, legsIn[0], 'start');
        content += renderLeg(100, 400, 400, 250, legsIn[1], 'start');
        content += renderLeg(400, 250, 700, 100, legsOut[0], 'end');
        content += renderLeg(400, 250, 700, 400, legsOut[1], 'end');
        content += renderVertex(400, 250, COLORS.gluon);
        
    } else if (topology === 'associated') {
        // H-SHAPE (Higgs VBF)
        content += renderLeg(50, 50, 300, 150, legsIn[0], 'start');
        content += renderLeg(50, 450, 300, 350, legsIn[1], 'start');
        
        // Vertical W/Z (Solid Wave)
        px1=300; py1=150; px2=300; py2=350;
        content += `<path d="${generateWavyPath(px1, py1, px2, py2)}" stroke="${COLORS.weak}" stroke-width="2" fill="none" />`;
        
        content += renderVertex(300, 150, COLORS.weak); 
        content += renderVertex(300, 350, COLORS.weak); 
        content += renderVertex(300, 250, COLORS.text); 

        const qTop = { type: 'fermion', displayLabel: "q'", name: 'quark', isAntiparticle: false };
        const qBot = { type: 'fermion', displayLabel: "q'", name: 'quark', isAntiparticle: false };
        content += renderLeg(300, 150, 750, 50, qTop, 'end');
        content += renderLeg(300, 350, 750, 450, qBot, 'end');
        
        content += `<line x1="300" y1="250" x2="600" y2="250" stroke="${COLORS.weak}" stroke-width="2" stroke-dasharray="6,4" />`;
        content += `<text x="620" y="250" fill="${COLORS.text}" font-size="16" dy="5" font-weight="bold">H</text>`;
        content += `<text x="270" y="250" fill="${COLORS.weak}" font-size="16" font-weight="bold" text-anchor="end" dominant-baseline="middle">W/Z</text>`;
        propObj.label = ""; 

    } else if (topology === 'triangle') {
        content += renderLeg(50, 100, 250, 150, legsIn[0], 'start');
        content += renderLeg(50, 400, 250, 350, legsIn[1], 'start');
        
        content += `<line x1="250" y1="150" x2="250" y2="350" stroke="${COLORS.fermion}" stroke-width="2" />`;
        content += renderArrow(250, 150, 250, 350, COLORS.fermion); 
        content += `<line x1="250" y1="350" x2="450" y2="250" stroke="${COLORS.fermion}" stroke-width="2" />`;
        content += renderArrow(250, 350, 450, 250, COLORS.fermion);
        content += `<line x1="450" y1="250" x2="250" y2="150" stroke="${COLORS.fermion}" stroke-width="2" />`;
        content += renderArrow(450, 250, 250, 150, COLORS.fermion);

        content += renderVertex(250, 150, COLORS.gluon);
        content += renderVertex(250, 350, COLORS.gluon);
        content += renderVertex(450, 250, COLORS.text);

        content += `<text x="300" y="250" fill="${COLORS.text}" font-size="12" text-anchor="middle">t</text>`;
        content += `<line x1="450" y1="250" x2="750" y2="250" stroke="${COLORS.weak}" stroke-width="2" stroke-dasharray="6,4" />`;
        content += `<text x="770" y="250" fill="${COLORS.text}" font-size="16" dy="5" font-weight="bold">H</text>`;
        
    } else if (topology === 'self-energy') {
        content += renderLeg(50, 250, 250, 250, legsIn[0], 'start');
        content += renderLeg(550, 250, 750, 250, legsOut[0], 'end');
        content += `<line x1="250" y1="250" x2="550" y2="250" stroke="${COLORS.fermion}" stroke-width="2" />`; 
        content += renderArrow(250, 250, 550, 250, COLORS.fermion);

        content += `<path d="M 250 250 A 150 150 0 0 1 550 250" stroke="${COLORS.photon}" stroke-width="2" fill="none" stroke-dasharray="5,3" />`;
        content += `<text x="400" y="150" fill="${COLORS.photon}" font-size="16">γ</text>`;
        content += renderVertex(250, 250, COLORS.photon);
        content += renderVertex(550, 250, COLORS.photon);

    } else {
        // STANDARD TOPOLOGIES
        let vColor = COLORS.fermion;
        if (propagator_type === 'gluon') vColor = COLORS.gluon;
        else if (propagator_type === 'photon') vColor = COLORS.photon;
        else if (propagator_type === 'weak') vColor = COLORS.weak;

        if (topology === 't-channel') {
            content += renderLeg(50, 50, 350, 150, legsIn[0], 'start');
            content += renderLeg(50, 450, 350, 350, legsIn[1], 'start');
            px1=350; py1=150; px2=350; py2=350;
            propObj = getPropagator(px1, py1, px2, py2);
            content += propObj.svg;
            content += renderVertex(350, 150, vColor);
            content += renderVertex(350, 350, vColor);
            content += renderLeg(350, 150, 750, 50, legsOut[0], 'end');
            content += renderLeg(350, 350, 750, 450, legsOut[1], 'end');

        } else if (topology === 's-channel') {
            content += renderLeg(50, 50, 300, 250, legsIn[0], 'start');
            content += renderLeg(50, 450, 300, 250, legsIn[1], 'start');
            px1=300; py1=250; px2=500; py2=250;
            propObj = getPropagator(px1, py1, px2, py2);
            content += propObj.svg;
            content += renderVertex(300, 250, vColor);
            content += renderVertex(500, 250, vColor);
            content += renderLeg(500, 250, 750, 50, legsOut[0], 'end');
            content += renderLeg(500, 250, 750, 450, legsOut[1], 'end');

        } else if (topology === 'decay') {
            // Case 1: Mediated 3-Body Decay (Muon, Beta) -> Requires Propagator (V-shape)
            if (legsOut.length >= 3) {
                content += renderLeg(100, 150, 350, 150, legsIn[0], 'start');
                content += renderVertex(350, 150, COLORS.weak);

                // Propagator (Vertical W-boson) - SOLID WAVY
                px1=350; py1=150; px2=350; py2=350;
                content += `<path d="${generateWavyPath(px1, py1, px2, py2)}" stroke="${COLORS.weak}" stroke-width="2" fill="none" />`;
                content += renderVertex(350, 350, COLORS.weak);

                content += renderLeg(350, 150, 700, 50, legsOut[0], 'end');
                content += renderLeg(350, 350, 700, 300, legsOut[1], 'end');
                content += renderLeg(350, 350, 700, 450, legsOut[2], 'end');
                
                // Smart W Labeling
                let qIn = getCharge(cleanLabel(legsIn[0].displayLabel), legsIn[0].name);
                let qOut1 = getCharge(cleanLabel(legsOut[0].displayLabel), legsOut[0].name);
                // W charge is approximately In - Out1
                let wLabel = (qIn - qOut1) > 0 ? "W⁺" : "W⁻";
                
                content += `<text x="320" y="250" fill="${COLORS.weak}" font-size="16" font-weight="bold" text-anchor="end">${wLabel}</text>`;

            } else {
                // Case 2: Fundamental 2-Body Decay (Top -> bW, Z -> ll) -> Single Vertex
                content += renderLeg(50, 250, 350, 250, legsIn[0], 'start');

                let boson = legsOut.find(l => l.type === 'gauge_boson' || l.type === 'scalar');
                let vertexColor = COLORS.fermion;
                if (boson) {
                    if (boson.name === 'gluon' || boson.name === 'g') vertexColor = COLORS.gluon;
                    else if (boson.name === 'photon' || boson.name === 'gamma') vertexColor = COLORS.photon;
                    else if (boson.name.includes('W') || boson.name.includes('Z') || boson.name.includes('Higgs')) vertexColor = COLORS.weak;
                }
                content += renderVertex(350, 250, vertexColor);

                if (legsOut.length > 0) content += renderLeg(350, 250, 650, 100, legsOut[0], 'end');
                if (legsOut.length > 1) content += renderLeg(350, 250, 650, 400, legsOut[1], 'end');
            }
        }
    }

    if (px1 !== 0 && propObj.label && topology !== 'decay') {
        const isVertical = Math.abs(px1 - px2) < 10;
        const isHorizontal = Math.abs(py1 - py2) < 10;
        let lx = (px1 + px2) / 2;
        let ly = (py1 + py2) / 2;

        if (isVertical) lx += 30;
        else if (isHorizontal) ly -= 20;
        else { lx += 20; ly -= 20; }

        content += `<text x="${lx}" y="${ly}" fill="${propObj.color}" font-size="16" font-weight="bold" dominant-baseline="middle">${propObj.label}</text>`;
    }

    return `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
}