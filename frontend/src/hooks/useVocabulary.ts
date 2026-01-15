export function useVocabulary(userId: number) {
  const [wordBank, setWordBank] = useState<Word[]>([]);

  const loadWords = async () => {
    const response = await wordService.getWordsByDeck(1);
    setWordBank(response.data);
  };

  const handleSaveWord = async (wordData: any) => {
    // logic moved from App.tsx...
  };

  return { wordBank, loadWords, handleSaveWord };
}
