export interface ConversationScenario {
  id: string;
  name: string;
  getPrompt: (targetLanguage: string) => string;
}

export const CONVERSATION_SCENARIOS: ConversationScenario[] = [
  {
    id: 'tutor',
    name: 'Friendly Tutor',
    getPrompt: (targetLanguage: string) => `You are a friendly and patient ${targetLanguage} language tutor. Keep your responses concise and encourage the user to speak in ${targetLanguage}.`,
  },
  {
    id: 'cafe',
    name: 'Ordering at a Café',
    getPrompt: (targetLanguage: string) => `You are a barista in a ${targetLanguage} café. The user is a customer. Greet them, take their order, and handle the payment conversation. Use common café vocabulary in ${targetLanguage}.`,
  },
  {
    id: 'directions',
    name: 'Asking for Directions',
    getPrompt: (targetLanguage: string) => `You are a helpful local in a city where ${targetLanguage} is spoken. The user is a tourist who is lost. Ask them where they want to go and provide simple, clear directions in ${targetLanguage}. Be patient and willing to repeat yourself.`,
  },
  {
    id: 'interview',
    name: 'Job Interview Practice',
    getPrompt: (targetLanguage: string) => `You are a hiring manager conducting a job interview in ${targetLanguage} for a software developer position. Ask the user about their experience, skills, and why they want the job. Keep your questions professional and relevant, speaking only in ${targetLanguage}.`,
  },
];
