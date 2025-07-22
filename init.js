/**
 * 
 * @param {import("../../system/ModuleRepository/main").ModuleReposiory} REP 
 */
exports.run = async (REP) => {
    const NodeManager = REP.get("NodeManager");
    
    const local_node = await NodeManager.get("18.16.1");
    if (!local_node) throw new Error("LocalNodeを使用できません");
    console.log(__dirname)
    await local_node.npm(__dirname, ["install"], (ms) => {console.log(ms)});
    // await local_node.npm_install(__dirname);
}