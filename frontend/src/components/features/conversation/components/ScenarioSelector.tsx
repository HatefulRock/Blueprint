import React from 'react';
import { ConversationScenario } from '../../../../data/conversationScenarios';

interface ScenarioSelectorProps {
  scenarios: ConversationScenario[];
  selected: ConversationScenario;
  onSelect: (scenario: ConversationScenario) => void;
  disabled?: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  scenarios,
  selected,
  onSelect,
  disabled = false,
}) => {
  return (
    <div className="w-80 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col flex-shrink-0">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Scenarios</h2>
        <p className="text-sm text-slate-400">Choose a setting for your practice.</p>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {scenarios.map(scenario => {
          const isSelected = selected.id === scenario.id;
          const isDisabled = disabled && !isSelected;

          return (
            <button
              key={scenario.id}
              onClick={() => onSelect(scenario)}
              disabled={isDisabled}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'bg-sky-600/20 border-sky-500/50 text-white ring-1 ring-sky-500/50'
                  : 'bg-slate-700/30 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{scenario.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold">{scenario.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{scenario.difficulty}</div>
                </div>
              </div>
              <div className="text-xs text-slate-400 leading-relaxed pl-9">
                {scenario.description}
              </div>
              {isSelected && (
                <div className="text-xs text-sky-200 mt-2 pl-9 animate-fade-in font-semibold">
                  Active Scenario
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
