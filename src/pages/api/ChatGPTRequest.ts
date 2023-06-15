import openai from "~/utils/openai";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const lat = String(req.query.lat!);
  const lng = String(req.query.lng!);
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `What is the closest incorporated city to these coordinates: ${lat} ${lng}? Can you give me a list of 10 popular things to do at closest incorporated city to that city?`,
    temperature: 0,
    max_tokens: 300,
  });
  const responseText = response.data.choices[0]!.text;
  res.status(200).json(responseText);
}
