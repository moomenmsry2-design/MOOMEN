
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Calculator, Upload, Loader2, PenTool, X, Check, Eraser } from 'lucide-react';
import { BodyParams, SimulationStep, Language } from '../types';
import { TIME_STEP, MAX_TIME, COLOR_BODY_A, COLOR_BODY_B } from '../constants';
import { explainSimulationOutcome, extractSimulationParamsFromImage } from '../services/geminiService';

interface SimulationProps {
  bodyA: BodyParams;
  setBodyA: (b: BodyParams) => void;
  bodyB: BodyParams;
  setBodyB: (b: BodyParams) => void;
  onAnalysisUpdate: (text: string) => void;
  language: Language;
}

// --- Internal Component: Graph Builder Modal ---
const GraphBuilder: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (points: { t: number, v: number }[]) => void;
  initialPoints: { t: number, v: number }[];
  color: string;
  language: Language;
}> = ({ isOpen, onClose, onSave, initialPoints, color, language }) => {
  const [points, setPoints] = useState<{ t: number, v: number }[]>([]);
  
  useEffect(() => {
    if (isOpen) {
      // Initialize with sorted points, or default to start and end 0 if empty
      const p = initialPoints.length > 0 ? [...initialPoints].sort((a,b) => a.t - b.t) : [{t: 0, v: 0}, {t: 20, v: 0}];
      setPoints(p);
    }
  }, [isOpen, initialPoints]);

  if (!isOpen) return null;

  const width = 600;
  const height = 300;
  const padding = 40;
  const tMax = 20;
  const vMin = -10;
  const vMax = 10;

  const tToX = (t: number) => padding + (t / tMax) * (width - 2 * padding);
  const vToY = (v: number) => height - padding - ((v - vMin) / (vMax - vMin)) * (height - 2 * padding);
  
  const xToT = (x: number) => Math.max(0, Math.min(tMax, ((x - padding) / (width - 2 * padding)) * tMax));
  const yToV = (y: number) => Math.max(vMin, Math.min(vMax, vMin + ((height - padding - y) / (height - 2 * padding)) * (vMax - vMin)));

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking close to existing point to remove
    const clickedPointIndex = points.findIndex(p => {
       const px = tToX(p.t);
       const py = vToY(p.v);
       return Math.sqrt((x-px)**2 + (y-py)**2) < 10;
    });

    if (clickedPointIndex >= 0) {
      // Don't remove first or last to keep domain valid
      if (points.length > 2 && clickedPointIndex !== 0 && clickedPointIndex !== points.length - 1) {
         const newPoints = points.filter((_, i) => i !== clickedPointIndex);
         setPoints(newPoints);
      }
    } else {
      // Add new point
      const t = Number(xToT(x).toFixed(1));
      const v = Number(yToV(y).toFixed(1));
      const newPoints = [...points, { t, v }].sort((a, b) => a.t - b.t);
      setPoints(newPoints);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-space-800 border border-space-700 rounded-xl p-6 w-full max-w-3xl flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <PenTool size={20} className="text-neon-blue"/>
            {language === 'ar' ? 'رسم بياني السرعة-الزمن v(t)' : language === 'he' ? 'בנה גרף מהירות-זמן v(t)' : 'Draw Velocity-Time Graph v(t)'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded-full text-slate-400 hover:text-red-500"><X size={20}/></button>
        </div>

        <div className="text-slate-400 text-sm mb-4">
          {language === 'ar' ? 'انقر لإضافة نقاط. انقر على نقطة لإزالتها.' : language === 'he' ? 'לחץ להוספת נקודות. לחץ על נקודה כדי להסיר.' : 'Click to add points. Click an existing point to remove it.'}
        </div>

        <div className="relative bg-space-900 rounded-lg border border-space-700 overflow-hidden cursor-crosshair select-none mx-auto">
          <svg width={width} height={height} onClick={handleSvgClick}>
            {/* Grid */}
            {Array.from({length: 11}).map((_, i) => {
              const y = vToY(vMin + i * 2);
              return <line key={`h${i}`} x1={padding} y1={y} x2={width-padding} y2={y} stroke="#23263A" strokeWidth="1" />;
            })}
             {Array.from({length: 11}).map((_, i) => {
              const x = tToX(i * 2);
              return <line key={`v${i}`} x1={x} y1={padding} x2={x} y2={height-padding} stroke="#23263A" strokeWidth="1" />;
            })}
            
            {/* Zero Axis */}
            <line x1={padding} y1={vToY(0)} x2={width-padding} y2={vToY(0)} stroke="#64748b" strokeWidth="2" />

            {/* Path */}
            <path 
              d={`M ${points.map(p => `${tToX(p.t)} ${vToY(p.v)}`).join(' L ')}`}
              fill="none"
              stroke={color}
              strokeWidth="3"
            />
            
            {/* Points */}
            {points.map((p, i) => (
              <circle 
                key={i} 
                cx={tToX(p.t)} 
                cy={vToY(p.v)} 
                r="6" 
                fill={color}
                stroke="#fff"
                strokeWidth="2"
                className="hover:r-8 transition-all"
              />
            ))}

            {/* Labels */}
            <text x={width/2} y={height-5} fill="#94a3b8" textAnchor="middle" fontSize="12">Time (s)</text>
            <text x={10} y={height/2} fill="#94a3b8" textAnchor="middle" transform={`rotate(-90, 10, ${height/2})`} fontSize="12">Velocity (m/s)</text>
          </svg>
        </div>

        <div className="flex justify-end gap-3 mt-6">
           <button 
             onClick={() => setPoints([{t: 0, v: 0}, {t: 20, v: 0}])}
             className="px-4 py-2 text-slate-400 hover:text-white flex items-center gap-2"
           >
             <Eraser size={16}/> {language === 'ar' ? 'مسح' : language === 'he' ? 'נקה' : 'Reset'}
           </button>
           <button 
             onClick={() => onSave(points)}
             className="px-6 py-2 bg-neon-blue text-black font-bold rounded-lg hover:scale-105 transition-transform flex items-center gap-2"
           >
             <Check size={18}/> {language === 'ar' ? 'تطبيق الرسم البياني' : language === 'he' ? 'החל גרף' : 'Apply Graph'}
           </button>
        </div>
      </div>
    </div>
  );
};


// --- Main Simulation Component ---

const Simulation: React.FC<SimulationProps> = ({ bodyA, setBodyA, bodyB, setBodyB, onAnalysisUpdate, language }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [simData, setSimData] = useState<SimulationStep[]>([]);
  const [meetingPoint, setMeetingPoint] = useState<{t: number, x: number} | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Graph Builder State
  const [isGraphBuilderOpen, setIsGraphBuilderOpen] = useState(false);
  const [editingBody, setEditingBody] = useState<'A' | 'B' | null>(null);

  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Physics Logic Helpers
  const calculateStateAtTime = (body: BodyParams, t: number) => {
    // 1. Custom Graph Mode (Piecewise v(t))
    if (body.isCustomGraph && body.graphPoints && body.graphPoints.length >= 2) {
       const sortedPoints = [...body.graphPoints].sort((a,b) => a.t - b.t);
       
       // Calculate position by integrating velocity
       let x = body.x0;
       let v = 0;
       
       // If t is 0, just return initial
       if (t <= 0) return { x: body.x0, v: sortedPoints[0].v };

       // Integrate through segments until we reach current t
       for (let i = 0; i < sortedPoints.length - 1; i++) {
         const p1 = sortedPoints[i];
         const p2 = sortedPoints[i+1];
         
         if (p1.t >= t) break; // Segment is in future

         const segmentEnd = Math.min(p2.t, t); // Clamp to current time if inside this segment
         const dt = segmentEnd - p1.t;
         
         if (dt <= 0) continue;

         // Acceleration in this segment
         const slope = (p2.v - p1.v) / (p2.t - p1.t);
         
         // V at start of integration for this segment is p1.v
         // V at end of integration for this segment
         const vStart = p1.v;
         const vEnd = vStart + slope * dt;
         
         // Displacement = Area of trapezoid = average velocity * time
         const dx = ((vStart + vEnd) / 2) * dt;
         
         x += dx;
         v = vEnd;

         if (p2.t >= t) break; // We reached current time
       }
       return { x, v };
    } 
    
    // 2. Standard Constant Acceleration Mode
    else {
      const x = body.x0 + body.v0 * t + 0.5 * body.a * t * t;
      const v = body.v0 + body.a * t;
      return { x, v };
    }
  };

  // Pre-calculate data for graphs
  useEffect(() => {
    const data: SimulationStep[] = [];
    let meet: {t: number, x: number} | null = null;
    let foundMeet = false;

    // We calculate sequentially
    for (let t = 0; t <= MAX_TIME; t += TIME_STEP) {
      // Use the helper that supports both modes
      const stateA = calculateStateAtTime(bodyA, t);
      const stateB = calculateStateAtTime(bodyB, t);

      // Simple collision detection (crossing paths)
      if (!foundMeet && t > 0) {
        const prevStateA = calculateStateAtTime(bodyA, t - TIME_STEP);
        const prevStateB = calculateStateAtTime(bodyB, t - TIME_STEP);
        
        const prevXa = prevStateA.x;
        const prevXb = prevStateB.x;
        const xa = stateA.x;
        const xb = stateB.x;
        
        if ((prevXa < prevXb && xa >= xb) || (prevXa > prevXb && xa <= xb)) {
           meet = { t, x: xa };
           foundMeet = true;
        }
      }

      data.push({
        t: Number(t.toFixed(1)),
        bodyA: { x: stateA.x, v: stateA.v },
        bodyB: { x: stateB.x, v: stateB.v },
      });
    }
    setSimData(data);
    setMeetingPoint(meet);
    
    // Trigger AI analysis quietly
    explainSimulationOutcome(bodyA, bodyB, meet ? meet.t : null, language).then(onAnalysisUpdate);

  }, [bodyA, bodyB, onAnalysisUpdate, language]);

  // Animation Loop
  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const progress = (time - startTimeRef.current) / 1000; // seconds elapsed in real time
    
    const nextTime = currentTime + 0.05; // increment manually for smoothness

    if (nextTime >= MAX_TIME) {
      setIsPlaying(false);
      setCurrentTime(MAX_TIME);
    } else {
      setCurrentTime(nextTime);
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
       if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleImportImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const result = await extractSimulationParamsFromImage(base64);
      if (result) {
        if (result.bodyA) {
          // Reset custom graph if importing basic params
          setBodyA(prev => ({ ...prev, ...result.bodyA, isCustomGraph: false }));
        }
        if (result.bodyB) {
          setBodyB(prev => ({ ...prev, ...result.bodyB, isCustomGraph: false }));
        } else {
           setBodyB(prev => ({ ...prev, x0: 999, v0: 0, a: 0, isCustomGraph: false }));
        }
      }
      setIsImporting(false);
    };
    reader.readAsDataURL(file);
  };

  // Get current positions for visual display using the robust calculator
  const stateA = calculateStateAtTime(bodyA, currentTime);
  const stateB = calculateStateAtTime(bodyB, currentTime);
  const currentXa = stateA.x;
  const currentXb = stateB.x;

  // Zoom Logic
  const pixelsPerMeter = 5 * zoomLevel;
  const centerScreenX = 400; // center of track container
  
  const getPixelPos = (meters: number) => {
    return centerScreenX + (meters - panOffset) * pixelsPerMeter;
  };

  const openGraphBuilder = (bodyId: 'A' | 'B') => {
    setEditingBody(bodyId);
    setIsGraphBuilderOpen(true);
  };

  const saveGraph = (points: {t: number, v: number}[]) => {
    if (editingBody === 'A') {
      setBodyA({ ...bodyA, isCustomGraph: true, graphPoints: points });
    } else {
      setBodyB({ ...bodyB, isCustomGraph: true, graphPoints: points });
    }
    setIsGraphBuilderOpen(false);
  };

  return (
    <div className="flex flex-col h-full gap-4 text-slate-200">
      
      {/* Graph Builder Modal */}
      <GraphBuilder 
        isOpen={isGraphBuilderOpen} 
        onClose={() => setIsGraphBuilderOpen(false)}
        onSave={saveGraph}
        initialPoints={editingBody === 'A' ? bodyA.graphPoints || [] : bodyB.graphPoints || []}
        color={editingBody === 'A' ? COLOR_BODY_A : COLOR_BODY_B}
        language={language}
      />

      {/* --- Visual Track --- */}
      <div className="relative h-48 bg-space-800 rounded-xl border border-space-700 overflow-hidden shadow-inner group">
        <div className="absolute top-2 right-2 flex gap-2 z-20 opacity-50 group-hover:opacity-100 transition-opacity">
           <button onClick={() => setZoomLevel(z => Math.min(z * 1.2, 5))} className="p-1 bg-space-700 rounded hover:bg-neon-blue hover:text-black"><ZoomIn size={16}/></button>
           <button onClick={() => setZoomLevel(z => Math.max(z / 1.2, 0.2))} className="p-1 bg-space-700 rounded hover:bg-neon-blue hover:text-black"><ZoomOut size={16}/></button>
        </div>
        
        {/* Track Markings */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/2 w-full h-1 bg-space-700 -translate-y-1/2"></div>
          {Array.from({ length: 41 }).map((_, i) => {
             const meter = Math.floor(panOffset - 200/pixelsPerMeter) + i * (100/pixelsPerMeter); 
             const px = getPixelPos(meter);
             if (px < -100 || px > 2000) return null;
             return (
               <div key={i} className="absolute top-1/2 h-4 w-0.5 bg-space-600 -translate-y-1/2 transition-all duration-75" style={{ left: px }}>
                 <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] text-space-600 font-mono">{Math.round(meter)}m</span>
               </div>
             )
          })}
        </div>

        {/* Object A */}
        <div 
          className="absolute top-1/2 w-12 h-8 -mt-8 rounded-lg border-2 flex items-center justify-center transition-all duration-75 shadow-[0_0_15px_rgba(76,201,240,0.5)]"
          style={{ 
            left: getPixelPos(currentXa) - 24, // center it
            borderColor: bodyA.color,
            backgroundColor: `${bodyA.color}20`
          }}
        >
          <span className="text-xs font-bold" style={{color: bodyA.color}}>A</span>
        </div>

        {/* Object B */}
        <div 
          className="absolute top-1/2 w-12 h-8 mt-1 rounded-lg border-2 flex items-center justify-center transition-all duration-75 shadow-[0_0_15px_rgba(247,37,133,0.5)]"
          style={{ 
            left: getPixelPos(currentXb) - 24,
            borderColor: bodyB.color,
            backgroundColor: `${bodyB.color}20`
          }}
        >
          <span className="text-xs font-bold" style={{color: bodyB.color}}>B</span>
        </div>
        
        {/* Collision Marker */}
        {meetingPoint && currentTime >= meetingPoint.t && (
          <div className="absolute top-1/2 w-1 h-16 bg-white -translate-y-1/2 animate-pulse" style={{ left: getPixelPos(meetingPoint.x) }}>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-red-500 text-white px-1 rounded">Crash!</div>
          </div>
        )}

      </div>

      {/* --- Controls & Inputs --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Playback Controls */}
        <div className="md:col-span-12 flex flex-wrap items-center justify-center gap-4 bg-space-800 p-2 rounded-xl border border-space-700">
           <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-neon-blue text-black rounded-full hover:scale-105 transition-transform">
             {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />}
           </button>
           <button onClick={handleReset} className="p-3 bg-space-700 text-white rounded-full hover:bg-space-600 transition-colors">
             <RotateCcw size={20} />
           </button>
           
           <div className="h-8 w-[1px] bg-space-700 mx-2"></div>

           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImportImage}/>
           <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2 bg-space-700 rounded-lg text-sm hover:bg-neon-purple hover:text-white transition-colors"
           >
             {isImporting ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16} />}
             AI Import
           </button>

           <div className="flex flex-col items-center min-w-[100px] ml-auto md:ml-0">
             <span className="text-xs text-slate-400 font-mono">TIME</span>
             <span className="text-xl font-mono text-neon-blue">{currentTime.toFixed(2)}s</span>
           </div>
           <div className="w-full md:max-w-xs mx-4">
             <input 
               type="range" 
               min="0" 
               max={MAX_TIME} 
               step="0.01" 
               value={currentTime}
               onChange={(e) => {
                 setIsPlaying(false);
                 setCurrentTime(parseFloat(e.target.value));
               }}
               className="w-full h-2 bg-space-600 rounded-lg appearance-none cursor-pointer accent-neon-blue"
             />
           </div>
        </div>

        {/* Config Body A */}
        <div className="md:col-span-6 bg-space-800 p-4 rounded-xl border border-l-4 border-space-700" style={{ borderLeftColor: bodyA.color }}>
           <div className="flex justify-between items-start mb-3">
             <h3 className="font-bold flex items-center gap-2" style={{color: bodyA.color}}>
               Object A
               {bodyA.isCustomGraph && <span className="text-[10px] bg-space-700 px-1 rounded text-white border border-white/20">Graph Mode</span>}
             </h3>
             <button onClick={() => openGraphBuilder('A')} className="text-xs flex items-center gap-1 bg-space-700 px-2 py-1 rounded hover:bg-white hover:text-black transition-colors">
               <PenTool size={12}/> {language === 'ar' ? 'رسم' : language === 'he' ? 'שרטוט' : 'Draw Graph'}
             </button>
           </div>
           
           {!bodyA.isCustomGraph ? (
             <div className="grid grid-cols-3 gap-2">
                <label className="text-xs text-slate-400">Position (m)
                  <input type="number" value={bodyA.x0} onChange={e => setBodyA({...bodyA, x0: parseFloat(e.target.value)})} className="w-full bg-space-900 border border-space-700 p-1 rounded text-white mt-1"/>
                </label>
                <label className="text-xs text-slate-400">Velocity (m/s)
                  <input type="number" value={bodyA.v0} onChange={e => setBodyA({...bodyA, v0: parseFloat(e.target.value)})} className="w-full bg-space-900 border border-space-700 p-1 rounded text-white mt-1"/>
                </label>
                <label className="text-xs text-slate-400">Accel (m/s²)
                  <input type="number" value={bodyA.a} onChange={e => setBodyA({...bodyA, a: parseFloat(e.target.value)})} className="w-full bg-space-900 border border-space-700 p-1 rounded text-white mt-1"/>
                </label>
             </div>
           ) : (
             <div className="text-sm text-slate-400 p-2 bg-space-900 rounded border border-dashed border-space-600">
               Controlled by custom velocity graph.
               <div className="mt-2 text-xs">
                 <label>Start Pos (m): </label>
                 <input type="number" value={bodyA.x0} onChange={e => setBodyA({...bodyA, x0: parseFloat(e.target.value)})} className="w-16 bg-space-800 border border-space-700 p-0.5 rounded text-white ml-1"/>
               </div>
               <button onClick={() => setBodyA({...bodyA, isCustomGraph: false})} className="mt-2 text-xs text-red-400 underline">Switch to Standard Mode</button>
             </div>
           )}
        </div>

        {/* Config Body B */}
        <div className="md:col-span-6 bg-space-800 p-4 rounded-xl border border-l-4 border-space-700" style={{ borderLeftColor: bodyB.color }}>
           <div className="flex justify-between items-start mb-3">
             <h3 className="font-bold flex items-center gap-2" style={{color: bodyB.color}}>
               Object B
               {bodyB.isCustomGraph && <span className="text-[10px] bg-space-700 px-1 rounded text-white border border-white/20">Graph Mode</span>}
             </h3>
             <button onClick={() => openGraphBuilder('B')} className="text-xs flex items-center gap-1 bg-space-700 px-2 py-1 rounded hover:bg-white hover:text-black transition-colors">
               <PenTool size={12}/> {language === 'ar' ? 'رسم' : language === 'he' ? 'שרטוט' : 'Draw Graph'}
             </button>
           </div>

           {!bodyB.isCustomGraph ? (
             <div className="grid grid-cols-3 gap-2">
                <label className="text-xs text-slate-400">Position (m)
                  <input type="number" value={bodyB.x0} onChange={e => setBodyB({...bodyB, x0: parseFloat(e.target.value)})} className="w-full bg-space-900 border border-space-700 p-1 rounded text-white mt-1"/>
                </label>
                <label className="text-xs text-slate-400">Velocity (m/s)
                  <input type="number" value={bodyB.v0} onChange={e => setBodyB({...bodyB, v0: parseFloat(e.target.value)})} className="w-full bg-space-900 border border-space-700 p-1 rounded text-white mt-1"/>
                </label>
                <label className="text-xs text-slate-400">Accel (m/s²)
                  <input type="number" value={bodyB.a} onChange={e => setBodyB({...bodyB, a: parseFloat(e.target.value)})} className="w-full bg-space-900 border border-space-700 p-1 rounded text-white mt-1"/>
                </label>
             </div>
           ) : (
             <div className="text-sm text-slate-400 p-2 bg-space-900 rounded border border-dashed border-space-600">
               Controlled by custom velocity graph.
               <div className="mt-2 text-xs">
                 <label>Start Pos (m): </label>
                 <input type="number" value={bodyB.x0} onChange={e => setBodyB({...bodyB, x0: parseFloat(e.target.value)})} className="w-16 bg-space-800 border border-space-700 p-0.5 rounded text-white ml-1"/>
               </div>
               <button onClick={() => setBodyB({...bodyB, isCustomGraph: false})} className="mt-2 text-xs text-red-400 underline">Switch to Standard Mode</button>
             </div>
           )}
        </div>
      </div>

      {/* --- Graphs --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-64">
        {/* Position Graph */}
        <div className="bg-space-800 p-4 rounded-xl border border-space-700 flex flex-col">
          <h4 className="text-sm font-bold text-slate-400 mb-2">Position vs Time x(t)</h4>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#23263A" />
                <XAxis dataKey="t" stroke="#94a3b8" label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis stroke="#94a3b8" label={{ value: 'Pos (m)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151725', borderColor: '#23263A', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="bodyA.x" stroke={COLOR_BODY_A} dot={false} strokeWidth={2} name="Object A" />
                <Line type="monotone" dataKey="bodyB.x" stroke={COLOR_BODY_B} dot={false} strokeWidth={2} name="Object B" />
                <ReferenceLine x={currentTime} stroke="white" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Velocity Graph */}
        <div className="bg-space-800 p-4 rounded-xl border border-space-700 flex flex-col">
          <h4 className="text-sm font-bold text-slate-400 mb-2">Velocity vs Time v(t)</h4>
          <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#23263A" />
                <XAxis dataKey="t" stroke="#94a3b8" label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis stroke="#94a3b8" label={{ value: 'Vel (m/s)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151725', borderColor: '#23263A', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="bodyA.v" stroke={COLOR_BODY_A} dot={false} strokeWidth={2} name="Object A" />
                <Line type="monotone" dataKey="bodyB.v" stroke={COLOR_BODY_B} dot={false} strokeWidth={2} name="Object B" />
                <ReferenceLine x={currentTime} stroke="white" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
