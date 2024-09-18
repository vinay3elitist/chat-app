const TaskSuggestionModel = require("./taskSuggestion.model");
const { readingTemplates, workoutTemplates, cookTemplates, classesTemplates, meetUpTemplates, studyTemplates, writingTemplates } = require('../../utils/constants/templates');
const responseService = require("../../utils/ResponseService");
const messages = require("../../utils/messages");
const { findUser_V2 } = require('../user/user.model');
const Sentry = require("@sentry/node");
const mongoose = require('mongoose');

class TaskSuggestionController {
    constructor() {
        this.taskSuggestionModel = new TaskSuggestionModel();
    }


    getTaskSuggestions = async (req, res) => {
      try {
        const { input, userId } = req.body;

        if(!input || !mongoose.isValidObjectId(userId) || !userId) {
          return responseService.send(res, {
            status: responseService.getCode().codes.BAD_REQUEST,
            message: messages.MISSING_REQUIRED_FIELDS,
            data: false,
          });
        }

        const user = await findUser_V2({ _id: userId });

        const useModel = req.app.get('model');
        const keywordEmbeddings = req.app.get('keywordEmbeddings');

        if(!useModel || !keywordEmbeddings) {
          return responseService.send(res, {
            status: responseService.getCode().codes.INTERNAL_SERVER_ERROR,
            message: messages.MODEL_NOT_LOADED,
            data: false,
          });
        }

        // split the input to get tasks
        const tasks = await this.taskSuggestionModel.splitTasks(input);

        const finalTasks = tasks.map(item => item.task);

        // Embed all tasks at once
        const embeddings = await useModel.embed(finalTasks);
        const taskEmbeddings = embeddings.arraySync();

        // Predict categories for each task
        const categoryPredictions = await Promise.allSettled(
          taskEmbeddings.map((embedding) => this.taskSuggestionModel.predictCategory(embedding, keywordEmbeddings))
        );
        
        // separate out unique categories
        const taskMap = new Map();
        categoryPredictions.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const category = result.value;
            if (!taskMap.has(category)) taskMap.set(category, []);
            taskMap.get(category).push(tasks[index]);
          } else {
            console.error(`Error predicting category for task at index ${index}:`, result.reason);
          }
        });

        const suggestions = await this.taskSuggestionModel.generateTaskSuggestion(taskMap, user[0].timeZone);
        // const suggestions2 = await this.taskSuggestionModel.generateTaskSuggestion2(taskMap, useModel, user[0].timeZone);

        return responseService.send(res, {
          status: responseService.getCode().codes.OK,
          message: messages.SUCCESS,
          data: suggestions,
        });
      } catch (error) {
        console.error("Error in task suggestions:", error?.message);
        Sentry.captureException(error);
        return responseService.send(res, {
          status: responseService.getCode().codes.INTERNAL_SERVER_ERROR,
          message: messages.SERVICE_UNAVAILABLE,
          data: false,
        });
      }
    }
}

module.exports = TaskSuggestionController;