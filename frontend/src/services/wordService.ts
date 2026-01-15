import { Word, Deck } from "../types";
import { apiRequest } from "./api";
import { db } from "./db";

export const getWords = async (targetLanguage: string): Promise<Word[]> => {
  try {
    return await apiRequest<Word[]>(`/words?language=${targetLanguage}`);
  } catch (error) {
    // console.debug(`Backend unreachable, using mock words for ${targetLanguage}.`);
    return db.words.filter((w) => w.language === targetLanguage);
  }
};

export const addWord = async (
  wordData: Omit<Word, "familiarityScore" | "language">,
  targetLanguage: string,
): Promise<Word> => {
  try {
    return await apiRequest<Word>("/words", {
      method: "POST",
      body: JSON.stringify({ ...wordData, language: targetLanguage }),
    });
  } catch (error) {
    console.warn("Backend unreachable, saving word locally.");
    const newWord: Word = {
      ...wordData,
      familiarityScore: 1,
      language: targetLanguage,
      context: wordData.context || "",
    };
    db.words.push(newWord);
    return newWord;
  }
};

export const updateFamiliarity = async (
  term: string,
  change: 1 | -1,
  targetLanguage: string,
): Promise<Word> => {
  try {
    return await apiRequest<Word>(
      `/words/${encodeURIComponent(term)}/familiarity?language=${targetLanguage}`,
      {
        method: "PUT",
        body: JSON.stringify({ change }),
      },
    );
  } catch (error) {
    // console.debug("Backend unreachable, updating locally.");
    const wordIndex = db.words.findIndex(
      (w) => w.term === term && w.language === targetLanguage,
    );
    if (wordIndex !== -1) {
      const word = db.words[wordIndex];
      const newScore = Math.max(1, Math.min(5, word.familiarityScore + change));
      const updatedWord = { ...word, familiarityScore: newScore };
      db.words[wordIndex] = updatedWord;
      return updatedWord;
    }
    // If word not found in mock db (shouldn't happen if lists are synced), return a dummy or throw
    throw new Error("Word not found in local bank");
  }
};

// --- Deck Services ---

export const getDecks = async (targetLanguage: string): Promise<Deck[]> => {
  try {
    return await apiRequest<Deck[]>(`/decks?language=${targetLanguage}`);
  } catch (error) {
    return db.decks.filter((d) => d.language === targetLanguage);
  }
};

export const importDeck = async (
  file: File,
  name: string,
  language: string,
): Promise<{ deck: Deck; importedCount: number }> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("language", language);

    // Using fetch directly since apiUploadFile is slightly different in typical usage (no extra fields)
    // But we can reuse logic from app.py

    const response = await fetch("http://localhost:5000/api/decks/import", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Import failed");
    return await response.json();
  } catch (error) {
    console.warn("Backend unreachable. Mock import.");
    const newDeck: Deck = {
      id: Date.now(),
      name: name,
      language: language,
      wordCount: 0,
    };
    db.decks.push(newDeck);
    return { deck: newDeck, importedCount: 0 };
  }
};

export const createDeck = async (
  name: string,
  language: string,
): Promise<Deck> => {
  try {
    return await apiRequest<Deck>("/decks", {
      method: "POST",
      body: JSON.stringify({ name, language }),
    });
  } catch (error) {
    const newDeck: Deck = { id: Date.now(), name, language, wordCount: 0 };
    db.decks.push(newDeck);
    return newDeck;
  }
};
