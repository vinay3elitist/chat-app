const TaskSuggestionController = require("./taskSuggestion.controller");

class TaskSuggestionRoute {
    constructor(app) {
        this.app = app;
        this.taskSuggestionController = new TaskSuggestionController();
        this.initRoutes();
    }

    initRoutes() {
        // this.app.post(
        //     '/api/v1/suggestions',
        //     [],
        //     (req, res, next) => {
        //         this.taskSuggestionController.suggestTasks(req, res, next);
        //     }
        // )

        this.app.post(
            '/api/v1/task/suggestions',
            [],
            (req, res, next) => {
                this.taskSuggestionController.getTaskSuggestions(req, res, next);
            }
        )
    }
}

module.exports = TaskSuggestionRoute;