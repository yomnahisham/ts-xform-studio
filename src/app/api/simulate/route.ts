import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import path from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { isaDefinition, assemblyCode, steps = 10 } = await request.json();

    if (!isaDefinition || !assemblyCode) {
      return NextResponse.json(
        { error: 'Missing required fields: isaDefinition and assemblyCode' },
        { status: 400 }
      );
    }

    const tempDir = tmpdir();
    const simulationScriptFile = path.join(tempDir, `run_simulation_${Date.now()}.py`);
    const outputFile = path.join(tempDir, `simulation_output_${Date.now()}.json`);

    try {

      // Create Python script that follows your main() function pattern
             const pythonSimulationScript = `import sys
import json
from pathlib import Path

# Add your project path
sys.path.append('${process.cwd()}')

# Import available xform modules
from isa_xform import ISALoader, Parser
from isa_xform.core import Assembler, SymbolTable, Disassembler
from isa_xform.core.instruction_executor import InstructionExecutor, ExecutionContext

def run_simulation():
    try:
        # Load ISA
        loader = ISALoader()
        isa = loader.load_isa("zx16")
        
        # Create parser and assembler
        parser = Parser(isa)
        assembler = Assembler(isa)
        
        # Parse and assemble the assembly code
        assembly_code = """${assemblyCode}"""
        ast_nodes = parser.parse(assembly_code)
        result = assembler.assemble(ast_nodes)
        
        if not result.success:
            return {"success": False, "error": "Assembly failed"}
        
        # Get machine code
        machine_code = result.machine_code if hasattr(result, 'machine_code') else b''
        
        # Initialize registers
        registers = {}
        if hasattr(isa, 'registers') and hasattr(isa.registers, 'general_purpose'):
            for reg in isa.registers.general_purpose:
                reg_name = reg.name if hasattr(reg, 'name') else reg
                registers[reg_name] = 0
        
        # Initialize memory with machine code
        memory = bytearray(len(machine_code))
        for i, byte in enumerate(machine_code):
            memory[i] = byte
        
        # Initialize flags
        flags = {'Z': False, 'N': False, 'C': False, 'V': False}
        
        # Create instruction executor
        executor = InstructionExecutor()
        
        # Create execution context with proper parameters
        context = ExecutionContext(registers, memory, 0, flags)
        
        # Simulation state
        simulation_states = []
        
        # Run simulation for specified steps
        for step in range(${steps}):
            if context.pc >= len(machine_code):
                break  # Halted
            
            try:
                # Read instruction (16-bit)
                instruction = 0
                if context.pc < len(memory) - 1:
                    instruction = memory[context.pc] | (memory[context.pc + 1] << 8)
                
                # Create instruction object for executor
                instruction_obj = {
                    'opcode': instruction & 0xF000,
                    'rd': (instruction >> 8) & 0x0F,
                    'rs': (instruction >> 4) & 0x0F,
                    'immediate': instruction & 0x00FF,
                    'raw': instruction
                }
                
                # Execute instruction using xform executor
                if executor.has_implementation(instruction_obj['opcode']):
                    result = executor.execute_instruction(instruction_obj, context)
                    
                    # Update registers and flags from context
                    registers.update(context.registers)
                    flags.update(context.flags)
                else:
                    # Fallback to manual execution for basic instructions
                    opcode = instruction_obj['opcode']
                    rd = instruction_obj['rd']
                    rs = instruction_obj['rs']
                    immediate = instruction_obj['immediate']
                    
                    reg_names = [f'x{i}' for i in range(16)]
                    
                    if opcode == 0x0000:  # NOP
                        pass
                    elif opcode == 0x1000:  # ADD
                        if rd < len(reg_names) and rs < len(reg_names):
                            context.registers[reg_names[rd]] = (context.registers[reg_names[rd]] + context.registers[reg_names[rs]]) & 0xFFFF
                    elif opcode == 0x2000:  # SUB
                        if rd < len(reg_names) and rs < len(reg_names):
                            context.registers[reg_names[rd]] = (context.registers[reg_names[rd]] - context.registers[reg_names[rs]]) & 0xFFFF
                    elif opcode == 0x3000:  # LI (Load Immediate)
                        if rd < len(reg_names):
                            context.registers[reg_names[rd]] = immediate
                
                # Record current state
                current_state = {
                    'step': step,
                    'pc': context.pc,
                    'registers': dict(context.registers),
                    'flags': dict(context.flags),
                    'memory': dict(enumerate(memory))
                }
                
                simulation_states.append(current_state)
                
                # Update PC
                context.pc += 2
                
            except Exception as e:
                print(f"ERROR: Instruction execution failed: {e}")
                break
        
        # Return simulation results
        output_data = {
            'success': True,
            'states': simulation_states,
            'total_steps': len(simulation_states),
            'halted': len(simulation_states) < ${steps},
            'isa_name': isa.name if hasattr(isa, 'name') else 'zx16',
            'machine_code_hex': machine_code.hex(),
            'registers': dict(context.registers),
            'memory': dict(enumerate(memory)),
            'pc': context.pc,
            'message': 'Simulation completed successfully'
        }
        
        return output_data
        
    except Exception as e:
        return {"success": False, "error": f"Simulation failed: {str(e)}"}

# Run the simulation and save results
if __name__ == "__main__":
    result = run_simulation()
    
    # Write results to output file
    with open('${outputFile}', 'w') as f:
        json.dump(result, f, indent=2)
    
    if result['success']:
        print("SIMULATION_SUCCESS")
    else:
        print(f"SIMULATION_ERROR: {result['error']}", file=sys.stderr)
        sys.exit(1)
`;

      // Write and execute the Python script
      writeFileSync(simulationScriptFile, pythonSimulationScript);

      const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python');
      const { stdout, stderr } = await execAsync(
        `${pythonPath} "${simulationScriptFile}"`,
        { timeout: 30000, cwd: tempDir }
      );

      if (stderr && !stdout.includes('SIMULATION_SUCCESS')) {
        console.error('Simulation error:', stderr);
        return NextResponse.json(
          { error: 'Simulation failed', details: stderr },
          { status: 400 }
        );
      }

      // Read simulation results
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
        message: 'Simulation completed successfully'
      });

          } finally {
        // Clean up temporary files
        try {
          unlinkSync(simulationScriptFile);
          unlinkSync(outputFile);
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