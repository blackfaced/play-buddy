import type { EpisodeDefinition } from '../types';
import RadioEpisode from './radioScene';
import { radioInitial, radioNormalize } from './radioModel';
export const radioEpisode:EpisodeDefinition={id:'radio',title:'海风电台',place:'海港电台',description:'玻璃波形、交错的导线和远方的灯，等待同一个讯号。',motif:'signal',initial:radioInitial,normalize:radioNormalize,isComplete:s=>s.solved.includes('broadcast'),hints:()=>['看看玻璃上的旧刻痕，也看看每根导线两端的形状。','让波形贴合刻痕；导线两头必须都能坐进各自的端子。','调谐旋钮依次转到 1、3、2；A、B、C 接星星、贝壳、海浪导线，再接海鸥、灯塔、帆船插头。'],Component:RadioEpisode};
