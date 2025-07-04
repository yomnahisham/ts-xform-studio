# xForm Studio

A modern web-based IDE for designing, assembling, and simulating custom Instruction Set Architectures (ISAs) using the [~xform](https://github.com/yomnahisham/py-isa-xform) library.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Code Editor**: Monaco Editor (VS Code's editor)
- **Icons**: Lucide React
- **Backend**: py-isa-xform Python library
- **API**: Next.js API Routes

## Getting Started

### Prerequisites

- Node.js 18+ 
- Python 3.8+
- py-isa-xform library

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yomnahisham/ts-xform-studio.git
   cd ts-isa-playground
   ```

2. **Install Python dependencies**
   ```bash
   pip3 install git+https://github.com/yomnahisham/py-isa-xform.git@v1.0.0
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── IsaJsonEditor.tsx    # JSON editor component
│   │   └── IsaExampleList.tsx   # Example ISAs list
│   ├── api/
│   │   ├── isa-examples/        # API routes for ISA examples
│   │   ├── assemble/            # Assemble API using py-isa-xform
│   │   └── disassemble/         # Disassemble API using py-isa-xform
│   ├── isa-editor/
│   │   └── page.tsx             # ISA editor page
│   ├── assembly/
│   │   └── page.tsx             # Assembly editor page (stub)
│   ├── page.tsx                 # Main landing page (hero section)
│   └── layout.tsx               # Root layout
```

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built with [py-isa-xform](https://github.com/yomnahisham/py-isa-xform)
