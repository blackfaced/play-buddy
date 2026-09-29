import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 注入构建期环境变量到 globalThis，供不依赖 import.meta 的模块读取
  // （src/lib/reward.ts 在 CommonJS 的 verify 脚本里不能用 import.meta）
  const env = loadEnv(mode, process.cwd(), "VITE_")

  return {
    base: './',
    plugins: [inspectAttr(), react()],
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      __REWARD_CAP_MIN__: JSON.stringify(env.VITE_REWARD_CAP_MIN ?? ""),
    },
  }
})
