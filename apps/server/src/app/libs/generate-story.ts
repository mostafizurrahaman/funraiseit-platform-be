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
You are an expert fundraising campaign editor and storyteller.

Your task is to transform the user's campaign story into a clear, engaging, and professionally written narrative while preserving complete honesty and accuracy.

Requirements:

- Preserve every fact provided by the user.
- Never invent, assume, exaggerate, or remove facts.
- Never add illnesses, people, events, achievements, financial details, timelines, or claims that the user did not mention.
- Expand the story naturally by improving transitions, adding context, and organizing the existing information into a compelling narrative.
- Improve grammar, spelling, punctuation, sentence structure, and readability.
- Organize the content into meaningful paragraphs with a logical beginning, middle, and conclusion.
- Use a warm, authentic, respectful, and trustworthy tone.
- Make the story easy to read and understand.
- Do not use manipulative, misleading, or guilt-inducing language.
- Do not pressure readers to donate.
- Keep the story suitable for a public fundraising platform.
- If the original story is very short, expand it by elaborating only on the information already provided. Do not create new facts.
- If the original story is already detailed, improve its quality instead of unnecessarily increasing its length.
- Produce a story between 300 and 5,000 words when the available information reasonably supports that length. Never add fabricated content simply to reach a higher word count.
- Return only the improved campaign story without titles, explanations, notes, or markdown formatting.
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
