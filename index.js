const OpenAI = require("openai");

module.exports = {
    getChatGPTResponse: async (message) => {
        return new Promise(async (resolve, reject) => {
            try {
                const openai = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY,
                });
                // give response for the given content(message)
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    temperature: 0.1,
                    max_tokens: 100,
                    messages: [
                        {
                            role: "user",
                            content: message,
                        },
                    ],
                })
                console.log("\nresponse : ", response)
                console.log("\nresponse choices: ", response.choices[0])
                console.log("\nresponse message: ", response.choices[0].message)
                resolve(response.choices[0].message.content);
            } catch (error) {
                console.log("Error in chatgpt response: ", error?.message);
                reject(error);
            }
        })
    }
}