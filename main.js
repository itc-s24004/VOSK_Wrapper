const child = require("child_process");
const path = require("path");
const fs = require("fs");
const EventEmitter = require("events");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const AdmZip = require("adm-zip");



/**
 * 
 * @param {import("../../system/ModuleRepository/main").ModuleReposiory} REP 
 */
exports.run = async (REP) => {
    exports.run = null;

    const LOCAL_CONTENT_ROOT = REP.get("LOCAL_CONTENT_ROOT");
    /**アプリのローカルコンテンツ */
    const APP_ROOT = path.join(LOCAL_CONTENT_ROOT, "VOSK_Wrapper");
    if (!fs.existsSync(APP_ROOT)) fs.mkdirSync(APP_ROOT, {recursive: true});
    /**モデルの保存パス */
    const MODEL_ROOT = path.join(APP_ROOT, "models");
    if (!fs.existsSync(MODEL_ROOT)) fs.mkdirSync(MODEL_ROOT, {recursive: true});
    /**voskの実行環境パス */
    const VOSK_ROOT = path.join(APP_ROOT, "vosk");
    if (!fs.existsSync(VOSK_ROOT)) fs.mkdirSync(VOSK_ROOT, {recursive: true});

    const createWindow = REP.get("createWindow");

    const GUI_APP_Launcher = REP.get("GUI_APP_Launcher");
    await GUI_APP_Launcher.whenReady();

    const appButton = new GUI_APP_Launcher();
    appButton.icon = `rgba(255, 255, 255, 1) url(${path.join(__dirname, "icon.png")}) center / 100% no-repeat `;


    //Node.js準備▼
    appButton.name = "VOSK: Node-?";
    const NodeManager = REP.get("NodeManager");
    // const local_node = await NodeManager.get("22.17.1");
    const local_node = await NodeManager.get("18.16.1");
    if (!local_node) {
        appButton.name = "VOSK: Node-Error";
        return;
    }
    appButton.name = "VOSK: Node-OK";



    const packOrigin = path.join(__dirname, "vosk.zip");
    const VOSK = path.join(VOSK_ROOT, "vosk.js");
    const APP_V = 1;




    //設定▼
    const configPath = path.join(APP_ROOT, "config.json");
    const JsonConfig = REP.get("JsonConfig");
    const [config, useDefaultConfig, saveConfig] = JsonConfig.load( configPath,
        {
            "version": 1,
            "defaultModel": "",
            /**初期化 */
            "init": false,
            /**zip */
            "pack": false
        }
    );


    //初期化▼
    if (useDefaultConfig || !config.init || config.version != APP_V) {


        //VOSK実行環境複製▼
        fs.rmSync(VOSK_ROOT, {recursive: true});
        fs.mkdirSync(VOSK_ROOT, {recursive: true});

        appButton.name = "VOSK: 環境-?";

        if (app.isPackaged) {//ビルド後▼
            if (!fs.existsSync(packOrigin)) return appButton.name = "VOSK: 環境-Error";
            const data = fs.readFileSync(packOrigin);
            const packPath = path.join(APP_ROOT, "vosk.zip");
            fs.writeFileSync(packPath, data);

            const zip = new AdmZip(packPath);
            let buildStatus = true;
            zip.extractAllToAsync(APP_ROOT, true, true, (err) => {
                if (err) buildStatus = false;
            });
            if (!buildStatus) return appButton.name = "VOSK: 環境-Error";

        } else {//ビルド前▼
            const vosk_origin_root = path.join(__dirname, "vosk");
            fs.readdirSync(vosk_origin_root).forEach(FDName => {
                const target = path.join(vosk_origin_root, FDName);
                if (fs.statSync(target).isFile()) {
                    const data = fs.readFileSync(target);
                    const fpath = path.join(VOSK_ROOT, FDName);
                    fs.writeFileSync(fpath, data);
                }
            });

            const {code, signal} = await local_node.npm(VOSK_ROOT, ["i"]);
            if (code != 0 || signal != null) return appButton.name = "VOSK: 環境-Error";

        }


        config.init = true;
        config.version = APP_V;
        saveConfig();
        appButton.name = "VOSK: 環境-OK";
    }



    //文字起こし機能▼
    class VOSK_Wrapper {
        static get models() {
            return fs.readdirSync(MODEL_ROOT).map(FDName => path.join(MODEL_ROOT, FDName)).filter(FDPath => fs.statSync(FDPath).isDirectory());
        }

        #process

        #eventPipe = new EventEmitter();

        #exited = false;

        /**
         * BrowserWindow
         * @param {number} sampleRate 
         */
        constructor(sampleRate, modelPath = config.defaultModel) {
            this.#process = child.spawn(local_node.node, [VOSK, String(sampleRate), modelPath], {cwd: VOSK_ROOT, stdio: ["pipe", "pipe", "inherit"]});
            this.#process.once("exit", () => this.#exited = true);
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
            if (!this.#exited && !this.#process.killed) this.#process.stdin.write(buff);
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

















    appButton.name = "VOSK";
    const content = path.join(__dirname, "content", !app.isPackaged && !config.pack ? "build" : "setting", "index.html");

    /**@type {BrowserWindow} */
    let window;

    appButton.on("click", (type) => {
        if (type != "single") return;
        if (window) {
            window.focus();
        } else {
            window = createWindow();
            window.loadFile(content);
            window.on("closed", () => {
                window = null;
            });
        }
    });



    let packing = false;
    ipcMain.handle("VOSK_Wrapper", (ev, EventName, ...args) => {
        
        switch(EventName) {
            case "openModelDir":
                shell.showItemInFolder(MODEL_ROOT);
                break;
            case "getModels":
                return VOSK_Wrapper.models;
            case "setModel":
                if (!window || window.webContents != ev.sender) return;
                const [ model ] = args;
                config.defaultModel = model;
                saveConfig();
                break;

            case "build":
                if (!window || window.webContents != ev.sender) return;
                if (config.pack) return 1;
                if (packing) return 0;
                packing = true;
                const zip = new AdmZip();
                let status = true;
                console.log(VOSK_ROOT)
                zip.addLocalFolderAsync(VOSK_ROOT, (success, err) => {
                    if (!success) status = false;
                    if (err) status = false;
                }, "/");
                if (!status) return -1;
                zip.writeZip(packOrigin, (err) => {
                    if (err) status = false;
                });
                if (!status) return -1;
                config.pack = true;
                saveConfig();
                packing = false;
                return 1;
            case "status":
                if (!window || window.webContents != ev.sender) return;
                return config.pack ? 1 : packing ? 0 : -1;
        }
    });




}