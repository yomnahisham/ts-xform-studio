import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const ISA_FILES_DIR = path.join(process.cwd(), 'src/app/api/isa-examples/isa-files');

// Example ISA definitions based on py-isa-xform structure
const exampleISAs: Record<string, any> = {
  'zx16.json': {
    "name": "ZX16",
    "version": "1.0",
    "description": "ZX16 16-bit RISC-V inspired ISA",
    "instruction_size": 16,
    "word_size": 16,
    "endianness": "little",
    "address_space": {
      "size": 65536,
      "default_code_start": 32
    },
    "registers": {
      "general_purpose": [
        {"name": "x0", "size": 16, "alias": ["t0"], "description": "Temporary (caller-saved)"},
        {"name": "x1", "size": 16, "alias": ["ra"], "description": "Return address"},
        {"name": "x2", "size": 16, "alias": ["sp"], "description": "Stack pointer"},
        {"name": "x3", "size": 16, "alias": ["s0"], "description": "Saved/Frame pointer"},
        {"name": "x4", "size": 16, "alias": ["s1"], "description": "Saved"},
        {"name": "x5", "size": 16, "alias": ["t1"], "description": "Temporary (caller-saved)"},
        {"name": "x6", "size": 16, "alias": ["a0"], "description": "Argument 0/Return value"},
        {"name": "x7", "size": 16, "alias": ["a1"], "description": "Argument 1"}
      ]
    },
    "instructions": [
      // ... (full instructions array from zx16.json) ...
    ],
    "directives": [
      // ... (full directives array from zx16.json) ...
    ],
    "pseudo_instructions": [
      // ... (full pseudo_instructions array from zx16.json) ...
    ],
    "assembly_syntax": {
      // ... (full assembly_syntax object from zx16.json) ...
    },
    "constants": {
      // ... (full constants object from zx16.json) ...
    },
    "ecall_services": {
      // ... (full ecall_services object from zx16.json) ...
    }
  },
  'simple_risc.json': {
    name: 'Simple RISC',
    description: 'Basic RISC-style instruction set for educational purposes',
    word_size: 16,
    instructions: [
      {
        mnemonic: 'LOAD',
        description: 'Load from memory',
        syntax: 'LOAD rd, offset(rs)',
        encoding: {
          fields: [
            { name: 'opcode', bits: '15:12', value: '0010' },
            { name: 'rd', bits: '11:9', type: 'register' },
            { name: 'rs', bits: '8:6', type: 'register' },
            { name: 'offset', bits: '5:0', type: 'immediate' }
          ]
        }
      },
      {
        mnemonic: 'STORE',
        description: 'Store to memory',
        syntax: 'STORE rs, offset(rd)',
        encoding: {
          fields: [
            { name: 'opcode', bits: '15:12', value: '0011' },
            { name: 'rs', bits: '11:9', type: 'register' },
            { name: 'rd', bits: '8:6', type: 'register' },
            { name: 'offset', bits: '5:0', type: 'immediate' }
          ]
        }
      },
      {
        mnemonic: 'JMP',
        description: 'Unconditional jump',
        syntax: 'JMP target',
        encoding: {
          fields: [
            { name: 'opcode', bits: '15:12', value: '0100' },
            { name: 'target', bits: '11:0', type: 'immediate' }
          ]
        }
      }
    ],
    registers: {
      general_purpose: ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
      special: ['pc', 'sp']
    }
  },
  'riscv_rv32i.json': {
    name: 'RISC-V RV32I',
    description: 'Base integer instruction set for RISC-V 32-bit processors',
    word_size: 32,
    instructions: [
      {
        mnemonic: 'ADDI',
        description: 'Add immediate',
        syntax: 'ADDI rd, rs1, imm',
        encoding: {
          fields: [
            { name: 'imm', bits: '31:20', type: 'immediate' },
            { name: 'rs1', bits: '19:15', type: 'register' },
            { name: 'funct3', bits: '14:12', value: '000' },
            { name: 'rd', bits: '11:7', type: 'register' },
            { name: 'opcode', bits: '6:0', value: '0010011' }
          ]
        }
      },
      {
        mnemonic: 'ADD',
        description: 'Add registers',
        syntax: 'ADD rd, rs1, rs2',
        encoding: {
          fields: [
            { name: 'funct7', bits: '31:25', value: '0000000' },
            { name: 'rs2', bits: '24:20', type: 'register' },
            { name: 'rs1', bits: '19:15', type: 'register' },
            { name: 'funct3', bits: '14:12', value: '000' },
            { name: 'rd', bits: '11:7', type: 'register' },
            { name: 'opcode', bits: '6:0', value: '0110011' }
          ]
        }
      },
      {
        mnemonic: 'LW',
        description: 'Load word',
        syntax: 'LW rd, offset(rs1)',
        encoding: {
          fields: [
            { name: 'imm', bits: '31:20', type: 'immediate' },
            { name: 'rs1', bits: '19:15', type: 'register' },
            { name: 'funct3', bits: '14:12', value: '010' },
            { name: 'rd', bits: '11:7', type: 'register' },
            { name: 'opcode', bits: '6:0', value: '0000011' }
          ]
        }
      }
    ],
    registers: {
      general_purpose: ['x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10', 'x11', 'x12', 'x13', 'x14', 'x15', 'x16', 'x17', 'x18', 'x19', 'x20', 'x21', 'x22', 'x23', 'x24', 'x25', 'x26', 'x27', 'x28', 'x29', 'x30', 'x31'],
      special: ['pc']
    }
  },
  'modular_example.json': {
    name: 'Modular Example',
    description: 'Demonstrates modular ISA design patterns',
    word_size: 16,
    instructions: [
      {
        mnemonic: 'MULT',
        description: 'Multiply registers (custom instruction)',
        syntax: 'MULT rd, rs2',
        encoding: {
          fields: [
            { name: 'funct4', bits: '15:12', value: '1111' },
            { name: 'rs2', bits: '11:9', type: 'register' },
            { name: 'rd', bits: '8:6', type: 'register' },
            { name: 'func3', bits: '5:3', value: '000' },
            { name: 'opcode', bits: '2:0', value: '000' }
          ]
        }
      },
      {
        mnemonic: 'DIV',
        description: 'Divide registers (custom instruction)',
        syntax: 'DIV rd, rs2',
        encoding: {
          fields: [
            { name: 'funct4', bits: '15:12', value: '1111' },
            { name: 'rs2', bits: '11:9', type: 'register' },
            { name: 'rd', bits: '8:6', type: 'register' },
            { name: 'func3', bits: '5:3', value: '001' },
            { name: 'opcode', bits: '2:0', value: '000' }
          ]
        }
      }
    ],
    registers: {
      general_purpose: ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
      special: ['pc', 'sp', 'lr']
    }
  },
  'crazy_isa.json': {
    name: 'Crazy ISA',
    description: 'Experimental ISA definition showcasing unconventional design patterns',
    word_size: 12,
    instructions: [
      {
        mnemonic: 'XOR',
        description: 'Exclusive OR with immediate',
        syntax: 'XOR rd, imm',
        encoding: {
          fields: [
            { name: 'opcode', bits: '11:8', value: '1010' },
            { name: 'rd', bits: '7:4', type: 'register' },
            { name: 'imm', bits: '3:0', type: 'immediate' }
          ]
        }
      },
      {
        mnemonic: 'ROT',
        description: 'Rotate register by immediate',
        syntax: 'ROT rd, imm',
        encoding: {
          fields: [
            { name: 'opcode', bits: '11:8', value: '1011' },
            { name: 'rd', bits: '7:4', type: 'register' },
            { name: 'imm', bits: '3:0', type: 'immediate' }
          ]
        }
      }
    ],
    registers: {
      general_purpose: ['a', 'b', 'c', 'd'],
      special: ['pc', 'flags']
    }
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename to prevent path traversal
    if (!filename.match(/^[a-zA-Z0-9_-]+\.json$/)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Try to serve from isa-files directory
    const filePath = path.join(ISA_FILES_DIR, filename);
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      // Validate the ISA using isa-xform
      try {
        // Write ISA definition to temporary file to avoid shell escaping issues
        const { writeFileSync, unlinkSync } = require('fs');
        const { join } = require('path');
        const { tmpdir } = require('os');
        
        const tempDir = tmpdir();
        const isaFile = join(tempDir, `isa_validate_${Date.now()}.json`);
        const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python');
        
        try {
          writeFileSync(isaFile, fileContent);
          
          const { stdout, stderr } = await execAsync(
            `${pythonPath} -c "import sys; sys.path.append('${process.cwd()}'); from isa_xform import ISALoader; import json; loader = ISALoader(); result = loader.load_isa_from_file('${isaFile}'); print('VALID')"`,
            { timeout: 10000 }
          );
          
          if (stdout.trim() !== 'VALID') {
            console.warn(`ISA validation failed for ${filename}:`, stderr);
            return NextResponse.json(
              { error: 'Invalid ISA definition', details: stderr },
              { status: 400 }
            );
          }
        } finally {
          // Clean up temporary file
          try {
            unlinkSync(isaFile);
          } catch (cleanupError) {
            console.warn('Failed to cleanup temporary validation file:', cleanupError);
          }
        }
      } catch (validationError) {
        console.warn(`ISA validation error for ${filename}:`, validationError);
        // Continue serving the file even if validation fails (for development)
      }

      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      return NextResponse.json(
        { error: `ISA file '${filename}' not found` },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 