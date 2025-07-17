const child = require("child_process")
const path = require("path");
const EventEmitter = require("events");


/**
 * 
 * @param {import("../../system/ModuleRepository/main").ModuleReposiory} REP 
 */
exports.run = async (REP) => {
    exports.run = null;

    const NodeManager = REP.get("NodeManager");
    const local_node = await NodeManager.get("18.16.1");
    if (!local_node) return;
    await local_node.npm_install(__dirname);

    const vosk_root = path.join(__dirname, "vosk");
    const voskPath = path.join(vosk_root, "vosk.js");


    class VOSK_Wrapper {
        #process

        #eventPipe = new EventEmitter();

        /**
         * BrowserWindow
         * @param {number} sampleRate 
         */
        constructor(sampleRate) {
            this.#process = child.spawn(local_node.node, [voskPath, String(sampleRate)], {cwd: vosk_root, stdio: ["pipe", "pipe", "inherit"]});
            this.#process.stdout.on("data", (data) => {
                try {
                    /**@type { import("./vosk/result").VOSK_Wrapper_Result } */
                    const json = JSON.parse(data);
                    this.#eventPipe.emit(json.partial ? "partialResult" : "result", json.result);

                } catch {}
            });
        }



        /**
         * 
         * @param {Buffer} buff 
         */
        inputAudio(buff) {
            this.#process.stdin.write(buff);
        }

        

        /**
         * @typedef VOSK_CallbackTypes
         * @property {(result: import("vosk").PartialResults) => void} partialResult
         * @property {(result: import("vosk").RecognitionResults | (import("vosk").SpeakerResults & import("vosk").RecognitionResults)) => void} result
         */



        /**
         * @template {keyof VOSK_CallbackTypes} VOSK_Event
         * @param {VOSK_Event} eventName 
         * @param {VOSK_CallbackTypes[VOSK_Event]} callback 
         */
        on(eventName, callback) {
            if (typeof eventName != "string") return;
            if (typeof callback != "function") return;
            this.#eventPipe.on(eventName, callback);
            return callback;
        }



        /**
         * 
         * @param {keyof VOSK_CallbackTypes} eventName 
         * @param {() => void} callback 
         */
        off(eventName, callback) {
            if (typeof eventName != "string") return;
            if (typeof callback != "function") return;
            this.#eventPipe.off(eventName, callback);
        }

        stop() {
            this.#process.kill();
        }
    }

    REP.register("VOSK_Wrapper", VOSK_Wrapper);

    exports.VOSK_Wrapper = VOSK_Wrapper;
}