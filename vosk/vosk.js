var vosk = require("vosk")

const fs = require("fs");
const path = require("path");


const [ sample_rate, MODEL_PATH] = process.argv.slice(2);


// const MODEL_PATH = path.join(__dirname, modelType);
const SAMPLE_RATE = Number(sample_rate);



if (!fs.existsSync(MODEL_PATH)) {
    console.log("Please download the model from https://alphacephei.com/vosk/models and unpack as " + MODEL_PATH + " in the current folder.");
    process.exit();
}



vosk.setLogLevel(-1);
const model = new vosk.Model(MODEL_PATH);
const rec = new vosk.Recognizer({model: model, sampleRate: SAMPLE_RATE});



process.stdin.on("data", (data) => {
    if (rec.acceptWaveform(data)) {
        process.stdout.write(JSON.stringify({partial: false, result: rec.result()}));

    } else {
        process.stdout.write(JSON.stringify({partial: true, result: rec.partialResult()}));

    }
});





process.on("SIGINT", () => {
    rec.free();
    model.free();
    process.exit();
});

setInterval(() => {}, 1000);