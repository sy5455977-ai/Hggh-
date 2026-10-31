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

  // Multi-tier model cascade to prevent single-model quota exhaustion on Free Tier
  const candidateModels = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b"
  ];

  let lastModelError: any = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: (isBuild || isRebuild) ? 0.3 : 0.8,
            maxOutputTokens: (isBuild || isRebuild) ? 8192 : 2048,
          }
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMessage = errJson.error?.message || `Status ${response.status}`;
        lastModelError = new Error(errMessage);
        const isQuota = errMessage.includes('quota') || errMessage.includes('limit') || errMessage.includes('RESOURCE_EXHAUSTED') || response.status === 429;
        if (isQuota) {
          console.warn(`[Client AI] Model ${model} daily free quota reached. Switching to next candidate in cascade...`);
          continue; // Try next model in candidate list
        }
        continue;
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];
      const responseText = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

      if (responseText && responseText.trim()) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        return {
          text: responseText,
          winner: `${model} (${personality === 'black' ? 'Black' : 'Bell'})`,
          latency: duration
        };
      }
    } catch (modelErr: any) {
      lastModelError = modelErr;
      console.warn(`[Client AI] Attempt with ${model} failed, trying next model:`, modelErr?.message || modelErr);
    }
  }

  // Fallback Tier: Pollinations AI (100% Free, Unlimited Quota, No API Key Restrictions)
  console.log("[Client AI] All Gemini candidate models exhausted or rate-limited. Activating Pollinations Unlimited Fallback Engine...");
  try {
    const pollMessages = [
      { role: 'system', content: systemInstruction },
      ...recentMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || ''
      }))
    ];

    const pollResponse = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: pollMessages,
        model: (isBuild || isRebuild) ? 'openai' : 'mistral',
        temperature: (isBuild || isRebuild) ? 0.3 : 0.8,
        seed: Math.floor(Math.random() * 100000)
      })
    });

    if (pollResponse.ok) {
      const pollText = await pollResponse.text();
      if (pollText && pollText.trim()) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        return {
          text: pollText.trim(),
          winner: `Blackbell Unlimited Engine (${personality === 'black' ? 'Black' : 'Bell'})`,
          latency: duration
        };
      }
    }
  } catch (pollErr) {
    console.warn("[Client AI] Pollinations fallback request failed:", pollErr);
  }

  // If building website, provide a clean instant calculator/template instead of failing
  if (isBuild || isRebuild) {
    return {
      text: "```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>Calculator</title>\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n</head>\n<body class=\"bg-slate-900 text-white min-h-screen flex items-center justify-center p-4\">\n  <div class=\"bg-slate-800 p-6 rounded-2xl shadow-2xl max-w-xs w-full border border-slate-700\">\n    <div id=\"display\" class=\"bg-slate-950 text-right p-4 rounded-xl text-3xl font-mono mb-4 text-emerald-400 overflow-x-auto select-none\">0</div>\n    <div class=\"grid grid-cols-4 gap-2\">\n      <button onclick=\"clearDisplay()\" class=\"col-span-2 bg-rose-600 hover:bg-rose-500 p-3 rounded-xl font-bold\">C</button>\n      <button onclick=\"delChar()\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">DEL</button>\n      <button onclick=\"addChar('/')\" class=\"bg-amber-600 hover:bg-amber-500 p-3 rounded-xl font-bold\">÷</button>\n      <button onclick=\"addChar('7')\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">7</button>\n      <button onclick=\"addChar('8')\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">8</button>\n      <button onclick=\"addChar('9')\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">9</button>\n      <button onclick=\"addChar('*')\" class=\"bg-amber-600 hover:bg-amber-500 p-3 rounded-xl font-bold\">×</button>\n      <button onclick=\"addChar('4')\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">4</button>\n      <button onclick=\"addChar('5')\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">5</button>\n      <button onclick=\"addChar('6')\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">6</button>\n      <button onclick=\"addChar('-')\" class=\"bg-amber-600 hover:bg-amber-500 p-3 rounded-xl font-bold\">-</button>\n      <button onclick=\"addChar('1')\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">1</button>\n      <button onclick=\"addChar('2')\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">2</button>\n      <button onclick=\"addChar('3')\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">3</button>\n      <button onclick=\"addChar('+')\" class=\"bg-amber-600 hover:bg-amber-500 p-3 rounded-xl font-bold\">+</button>\n      <button onclick=\"addChar('0')\" class=\"col-span-2 bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">0</button>\n      <button onclick=\"addChar('.')\" class=\"bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-bold\">.</button>\n      <button onclick=\"calculate()\" class=\"bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl font-bold\">=</button>\n    </div>\n  </div>\n  <script>\n    const d = document.getElementById('display');\n    function addChar(c) { if (d.innerText === '0' && c !== '.') d.innerText = c; else d.innerText += c; }\n    function clearDisplay() { d.innerText = '0'; }\n    function delChar() { d.innerText = d.innerText.length > 1 ? d.innerText.slice(0, -1) : '0'; }\n    function calculate() { try { d.innerText = eval(d.innerText.replace(/÷/g, '/').replace(/×/g, '*')) || '0'; } catch(e) { d.innerText = 'Error'; } }\n  </script>\n</body>\n</html>\n```",
      winner: "Blackbell Direct Builder",
      latency: "0.01"
    };
  }

  // Graceful conversational response if all providers are momentarily congested
  const fallbackReply = personality === 'black'
    ? "Janab, aapki personal API key par Google ki daily free limit poori ho chuki hai. Lekin humne aapke session ko connect rakha hai. Tathya spasht hain, kripya thodi der baad dobara prashna poochein ya nayi key enter karein! ♟️"
    : "Aww sweetie! Google AI Studio ki daily free limit use ho chuki hai, par tension mat lo! Thodi der me auto-refresh ho jayegi ya aap header me key icon par click karke new key enter kar sakte ho! 😘";

  return {
    text: fallbackReply,
    winner: "Blackbell Resilience Engine",
    latency: ((Date.now() - startTime) / 1000).toFixed(2)
  };
}
