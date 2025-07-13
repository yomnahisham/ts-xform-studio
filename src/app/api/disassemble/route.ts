import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";
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
        const isaFile = join(tempDir, `isa_${Date.now()}.json`);
        const binaryFile = join(tempDir, `binary_${Date.now()}.bin`);
        const outputFile = join(tempDir, `output_${Date.now()}.s`);

        try {
            // Write ISA definition and binary data to temporary files
            writeFileSync(isaFile, JSON.stringify(isaDefinition, null, 2));
            writeFileSync(binaryFile, assembledCode);

            // Use xform CLI command instead of Python script
            const command = `xform disassemble --isa "${isaFile}" --input "${binaryFile}" --output "${outputFile}"`;
            
            const { stdout, stderr } = await execAsync(command, { 
                timeout: 10000, 
                cwd: tempDir 
            });

            if (stderr) {
                console.error('Disassembly error:', stderr);
                return NextResponse.json(
                    { error: 'Disassembly failed', details: stderr },
                    { status: 400 }
                );
            }

            // Read the disassembled output
            const disassembledCode = readFileSync(outputFile, 'utf-8');

            return NextResponse.json({
                disassembledCode,
                message: 'Disassembly successful',
                isaName: isaDefinition.name || 'Unknown'
            });

        } finally {
            // Clean up temporary files
            try {
                unlinkSync(isaFile);
                unlinkSync(binaryFile);
                unlinkSync(outputFile);
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
