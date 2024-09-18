const tf = require("@tensorflow/tfjs-node");
const use = require('@tensorflow-models/universal-sentence-encoder');
const { categoriesTemplate } = require('../constants');

class LoadTensorflowModel {
    constructor() {
        this.useModel = null;
        this.keywordEmbeddings = {};
        this.categoriesTemplate = categoriesTemplate;
    }

    loadModel = async () => {
        return new Promise(async (resolve, reject) => {
            try {
                await tf.setBackend('cpu');
                await tf.ready();
                
                console.log('Loading Universal Sentence Encoder model...');
                this.useModel = await use.load();

                for (const category in this.categoriesTemplate) {
                    this.keywordEmbeddings[category] = await this.useModel.embed(this.categoriesTemplate[category]);
                }
                
                resolve({
                    model: this.useModel,
                    keywordEmbeddings: this.keywordEmbeddings
                });
            } catch (error) {
                console.error('Error loading model: ', error);
                reject(error);
            }
        })
    }
}

module.exports = LoadTensorflowModel;