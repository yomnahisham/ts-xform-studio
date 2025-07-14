import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import path from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { isaDefinition, assemblyCode, steps = 1 } = await request.json();

    if (!isaDefinition || !assemblyCode) {
      return NextResponse.json(
        { error: 'Missing required fields: isaDefinition and assemblyCode' },
        { status: 400 }
      );
    }

    const tempDir = tmpdir();
    const isaFile = path.join(tempDir, `isa_${Date.now()}.json`);
    const assemblyFile = path.join(tempDir, `assembly_${Date.now()}.s`);
    const outputFile = path.join(tempDir, `simulation_${Date.now()}.json`);
    let simulateScriptFile: string | undefined;

    try {
      // Check if we're using a built-in ISA name or a custom ISA definition
      const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python');
      let isaName = 'custom';
      
      if (typeof isaDefinition === 'string') {
        isaName = isaDefinition;
        // For built-in ISA, we don't need to write a file
      } else {
        // Write custom ISA definition to temporary file
        writeFileSync(isaFile, JSON.stringify(isaDefinition, null, 2));
        isaName = isaDefinition.name || 'Unknown';
      }

      // Write assembly code to temporary file
      writeFileSync(assemblyFile, assemblyCode);

      // Create Python script for simulation
      simulateScriptFile = path.join(tempDir, `simulate_${Date.now()}.py`);
      
      // Determine how to load the ISA based on whether it's built-in or custom
      const isaLoadCode = typeof isaDefinition === 'string' 
        ? `isa = loader.load_isa('${isaName}')`
        : `isa = loader.load_isa_from_file('${isaFile}')`;
        
      const simulateScript = `import sys
import json
sys.path.append('${process.cwd()}')
from isa_xform import ISALoader, Parser
from isa_xform.core import Assembler
from isa_xform.core.instruction_executor import InstructionExecutor, ExecutionContext
import json

# Load ISA
loader = ISALoader()
${isaLoadCode}

# Create parser and assembler
parser = Parser(isa)
assembler = Assembler(isa)

# Parse and assemble the code
ast_nodes = parser.parse('''${assemblyCode}''')
result = assembler.assemble(ast_nodes)

if not result.success:
    print("ERROR: Assembly failed")
    sys.exit(1)

# Get machine code
try:
    if hasattr(result, 'machine_code'):
        machine_code = result.machine_code
    else:
        machine_code = b''
except Exception as e:
    print(f"ERROR: Failed to get machine code: {e}")
    sys.exit(1)

# Xform Modular Simulator using InstructionExecutor
class XformSimulator:
    def __init__(self, isa, machine_code):
        self.isa = isa
        self.machine_code = machine_code
        self.pc = 0
        self.registers = {}
        self.memory = {}
        self.flags = {'Z': False, 'N': False, 'C': False, 'V': False}
        
        # Initialize registers from ISA
        if hasattr(isa, 'registers') and hasattr(isa.registers, 'general_purpose'):
            for reg in isa.registers.general_purpose:
                reg_name = reg.name if hasattr(reg, 'name') else reg
                self.registers[reg_name] = 0
        
        # Initialize memory with machine code
        for i, byte in enumerate(machine_code):
            self.memory[i] = byte
        
        # Create instruction executor
        self.executor = InstructionExecutor(isa)
        
        # Create execution context
        self.context = ExecutionContext()
        self.context.flags = self.flags
    
    def read_word(self, addr):
        """Read a 16-bit word from memory"""
        if addr in self.memory and addr + 1 in self.memory:
            return self.memory[addr] | (self.memory[addr + 1] << 8)
        return 0
    
    def write_word(self, addr, value):
        """Write a 16-bit word to memory"""
        self.memory[addr] = value & 0xFF
        self.memory[addr + 1] = (value >> 8) & 0xFF
    
    def step(self):
        """Execute one instruction using xform instruction executor"""
        if self.pc >= len(self.machine_code):
            return False  # Halted
        
        try:
            # Read instruction (16-bit)
            instruction = self.read_word(self.pc)
            
            # Create instruction object for executor
            instruction_obj = {
                'opcode': instruction & 0xF000,
                'rd': (instruction >> 8) & 0x0F,
                'rs': (instruction >> 4) & 0x0F,
                'immediate': instruction & 0x00FF,
                'raw': instruction
            }
            
            # Execute instruction using xform executor
            if self.executor.has_implementation(instruction_obj['opcode']):
                # Use xform instruction executor
                result = self.executor.execute_instruction(instruction_obj, self.context)
                
                # Update registers and flags from context
                if hasattr(self.context, 'registers'):
                    self.registers.update(self.context.registers)
                if hasattr(self.context, 'flags'):
                    self.flags.update(self.context.flags)
                
                # Update PC
                self.pc += 2
            else:
                # Fallback to manual execution for basic instructions
                self._execute_basic_instruction(instruction_obj)
            
            return True
            
        except Exception as e:
            print(f"ERROR: Instruction execution failed: {e}")
            return False
    
    def _execute_basic_instruction(self, instruction):
        """Fallback execution for basic instructions"""
        opcode = instruction['opcode']
        rd = instruction['rd']
        rs = instruction['rs']
        immediate = instruction['immediate']
        
        reg_names = [f'x{i}' for i in range(16)]
        
        if opcode == 0x0000:  # NOP
            pass
        elif opcode == 0x1000:  # ADD
            if rd < len(reg_names) and rs < len(reg_names):
                self.registers[reg_names[rd]] = (self.registers[reg_names[rd]] + self.registers[reg_names[rs]]) & 0xFFFF
        elif opcode == 0x2000:  # SUB
            if rd < len(reg_names) and rs < len(reg_names):
                self.registers[reg_names[rd]] = (self.registers[reg_names[rd]] - self.registers[reg_names[rs]]) & 0xFFFF
        elif opcode == 0x3000:  # LI (Load Immediate)
            if rd < len(reg_names):
                self.registers[reg_names[rd]] = immediate
        
        # Update PC
        self.pc += 2

# Create simulator
simulator = XformSimulator(isa, machine_code)

# Run simulation for specified steps
simulation_states = []
for step in range(${steps}):
    try:
        # Get current state
        current_state = {
            'step': step,
            'pc': simulator.pc,
            'registers': simulator.registers.copy(),
            'flags': simulator.flags.copy(),
            'memory': simulator.memory.copy()
        }
        
        simulation_states.append(current_state)
        
        # Execute one step
        if not simulator.step():
            break  # Halted
            
    except Exception as e:
        print(f"ERROR: Simulation step {step} failed: {e}")
        break

# Write simulation results
output_data = {
    'success': True,
    'states': simulation_states,
    'total_steps': len(simulation_states),
    'halted': len(simulation_states) < ${steps},
    'isa_name': isa.name if hasattr(isa, 'name') else 'Unknown',
    'machine_code_hex': machine_code.hex()
}

with open('${outputFile}', 'w') as f:
    json.dump(output_data, f, indent=2)

print("SUCCESS")`;

      writeFileSync(simulateScriptFile, simulateScript);

      const { stdout, stderr } = await execAsync(
        `${pythonPath} "${simulateScriptFile}"`,
        { timeout: 30000, cwd: tempDir }
      );

      if (stderr) {
        console.error('Simulation error:', stderr);
        return NextResponse.json(
          { error: 'Simulation failed', details: stderr },
          { status: 400 }
        );
      }

      if (!stdout.includes('SUCCESS')) {
        console.error('Simulation failed:', stdout);
        return NextResponse.json(
          { error: 'Simulation failed', details: stdout },
          { status: 400 }
        );
      }

      // Read the simulation output
      let simulationData: any;
      try {
        const outputContent = readFileSync(outputFile, 'utf-8');
        simulationData = JSON.parse(outputContent);
      } catch (readError) {
        console.error('Failed to read simulation output:', readError);
        return NextResponse.json(
          { error: 'Failed to read simulation results' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ...simulationData,
        message: 'Simulation completed successfully',
        isaName: isaName
      });

    } finally {
      // Clean up temporary files
      try {
        if (typeof isaDefinition !== 'string') {
          unlinkSync(isaFile);
        }
        unlinkSync(assemblyFile);
        unlinkSync(outputFile);
        if (simulateScriptFile) {
          unlinkSync(simulateScriptFile);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary files:', cleanupError);
      }
    }
  } catch (error) {
    console.error('Simulate API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 