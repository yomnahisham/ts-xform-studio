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
            // Write ISA definition to temporary file
            writeFileSync(isaFile, JSON.stringify(isaDefinition, null, 2));
            
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
            const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python');
            
            console.log('Running disassemble with Python');
            console.log('Binary file size:', binaryData.length, 'bytes');
            
            const disassembleScript = `import sys
sys.path.append('${process.cwd()}')
from isa_xform import ISALoader
from isa_xform.core import Disassembler

# Load ISA
loader = ISALoader()
isa = loader.load_isa_from_file('${isaFile}')

# Create disassembler
disassembler = Disassembler(isa)

# Read binary data
with open('${binaryFile}', 'rb') as f:
    binary_data = f.read()

print(f"Binary data length: {len(binary_data)}")
print(f"Binary data (hex): {binary_data.hex()}")

# Disassemble
try:
    result = disassembler.disassemble(binary_data)
    
    print(f"Number of instructions: {len(result.instructions)}")
    
    # Convert instructions to assembly text
    assembly_lines = []
    for instr in result.instructions:
        line = f"{instr.mnemonic}"
        if instr.operands:
            line += f" {', '.join(instr.operands)}"
        if instr.comment:
            line += f" ; {instr.comment}"
        assembly_lines.append(line)
        print(f"Instruction: {line}")
    
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
