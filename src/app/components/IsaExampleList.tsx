'use client';

import { useState, useEffect } from 'react';
import { Check, Download, Info, FileText, Cpu, Zap } from 'lucide-react';

interface IsaExample {
  name: string;
  description: string;
  filename: string;
  content?: string;
  category?: string;
}

interface IsaExampleListProps {
  onIsaSelected: (isaContent: string) => void;
}

export default function IsaExampleList({ onIsaSelected }: IsaExampleListProps) {
  const [examples, setExamples] = useState<IsaExample[]>([
    {
      name: 'ZX16',
      description: '16-bit RISC-V inspired ISA by Dr. Mohamed Shalan. Features a clean, educational design with comprehensive instruction set.',
      filename: 'zx16.json',
      category: 'Educational'
    },
    {
      name: 'Simple RISC',
      description: 'Basic RISC-style instruction set perfect for learning computer architecture fundamentals.',
      filename: 'simple_risc.json',
      category: 'Educational'
    },
    {
      name: 'RISC-V RV32I',
      description: 'Base integer instruction set for RISC-V 32-bit processors. Industry-standard architecture.',
      filename: 'riscv_rv32i.json',
      category: 'Industry'
    },
    {
      name: 'Modular Example',
      description: 'Demonstrates modular ISA design patterns with extensible instruction formats.',
      filename: 'modular_example.json',
      category: 'Advanced'
    },
    {
      name: 'Crazy ISA',
      description: 'Experimental ISA definition showcasing unconventional design patterns and features.',
      filename: 'crazy_isa.json',
      category: 'Experimental'
    }
  ]);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Educational': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Industry': return 'text-green-700 bg-green-50 border-green-200';
      case 'Advanced': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'Experimental': return 'text-orange-700 bg-orange-50 border-orange-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Educational': return <FileText className="w-4 h-4" />;
      case 'Industry': return <Cpu className="w-4 h-4" />;
      case 'Advanced': return <Zap className="w-4 h-4" />;
      case 'Experimental': return <Info className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const loadExampleContent = async (filename: string) => {
    setLoading(filename);
    try {
      // TODO: Replace with actual API call to backend
      // For now, we'll simulate loading with a placeholder
      const response = await fetch(`/api/isa-examples/${filename}`);
      if (response.ok) {
        const content = await response.text();
        setExamples(prev => prev.map(ex => 
          ex.filename === filename ? { ...ex, content } : ex
        ));
        setSelectedExample(filename);
        onIsaSelected(content);
      } else {
        // Fallback: use placeholder content for demo
        const placeholderContent = JSON.stringify({
          name: filename.replace('.json', ''),
          description: `Example ISA: ${filename}`,
          word_size: 16,
          instructions: [
            {
              mnemonic: "ADD",
              description: "Add registers",
              syntax: "ADD rd, rs1, rs2",
              encoding: {
                fields: [
                  { name: "opcode", bits: "15:12", value: "0000" },
                  { name: "rd", bits: "11:9", type: "register" },
                  { name: "rs1", bits: "8:6", type: "register" },
                  { name: "rs2", bits: "5:3", type: "register" },
                  { name: "funct", bits: "2:0", value: "000" }
                ]
              }
            }
          ],
          registers: {
            general_purpose: ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"],
            special: ["pc", "sp"]
          }
        }, null, 2);
        
        setExamples(prev => prev.map(ex => 
          ex.filename === filename ? { ...ex, content: placeholderContent } : ex
        ));
        setSelectedExample(filename);
        onIsaSelected(placeholderContent);
      }
    } catch (error) {
      console.error('Error loading example:', error);
    } finally {
      setLoading(null);
    }
  };

      return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Choose an ISA Example</h3>
          <p className="text-gray-600">Select from built-in ISA examples to get started quickly</p>
        </div>

              <div className="grid gap-4">
          {examples.map((example) => (
            <div
              key={example.filename}
              className={`group cursor-pointer transition-all duration-300 ${
                selectedExample === example.filename
                  ? 'bg-gradient-to-br from-green-50 to-teal-50 border-green-500/50 shadow-lg shadow-green-500/10'
                  : 'bg-white/80 border-gray-200 hover:bg-white hover:border-gray-300'
              } border rounded-xl p-6`}
              onClick={() => loadExampleContent(example.filename)}
            >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-xl font-semibold text-gray-800">{example.name}</h4>
                  {example.category && (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(example.category)}`}>
                      {getCategoryIcon(example.category)}
                      {example.category}
                    </span>
                  )}
                  {selectedExample === example.filename && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                  {loading === example.filename && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium">Loading...</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 leading-relaxed mb-3">{example.description}</p>
                <div className="flex items-center gap-4 text-gray-500 text-sm">
                  <span>File: {example.filename}</span>
                  <span>•</span>
                  <span>Ready to use</span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-slate-400 hover:text-white transition-colors">
                  <Info className="w-4 h-4" />
                </button>
                <button className="p-2 text-slate-400 hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h4 className="font-semibold text-yellow-400 mb-2">About ISA Examples</h4>
            <p className="text-yellow-300 text-sm leading-relaxed">
              These examples are from the py-isa-xform library. Each example demonstrates different 
              ISA design patterns and can be used as a starting point for your own custom instruction sets.
              Choose an example that matches your learning goals or project requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 