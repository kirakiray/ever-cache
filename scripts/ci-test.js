import shell from "shelljs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const home = path.normalize(__dirname + "/../");

// 启动 http-server
const serverProcess = shell.exec(`npx http-server "${home}" -p 5566 --cors`, {
  async: true,
});

// 等待服务器启动
setTimeout(() => {
  // 运行测试
  shell.exec(`npm run test`, function (code, stdout, stderr) {
    console.log("Exit code:", code);
    console.log("Program output:", stdout);
    console.log("Program stderr:", stderr);
    
    // 关闭 http-server
    serverProcess.kill();
    
    if (code !== 0) {
      throw "run error";
    }
  });
}, 1000);