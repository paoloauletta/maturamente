import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_BASE_URL, // Optional. Site URL for rankings on openrouter.ai.
    "X-Title": process.env.NEXT_PUBLIC_SITE_NAME, // Optional. Site title for rankings on openrouter.ai.
  },
});

export default async function AiTutorPage() {
  const completion = await openai.chat.completions.create({
    model: "deepseek/deepseek-r1-0528:free",
    messages: [
      {
        role: "user",
        content: "What is the meaning of life?",
      },
    ],
  });

  return (
    <div>
      <p>{completion.choices[0].message.content}</p>
    </div>
  );
}
