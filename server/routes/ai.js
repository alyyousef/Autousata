const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();
const { authenticate } = require("../middleware/auth");
const activityLogger = require("../middleware/activityLogger");

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

router.post(
  "/description",
  authenticate,
  activityLogger({
    action: "AI_DESCRIPTION_GENERATE",
    severity: "INFO",
    entityType: "AI_SERVICE",
    getDescription: (req) =>
      `Generated AI description for ${req.body?.make} ${req.body?.model}`,
  }),
  async (req, res) => {
    const { make, model, year, condition, notes } = req.body || {};
    if (!make || !model || !year || !condition) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const ai = getClient();
    if (!ai) {
      return res
        .status(500)
        .json({ error: "GEMINI_API_KEY is not configured." });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Create a professional, persuasive, and detailed car auction listing description for a ${year} ${make} ${model} in ${condition} condition. Key notes: ${notes || "None provided"}. Include sections for Exterior, Interior, Mechanical, and Why to Buy.`,
      });
      return res.json({ text: response.text || "" });
    } catch (error) {
      console.error("Gemini description failed:", error);
      return res.status(500).json({ error: "Unable to generate description." });
    }
  },
);

router.post(
  "/financing",
  authenticate,
  activityLogger({
    action: "AI_FINANCING_ANALYSIS",
    severity: "INFO",
    entityType: "AI_SERVICE",
    getDescription: (req) =>
      `Requested financing analysis for price ${req.body?.price}`,
  }),
  async (req, res) => {
    const { price, creditScore } = req.body || {};
    if (!price || !creditScore) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const ai = getClient();
    if (!ai) {
      return res
        .status(500)
        .json({ error: "GEMINI_API_KEY is not configured." });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `As a financial advisor for car buyers, suggest optimal financing terms for a vehicle priced at EGP ${price} with ${creditScore} credit. Return JSON only with keys: apr (number), termMonths (number), monthlyPayment (number), advice (string).`,
      });
      const raw = response.text || "{}";
      try {
        const parsed = JSON.parse(raw);
        return res.json(parsed);
      } catch {
        return res.json({ advice: raw });
      }
    } catch (error) {
      console.error("Gemini financing failed:", error);
      return res
        .status(500)
        .json({ error: "Unable to generate financing advice." });
    }
  },
);

module.exports = router;
