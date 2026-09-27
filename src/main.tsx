import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// 子路径部署适配：study-buddy 版构建时 base=/games/balance-blocks/，
// 平台版 base='./' 时回落到 '/'。
const base = import.meta.env.BASE_URL
const basename = base === './' || base === '/' ? '/' : base.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={basename}>
    <App />
  </BrowserRouter>,
)
