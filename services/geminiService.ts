import { GoogleGenAI, GenerateContentResponse, Part, Content } from "@google/genai";
import { LitReviewResult, UserSettings, TimeRange, ModelType, QuizQuestion, ChatMessage, StudyMonitorResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Map abstract model types to specific Gemini versions
const getModelConfig = (type: ModelType) => {
  switch (type) {
    case 'fast':
      // Flash is fast and cost-effective
      return { model: 'gemini-3-flash-preview', thinkingBudget: 0 };
    case 'deep-think':
      // Use Thinking Config for high depth reasoning
      return { model: 'gemini-3-pro-preview', thinkingBudget: 16000 }; 
    case 'balanced':
    default:
      // Standard Pro model
      return { model: 'gemini-3-pro-preview', thinkingBudget: 0 };
  }
};

const getTimeRangeText = (range: TimeRange) => {
  switch (range) {
    case '1w': return 'past 7 days';
    case '1m': return 'past month';
    case '6m': return 'past 6 months';
    case '1y': return 'past year';
    case 'all': return 'recent years';
    default: return 'recent';
  }
};

/**
 * Helper to clean JSON strings returned by the model (removes markdown code blocks)
 */
const cleanJsonString = (text: string): string => {
  if (!text) return "{}";
  // Remove ```json ... ``` or ``` ... ``` wrappers
  let clean = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
  return clean.trim();
};

/**
 * Generates a news bulletin
 */
export const generateResearchBulletin = async (settings: UserSettings): Promise<string> => {
  const languageInstruction = settings.language === 'zh' 
    ? "IMPORTANT: The search queries should be in English to find the best papers, but the Final Output MUST be in Simplified Chinese." 
    : "Output in English.";

  const { model, thinkingBudget } = getModelConfig(settings.selectedModel);
  const config: any = {
    tools: [{ googleSearch: {} }],
    systemInstruction: "You are an expert research scientist creating a newsletter.",
  };
  
  // Apply thinking budget if this is a 'deep-think' request
  if (thinkingBudget > 0) {
    config.thinkingConfig = { thinkingBudget };
  }

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `
    Current Date: ${currentDate}.
    Act as a senior research scientist. 
    Conduct a search for the latest and most significant academic literature, journals, and pre-prints in the field of "${settings.researchField}".
    Time range to search: ${getTimeRangeText(settings.timeRange)} relative to today (${currentDate}).
    
    ${languageInstruction}

    Output a "Research News Bulletin".
    
    IMPORTANT: Format the main content as a Markdown Table with the following columns:
    | Title | Main Work | Significant Progress | Methodology | Source/DOI |
    
    CRITICAL INSTRUCTION FOR "Source/DOI":
    - You MUST provide a specific, clickable Markdown link to the specific paper or article (e.g., [DOI:10.1038/...](https://doi.org/...) or [PDF](url)).
    - Do NOT use generic website homepages. The link must lead directly to the specific resource.
    - If a DOI is found, prefer the DOI link format.
    - If no specific link is found, write "N/A".
    
    After the table, you may provide a brief 1-paragraph synthesis of the overall trends found.
    
    Ensure the tone is professional, objective, and suitable for a ${settings.experienceLevel}.
    IMPORTANT: Ensure all dates and findings are from the correct year (${new Date().getFullYear()}) if available.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    return response.text || "No recent updates found.";
  } catch (error) {
    console.error("Bulletin Error:", error);
    throw new Error("Failed to generate research bulletin.");
  }
};

/**
 * Analyzes Literature with Deep Reflection
 */
export const analyzeLiterature = async (
  urlOrDoi: string, 
  imageBase64: string | null,
  settings: UserSettings
): Promise<LitReviewResult> => {
  
  const languageInstruction = settings.language === 'zh' 
    ? "The JSON content (values) MUST be in Simplified Chinese." 
    : "The JSON content MUST be in English.";

  const { model, thinkingBudget } = getModelConfig(settings.selectedModel);
  
  const config: any = {
    tools: [{ googleSearch: {} }],
    responseMimeType: "application/json",
  };
  
  if (thinkingBudget > 0) {
    config.thinkingConfig = { thinkingBudget };
  }

  const promptText = `
    I need a deep-dive reading report for the scientific literature located at: ${urlOrDoi}.
    ${imageBase64 ? "I have also attached a key figure/chart from the paper. Please analyze this image in detail and include findings in the 'imageAnalysis' field." : ""}

    ${languageInstruction}

    Please browse the content and extract the following essential information:
    1. Title of the paper.
    2. Main Work: What is the core problem and proposed solution?
    3. Significant Progress: What is the key contribution or novelty compared to prior art?
    4. Principles and Experimental Methods: Technically, how was this achieved?
    5. Implications: Why does this matter?
    6. CRITICAL ANALYSIS: Identify limitations, potential biases, and missing validation in the work.
    7. PPT Draft: Create 5-7 slides for a group meeting presentation. 
       - Slide 1: Title & Authors
       - Slide 2: Context & Problem
       - Slide 3: Methodology (Technical Depth)
       - Slide 4: Key Results
       - Slide 5: Critical Analysis (Strengths & Weaknesses) - VERY IMPORTANT
       - Slide 6: Implications & Future Work
    8. Speech Script: A cohesive speech script for presenting this paper at a group meeting (approx 2-3 mins).

    Format the output as a valid JSON object with keys: 
    "title", "mainWork", "significantProgress", "principlesAndMethods", "implications", 
    "criticalAnalysis" (object with keys: "limitations", "biases", "missingValidation"),
    "pptDraft" (array of objects with {slideTitle, bulletPoints[], speakerNotes}), 
    "groupMeetingSpeech",
    "imageAnalysis" (string, optional).
  `;

  const parts: Part[] = [];
  
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/png', 
        data: imageBase64
      }
    });
  }
  
  parts.push({ text: promptText });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model, 
      contents: { parts },
      config,
    });

    return JSON.parse(cleanJsonString(response.text || "{}")) as LitReviewResult;
  } catch (error) {
    console.error("Lit Review Error:", error);
    throw new Error("Failed to analyze the literature. Please check the link or try again.");
  }
};

/**
 * Generates quiz questions based on the literature review
 */
export const generateQuiz = async (
  context: string,
  settings: UserSettings
): Promise<QuizQuestion[]> => {
  const languageInstruction = settings.language === 'zh' 
    ? "The questions and options MUST be in Simplified Chinese." 
    : "The questions and options MUST be in English.";

  // Use Flash model for speed as quiz generation is a simpler task
  const config = {
    responseMimeType: "application/json",
  };

  const prompt = `
    Based on the following scientific text, generate 3 multiple-choice questions to test the user's understanding of the key concepts.
    
    Context:
    ${context}

    ${languageInstruction}

    Return a JSON array where each object has:
    - "question": string
    - "options": array of 4 strings
    - "correctAnswerIndex": number (0-3)
    - "explanation": string (brief explanation of why the answer is correct)
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config,
    });

    return JSON.parse(cleanJsonString(response.text || "[]")) as QuizQuestion[];
  } catch (error) {
    console.error("Quiz Error:", error);
    return [];
  }
};

/**
 * Chat stream handler
 */
export const createResearchChat = (settings: UserSettings, historyMessages: ChatMessage[] = []) => {
  const languageInstruction = settings.language === 'zh' 
    ? "Answer in Simplified Chinese." 
    : "Answer in English.";

  const { model, thinkingBudget } = getModelConfig(settings.selectedModel);
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const config: any = {
    tools: [{ googleSearch: {} }],
    systemInstruction: `
      You are a research assistant. Current Date: ${currentDate}.
      ${languageInstruction}
      When answering user queries:
      1. Prioritize newer and authoritative academic sources.
      2. Structure answers with: 
         - Main Work/Direct Answer
         - Significant Context/Progress
         - Principles & Methods (Technical details)
      3. Always cite sources if retrieved via search.
    `,
  };

  if (thinkingBudget > 0) {
    config.thinkingConfig = { thinkingBudget };
  }

  // Convert UI messages to Gemini History format
  const history: Content[] = historyMessages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  const chat = ai.chats.create({
    model,
    config,
    history
  });

  return chat;
};

/**
 * Study Companion: Monitor User State
 */
export const analyzeStudyFrame = async (imageBase64: string): Promise<StudyMonitorResult> => {
  const config = {
    responseMimeType: "application/json",
  };

  const prompt = `
    Analyze this image of a user studying/working. 
    Check for 5 specific things:
    1. IsFocused: Are they looking at the screen or notes?
    2. IsUsingPhone: Are they holding or looking at a phone?
    3. IsAbsent: Is the chair empty?
    4. IsSlouching: Is their posture bad? (Hunched shoulders, leaning too close, head down).
    5. Lighting: Is the room 'good', 'dim' (too dark for eyes), or 'bright'?
    
    Provide a witty, human-like, spoken-style 'advice' (max 1 sentence). 
    If they are using a phone, be strict. 
    If they are slouching, remind them to sit up.
    If lighting is bad, tell them to turn on a light.
    If they are doing great, encourage them.
    
    Return JSON:
    { 
      "isFocused": boolean, 
      "isUsingPhone": boolean, 
      "isAbsent": boolean, 
      "isSlouching": boolean,
      "lightingCondition": "good" | "dim" | "bright",
      "advice": "string" 
    }
  `;

  const parts: Part[] = [
    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
    { text: prompt }
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Flash is sufficient and fast for vision
      contents: { parts },
      config,
    });

    return JSON.parse(cleanJsonString(response.text || "{}")) as StudyMonitorResult;
  } catch (error) {
    console.error("Study Monitor Error:", error);
    return { 
      isFocused: true, isUsingPhone: false, isAbsent: false, 
      isSlouching: false, lightingCondition: 'good', advice: "" 
    };
  }
};