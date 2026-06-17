import type {
  ChatRequest,
  ChatResponse,
  VoiceRequest,
  VoiceResponse,
  Conversation,
  Message,
  Language,
} from './types';

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

const MOCK_USER_ID = 'mock-user-001';

interface ConversationEntry {
  conversation: Conversation;
  messages: Message[];
}

const store = new Map<string, ConversationEntry>();

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function mockReply(query: string, lang: Language): string {
  if (lang === 'hi') {
    return `**DPDP अधिनियम, 2023** के अनुसार, "${query.slice(0, 60)}" के संदर्भ में निम्नलिखित प्रावधान लागू होते हैं:

**धारा 4** — डिजिटल व्यक्तिगत डेटा का प्रसंस्करण केवल वैध उद्देश्यों के लिए किया जा सकता है जिसके लिए डेटा प्रिंसिपल की सहमति प्राप्त की गई हो।

**धारा 8(5)** — डेटा फिड्यूशरी निर्दिष्ट उद्देश्य से परे व्यक्तिगत डेटा का प्रसंस्करण नहीं कर सकती।

**धारा 13** — डेटा प्रिंसिपल को अपने व्यक्तिगत डेटा की जानकारी तक पहुँचने का अधिकार है।

**धारा 17** — डेटा प्रिंसिपल को सुधार और मिटाने का अधिकार है।

यह सामान्य कानूनी मार्गदर्शन है। अपनी विशिष्ट स्थिति के लिए किसी योग्य कानूनी पेशेवर से परामर्श लें।`;
  }

  return `Under the **Digital Personal Data Protection (DPDP) Act, 2023**, the following provisions are relevant to your question about "${query.slice(0, 60)}":

**Section 4** — Digital personal data may be processed only for a lawful purpose for which the Data Principal has given consent, or for certain legitimate uses specified under the Act.

**Section 8(5)** — The Data Fiduciary shall not retain personal data beyond the period necessary to satisfy the purpose for which it was collected.

**Section 13** — Every Data Principal has the right to access a summary of the personal data being processed and the processing activities undertaken by the Data Fiduciary.

**Section 17** — The Data Principal has the right to correction, completion, updating, and erasure of personal data.

This is general legal guidance grounded in the DPDP Act, 2023. For advice specific to your situation, please consult a qualified legal professional.`;
}

function mockTranscript(lang: Language): string {
  return lang === 'hi'
    ? 'DPDP अधिनियम के तहत मेरे डेटा अधिकार क्या हैं?'
    : 'What are my data rights under the DPDP Act?';
}

function getOrCreateEntry(conversationId: string, lang: Language, title: string): ConversationEntry {
  if (!store.has(conversationId)) {
    store.set(conversationId, {
      conversation: {
        id: conversationId,
        user_id: MOCK_USER_ID,
        title,
        language: lang,
        created_at: now(),
      },
      messages: [],
    });
  }
  return store.get(conversationId)!;
}

export async function mockSendChat(req: ChatRequest): Promise<ChatResponse> {
  await delay(800 + Math.random() * 600);

  const convId = req.conversation_id ?? uid();
  const entry = getOrCreateEntry(convId, req.lang, req.message.slice(0, 60));

  const userMsg: Message = {
    id: uid(),
    conversation_id: convId,
    role: 'user',
    content: req.message,
    input_type: 'text',
    language: req.lang,
    created_at: now(),
  };

  const assistantMsg: Message = {
    id: uid(),
    conversation_id: convId,
    role: 'assistant',
    content: mockReply(req.message, req.lang),
    input_type: 'text',
    language: req.lang,
    created_at: now(),
  };

  entry.messages.push(userMsg, assistantMsg);

  return { conversation_id: convId, message: assistantMsg };
}

export async function mockSendVoice(req: VoiceRequest): Promise<VoiceResponse> {
  await delay(1200 + Math.random() * 800);

  const convId = req.conversation_id ?? uid();
  const transcript = mockTranscript(req.lang);
  const title = req.lang === 'hi' ? 'वॉइस वार्तालाप' : 'Voice Conversation';
  const entry = getOrCreateEntry(convId, req.lang, title);

  const userMsg: Message = {
    id: uid(),
    conversation_id: convId,
    role: 'user',
    content: transcript,
    input_type: 'voice',
    language: req.lang,
    created_at: now(),
  };

  const assistantMsg: Message = {
    id: uid(),
    conversation_id: convId,
    role: 'assistant',
    content: mockReply(transcript, req.lang),
    input_type: 'voice',
    language: req.lang,
    created_at: now(),
  };

  entry.messages.push(userMsg, assistantMsg);

  // No audio_base64 returned — browser SpeechSynthesis fallback will be used
  return { conversation_id: convId, transcript, message: assistantMsg };
}

export async function mockGetConversations(): Promise<Conversation[]> {
  await delay(150);
  return Array.from(store.values())
    .map((e) => e.conversation)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function mockGetMessages(conversationId: string): Promise<Message[]> {
  await delay(200);
  return store.get(conversationId)?.messages ?? [];
}
