'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Cpu, 
  Zap, 
  Settings, 
  ArrowRight, 
  Code, 
  FileText, 
  Play, 
  Github, 
  Sparkles, 
  Users, 
  Clock, 
  BookOpen,
  Star,
  CheckCircle,
  Lightbulb
} from 'lucide-react';
import Image from 'next/image';

// CPU Pipeline SVG Component
const CpuPipeline = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <svg
      className="w-full h-full opacity-10 md:opacity-15"
      viewBox="0 0 1200 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* CPU Core - Moved further from center */}
      <motion.rect
        x="500"
        y="350"
        width="200"
        height="200"
        rx="20"
        fill="url(#cpuGradient)"
        stroke="url(#borderGradient)"
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
      
      {/* Pipeline Stages - Repositioned to avoid center content */}
      <motion.g
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        {/* Fetch Stage - Moved to top left */}
        <rect x="80" y="200" width="100" height="50" rx="10" fill="#667eea" opacity="0.6" />
        <text x="130" y="230" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">FETCH</text>
        
        {/* Decode Stage - Moved to top right */}
        <rect x="1020" y="200" width="100" height="50" rx="10" fill="#764ba2" opacity="0.6" />
        <text x="1070" y="230" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">DECODE</text>
        
        {/* Execute Stage - Moved to bottom left */}
        <rect x="80" y="550" width="100" height="50" rx="10" fill="#f093fb" opacity="0.6" />
        <text x="130" y="580" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">EXECUTE</text>
        
        {/* Memory Stage - Moved to bottom right */}
        <rect x="1020" y="550" width="100" height="50" rx="10" fill="#667eea" opacity="0.6" />
        <text x="1070" y="580" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">MEMORY</text>
        
        {/* Writeback Stage - Moved to far right */}
        <rect x="1020" y="400" width="100" height="50" rx="10" fill="#764ba2" opacity="0.6" />
        <text x="1070" y="430" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">WRITEBACK</text>
      </motion.g>
      
      {/* Data Flow Animation - Repositioned */}
      <motion.circle
        cx="40"
        cy="225"
        r="8"
        fill="#667eea"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          repeatDelay: 1,
          ease: "easeInOut"
        }}
      />
      
      {/* Assembly Code Flow - Moved to corners, smaller */}
      <motion.g
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.5 }}
      >
        {/* Top left code block */}
        <rect x="80" y="280" width="200" height="60" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(102,126,234,0.3)" strokeWidth="1" />
        <text x="100" y="305" fill="#667eea" fontSize="14" fontFamily="monospace">ADD R1, R2</text>
        <text x="100" y="325" fill="#764ba2" fontSize="14" fontFamily="monospace">SUB R3, R4</text>
        
        {/* Bottom right code block */}
        <rect x="920" y="480" width="200" height="60" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(102,126,234,0.3)" strokeWidth="1" />
        <text x="940" y="505" fill="#f093fb" fontSize="14" fontFamily="monospace">MUL R5, R6</text>
        <text x="940" y="525" fill="#667eea" fontSize="14" fontFamily="monospace">DIV R7, R8</text>
      </motion.g>
      
      {/* Gradients */}
      <defs>
        <linearGradient id="cpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#764ba2" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#f093fb" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#764ba2" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f093fb" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

// Floating Code Elements - Improved positioning and responsiveness
const FloatingCode = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Top left corner - far from center */}
    <motion.div
      className="absolute top-16 left-8 text-xs text-blue-400/20 font-mono hidden md:block"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      ADD R1, R2
    </motion.div>
    
    {/* Top right corner - far from center */}
    <motion.div
      className="absolute top-24 right-8 text-xs text-purple-400/20 font-mono hidden md:block"
      animate={{ y: [0, 12, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
    >
      SUB R3, R4
    </motion.div>
    
    {/* Bottom left corner - far from center */}
    <motion.div
      className="absolute bottom-32 left-8 text-xs text-pink-400/20 font-mono hidden md:block"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
    >
      MUL R5, R6
    </motion.div>
    
    {/* Bottom right corner - far from center */}
    <motion.div
      className="absolute bottom-20 right-8 text-xs text-blue-400/20 font-mono hidden md:block"
      animate={{ y: [0, 10, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
    >
      DIV R7, R8
    </motion.div>
    
    {/* Additional floating elements for larger screens */}
    <motion.div
      className="absolute top-1/4 left-4 text-xs text-purple-400/15 font-mono hidden lg:block"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
    >
      MOV R9, R10
    </motion.div>
    
    <motion.div
      className="absolute top-1/3 right-4 text-xs text-pink-400/15 font-mono hidden lg:block"
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
    >
      CMP R11, R12
    </motion.div>
    
    <motion.div
      className="absolute bottom-1/4 left-4 text-xs text-blue-400/15 font-mono hidden lg:block"
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
    >
      JMP LABEL
    </motion.div>
    
    <motion.div
      className="absolute bottom-1/3 right-4 text-xs text-purple-400/15 font-mono hidden lg:block"
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
    >
      CALL FUNC
    </motion.div>
  </div>
);

// Grid Pattern Background - Improved opacity and responsiveness
const GridPattern = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <svg
      className="w-full h-full opacity-3 md:opacity-5"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#667eea" strokeWidth="0.3"/>
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#grid)" />
    </svg>
  </div>
);

// New component: Subtle Tech Elements for additional depth
const TechElements = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Register names floating in background */}
    <motion.div
      className="absolute top-1/2 left-16 text-xs text-gray-400/10 font-mono hidden xl:block"
      animate={{ opacity: [0.1, 0.2, 0.1] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    >
      R0 R1 R2 R3
    </motion.div>
    
    <motion.div
      className="absolute top-1/2 right-16 text-xs text-gray-400/10 font-mono hidden xl:block"
      animate={{ opacity: [0.1, 0.2, 0.1] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
    >
      R4 R5 R6 R7
    </motion.div>
    
    {/* Memory addresses */}
    <motion.div
      className="absolute bottom-1/3 left-20 text-xs text-gray-400/8 font-mono hidden lg:block"
      animate={{ opacity: [0.05, 0.15, 0.05] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
    >
      0x1000 0x1004
    </motion.div>
    
    <motion.div
      className="absolute bottom-1/3 right-20 text-xs text-gray-400/8 font-mono hidden lg:block"
      animate={{ opacity: [0.05, 0.15, 0.05] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
    >
      0x2000 0x2004
    </motion.div>
  </div>
);

export default function Home() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/isa-editor');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        delayChildren: 0.1,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/40 via-purple-50/30 to-pink-50/40"></div>
      <div className="fixed inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent"></div>
      
      {/* Header */}
      <motion.header 
        className="relative z-10 border-b border-white/10 bg-gradient-to-b from-white/85 to-white/75 backdrop-blur-xl"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="container mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src="/favicon.svg" alt="xForm Studio Logo" width={28} height={28} className="mr-1" />
              <h1 className="text-lg font-bold" style={{ color: '#5B21B6' }}>xForm Studio</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button 
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 transition-colors p-1.5 rounded-lg hover:bg-white/50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="text-sm">Settings</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="flex-1 relative">
        {/* Hero Section with Enhanced Visual Elements */}
        <motion.section 
          className="relative min-h-screen px-6 py-24 lg:py-32 overflow-hidden hero-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Visual Hero Elements - Improved layering with proper z-index */}
          <div className="absolute inset-0 bg-layer-1">
            <GridPattern />
          </div>
          <div className="absolute inset-0 bg-layer-2">
            <CpuPipeline />
          </div>
          <div className="absolute inset-0 bg-layer-3">
            <FloatingCode />
          </div>
          <div className="absolute inset-0 bg-layer-4">
            <TechElements />
          </div>
          
          {/* Additional depth layer with subtle blur */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent backdrop-blur-subtle"></div>
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div 
              className="text-center space-y-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Badge */}
              <motion.a
                href="https://github.com/yomnahisham/py-isa-xform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-full px-4 py-2 mb-6 hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 transition-all cursor-pointer"
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-blue-700 text-sm font-medium">Powered by ~xform</span>
              </motion.a>
              
              {/* Main Title with Better Spacing */}
              <motion.h1 
                className="text-4xl md:text-6xl font-bold text-gray-800 leading-tight mb-4"
                variants={itemVariants}
              >
                Design Your Own
                <br />
                <span className="text-gradient">Instruction Set Architecture</span>
              </motion.h1>
              
              {/* Enhanced Description with More Spacing */}
              <motion.p 
                className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8"
                variants={itemVariants}
              >
                Create custom ISAs, write assembly code, and simulate processor execution 
                with our comprehensive development environment for computer architecture education and research.
              </motion.p>
              
              {/* Statistics in Hero Section */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                variants={itemVariants}
              >
                <motion.div 
                  className="text-center group"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-3xl font-bold text-gradient mb-1 group-hover:scale-105 transition-transform duration-200">5+</div>
                  <div className="text-gray-600 text-sm">Built-in ISA Examples</div>
                </motion.div>

                <motion.div 
                  className="text-center group"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-3xl font-bold text-gradient mb-1 group-hover:scale-105 transition-transform duration-200">1000+</div>
                  <div className="text-gray-600 text-sm">Lines of Code Supported</div>
                </motion.div>

                <motion.div 
                  className="text-center group"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-3xl font-bold text-gradient mb-1 group-hover:scale-105 transition-transform duration-200">∞</div>
                  <div className="text-gray-600 text-sm">Custom Instructions</div>
                </motion.div>
              </motion.div>
              
              {/* Action Buttons with Better Spacing */}
              <motion.div 
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
                variants={itemVariants}
              >
                <motion.button
                  onClick={handleGetStarted}
                  className="btn-primary px-8 py-4 text-lg flex items-center gap-3 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Play className="w-5 h-5" />
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
                
                <motion.a
                  href="https://github.com/yomnahisham/py-isa-xform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-200 hover:border-gray-300 bg-white/80 hover:bg-white transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Github className="w-5 h-5" />
                  View on GitHub
                </motion.a>
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* Features Section with Enhanced Spacing */}
        <motion.section 
          className="px-6 py-24 bg-gradient-to-br from-white/60 via-gray-50/40 to-blue-50/30 backdrop-blur-sm"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="container mx-auto max-w-6xl">
            <motion.div 
              className="text-center mb-20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                Everything You Need to <span className="text-gradient">Build</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                From ISA design to assembly programming and simulation, we provide all the tools for modern processor development
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8">
              <motion.div
                className="feature-card p-8 text-center group cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                  <Cpu className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">ISA Design</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Design custom instruction set architectures with our intuitive JSON editor. Define instructions, registers, and memory layouts.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">JSON Editor</span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full">Validation</span>
                  <span className="px-3 py-1 bg-pink-50 text-pink-700 text-sm rounded-full">Templates</span>
                </div>
              </motion.div>

              <motion.div
                className="feature-card p-8 text-center group cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Assembly Editor</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Write and validate assembly code with syntax highlighting, intelligent autocomplete, and real-time error checking for professional development.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">Syntax Highlighting</span>
                  <span className="px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full">Autocomplete</span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">Error Checking</span>
                </div>
              </motion.div>

              <motion.div
                className="feature-card p-8 text-center group cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                  <Code className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Simulation</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Visual processor simulation with register and memory views. Step through execution, set breakpoints, and watch your ISA come to life.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-orange-50 text-orange-700 text-sm rounded-full">Visual Debug</span>
                  <span className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full">Breakpoints</span>
                  <span className="px-3 py-1 bg-yellow-50 text-yellow-700 text-sm rounded-full">Step Through</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Use Cases Section with Enhanced Spacing */}
        <motion.section 
          className="px-6 py-24 bg-gradient-to-br from-transparent via-purple-50/20 to-pink-50/30"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="container mx-auto max-w-6xl">
            <motion.div 
              className="text-center mb-20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                Perfect For
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Whether you're learning, teaching, or researching, xForm Studio has you covered
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <motion.div 
                className="testimonial-card p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Students</h3>
                <p className="text-gray-600">Learn computer architecture concepts through hands-on ISA design and simulation</p>
              </motion.div>

              <motion.div 
                className="testimonial-card p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Educators</h3>
                <p className="text-gray-600">Teach processor design with interactive examples and real-time visualization</p>
              </motion.div>

              <motion.div 
                className="testimonial-card p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4">
                  <Lightbulb className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Researchers</h3>
                <p className="text-gray-600">Prototype and validate new instruction set architectures and extensions</p>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* CTA Section with Enhanced Spacing */}
        {/* <motion.section 
          className="px-6 py-24 bg-gradient-to-br from-blue-600/90 via-purple-600/85 to-pink-600/80 text-white relative overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-noise opacity-20"></div>
          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              viewport={{ once: true }}
            >
              Ready to Design Your ISA?
            </motion.h2>
            <motion.p 
              className="text-xl mb-10 opacity-90"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Join thousands of developers, students, and researchers who are already using xForm Studio to bring their ISA designs to life.
            </motion.p>
            <motion.button
              onClick={handleGetStarted}
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors flex items-center gap-3 mx-auto group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-5 h-5" />
              Start Building Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
        </div>
        </motion.section> */}
      </main>

      {/* Footer */}
      <motion.footer 
        className="relative z-10 py-3 text-center text-gray-500 bg-white/70 backdrop-blur-xl border-t border-gray-200/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-sm">
            <span>&copy; {new Date().getFullYear()} xForm Studio</span>
            <span className="hidden md:inline text-gray-400">&middot;</span>
            <a 
              href="https://github.com/yomnahisham/py-isa-xform" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <Github className="w-3 h-3" />
              GitHub
            </a>
            <span className="hidden md:inline text-gray-400">&middot;</span>
            <span className="text-xs text-gray-400">Built for the ISA design community</span>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
