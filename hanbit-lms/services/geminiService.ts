import { GoogleGenAI, Type } from "@google/genai";
import { WeeklyModule, QuizQuestion, CourseType } from "../types";

// Helper to safely get API key
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSyllabus = async (
  title: string,
  overview: string,
  totalWeeks: number,
  courseType: CourseType
): Promise<WeeklyModule[]> => {
  const ai = getAIClient();
  
  const prompt = `
    Create a syllabus for a course titled "${title}".
    Overview: "${overview}".
    Course Type: "${courseType}".
    Total Weeks: ${totalWeeks}.
    
    Return a strictly valid JSON array where each object has:
    - week (number)
    - title (string)
    - description (string)
    - hasAssignment (boolean, suggested based on topic)
    - hasDiscussion (boolean, suggested based on topic)
    - hasExam (boolean, true only for mid-term or final)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              week: { type: Type.INTEGER },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              hasAssignment: { type: Type.BOOLEAN },
              hasDiscussion: { type: Type.BOOLEAN },
              hasExam: { type: Type.BOOLEAN },
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as WeeklyModule[];
  } catch (error) {
    console.error("Error generating syllabus:", error);
    throw error;
  }
};

export const generateStudyMaterial = async (
  courseTitle: string,
  weekTitle: string,
  weekDescription: string
): Promise<string> => {
  const ai = getAIClient();
  
  const prompt = `
    Write a comprehensive educational "textbook" style lecture content for:
    Course: ${courseTitle}
    Week Topic: ${weekTitle}
    Context: ${weekDescription}
    
    Format using Markdown. Include headers, bullet points, and clear explanations suitable for students.
    Language: Korean.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error("Error generating material:", error);
    return "AI 교안 생성 중 오류가 발생했습니다.";
  }
};

export const generateActivityDetails = async (
  courseTitle: string,
  weekTitle: string,
  material: string
): Promise<{ assignmentTitle: string, assignmentDescription: string, discussionTopic: string, discussionDescription: string }> => {
  const ai = getAIClient();

  const prompt = `
    Based on the study material for "${weekTitle}" in the course "${courseTitle}", create:
    1. A creative assignment title and short instruction.
    2. A thought-provoking discussion topic and description.
    
    Material Snippet: ${material.substring(0, 3000)}...
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    assignmentTitle: { type: Type.STRING },
                    assignmentDescription: { type: Type.STRING },
                    discussionTopic: { type: Type.STRING },
                    discussionDescription: { type: Type.STRING }
                }
            }
        }
    });
    
    const text = response.text;
    if (!text) return { assignmentTitle: "", assignmentDescription: "", discussionTopic: "", discussionDescription: "" };
    return JSON.parse(text);
  } catch (error) {
      console.error("Error generating activities:", error);
      return { assignmentTitle: "", assignmentDescription: "", discussionTopic: "", discussionDescription: "" };
  }
}

export const generateQuiz = async (
  material: string,
  count: number = 3
): Promise<QuizQuestion[]> => {
  const ai = getAIClient();
  
  const prompt = `
    Based on the following study material, create ${count} quiz questions.
    Material: ${material.substring(0, 5000)}... (truncated)
    
    Return a strictly valid JSON array of objects with:
    - id (string, generate a random short string)
    - type ("MULTIPLE_CHOICE", "SHORT_ANSWER", or "ESSAY")
    - question (string)
    - options (array of strings, only for MULTIPLE_CHOICE)
    - correctAnswer (string, the correct answer or key points)
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"] },
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING }
                    }
                }
            }
        }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as QuizQuestion[];
  } catch (error) {
    console.error("Error generating quiz:", error);
    return [];
  }
};

export const autoGrade = async (
  question: string,
  studentAnswer: string,
  correctAnswerContext: string,
  maxScore: number
): Promise<{ score: number; feedback: string }> => {
  const ai = getAIClient();

  const prompt = `
    Act as a strict but fair professor. Grade the following student submission.
    Question: "${question}"
    Correct Answer/Context: "${correctAnswerContext}"
    Student Answer: "${studentAnswer}"
    Max Score: ${maxScore}

    Return JSON:
    {
      "score": number (0 to ${maxScore}),
      "feedback": string (Constructive feedback in Korean)
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                score: { type: Type.NUMBER },
                feedback: { type: Type.STRING }
            }
        }
      }
    });

    const text = response.text;
    if (!text) return { score: 0, feedback: "Error grading" };
    return JSON.parse(text);
  } catch (error) {
    console.error("Error grading:", error);
    return { score: 0, feedback: "AI 채점 실패. 관리자에게 문의하세요." };
  }
};
