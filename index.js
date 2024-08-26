const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const port = 3000;
const io = new Server(server);

io.on("connection", (socket) => {
  socket.on("chat-message", (message) => {
    io.emit("message", message);
  });
});

app.use(express.static(path.resolve("./public")));

app.get("/", (req, res) => {
  return res.sendFile("/index.html");
});
server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);









const Sentry = require("@sentry/node");
const { generateChatGPTResponse } = require("../../utils/chatgptService/titleGeneration");
const responseService = require("../../utils/ResponseService");
const messages = require("../../utils/messages");
const chrono = require("chrono-node");
const moment = require("moment-timezone");

class ChatGPTTaskController {
    
    timeAfterThirtyMinFromNow = (timeZone) => {
        const now = moment().tz(timeZone).add(30, 'minutes').seconds(0).milliseconds(0);
        return now.format('HH:mm:ss');
    }

    parseTimeExpression = (timeExpression, timeZone) => {
        const now = moment().tz(timeZone);
        switch (timeExpression.toLowerCase()) {
            case 'morning':
                return now.hours(9).minutes(0).seconds(0).format('HH:mm:ss');
            case 'afternoon':
                return now.hours(14).minutes(0).seconds(0).format('HH:mm:ss');
            case 'evening':
                return now.hours(18).minutes(0).seconds(0).format('HH:mm:ss');
            case 'night':
                return now.hours(21).minutes(0).seconds(0).format('HH:mm:ss');
            default:
                return null;
        }
    };

    suggestTaskTitle = async (req, res) => {
        try {
            const { description, timeZone } = req.body;
            if(!description || !timeZone) {
                return responseService.send(res, {
                    status: responseService.getCode().codes.BAD_REQUEST,
                    message: messages.DESCRIPTION_REQUIRED,
                    data: false,
                });
            }
            console.log("description: ", description);

            const taskText = await generateChatGPTResponse(description);
            console.log("\nsuggestion", taskText, "\n")

            const tasks = taskText.split('\n').map((task) => {
                const [title, duration, scheduledDate, time] = task.split(', ').map(item => item.trim());

                console.log(title , "scheduled date and time: ", scheduledDate, time)

                let timeFinal;
                if (time !== "null") {
                    const commonTimeExpression = this.parseTimeExpression(time, timeZone);
                    if (commonTimeExpression) {
                        timeFinal = commonTimeExpression;
                    } else {
                        const parsedTime = chrono.parseDate(time);
                        console.log("parsedTime: ", parsedTime);
                        
                        if (parsedTime) {
                            timeFinal = moment(parsedTime).tz(timeZone).format('HH:mm:ss');
                        } else {
                            timeFinal = this.timeAfterThirtyMinFromNow(timeZone);
                        }
                    }
                } else {
                    timeFinal = this.timeAfterThirtyMinFromNow(timeZone);
                }
                console.log("timeFinal: ", timeFinal);

                let scheduledDateFinal;
                if (scheduledDate !== "null") {
                    const parsedDate = chrono.parseDate(scheduledDate);
                    console.log("parseDate: ", parsedDate)
                    if (parsedDate) {
                        scheduledDateFinal = moment(parsedDate).tz(timeZone).format('YYYY-MM-DD');

                        // const combinedDateTime = moment(`${scheduledDateFinal}T${timeFinal}`).tz(timeZone);
                        const combinedDateTime = moment.tz(`${scheduledDateFinal}T${timeFinal}`, timeZone);

                        const now = moment().tz(timeZone);
                        console.log("now: ", now)
                        if (combinedDateTime.isBefore(now)) {
                            combinedDateTime.add(1, 'day');
                            scheduledDateFinal = combinedDateTime.format('YYYY-MM-DD');
                            timeFinal = combinedDateTime.format('HH:mm:ss');
                            console.log("combined date: ", combinedDateTime, scheduledDateFinal, timeFinal);
                        }
                    } else {
                        scheduledDateFinal = moment().tz(timeZone).format('YYYY-MM-DD');
                    }
                } else {
                    scheduledDateFinal = moment().tz(timeZone).format('YYYY-MM-DD');
                }
                console.log("scheduledDateFinal: ", scheduledDateFinal);

                // const combinedDateTime = moment(`${scheduledDateFinal}T${timeFinal}`).tz(timeZone);
                const combinedDateTime = moment.tz(`${scheduledDateFinal}T${timeFinal}`, timeZone);

                const now = moment().tz(timeZone);
                if (combinedDateTime.isBefore(now)) {
                    console.log("in updating date condition");

                    combinedDateTime.add(1, 'day');
                    scheduledDateFinal = combinedDateTime.format('YYYY-MM-DD');
                    timeFinal = combinedDateTime.format('HH:mm:ss');
                }
                console.log("Final scheduledDateFinal and timeFinal: ", scheduledDateFinal, timeFinal, "\n--------------");
                
                return {
                    title: title,
                    duration: duration || '1 HR',
                    scheduledDate: scheduledDateFinal,
                    time: timeFinal
                };
            });

            console.log("tasks: ", tasks);

            return responseService.send(res, {
                status: responseService.getCode().codes.OK,
                message: messages.SUCCESS,
                data: tasks,
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
