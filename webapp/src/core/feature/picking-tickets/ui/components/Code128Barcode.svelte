<script lang="ts">
  let { value, modulePx = 1, height = 32, class: className = '' }: {
    value: string; modulePx?: number; height?: number; class?: string;
  } = $props();
  const patterns = [
    '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212',
    '112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131',
    '311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321',
    '112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121',
    '313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
    '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114',
    '122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212',
    '124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113',
    '114311','411113','411311','113141','114131','311141','411131','211412','211214','211232'
  ];
  const stopPattern = '2331112';
  const encoded = $derived.by(() => {
    if (!value) return { segments: [] as Array<{ width: number; black: boolean }>, totalModules: 0 };
    const values = [104];
    for (const character of value) {
      const code = character.charCodeAt(0);
      values.push(code >= 32 && code <= 127 ? code - 32 : 31);
    }
    let checksum = 104;
    for (let index = 1; index < values.length; index += 1) checksum += values[index] * index;
    values.push(checksum % 103);
    const segments: Array<{ width: number; black: boolean }> = [];
    let totalModules = 0;
    for (const code of values) {
      const pattern = patterns[code];
      for (let index = 0; index < pattern.length; index += 1) {
        const width = Number(pattern[index]);
        segments.push({ width, black: index % 2 === 0 });
        totalModules += width;
      }
    }
    for (let index = 0; index < stopPattern.length; index += 1) {
      const width = Number(stopPattern[index]);
      segments.push({ width, black: index % 2 === 0 });
      totalModules += width;
    }
    return { segments, totalModules };
  });
  const bars = $derived.by(() => {
    let cursor = 0;
    const result: Array<{ x: number; width: number }> = [];
    encoded.segments.forEach((segment) => {
      const width = segment.width * modulePx;
      if (segment.black) result.push({ x: cursor, width });
      cursor += width;
    });
    return result;
  });
  const svgWidth = $derived(encoded.totalModules * modulePx);
</script>
{#if svgWidth > 0}
  <svg class={className} viewBox={`0 0 ${svgWidth} ${height}`} preserveAspectRatio="none" role="img" aria-label={`Barcode ${value}`}>
    {#each bars as bar, index}<rect x={bar.x} y="0" width={bar.width} height={height} fill="#000" />{/each}
  </svg>
{/if}
