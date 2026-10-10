/** Short observations describe the room, never prescribe a puzzle solution. */
export const SEARCH_INSPECTIONS: Record<string, { id: string; label: string; x: number; y: number; width: number; height: number; description: string }[]> = {
  gallery: [
    { id: 'gallery-compass', label: '收藏桌上的罗盘', x: 37, y: 64, width: 11, height: 16, description: '罗盘的指针轻轻晃动，又停在原来的方向。铜边被摸得发亮。' },
    { id: 'gallery-sketch', label: '贝壳速写', x: 35, y: 39, width: 16, height: 21, description: '泛黄的纸上画着海岸和贝壳，边角有几圈干掉的水痕。' },
  ],
  optics: [
    { id: 'optics-telescope', label: '桌边望远镜', x: 65, y: 34, width: 26, height: 18, description: '黄铜镜筒朝着舷窗，玻璃里映着一小片蓝色夜空。' },
    { id: 'optics-compass', label: '观测台上的罗盘', x: 52, y: 69, width: 11, height: 16, description: '罗盘的细刻度绕了一圈，指针在船身晃动时微微颤动。' },
  ],
  workshop: [
    { id: 'workshop-gears', label: '散放的齿轮', x: 35, y: 76, width: 21, height: 17, description: '两只旧齿轮大小不同，齿缘磨得很光滑，平放在木桌上。' },
    { id: 'workshop-ruler', label: '铜尺', x: 50, y: 34, width: 14, height: 9, description: '铜尺边缘刻着细密的短线，尺角留着一道磕痕。' },
  ],
};

export const TOOL_OBSERVATIONS: Record<string, { changed: string; settled: string }> = {
  'brush-plaque': { changed: '灰尘簌簌落下，铭牌上的动物刻痕露了出来。', settled: '铭牌上的刻痕已经清楚可见，边缘还留着刷过的痕迹。' },
  'hook-grate': { changed: '长钩穿过格栅，把帆纹片拉到了桌边。', settled: '格栅后已经没有纹片，桌边留着长钩划过的浅痕。' },
  'mount-arrow': { changed: '两枚箭纹片卡进凹槽，台面响了两声。', settled: '箭纹片已经嵌在托盘里，卡口稳稳扣着边缘。' },
  'mount-sail': { changed: '两枚帆纹片落进凹槽，卡扣轻轻合上。', settled: '帆纹片已经嵌在托盘里，卡口稳稳扣着边缘。' },
  'mount-vane': { changed: '两枚风标纹片落进凹槽，纹带接上了。', settled: '风标纹片已经嵌在托盘里，卡口稳稳扣着边缘。' },
  'clean-window': { changed: '镜布擦去了玻璃上的盐雾，窗内的纸页清晰起来。', settled: '观测窗已经擦净，纸页透过玻璃清楚可见。' },
  'mount-frame': { changed: '镜架扣进圆环接口，稳稳停在纸页前。', settled: '镜架已经固定在窗旁，圆环与接口贴合。' },
  'mount-filter': { changed: '三色镜盘滑入卡槽，转轴轻轻咔哒一响。', settled: '三色镜盘已经装好，边缘的转轴保持顺畅。' },
  'mount-route': { changed: '航路铭牌嵌入空槽，两枚卡榫扣住了实验台。', settled: '航路铭牌已经嵌在实验台下方，卡榫牢牢扣住。' },
  'wind-tide': { changed: '曲柄带动齿轮转了一圈，停住的潮汐棋盘亮了起来。', settled: '曲柄已经装在方轴上，棋盘的齿轮正在缓缓转动。' },
  'oil-track': { changed: '润滑油流进轨道，卡住的灯座轻轻滑动了一下。', settled: '轨道上泛着薄薄的油光，灯座不再卡住。' },
  'mount-prism': { changed: '棱镜落进菱形镜座，灯罩内映出一小片彩光。', settled: '棱镜已经安放在灯罩中央，镜座贴合着玻璃边缘。' },
};

export const REVEAL_OBSERVATIONS: Record<string, string> = {
  'gallery-curtain': '布帘掀到一旁，露出了木格里的软刷。',
  'shell-fan': '贝壳扇移到桌边，下面露出两枚箭纹片。',
  'rolled-chart': '旧卷图挪到桌沿，下面露出一支长柄钩。',
  'rope-coil': '盘绳挪到一旁，小油壶从绳圈后露了出来。',
  'pattern-engraving': '凑近看，台边的两行细小铭刻清晰起来。',
};
