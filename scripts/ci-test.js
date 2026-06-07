import { spawn } from "child_process";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const home = path.normalize(__dirname + "/../");

// 启动 http-server
const serverProcess = spawn("npx", ["http-server", home, "-p", "5566", "--cors"], {
  stdio: "inherit",
  shell: true,
});

// 等待服务器启动
setTimeout(() => {
  // 运行测试
  const testProcess = spawn("npm", ["run", "test"], {
    stdio: "inherit",
    shell: true,
  });

  testProcess.on("close", (code) => {
    console.log("Exit code:", code);
    
    // 关闭 http-server
    serverProcess.kill("SIGTERM");
    
    if (code !== 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}, 1000);