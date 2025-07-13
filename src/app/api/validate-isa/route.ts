import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { isaDefinition } = await request.json();

    if (!isaDefinition) {
      return NextResponse.json(
        { error: 'Missing required field: isaDefinition' },
        { status: 400 }
      );
    }

    const tempDir = tmpdir();
    const isaFile = join(tempDir, `isa_validate_${Date.now()}.json`);
    
    try {
      // Write ISA definition to temporary file
      writeFileSync(isaFile, JSON.stringify(isaDefinition, null, 2));
      
      // Use xform CLI command for validation
      const command = `xform validate --isa "${isaFile}" --verbose`;
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 10000,
        cwd: tempDir 
      });
      
      // Check validation results
      const isValid = !stderr && stdout.includes('ISA definition is valid');
      
      return NextResponse.json({
        valid: isValid,
        message: isValid ? 'ISA definition is valid' : 'ISA definition is invalid',
        details: stderr || stdout,
        isaName: isaDefinition.name || 'Unknown'
      });
      
    } finally {
      // Clean up temporary file
      try {
        unlinkSync(isaFile);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary validation file:', cleanupError);
      }
    }
    
  } catch (error) {
    console.error('Validate ISA API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
