/**
 * Onboarding.tsx — Direction B (tinted gradient)
 * 5 slides: Velkommen · Kvitteringer · Garanti · Varsler · Gavekort & bytte
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, PanResponder, SafeAreaView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield, Bell, Gift, ArrowRight, RefreshCw,
} from 'lucide-react-native';

const COLORS = {
  cream: '#FAF7F2',
  charcoal: '#1A1A2E',
  primary: '#6366F1',
  giftcard: '#0D9488',
  amber: '#D97706',
  rose: '#F97316',
  letterK: '#3B6EE3',
} as const;

const ROSE = '#F97316';

type SlideAccent = 'k' | 'primary' | 'giftcard' | 'amber' | 'rose';

interface Slide {
  eyebrow: string;
  title: [string, string];
  italic: string;
  body: string;
  cta: string;
  ctaSecondary?: string;
  accent: SlideAccent;
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Velkommen',
    title: ['Aldri mer mistede', 'kvitteringer.'],
    italic: 'kvitteringer.',
    body: 'Skann, lagre og hold styr på garanti, byttefrist og gavekort — alt på ett sted.',
    cta: 'Kom i gang',
    accent: 'k',
  },
  {
    eyebrow: 'Kvitteringer',
    title: ['Ta vare på', 'kvitteringene dine.'],
    italic: 'kvitteringene',
    body: 'Skann med kameraet. Kvittr leser ut butikk, dato og beløp automatisk.',
    cta: 'Neste',
    accent: 'primary',
  },
  {
    eyebrow: 'Reklamasjonsrett',
    title: ['2 og 5 års', 'garanti.'],
    italic: 'garanti.',
    body: 'Vi regner ut reklamasjonsretten din etter norsk lov — 2 år standard, 5 år for varige varer.',
    cta: 'Neste',
    accent: 'giftcard',
  },
  {
    eyebrow: 'Varsler',
    title: ['Varsler før', 'fristen.'],
    italic: 'fristen.',
    body: 'Push-varsel 7 og 3 dager før garantier, byttelapper og gavekort utløper.',
    cta: 'Neste',
    accent: 'amber',
  },
  {
    eyebrow: 'Klar?',
    title: ['Gavekort og', 'byttelapper.'],
    italic: 'byttelapper.',
    body: 'Hold styr på saldo, gyldighet og byttefrister for alle gavekort og byttelapper.',
    cta: 'Registrer deg',
    ctaSecondary: 'Fortsett som gjest',
    accent: 'rose',
  },
];

const accentColor = (k: SlideAccent): string =>
  ({ k: COLORS.letterK, primary: COLORS.primary, giftcard: COLORS.giftcard, amber: COLORS.amber, rose: ROSE }[k]);

const accentDark = (k: SlideAccent): string =>
  ({ k: '#1F2C66', primary: '#4338CA', giftcard: '#086B5F', amber: '#92500A', rose: '#A8395A' }[k]);

function Wordmark({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Text style={{
      fontSize: size, fontWeight: '800',
      letterSpacing: -size * 0.04, color,
      includeFontPadding: false,
    }}>
      kvittr
    </Text>
  );
}

function Headline({ title, italic, size = 40 }: { title: [string, string]; italic: string; size?: number }) {
  const renderLine = (line: string, lineIdx: number) => {
    const words = line.split(' ');
    return (
      <Text key={lineIdx} style={{
        fontSize: size, fontWeight: '700', color: '#fff',
        lineHeight: size * 1.0, letterSpacing: -size * 0.038, includeFontPadding: false,
      }}>
        {words.map((w, j) => {
          const stripped = w.replace(/[.,]$/, '');
          const isItalic = stripped === italic || w === italic;
          return (
            <Text key={j} style={isItalic ? {
              fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif' }),
              fontStyle: 'italic', fontWeight: '400', letterSpacing: -size * 0.06,
            } : undefined}>
              {w}{j < words.length - 1 ? ' ' : ''}
            </Text>
          );
        })}
      </Text>
    );
  };
  return <View>{title.map(renderLine)}</View>;
}

function Glass({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

function SpecBrand() {
  return (
    <Glass style={{ width: 280, height: 240, alignItems: 'center', justifyContent: 'center' }}>
      <Wordmark size={56} color="#fff" />
      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8, letterSpacing: 1.2 }}>
        KVITTR.APP
      </Text>
    </Glass>
  );
}

function SpecReceipts() {
  const Row = ({ shop, prod, amt, badge, badgeColor }: any) => (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)',
    }}>
      <View style={{
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{shop[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{shop}</Text>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>kr {amt}</Text>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 1 }}>{prod}</Text>
      </View>
      {badge ? (
        <View style={{ backgroundColor: badgeColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 }}>
          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.3 }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
  return (
    <Glass style={{ width: 280, padding: 14 }}>
      <Row shop="Elkjøp"   prod="iPhone 15 Pro · 24 mnd"  amt="14 990" badge="GARANTI" badgeColor={COLORS.giftcard} />
      <Row shop="Komplett" prod="Sony WH-1000XM5"          amt="3 290"  badge="14D"     badgeColor={COLORS.amber} />
      <Row shop="XXL"      prod="Sykkelhjelm · byttelapp"  amt="899"    badge="BYTTE"   badgeColor={COLORS.amber} />
    </Glass>
  );
}

function SpecWarranty() {
  return (
    <Glass style={{ width: 280, alignItems: 'center', padding: 20, gap: 14 }}>
      <View style={{
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.40)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{
          color: '#fff', fontSize: 40,
          fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif' }),
          fontStyle: 'italic',
        }}>5</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[['2 år', 'Standard'], ['5 år', 'Varige varer']].map(([val, label]) => (
          <View key={val} style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minWidth: 110,
          }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>{val}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>{label}</Text>
          </View>
        ))}
      </View>
    </Glass>
  );
}

function SpecNotify() {
  const items = [
    { title: 'Garanti utløper om 14 dager', body: 'iPhone 15 Pro · Elkjøp', t: 'nå', Icon: Shield },
    { title: 'Byttefrist nesten ute',       body: 'Sweater · Cubus · 4d', t: '2 min', Icon: RefreshCw },
    { title: 'Gavekort utløper snart',      body: 'Komplett · 500 kr · 30d', t: '1 t', Icon: Gift },
  ];
  return (
    <View style={{ width: 290, gap: 8 }}>
      {items.map((n, i) => (
        <View key={i} style={[styles.glass, {
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          padding: 10, borderRadius: 14,
          transform: [{ translateY: -i * 4 }, { scale: 1 - i * 0.025 }],
          opacity: 1 - i * 0.12,
        }]}>
          <View style={{
            width: 30, height: 30, borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.25)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <n.Icon size={14} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Kvittr</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{n.t}</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 2 }}>{n.title}</Text>
            <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{n.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// Fixed fan stack — each card has distinct position and rotation so all three are visible
const CARD_ROTATIONS = ['-5deg', '0deg', '5deg'];
const CARD_TOPS      = [10,  42,  74];
const CARD_LEFTS     = [20,   5, -10];

function SpecGiftcards() {
  const cards = [
    { shop: 'Komplett.no', amount: '500',   date: 'utløper 30. sep' },
    { shop: 'Power',       amount: '250',   date: 'utløper 14. nov' },
    { shop: 'XXL Sport',   amount: '1 000', date: 'utløper 03. des' },
  ];
  return (
    <View style={{ width: 300, height: 210 }}>
      {cards.map((c, i) => (
        <View key={i} style={[styles.glass, {
          position: 'absolute',
          top: CARD_TOPS[i],
          left: CARD_LEFTS[i],
          width: 260,
          height: 110,
          borderRadius: 16,
          padding: 14,
          transform: [{ rotate: CARD_ROTATIONS[i] }],
          zIndex: cards.length - i,
        }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 8, fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: 0.8 }}>Gavekort</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 }}>{c.shop}</Text>
            </View>
            <Gift size={18} color="rgba(255,255,255,0.85)" />
          </View>
          <View style={{
            position: 'absolute', bottom: 14, left: 14, right: 14,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -1 }}>kr {c.amount}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9 }}>{c.date}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const SPECIMENS = [SpecBrand, SpecReceipts, SpecWarranty, SpecNotify, SpecGiftcards];

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{
          height: 6, width: i === active ? 22 : 6,
          borderRadius: 99,
          backgroundColor: i === active ? '#fff' : 'rgba(255,255,255,0.4)',
        }} />
      ))}
    </View>
  );
}

interface SlideProps {
  slide: Slide;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
  onRegister: () => void;
  onGuest: () => void;
}

function OnboardingSlide({ slide, index, total, onNext, onSkip, onRegister, onGuest }: SlideProps) {
  const isLast = index === total - 1;
  const Specimen = SPECIMENS[index];

  const gradient: [string, string, string] = isLast
    ? [COLORS.letterK, ROSE, COLORS.giftcard]
    : [accentColor(slide.accent), accentColor(slide.accent), accentDark(slide.accent)];

  return (
    <LinearGradient
      colors={gradient}
      locations={isLast ? [0, 0.5, 1] : [0, 0.55, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.slide}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topbar}>
          <Wordmark size={22} color="#fff" />
          {!isLast && (
            <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Hopp over</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ paddingHorizontal: 28, paddingTop: 32 }}>
          <Text style={styles.eyebrow}>{String(index + 1).padStart(2, '0')} — {slide.eyebrow}</Text>
        </View>

        <View style={{ paddingHorizontal: 28, paddingTop: 8 }}>
          <Headline title={slide.title} italic={slide.italic} size={40} />
        </View>

        <Text style={styles.body}>{slide.body}</Text>

        <View style={styles.specimenWrap}>
          <Specimen />
        </View>

        <View style={styles.footer}>
          <Dots count={total} active={index} />
          {isLast && slide.ctaSecondary ? (
            <>
              <TouchableOpacity onPress={onRegister} style={styles.primaryBtn} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>{slide.cta}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onGuest} style={styles.secondaryBtn} activeOpacity={0.85}>
                <Text style={styles.secondaryBtnText}>{slide.ctaSecondary}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={onNext} style={styles.primaryBtn} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{slide.cta}</Text>
              <ArrowRight size={18} color={COLORS.charcoal} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export type OnboardingAction = 'register' | 'guest' | 'skip';

interface OnboardingProps {
  onComplete: (action: OnboardingAction) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [index, setIndex] = useState(0);
  const total = SLIDES.length;
  const translateX = useRef(new Animated.Value(0)).current;

  const goTo = (next: number) => {
    if (next < 0 || next >= total) return;
    setIndex(next);
    translateX.setValue(0);
  };

  const onNext     = () => { if (index < total - 1) goTo(index + 1); };
  const onSkip     = () => onComplete('skip');
  const onRegister = () => onComplete('register');
  const onGuest    = () => onComplete('guest');

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => translateX.setValue(g.dx * 0.5),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50 && index < total - 1) goTo(index + 1);
        else if (g.dx > 50 && index > 0) goTo(index - 1);
        else Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
        <OnboardingSlide
          slide={SLIDES[index]}
          index={index}
          total={total}
          onNext={onNext}
          onSkip={onSkip}
          onRegister={onRegister}
          onGuest={onGuest}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1 },
  topbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 8,
  },
  skipBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
  },
  skipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  eyebrow: {
    color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700',
    letterSpacing: 2.4, textTransform: 'uppercase',
  },
  body: {
    paddingHorizontal: 28, paddingTop: 14, paddingRight: 60,
    color: 'rgba(255,255,255,0.88)', fontSize: 15, lineHeight: 22,
  },
  specimenWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  glass: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24, padding: 16,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 32, gap: 14 },
  primaryBtn: {
    height: 54, backgroundColor: '#fff', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16, elevation: 6,
  },
  primaryBtnText: { color: COLORS.charcoal, fontSize: 16, fontWeight: '700', letterSpacing: -0.1 },
  secondaryBtn: {
    height: 48, backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '600' },
});

export default Onboarding;
