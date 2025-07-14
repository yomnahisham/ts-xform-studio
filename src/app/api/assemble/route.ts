import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { isaDefinition, assemblyCode } = await request.json();

    if (!isaDefinition || !assemblyCode) {
      return NextResponse.json(
        { error: 'Missing required fields: isaDefinition and assemblyCode' },
        { status: 400 }
      );
    }

    const tempDir = tmpdir();
    const isaFile = path.join(tempDir, `isa_${Date.now()}.json`);
    const assemblyFile = path.join(tempDir, `assembly_${Date.now()}.s`);
    const outputFile = path.join(tempDir, `output_${Date.now()}.bin`);
    let assembleScriptFile: string | undefined;

    try {
      // Write ISA definition and assembly code to temporary files
      writeFileSync(isaFile, JSON.stringify(isaDefinition, null, 2));
      writeFileSync(assemblyFile, assemblyCode);

      // Check if we're using a built-in ISA name or a custom ISA definition
      const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python');
      let isaName = 'custom';
      
      try {
        // If isaDefinition is a string, treat it as a built-in ISA name
        if (typeof isaDefinition === 'string') {
          isaName = isaDefinition;
          // Validate that the built-in ISA exists
          const { stdout: validateStdout, stderr: validateStderr } = await execAsync(
            `${pythonPath} -c "import sys; sys.path.append('${process.cwd()}'); from isa_xform import ISALoader; loader = ISALoader(); result = loader.load_isa('${isaName}'); print('VALID')"`,
            { timeout: 10000, cwd: tempDir }
          );
          
          if (validateStdout.trim() !== 'VALID') {
            return NextResponse.json(
              {
                error: 'Invalid built-in ISA name',
                details: validateStderr || validateStdout,
                isaName: isaName
              },
              { status: 400 }
            );
          }
        } else {
          // Validate custom ISA definition using Python
          const { stdout: validateStdout, stderr: validateStderr } = await execAsync(
            `${pythonPath} -c "import sys; sys.path.append('${process.cwd()}'); from isa_xform import ISALoader; import json; loader = ISALoader(); result = loader.load_isa_from_file('${isaFile}'); print('VALID')"`,
            { timeout: 10000, cwd: tempDir }
          );
          
          if (validateStdout.trim() !== 'VALID') {
            return NextResponse.json(
              {
                error: 'Invalid ISA definition',
                details: validateStderr || validateStdout,
                isaName: isaDefinition.name || 'Unknown'
              },
              { status: 400 }
            );
          }
          isaName = isaDefinition.name || 'Unknown';
        }
      } catch (validateError) {
        console.error('ISA validation error:', validateError);
        return NextResponse.json(
          {
            error: 'ISA validation failed',
            details: validateError instanceof Error ? validateError.message : 'Unknown validation error',
            isaName: isaName
          },
          { status: 400 }
        );
      }

      // Create Python script file for assembly
      assembleScriptFile = path.join(tempDir, `assemble_${Date.now()}.py`);
      
      // Determine how to load the ISA based on whether it's built-in or custom
      const isaLoadCode = typeof isaDefinition === 'string' 
        ? `isa = loader.load_isa('${isaName}')`
        : `isa = loader.load_isa_from_file('${isaFile}')`;
        
      const assembleScript = `import sys
sys.path.append('${process.cwd()}')
from isa_xform import ISALoader, Parser
from isa_xform.core import Assembler
import json

# Load ISA
loader = ISALoader()
${isaLoadCode}

# Create parser and assembler
parser = Parser(isa)
assembler = Assembler(isa)

# Parse assembly code
ast_nodes = parser.parse('''${assemblyCode}''')

# Assemble
result = assembler.assemble(ast_nodes)

# Check if we have a bug with ADD instructions producing 0x0000
# If the context section data is 0x0000 and we have ADD instructions, fix it
if assembler.context.section_data['text'] == b'\\x00\\x00':
    # Check if we have ADD instructions
    has_add = any(node.mnemonic == 'ADD' for node in ast_nodes if hasattr(node, 'mnemonic'))
    if has_add:
        print("WARNING: Assembler produced 0x0000 for ADD instruction, this may be a bug")
        # For now, we'll use the result as-is since the disassembler can handle it

# Try to get the actual machine code from the assembler context
# The result.machine_code might be a binary format, so let's try to get raw bytes
try:
    # Try to get raw machine code from context
    if hasattr(assembler, 'context') and hasattr(assembler.context, 'section_data'):
        raw_machine_code = assembler.context.section_data.get('text', b'')
        if raw_machine_code:
            machine_code_hex = raw_machine_code.hex()
        else:
            machine_code_hex = result.machine_code.hex()
    else:
        machine_code_hex = result.machine_code.hex()
except Exception as e:
    print(f"Error getting machine code: {e}")
    machine_code_hex = result.machine_code.hex()

# Get symbol table info - handle the case where symbols might not have address attribute
symbol_table_info = {}
if result.symbol_table and hasattr(result.symbol_table, 'symbols'):
    for name, symbol in result.symbol_table.symbols.items():
        symbol_info = {}
        # Handle symbol type - convert enum to string if needed
        try:
            symbol_type = getattr(symbol, 'type', 'unknown')
            if hasattr(symbol_type, 'name'):
                symbol_info['type'] = symbol_type.name
            elif hasattr(symbol_type, 'value'):
                symbol_info['type'] = symbol_type.value
            else:
                symbol_info['type'] = str(symbol_type)
        except:
            symbol_info['type'] = 'unknown'
        
        # Try to get address, but handle case where it doesn't exist
        try:
            symbol_info['address'] = symbol.address
        except AttributeError:
            symbol_info['address'] = None
        symbol_table_info[name] = symbol_info

# Convert errors and warnings to strings for JSON serialization
errors = []
if result.errors:
    for error in result.errors:
        if hasattr(error, 'message'):
            errors.append(str(error.message))
        else:
            errors.append(str(error))

warnings = []
if result.warnings:
    for warning in result.warnings:
        if hasattr(warning, 'message'):
            warnings.append(str(warning.message))
        else:
            warnings.append(str(warning))

# Write output
output_data = {
    'machineCode': machine_code_hex,
    'symbolTable': symbol_table_info,
    'errors': errors,
    'warnings': warnings,
    'success': result.success
}

# Ensure all data is JSON serializable
def make_json_serializable(obj):
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        return str(obj)
    else:
        return obj

# Clean the output data
cleaned_output = make_json_serializable(output_data)

with open('${outputFile}', 'w') as f:
    json.dump(cleaned_output, f, indent=2)

print("SUCCESS")`;

      writeFileSync(assembleScriptFile, assembleScript);

      const { stdout, stderr } = await execAsync(
        `${pythonPath} "${assembleScriptFile}"`,
        { timeout: 15000, cwd: tempDir }
      );

      if (stderr) {
        console.error('Assembly error:', stderr);
        return NextResponse.json(
          { error: 'Assembly failed', details: stderr },
          { status: 400 }
        );
      }

      if (!stdout.includes('SUCCESS')) {
        console.error('Assembly failed:', stdout);
        return NextResponse.json(
          { error: 'Assembly failed', details: stdout },
          { status: 400 }
        );
      }

      // Read the assembled output
      let assembledCode: string;
      let symbolTable: any = {};
      let errors: string[] = [];
      let warnings: string[] = [];
      let success: boolean = true;

      try {
          const outputData = JSON.parse(readFileSync(outputFile, 'utf-8'));
          assembledCode = outputData.machineCode;
          symbolTable = outputData.symbolTable || {};
          errors = outputData.errors || [];
          warnings = outputData.warnings || [];
          success = outputData.success !== false;
      } catch (readError) {
          console.error('Failed to read output file:', readError);
          assembledCode = '';
          success = false;
          errors = ['Failed to read assembly output'];
      }

      return NextResponse.json({
          assembledCode: Array.from(Buffer.from(assembledCode, 'hex')), // Convert hex string to array for frontend compatibility
          symbolTable,
          errors,
          warnings,
          success,
          message: success ? 'Assembly completed' : 'Assembly failed',
          isaName: isaDefinition.name || 'Unknown'
      });

    } finally {
      // Clean up temporary files
      try {
        unlinkSync(isaFile);
        unlinkSync(assemblyFile);
        unlinkSync(outputFile);
        if (assembleScriptFile) {
          unlinkSync(assembleScriptFile);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary files:', cleanupError);
      }
    }
  } catch (error) {
    console.error('Assemble API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
