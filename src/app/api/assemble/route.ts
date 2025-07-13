import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import os from 'os';

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

    // Use system temp directory for all temp files
    const tempDir = os.tmpdir();
    const isaFile = join(tempDir, `isa_${Date.now()}.json`);
    const assemblyFile = join(tempDir, `assembly_${Date.now()}.s`);
    const outputFile = join(tempDir, `output_${Date.now()}.bin`);
    const pythonFile = join(tempDir, `assemble_script_${Date.now()}.py`);

    // debug my broooo print working directory and temp file paths
    const fs = require('fs');
    console.log('process.cwd():', process.cwd());
    console.log('Temp file paths:', { isaFile, assemblyFile, outputFile });
    console.log('Before writing, isaFile exists:', fs.existsSync(isaFile));
    console.log('Before writing, assemblyFile exists:', fs.existsSync(assemblyFile));
    console.log('Before writing, outputFile exists:', fs.existsSync(outputFile));

    try {
      // Write ISA definition to temporary file
      writeFileSync(isaFile, JSON.stringify(isaDefinition, null, 2));
      
      // Write assembly code to temporary file
      writeFileSync(assemblyFile, assemblyCode);

      //check if files exist after writing
      console.log('After writing, isaFile exists:', fs.existsSync(isaFile));
      console.log('After writing, assemblyFile exists:', fs.existsSync(assemblyFile));
      console.log('After writing, outputFile exists:', fs.existsSync(outputFile));
      if (fs.existsSync(isaFile)) {
        console.log('ISA file contents:', fs.readFileSync(isaFile, 'utf-8'));
      }
      if (fs.existsSync(assemblyFile)) {
        console.log('Assembly file contents:', fs.readFileSync(assemblyFile, 'utf-8'));
      }

      // Use isa-xform Python API directly instead of CLI
      const pythonScript = `
import sys
import json
from isa_xform.core.isa_loader import ISALoader
from isa_xform.core.parser import Parser
from isa_xform.core.assembler import Assembler

try:
    # Load ISA from file - use raw strings for cross-platform compatibility
    loader = ISALoader()
    isa_definition = loader.load_isa_from_file(r'${isaFile}')
    
    # Parse assembly
    parser = Parser(isa_definition)
    with open(r'${assemblyFile}', 'r') as f:
        source = f.read()
    nodes = parser.parse(source)
    
    # Assemble
    assembler = Assembler(isa_definition)
    assembled_result = assembler.assemble(nodes)
    
    # Handle different return types from assemble()
    if hasattr(assembled_result, 'machine_code'):
        machine_code = assembled_result.machine_code
    elif hasattr(assembled_result, 'bytes'):
        machine_code = assembled_result.bytes
    elif isinstance(assembled_result, bytes):
        machine_code = assembled_result
    else:
        machine_code = bytes(assembled_result)
    
    # Write output
    with open(r'${outputFile}', 'wb') as f:
        f.write(machine_code)
    
    print("Assembly successful")
    sys.exit(0)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;
      
      writeFileSync(pythonFile, pythonScript);
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      const command = `${pythonCommand} ${pythonFile}`;
      console.log('Running Python script:', pythonFile);
      console.log('Before exec, isaFile exists:', fs.existsSync(isaFile));
      console.log('Before exec, assemblyFile exists:', fs.existsSync(assemblyFile));
      console.log('Before exec, outputFile exists:', fs.existsSync(outputFile));

      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('WARNING')) {
        console.error('Assembly error:', stderr);
        return NextResponse.json(
          { error: 'Assembly failed', details: stderr },
          { status: 400 }
        );
      }

      // Read the output binary file
      const machineCode = fs.readFileSync(outputFile);
      
      // Check if the user wants to download the .bin file
      const url = new URL(request.url);
      const download = url.searchParams.get('download');
      if (download) {
        // Return the binary file as a download
        return new NextResponse(machineCode, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream', 
            'Content-Disposition': 'attachment; filename="output.bin"',
          },
        });
      }
      // Convert to hex string for easy handling
      const hexCode = machineCode.toString('hex');
      
      // Parse stdout for additional information (symbols, etc.)
      const result = {
        machineCode: hexCode,
        assembly: assemblyCode,
        isa: isaDefinition.name,
        stdout: stdout || '',
        success: true
      };

      return NextResponse.json(result);

    } finally {
      // Clean up temporary files
      try {
        unlinkSync(isaFile);
      } catch {}
      try {
        unlinkSync(assemblyFile);
      } catch {}
      try {
        unlinkSync(outputFile);
      } catch {}
      try {
        unlinkSync(pythonFile);
      } catch {}
    }

  } catch (error) {
    console.error('Assemble API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}