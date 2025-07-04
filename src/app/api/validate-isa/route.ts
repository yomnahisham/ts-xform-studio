import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

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

    // Use isa-xform to validate the ISA definition
    try {
      // Write ISA definition to temporary file to avoid shell escaping issues
      const { writeFileSync, unlinkSync } = require('fs');
      const { join } = require('path');
      const { tmpdir } = require('os');
      
      const tempDir = tmpdir();
      const isaFile = join(tempDir, `isa_validate_${Date.now()}.json`);
      const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python');
      
      try {
        writeFileSync(isaFile, JSON.stringify(isaDefinition, null, 2));
        
        const { stdout, stderr } = await execAsync(
          `${pythonPath} -c "import sys; sys.path.append('${process.cwd()}'); from isa_xform import ISALoader; import json; loader = ISALoader(); result = loader.load_isa_from_file('${isaFile}'); print('VALID')"`,
          { timeout: 10000 }
        );
        
        const isValid = stdout.trim() === 'VALID';
        
        return NextResponse.json({
          valid: isValid,
          message: isValid ? 'ISA definition is valid' : 'ISA definition is invalid',
          details: stderr || '',
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
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json({
        valid: false,
        message: 'Validation failed',
        details: validationError instanceof Error ? validationError.message : 'Unknown validation error',
        isaName: isaDefinition.name || 'Unknown'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Validate ISA API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 