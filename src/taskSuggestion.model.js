const momentTz = require('moment-timezone');
const { DURATION_ENUMS, verbsForRegex } = require("../../utils/constants");
const verbsTbl = require('../../models/verbs.model');
const { taskTemplates, topics } = require('../../utils/constants/taskSuggestion');

class TaskSuggestionModel {
    // verb regex to match verbs
    verbRegex = new RegExp(`\\b(${verbsForRegex.join("|")})\\b`, 'gi');

    // split tasks by conjunction and verb
    splitTasks = async (inputText) => {
        try {
            let tasks = await this.splitTasksByConjunctions(inputText);
    
            // Use Promise.allSettled to handle async inside map
            const taskResults = await Promise.allSettled(tasks.flatMap(async task => {
                const verbMatches = await task.match(this.verbRegex) || [];
    
                // If more than or equal to 2 verbs are found, split tasks by verbs
                if (verbMatches.length >= 2) {
                    return this.splitTasksByVerbs(task).map(splitTask => {
                        const matchedVerb = splitTask.match(this.verbRegex)?.[0] || ''; // Take the first matched verb
                        return {
                            task: splitTask,
                            verb: matchedVerb
                        };
                    });
                }
    
                // Otherwise, return the task with its single matched verb
                const matchedVerb = verbMatches[0] || ''; // Take the first matched verb, if any
                return {
                    task,
                    verb: matchedVerb
                };
            }));
    
            // Filter the fulfilled results and extract the value
            tasks = taskResults.filter(result => result.status === 'fulfilled').flatMap(result => result.value);
    
            return tasks;
        } catch (error) {
            console.error('Error during task splitting:', error.message);
            return [];
        }
    };
    
    

    // split tasks by conjunction
    splitTasksByConjunctions = (inputText) => {
        // Split based on common conjunctions, punctuation, or task keywords
        const tasks = inputText.split(/[.,;!]|and|but|then|after|before|while|when|as well as|also|next|yet|along with|followed by/gi).map(task => task.trim());

        return tasks;
    };

    // Verb-based splitting
    splitTasksByVerbs = (inputText) => {
        // Split the input by the verb matches, keeping the verbs as part of the tasks
        let tasks = [];
        let match;
        let lastIndex = 0;

        // Use regex to find verbs and split the text accordingly
        while ((match = this.verbRegex.exec(inputText)) !== null) {
            const startIndex = match.index;  // Index of the verb

            // Add the previous task (from last matched verb to the current one)
            if (lastIndex !== 0 || startIndex !== 0) {
                const taskBeforeVerb = inputText.slice(lastIndex, startIndex).trim();
                if (taskBeforeVerb) {
                    tasks.push(taskBeforeVerb);  // Add the task before the current verb
                }
            }

            lastIndex = startIndex;  // Update lastIndex to the start of this verb
        }

        // Add the final task (after the last verb)
        if (lastIndex < inputText.length) {
            const taskWithVerb = inputText.slice(lastIndex).trim();
            tasks.push(taskWithVerb);  // Add the last part of the sentence
        }

        return tasks;
    };

    // predict category based on input embedding and keyword embedding
    predictCategory = (inputEmbedding, keywordEmbeddings) => {
        let bestCategory = 'Unknown';
        let highestSimilarity = -1;

        for (const category in keywordEmbeddings) {
            const categoryEmbeddings = keywordEmbeddings[category].arraySync();

            for (const keywordEmbedding of categoryEmbeddings) {
                // calculate cosine similarity and find highest similarity category
                const similarity = this.cosineSimilarity(inputEmbedding, keywordEmbedding);
                if (similarity > highestSimilarity) {
                    highestSimilarity = similarity;
                    bestCategory = category;
                }
            }
        }

        return bestCategory;
    };

    // function to calculate cosine similarity
    cosineSimilarity = (a, b) => {
        const dotProduct = a.reduce((sum, aVal, i) => sum + aVal * b[i], 0);
        const normA = Math.sqrt(a.reduce((sum, aVal) => sum + aVal * aVal, 0));
        const normB = Math.sqrt(b.reduce((sum, bVal) => sum + bVal * bVal, 0));
        return dotProduct / (normA * normB);
    };

    // generate and distribute tasks for each category
    generateTaskSuggestion = async (taskMap, timeZone='UTC') => {
        const totalSuggestions = 4;
        const suggestions = [];
        const categories = Array.from(taskMap.keys());

        // divide suggestions across categories
        const suggestionsPerCategory = Math.floor(totalSuggestions / categories.length);
        let remainingTasks = totalSuggestions % categories.length;
        
        // Ensure each category gets at least `suggestionsPerCategory` number of tasks
        for (const category of categories) {
            const categoryTasks = taskMap.get(category);
            const verbs = categoryTasks.map(task => task.verb);
            let numSuggestions = suggestionsPerCategory + (remainingTasks > 0 ? 1 : 0);
            remainingTasks -= 1;

            // If there are fewer tasks in the category, repeat tasks or generate additional ones
            for (let i = 0; i < numSuggestions; i++) {
                // Cycle through tasks if not enough unique ones exist for the category
                const taskScheduledDateTime = momentTz().tz(timeZone).add(15, 'minutes').startOf('minute').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
                const taskSuggestion = await this.generateTasks(category, verbs);
                const taskDuration = category === 'Workout' ? '1 HR' : DURATION_ENUMS[Math.floor(Math.random() * DURATION_ENUMS.length)];
                const verb = await verbsTbl.findOne({ name: category, isDeleted: false });

                suggestions.push({
                    title: taskSuggestion,
                    scheduledDateTime: taskScheduledDateTime,
                    duration: taskDuration,
                    status: 'NEW',
                    repeat: 'ONCE',
                    verbs: verb,
                    isDeleted: false
                });

                if (suggestions.length >= totalSuggestions) break;
            }

            if (suggestions.length >= totalSuggestions) break;
        }
        return suggestions;
    };

    // generate task suggestions for a category
    generateTasks = (category, verbs) => {
        // get random template for task suggestion
        const templates = taskTemplates[category];
        const categoryTopics = topics[category] || [];
        const selectedTasks = new Set();

        const verbRegex = new RegExp(`\\b${verbs.join('|')}\\b`,'i');

        const matchingTemplates = templates.filter(template => {
            return verbRegex.test(template.toLowerCase());
        })

        const randomTemplate = matchingTemplates.length > 1 ? 
                                matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)] : 
                                templates[Math.floor(Math.random() * templates.length)];

        // get random topic for the category
        let randomTopic;
        if(categoryTopics.length > 0) {
            do {
                randomTopic = categoryTopics[Math.floor(Math.random() * categoryTopics.length)];
            } while (selectedTasks.has(`${category}:${randomTopic}`));

            selectedTasks.add(`${category}:${randomTopic}`);
        }

        // Generate duration between 15 to 60, and multiple of 5
        const duration = category === 'Workout' ? (Math.floor(Math.random() * 10) + 3) * 5 : '';
        return randomTemplate.replace('{topic}', randomTopic || 'topic')
            .replace('{duration}', duration || '15');
    };









    // generateTaskSuggestion2 = async (taskMap, useModel, timeZone='UTC') => {
    //     const totalSuggestions = 4;
    //     const suggestions = [];
    //     const categories = Array.from(taskMap.keys());

    //     // divide suggestions across categories
    //     const suggestionsPerCategory = Math.floor(totalSuggestions / categories.length);
    //     let remainingTasks = totalSuggestions % categories.length;
        
    //     // Ensure each category gets at least `suggestionsPerCategory` number of tasks
    //     for (const category of categories) {
    //         const categoryTasks = taskMap.get(category);
    //         const verbs = categoryTasks.map(task => task.verb);
    //         let numSuggestions = suggestionsPerCategory + (remainingTasks > 0 ? 1 : 0);
    //         remainingTasks -= 1;

    //         // If there are fewer tasks in the category, repeat tasks or generate additional ones
    //         for (let i = 0; i < numSuggestions; i++) {
    //             // Cycle through tasks if not enough unique ones exist for the category
    //             const taskScheduledDateTime = momentTz().tz(timeZone).add(15, 'minutes').startOf('minute').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    //             const { task } = categoryTasks[i % categoryTasks.length];

    //             const taskSuggestion = await this.generateTasks2(category, task, useModel);
    //             const taskDuration = category === 'Workout' ? '1 HR' : DURATION_ENUMS[Math.floor(Math.random() * DURATION_ENUMS.length)];
    //             const verb = await verbsTbl.findOne({ name: category, isDeleted: false });

    //             suggestions.push({
    //                 title: taskSuggestion,
    //                 scheduledDateTime: taskScheduledDateTime,
    //                 duration: taskDuration,
    //                 status: 'NEW',
    //                 repeat: 'ONCE',
    //                 verbs: verb,
    //                 isDeleted: false
    //             });

    //             if (suggestions.length >= totalSuggestions) break;
    //         }

    //         if (suggestions.length >= totalSuggestions) break;
    //     }
    //     return suggestions;
    // };


    // generateTasks2 = async (category, task, useModel) => {
    //     console.log("category: ", category);
    //     console.log("task: ", task);
    //     // get random template for task suggestion
    //     const templates = taskTemplates[category];
    //     const categoryTopics = topics[category] || [];
    //     const selectedTasks = new Set();

    //     // Embed the input task
    //     const taskEmbedding = await useModel.embed([task]);
    //     const taskEmbeddingArray = taskEmbedding.arraySync()[0];

    //     let randomTemplate = '';
    //     let highestSimilarity = -1;

    //     // Embed each template and calculate cosine similarity
    //     for (const template of templates) {
    //         const templateEmbedding = await useModel.embed([template.replace('{topic}', 'topic')]);
    //         const templateEmbeddingArray = templateEmbedding.arraySync()[0];

    //         // Calculate cosine similarity between the task and template
    //         const similarity = this.cosineSimilarity(taskEmbeddingArray, templateEmbeddingArray);
    //         if (similarity > highestSimilarity) {
    //             highestSimilarity = similarity;
    //             randomTemplate = template;
    //             console.log("random template: ", randomTemplate)
    //         }
    //     }
    //     // const verbRegex = new RegExp(`\\b${verbs.join('|')}\\b`,'i');

    //     // const matchingTemplates = templates.filter(template => {
    //     //     return verbRegex.test(template.toLowerCase());
    //     // })

    //     // const randomTemplate = matchingTemplates.length > 1 ? 
    //     //                         matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)] : 
    //     //                         templates[Math.floor(Math.random() * templates.length)];

    //     // get random topic for the category
    //     let randomTopic;
    //     if(categoryTopics.length > 0) {
    //         do {
    //             randomTopic = categoryTopics[Math.floor(Math.random() * categoryTopics.length)];
    //         } while (selectedTasks.has(`${category}:${randomTopic}`));

    //         selectedTasks.add(`${category}:${randomTopic}`);
    //     }

    //     // Generate duration between 15 to 60, and multiple of 5
    //     const duration = category === 'Workout' ? (Math.floor(Math.random() * 10) + 3) * 5 : '';
    //     return randomTemplate.replace('{topic}', randomTopic || 'topic')
    //         .replace('{duration}', duration || '15');
    // };
}

module.exports = TaskSuggestionModel;