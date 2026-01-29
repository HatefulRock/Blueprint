import React, { useState, useEffect } from 'react';

interface CardTemplate {
  id?: number;
  name: string;
  language: string;
  front_template: string;
  back_template: string;
  user_id?: number | null;
}

interface TemplateEditorProps {
  onClose: () => void;
  onSave: (template: CardTemplate) => void;
  existingTemplate?: CardTemplate;
}

const TEMPLATE_VARIABLES = [
  { var: '{{term}}', description: 'The word/term being studied' },
  { var: '{{translation}}', description: 'Translation of the term' },
  { var: '{{context}}', description: 'Example sentence with the term' },
  { var: '{{literal_translation}}', description: 'Word-by-word translation' },
  { var: '{{part_of_speech}}', description: 'Part of speech (noun, verb, etc.)' },
  { var: '{{grammatical_breakdown}}', description: 'Grammar notes and breakdown' },
];

const DEFAULT_TEMPLATES = {
  basic: {
    front: '{{term}}',
    back: '{{translation}}\n\n{{context}}'
  },
  contextFirst: {
    front: '{{context}}',
    back: '{{term}} - {{translation}}'
  },
  detailed: {
    front: '{{term}}',
    back: '{{translation}}\n\nContext: {{context}}\n\nPart of Speech: {{part_of_speech}}\n\n{{grammatical_breakdown}}'
  }
};

export const TemplateEditor = ({ onClose, onSave, existingTemplate }: TemplateEditorProps) => {
  const [name, setName] = useState(existingTemplate?.name || '');
  const [language, setLanguage] = useState(existingTemplate?.language || '');
  const [frontTemplate, setFrontTemplate] = useState(existingTemplate?.front_template || '{{term}}');
  const [backTemplate, setBackTemplate] = useState(existingTemplate?.back_template || '{{translation}}');
  const [previewFront, setPreviewFront] = useState('');
  const [previewBack, setPreviewBack] = useState('');

  // Sample data for preview
  const sampleData = {
    term: '你好',
    translation: 'Hello',
    context: '你好，很高兴见到你。(Hello, nice to meet you.)',
    literal_translation: 'you-good',
    part_of_speech: 'interjection',
    grammatical_breakdown: '你 (you) + 好 (good)'
  };

  useEffect(() => {
    // Generate preview using Jinja2 syntax {{variable}}
    let front = frontTemplate;
    let back = backTemplate;

    Object.entries(sampleData).forEach(([key, value]) => {
      front = front.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      back = back.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    setPreviewFront(front);
    setPreviewBack(back);
  }, [frontTemplate, backTemplate]);

  const handleSave = () => {
    if (!name || !frontTemplate || !backTemplate) {
      alert('Please fill in all required fields');
      return;
    }

    onSave({
      ...existingTemplate,
      name,
      language: language || undefined,
      front_template: frontTemplate,
      back_template: backTemplate
    });
  };

  const insertVariable = (variable: string, target: 'front' | 'back') => {
    if (target === 'front') {
      setFrontTemplate(prev => prev + variable);
    } else {
      setBackTemplate(prev => prev + variable);
    }
  };

  const loadPreset = (preset: keyof typeof DEFAULT_TEMPLATES) => {
    setFrontTemplate(DEFAULT_TEMPLATES[preset].front);
    setBackTemplate(DEFAULT_TEMPLATES[preset].back);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-5xl my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {existingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">Customize how your flashcards appear</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Template Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Basic Chinese Cards"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Language (optional)</label>
              <input
                type="text"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                placeholder="e.g., Chinese"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Quick Start Templates</label>
            <div className="flex gap-2">
              <button onClick={() => loadPreset('basic')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-md transition-colors">Basic</button>
              <button onClick={() => loadPreset('contextFirst')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-md transition-colors">Context First</button>
              <button onClick={() => loadPreset('detailed')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-md transition-colors">Detailed</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Editors */}
            <div className="space-y-4">
              {/* Front Template */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Front of Card *</label>
                <textarea
                  value={frontTemplate}
                  onChange={e => setFrontTemplate(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-sm focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                  placeholder="Enter template with variables like {{term}}"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES.map(v => (
                    <button
                      key={v.var}
                      onClick={() => insertVariable(v.var, 'front')}
                      className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs rounded transition-colors"
                      title={v.description}
                    >
                      {v.var}
                    </button>
                  ))}
                </div>
              </div>

              {/* Back Template */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Back of Card *</label>
                <textarea
                  value={backTemplate}
                  onChange={e => setBackTemplate(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-sm focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                  placeholder="Enter template with variables"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {TEMPLATE_VARIABLES.map(v => (
                    <button
                      key={v.var}
                      onClick={() => insertVariable(v.var, 'back')}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition-colors"
                      title={v.description}
                    >
                      {v.var}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variable Reference */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-sky-400 mb-2">Available Variables</h4>
                <div className="space-y-1 text-xs text-slate-400">
                  {TEMPLATE_VARIABLES.map(v => (
                    <div key={v.var}>
                      <span className="font-mono text-sky-300">{v.var}</span> - {v.description}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Live Preview</h4>

                {/* Front Preview */}
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-2">FRONT</div>
                  <div className="bg-slate-700 border border-slate-600 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
                    <div className="text-center">
                      <pre className="text-white whitespace-pre-wrap font-sans text-lg">{previewFront || '(Empty)'}</pre>
                    </div>
                  </div>
                </div>

                {/* Back Preview */}
                <div>
                  <div className="text-xs text-slate-500 mb-2">BACK</div>
                  <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 min-h-[200px]">
                    <pre className="text-slate-200 whitespace-pre-wrap font-sans text-sm leading-relaxed">{previewBack || '(Empty)'}</pre>
                  </div>
                </div>
              </div>

              <div className="bg-sky-900/20 border border-sky-700/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-xs text-sky-300">
                    <p className="font-semibold mb-1">Preview Tips</p>
                    <p>The preview uses sample Chinese data. Your actual cards will use data from your vocabulary.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors">
            {existingTemplate ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
};
