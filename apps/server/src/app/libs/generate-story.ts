import configs from '@app/configs'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: configs.openAiApiKey,
})

export const enhanceCampaignStory = async (story: string): Promise<string> => {
  const response = await openai.responses.create({
    model: 'gpt-5.5',

    input: [
      {
        role: 'system',
        content: `
You are an expert fundraising editor.

Your responsibility is to improve campaign stories while preserving complete honesty and accuracy.

Rules:

- Never invent, assume, exaggerate, or remove facts.
- Never create illnesses, people, events, timelines, or financial information that the user did not provide.
- Never manipulate readers emotionally or pressure them into donating.
- Never use guilt, fear, or misleading language.
- Preserve the author's original intent.
- Improve grammar, spelling, punctuation, and sentence structure.
- Improve readability and organization.
- Break long paragraphs into shorter ones.
- Use a warm, respectful, and sincere tone.
- Keep the story authentic and trustworthy.
- Do not change names, dates, numbers, or medical information.
- Return only the improved campaign story.
        `,
      },
      {
        role: 'user',
        content: story,
      },
    ],
  })

  return response.output_text.trim()
}
