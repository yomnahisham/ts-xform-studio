import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
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
    const isaFile = join(tempDir, `isa_${Date.now()}.json`);
    const assemblyFile = join(tempDir, `assembly_${Date.now()}.s`);
    const outputFile = join(tempDir, `output_${Date.now()}.bin`);

    try {
      // Write ISA definition and assembly code to temporary files
      writeFileSync(isaFile, JSON.stringify(isaDefinition, null, 2));
      writeFileSync(assemblyFile, assemblyCode);

      // Validate ISA definition
      const validateCommand = `xform validate --isa "${isaFile}" --verbose`;

      const { stdout: validateStdout, stderr: validateStderr } = await execAsync(validateCommand, {
        timeout: 10000,
        cwd: tempDir
      });

      const isValid = !validateStderr && validateStdout.includes('ISA definition is valid');

      if (!isValid) {
        return NextResponse.json(
          {
            error: 'Invalid ISA definition',
            details: validateStderr || validateStdout,
            isaName: isaDefinition.name || 'Unknown'
          },
          { status: 400 }
        );
      }

      // Use xform CLI command for assembly
      const command = `xform assemble --isa "${isaFile}" --input "${assemblyFile}" --output "${outputFile}" --verbose --list-symbols`;
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 10000, 
        cwd: tempDir 
      });

      if (stderr) {
        console.error('Assembly error:', stderr);
        return NextResponse.json(
          { error: 'Assembly failed', details: stderr },
          { status: 400 }
        );
      }

      // Read the assembled binary
      const assembledBinary = readFileSync(outputFile);

      return NextResponse.json({
        assembledCode: Array.from(assembledBinary), // Convert to array for JSON serialization
        message: 'Assembly successful',
        details: stdout,
        isaName: isaDefinition.name || 'Unknown'
      });

    } finally {
      // Clean up temporary files
      try {
        unlinkSync(isaFile);
        unlinkSync(assemblyFile);
        unlinkSync(outputFile);
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
