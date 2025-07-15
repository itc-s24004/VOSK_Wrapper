import * as vosk from "vosk"

export type VOSK_Wrapper_Result = {
    /**途中結果かどうか */
    partial: boolean
    result: vosk.RecognitionResults | (vosk.SpeakerResults & vosk.RecognitionResults);
}