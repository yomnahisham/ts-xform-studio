// WARNING: This endpoint is for local/dev use only! DO NOT deploy to production as-is.
import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { cmd } = await req.json();
    if (!cmd || typeof cmd !== 'string') {
      return new Response(JSON.stringify({ error: 'No command provided.' }), { status: 400 });
    }
    // Run the command (no shell injection protection!)
    const { stdout, stderr } = await execAsync(cmd, { timeout: 10000 });
    return new Response(JSON.stringify({ output: stdout + (stderr ? '\n' + stderr : '') }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Command failed.' }), { status: 500 });
  }
} 