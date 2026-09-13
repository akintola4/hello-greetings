/**
 * Source faces on google/fonts, one per writing system.
 * Variable fonts; the subsetter pins a single weight instance.
 */
export const FONT_SOURCES = {
  // Fallback for Latin glyphs Geist lacks (Vietnamese diacritics, Yoruba
  // sub-dots). Geist ships latin + latin-ext only, so the Vietnamese
  // circumflex-plus-tone stack would render as tofu.
  latn: { path: 'ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf', weight: 500 },
  jpan: { path: 'ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf', weight: 500 },
  hans: { path: 'ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf', weight: 500 },
  hang: { path: 'ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf', weight: 500 },
  arab: { path: 'ofl/notonaskharabic/NotoNaskhArabic%5Bwght%5D.ttf', weight: 500 },
  hebr: { path: 'ofl/notosanshebrew/NotoSansHebrew%5Bwdth,wght%5D.ttf', weight: 500 },
  deva: { path: 'ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth,wght%5D.ttf', weight: 500 },
  beng: { path: 'ofl/notosansbengali/NotoSansBengali%5Bwdth,wght%5D.ttf', weight: 500 },
  taml: { path: 'ofl/notosanstamil/NotoSansTamil%5Bwdth,wght%5D.ttf', weight: 500 },
  thai: { path: 'ofl/notosansthai/NotoSansThai%5Bwdth,wght%5D.ttf', weight: 500 },
  khmr: { path: 'ofl/notosanskhmer/NotoSansKhmer%5Bwdth,wght%5D.ttf', weight: 500 },
  cyrl: { path: 'ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf', weight: 500 },
  grek: { path: 'ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf', weight: 500 },
  geor: { path: 'ofl/notosansgeorgian/NotoSansGeorgian%5Bwdth,wght%5D.ttf', weight: 500 },
  armn: { path: 'ofl/notosansarmenian/NotoSansArmenian%5Bwdth,wght%5D.ttf', weight: 500 },
  ethi: { path: 'ofl/notosansethiopic/NotoSansEthiopic%5Bwdth,wght%5D.ttf', weight: 500 },
  tibt: { path: 'ofl/notoseriftibetan/NotoSerifTibetan%5Bwght%5D.ttf', weight: 500 },
  cans: { path: 'ofl/notosanscanadianaboriginal/NotoSansCanadianAboriginal%5Bwght%5D.ttf', weight: 500 },
}

export const RAW_BASE = 'https://github.com/google/fonts/raw/main/'
