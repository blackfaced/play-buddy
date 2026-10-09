import type { EpisodeDefinition } from '../types';
import MusicEpisode from './musicScene';
import { musicInitial, musicNormalize } from './musicModel';
export const musicEpisode:EpisodeDefinition={id:'music',title:'风铃与八音盒',place:'铜铃阁楼',description:'长短的铜管、纸上的鸟影和安静的梳齿，藏着一段回家的旋律。',motif:'melody',initial:musicInitial,normalize:musicNormalize,isComplete:s=>s.solved.includes('melody'),hints:()=>['看看铜管身后的轮廓，以及纸卷边缘的缺口。','铜管的长短对应针筒旁梳齿的长短；纸孔上的鸟影留下了每一拍。','纸卷缺口转回左侧。中音第1拍、低音第3拍、高音第4拍、中音第6拍放入铜钉，其余留空，再摇动八音盒。'],Component:MusicEpisode};
