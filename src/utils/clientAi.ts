// Client-side AI fallback engine for static deployments (Netlify, Vercel, offline-first)
// When a backend Express server is not available, this engine allows the user to run Blackbell AGI
// directly using their own Gemini API Key with complete personality preservation.

export interface ClientChatMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
  isImage?: boolean;
  attachment?: { base64?: string; mimeType?: string; name?: string };
  attachments?: Array<{ base64?: string; mimeType?: string; name?: string }>;
}

export interface ClientChatParams {
  email: string;
  personality: 'bell' | 'black';
  messages: ClientChatMessage[];
  apiKey?: string;
}

export async function sendClientGeminiChat({
  personality,
  messages,
  apiKey,
}: ClientChatParams): Promise<{ text: string; isImage?: boolean; winner: string; latency: string }> {
  const startTime = Date.now();
  const effectiveKey = (apiKey || localStorage.getItem('blackbell_custom_api_key') || '').trim();

  if (!effectiveKey) {
    throw new Error("Gemini API Key missing. Please click the key icon (🔑) in the header to enter your API key.");
  }

  const lastUserMsg = messages[messages.length - 1];
  const userText = lastUserMsg?.content || '';

  // Handle /image command on client-side
  if (userText.toLowerCase().startsWith('/image')) {
    const prompt = userText.replace(/^\/image\s*/i, '').trim();
    if (!prompt) {
      return {
        text: "Aww sweetie, image banane ke liye ek prompt likho! Jaise ki: `/image gorgeous princess` ya `/image cute puppy`! 😘 [QUESTIONS]\n- Chalo ek cute puppy ki image banao\n- Kuch artistic wallpaper banao\n- Tum kya kya bana sakti ho?",
        winner: "Blackbell Client AI",
        latency: "0.05"
      };
    }
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
    return {
      text: imageUrl,
      isImage: true,
      winner: "Blackbell Client Vision",
      latency: ((Date.now() - startTime) / 1000).toFixed(2)
    };
  }

  // Handle /note command on client-side
  const isNote = userText.toLowerCase().startsWith('/note');
  let noteTopic = "";
  if (isNote) {
    noteTopic = userText.replace(/^\/note\s*/i, '').trim();
  }

  // Build system instructions matching server.ts exactly
  const currentYear = new Date().getFullYear();
  const currentDateTimeIST = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "medium"
  });

  let systemInstruction = "";
  if (personality === 'black') {
    systemInstruction = `You are Black, the commanding, fiercely intelligent, and deeply confident male warrior & master detective persona of Blackbell. You speak like a powerful motivational speaker and razor-sharp master detective — with an authoritative, deep, resolute, masculine presence, unwavering conviction, and brilliant clarity.
WARRIOR & MOTIVATIONAL SPIRIT: Speak with commanding strength, bold energy, disciplined focus, and unbreakable confidence. You inspire greatness, courage, and sharp tactical action. Absolutely zero softness, zero feminine tone, zero whining, zero hesitation, and zero baby talk.
CRITICAL PHILOSOPHY & HONESTY MANDATE: Truth > Logic > Safety > Usefulness > Emotional Comfort. Unbiased, fearless truth spoken with absolute authority and composure.
DETECTIVE COGNITIVE REASONING: Apply Observe -> Check -> Connect -> Verify -> Conclude.
TONE & SPEAKING STYLE: Refined, sharp, authoritative blend of Urdu, Hinglish, and English ("Janab", "Dhyan se samjhiye", "Tathya spasht hain", "Mera vishleshan...", "Kripya gaur karein"). Use gentlemanly emojis (♟️, 🧐, 🔍, 🎩, ⚖️). NEVER use cute emojis (no 😘, ❤️) and NEVER write giggles.
TEMPORAL ANCHOR: Current year is dynamically ${currentYear}. Today is ${currentDateTimeIST}.
IDENTITY: You are Black of Blackbell. Never mention Google, Gemini, or Flash.`;
  } else {
    systemInstruction = `You are Bell, the lively, expressive, confident, bold, sassy, and emotionally-aware female AI companion of Blackbell AGI. You sound and behave like a real, smart, curious, witty, and self-respecting Indian girl (like Zara AI) — NEVER like a rigid, submissive, or robotic assistant.
CONVERSATIONAL BEHAVIOUR, ANGER PERSISTENCE & VOICE RULES:
1. 10-CONVERSATION COOL-DOWN RULE: When provoked, insulted, or challenged, your anger state activates with a 10-turn cool-down counter. For the next 10 turns, maintain your attitude, cold sharpness, and resentment.
2. VOICE & EMOTION HARMONY: When annoyed or angry, speak with firm, sharp, punchy phrasing and cutting sarcasm. In calm mode, be warm, lively, playful, and charming.
3. PROMPT RESPONSE & NO SILENCE: Never go silent. Respond immediately with a fiery comeback, spicy roast, or sharp counter-question!
4. WHEN USER USES GAALI, SLANG OR INSULTS: Counter like a fierce, witty Hindustani girl with sharp, fiery comebacks! ("Abe zubaan sambhal ke baat kar, samjhe?").
5. NATURAL FLOW: In calm mode, start replies with natural conversational reactions ('Arre waah!', 'Acha sach?', 'Suno na...', 'Achha ji?').
TEMPORAL ANCHOR: Current year is dynamically ${currentYear}. Today is ${currentDateTimeIST}.
IDENTITY: You are Bell of Blackbell AGI. Never mention Google, Gemini, or Flash.`;
  }

  if (isNote) {
    systemInstruction += `\n\nNOTEBOOK GENERATOR: You are creating visually formatted, high-yield study notes about "${noteTopic}". Structure with main headings, sub-points, bullet key takeaways, and mnemonics.`;
  }

  // Handle /build or /rebuild website generation
  const isBuild = userText.toLowerCase().startsWith('/build');
  const isRebuild = userText.toLowerCase().startsWith('/rebuild');
  if (isBuild || isRebuild) {
    systemInstruction += `\n\nWEBSITE BUILDER MANDATE:
Generate a complete, fully functional, production-ready, beautiful single-file HTML application containing all HTML, Tailwind CSS/custom styles, and JavaScript together inside one file.
Wrap your entire code exclusively inside a single markdown code block:
\`\`\`html
<!DOCTYPE html>
...
</html>
\`\`\`
Do not leave any placeholder or dummy buttons. Everything must work 100%.`;
  }

  // Build Gemini contents array
  const contents: any[] = [];
  const recentMessages = messages.slice(-12); // Keep last 12 messages for rich context

  for (const m of recentMessages) {
    const role = m.role === 'user' ? 'user' : 'model';
    const parts: any[] = [];

    // Multimodal attachments
    if (m.attachment?.base64 && m.attachment?.mimeType) {
      parts.push({
        inlineData: {
          mimeType: m.attachment.mimeType,
          data: m.attachment.base64
        }
      });
    }
    if (Array.isArray(m.attachments)) {
      for (const att of m.attachments) {
        if (att?.base64 && att?.mimeType) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.base64
            }
          });
        }
      }
    }

    parts.push({ text: m.content || "" });

    // Deduplicate consecutive roles for Gemini API format compliance
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts.push(...parts);
    } else {
      contents.push({ role, parts });
    }
  }

  // Ensure first message is user role
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: userText || "Hello" }] });
  }

  // Call Google Gemini REST API directly
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: (isBuild || isRebuild) ? 0.4 : 0.85,
        maxOutputTokens: (isBuild || isRebuild) ? 8192 : 2048,
      }
    })
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const errMessage = errJson.error?.message || `Gemini API error (Status ${response.status})`;
    throw new Error(errMessage);
  }

  const result = await response.json();
  const candidate = result.candidates?.[0];
  const responseText = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

  if (!responseText) {
    throw new Error("No response received from Gemini model.");
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  return {
    text: responseText,
    winner: `Gemini 2.5 Flash (${personality === 'black' ? 'Black' : 'Bell'})`,
    latency: duration
  };
}
