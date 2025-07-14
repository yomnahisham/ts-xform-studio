'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  HardDrive,
  Cpu,
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';

interface Register {
  name: string;
  value: number;
  color: string;
}

interface MemoryCell {
  address: number;
  value: number;
  isExecuting: boolean;
  isData: boolean;
}

interface SimulationState {
  step: number;
  pc: number;
  registers: { [key: string]: number };
  flags: { [key: string]: boolean };
  memory: { [key: string]: number };
}

interface SimulatorProps {
  isEnlarged: boolean;
  onToggleSize: () => void;
  darkMode: boolean;
  isaDefinition?: any;
  assemblyCode?: string;
}

export default function Simulator({ isEnlarged, onToggleSize, darkMode, isaDefinition, assemblyCode }: SimulatorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [executionSpeed, setExecutionSpeed] = useState(1000); // ms
  const [showSettings, setShowSettings] = useState(false);
  const [showRegisters, setShowRegisters] = useState(true);
  const [showMemory, setShowMemory] = useState(true);
  const [showFlags, setShowFlags] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulation states from xform
  const [simulationStates, setSimulationStates] = useState<SimulationState[]>([]);
  const [currentState, setCurrentState] = useState<SimulationState | null>(null);

  // Register colors
  const registerColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  // Get registers from current state or ISA definition
  const getRegisters = (): Register[] => {
    if (currentState && currentState.registers) {
      // Use a Set to ensure unique register names
      const uniqueRegisters = new Map<string, number>();
      Object.entries(currentState.registers).forEach(([name, value]) => {
        uniqueRegisters.set(name, value as number);
      });
      
      return Array.from(uniqueRegisters.entries()).map(([name, value], index) => ({
        name,
        value,
        color: registerColors[index % registerColors.length]
      }));
    }
    
    // Fallback to ISA definition
    if (isaDefinition?.registers?.general_purpose) {
      return isaDefinition.registers.general_purpose.map((reg: any, index: number) => ({
        name: typeof reg === 'string' ? reg : reg.name || `reg${index}`,
        value: 0,
        color: registerColors[index % registerColors.length]
      }));
    }
    
    // Default ZX16 registers
    return [
      { name: 'x0', value: 0x0000, color: '#3B82F6' },
      { name: 'x1', value: 0x0000, color: '#10B981' },
      { name: 'x2', value: 0x0000, color: '#F59E0B' },
      { name: 'x3', value: 0x0000, color: '#EF4444' },
      { name: 'x4', value: 0x0000, color: '#8B5CF6' },
      { name: 'x5', value: 0x0000, color: '#EC4899' },
      { name: 'x6', value: 0x0000, color: '#06B6D4' },
      { name: 'x7', value: 0x0000, color: '#84CC16' },
    ];
  };

  const registers = getRegisters();

  // Get memory from current state
  const getMemory = (): MemoryCell[] => {
    const cells: MemoryCell[] = [];
    const memoryData = currentState?.memory || {};
    
    for (let i = 0; i < 256; i += 2) { // 16-bit words
      cells.push({
        address: i,
        value: memoryData[i] || 0,
        isExecuting: currentState?.pc === i,
        isData: i >= 32 // First 32 bytes are typically code
      });
    }
    return cells;
  };

  const memory = getMemory();

  // Get flags from current state
  const getFlags = () => {
    if (currentState?.flags) {
      return currentState.flags;
    }
    return {
      Z: false, // Zero
      N: false, // Negative
      C: false, // Carry
      V: false, // Overflow
    };
  };

  const flags = getFlags();
  const pc = currentState?.pc || 32;
  const sp = currentState?.registers?.sp || 0xFFFF;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Run simulation with xform
  const runSimulation = async (steps: number = 1) => {
    console.log('Simulator received:', { isaDefinition, assemblyCode });
    
    if (!isaDefinition || !assemblyCode) {
      setError(`No ISA definition or assembly code provided. ISA: ${!!isaDefinition}, Assembly: ${!!assemblyCode}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isaDefinition, 
          assemblyCode, 
          steps 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Simulation failed');
      }

      setSimulationStates(data.states || []);
      if (data.states && data.states.length > 0) {
        setCurrentState(data.states[data.states.length - 1]);
        setCurrentStep(data.states.length - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute next step
  const executeStep = () => {
    if (currentStep < simulationStates.length - 1) {
      setCurrentStep(prev => prev + 1);
      setCurrentState(simulationStates[currentStep + 1]);
    } else {
      // Run one more step
      runSimulation(1);
    }
  };

  // Start/stop simulation
  const toggleSimulation = () => {
    if (isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
    } else {
      // Initialize simulation if not already done
      if (simulationStates.length === 0) {
        runSimulation(10); // Run 10 steps initially
      } else {
        intervalRef.current = setInterval(executeStep, executionSpeed);
        setIsRunning(true);
      }
    }
  };

  // Reset simulation
  const resetSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setCurrentStep(0);
    setSimulationStates([]);
    setCurrentState(null);
    setError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const bgColor = darkMode ? 'bg-[#1e1e1e]' : 'bg-white';
  const borderColor = darkMode ? 'border-[#3e3e42]' : 'border-gray-200';
  const textColor = darkMode ? 'text-[#cccccc]' : 'text-gray-800';
  const secondaryTextColor = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`flex flex-col h-full ${bgColor} ${borderColor} border-l`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${borderColor} ${bgColor}`}>
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-500" />
          <span className={`font-semibold ${textColor}`}>Simulator</span>
          <span className={`text-xs ${secondaryTextColor}`}>Step: {currentStep}</span>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Controls */}
          <button
            onClick={toggleSimulation}
            className={`p-1.5 rounded transition-colors ${
              isRunning 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
            title={isRunning ? 'Pause' : 'Run'}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <button
            onClick={resetSimulation}
            className="p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded transition-colors ${
              showSettings 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={onToggleSize}
            className="p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title={isEnlarged ? 'Minimize' : 'Maximize'}
          >
            {isEnlarged ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`px-4 py-2 border-b ${borderColor} ${bgColor}`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textColor}`}>Execution Speed (ms)</span>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={executionSpeed}
                onChange={(e) => setExecutionSpeed(Number(e.target.value))}
                className="w-24"
              />
              <span className={`text-xs ${secondaryTextColor}`}>{executionSpeed}ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${textColor}`}>ISA</span>
              <span className={`text-xs ${secondaryTextColor}`}>
                {typeof isaDefinition?.name === 'string' ? isaDefinition.name : 'Not loaded'}
              </span>
            </div>
            {error && (
              <div className="text-red-500 text-xs">
                Error: {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
          
          {/* Left Panel - Registers and Flags */}
          <div className={`border-r ${borderColor} flex flex-col`}>
            
            {/* Registers */}
            <div className="flex-1 min-h-0">
              <div className={`flex items-center justify-between px-3 py-2 border-b ${borderColor} ${bgColor}`}>
                <span className={`font-medium ${textColor}`}>Registers</span>
                <button
                  onClick={() => setShowRegisters(!showRegisters)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {showRegisters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              
              {showRegisters && (
                <div className="p-3 space-y-2 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {registers.map((reg, index) => (
                      <div
                        key={`${reg.name}-${index}`}
                        className={`p-2 rounded border ${borderColor} ${bgColor}`}
                        style={{ borderLeftColor: reg.color, borderLeftWidth: '4px' }}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-mono text-sm font-bold ${textColor}`}>{reg.name}</span>
                          <span className={`font-mono text-sm ${textColor}`}>
                            0x{reg.value.toString(16).toUpperCase().padStart(4, '0')}
                          </span>
                        </div>
                        <div className={`text-xs ${secondaryTextColor}`}>
                          {reg.value.toString(10).padStart(5, ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Flags */}
            <div className={`border-t ${borderColor}`}>
              <div className={`flex items-center justify-between px-3 py-2 border-b ${borderColor} ${bgColor}`}>
                <span className={`font-medium ${textColor}`}>Flags</span>
                <button
                  onClick={() => setShowFlags(!showFlags)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {showFlags ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              
              {showFlags && (
                <div className="p-3">
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(flags).map(([flag, value]) => (
                      <div
                        key={flag}
                        className={`p-2 rounded text-center border ${borderColor} ${bgColor}`}
                      >
                        <div className={`text-sm font-bold ${textColor}`}>{flag}</div>
                        <div className={`text-xs ${value ? 'text-green-600' : 'text-red-600'}`}>
                          {value ? '1' : '0'}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Special Registers */}
                  <div className="mt-3 space-y-2">
                    <div className={`flex justify-between items-center p-2 rounded border ${borderColor} ${bgColor}`}>
                      <span className={`text-sm ${textColor}`}>PC</span>
                      <span className={`font-mono text-sm ${textColor}`}>0x{pc.toString(16).toUpperCase().padStart(4, '0')}</span>
                    </div>
                    <div className={`flex justify-between items-center p-2 rounded border ${borderColor} ${bgColor}`}>
                      <span className={`text-sm ${textColor}`}>SP</span>
                      <span className={`font-mono text-sm ${textColor}`}>0x{sp.toString(16).toUpperCase().padStart(4, '0')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Memory */}
          <div className="flex flex-col">
            <div className={`flex items-center justify-between px-3 py-2 border-b ${borderColor} ${bgColor}`}>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-500" />
                <span className={`font-medium ${textColor}`}>Memory</span>
              </div>
              <button
                onClick={() => setShowMemory(!showMemory)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {showMemory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            
            {showMemory && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-8 gap-1">
                  {memory.slice(0, 128).map((cell) => (
                    <div
                      key={cell.address}
                      className={`p-1 rounded text-center border text-xs font-mono ${
                        cell.isExecuting 
                          ? 'bg-yellow-100 border-yellow-400 text-yellow-800' 
                          : cell.isData 
                            ? 'bg-blue-50 border-blue-200 text-blue-800'
                            : `${bgColor} ${borderColor} ${textColor}`
                      }`}
                      title={`Address: 0x${cell.address.toString(16).toUpperCase().padStart(4, '0')} = 0x${cell.value.toString(16).toUpperCase().padStart(4, '0')}`}
                    >
                      <div className="text-xs opacity-60">
                        {cell.address.toString(16).toUpperCase().padStart(2, '0')}
                      </div>
                      <div className="font-bold">
                        {cell.value.toString(16).toUpperCase().padStart(4, '0')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 