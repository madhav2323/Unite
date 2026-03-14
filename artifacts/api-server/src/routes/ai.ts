import { Router } from "express";

const router = Router();

router.post("/ai/chat", async (req, res) => {
  try {
    const { messages, code, language } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      code?: string;
      language?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    if (!baseUrl || !apiKey) {
      res.status(500).json({ error: "AI integration not configured" });
      return;
    }

    const systemPrompt = `You are an expert coding assistant integrated into Unite, a real-time collaborative code editor. You help users understand, debug, and improve code.

${code ? `The user currently has this ${language || "code"} open in the editor:\n\`\`\`${language || ""}\n${code}\n\`\`\`` : ""}

Guidelines:
- Be concise and direct — this is a code editor sidebar, not a full chat UI
- When suggesting code changes, use code blocks with the correct language
- If you rewrite code, provide the full corrected version
- Point out bugs, inefficiencies, and improvements when relevant
- Keep responses focused and actionable`;

    const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_completion_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", response.status, errText);
      res.status(500).json({ error: "AI request failed" });
      return;
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const reply = data.choices?.[0]?.message?.content ?? "";
    res.json({ reply });
  } catch (err: any) {
    console.error("AI chat error:", err?.message ?? err);
    res.status(500).json({ error: "AI request failed" });
  }
});

export default router;
