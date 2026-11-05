import {
  ArrowLeftRight, Banknote, Bitcoin, Briefcase, Building2, ChartLine, Coins, Factory, Flag, Gem, HandCoins, Home,
  Landmark, LandPlot, type LucideIcon, Palmtree, PartyPopper, Rocket, Scale, ScrollText, ShieldCheck, ShoppingBag,
  Sprout, Star, Store, Sun, TrendingUp, Wifi, Zap, GraduationCap, Receipt, TriangleAlert,
} from 'lucide-react';

type Look = { tile: string; dark: string; ink: string; icon: LucideIcon; label: string };

export const LOOKS: Record<string, Look> = {
  cobrar: { tile: '#ffc83d', dark: '#c98a0c', ink: '#1d1a33', icon: Coins, label: 'Nómina' },
  peq: { tile: '#2fb5f5', dark: '#1379b0', ink: '#10143a', icon: TrendingUp, label: 'Ganga' },
  grande: { tile: '#ff5a4e', dark: '#bf2f25', ink: '#ffffff', icon: Rocket, label: 'Gran proyecto' },
  mercado: { tile: '#8b5cf6', dark: '#5b30b8', ink: '#ffffff', icon: ArrowLeftRight, label: 'Noticias' },
  gusto: { tile: '#ff6fb5', dark: '#c23a80', ink: '#1d1a33', icon: ShoppingBag, label: 'Capricho' },
  banco: { tile: '#7c8bd6', dark: '#4553a3', ink: '#10143a', icon: Landmark, label: 'Banco' },
  sueno: { tile: '#fff0a8', dark: '#c98a0c', ink: '#1d1a33', icon: Star, label: 'Legado' },
  salida: { tile: '#3ddc97', dark: '#1b9c66', ink: '#10143a', icon: Flag, label: 'Salida' },
  auditoria: { tile: '#7c8bd6', dark: '#4553a3', ink: '#10143a', icon: Scale, label: 'Inspección' },
  impuesto: { tile: '#9aa3b5', dark: '#5e6779', ink: '#10143a', icon: Receipt, label: 'Hacienda' },
  formacion: { tile: '#4fd1c5', dark: '#23958b', ink: '#10143a', icon: GraduationCap, label: 'Formación' },
  imprevisto: { tile: '#ff9f43', dark: '#c46a12', ink: '#1d1a33', icon: TriangleAlert, label: 'Imprevisto' },
  oportunidad: { tile: '#ff5a4e', dark: '#bf2f25', ink: '#ffffff', icon: Rocket, label: 'Proyecto' },
};

/* Lo que se ve en cada carta según su mazo */
export const CARD_LOOKS: Record<string, { look: Look; title: string }> = {
  small: { look: LOOKS.peq, title: 'Ganga' },
  big: { look: LOOKS.grande, title: 'Gran proyecto' },
  market: { look: LOOKS.mercado, title: 'Noticias' },
  gusto: { look: LOOKS.gusto, title: 'Capricho' },
  dream: { look: LOOKS.sueno, title: 'Legado' },
  bank: { look: LOOKS.banco, title: 'Banco y caridad' },
};

const TAGS: Record<string, LucideIcon> = {
  BOLSA: ChartLine, 'RENTA FIJA': ScrollText, COLECTIVO: Coins, NEGOCIO: Store, SERVICIO: Briefcase, DIGITAL: Wifi,
  PROTECCIÓN: ShieldCheck, VOLÁTIL: Bitcoin, CRIPTO: Bitcoin, REGALÍAS: Gem, RIESGO: Zap, FRANQUICIA: Store,
  DUDOSA: HandCoins, VIVIENDA: Home, COMERCIAL: Building2, TERRENO: LandPlot, INDUSTRIAL: Factory, TURISMO: Palmtree,
  AGRO: Sprout, ENERGÍA: Sun, SOCIEDAD: PartyPopper,
};
export const tagIcon = (tag?: string): LucideIcon => (tag && TAGS[tag]) || Banknote;
