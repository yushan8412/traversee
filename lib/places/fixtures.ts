import type { Place } from './types'

// Development and test data. Real places, but the coordinates are approximate
// and the geometries are a handful of points rather than surveyed tracks — they
// exist to exercise the code, not to navigate by. Real content arrives with the
// OSM import in M6.
//
// Difficulty is set only for hiking and cycling. The camping, surfing and
// waterfall scales are deliberately undefined in the spec's appendix because
// difficulty is what someone uses to judge their own safety, and inventing a
// scale here would put a number on the site that nobody stands behind.

const now = '2026-08-31T00:00:00.000Z'

export const fixturePlaces: Place[] = [
  {
    id: '0a1f2c3d-0000-4000-8000-000000000001',
    slug: 'lengshuikeng-loop',
    city: 'taipei',
    status: 'published',
    kind: 'route',
    activities: ['hiking'],
    name: { zh: '冷水坑環走', en: 'Lengshuikeng Loop' },
    summary: {
      zh: '陽明山上的緩坡環線，草原視野開闊，適合半日行程。',
      en: 'A gentle loop on Yangmingshan with open grassland views, good for half a day.',
    },
    description: {
      zh: '自冷水坑遊客服務站起登，沿木棧道經牛奶湖與菁山吊橋，再繞回停車場。全線鋪面良好，唯雨後濕滑。',
      en: 'Starts at the Lengshuikeng visitor centre, follows boardwalk past the milk pond and Jingshan suspension bridge, then loops back to the car park. Well surfaced throughout, but slippery after rain.',
    },
    difficulty: { hiking: 2 },
    geometry: {
      type: 'LineString',
      coordinates: [
        [121.5518, 25.1662],
        [121.5556, 25.1681],
        [121.5589, 25.1654],
        [121.5541, 25.1629],
        [121.5518, 25.1662],
      ],
    },
    startPoint: { type: 'Point', coordinates: [121.5518, 25.1662] },
    route: {
      distanceKm: 6.4,
      elevationGainM: 320,
      duration: { minMinutes: 120, maxMinutes: 180, basis: 'gpx' },
      gpxPath: 'gpx/0a1f2c3d-0000-4000-8000-000000000001.gpx',
    },
    approach: null,
    attributes: {},
    photos: [],
    coverPhotoIndex: 0,
    source: 'user',
    submittedBy: null,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  },
  {
    id: '0a1f2c3d-0000-4000-8000-000000000002',
    slug: 'old-caoling-circular',
    city: 'newTaipei',
    status: 'published',
    kind: 'route',
    activities: ['cycling'],
    name: { zh: '舊草嶺環狀線', en: 'Old Caoling Circular Route' },
    summary: {
      zh: '沿東北角海岸的環狀自行車道，含一段舊鐵路隧道。',
      en: 'A circular cycle route along the north-east coast, including a disused railway tunnel.',
    },
    description: {
      zh: '自福隆出發，穿越舊草嶺隧道後沿海岸線騎乘，經萊萊地質區與石城，再折返福隆。全程柏油路面，坡度平緩，隧道內恆溫涼爽。',
      en: 'From Fulong, through the Old Caoling tunnel and along the coast past the Laolao rock platform and Shicheng before returning. Sealed surface throughout, gentle gradients, and the tunnel stays cool year-round.',
    },
    difficulty: { cycling: 2 },
    geometry: {
      type: 'LineString',
      coordinates: [
        [121.9441, 25.0206],
        [121.9312, 25.0091],
        [121.9226, 24.9968],
        [121.9385, 24.9902],
        [121.9441, 25.0206],
      ],
    },
    startPoint: { type: 'Point', coordinates: [121.9441, 25.0206] },
    route: {
      distanceKm: 20,
      elevationGainM: 180,
      duration: { minMinutes: 90, maxMinutes: 150, basis: 'submitter' },
      gpxPath: 'gpx/0a1f2c3d-0000-4000-8000-000000000002.gpx',
    },
    approach: null,
    attributes: {},
    photos: [],
    coverPhotoIndex: 0,
    source: 'user',
    submittedBy: null,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  },
  {
    // Two activities on one place — the case that made `activities` an array
    // rather than a widened enum.
    id: '0a1f2c3d-0000-4000-8000-000000000003',
    slug: 'fulong-beach',
    city: 'newTaipei',
    status: 'published',
    kind: 'spot',
    activities: ['surfing', 'camping'],
    name: { zh: '福隆海水浴場', en: 'Fulong Beach' },
    summary: {
      zh: '東北角的沙岸浪點，腹地大，夏季有露營區。',
      en: 'A sandy beach break on the north-east coast with room to camp in summer.',
    },
    description: {
      zh: '雙溪河出海口形成的沙洲，浪型以沙灘浪為主，適合初學者。營地位於河的南岸，需事先預約。',
      en: 'A sandbar at the mouth of the Shuangxi river producing a forgiving beach break. The campsite sits on the south bank and must be booked ahead.',
    },
    difficulty: {},
    geometry: { type: 'Point', coordinates: [121.9438, 25.0223] },
    startPoint: { type: 'Point', coordinates: [121.9438, 25.0223] },
    route: null,
    approach: null,
    attributes: {
      surfing: {
        breakType: 'beach',
        bottom: 'sand',
        swellDirection: ['NE', 'E'],
        bestTide: 'mid',
        season: ['oct', 'nov', 'dec'],
        hazards: ['ripCurrent'],
      },
      camping: {
        water: true,
        electricity: false,
        toilets: 'flush',
        driveIn: true,
        reservation: 'required',
      },
    },
    photos: [],
    coverPhotoIndex: 0,
    source: 'user',
    submittedBy: null,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  },
  {
    // A spot you have to walk in to: the case `approach` exists for, so that a
    // waterfall does not need a third `kind`. Also the only entry without English
    // prose, which is what exercises the fallback marker.
    id: '0a1f2c3d-0000-4000-8000-000000000004',
    slug: 'wanggu-waterfall',
    city: 'newTaipei',
    status: 'published',
    kind: 'spot',
    activities: ['waterfall'],
    name: { zh: '望古瀑布', en: null },
    summary: { zh: '平溪線旁的簾幕式瀑布，自車站步行可達。', en: null },
    description: {
      zh: '自望古車站沿步道下切約二十分鐘可抵達，瀑布下方有一潭。步道後段為石階與泥徑，雨後濕滑，溪水暴漲時不宜前往。',
      en: null,
    },
    difficulty: {},
    geometry: { type: 'Point', coordinates: [121.7462, 25.0397] },
    startPoint: { type: 'Point', coordinates: [121.7462, 25.0397] },
    route: null,
    approach: {
      distanceKm: 1.1,
      elevationGainM: 80,
      duration: { minMinutes: 20, maxMinutes: 35, basis: 'editor' },
      gpxPath: null,
      geometry: {
        type: 'LineString',
        coordinates: [
          [121.7449, 25.0421],
          [121.7455, 25.0409],
          [121.7462, 25.0397],
        ],
      },
    },
    attributes: {
      waterfall: { heightM: 22, swimmable: true, seasonality: 'yearRound' },
    },
    photos: [],
    coverPhotoIndex: 0,
    source: 'user',
    submittedBy: null,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  },
  {
    id: '0a1f2c3d-0000-4000-8000-000000000005',
    slug: 'wangyou-valley',
    city: 'keelung',
    status: 'published',
    kind: 'route',
    activities: ['hiking'],
    name: { zh: '望幽谷步道', en: 'Wangyou Valley Trail' },
    summary: {
      zh: '基隆八斗子的短程海崖步道，可俯瞰潮境與基隆嶼。',
      en: 'A short cliff-top walk at Badouzi with views over Chaojing and Keelung Islet.',
    },
    description: {
      zh: '自停車場沿石階上行至稜線，再沿草坡下切至海邊。全程約一小時，午後常有強風。',
      en: 'Stone steps up to the ridge from the car park, then down a grassy slope to the shore. About an hour in total; the ridge is often windy in the afternoon.',
    },
    difficulty: { hiking: 1 },
    geometry: {
      type: 'LineString',
      coordinates: [
        [121.7961, 25.1449],
        [121.7988, 25.1462],
        [121.8012, 25.1438],
      ],
    },
    startPoint: { type: 'Point', coordinates: [121.7961, 25.1449] },
    route: {
      distanceKm: 2.1,
      elevationGainM: 95,
      duration: { minMinutes: 45, maxMinutes: 70, basis: 'editor' },
      gpxPath: null,
    },
    approach: null,
    attributes: {},
    photos: [],
    coverPhotoIndex: 0,
    source: 'user',
    submittedBy: null,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  },
  {
    // Unpublished on purpose: every query must filter on status, and a fixture
    // that is always visible would never catch a missing filter.
    id: '0a1f2c3d-0000-4000-8000-000000000006',
    slug: 'pending-example',
    city: 'taipei',
    status: 'pending',
    kind: 'spot',
    activities: ['camping'],
    name: { zh: '審核中的範例地點', en: 'Example place awaiting review' },
    summary: { zh: '這筆資料不應出現在任何前台頁面。', en: 'This must not appear on any public page.' },
    description: { zh: '', en: '' },
    difficulty: {},
    geometry: { type: 'Point', coordinates: [121.5, 25.05] },
    startPoint: { type: 'Point', coordinates: [121.5, 25.05] },
    route: null,
    approach: null,
    attributes: { camping: { driveIn: false } },
    photos: [],
    coverPhotoIndex: 0,
    source: 'user',
    submittedBy: 'fixture-user',
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  },
]
