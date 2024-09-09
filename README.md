tenserflow model:
const express = require('express');
const tf = require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');

// Predefined categories and their templates
const categories = {
  'Workout': ['run', 'exercise', 'gym', 'workout', 'yoga', 'walk'],
  'Reading': ['read', 'book', 'study', 'research'],
  'Meeting': ['meeting', 'team', 'discuss', 'call', 'conference', 'webinar'],
  'Cooking': ['cook', 'meal', 'recipe', 'bake', 'kitchen', 'lunch', 'dinner']
};

// Predefined task templates for each category
const taskTemplates = {
  'Workout': ['Go for a {activity}', 'Complete a {activity} session'],
  'Reading': ['Read a {topic} book', 'Study about {topic}'],
  'Meeting': ['Attend a {topic} meeting', 'Schedule a {topic} discussion'],
  'Cooking': ['Cook a {topic} meal', 'Prepare a {topic} dish']
};

// Load Universal Sentence Encoder model
let useModel;
const loadModel = async () => {
  console.log('Loading Universal Sentence Encoder model...');
  useModel = await use.load();
  console.log('Universal Sentence Encoder model loaded successfully.');
};

// Function to predict category for each task
const predictCategory = async (model, inputText) => {
  console.log(`Predicting category for task: "${inputText}"`);
  
  const embeddings = await model.embed([inputText]);
  const inputEmbedding = embeddings.arraySync()[0];

  const cosineSimilarity = (a, b) => {
    const dotProduct = a.reduce((sum, aVal, i) => sum + aVal * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, aVal) => sum + aVal * aVal, 0));
    const normB = Math.sqrt(b.reduce((sum, bVal) => sum + bVal * bVal, 0));
    return dotProduct / (normA * normB);
  };

  let bestCategory = 'Unknown';
  let highestSimilarity = -1;

  for (const category in categories) {
    for (const keyword of categories[category]) {
      const keywordEmbedding = await model.embed([keyword]);
      const keywordEmbeddingArray = keywordEmbedding.arraySync()[0];
      const similarity = cosineSimilarity(inputEmbedding, keywordEmbeddingArray);

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestCategory = category;
      }
    }
  }

  console.log(`Predicted category: "${bestCategory}" for task: "${inputText}"`);
  return bestCategory;
};

// Function to generate tasks based on predicted categories
const generateTasks = (category) => {
  console.log(`Generating tasks for category: "${category}"`);
  
  const templates = taskTemplates[category];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  // Dummy topic for task generation
  const topics = {
    'Workout': 'run',
    'Reading': 'modern technology',
    'Meeting': 'team project',
    'Cooking': 'Italian cuisine'
  };

  const generatedTask = randomTemplate.replace('{activity}', topics[category] || 'activity').replace('{topic}', topics[category] || 'topic');
  
  console.log(`Generated task: "${generatedTask}" for category: "${category}"`);
  return generatedTask;
};

// Create the API
const app = express();
app.use(express.json());  // Middleware to parse JSON bodies

// API route to predict categories and generate tasks
app.post('/predict-tasks', async (req, res) => {
  try {
    const { input } = req.body;
    console.log(`Received input: "${input}"`);

    if (!input) {
      console.log('No input provided');
      return res.status(400).json({ message: 'Input text is required.' });
    }

    // Step 1: Split input into tasks
    const tasks = input.split(/[.,;!]|and|but/).map(task => task.trim());
    console.log(`Split input into tasks: ${tasks}`);

    // Step 2: Predict categories for each task and generate tasks
    const taskCategories = [];
    for (const task of tasks) {
      const predictedCategory = await predictCategory(useModel, task);
      const taskSuggestion = generateTasks(predictedCategory);
      taskCategories.push({ task, category: predictedCategory, suggestion: taskSuggestion });
    }

    console.log('Final task categories and suggestions:', taskCategories);

    res.status(200).json({
      message: 'Success',
      data: taskCategories
    });
  } catch (error) {
    console.error('Error in /predict-tasks:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Initialize the server and load the model
const PORT = 5000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await loadModel();  // Load USE model before starting the server
});



task suggestion:
const TaskSuggestionModel = require("./taskSuggestion.model");
const { readingTemplates, workoutTemplates, cookTemplates, classesTemplates, meetUpTemplates, studyTemplates, writingTemplates } = require('../../utils/constants/templates');
const responseService = require("../../utils/ResponseService");
const messages = require("../../utils/messages");

class TaskSuggestionController {
    constructor() {
        this.taskSuggestionModel = new TaskSuggestionModel();
    }

    topics = {
        'Reading': [
          'The Rise of Big Data',
          'Modern Web Technologies',
          'The Evolution of Robotics',
          'Advanced Statistical Methods',
          'Quantum Mechanics'
        ],
        'Workout': [
          'cardio',
          'strength training',
          'yoga',
          'pilates',
          'high-intensity interval training (HIIT)'
        ],
        'Cook': [
          'Italian cuisine',
          'vegetarian dishes',
          'desserts',
          'Asian cuisine',
          'Mexican cuisine'
        ],
        'Classes': [
          'machine learning',
          'web development',
          'creative writing',
          'digital marketing',
          'graphic design'
        ],
        'Meet up': [
          'team project',
          'networking',
          'workshop',
          'brainstorming session',
          'seminar'
        ],
        'Study': [
          'calculus',
          'philosophy',
          'historical events',
          'literature',
          'psychology'
        ],
        'Writing': [
          'technology trends',
          'personal finance',
          'travel experiences',
          'health and wellness',
          'current events'
        ]
    };
    
    taskTitles = [
        {
          category: 'Reading',
          templates: readingTemplates,
        },
        {
          category: 'Workout',
          templates: workoutTemplates,
        },
        {
          category: 'Cook',
          templates: cookTemplates,
        },
        {
          category: 'Classes',
          templates: classesTemplates,
        },
        {
          category: 'Meet up',
          templates: meetUpTemplates,
        },
        {
          category: 'Study',
          templates: studyTemplates,
        },
        {
          category: 'Writing',
          templates: writingTemplates,
        }
    ];

    categoryKeywords = {
        'Reading': ['read', 'book', 'literature'],
        'Workout': ['exercise', 'fitness', 'training', 'running', 'run'],
        'Cook': ['cooking', 'kitchen', 'recipe', 'cook'],
        'Classes': ['course', 'education', 'lesson', 'class', 'classes'],
        'Meet up': ['meeting', 'gathering', 'networking', 'session', 'meetup'],
        'Study': ['learning', 'research', 'school', 'studying'],
        'Writing': ['write', 'composition', 'authoring'],
    };

    stopWords = new Set(['and', 'or', 'but', 'then', 'the', 'a', 'an', '.', 'for']);

    preprocessInput = (input) => {
      return input.split(/\s+/).filter(word => !this.stopWords.has(word.toLowerCase())).join(' ');
    }
    // Function to match input with categories using Levenshtein distance
    matchCategory = async (input) => {
        const preprocessedInput = this.preprocessInput(input);  // Preprocess the input
        const inputWords = preprocessedInput.toLowerCase().split(/\s+/);  // Split the input into words
        const foundCategories = new Set();

        console.log("preprocessedInput: ", preprocessedInput)
        console.log("inputWords: ", inputWords)
        // Create an array of objects with both original and lowercase category names
        const categories = this.taskTitles.map(t => ({
          original: t.category,
          lower: t.category.toLowerCase()
        }));
        console.log("\ncategories", categories);
      
        // Find categories for each word in the preprocessed input
        for (const word of inputWords) {
          const category = await this.taskSuggestionModel.keywordMatch(word, this.categoryKeywords);
          if (category) {
            console.log(`Matched category: ${category}`);
              foundCategories.add(category);
          } else {
            console.log("in else: ", word);
            const closestCategory = await this.taskSuggestionModel.findClosestCategory(input.toLowerCase(), categories)
            console.log("closest category: ", closestCategory)
            foundCategories.add(closestCategory);
          }
        }
        
        if (foundCategories.size > 0) {
          return Array.from(foundCategories);
        }
    };
    
    
    // Function to generate task suggestions (returning 5 suggestions)
    // generateTask = (category, topic) => {
    //     const categoryTemplates = this.taskTitles.find(t => t.category === category);
    //     console.log("\ncategoryTemplates", categoryTemplates);

    //     if (categoryTemplates) {
    //         const suggestions = [];

    //         // Ensure we don't exceed the available templates
    //         const numberOfSuggestions = Math.min(5, categoryTemplates.templates.length);

    //         // Shuffle the templates array to get random elements
    //         const shuffledTemplates = [...categoryTemplates.templates].sort(() => 0.5 - Math.random());

    //         // Select up to 5 random templates and replace the topic
    //         for (let i = 0; i < numberOfSuggestions; i++) {
    //             const suggestion = shuffledTemplates[i].replace('{topic}', topic);
    //             suggestions.push(suggestion);
    //         }

    //         return suggestions;
    //     }
    //     return [`No task template found for ${category}`];
    // };


    generateTasksForCategories = (categories) => {
      const totalSuggestions = 4;
      const suggestions = [];

      // Distribute suggestions equally among categories
      const suggestionsPerCategory = Math.floor(totalSuggestions / categories.length);

      for (const category of categories) {
        const categoryTemplates = this.taskTitles.find(t => t.category === category);
        if (categoryTemplates) {
            const categorySuggestions = [];
            const categoryTopics = this.topics[category];
            const randomTopic = categoryTopics[Math.floor(Math.random() * categoryTopics.length)];
            console.log("randomTopic: ", randomTopic);

            const shuffledTemplates = [...categoryTemplates.templates].sort(() => 0.5 - Math.random());
            
            for (let i = 0; i < Math.min(suggestionsPerCategory, shuffledTemplates.length); i++) {
                const suggestion = shuffledTemplates[i].replace('{topic}', randomTopic);
                categorySuggestions.push(suggestion);
            }
            suggestions.push(...categorySuggestions);
        }
      }

      // if suggestion are less than total required suggestions
      while (suggestions.length < totalSuggestions) {
        console.log("in while loop")
        const remainingCategory = categories[Math.floor(Math.random() * categories.length)];
        const remainingTemplates = this.taskTitles.find(t => t.category === remainingCategory).templates;
        const remainingTopic = this.topics[remainingCategory][Math.floor(Math.random() * this.topics[remainingCategory].length)];
        const extraSuggestion = remainingTemplates[Math.floor(Math.random() * remainingTemplates.length)].replace('{topic}', remainingTopic);
        suggestions.push(extraSuggestion);
      }

      return suggestions;
    }

    suggestTasks = async (req, res) => {
        try {
            const { input } = req.body;
            if (!input) {
                return responseService.send(res, {
                    status: responseService.getCode().codes.BAD_REQUEST,
                    message: messages.MISSING_REQUIRED_FIELDS,
                    data: false,
                });
            }
            console.log("input: ", input);

            const matchedCategories = await this.matchCategory(input); // Match input with a category
            console.log("\nmatchedCategory: ", matchedCategories);

            if (matchedCategories.length === 0) {
              return responseService.send(res, {
                  status: responseService.getCode().codes.OK,
                  message: messages.NOT_FOUND,
                  data: []
              });
            }

            const suggestions = this.generateTasksForCategories(matchedCategories);
            console.log("suggestions: ", suggestions);

            return responseService.send(res, {
                status: responseService.getCode().codes.OK,
                message: messages.SUCCESS,
                data: suggestions,
            });
        } catch (error) {
            console.error('Error in taskSuggest:', error?.message);
      
            return responseService.send(res, {
                status: responseService.getCode().codes.INTERNAL_SERVER_ERROR,
                message: messages.INTERNAL_SERVER_ERROR,
                data: false,
            });
        }
    }
}

module.exports = TaskSuggestionController;


task model:
class TaskSuggestionModel {
    // Levenshtein distance algorithm for fuzzy matching
    levenshteinDistance = async (a, b) => {
        const matrix = Array.from({ length: a.length + 1 }, () =>
            Array(b.length + 1).fill(0)
        );
        for (let i = 0; i <= a.length; i++) {
            matrix[i][0] = i;
        }
    
        for (let j = 0; j <= b.length; j++) {
            matrix[0][j] = j;
        }
    
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        console.log("distance: ", matrix[a.length][b.length]);
        return await matrix[a.length][b.length];
    };

    // Function to find the closest match using Levenshtein distance
    findClosestCategory = async (input, categories) => {
        let closestMatch = null;
        let minDistance = Infinity;
        console.log("minDistance: ", minDistance);

        for (const categoryObj of categories) {
            console.log("\ncategory: ", categoryObj.lower);
            const distance = await this.levenshteinDistance(input, categoryObj.lower);
            if (distance < minDistance) {
                minDistance = distance;
                closestMatch = categoryObj.original; // Store the original category name
                console.log("inside if", distance, categoryObj.original, closestMatch);
            }
        }
        console.log("closest match: ", closestMatch);
        return closestMatch;
    };

    keywordMatch = async (input, categoryKeywords) => {
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.includes(input)) {
                return category;
            }
        }
        return null;
    }

}

module.exports = TaskSuggestionModel;
