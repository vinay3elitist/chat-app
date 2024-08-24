const Sentry = require("@sentry/node");
const { generateChatGPTResponse } = require("../../utils/chatgptService/titleGeneration");
const responseService = require("../../utils/ResponseService");
const messages = require("../../utils/messages");

class ChatGPTTaskController {
    /**
     * Suggest task title using ChatGPT api.
     *
     * @param {Object} req - The request object containing title of the task.
     * @param {Object} res - The response object to send back to the client.
     *
     * @returns {Object} - The response object containing title of the task.
     * @throws {Error} - If there's an error in task title generation.
     */
    suggestTaskTitle = async (req, res) => {
        try {
            const { description } = req.body;
            if(!description) {
                return responseService.send(res, {
                    status: responseService.getCode().codes.BAD_REQUEST,
                    message: messages.DESCRIPTION_REQUIRED,
                    data: false,
                });
            }
            console.log("description: ", description);
            // const taskTitlePrompt = `Please provide a single, concise task title based on the following description: "${title}"`;
            // const taskTitlePrompt = `Suggest task titles as a comma-separated list based on the following description: "${title}". Provide only the titles without any extra text.`;

            const taskTitleGenPrompt = `You will receive a description of tasks from the user. Based on this description, you will generate one or more task titles. For each task, follow these rules:
                If the user's description includes a specific duration, scheduled date, and time for the task, include those in the response.
                If the duration is not provided, use a default duration of 1 hour (1 HR).
                If the date and time is not provided, use null.
                Titles should be concise, human-friendly, and reflect the nature of the task.
                The response should follow the exact format below, with each task's details on a new line:
                [Your Title Here], [Your task duration Here], [Your task scheduledDate Here], [Your task time Here]
                The time should be in "HH:MM:SS" (24-hour format) format, and the scheduledDate should be in the format "YYYY-MM-DD"`;

            console.log("\nprompt: ", taskTitleGenPrompt)
            
            // suggest the task title
            const suggestion = await generateChatGPTResponse(taskTitleGenPrompt, description);
            // console.log("suggestion", suggestion)
            // const suggestion = "Prepare presentation for meeting, 1 HR, 2023-10-24, 14:00:00  \nSchedule call with client, 1 HR, 2023-10-27, null  \nFinish project report, 1 HR, 2023-10-29, null  ";
            
            return responseService.send(res, {
                status: responseService.getCode().codes.OK,
                message: messages.SUCCESS,
                data: suggestion,
            });
        } catch (error) {
            console.error("Error suggest task title:", error?.message);
            Sentry.captureException(error);
            return responseService.send(res, {
                status: responseService.getCode().codes.INTERNAL_SERVER_ERROR,
                message: messages.SERVER_ERROR_MESSAGE,
                data: error?.message,
            });
        }
    }
}

module.exports = ChatGPTTaskController;



const OpenAI = require("openai");

module.exports = {
    generateChatGPTResponse: async (prompt, description) => {
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
                            role: "system",
                            content: prompt,
                        },
                        {
                            role: "user",
                            content: description,
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



https://chatgpt.com/share/9c62c7c8-586f-426d-8677-7493d6e362b3

https://chatgpt.com/share/c52bbb56-5ba8-4ffc-a591-7cf3addb75d8
