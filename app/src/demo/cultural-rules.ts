import type { CulturalRule } from '@/domain/types';

/*
 * DEMO cultural rules. The wording restates guidance already shown in the app
 * (temple dress, offerings, site tips). None is verified: spec §16 requires a
 * verified source owner (destination, community, operator or admin), and no
 * reviewer has been appointed yet (decision D-010). The app labels every rule
 * "Not yet verified" until `verified` is true.
 */

const DEMO_SOURCE = 'Bali Lens demo dataset (awaiting community verification)';

const rule = (
  seed: Omit<CulturalRule, 'validFrom' | 'validTo' | 'sourceOwner' | 'version' | 'verified' | 'demo'> &
    Partial<Pick<CulturalRule, 'validFrom' | 'validTo' | 'sourceOwner'>>,
): CulturalRule => ({
  validFrom: '2026-01-01',
  validTo: null,
  sourceOwner: DEMO_SOURCE,
  version: 1,
  verified: false,
  demo: true,
  ...seed,
});

export const DEMO_CULTURAL_RULES: CulturalRule[] = [
  rule({
    id: 'cr-temple-dress', scopeType: 'category', scopeId: 'temple', kind: 'dress', severity: 'warning',
    text: {
      en: 'Cover shoulders and knees and wear a sarong and sash inside temple grounds. Most temples lend them at the entrance.',
      id: 'Tutup bahu dan lutut serta kenakan kain dan selendang di area pura. Sebagian besar pura meminjamkannya di pintu masuk.',
    },
  }),
  rule({
    id: 'cr-temple-photo', scopeType: 'category', scopeId: 'temple', kind: 'photography', severity: 'warning',
    text: {
      en: 'Ask before photographing people at prayer, and never stand on shrines or walls for a photo.',
      id: 'Minta izin sebelum memotret orang yang sedang sembahyang, dan jangan berdiri di atas pelinggih atau tembok untuk berfoto.',
    },
  }),
  rule({
    id: 'cr-offerings', scopeType: 'global', scopeId: '', kind: 'etiquette', severity: 'info',
    text: {
      en: 'Small palm-leaf offerings (canang sari) are placed on pavements and doorsteps every day. Step around them.',
      id: 'Sesajen kecil (canang sari) diletakkan di trotoar dan depan pintu setiap hari. Langkahi dengan hati-hati di sekitarnya.',
    },
  }),
  rule({
    id: 'cr-processions', scopeType: 'global', scopeId: '', kind: 'etiquette', severity: 'info',
    text: {
      en: 'Ceremonial processions often use the road. Pull over, stay quiet and ask before taking photos.',
      id: 'Iring-iringan upacara sering melewati jalan. Menepilah, tetap tenang, dan minta izin sebelum memotret.',
    },
  }),
  rule({
    id: 'cr-nyepi', scopeType: 'global', scopeId: '', kind: 'access', severity: 'info',
    text: {
      en: 'Nyepi, the Day of Silence (usually in March), closes the whole island for 24 hours, including the airport. Visitors stay inside their accommodation.',
      id: 'Nyepi, Hari Raya Sepi (biasanya bulan Maret), menutup seluruh pulau selama 24 jam termasuk bandara. Wisatawan tetap di dalam penginapan.',
    },
  }),
  rule({
    id: 'cr-tanah-lot-inner', scopeType: 'destination', scopeId: 'tanah-lot', kind: 'access', severity: 'restricted',
    text: {
      en: 'Only worshippers may climb into the temple on the rock. Visitors view it from the shore and may receive a blessing at the spring at low tide.',
      id: 'Hanya umat yang sembahyang boleh naik ke pura di atas karang. Wisatawan melihat dari pantai dan dapat menerima tirta di mata air saat surut.',
    },
  }),
  rule({
    id: 'cr-tirta-spouts', scopeType: 'destination', scopeId: 'tirta-empul', kind: 'access', severity: 'restricted',
    text: {
      en: 'Follow the order of the purification spouts and skip those reserved for funerary rites. A village guide will show which ones.',
      id: 'Ikuti urutan pancuran penglukatan dan lewati pancuran yang khusus untuk upacara kematian. Pemandu desa akan menunjukkannya.',
    },
  }),
  rule({
    id: 'cr-besakih-ceremonies', scopeType: 'destination', scopeId: 'besakih', kind: 'access', severity: 'restricted',
    text: {
      en: 'Inner courtyards may close to visitors during ceremonies. Use the official visitor centre.',
      id: 'Area jeroan dapat ditutup bagi wisatawan saat upacara. Gunakan pusat informasi resmi.',
    },
  }),
  rule({
    id: 'cr-batur-guide', scopeType: 'destination', scopeId: 'mount-batur', kind: 'access', severity: 'restricted',
    text: {
      en: 'A licensed local guide is required on the mountain.',
      id: 'Pendakian wajib didampingi pemandu lokal berlisensi.',
    },
  }),
  rule({
    id: 'cr-sekumpul-guide', scopeType: 'destination', scopeId: 'sekumpul', kind: 'access', severity: 'restricted',
    text: {
      en: 'A local guide is required for the lower trail.',
      id: 'Jalur bawah wajib didampingi pemandu lokal.',
    },
  }),
  rule({
    id: 'cr-uluwatu-monkeys', scopeType: 'destination', scopeId: 'uluwatu', kind: 'safety', severity: 'warning',
    text: {
      en: 'Resident monkeys grab sunglasses, phones and hats. Keep them packed away.',
      id: 'Monyet di area pura sering merebut kacamata, ponsel, dan topi. Simpan barang-barang tersebut.',
    },
  }),
  rule({
    id: 'cr-monkey-forest', scopeType: 'destination', scopeId: 'monkey-forest', kind: 'safety', severity: 'warning',
    text: {
      en: 'Do not carry food or plastic bags, and never feed the monkeys.',
      id: 'Jangan membawa makanan atau kantong plastik, dan jangan memberi makan monyet.',
    },
  }),
  rule({
    id: 'cr-kelingking-swim', scopeType: 'destination', scopeId: 'kelingking', kind: 'safety', severity: 'warning',
    text: {
      en: 'Strong currents make swimming at the cove unsafe. The path down is steep.',
      id: 'Arus kuat membuat berenang di teluk tidak aman. Jalur turunnya curam.',
    },
  }),
  rule({
    id: 'cr-demo-ceremony-paused', scopeType: 'experience', scopeId: 'exp-village-ceremony', kind: 'access', severity: 'prohibited',
    sourceOwner: 'Demo scenario (not a real community decision)',
    text: {
      en: 'Demo scenario: the village has paused visitor access to its ceremonies. This shows how a community rule blocks an experience.',
      id: 'Skenario demo: desa menghentikan sementara kunjungan wisatawan ke upacaranya. Ini menunjukkan cara aturan komunitas memblokir sebuah pengalaman.',
    },
  }),
];
