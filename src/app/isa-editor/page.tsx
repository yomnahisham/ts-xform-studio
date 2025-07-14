'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Trash2, 
  ChevronRight, 
  X, 
  Search,
  Check,
  AlertCircle,
  Loader2,
  Download,
  Info,
  Cpu,
  Zap,
  Folder,
  FolderOpen,
  File,
  Plus,
  Settings,
  Play,
  Save,
  FolderPlus,
  FilePlus,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  MoreHorizontal,
  GitBranch,
  Edit3,
  Copy,
  Home,
  Moon,
  Sun
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import Image from 'next/image';
import JSZip from 'jszip';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  isOpen?: boolean;
  children?: FileNode[];
  path?: string;
}

interface Tab {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
  fileId?: string;
}

interface ContextMenu {
  x: number;
  y: number;
  targetId: string;
  targetType: 'file' | 'folder' | 'tab';
}

interface DragState {
  draggedId: string;
  draggedType: 'file' | 'folder';
  draggedName: string;
}

function addOrUpdateFolder(root: FileNode[], newFolder: FileNode): FileNode[] {
  const updated = [...root];
  const index = updated.findIndex(node => node.name === newFolder.name && node.type === 'folder');

  if (index !== -1) {
    const existing = updated[index];
    const existingChildren = existing.children || [];

    // Merge or replace files in the folder
    const newChildren = newFolder.children || [];
    const mergedChildren = [...existingChildren];

    for (const child of newChildren) {
      const childIndex = mergedChildren.findIndex(c => c.name === child.name);
      if (childIndex !== -1) {
        mergedChildren[childIndex] = child; // Replace existing
      } else {
        mergedChildren.push(child); // Add new
      }
    }

    updated[index] = {
      ...existing,
      children: mergedChildren
    };
  } else {
    updated.push(newFolder); // Add as new folder
  }

  return updated;
}

const downloadBinary = async (
  isaDefinition: any,
  assemblyCode: string,
  asmFileName: string
) => {
  const res = await fetch('/api/assemble?download=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isaDefinition, assemblyCode }),
  });

  if (!res.ok) {
    throw new Error('Download failed.');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const baseName = asmFileName.replace(/\.[^/.]+$/, '');
  a.download = `${baseName}_output.bin`;

  a.click();
  window.URL.revokeObjectURL(url);
};

function formatHexByWordLength(hexString: string, wordLengthBits: number): string {
  const wordLengthChars = wordLengthBits / 4; // 4 bits per hex digit
  const chunks: string[] = [];

  for (let i = 0; i < hexString.length; i += wordLengthChars) {
    chunks.push(hexString.slice(i, i + wordLengthChars));
  }

  return chunks.join(' ');
}

export default function IsaEditor() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [files, setFiles] = useState<FileNode[]>([
    {
      id: 'isa_definitions',
      name: 'isa_definitions',
      type: 'folder',
      isOpen: true,
      path: '/isa_definitions',
      children: [
        {
          id: 'custom-isa',
          name: 'custom-isa.json',
          type: 'file',
          path: '/isa_definitions/custom-isa.json',
          content: `{
  "name": "Custom ISA",
  "description": "Your custom instruction set architecture",
  "word_size": 16,
  "instructions": [
    {
      "mnemonic": "ADD",
      "description": "Add two registers",
      "syntax": "ADD rd, rs1, rs2",
      "encoding": {
        "fields": [
          { "name": "opcode", "bits": "15:12", "value": "0000" },
          { "name": "rd", "bits": "11:9", "type": "register" },
          { "name": "rs1", "bits": "8:6", "type": "register" },
          { "name": "rs2", "bits": "5:3", "type": "register" },
          { "name": "funct", "bits": "2:0", "value": "000" }
        ]
      }
    }
  ],
  "registers": {
    "general_purpose": ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"],
    "special": ["pc", "sp"]
  }
}`,
          language: 'json'
        }
      ]
    },
    {
      id: 'assembly_code',
      name: 'assembly_code',
      type: 'folder',
      isOpen: true,
      path: '/assembly_code',
      children: [
        {
          id: 'main-asm',
          name: 'main.asm',
          type: 'file',
          path: '/assembly_code/main.asm',
          content: `; Assembly code for Custom ISA
; Example program

START:
  ADD r1, r2, r3    ; Add r2 and r3, store in r1
  SUB r4, r1, r5    ; Subtract r5 from r1, store in r4
  JMP START         ; Jump back to start

; Data section
DATA:
  .word 0x1234      ; Some data
  .word 0x5678      ; More data`,
          language: 'assembly'
        }
      ]
    }
  ]);

  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'custom-isa',
      name: 'custom-isa.json',
      content: `{
  "name": "Custom ISA",
  "version": "1.0",
  "description": "Your custom instruction set architecture",
  "word_size": 16,
  "endianness": "little",
  "instruction_size": 16,
  "instructions": [
    {
      "mnemonic": "ADD",
      "description": "Add two registers",
      "syntax": "ADD rd, rs1, rs2",
      "encoding": {
        "fields": [
          { "name": "opcode", "bits": "15:12", "value": "0000" },
          { "name": "rd", "bits": "11:9", "type": "register" },
          { "name": "rs1", "bits": "8:6", "type": "register" },
          { "name": "rs2", "bits": "5:3", "type": "register" },
          { "name": "funct", "bits": "2:0", "value": "000" }
        ]
      }
    }
  ],
  "registers": {
    "general_purpose": ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"],
    "special": ["pc", "sp"]
  }
}`,
      language: 'json',
      isDirty: false,
      fileId: 'custom-isa'
    }
  ]);

  const [activeTab, setActiveTab] = useState<string>('custom-isa');
  const [showExplorer, setShowExplorer] = useState<boolean>(true);
  const [showExamples, setShowExamples] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string>('');
  const [creatingFile, setCreatingFile] = useState<{ parentId?: string; placeholder: string } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationDetails, setValidationDetails] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [terminalLoading, setTerminalLoading] = useState(false);

  // Resizable split state
  const [terminalHeight, setTerminalHeight] = useState(300); // px, default
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Scroll to bottom on new terminal output
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory]);

  const [cwd, setCwd] = useState<string[]>(['/']); // e.g. ['/', 'isa_definitions']

  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  function getNodeByPath(pathArr: string[], nodes: FileNode[]): FileNode | null {
    if (pathArr.length === 0 || (pathArr.length === 1 && pathArr[0] === '/')) return { id: 'root', name: '/', type: 'folder', children: nodes };
    let curr: FileNode | null = null;
    let children = nodes;
    for (const part of pathArr.slice(1)) {
      curr = children.find(n => n.name === part && n.type === 'folder') || null;
      if (!curr) return null;
      children = curr.children || [];
    }
    return curr;
  }

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const input = terminalInput.trim();
    setTerminalHistory(prev => [...prev, `$ ${input}`]);
    setTerminalInput('');

    const [cmd, ...args] = input.split(/\s+/);
    let output = '';
    let success = true;
    let newFiles = files;
    let newCwd = [...cwd];
    const cwdNode = getNodeByPath(cwd, files);
    const cwdChildren = cwdNode?.children || files;

    function findFile(name: string): FileNode | null {
      return cwdChildren.find(f => f.name === name) || null;
    }

    setCommandHistory(prev => [...prev, input]);

    switch (cmd) {
      case 'ls': {
        let target = cwdChildren;
        if (args[0] && args[0] !== '-l') {
          const folder = cwdChildren.find(f => f.name === args[0] && f.type === 'folder');
          if (folder) target = folder.children || [];
          else { output = `❌ No such folder: ${args[0]}`; success = false; break; }
        }
        if (args[0] === '-l') {
          output = target.map(f => `${f.type === 'folder' ? 'd' : '-'} ${f.name}`).join('\n');
        } else {
          output = target.map(f => f.name + (f.type === 'folder' ? '/' : '')).join('  ');
        }
        break;
      }
      case 'tree': {
        function printTree(nodes: FileNode[], prefix = ''): string {
          return nodes.map((n, i) => {
            const isLast = i === nodes.length - 1;
            const branch = prefix + (isLast ? '└── ' : '├── ');
            let line = branch + n.name + (n.type === 'folder' ? '/' : '');
            if (n.type === 'folder' && n.children) {
              line += '\n' + printTree(n.children, prefix + (isLast ? '    ' : '│   '));
            }
            return line;
          }).join('\n');
        }
        output = printTree(cwdChildren);
        break;
      }
      case 'clear':
        setTerminalHistory([]);
        return;
      case 'cp': {
        if (args.length < 2) { output = '❌ Usage: cp <src> <dest>'; success = false; break; }
        const src = findFile(args[0]);
        if (!src || src.type !== 'file') { output = `❌ No such file: ${args[0]}`; success = false; break; }
        if (findFile(args[1])) { output = `❌ File already exists: ${args[1]}`; success = false; break; }
        const copy: FileNode = { ...src, id: `file-${Date.now()}`, name: args[1] };
        if (cwd.length === 1) newFiles = [...files, copy];
        else newFiles = updateFileNode(files, cwd[cwd.length-1], { children: [...(cwdChildren || []), copy] });
        output = `✔️ Copied ${args[0]} to ${args[1]}`;
        break;
      }
      case 'mv':
      case 'rename': {
        if (args.length < 2) { output = `❌ Usage: ${cmd} <src> <dest>`; success = false; break; }
        const src = findFile(args[0]);
        if (!src) { output = `❌ No such file or folder: ${args[0]}`; success = false; break; }
        if (findFile(args[1])) { output = `❌ Target already exists: ${args[1]}`; success = false; break; }
        // Remove old, add new with new name
        newFiles = removeFileNode(files, src.id);
        const renamed = { ...src, id: `${src.type}-${Date.now()}`, name: args[1] };
        if (cwd.length === 1) newFiles = [...newFiles, renamed];
        else newFiles = updateFileNode(newFiles, cwd[cwd.length-1], { children: [...(cwdChildren.filter(f => f.id !== src.id)), renamed] });
        output = `✔️ Renamed ${args[0]} to ${args[1]}`;
        break;
      }
      case 'rmdir': {
        if (args.length === 0) { output = '❌ Usage: rmdir <folder>'; success = false; break; }
        const folder = findFile(args[0]);
        if (!folder || folder.type !== 'folder') { output = `❌ No such folder: ${args[0]}`; success = false; break; }
        if (folder.children && folder.children.length > 0) { output = '❌ Folder not empty'; success = false; break; }
        newFiles = removeFileNode(files, folder.id);
        output = `✔️ Removed folder: ${args[0]}`;
        break;
      }
      case 'pwd':
        output = cwd.join('/') || '/';
        break;
      case 'cd':
        if (args.length === 0 || args[0] === '/') {
          newCwd = ['/'];
        } else if (args[0] === '..') {
          if (cwd.length > 1) newCwd = cwd.slice(0, -1);
        } else {
          const folder = cwdChildren.find(f => f.name === args[0] && f.type === 'folder');
          if (folder) newCwd = [...cwd, folder.name];
          else { output = `❌ No such folder: ${args[0]}`; success = false; }
        }
        break;
      case 'cat':
        if (args.length === 0) { output = '❌ Usage: cat <file>'; success = false; break; }
        const file = findFile(args[0]);
        if (file && file.type === 'file') output = file.content || '';
        else { output = `❌ No such file: ${args[0]}`; success = false; }
        break;
      case 'touch':
        if (args.length === 0) { output = '❌ Usage: touch <file>'; success = false; break; }
        if (findFile(args[0])) { output = `❌ File already exists: ${args[0]}`; success = false; break; }
        const newFile: FileNode = { id: `file-${Date.now()}`, name: args[0], type: 'file', content: '', path: `${cwd.join('/')}/${args[0]}` };
        if (cwd.length === 1) newFiles = [...files, newFile];
        else newFiles = updateFileNode(files, cwd[cwd.length-1], { children: [...(cwdChildren || []), newFile] });
        output = `✔️ Created file: ${args[0]}`;
        break;
      case 'mkdir':
        if (args.length === 0) { output = '❌ Usage: mkdir <folder>'; success = false; break; }
        if (findFile(args[0])) { output = `❌ Folder already exists: ${args[0]}`; success = false; break; }
        const newFolder: FileNode = { id: `folder-${Date.now()}`, name: args[0], type: 'folder', isOpen: true, path: `${cwd.join('/')}/${args[0]}`, children: [] };
        if (cwd.length === 1) newFiles = [...files, newFolder];
        else newFiles = updateFileNode(files, cwd[cwd.length-1], { children: [...(cwdChildren || []), newFolder] });
        output = `✔️ Created folder: ${args[0]}`;
        break;
      case 'rm':
        if (args.length === 0) { output = '❌ Usage: rm <file/folder>'; success = false; break; }
        if (!findFile(args[0])) { output = `❌ No such file or folder: ${args[0]}`; success = false; break; }
        newFiles = removeFileNode(files, findFile(args[0])!.id);
        output = `✔️ Deleted: ${args[0]}`;
        break;
      case 'echo':
        output = args.join(' ');
        break;
      case 'help':
        output = 'Supported commands: ls, cd, cat, touch, mkdir, rm, echo, pwd, help';
        break;
      default:
        output = `❌ Unknown command: ${cmd}`;
        success = false;
    }
    setFiles(newFiles);
    setCwd(newCwd);
    setTerminalHistory(prev => [...prev, output]);
  };

  const examples = [
    {
      name: 'ZX16',
      description: '16-bit RISC-V inspired ISA by Dr. Mohamed Shalan',
      filename: 'zx16.json',
      category: 'Educational'
    },
    {
      name: 'Simple RISC',
      description: 'Basic RISC-style instruction set for learning',
      filename: 'simple_risc.json',
      category: 'Educational'
    },
    {
      name: 'RISC-V RV32I',
      description: 'Base integer instruction set for RISC-V 32-bit processors',
      filename: 'riscv_rv32i.json',
      category: 'Industry'
    },
    {
      name: 'Custom Modular ISA',
      description: 'Experimental ISA with unconventional design patterns',
      filename: 'custom_modular_isa.json',
      category: 'Experimental'
    },
    {
      name: 'Complete User ISA Example',
      description: 'Comprehensive ISA example with all features',
      filename: 'complete_user_isa_example.json',
      category: 'Educational'
    }
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S for save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
      // Ctrl+N for new file
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        handleNewFile();
      }
      // Ctrl+O for open
      if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
        event.preventDefault();
        handleUploadClick();
      }
      // Ctrl+E for examples
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        setShowExamples(true);
      }
      // Ctrl+W for close tab
      if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
        event.preventDefault();
        handleCloseTab(activeTab);
      }
      // Ctrl+V for validate ISA
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault();
        handleValidate();
      }
      // Escape to close context menu and examples sidebar
      if (event.key === 'Escape') {
        setContextMenu(null);
        setShowExamples(false);
        setEditingFile(null);
        setCreatingFile(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, showExamples]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getCurrentTab = () => tabs.find(tab => tab.id === activeTab);

  const handleTabChange = (value: string | undefined) => {
    const content = value || '';
    setTabs(prev => prev.map(tab => 
      tab.id === activeTab 
        ? { ...tab, content, isDirty: true }
        : tab
    ));
    // Auto-save to file tree
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (currentTab && currentTab.fileId) {
      setFiles(prev => updateFileNode(prev, currentTab.fileId!, {
        content
      }));
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleCloseTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isDirty) {
      // TODO: Show save dialog
      if (confirm('Do you want to save changes before closing?')) {
        handleSave();
      }
    }
    
    if (tabs.length <= 1) return;
    
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    
    if (activeTab === tabId) {
      const remainingTabs = tabs.filter(tab => tab.id !== tabId);
      setActiveTab(remainingTabs[0]?.id || '');
    }
  };

  const handleNewFolder = () => {
    const newId = `folder-${Date.now()}`;
    const newFolder: FileNode = {
      id: newId,
      name: 'New Folder',
      type: 'folder',
      isOpen: false,
      path: `/${newId}`,
      children: []
    };
    
    setFiles(prev => [...prev, newFolder]);
    setEditingFile(newId);
    setNewFileName('New Folder');
  };

  const handleNewFile = (parentId?: string) => {
    setCreatingFile({ parentId, placeholder: 'untitled.txt' });
    setNewFileName('untitled.txt');
  };

  const handleNewFileConfirm = () => {
    if (!creatingFile || !newFileName.trim()) return;
    
    const fileName = newFileName.trim();
    const newId = `file-${Date.now()}`;
    const newFile: FileNode = {
      id: newId,
      name: fileName,
      type: 'file',
      path: `/isa_definitions/${fileName}`,
      content: '',
      language: getLanguageFromFileName(fileName)
    };
    // Always add .json files to ISA Definitions folder
    if (fileName.toLowerCase().endsWith('.json')) {
      setFiles(prev => updateFileNode(prev, 'isa_definitions', {
        children: [...(findFileNode(prev, 'isa_definitions')?.children || []), newFile]
      }));
    } else if (creatingFile.parentId) {
      setFiles(prev => updateFileNode(prev, creatingFile.parentId!, {
        children: [...(findFileNode(prev, creatingFile.parentId!)?.children || []), newFile]
      }));
    } else {
      setFiles(prev => [...prev, newFile]);
    }
    const newTab: Tab = {
      id: newId,
      name: fileName,
      content: '',
      language: getLanguageFromFileName(fileName),
      isDirty: false,
      fileId: newId
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTab(newId);
    setCreatingFile(null);
    setNewFileName('');
    setTerminalHistory(prev => [...prev, `✔️ Created file: ${fileName}`]);
  };

  const handleSave = () => {
    const currentTab = getCurrentTab();
    if (!currentTab) return;
    
    setTabs(prev => prev.map(tab => 
      tab.id === activeTab 
        ? { ...tab, isDirty: false }
        : tab
    ));
    
    // Update file content if it's linked to a file
    if (currentTab.fileId) {
      setFiles(prev => updateFileNode(prev, currentTab.fileId!, {
        content: currentTab.content
      }));
    }
  };


  const handleDeleteFile = (fileId: string) => {
    const file = findFileNode(files, fileId);
    if (!file) return;
    
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      // Remove from files
      setFiles(prev => removeFileNode(prev, fileId));
      
      // Close associated tab
      const associatedTab = tabs.find(tab => tab.fileId === fileId);
      if (associatedTab) {
        handleCloseTab(associatedTab.id);
      }
      
      setTerminalHistory(prev => [...prev, `✔️ Deleted file: ${file.name}`]);
    }
  };

  const handleRenameFile = (fileId: string) => {
    const file = findFileNode(files, fileId);
    if (!file) return;
    
    setEditingFile(fileId);
    setNewFileName(file.name);
    setTerminalHistory(prev => [...prev, `✔️ Renamed file: ${file.name} -> ${newFileName.trim()}`]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const newId = `file-${Date.now()}`;
      const newTab: Tab = {
        id: newId,
        name: file.name,
        content,
        language: getLanguageFromFileName(file.name),
        isDirty: false,
        fileId: newId
      };
      const newFile: FileNode = {
        id: newId,
        name: file.name,
        type: 'file',
        path: `/isa_definitions/${file.name}`,
        content,
        language: getLanguageFromFileName(file.name)
      };
      // Always add .json files to ISA Definitions folder
      if (file.name.toLowerCase().endsWith('.json')) {
        setFiles(prev => updateFileNode(prev, 'isa_definitions', {
          children: [...(findFileNode(prev, 'isa_definitions')?.children || []), newFile]
        }));
      } else {
        setFiles(prev => [...prev, newFile]);
      }
      setTabs(prev => [...prev, newTab]);
      setActiveTab(newId);
      setTerminalHistory(prev => [...prev, `✔️ Imported file: ${file.name}`]);
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const loadExample = async (filename: string) => {
    try {
      // Try to load from the actual file first
      const response = await fetch(`/api/isa-examples/${filename}`);
      if (response.ok) {
        const content = await response.text();
        const newId = `file-${Date.now()}`;
        const newTab: Tab = {
          id: newId,
          name: filename,
          content,
          language: 'json',
          isDirty: false,
          fileId: newId
        };
        const newFile: FileNode = {
          id: newId,
          name: filename,
          type: 'file',
          path: `/isa_definitions/${filename}`,
          content,
          language: 'json'
        };
        // Always add to ISA Definitions folder
        setFiles(prev => updateFileNode(prev, 'isa_definitions', {
          children: [...(findFileNode(prev, 'isa_definitions')?.children || []), newFile]
        }));
        setTabs(prev => [...prev, newTab]);
        setActiveTab(newId);
        setShowExamples(false);
        setTerminalHistory(prev => [...prev, `✔️ Example "${filename}" loaded`]);
      } else {
        // Fallback to placeholder content
        const placeholderContent = JSON.stringify({
          name: filename.replace('.json', ''),
          version: "1.0",
          description: `Example ISA: ${filename}`,
          word_size: 16,
          endianness: "little",
          instruction_size: 16,
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
        
        const newId = `file-${Date.now()}`;
        const newTab: Tab = {
          id: newId,
          name: filename,
          content: placeholderContent,
          language: 'json',
          isDirty: false,
          fileId: newId
        };
        
        const newFile: FileNode = {
          id: newId,
          name: filename,
          type: 'file',
          path: `/${filename}`,
          content: placeholderContent,
          language: 'json'
        };
        
        setFiles(prev => [...prev, newFile]);
        setTabs(prev => [...prev, newTab]);
        setActiveTab(newId);
        setTerminalHistory(prev => [...prev, `✔️ Example "${filename}" loaded`]);
        setShowExamples(false);
      }
    } catch (err) {
      setTerminalHistory(prev => [...prev, '❌ Error: Failed to load example.']);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

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
      case 'Educational': return <FileText className="w-3 h-3" />;
      case 'Industry': return <Cpu className="w-3 h-3" />;
      case 'Advanced': return <Zap className="w-3 h-3" />;
      case 'Experimental': return <Info className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getLanguageFromFileName = (fileName: string): string => {
    if (fileName.endsWith('.json')) return 'json';
    if (fileName.endsWith('.asm')) return 'assembly';
    if (fileName.endsWith('.js') || fileName.endsWith('.ts')) return 'javascript';
    if (fileName.endsWith('.py')) return 'python';
    if (fileName.endsWith('.html') || fileName.endsWith('.htm')) return 'html';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.md')) return 'markdown';
    if (fileName.endsWith('.xml')) return 'xml';
    if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return 'yaml';
    if (fileName.endsWith('.sh') || fileName.endsWith('.bash')) return 'shell';
    if (fileName.endsWith('.c') || fileName.endsWith('.cpp') || fileName.endsWith('.h')) return 'cpp';
    if (fileName.endsWith('.java')) return 'java';
    if (fileName.endsWith('.rs')) return 'rust';
    if (fileName.endsWith('.go')) return 'go';
    if (fileName.endsWith('.rb')) return 'ruby';
    if (fileName.endsWith('.php')) return 'php';
    if (fileName.endsWith('.sql')) return 'sql';
    return 'text';
  };

  const findFileNode = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFileNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const updateFileNode = (nodes: FileNode[], id: string, updates: Partial<FileNode>): FileNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return { ...node, ...updates };
      }
      if (node.children) {
        return { ...node, children: updateFileNode(node.children, id, updates) };
      }
      return node;
    });
  };

  const removeFileNode = (nodes: FileNode[], id: string): FileNode[] => {
    return nodes.filter(node => {
      if (node.id === id) return false;
      if (node.children) {
        node.children = removeFileNode(node.children, id);
      }
      return true;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, targetId: string, targetType: 'file' | 'folder' | 'tab') => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetId,
      targetType
    });
  };

  const handleNameEdit = (fileId: string) => {
    const file = findFileNode(files, fileId);
    if (!file || !newFileName.trim()) return;
    
    setFiles(prev => updateFileNode(prev, fileId, { name: newFileName.trim() }));
    setEditingFile(null);
    setNewFileName('');
    setTerminalHistory(prev => [...prev, `✔️ Renamed file: ${file.name} -> ${newFileName.trim()}`]);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'row-resize';
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDraggingRef.current || !sidebarRef.current) return;
    const sidebarRect = sidebarRef.current.getBoundingClientRect();
    let newHeight = e.clientY - sidebarRect.top;
    // Clamp min/max
    newHeight = Math.max(100, Math.min(newHeight, sidebarRect.height - 100));
    setTerminalHeight(newHeight);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    document.body.style.cursor = '';
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleDrag(e);
    const onUp = () => handleDragEnd();
    if (isDraggingRef.current) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingRef.current]);

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(targetId);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragState || dragState.draggedId === targetId) {
      setDragState(null);
      setDragOverId(null);
      return;
    }
    const draggedNode = findFileNode(files, dragState.draggedId);
    const targetNode = findFileNode(files, targetId);
    if (!draggedNode || !targetNode) {
      setDragState(null);
      setDragOverId(null);
      return;
    }
    // Don't allow dropping a folder into itself or its children
    if (dragState.draggedType === 'folder' && isDescendant(targetId, dragState.draggedId)) {
      showToast('error', 'Cannot move a folder into itself or its children');
      setDragState(null);
      setDragOverId(null);
      return;
    }
    moveNode(dragState.draggedId, targetId);
    setDragState(null);
    setDragOverId(null);
    setTerminalHistory(prev => [...prev, `✔️ Moved ${draggedNode.name} to ${targetNode.name}`]);
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <div 
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer text-sm group ${
            level > 0 ? 'ml-' + (level * 4) : ''
          } ${
            darkMode 
              ? 'hover:bg-[#3e3e42]' 
              : 'hover:bg-gray-100'
          } ${
            dragOverId === node.id 
              ? darkMode 
                ? 'bg-[#2a2d2e] border border-[#007acc] rounded' 
                : 'bg-blue-50 border border-blue-300 rounded'
              : ''
          } ${
            dragState?.draggedId === node.id ? 'opacity-50' : ''
          }`}
          draggable
          onDragStart={(e) => handleDragStart(e)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
          onDragEnd={handleDragEnd}
          onClick={() => {
            if (node.type === 'folder') {
              setFiles(prev => updateFileNode(prev, node.id, { isOpen: !node.isOpen }));
            } else {
              // Open file in new tab
              const existingTab = tabs.find(tab => tab.fileId === node.id);
              if (existingTab) {
                setActiveTab(existingTab.id);
              } else {
                const newId = `file-${Date.now()}`;
                const newTab: Tab = {
                  id: newId,
                  name: node.name,
                  content: node.content || '',
                  language: node.language || 'text',
                  isDirty: false,
                  fileId: node.id
                };
                setTabs(prev => [...prev, newTab]);
                setActiveTab(newId);
              }
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node.id, node.type)}
        >
          {node.type === 'folder' ? (
            <>
              {node.isOpen ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronRightIcon className="w-3 h-3 text-gray-500" />
              )}
              {node.isOpen ? (
                <FolderOpen className="w-3 h-3 text-blue-500" />
              ) : (
                <Folder className="w-3 h-3 text-blue-500" />
              )}
            </>
          ) : (
            <File className="w-3 h-3 text-gray-600" />
          )}
          
          {editingFile === node.id ? (
            <input
              ref={newFileInputRef}
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => handleNameEdit(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNameEdit(node.id);
                } else if (e.key === 'Escape') {
                  setEditingFile(null);
                  setNewFileName('');
                }
              }}
              className={`flex-1 border border-blue-500 rounded px-1 text-sm focus:outline-none ${
                darkMode 
                  ? 'bg-[#3c3c3c] text-[#cccccc]' 
                  : 'bg-white'
              }`}
              autoFocus
            />
          ) : (
            <span className={`truncate flex-1 ${darkMode ? 'text-[#cccccc]' : ''}`}>{node.name}</span>
          )}
          
          {node.type === 'file' && node.name.toLowerCase().endsWith('.json') && node.id === activeIsaFileId && (
            <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block" title="Active ISA" />
          )}
          {node.type === 'file' && node.name.toLowerCase().endsWith('.asm') && node.id === activeAsmFileId && (
            <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block" title="Active Assembly" />
          )}
          
          <button
            className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${
              darkMode ? 'hover:bg-[#3e3e42]' : 'hover:bg-gray-200'
            }`}
            onClick={e => {
              e.stopPropagation();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                targetId: node.id,
                targetType: node.type
              });
            }}
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
        {node.type === 'folder' && node.isOpen && node.children && (
          <div className="ml-4">
            {renderFileTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  // Helper to recursively find the first file matching a predicate
  function findFirstFileRecursive(nodes: FileNode[], predicate: (f: FileNode) => boolean): FileNode | null {
    for (const node of nodes) {
      if (node.type === 'file' && predicate(node)) return node;
      if (node.children) {
        const found = findFirstFileRecursive(node.children, predicate);
        if (found) return found;
      }
    }
    return null;
  }

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      // Find the active ISA file or the first JSON file
      const isaFile = activeIsaFileId ? findFileNode(files, activeIsaFileId) : findFirstFileRecursive(files, f => f.name.toLowerCase().endsWith('.json'));
      
      if (!isaFile) {
        setTerminalHistory(prev => [...prev, 'Error: No ISA JSON file found. Please create or select an ISA file.']);
        setIsValidating(false);
        return;
      }

      // Parse ISA JSON
      let isaJson;
      try {
        isaJson = JSON.parse(isaFile.content || '');
      } catch (e) {
        setTerminalHistory(prev => [...prev, 'Error: ISA JSON is invalid. Please check the JSON syntax.']);
        setIsValidating(false);
        return;
      }

      // Call the validation API
      const res = await fetch('/api/validate-isa/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isaDefinition: isaJson })
      });

      const data = await res.json();
      
      if (data.valid) {
        setTerminalHistory(prev => [...prev, `✅ ISA "${data.isaName}" is valid!`]);
        showToast('success', `ISA "${data.isaName}" is valid`);
      } else {
        setTerminalHistory(prev => [...prev, `❌ ISA validation failed: ${data.message}`]);
        if (data.details) {
          setTerminalHistory(prev => [...prev, `Details: ${data.details}`]);
        }
        showToast('error', `ISA validation failed: ${data.message}`);
      }
    } catch (e) {
      setTerminalHistory(prev => [...prev, 'Error: Failed to validate ISA.']);
      showToast('error', 'Failed to validate ISA');
    }
    setIsValidating(false);
  };


  const handleAssemble = async (downloadBinary = false) => {
    setIsRunning(true);
    setTerminalLoading(true);
    
    try {
      // Find ISA and Assembly files
      const isaFile = activeIsaFileId 
        ? findFileNode(files, activeIsaFileId) 
        : findFirstFileRecursive(files, f => f.name.toLowerCase().endsWith('.json'));
      
      const asmFile = activeAsmFileId 
        ? findFileNode(files, activeAsmFileId) 
        : findFirstFileRecursive(files, f => f.name.toLowerCase().endsWith('.asm'));

      if (!isaFile || !asmFile) {
        throw new Error('Please ensure you have both a valid ISA JSON file and an Assembly (.asm) file.');
      }

      // Validate ISA JSON
      let isaJson;
      try {
        isaJson = JSON.parse(isaFile.content || '');
      } catch (e) {
        throw new Error('ISA JSON is invalid. Please check the JSON syntax.');
      }

      setTerminalHistory(prev => [...prev, `🔧 Assembling ${asmFile.name} with ISA ${isaFile.name}...`]);

      // Make API call
      const apiUrl = downloadBinary ? '/api/assemble?download=true' : '/api/assemble';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isaDefinition: isaJson, 
          assemblyCode: asmFile.content || '' 
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`${errorData.error}${errorData.details ? `\n${errorData.details}` : ''}`);
      }

      if (downloadBinary) {
        // Handle binary download
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const baseName = asmFile.name.replace(/\.[^/.]+$/, '');
        a.download = `${baseName}_output.bin`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        setTerminalHistory(prev => [...prev, `✅ Assembly successful! Downloaded: ${baseName}_output.bin`]);
        showToast('success', 'Binary file downloaded successfully');
      } else {
        // Handle JSON response
        const data = await res.json();
        
        setTerminalHistory(prev => [...prev, `✅ Assembly successful!`]);
        
        // Convert assembledCode array to hex string
        const hexString = data.assembledCode.map((byte: number) => byte.toString(16).padStart(2, '0')).join('');
        setTerminalHistory(prev => [...prev, `📄 Machine Code: ${hexString}`]);
        
        if (data.details) {
          setTerminalHistory(prev => [...prev, `📋 Output: ${data.details}`]);
        }

        // Create output file with formatted hex
        const formattedHex = formatHexByWordLength(hexString, isaJson.word_size || 16);
        const outputFile: FileNode = {
          id: `output-${Date.now()}`,
          name: `${asmFile.name.replace(/\.[^/.]+$/, '')}_output.hex`,
          type: 'file',
          content: formattedHex,
          language: 'text',
          path: `/output/${asmFile.name.replace(/\.[^/.]+$/, '')}_output.hex`
        };

        // Add to output folder or create it
        const outputFolder: FileNode = {
          id: 'output',
          name: 'output',
          type: 'folder',
          isOpen: true,
          path: '/output',
          children: [outputFile]
        };

        setFiles(prev => addOrUpdateFolder(prev, outputFolder));
        showToast('success', 'Assembly compiled successfully');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setTerminalHistory(prev => [...prev, `❌ Assembly failed: ${errorMessage}`]);
      showToast('error', `Assembly failed: ${errorMessage}`);
    } finally {
      setIsRunning(false);
      setTerminalLoading(false);
    }
  };

  const handleDisassemble = async () => {
    setIsRunning(true);
    setTerminalLoading(true);
    
    try {
      // Find ISA and Binary files
      const isaFile = activeIsaFileId 
        ? findFileNode(files, activeIsaFileId) 
        : findFirstFileRecursive(files, f => f.name.toLowerCase().endsWith('.json'));
      
      // Simplified: just find the first binary/hex file
      const binaryFile = findFirstFileRecursive(files, f => 
        f.name.toLowerCase().endsWith('.bin') || 
        f.name.toLowerCase().endsWith('.hex')
      );

      if (!isaFile || !binaryFile) {
        throw new Error('Please ensure you have both a valid ISA JSON file and a Binary (.bin or .hex) file.');
      }

      // Validate ISA JSON
      let isaJson;
      try {
        isaJson = JSON.parse(isaFile.content || '');
      } catch (e) {
        throw new Error('ISA JSON is invalid. Please check the JSON syntax.');
      }

      setTerminalHistory(prev => [...prev, `🔧 Disassembling ${binaryFile.name} with ISA ${isaFile.name}...`]);

      // Make API call to disassemble endpoint
      const res = await fetch('/api/disassemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isaDefinition: isaJson, 
          assembledCode: binaryFile.content || '' 
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`${errorData.error}${errorData.details ? `\n${errorData.details}` : ''}`);
      }

      // Handle JSON response
      const data = await res.json();
      
      setTerminalHistory(prev => [...prev, `✅ Disassembly successful!`]);
      setTerminalHistory(prev => [...prev, `📄 Assembly Code: ${data.disassembledCode}`]);
      
      if (data.message) {
        setTerminalHistory(prev => [...prev, `📋 Info: ${data.message}`]);
      }

      // Create output file with disassembled code
      const outputFile: FileNode = {
        id: `disassembled-${Date.now()}`,
        name: `${binaryFile.name.replace(/\.[^/.]+$/, '')}_disassembled.asm`,
        type: 'file',
        content: data.disassembledCode,
        language: 'assembly',
        path: `/output/${binaryFile.name.replace(/\.[^/.]+$/, '')}_disassembled.asm`
      };

      // Add to output folder or create it
      const outputFolder: FileNode = {
        id: 'output',
        name: 'output',
        type: 'folder',
        isOpen: true,
        path: '/output',
        children: [outputFile]
      };

      setFiles(prev => addOrUpdateFolder(prev, outputFolder));
      showToast('success', 'Disassembly completed successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setTerminalHistory(prev => [...prev, `❌ Disassembly failed: ${errorMessage}`]);
      showToast('error', `Disassembly failed: ${errorMessage}`);
    } finally {
      setIsRunning(false);
      setTerminalLoading(false);
    }
  }; 



const downloadAllAsZip = async (forceCompile = false) => {
  try {
    const zip = new JSZip();

    const addFilesToZip = async (nodes: FileNode[], currentPath = '') => {
      for (const node of nodes) {
        if (node.type === 'file') {
          const filePath = currentPath ? `${currentPath}/${node.name}` : node.name;
          
          if (forceCompile && node.name.toLowerCase().endsWith('.asm')) {
            // For assembly files, compile to binary if forceCompile is true
            try {
              const isaFile = findFirstFileRecursive(files, f => f.name.toLowerCase().endsWith('.json'));
              
              if (isaFile) {
                const isaJson = JSON.parse(isaFile.content || '');
                
                const res = await fetch('/api/assemble?download=true', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ isaDefinition: isaJson, assemblyCode: node.content })
                });
                
                if (res.ok) {
                  const blob = await res.blob();
                  const arrayBuffer = await blob.arrayBuffer();
                  const baseName = node.name.replace(/\.[^/.]+$/, '');
                  const binaryPath = currentPath ? `${currentPath}/${baseName}_output.bin` : `${baseName}_output.bin`;
                  
                  // Add compiled binary to zip
                  zip.file(binaryPath, arrayBuffer, { binary: true });
                  setTerminalHistory(prev => [...prev, `✅ Compiled and added: ${binaryPath}`]);
                } else {
                  const errorData = await res.json();
                  setTerminalHistory(prev => [...prev, `❌ Failed to compile ${node.name}: ${errorData.error}`]);
                  // Still add the original source file
                  zip.file(filePath, node.content || '', { 
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                  });
                }
              } else {
                setTerminalHistory(prev => [...prev, `⚠️ No ISA file found for compiling ${node.name}`]);
                // Add original source file
                zip.file(filePath, node.content || '', { 
                  compression: 'DEFLATE',
                  compressionOptions: { level: 6 }
                });
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              setTerminalHistory(prev => [...prev, `❌ Compilation error for ${node.name}: ${errorMessage}`]);
              // Add original source file as fallback
              zip.file(filePath, node.content || '', { 
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
              });
            }
          } else {
            // Add regular file
            zip.file(filePath, node.content || '', { 
              compression: 'DEFLATE',
              compressionOptions: { level: 6 }
            });
          }
        } else if (node.type === 'folder' && node.children) {
          // Create folder structure and recursively add children
          const folderPath = currentPath ? `${currentPath}/${node.name}` : node.name;
          
          // Create empty folder if it has no children
          if (node.children.length === 0) {
            zip.folder(folderPath);
          } else {
            // Recursively add children
            await addFilesToZip(node.children, folderPath);
          }
        }
      }
    };

    // Add all files to zip with folder structure
    setTerminalHistory(prev => [...prev, '📦 Building zip file...']);
    await addFilesToZip(files);

    // Generate and download the zip file
    setTerminalHistory(prev => [...prev, '📦 Generating zip file...']);
    
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Create download link
    const url = window.URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project_files.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setTerminalHistory(prev => [...prev, `✅ Downloaded project as zip: project_files.zip`]);
    showToast('success', 'Project downloaded as zip successfully');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    setTerminalHistory(prev => [...prev, `❌ Zip download failed: ${errorMessage}`]);
    showToast('error', `Zip download failed: ${errorMessage}`);
  }
};




  const isDescendant = (potentialChildId: string, potentialParentId: string): boolean => {
    const parent = findFileNode(files, potentialParentId);
    if (!parent || !parent.children) return false;
    for (const child of parent.children) {
      if (child.id === potentialChildId) return true;
      if (isDescendant(potentialChildId, child.id)) return true;
    }
    return false;
  };

  const moveNode = (sourceId: string, targetId: string) => {
    const sourceNode = findFileNode(files, sourceId);
    const targetNode = findFileNode(files, targetId);
    if (!sourceNode || !targetNode) return;
    setFiles(prev => {
      // Remove source node from its current location
      const filesWithoutSource = removeFileNode(prev, sourceId);
      // Find the target node in the updated files array
      const updatedTargetNode = findFileNode(filesWithoutSource, targetId);
      if (!updatedTargetNode) return filesWithoutSource;
      // Create the moved node with updated path
      const movedNode = {
        ...sourceNode,
        path: updatedTargetNode.type === 'folder' 
          ? `${updatedTargetNode.path}/${sourceNode.name}`
          : `/${sourceNode.name}`
      };
      if (updatedTargetNode.type === 'folder') {
        // Add to folder's children
        const updatedChildren = [...(updatedTargetNode.children || []), movedNode];
        return updateFileNode(filesWithoutSource, targetId, { children: updatedChildren });
      } else {
        // Move to same level as a file - find parent folder
        const findParentId = (nodes: FileNode[], childId: string): string | null => {
          for (const node of nodes) {
            if (node.children) {
              for (const child of node.children) {
                if (child.id === childId) return node.id;
              }
              const found = findParentId(node.children, childId);
              if (found) return found;
            }
          }
          return null;
        };
        const parentId = findParentId(filesWithoutSource, sourceId);
        if (parentId) {
          const parentNode = findFileNode(filesWithoutSource, parentId);
          if (parentNode) {
            const updatedChildren = [...(parentNode.children || []), movedNode];
            return updateFileNode(filesWithoutSource, parentId, { children: updatedChildren });
          }
        }
        // If no parent found, add to root level
        return [...filesWithoutSource, movedNode];
      }
    });
  };

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const [activeIsaFileId, setActiveIsaFileId] = useState<string | null>(null);
  const [activeAsmFileId, setActiveAsmFileId] = useState<string | null>(null);

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-[#1e1e1e]' : 'bg-[#f9f9fb]'}`}>
      {/* Top Bar */}
      <header className={`h-12 ${darkMode ? 'bg-[#2d2d30] border-[#3e3e42]' : 'bg-white border-[#e0e0e0]'} border-b flex items-center px-4`}>
        <div className="flex items-center justify-between w-full">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Go Home"
            >
              <Home className="w-4 h-4" />
            </button>
            <Image src="/favicon.svg" alt="xForm Studio Logo" width={28} height={28} className="mr-1" />
            <h1 className="text-lg font-bold" style={{ color: '#5B21B6' }}>xForm Studio</h1>
            <div className={`w-px h-4 ${darkMode ? 'bg-[#3e3e42]' : 'bg-[#e0e0e0]'}`}></div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <GitBranch className="w-3 h-3" />
              <span>main</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            
            <button
              onClick={() => setShowExamples(true)}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="ISA Examples (Ctrl+E)"
            >
              <FileText className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-[#e0e0e0] mx-1"></div>

            <button
              onClick={handleSave}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Save (Ctrl+S)"
            >
              <Save className="w-4 h-4" />
            </button>

            <button
              onClick={handleValidate}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Validate ISA"
              disabled={isValidating}
            >
              {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleAssemble()}
              disabled={isRunning}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Assemble"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => handleDisassemble()}
              disabled={isRunning}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Disassemble"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </button>

            <div className="w-px h-4 bg-[#e0e0e0] mx-1"></div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded transition-colors ${
                showSettings 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.asm,.txt,.js,.ts,.py,.html,.css,.md,.xml,.yaml,.yml,.sh,.bash,.c,.cpp,.h,.java,.rs,.go,.rb,.php,.sql"
          onChange={handleFileUpload}
          className="hidden"
        />
      </header>

      {/* Main Content + Examples Sidebar */}
      <div className="flex-1 flex min-h-0 min-w-0">
        {/* File Explorer */}
        {showExplorer && (
          <div className={`w-64 ${darkMode ? 'bg-[#252526] border-[#3e3e42]' : 'bg-white border-[#e0e0e0]'} border-r flex flex-col min-h-0`}>
            <div className={`p-3 border-b ${darkMode ? 'border-[#3e3e42]' : 'border-[#e0e0e0]'} flex items-center justify-between`}>
              <h3 className={`text-sm font-medium ${darkMode ? 'text-[#cccccc]' : 'text-gray-700'}`}>EXPLORER</h3>
              <div className="flex items-center gap-1">

                <button
                  onClick={() =>downloadAllAsZip()}
                  className={`p-1 ${darkMode ? 'hover:bg-[#3e3e42]' : 'hover:bg-gray-100'} rounded`}
                  title="Download All Files"
                >
                  <Download className="w-3 h-3" />
                </button>

                
                <button
                  onClick={handleUploadClick}
                  className={`p-1 ${darkMode ? 'hover:bg-[#3e3e42]' : 'hover:bg-gray-100'} rounded`}
                  title="Open File"
                >
                  <Upload className="w-3 h-3" />
                </button>
                
                <button 
                  onClick={() => handleNewFile()}
                  className={`p-1 ${darkMode ? 'hover:bg-[#3e3e42]' : 'hover:bg-gray-100'} rounded`}
                  title="New File"
                >
                  <FilePlus className="w-3 h-3" />

                </button>
                
                <button 
                  onClick={handleNewFolder}
                  className={`p-1 ${darkMode ? 'hover:bg-[#3e3e42]' : 'hover:bg-gray-100'} rounded`}
                  title="New Folder"
                >
                  <FolderPlus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div 
              className="flex-1 overflow-y-auto p-2"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverId('root');
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                if (dragState && dragState.draggedId !== 'root') {
                  // Move to root level
                  const draggedNode = findFileNode(files, dragState.draggedId);
                  if (draggedNode) {
                    setFiles(prev => removeFileNode(prev, dragState.draggedId));
                    setFiles(prev => [...prev, { ...draggedNode, path: `/${draggedNode.name}` }]);
                    setTerminalHistory(prev => [...prev, `✔️ Moved ${draggedNode.name} to root`]);
                  }
                }
                setDragState(null);
                setDragOverId(null);
              }}
            >
              {renderFileTree(files)}
              
              {/* Root Drop Zone Indicator */}
              {dragOverId === 'root' && (
                <div className={`border-2 border-dashed rounded-lg p-2 text-center text-sm ${
                  darkMode 
                    ? 'border-[#007acc] bg-[#2a2d2e] text-[#007acc]' 
                    : 'border-blue-300 bg-blue-50 text-blue-600'
                }`}>
                  Drop here to move to root level
                </div>
              )}
              
              {/* Inline File Creation Input */}
              {creatingFile && (
                <div className="px-2 py-1">
                  <div className="flex items-center gap-2">
                    <File className="w-3 h-3 text-gray-600" />
                    <input
                      ref={newFileInputRef}
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onBlur={handleNewFileConfirm}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleNewFileConfirm();
                        } else if (e.key === 'Escape') {
                          setCreatingFile(null);
                          setNewFileName('');
                        }
                      }}
                      className={`flex-1 border border-blue-500 rounded px-1 text-sm focus:outline-none ${
                        darkMode 
                          ? 'bg-[#3c3c3c] text-[#cccccc]' 
                          : 'bg-white'
                      }`}
                      placeholder={creatingFile.placeholder}
                      autoFocus
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Split Main Area: Editor (left) and Terminal/Simulator (right) */}
        <div className="flex-1 flex min-w-0 min-h-0">
          {/* Main Editor Area */}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${showExamples ? 'max-w-[calc(100vw-20rem)]' : ''}`}>
            {/* Tab Bar */}
            <div className={`h-10 ${darkMode ? 'bg-[#2d2d30] border-[#3e3e42]' : 'bg-white border-[#e0e0e0]'} border-b flex items-center`}>
              <div className="flex items-center h-full">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`flex items-center gap-2 px-4 py-2 border-r ${darkMode ? 'border-[#3e3e42]' : 'border-[#e0e0e0]'} cursor-pointer h-full group ${
                      activeTab === tab.id 
                        ? darkMode 
                          ? 'bg-[#1e1e1e] border-b-2 border-b-[#007acc]' 
                          : 'bg-white border-b-2 border-b-[#3b82f6]' 
                        : darkMode
                          ? 'bg-[#2d2d30] hover:bg-[#3e3e42]'
                          : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => handleTabClick(tab.id)}
                    onContextMenu={(e) => handleContextMenu(e, tab.id, 'tab')}
                  >
                    <span className={`text-sm truncate max-w-32 ${darkMode ? 'text-[#cccccc]' : ''}`}>
                      {tab.name}
                      {tab.isDirty && <span className="text-gray-400 ml-1">•</span>}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(tab.id);
                      }}
                      className={`p-0.5 ${darkMode ? 'hover:bg-[#3e3e42]' : 'hover:bg-gray-200'} rounded opacity-0 group-hover:opacity-100 transition-opacity`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {getCurrentTab() && (
                <Editor
                  height="100%"
                  defaultLanguage={getCurrentTab()?.language || 'text'}
                  value={getCurrentTab()?.content || ''}
                  onChange={handleTabChange}
                  options={{
                    readOnly: false,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    theme: darkMode ? 'vs-dark' : 'vs',
                    wordWrap: 'on',
                    folding: true,
                    lineDecorationsWidth: 10,
                    lineNumbersMinChars: 3,
                    glyphMargin: false,
                    overviewRulerBorder: false,
                    hideCursorInOverviewRuler: true,
                    overviewRulerLanes: 0,
                    scrollbar: {
                      vertical: 'visible',
                      horizontal: 'visible',
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8,
                    },
                    renderWhitespace: 'none',
                    renderLineHighlight: 'all',
                    selectOnLineNumbers: true,
                    contextmenu: true,
                    quickSuggestions: true,
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: 'on',
                    tabCompletion: 'on',
                    bracketPairColorization: { enabled: true },
                    guides: {
                      bracketPairs: true,
                      indentation: true,
                    },
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Sidebar: Terminal/Errors (top), Simulator (bottom) */}
          <div className="w-96 flex flex-col border-l border-gray-200 min-h-0 max-h-full bg-white" ref={sidebarRef}>
            {/* Terminal/Errors/Output Panel */}
            <div style={{ height: terminalHeight, minHeight: 100 }} className="border-b border-gray-200 flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
                <span className="font-semibold text-gray-700">Terminal</span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-2 text-sm font-mono text-gray-800 bg-white" style={{ minHeight: 120, maxHeight: 240 }}>
                {terminalHistory.length === 0 && <span className="text-gray-400">Type a command below and press Enter.</span>}
                {terminalHistory.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {terminalLoading && <div className="text-blue-500">Running...</div>}
                <div ref={terminalEndRef} />
              </div>
              <form onSubmit={handleTerminalSubmit} className="flex border-t border-gray-100 bg-gray-50 px-2 py-1 sticky bottom-0">
                <span className="text-gray-400 font-mono pr-1">$</span>
                <input
                  ref={terminalInputRef}
                  className="flex-1 bg-transparent outline-none text-sm font-mono text-gray-800"
                  value={terminalInput}
                  onChange={e => setTerminalInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'ArrowUp') {
                      if (commandHistory.length > 0) {
                        const idx = historyIndex === null ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
                        setHistoryIndex(idx);
                        setTerminalInput(commandHistory[idx]);
                      }
                    } else if (e.key === 'ArrowDown') {
                      if (commandHistory.length > 0 && historyIndex !== null) {
                        const idx = Math.min(commandHistory.length - 1, historyIndex + 1);
                        setHistoryIndex(idx);
                        setTerminalInput(commandHistory[idx]);
                      }
                    } else if (e.key === 'Enter') {
                      setHistoryIndex(null);
                    }
                  }}
                  placeholder="Type a command..."
                  autoComplete="off"
                />
                <button type="submit" className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200">Run</button>
              </form>
            </div>
            {/* Drag handle */}
            <div
              className="h-2 cursor-row-resize bg-gray-100 hover:bg-blue-200 transition-colors border-b border-gray-200"
              onMouseDown={handleDragStart}
              style={{ zIndex: 10 }}
            />
            {/* Simulator Placeholder */}
            <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-100 text-gray-400 text-lg font-semibold border-t border-gray-200">
              Simulator (coming soon)
            </div>
          </div>
        </div>

        {/* Examples Sidebar */}
        {showExamples && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`w-80 ${darkMode ? 'bg-[#252526] border-[#3e3e42]' : 'bg-white border-[#e0e0e0]'} border-l flex flex-col max-h-full min-h-0 overflow-y-auto`}
            style={{ minWidth: '20rem', maxWidth: '20rem' }}
          >
            <div className={`p-4 border-b ${darkMode ? 'border-[#3e3e42]' : 'border-[#e0e0e0]'} flex items-center justify-between`}>
              <h3 className={`font-semibold ${darkMode ? 'text-[#cccccc]' : 'text-gray-800'}`}>ISA Examples</h3>
              <button
                onClick={() => setShowExamples(false)}
                className={`p-1 ${darkMode ? 'hover:bg-[#3e3e42]' : 'hover:bg-gray-100'} rounded-md transition-colors`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search examples..."
                    className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-[#3c3c3c] border-[#3e3e42] text-[#cccccc] placeholder-gray-400' 
                        : 'border-gray-200'
                    }`}
                  />
                </div>
              </div>
              {examples.map((example) => (
                <div
                  key={example.filename}
                  onClick={() => loadExample(example.filename)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all group ${
                    darkMode
                      ? 'border-[#3e3e42] hover:border-[#007acc] hover:bg-[#2a2d2e]'
                      : 'border-gray-200 hover:border-[#3b82f6] hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={`font-medium transition-colors ${
                      darkMode 
                        ? 'text-[#cccccc] group-hover:text-[#007acc]' 
                        : 'text-gray-800 group-hover:text-[#3b82f6]'
                    }`}>{example.name}</h4>
                    {example.category && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(example.category)}`}>
                        {getCategoryIcon(example.category)}
                        {example.category}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{example.description}</p>
                  <div className="flex items-center justify-between">
                    <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{example.filename}</div>
                    <Download className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Status Bar - VS Code Style (always at the bottom, full width) */}
      <div className={`h-8 w-full ${darkMode ? 'bg-[#007acc]' : 'bg-[#007acc]'} border-t ${darkMode ? 'border-[#005a9e]' : 'border-[#005a9e]'} flex items-center px-4 text-xs text-white`}>
        <div className="flex items-center gap-6">
          <span className="font-medium">{getCurrentTab()?.language?.toUpperCase() || 'TEXT'}</span>
          <div className="flex items-center gap-2">
            {getCurrentTab()?.isDirty && (
              <>
                <span className="text-yellow-300">•</span>
                <span>Modified</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-4 text-white/80">
          <span>Ctrl+N: New</span>
          <span>Ctrl+O: Open</span>
          <span>Ctrl+S: Save</span>
          <span>Ctrl+V: Validate</span>
          <span>Ctrl+E: Examples</span>
        </div>
      </div>

      {/* Drag Indicator */}
      {dragState && (
        <div className="fixed pointer-events-none z-50 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          Moving {dragState.draggedName}
        </div>
      )}

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
              toast.type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu(null)}
        >
          {(() => {
            const node = findFileNode(files, contextMenu.targetId);
            if (node?.type === 'file' && node.name.toLowerCase().endsWith('.json')) {
              return (
                <button
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={e => { e.stopPropagation(); setActiveIsaFileId(node.id); setContextMenu(null); setTerminalHistory(prev => [...prev, `✔️ Set as Active ISA: ${node.name}`]); }}
                >Set as Active ISA</button>
              );
            }
            if (node?.type === 'file' && node.name.toLowerCase().endsWith('.asm')) {
              return (
                <button
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={e => { e.stopPropagation(); setActiveAsmFileId(node.id); setContextMenu(null); setTerminalHistory(prev => [...prev, `✔️ Set as Active Assembly: ${node.name}`]); }}
                >Set as Active Assembly</button>
              );
            }
            if (node?.type === 'file' && node.name.toLowerCase().endsWith('.hex')) {
              return (
                <button
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={async e => {
                    e.stopPropagation();
                    setContextMenu(null);
            
                    const asmFile = activeAsmFileId ? findFileNode(files, activeAsmFileId) : findFirstFileRecursive(files, f => f.name.toLowerCase().endsWith('.asm'));
                    const isaFile = activeIsaFileId ? findFileNode(files, activeIsaFileId) : findFirstFileRecursive(files, f => f.name.toLowerCase().endsWith('.json'));
            
                    if (!asmFile || !isaFile) {
                      setTerminalHistory(prev => [...prev, '❌ Active Assembly or ISA file missing.']);
                      return;
                    }
                    
                    try {
                      const isaJson = JSON.parse(isaFile.content || '');
                      console.log('Downloading with:', isaJson, asmFile.content);
                      await downloadBinary(isaJson, asmFile.content || '', asmFile.name || '');
                      setTerminalHistory(prev => [...prev, `⬇️ Downloaded binary for ${asmFile.name}`]);
                    } catch (err) {
                      setTerminalHistory(prev => [...prev, `❌ Download failed: ${(err as Error).message}`]);
                    }
                  }}
                >
                  Download Binary File
                </button>
              );
            }
            return null;
          })()}
          <button
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            onClick={e => { e.stopPropagation(); handleRenameFile(contextMenu.targetId); setContextMenu(null); }}
          >Rename</button>
          <button
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
            onClick={e => { e.stopPropagation(); handleDeleteFile(contextMenu.targetId); setContextMenu(null); }}
          >Delete</button>
        </div>
      )}
    </div>
  );
} 