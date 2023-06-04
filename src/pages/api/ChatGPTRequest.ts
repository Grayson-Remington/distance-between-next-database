import openai from "~/utils/openai";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `Can you give me a list of popular things to do at closest incorporated city to these coordinates: ${req.query.lat!.toString()} ${req.query.lng!.toString()}?`,
    temperature: 0,
    max_tokens: 300,
  });
  const responseText = response.data.choices[0]!.text;
  res.status(200).json(responseText);
}
