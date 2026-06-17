import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for base64 image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// In-memory counter representing simulated stats that increment with user classifications
let stats = {
  wasteClassified: 124500,
  recyclableItems: 82300,
  tonsDiverted: 45.6,
  carbonReduced: 18200
};

// Lazy Initializer for Gemini API client to prevent crashing on boot if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Health API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "EcoSort AI Server is healthy." });
});

// 2. Stats API
app.get("/api/stats", (req, res) => {
  res.json(stats);
});

// Robust local fallback waste classifier for continuous resilience if the upstream API is unavailable
function calculateFallbackCategory(name?: string): {
  itemName: string;
  category: string;
  confidenceScore: number;
  ecoImpactScore: number;
  recommendation: string;
  sustainabilityTip: string;
} {
  const normName = (name || "unidentified material").toLowerCase();
  
  if (
    normName.includes("plastic") || 
    normName.includes("bottle") || 
    normName.includes("can") || 
    normName.includes("box") || 
    normName.includes("cardboard") || 
    normName.includes("paper") || 
    normName.includes("glass") || 
    normName.includes("metal") ||
    normName.includes("jar") ||
    normName.includes("foil") ||
    normName.includes("cup")
  ) {
    return {
      itemName: name ? name.trim() : "Recyclable Dry Material",
      category: "Dry Waste",
      confidenceScore: 92,
      ecoImpactScore: 80,
      recommendation: "Ensure it is clean and dry. Flatten if cardboard/plastic, then place in the BLUE recycling stream bin.",
      sustainabilityTip: "Swapping single-use packaging for high-capacity durable reusables lowers carbon emission factor immediately."
    };
  }

  if (
    normName.includes("apple") || 
    normName.includes("peel") || 
    normName.includes("banana") || 
    normName.includes("food") || 
    normName.includes("scraps") || 
    normName.includes("organic") || 
    normName.includes("vegetables") || 
    normName.includes("vegetable") || 
    normName.includes("compost") || 
    normName.includes("coffee") || 
    normName.includes("leaves") ||
    normName.includes("fruit") ||
    normName.includes("twig") ||
    normName.includes("bread")
  ) {
    return {
      itemName: name ? name.trim() : "Organic Compostable Stream",
      category: "Wet Waste",
      confidenceScore: 95,
      ecoImpactScore: 90,
      recommendation: "Discard any plastic bag wraps. Dispose directly into your HOME compost unit or municipal GREEN bin.",
      sustainabilityTip: "Decomposing organics inside airtight landfills produces methane. Aerobic composting creates rich soil nourishment."
    };
  }

  if (
    normName.includes("battery") || 
    normName.includes("wire") || 
    normName.includes("phone") || 
    normName.includes("led") || 
    normName.includes("bulb") || 
    normName.includes("electronic") || 
    normName.includes("computer") || 
    normName.includes("charging") ||
    normName.includes("keyboard") ||
    normName.includes("mouse") ||
    normName.includes("charger") ||
    normName.includes("cable")
  ) {
    return {
      itemName: name ? name.trim() : "Domestic Electronic Waste",
      category: "E-Waste",
      confidenceScore: 89,
      ecoImpactScore: 75,
      recommendation: "Never throw with domestic trash. Deliver to a certified retailer drop-box or toxic collection event.",
      sustainabilityTip: "Electronics contain precious rare-earth metals. Recycling them prevents toxic heavy metals from entering aquifers."
    };
  }

  if (
    normName.includes("paint") || 
    normName.includes("chemical") || 
    normName.includes("oil") || 
    normName.includes("bleach") || 
    normName.includes("syringe") || 
    normName.includes("drug") || 
    normName.includes("medicine") || 
    normName.includes("toxic") ||
    normName.includes("spray") ||
    normName.includes("vial") ||
    normName.includes("pills")
  ) {
    return {
      itemName: name ? name.trim() : "Hazardous Household Chemical",
      category: "Hazardous",
      confidenceScore: 88,
      ecoImpactScore: 68,
      recommendation: "Retain tightly in original packaging container. Place in a designated drop-off station for chemical processing.",
      sustainabilityTip: "Hazardous chemicals contaminate ground soils. Follow safe stewardship practices to preserve ecological security."
    };
  }

  // General default fallback
  return {
    itemName: name ? name.trim() : "Assumptive Compound Material",
    category: "Dry Waste",
    confidenceScore: 78,
    ecoImpactScore: 60,
    recommendation: "Inspect packaging for recycle triangle symbol. Clean material traces before sorting appropriately.",
    sustainabilityTip: "Standardizing reusable items prevents landfill growth. Adopt circular economy habits daily."
  };
}

// 3. Classify API
app.post("/api/classify", async (req, res) => {
  const { name, image } = req.body;
  if (!name && !image) {
    return res.status(400).json({ error: "Please provide either/both a waste item name or an image." });
  }

  let result: any = null;
  let isFallback = false;

  try {
    const ai = getGeminiClient();
    let parts: any[] = [];
    
    if (image) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid image format. Expected a valid base64 data URL." });
      }
      const mimeType = match[1];
      const base64Data = match[2];
      
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
    }

    let prompt = "Identify this waste item and segment it for sustainable waste management. Provide disposal recommendations and sustainability tips.";
    if (name) {
      prompt += ` The item is named or described as: "${name}".`;
    }
    if (image) {
      prompt += " Use the uploaded image as the primary visual source.";
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction: "You are an advanced AI environmental assistant specialized in waste segregation, SDG 12 compliance, and circular economics. Always provide truthful, actionable recycling commands.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: {
              type: Type.STRING,
              description: "The identified standard name of the waste item."
            },
            category: {
              type: Type.STRING,
              description: "Must be exactly one of: Dry Waste, Wet Waste, E-Waste, Hazardous"
            },
            confidenceScore: {
              type: Type.INTEGER,
              description: "An integer confidence score from 0 to 100."
            },
            ecoImpactScore: {
              type: Type.INTEGER,
              description: "An integer score of environmental benefit/saving from 0 to 100."
            },
            recommendation: {
              type: Type.STRING,
              description: "Clear, practical, and precise sorting/disposal instructions (under 120 characters)."
            },
            sustainabilityTip: {
              type: Type.STRING,
              description: "Mindful, informative ecological suggestion regarding reduction or reusable alternatives (under 120 characters)."
            }
          },
          required: ["itemName", "category", "confidenceScore", "ecoImpactScore", "recommendation", "sustainabilityTip"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Received empty response from Gemini model.");
    }

    result = JSON.parse(outputText.trim());

  } catch (error: any) {
    console.warn("Gemini API errored or high demand occurred. Triggering local smart fallback engine.", error.message);
    // Use local smart fallback classification
    result = calculateFallbackCategory(name);
    isFallback = true;
  }

  // Update the local in-memory statistics regardless of source path
  stats.wasteClassified += 1;
  if (["Dry Waste", "Wet Waste"].includes(result.category)) {
    stats.recyclableItems += 1;
  }
  stats.tonsDiverted = parseFloat((stats.tonsDiverted + 0.005).toFixed(3));
  stats.carbonReduced += Math.round((result.ecoImpactScore / 100) * 15);

  return res.json({
    success: true,
    result,
    isFallback
  });
});

// Vite middleware for dev or static server for production
async function setupViteAndListen() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EcoSort AI server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

setupViteAndListen().catch((err) => {
  console.error("Vite server setup failed:", err);
});
