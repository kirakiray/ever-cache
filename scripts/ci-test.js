import { server } from "./static-server.js";
import shell from "shelljs";

// 运行命令行命令
shell.exec(`npm run test`, function (code, stdout, stderr) {
  console.log("Exit code:", code);
  console.log("Program output:", stdout);
  console.log("Program stderr:", stderr);
  server.close();
  if (code !== 0) {
    throw "run error";
  }
});
