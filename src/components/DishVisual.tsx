import React, { useState } from 'react';
import { Utensils } from 'lucide-react';

export type VisualKey =
  | 'hero_kitchen'
  | 'tomato_egg_tofu'
  | 'cabbage_pork_pot'
  | 'mushroom_chicken_rice'
  | 'cold_tofu_salad'
  | 'garlic_greens'
  | 'steamed_egg'
  | 'broken_demo';

interface DishVisualProps {
  visualKey: VisualKey | string;
  alt: string;
  aspectRatio?: '4:3' | '16:9';
  className?: string;
}

export const DishVisual: React.FC<DishVisualProps> = ({
  visualKey,
  alt,
  aspectRatio = '4:3',
  className = '',
}) => {
  const [hasError, setHasError] = useState(visualKey === 'broken_demo');

  const ratioClass = aspectRatio === '16:9' ? 'aspect-video' : 'aspect-4/3';

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt || '圖片暫無法顯示'}
        className={`relative w-full ${ratioClass} bg-[#F4E8DB] flex flex-col items-center justify-center text-[#655A50] p-4 select-none overflow-hidden ${className}`}
      >
        <div className="w-16 h-16 rounded-full bg-[#FAF7F2] border border-[#DED3C7] flex items-center justify-center mb-2">
          <Utensils className="w-7 h-7 text-[#88796B]" aria-hidden="true" />
        </div>
        <span className="text-sm font-medium text-[#655A50]">圖片暫無法顯示</span>
      </div>
    );
  }

  // Render curated warm natural-light ceramic tableware culinary artwork
  const renderArtwork = () => {
    switch (visualKey) {
      case 'hero_kitchen':
        return (
          <svg
            viewBox="0 0 800 450"
            className="w-full h-full object-cover"
            role="img"
            aria-label={alt}
          >
            <defs>
              <linearGradient id="warmSunlight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F6ECE0" />
                <stop offset="55%" stopColor="#EAD8C3" />
                <stop offset="100%" stopColor="#DEC5AA" />
              </linearGradient>
              <radialGradient id="plateRim" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFDF9" />
                <stop offset="80%" stopColor="#F4EDE2" />
                <stop offset="100%" stopColor="#E2D5C4" />
              </radialGradient>
              <linearGradient id="linenShadow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FAF7F2" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#EFE4D6" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            {/* Warm wooden table & natural morning window light */}
            <rect width="800" height="450" fill="url(#warmSunlight)" />
            {/* Window sunlight rays */}
            <polygon points="0,0 380,0 620,450 0,450" fill="#FFFDF9" opacity="0.38" />
            <polygon points="420,0 640,0 800,320 800,450 680,450" fill="#FFFDF9" opacity="0.22" />
            {/* Linen table runner */}
            <path d="M -20 260 Q 260 220 820 310 L 820 460 L -20 460 Z" fill="url(#linenShadow)" />
            {/* Wooden cutting board */}
            <rect x="75" y="70" width="250" height="175" rx="26" fill="#C89D74" opacity="0.35" transform="rotate(-5 200 155)" />
            <rect x="70" y="64" width="250" height="175" rx="26" fill="#D5AC82" transform="rotate(-5 200 155)" />
            {/* Half Cabbage on board */}
            <g transform="translate(155, 138)">
              <circle cx="0" cy="0" r="54" fill="#6F8C4A" />
              <circle cx="-3" cy="-2" r="46" fill="#8EAD62" />
              <circle cx="-5" cy="-3" r="36" fill="#B7CF8A" />
              <path d="M-28,0 Q0,-22 28,0 Q0,24 -28,0" fill="#EBF2DC" opacity="0.85" />
              <path d="M-18,-14 Q0,8 18,-14" stroke="#6F8C4A" strokeWidth="3" fill="none" />
            </g>
            {/* Fresh Brown Eggs in small ceramic bowl */}
            <g transform="translate(275, 185)">
              <ellipse cx="4" cy="8" rx="52" ry="44" fill="#B59B82" opacity="0.35" />
              <circle cx="0" cy="0" r="48" fill="#F7F2EA" stroke="#DFD3C3" strokeWidth="3" />
              <ellipse cx="-14" cy="-8" rx="17" ry="21" fill="#D79968" transform="rotate(-18 -14 -8)" />
              <ellipse cx="15" cy="-4" rx="17" ry="21" fill="#C98753" transform="rotate(15 15 -4)" />
              <ellipse cx="0" cy="14" rx="18" ry="20" fill="#DFAA7B" transform="rotate(5 0 14)" />
            </g>
            {/* Main Ceramic Dish: Braised Tomato Egg & Pan-Seared Tofu */}
            <g transform="translate(530, 235)">
              <ellipse cx="12" cy="18" rx="168" ry="158" fill="#8C6D53" opacity="0.22" />
              <circle cx="0" cy="0" r="160" fill="url(#plateRim)" stroke="#DED2C1" strokeWidth="4" />
              <circle cx="0" cy="0" r="126" fill="#EFE6D8" />
              {/* Warm savory broth */}
              <circle cx="0" cy="0" r="116" fill="#E58B52" opacity="0.28" />
              {/* Tomato wedges */}
              <path d="M-75,-35 C-90,-65 -45,-95 -20,-65 Z" fill="#C84630" />
              <path d="M40,-75 C75,-85 95,-45 60,-25 Z" fill="#C84630" />
              <path d="M-65,55 C-95,35 -70,85 -25,75 Z" fill="#D14E38" />
              <path d="M55,40 C90,50 75,90 35,70 Z" fill="#C84630" />
              {/* Golden scrambled egg ribbons */}
              <ellipse cx="-25" cy="-15" rx="44" ry="30" fill="#F2B84B" transform="rotate(-15 -25 -15)" />
              <ellipse cx="32" cy="12" rx="46" ry="32" fill="#F5C45E" transform="rotate(20 32 12)" />
              <ellipse cx="-12" cy="36" rx="38" ry="26" fill="#EFA93A" />
              {/* Pan-seared firm tofu cubes */}
              <rect x="-58" y="-12" width="46" height="36" rx="8" fill="#FAF0DC" stroke="#D89D56" strokeWidth="4" transform="rotate(-8 -35 6)" />
              <rect x="6" y="-52" width="46" height="36" rx="8" fill="#FAF0DC" stroke="#D89D56" strokeWidth="4" transform="rotate(12 29 -34)" />
              <rect x="-8" y="8" width="48" height="38" rx="8" fill="#FAF0DC" stroke="#D89D56" strokeWidth="4" transform="rotate(-4 16 27)" />
              {/* Chopped scallions */}
              <circle cx="-18" cy="-18" r="5" fill="#4E6E3A" />
              <circle cx="15" cy="-8" r="4.5" fill="#5B7E44" />
              <circle cx="2" cy="18" r="5" fill="#4E6E3A" />
              <circle cx="34" cy="24" r="4" fill="#5B7E44" />
              <circle cx="-36" cy="22" r="4" fill="#4E6E3A" />
            </g>
            {/* Wooden chopsticks on ceramic rest */}
            <rect x="210" y="340" width="230" height="7" rx="3.5" fill="#8B5A36" transform="rotate(-12 325 343)" />
            <rect x="214" y="352" width="230" height="7" rx="3.5" fill="#9E6840" transform="rotate(-10 325 355)" />
          </svg>
        );

      case 'tomato_egg_tofu':
        return (
          <svg viewBox="0 0 600 450" className="w-full h-full object-cover" role="img" aria-label={alt}>
            <rect width="600" height="450" fill="#F3E7D9" />
            <polygon points="0,0 420,0 600,350 600,450 0,450" fill="#FAF5EE" opacity="0.55" />
            <g transform="translate(300, 225)">
              <ellipse cx="10" cy="16" rx="162" ry="152" fill="#8C6D53" opacity="0.18" />
              <circle cx="0" cy="0" r="154" fill="#FAF7F2" stroke="#E0D4C4" strokeWidth="5" />
              <circle cx="0" cy="0" r="122" fill="#F2E7D8" />
              <circle cx="0" cy="0" r="110" fill="#D96B43" opacity="0.22" />
              {/* Soft scrambled eggs & tomato wedges */}
              <ellipse cx="-32" cy="-22" rx="52" ry="36" fill="#F3BC50" transform="rotate(-12 -32 -22)" />
              <ellipse cx="36" cy="18" rx="50" ry="35" fill="#F6C868" transform="rotate(18 36 18)" />
              <ellipse cx="-16" cy="40" rx="44" ry="28" fill="#EDA938" />
              <path d="M-76,-28 C-95,-62 -46,-92 -18,-58 Z" fill="#C4452D" />
              <path d="M36,-72 C74,-82 95,-40 56,-20 Z" fill="#C4452D" />
              <path d="M-64,52 C-92,32 -66,85 -22,74 Z" fill="#CF4D35" />
              {/* Golden seared tofu */}
              <rect x="-55" y="-12" width="48" height="38" rx="8" fill="#FFF7E8" stroke="#D4954A" strokeWidth="4" transform="rotate(-8 -31 7)" />
              <rect x="8" y="-48" width="48" height="38" rx="8" fill="#FFF7E8" stroke="#D4954A" strokeWidth="4" transform="rotate(12 32 -29)" />
              <rect x="-6" y="10" width="50" height="38" rx="8" fill="#FFF7E8" stroke="#D4954A" strokeWidth="4" />
              {/* Scallions */}
              <circle cx="-18" cy="-16" r="5.5" fill="#52603C" />
              <circle cx="18" cy="-8" r="5" fill="#647549" />
              <circle cx="4" cy="20" r="5.5" fill="#52603C" />
              <circle cx="-32" cy="26" r="4.5" fill="#647549" />
            </g>
          </svg>
        );

      case 'cabbage_pork_pot':
        return (
          <svg viewBox="0 0 600 450" className="w-full h-full object-cover" role="img" aria-label={alt}>
            <rect width="600" height="450" fill="#EFE4D6" />
            <polygon points="120,0 600,0 600,450 0,450" fill="#FAF6F0" opacity="0.5" />
            <g transform="translate(300, 225)">
              {/* Ceramic pot handles */}
              <rect x="-184" y="-24" width="368" height="48" rx="18" fill="#D5C5B3" />
              <ellipse cx="8" cy="14" rx="158" ry="150" fill="#7D6249" opacity="0.18" />
              <circle cx="0" cy="0" r="152" fill="#F8F4EC" stroke="#D5C5B3" strokeWidth="8" />
              <circle cx="0" cy="0" r="126" fill="#EDE3D4" />
              {/* Layered cabbage leaves */}
              <circle cx="-18" cy="-14" r="88" fill="#9BB86C" opacity="0.8" />
              <circle cx="22" cy="16" r="82" fill="#B5CE89" opacity="0.85" />
              <circle cx="-6" cy="22" r="70" fill="#DCE8C0" />
              {/* Tender pork slices */}
              <rect x="-56" y="-42" width="76" height="26" rx="12" fill="#DFB29F" stroke="#C48F7B" strokeWidth="3" transform="rotate(-16 -18 -29)" />
              <rect x="-38" y="-6" width="84" height="28" rx="12" fill="#E6BEB0" stroke="#C48F7B" strokeWidth="3" transform="rotate(-8 4 8)" />
              <rect x="-24" y="30" width="78" height="26" rx="12" fill="#DFB29F" stroke="#C48F7B" strokeWidth="3" transform="rotate(6 15 43)" />
              {/* Ginger strips &枸杞 */}
              <line x1="-18" y1="-20" x2="12" y2="-8" stroke="#E6C365" strokeWidth="4" strokeLinecap="round" />
              <line x1="-8" y1="14" x2="24" y2="6" stroke="#E6C365" strokeWidth="4" strokeLinecap="round" />
              <circle cx="-26" cy="12" r="6" fill="#B83B2A" />
              <circle cx="28" cy="-16" r="6" fill="#B83B2A" />
              <circle cx="8" cy="36" r="5.5" fill="#B83B2A" />
            </g>
          </svg>
        );

      case 'mushroom_chicken_rice':
        return (
          <svg viewBox="0 0 600 450" className="w-full h-full object-cover" role="img" aria-label={alt}>
            <rect width="600" height="450" fill="#F4E8DB" />
            <polygon points="0,0 500,0 600,450 0,450" fill="#FFFDF9" opacity="0.45" />
            <g transform="translate(300, 225)">
              <ellipse cx="10" cy="16" rx="154" ry="146" fill="#7D6249" opacity="0.16" />
              <circle cx="0" cy="0" r="148" fill="#FAF6F0" stroke="#DFD2C0" strokeWidth="6" />
              {/* Fluffy seasoned rice base */}
              <circle cx="0" cy="0" r="120" fill="#EFE2CE" />
              {/* Bok choy greens */}
              <path d="M-85,-25 C-105,-75 -35,-105 -15,-45 Z" fill="#52603C" />
              <path d="M-65,45 C-105,25 -85,-25 -35,5 Z" fill="#687A4D" />
              {/* Sliced shiitake mushrooms */}
              <ellipse cx="28" cy="-48" rx="34" ry="22" fill="#6E4E3A" transform="rotate(18 28 -48)" />
              <ellipse cx="56" cy="-12" rx="32" ry="20" fill="#5C3F2E" transform="rotate(42 56 -12)" />
              <ellipse cx="-14" cy="-58" rx="28" ry="18" fill="#6E4E3A" transform="rotate(-12 -14 -58)" />
              {/* Golden braised chicken pieces */}
              <rect x="-26" y="-18" width="54" height="38" rx="14" fill="#D89452" transform="rotate(-10 1 1)" />
              <rect x="14" y="16" width="56" height="38" rx="14" fill="#CE8846" transform="rotate(14 42 35)" />
              <rect x="-44" y="24" width="50" height="36" rx="14" fill="#E09F5E" transform="rotate(6 -19 42)" />
              {/* White sesame & scallion */}
              <circle cx="4" cy="-2" r="4.5" fill="#52603C" />
              <circle cx="24" cy="24" r="4.5" fill="#52603C" />
              <circle cx="-12" cy="34" r="4.5" fill="#52603C" />
            </g>
          </svg>
        );

      case 'cold_tofu_salad':
        return (
          <svg viewBox="0 0 600 450" className="w-full h-full object-cover" role="img" aria-label={alt}>
            <rect width="600" height="450" fill="#F2E8DC" />
            <g transform="translate(300, 225)">
              <ellipse cx="8" cy="14" rx="150" ry="142" fill="#8C6D53" opacity="0.15" />
              <circle cx="0" cy="0" r="146" fill="#FAF8F5" stroke="#DED3C7" strokeWidth="5" />
              <circle cx="0" cy="0" r="114" fill="#F3ECE1" />
              {/* Chilled silken tofu block */}
              <rect x="-70" y="-58" width="140" height="116" rx="16" fill="#FFFDF9" stroke="#EAE0D2" strokeWidth="3" />
              {/* Roasted sesame sauce drizzle */}
              <path d="M-52,-20 Q0,-42 52,-12 Q10,16 -46,24 Q8,42 48,28" stroke="#B67B43" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.85" />
              {/* Cucumber julienne on top */}
              <line x1="-28" y1="-16" x2="22" y2="14" stroke="#5A7A42" strokeWidth="6" strokeLinecap="round" />
              <line x1="-18" y1="18" x2="32" y2="-12" stroke="#6F9254" strokeWidth="6" strokeLinecap="round" />
              <line x1="-8" y1="-24" x2="14" y2="24" stroke="#5A7A42" strokeWidth="6" strokeLinecap="round" />
              <circle cx="0" cy="-2" r="5" fill="#A8462D" />
            </g>
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 600 450" className="w-full h-full object-cover" role="img" aria-label={alt}>
            <rect width="600" height="450" fill="#F4E8DB" />
            <g transform="translate(300, 225)">
              <circle cx="0" cy="0" r="146" fill="#FAF7F2" stroke="#DED3C7" strokeWidth="5" />
              <circle cx="0" cy="0" r="112" fill="#EFE5D8" />
              <ellipse cx="-24" cy="-10" rx="56" ry="38" fill="#8EAD62" transform="rotate(-14 -24 -10)" />
              <ellipse cx="26" cy="16" rx="52" ry="36" fill="#6F8C4A" transform="rotate(18 26 16)" />
              <circle cx="-10" cy="-22" r="10" fill="#F2B84B" />
              <circle cx="18" cy="8" r="10" fill="#D96B43" />
            </g>
          </svg>
        );
    }
  };

  // If visualKey is a data URL or http URL, render img with fallback handler
  if (visualKey.startsWith('data:') || visualKey.startsWith('http') || visualKey.startsWith('/')) {
    return (
      <div className={`relative w-full ${ratioClass} bg-[#F4E8DB] overflow-hidden ${className}`}>
        <img
          src={visualKey}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full ${ratioClass} bg-[#F4E8DB] overflow-hidden ${className}`}>
      {renderArtwork()}
    </div>
  );
};
