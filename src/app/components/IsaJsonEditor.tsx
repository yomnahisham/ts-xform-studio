'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Check, AlertCircle, FileText, Shield, Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

// Monaco Editor wrapper with proper theme handling
const MonacoEditorWrapper = ({ value, onChange, height, language = 'json' }: {
  value: string;
  onChange: (value: string | undefined) => void;
  height: string;
  language?: string;
}) => {
  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Ensure dark theme is applied
    monaco.editor.setTheme('vs-dark');
  };

  return (
    <Editor
      height={height}
      defaultLanguage={language}
      value={value}
      onChange={onChange}
      onMount={handleEditorDidMount}
      options={{
        readOnly: false,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on' as const,
        roundedSelection: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        theme: 'vs-dark',
        wordWrap: 'on' as const,
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        glyphMargin: false,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        overviewRulerLanes: 0,
        scrollbar: {
          vertical: 'visible' as const,
          horizontal: 'visible' as const,
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
        // Additional options for better UX
        renderWhitespace: 'none' as const,
        renderLineHighlight: 'all' as const,
        selectOnLineNumbers: true,
        contextmenu: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on' as const,
        tabCompletion: 'on' as const,
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
      }}
    />
  );
};

interface IsaJsonEditorProps {
  mode: 'upload' | 'editor';
  onIsaSelected: (isaContent: string) => void;
}

export default function IsaJsonEditor({ mode, onIsaSelected }: IsaJsonEditorProps) {
  const [jsonContent, setJsonContent] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationDetails, setValidationDetails] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateJson = (content: string): boolean => {
    try {
      JSON.parse(content);
      setErrorMessage('');
      return true;
    } catch (error) {
      setErrorMessage('Invalid JSON format');
      return false;
    }
  };

  const validateIsaWithXform = async () => {
    if (!jsonContent.trim()) {
      setErrorMessage('Please enter some JSON content first');
      return;
    }

    setIsValidating(true);
    setValidationDetails('');
    
    try {
      const response = await fetch('/api/validate-isa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isaDefinition: JSON.parse(jsonContent) }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setIsValid(result.valid);
        if (result.valid) {
          setErrorMessage('');
          setValidationDetails(result.message);
          onIsaSelected(jsonContent);
        } else {
          setErrorMessage(result.message);
          setValidationDetails(result.details);
        }
      } else {
        setIsValid(false);
        setErrorMessage(result.error || 'Validation failed');
        setValidationDetails(result.details || '');
      }
    } catch (error) {
      setIsValid(false);
      setErrorMessage('Failed to validate ISA');
      setValidationDetails(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonContent(content);
      const valid = validateJson(content);
      setIsValid(valid);
      // Don't automatically call onIsaSelected - wait for manual validation
    };
    reader.readAsText(file);
  };

  const handleEditorChange = (value: string | undefined) => {
    const content = value || '';
    setJsonContent(content);
    
    // Validate JSON syntax if there's content
    if (content.trim()) {
      const valid = validateJson(content);
      setIsValid(valid);
      // Don't automatically call onIsaSelected - wait for manual validation
    } else {
      setIsValid(null);
      setErrorMessage('');
      setValidationDetails('');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (mode === 'upload') {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Import ISA Definition</h3>
          <p className="text-gray-600">Select a JSON file containing your ISA definition</p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleUploadClick}
            className="btn-primary px-8 py-4 flex items-center gap-3 text-lg"
          >
            <Upload className="w-5 h-5" />
            Choose JSON File
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />

        {jsonContent && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isValid ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Valid JSON Format</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Invalid JSON Format</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={validateIsaWithXform}
                disabled={!isValid || isValidating}
                className="btn-primary px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                {isValidating ? 'Validating...' : 'Validate ISA'}
              </button>
            </div>
            
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm font-medium mb-2">Validation Error:</p>
                <p className="text-red-400 text-sm">{errorMessage}</p>
                {validationDetails && (
                  <div className="mt-3 pt-3 border-t border-red-500/20">
                    <p className="text-red-300 text-xs font-medium mb-1">Details:</p>
                    <p className="text-red-300 text-xs whitespace-pre-wrap">{validationDetails}</p>
                  </div>
                )}
              </div>
            )}

            {isValid && validationDetails && !errorMessage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-green-400 text-sm font-medium mb-2">Validation Success:</p>
                <p className="text-green-300 text-sm">{validationDetails}</p>
              </div>
            )}

            <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
              <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <FileText className="w-4 h-4" />
                  <span>ISA Definition Preview</span>
                </div>
              </div>
              <MonacoEditorWrapper
                height="400px"
                value={jsonContent}
                onChange={handleEditorChange}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Editor mode
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isValid !== null && (
              <>
                {isValid ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Valid JSON Format</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Invalid JSON Format</span>
                  </div>
                )}
              </>
            )}
          </div>
          
          <button
            onClick={validateIsaWithXform}
            disabled={!isValid || isValidating}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            {isValidating ? 'Validating...' : 'Validate ISA'}
          </button>
          <button
            type="button"
            onClick={() => window.open('https://github.com/yomnahisham/py-isa-xform#isa-json-format', '_blank')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/25"
          >
            <FileText className="w-4 h-4" />
            ISA Guide
          </button>
        </div>
        
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm font-medium mb-2">Validation Error:</p>
            <p className="text-red-400 text-sm">{errorMessage}</p>
            {validationDetails && (
              <div className="mt-3 pt-3 border-t border-red-500/20">
                <p className="text-red-300 text-xs font-medium mb-1">Details:</p>
                <p className="text-red-300 text-xs whitespace-pre-wrap">{validationDetails}</p>
              </div>
            )}
          </div>
        )}

        {isValid && validationDetails && !errorMessage && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 text-sm font-medium mb-2">Validation Success:</p>
            <p className="text-green-300 text-sm">{validationDetails}</p>
          </div>
        )}

        <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
          <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <FileText className="w-4 h-4" />
              <span>ISA JSON Editor</span>
            </div>
          </div>
          <MonacoEditorWrapper
            height="500px"
            value={jsonContent}
            onChange={handleEditorChange}
          />
        </div>
      </div>
    </div>
  );
} 