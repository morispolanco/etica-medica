// Vercel Serverless Function to interact with Google Gemini API

// Vercel Serverless Function to interact with Google Gemini API

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Environment variable for API Key (must be set in Vercel)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Model configuration (adjust as needed)
const MODEL_NAME = "gemini-1.5-flash-latest"; // Or another suitable model

// Safety settings (adjust thresholds as needed)
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Generation configuration
const generationConfig = {
  temperature: 0.8, // Adjust for creativity vs consistency
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048, // Adjust based on expected dilemma size
  // Ensure response is JSON
  response_mime_type: "application/json",
};

export default async function handler(req, res) {
    // Allow only GET requests for simplicity, as we don't send data in the body
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    if (!GEMINI_API_KEY) {
        console.error('Gemini API Key not found in environment variables.');
        return res.status(500).json({ error: 'Server configuration error: API Key missing.' });
    }

    // Define the prompt for Gemini, requesting JSON output
    const prompt = `Generate a detailed medical ethical dilemma suitable for healthcare students/professionals. Cover varied areas like patient autonomy, resource allocation, confidentiality, end-of-life, or research ethics.
    The output MUST be a single valid JSON object containing ONLY the following keys:
    - "case_description": A string with a detailed scenario (at least 100 words).
    - "ethical_question": A clear, direct ethical question string derived from the case.
    - "options": An array of 3 to 5 distinct string options representing possible actions/decisions.
    - "analysis_mapping": A JSON object where keys are the zero-based index of the options (e.g., "0", "1", "2") and values are detailed analysis strings for each corresponding option, explaining ethical principles (like autonomy, beneficence, non-maleficence, justice), potential consequences, and alternative perspectives. Each analysis should be at least 50 words.

    Example structure:
    {
      "case_description": "...",
      "ethical_question": "...",
      "options": ["Option A", "Option B", "Option C"],
      "analysis_mapping": {
        "0": "Analysis for Option A...",
        "1": "Analysis for Option B...",
        "2": "Analysis for Option C..."
      }
    }

    Generate a new, unique dilemma now.`;


    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME, safetySettings, generationConfig });

        console.log("Sending prompt to Gemini..."); // Log start
        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();
        console.log("Raw response text from Gemini:", responseText); // Log raw response

        // Since we requested JSON mime type, Gemini should return valid JSON text.
        // We still parse and validate for robustness.
        let parsedData;
        try {
            parsedData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse JSON response from Gemini:', parseError);
            console.error('Gemini raw response was:', responseText); // Log the problematic text
            return res.status(500).json({ error: 'Failed to process AI response (JSON parse error).' });
        }

        // Validate the structure of the parsed JSON
        if (!parsedData || typeof parsedData !== 'object' ||
            typeof parsedData.case_description !== 'string' || parsedData.case_description.length < 50 || // Basic length check
            typeof parsedData.ethical_question !== 'string' || parsedData.ethical_question.length < 10 ||
            !Array.isArray(parsedData.options) || parsedData.options.length < 3 || parsedData.options.length > 5 ||
            typeof parsedData.analysis_mapping !== 'object' || Object.keys(parsedData.analysis_mapping).length !== parsedData.options.length)
        {
            console.error('Invalid structure received from Gemini:', parsedData);
            return res.status(500).json({ error: 'Failed to generate dilemma due to invalid data structure from AI.' });
        }

        // Further validation: Check if all options have corresponding analysis
        let structureValid = true;
        parsedData.options.forEach((_, index) => {
            if (typeof parsedData.analysis_mapping[index] !== 'string' || parsedData.analysis_mapping[index].length < 30) { // Basic length check
                console.error(`Missing or short analysis for option index ${index} in:`, parsedData.analysis_mapping);
                structureValid = false;
            }
        });

        if (!structureValid) {
             return res.status(500).json({ error: 'Failed to generate dilemma due to incomplete analysis mapping from AI.' });
        }

        console.log("Successfully generated and validated dilemma."); // Log success
        // If valid:
        res.status(200).json(parsedData);

    } catch (error) {
        console.error('Error calling Gemini API or processing response:', error);
        // Check for specific Gemini API errors if possible (e.g., blocked content)
        if (error.message.includes('SAFETY')) {
             return res.status(500).json({ error: 'Failed to generate dilemma due to safety settings block.' });
        }
        res.status(500).json({ error: 'Failed to generate dilemma due to server error.' });
    }
}