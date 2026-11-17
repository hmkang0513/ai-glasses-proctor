import { defineConfig } from "vite";

// 상대 경로로 빌드해서 어느 폴더에 올려도 열리게 한다
export default defineConfig({
  base: "./",
  server: { port: 5180 },
});
