import React from 'react';
import {
  FamiliarityMeter,
  ActionButton,
  AnalysisSection,
  ReviewStatus,
  TrashIcon,
} from './VocabularyUIComponents';
import { SpeakerWaveIcon } from '../../../common/icons/SpeakerWaveIcon';
import { ChevronDownIcon } from '../../../common/icons/ChevronDownIcon';
import { Word } from '../../../../types';

type ID = string | number;

interface ExtendedWord extends Omit<Word, 'id' | 'deck_id'> {
  id: ID;
  deck_id: ID;
  [key: string]: any;
}

interface VocabularyCardProps {
  word: ExtendedWord;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: (term: string) => void;
  onToggleSelect: (wordId?: ID) => void;
  onFamiliarityChange: (term: string, change: 1 | -1) => void;
  onPlayAudio: (text: string) => void;
  onDelete: (wordId: ID, wordTerm: string) => void;
  onAssignToDeck: (wordIds: ID[]) => void;
}

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  word,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onFamiliarityChange,
  onPlayAudio,
  onDelete,
  onAssignToDeck,
}) => {
  return (
    <React.Fragment>
      <tr
        className="hover:bg-slate-700/30 transition-colors cursor-pointer"
        onClick={() => onToggleExpand(word.term)}
      >
        {/* Select checkbox */}
        <td className="p-4 font-mono text-emerald-300 align-top">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(word.id);
            }}
          />
        </td>

        {/* Word term */}
        <td className="p-4 font-mono text-emerald-300 align-top">
          <div className="flex items-center gap-2">{word.term}</div>
        </td>

        {/* Context (hidden on mobile) */}
        <td className="p-4 text-slate-400 italic align-top hidden md:table-cell">
          "{word.context || ''}"
        </td>

        {/* Review status */}
        <td className="p-4 align-top">
          <ReviewStatus dateStr={word.next_review_date} />
        </td>

        {/* Audio button */}
        <td className="p-4 align-top text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlayAudio(word.term);
            }}
            className="p-1.5 rounded-md bg-slate-700 text-slate-300 hover:bg-sky-600 hover:text-white transition-colors"
            title={`Listen to ${word.term}`}
          >
            <SpeakerWaveIcon className="w-5 h-5" />
          </button>
        </td>

        {/* Familiarity controls */}
        <td className="p-4 align-top">
          <div className="flex justify-end items-center gap-3">
            <ActionButton
              onClick={(e) => {
                e.stopPropagation();
                onFamiliarityChange(word.term, -1);
              }}
              disabled={word.familiarity_score <= 1}
              label={`Decrease familiarity for ${word.term}`}
              className="hover:bg-red-600"
            >
              -
            </ActionButton>
            <FamiliarityMeter score={word.familiarity_score} />
            <ActionButton
              onClick={(e) => {
                e.stopPropagation();
                onFamiliarityChange(word.term, 1);
              }}
              disabled={word.familiarity_score >= 5}
              label={`Increase familiarity for ${word.term}`}
              className="hover:bg-emerald-500"
            >
              +
            </ActionButton>
          </div>
        </td>

        {/* Delete button */}
        <td className="p-4 text-center align-top">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(word.id, word.term);
            }}
            className="p-1.5 rounded-md bg-slate-700 text-slate-400 hover:bg-red-600 hover:text-white transition-colors"
            title={`Delete ${word.term}`}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </td>

        {/* Expand indicator */}
        <td className="p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <ChevronDownIcon
              className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </td>
      </tr>

      {/* Expanded detail view */}
      {isExpanded && (
        <tr className="bg-slate-900/50">
          <td colSpan={8} className="p-0">
            <div className="p-6 flex flex-col md:flex-row gap-6">
              <div className="space-y-4 flex-grow">
                <h3 className="text-md font-bold text-white">Analysis Details</h3>
                {word.translation && (
                  <AnalysisSection title="Translation" content={word.translation} />
                )}
                {word.literal_translation && (
                  <AnalysisSection
                    title="Literal Translation"
                    content={word.literal_translation}
                  />
                )}
                {word.grammatical_breakdown && (
                  <AnalysisSection
                    title="Grammatical Breakdown"
                    content={word.grammatical_breakdown}
                  />
                )}
                {word.part_of_speech && (
                  <AnalysisSection title="Part of Speech" content={word.part_of_speech} />
                )}
                <div className="md:hidden mt-4">
                  <h3 className="text-sm font-semibold text-sky-400 mb-1">Context</h3>
                  <p className="text-slate-300 text-sm italic">"{word.context || ''}"</p>
                </div>
              </div>
              <div className="w-80">
                <h4 className="text-sm font-semibold text-sky-400 mb-2">Actions</h4>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssignToDeck([word.id]);
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors"
                  >
                    Add to Deck
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(word.id, word.term);
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  >
                    Delete Word
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};
