export interface CatalogEntry {
  id: string;
  catalogId: string;
  name: string;
  nameEn: string;
  type: string;
  constellation: string;
  magnitude: number | null;
  raHours: number;
  decDegrees: number;
  /** Solar-system body name understood by astronomy-engine */
  body?: string;
}

const e = (
  id: string,
  catalogId: string,
  name: string,
  nameEn: string,
  type: string,
  constellation: string,
  magnitude: number | null,
  raHours: number,
  decDegrees: number,
): CatalogEntry => ({ id, catalogId, name, nameEn, type, constellation, magnitude, raHours, decDegrees });

const planet = (id: string, body: string, name: string, magnitude: number | null): CatalogEntry => ({
  id,
  catalogId: body,
  name,
  nameEn: body,
  type: body === "Moon" ? "위성" : "행성",
  constellation: "-",
  magnitude,
  raHours: 0,
  decDegrees: 0,
  body,
});

export const CATALOG: CatalogEntry[] = [
  e("m1", "M1", "게성운", "Crab Nebula", "초신성 잔해", "황소자리", 8.4, 5.575, 22.01),
  e("m2", "M2", "물병자리 구상성단", "Aquarius Globular", "구상성단", "물병자리", 6.3, 21.558, -0.82),
  e("m3", "M3", "사냥개자리 구상성단", "CVn Globular", "구상성단", "사냥개자리", 6.2, 13.703, 28.38),
  e("m5", "M5", "뱀자리 구상성단", "Serpens Globular", "구상성단", "뱀자리", 5.7, 15.309, 2.08),
  e("m8", "M8", "석호성운", "Lagoon Nebula", "발광성운", "궁수자리", 6.0, 18.063, -24.38),
  e("m11", "M11", "야생오리 성단", "Wild Duck Cluster", "산개성단", "방패자리", 6.3, 18.851, -6.27),
  e("m13", "M13", "헤르쿨레스 대성단", "Hercules Cluster", "구상성단", "헤르쿨레스자리", 5.8, 16.695, 36.46),
  e("m15", "M15", "페가수스자리 구상성단", "Pegasus Globular", "구상성단", "페가수스자리", 6.2, 21.5, 12.17),
  e("m16", "M16", "독수리성운", "Eagle Nebula", "발광성운", "뱀자리", 6.0, 18.313, -13.79),
  e("m17", "M17", "오메가성운", "Omega Nebula", "발광성운", "궁수자리", 6.0, 18.346, -16.18),
  e("m20", "M20", "삼렬성운", "Trifid Nebula", "발광성운", "궁수자리", 6.3, 18.043, -23.03),
  e("m22", "M22", "궁수자리 구상성단", "Sagittarius Cluster", "구상성단", "궁수자리", 5.1, 18.607, -23.9),
  e("m27", "M27", "아령성운", "Dumbbell Nebula", "행성상성운", "여우자리", 7.5, 19.994, 22.72),
  e("m31", "M31", "안드로메다 은하", "Andromeda Galaxy", "은하", "안드로메다자리", 3.4, 0.712, 41.27),
  e("m33", "M33", "삼각형자리 은하", "Triangulum Galaxy", "은하", "삼각형자리", 5.7, 1.564, 30.66),
  e("m35", "M35", "쌍둥이자리 산개성단", "Gemini Cluster", "산개성단", "쌍둥이자리", 5.3, 6.148, 24.33),
  e("m42", "M42", "오리온 대성운", "Orion Nebula", "발광성운", "오리온자리", 4.0, 5.588, -5.39),
  e("m44", "M44", "프레세페 성단", "Beehive Cluster", "산개성단", "게자리", 3.7, 8.667, 19.67),
  e("m45", "M45", "플레이아데스", "Pleiades", "산개성단", "황소자리", 1.6, 3.79, 24.12),
  e("m51", "M51", "소용돌이 은하", "Whirlpool Galaxy", "은하", "사냥개자리", 8.4, 13.498, 47.2),
  e("m52", "M52", "카시오페이아 산개성단", "Cassiopeia Cluster", "산개성단", "카시오페이아자리", 6.9, 23.403, 61.59),
  e("m57", "M57", "고리성운", "Ring Nebula", "행성상성운", "거문고자리", 8.8, 18.893, 33.03),
  e("m63", "M63", "해바라기 은하", "Sunflower Galaxy", "은하", "사냥개자리", 8.6, 13.264, 42.03),
  e("m64", "M64", "검은눈 은하", "Black Eye Galaxy", "은하", "머리털자리", 8.5, 12.945, 21.68),
  e("m65", "M65", "사자자리 삼중은하 M65", "Leo Triplet M65", "은하", "사자자리", 9.3, 11.315, 13.09),
  e("m66", "M66", "사자자리 삼중은하 M66", "Leo Triplet M66", "은하", "사자자리", 8.9, 11.337, 12.99),
  e("m78", "M78", "오리온 반사성운", "M78 Reflection Nebula", "반사성운", "오리온자리", 8.3, 5.779, 0.08),
  e("m81", "M81", "보데 은하", "Bode's Galaxy", "은하", "큰곰자리", 6.9, 9.926, 69.07),
  e("m82", "M82", "시가 은하", "Cigar Galaxy", "은하", "큰곰자리", 8.4, 9.931, 69.68),
  e("m92", "M92", "헤르쿨레스자리 구상성단 M92", "M92 Globular", "구상성단", "헤르쿨레스자리", 6.4, 17.285, 43.14),
  e("m97", "M97", "올빼미성운", "Owl Nebula", "행성상성운", "큰곰자리", 9.9, 11.246, 55.02),
  e("m101", "M101", "바람개비 은하", "Pinwheel Galaxy", "은하", "큰곰자리", 7.9, 14.054, 54.35),
  e("m104", "M104", "솜브레로 은하", "Sombrero Galaxy", "은하", "처녀자리", 8.0, 12.667, -11.62),
  e("ngc7000", "NGC 7000", "북아메리카 성운", "North America Nebula", "발광성운", "백조자리", 4.0, 20.98, 44.33),
  e("ngc6992", "NGC 6992", "베일 성운", "Veil Nebula", "초신성 잔해", "백조자리", 7.0, 20.936, 31.72),
  e("ngc6888", "NGC 6888", "초승달 성운", "Crescent Nebula", "발광성운", "백조자리", 7.4, 20.2, 38.35),
  e("ngc7293", "NGC 7293", "나선성운", "Helix Nebula", "행성상성운", "물병자리", 7.6, 22.494, -20.84),
  e("ngc2237", "NGC 2237", "장미성운", "Rosette Nebula", "발광성운", "외뿔소자리", 9.0, 6.533, 4.95),
  e("ngc2024", "NGC 2024", "불꽃성운", "Flame Nebula", "발광성운", "오리온자리", 10.0, 5.679, -1.9),
  e("ngc1499", "NGC 1499", "캘리포니아 성운", "California Nebula", "발광성운", "페르세우스자리", 6.0, 4.019, 36.42),
  e("ngc869", "NGC 869", "이중성단", "Double Cluster", "산개성단", "페르세우스자리", 4.3, 2.332, 57.13),
  e("ngc253", "NGC 253", "조각실자리 은하", "Sculptor Galaxy", "은하", "조각실자리", 7.1, 0.793, -25.29),
  e("ngc891", "NGC 891", "NGC 891 은하", "NGC 891", "은하", "안드로메다자리", 10.0, 2.375, 42.35),
  e("polaris", "Polaris", "북극성", "Polaris", "별", "작은곰자리", 2.0, 2.53, 89.26),
  planet("moon", "Moon", "달", -12),
  planet("mercury", "Mercury", "수성", null),
  planet("venus", "Venus", "금성", null),
  planet("mars", "Mars", "화성", null),
  planet("jupiter", "Jupiter", "목성", null),
  planet("saturn", "Saturn", "토성", null),
  planet("uranus", "Uranus", "천왕성", null),
  planet("neptune", "Neptune", "해왕성", null),
];

export const POPULAR_IDS = [
  "m42", "m31", "m45", "m13", "m27", "m57", "m81", "m51", "moon", "jupiter", "saturn", "ngc7000",
];

export function findEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((c) => c.id === id);
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.]/g, "");

export function searchCatalog(q: string | undefined): CatalogEntry[] {
  const query = norm(q ?? "");
  if (!query) {
    return POPULAR_IDS.map((id) => findEntry(id)!).filter(Boolean);
  }
  const hits = CATALOG.filter(
    (c) =>
      norm(c.catalogId) === query ||
      norm(c.catalogId).startsWith(query) ||
      norm(c.name).includes(query) ||
      norm(c.nameEn).includes(query),
  );
  // Exact catalog id first (so "M4" does not bury "M4"-prefixed results below others).
  return hits.sort((a, b) => Number(norm(b.catalogId) === query) - Number(norm(a.catalogId) === query));
}
