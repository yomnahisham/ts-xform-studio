import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
    try {
        const { isaDefinition, assembledCode } = await request.json();

        if (!isaDefinition || !assembledCode) {
            return NextResponse.json(
                { error: "Missing required fields: isaDefinition and assembledCode" },
                { status: 400 }
            );
        }

        // Use system temp directory for all temp files
        const tempDir = os.tmpdir();
        const isaFile = path.join(tempDir, `isa_${Date.now()}.json`);
        const binaryFile = path.join(tempDir, `binary_${Date.now()}.bin`);
        const outputFile = path.join(tempDir, `output_${Date.now()}.s`);
        let disassembleScriptFile: string | undefined;

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
            
            // Convert hex string to binary data
            let binaryData: Buffer;
            if (typeof assembledCode === 'string') {
                // Remove any whitespace and convert hex string to buffer
                const hexString = assembledCode.replace(/\s/g, '');
                binaryData = Buffer.from(hexString, 'hex');
            } else if (Array.isArray(assembledCode)) {
                // Convert array of numbers to buffer
                binaryData = Buffer.from(assembledCode);
            } else {
                throw new Error('Invalid assembledCode format');
            }
            
            writeFileSync(binaryFile, binaryData);

            // Use Python script for disassembly
            
            console.log('Running disassemble with Python');
            console.log('Binary file size:', binaryData.length, 'bytes');
            
            // Determine how to load the ISA based on whether it's built-in or custom
            const isaLoadCode = typeof isaDefinition === 'string' 
              ? `isa = loader.load_isa('${isaName}')`
              : `isa = loader.load_isa_from_file('${isaFile}')`;
              
            const disassembleScript = `import sys
import json
from datetime import datetime
sys.path.append('${process.cwd()}')
from isa_xform import ISALoader
from isa_xform.core import Disassembler

# Load ISA
loader = ISALoader()
${isaLoadCode}

# Create disassembler
disassembler = Disassembler(isa)

# Read binary data
with open('${binaryFile}', 'rb') as f:
    binary_data = f.read()

print(f"Binary data length: {len(binary_data)}")
print(f"Binary data (hex): {binary_data.hex()}")

# Disassemble with pseudo-instruction reconstruction DISABLED
try:
    result = disassembler.disassemble(binary_data, reconstruct_pseudo=False)
    
    print(f"Number of instructions: {len(result.instructions)}")
    
    # Generate formatted disassembly
    assembly_lines = []
    
    # Header
    assembly_lines.append(f"; Disassembly of {isa.name} v{isa.version}")
    assembly_lines.append(f"; Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    assembly_lines.append(f"; Binary size: {len(binary_data)} bytes")
    assembly_lines.append(f"; Word size: {isa.word_size} bits")
    assembly_lines.append(f"; Endianness: {isa.endianness}")
    assembly_lines.append("")
    
    # Instructions
    current_address = 0
    for i, instr in enumerate(result.instructions):
        # Calculate address (assuming word-aligned)
        word_size_bytes = isa.word_size // 8
        address = current_address
        
        # Get machine code for this instruction
        instr_start = i * word_size_bytes
        instr_end = instr_start + word_size_bytes
        if instr_end <= len(binary_data):
            machine_code = binary_data[instr_start:instr_end]
            hex_code = machine_code.hex().upper()
        else:
            hex_code = "????"
        
        # Format the instruction line
        if instr.operands:
            operands_str = f" {', '.join(instr.operands)}"
        else:
            operands_str = ""
        
        # Add comment if available
        comment = f" ; {instr.comment}" if instr.comment else ""
        
        # Format: address | hex_code | mnemonic operands ; comment
        line = f"{address:04X}: {hex_code:>8} {instr.mnemonic}{operands_str}{comment}"
        assembly_lines.append(line)
        
        current_address += word_size_bytes
    
    # Footer
    assembly_lines.append("")
    assembly_lines.append(f"; Total instructions: {len(result.instructions)}")
    assembly_lines.append(f"; Total size: {len(binary_data)} bytes")
    
    assembly_text = '\\n'.join(assembly_lines)
    
    # Write assembly output
    with open('${outputFile}', 'w') as f:
        f.write(assembly_text)
    
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)`;

            disassembleScriptFile = path.join(tempDir, `disassemble_${Date.now()}.py`);
            writeFileSync(disassembleScriptFile, disassembleScript);

            try {
                const { stdout, stderr } = await execAsync(
                    `${pythonPath} "${disassembleScriptFile}"`,
                    { timeout: 15000, cwd: tempDir }
                );

                if (stderr) {
                    console.error('Disassembly error:', stderr);
                    return NextResponse.json(
                        { error: 'Disassembly failed', details: stderr },
                        { status: 400 }
                    );
                }
                
                console.log('Disassemble stdout:', stdout);
                
                if (!stdout.includes('SUCCESS')) {
                    console.error('Disassembly failed:', stdout);
                    return NextResponse.json(
                        { error: 'Disassembly failed', details: stdout },
                        { status: 400 }
                    );
                }
            } catch (execError: any) {
                console.error('Exec error:', execError);
                if (execError.signal === 'SIGTERM') {
                    return NextResponse.json(
                        { error: 'Disassembly timed out', details: 'The disassemble command took too long to complete' },
                        { status: 408 }
                    );
                }
                return NextResponse.json(
                    { error: 'Disassembly failed', details: execError.message },
                    { status: 400 }
                );
            }

            // Read the disassembled output
            let disassembledCode: string;
            try {
                disassembledCode = readFileSync(outputFile, 'utf-8');
            } catch (readError) {
                console.error('Failed to read output file:', readError);
                // Fallback: create a simple hex dump
                disassembledCode = `; Disassembly failed - showing hex dump\n`;
                disassembledCode += `; Binary size: ${binaryData.length} bytes\n`;
                disassembledCode += `; Hex data: ${binaryData.toString('hex')}\n`;
                disassembledCode += `; Note: xform disassemble command may not be working properly\n`;
            }

            return NextResponse.json({
                disassembledCode,
                message: 'Disassembly completed',
                isaName: isaDefinition.name || 'Unknown'
            });

        } finally {
            // Clean up temporary files
            try {
                unlinkSync(isaFile);
                unlinkSync(binaryFile);
                unlinkSync(outputFile);
                if (disassembleScriptFile) {
                    unlinkSync(disassembleScriptFile);
                }
            } catch (cleanupError) {
                console.warn('Failed to cleanup temporary files:', cleanupError);
            }
        }
    } catch (error) {
        console.error('Disassemble API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
