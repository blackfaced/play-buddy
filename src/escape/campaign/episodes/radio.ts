import type { EpisodeDefinition } from '../types';
import RadioEpisode from './radioScene';
import { radioInitial, radioNormalize } from './radioModel';
export const radioEpisode:EpisodeDefinition={id:'radio',title:'海风电台',place:'海港电台',description:'玻璃波形、交错的导线和远方的灯，等待同一个讯号。',motif:'signal',initial:radioInitial,normalize:radioNormalize,isComplete:s=>s.solved.includes('broadcast'),hints:s=>!s.values.fuseInstalled?['接收机的空夹座里少了什么？临海平台有防雨罩。','翻开防雨罩取下玻璃保险管，从工具袋拿起它，再触碰空保险座。','平台挂着的摇柄可以带回发报机；接线台的盖子可以直接翻开。']:!s.values.signalsHeard?['玻璃上有旧刻痕，图像区还混着杂音。','让整组波形贴合刻痕，再收听整组讯号。','三个旋钮依次转到 1、3、2，再收听。收到的图像把电台图案和港口目的地连起来。']:['看看玻璃上的旧刻痕，也看看每根导线两端的形状。','让波形贴合刻痕；导线两头必须都能坐进各自的端子。','调谐旋钮依次转到 1、3、2；A、B、C 接星星、贝壳、海浪导线，再接海鸥、灯塔、帆船插头。'],Component:RadioEpisode};
