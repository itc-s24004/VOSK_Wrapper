window.addEventListener("load", async () => {
    const status = document.getElementById("status");
    /**@type {HTMLButtonElement} */
    const build = document.getElementById("build");


    const s = await ipc_client.invoke("VOSK_Wrapper", "status");
    status.innerText = `ステータス: ${s == 1 ? "成功" : s == 0 ? "実行中" : "失敗/未実行"}`;

    if (s == -1) build.disabled = false;
    build.addEventListener("click", async () => {
        build.disabled = true;
        const s = await ipc_client.invoke("VOSK_Wrapper", "build");

        status.innerText = `ステータス: ${s == 1 ? "成功" : s == 0 ? "実行中" : "失敗/未実行"}`;
        if (s == -1) build.disabled = false;
    });
})