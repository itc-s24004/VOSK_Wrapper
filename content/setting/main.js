window.addEventListener("load", () => {
    const openModelDir = document.getElementById("openModelDir");
    openModelDir.addEventListener("click", () => {
        ipc_client.invoke("VOSK_Wrapper", "openModelDir");
    })
})