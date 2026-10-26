// Photo-aligned geometry. Any change to image placement or regions requires a new version.
// Canonical photo faces RIGHT; body-side labels are explicit metadata, never inferred from screen position.
export const DIAGRAM_VERSION = 'equi-horse-photo-v2'
export const LEGACY_DIAGRAM_VERSIONS = ['equi-horse-side-v1']
export const DIAGRAM_WIDTH = 1448
export const DIAGRAM_HEIGHT = 1086
export const diagramViews = { left: 'Bên trái ngựa', right: 'Bên phải ngựa' }
export const bodyRegions = [
  { id: 'head', label: 'Đầu', anchor: [1290, 220], path: 'M1187 96 L1220 26 Q1240 1 1235 30 L1224 87 L1264 17 Q1283 6 1274 39 L1260 107 Q1290 141 1305 173 L1365 241 Q1385 254 1395 280 Q1408 311 1384 320 Q1357 329 1338 311 L1272 277 Q1249 276 1227 262 L1190 222 L1167 173 Z' },
  { id: 'neck', label: 'Cổ', anchor: [1080, 285], path: 'M1172 80 Q1120 98 1080 145 L967 231 L828 324 Q901 357 963 430 L1061 487 Q1093 414 1132 322 L1189 230 L1227 262 L1190 222 L1167 173 L1187 96 Z' },
  { id: 'shoulder', label: 'Vai/ngực', anchor: [956, 520], path: 'M828 324 Q901 357 963 430 L1061 487 Q1078 559 1020 628 L982 686 L878 674 L817 551 L811 440 Z' },
  { id: 'back', label: 'Lưng', anchor: [655, 382], path: 'M445 302 Q600 337 756 328 L828 324 L811 440 L463 436 L415 371 Z' },
  { id: 'abdomen', label: 'Bụng', anchor: [667, 551], path: 'M463 436 L811 440 L817 551 L878 674 Q681 675 566 631 L478 590 L440 545 Z' },
  { id: 'hindquarters', label: 'Mông', anchor: [342, 446], path: 'M445 302 Q356 276 294 329 Q239 350 231 439 L243 568 L288 690 L364 684 L413 617 L478 590 L463 436 L415 371 Z' },
  { id: 'foreleg', label: 'Chân trước', anchor: [955, 840], path: 'M878 674 L982 686 L978 777 L974 861 L973 959 Q974 1001 994 1024 L1038 1054 L1043 1076 Q1007 1089 970 1080 L943 1068 L927 1029 Q925 1012 928 988 L922 914 L915 824 L892 740 Z' },
  { id: 'hindleg', label: 'Chân sau', anchor: [237, 840], path: 'M288 690 L364 684 L339 756 Q313 793 304 835 L272 932 L252 985 Q249 1003 264 1022 L290 1045 L302 1072 Q274 1085 243 1076 L219 1058 L201 1029 Q186 1004 196 969 L202 879 L222 790 L241 721 Z' },
]
const environment = import.meta.env || {}
const defaultPhoto = '/images/injury/horse-reference-cutout-v2.png'
const localAsset = url => typeof url === 'string' && /^\/(?!\/)[^\\?#:\s]+\.(png|webp)$/i.test(url) ? url : ''

// Separate image and region transforms: a supplied right-side photo must already
// be aligned to the right-view canvas; fallback mirrors only the illustrative image.
export function diagramAsset(view, urls = {}) {
  const left = urls.left ?? environment.VITE_INJURY_HORSE_LEFT_IMAGE ?? defaultPhoto
  const right = urls.right ?? environment.VITE_INJURY_HORSE_RIGHT_IMAGE ?? ''
  return view === 'right'
    ? { url: localAsset(right || left), mirrorImage: !right, mirrorRegions: true, illustrationOnly: !right }
    : { url: localAsset(left), mirrorImage: false, mirrorRegions: false, illustrationOnly: false }
}
export function regionAnchor(regionId, view) {
  const region = bodyRegions.find(item => item.id === regionId)
  if (!region || !Object.keys(diagramViews).includes(view)) return null
  const [x, y] = region.anchor
  return { xRatio: (view === 'right' ? DIAGRAM_WIDTH - x : x) / DIAGRAM_WIDTH, yRatio: y / DIAGRAM_HEIGHT }
}
