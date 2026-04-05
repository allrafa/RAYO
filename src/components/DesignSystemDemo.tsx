/**
 * 🎨 RAIO Design System - Componente de Demonstração
 * 
 * Este componente serve como exemplo de como usar o novo Design System unificado.
 * Mostra todos os tokens em ação: cores, espaçamentos, tipografia, animações, etc.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { colors, spacing, typography, radius, shadows, animations } from '../design-tokens';

export function DesignSystemDemo() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const currentColors = isDark ? colors.dark : colors.light;

  return (
    <div 
      className="min-h-screen p-8"
      style={{
        background: `var(--raio-bg-primary)`,
        color: `var(--raio-text-primary)`,
        transition: `all ${animations.duration.normal} ${animations.easing.easeInOut}`,
      }}
    >
      {/* Header com Toggle de Tema */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Palette className="w-8 h-8" style={{ color: currentColors.accent.primary }} />
            <h1 
              style={{
                fontSize: typography.size['4xl'],
                fontWeight: typography.weight.bold,
                color: currentColors.text.primary,
              }}
            >
              RAIO Design System
            </h1>
          </div>
          
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: currentColors.background.secondary,
              border: `1px solid ${currentColors.border.default}`,
              borderRadius: radius.lg,
              padding: `${spacing['3']} ${spacing['4']}`,
              display: 'flex',
              alignItems: 'center',
              gap: spacing['2'],
              cursor: 'pointer',
              boxShadow: isDark ? shadows.dark.md : shadows.light.md,
              transition: `all ${animations.duration.normal} ${animations.easing.easeInOut}`,
            }}
          >
            {isDark ? (
              <>
                <Sun className="w-5 h-5" style={{ color: currentColors.accent.primary }} />
                <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium }}>
                  Light Mode
                </span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5" style={{ color: currentColors.accent.primary }} />
                <span style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium }}>
                  Dark Mode
                </span>
              </>
            )}
          </motion.button>
        </div>
        
        <p 
          style={{
            fontSize: typography.size.lg,
            color: currentColors.text.secondary,
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          Sistema de design unificado com paleta off-white/preto e acentos amarelos.
          <br />
          Teste o toggle acima para ver a transição entre temas! ✨
        </p>
      </div>

      {/* Grid de Demonstração */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Card 1: Cores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: currentColors.background.secondary,
            border: `1px solid ${currentColors.border.default}`,
            borderRadius: radius.xl,
            padding: spacing.lg,
            boxShadow: isDark ? shadows.dark.md : shadows.light.md,
          }}
        >
          <h3 
            style={{
              fontSize: typography.size['2xl'],
              fontWeight: typography.weight.semibold,
              marginBottom: spacing['4'],
              color: currentColors.text.primary,
            }}
          >
            Paleta de Cores
          </h3>
          
          <div className="space-y-3">
            {[
              { label: 'Acento Primário', color: currentColors.accent.primary },
              { label: 'Sucesso', color: currentColors.success.default },
              { label: 'Erro', color: currentColors.error.default },
              { label: 'Aviso', color: currentColors.warning.default },
              { label: 'Info', color: currentColors.info.default },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div 
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: radius.md,
                    background: item.color,
                    boxShadow: `0 0 0 1px ${currentColors.border.default}`,
                  }}
                />
                <div>
                  <p 
                    style={{
                      fontSize: typography.size.sm,
                      fontWeight: typography.weight.medium,
                      color: currentColors.text.primary,
                    }}
                  >
                    {item.label}
                  </p>
                  <p 
                    style={{
                      fontSize: typography.size.xs,
                      color: currentColors.text.tertiary,
                      fontFamily: typography.family.mono,
                    }}
                  >
                    {item.color}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Card 2: Tipografia */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: currentColors.background.secondary,
            border: `1px solid ${currentColors.border.default}`,
            borderRadius: radius.xl,
            padding: spacing.lg,
            boxShadow: isDark ? shadows.dark.md : shadows.light.md,
          }}
        >
          <h3 
            style={{
              fontSize: typography.size['2xl'],
              fontWeight: typography.weight.semibold,
              marginBottom: spacing['4'],
              color: currentColors.text.primary,
            }}
          >
            Tipografia
          </h3>
          
          <div className="space-y-2">
            {[
              { label: 'Display', size: typography.size['3xl'], weight: typography.weight.bold },
              { label: 'Heading', size: typography.size['2xl'], weight: typography.weight.semibold },
              { label: 'Subheading', size: typography.size.xl, weight: typography.weight.medium },
              { label: 'Body', size: typography.size.base, weight: typography.weight.normal },
              { label: 'Caption', size: typography.size.sm, weight: typography.weight.normal },
            ].map((item) => (
              <div key={item.label}>
                <p 
                  style={{
                    fontSize: item.size,
                    fontWeight: item.weight,
                    color: currentColors.text.primary,
                  }}
                >
                  The quick brown fox
                </p>
                <p 
                  style={{
                    fontSize: typography.size.xs,
                    color: currentColors.text.tertiary,
                    marginTop: spacing['1'],
                  }}
                >
                  {item.label} • {item.size} • {item.weight}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Card 3: Botões */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: currentColors.background.secondary,
            border: `1px solid ${currentColors.border.default}`,
            borderRadius: radius.xl,
            padding: spacing.lg,
            boxShadow: isDark ? shadows.dark.md : shadows.light.md,
          }}
        >
          <h3 
            style={{
              fontSize: typography.size['2xl'],
              fontWeight: typography.weight.semibold,
              marginBottom: spacing['4'],
              color: currentColors.text.primary,
            }}
          >
            Componentes
          </h3>
          
          <div className="space-y-3">
            {/* Botão Primário */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                background: currentColors.interactive.default,
                color: currentColors.text.inverse,
                border: 'none',
                borderRadius: radius.lg,
                padding: `${spacing['3']} ${spacing['4']}`,
                fontSize: typography.size.base,
                fontWeight: typography.weight.medium,
                cursor: 'pointer',
                boxShadow: isDark ? shadows.dark.sm : shadows.light.sm,
                transition: `all ${animations.duration.normal} ${animations.easing.easeInOut}`,
              }}
            >
              Botão Primário
            </motion.button>

            {/* Botão com Acento */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                background: currentColors.accent.primary,
                color: isDark ? currentColors.text.inverse : currentColors.text.primary,
                border: 'none',
                borderRadius: radius.lg,
                padding: `${spacing['3']} ${spacing['4']}`,
                fontSize: typography.size.base,
                fontWeight: typography.weight.medium,
                cursor: 'pointer',
                boxShadow: isDark ? shadows.dark.glowYellow : shadows.light.glowYellow,
                transition: `all ${animations.duration.normal} ${animations.easing.easeInOut}`,
              }}
            >
              Botão com Acento
            </motion.button>

            {/* Botão Outline */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                background: 'transparent',
                color: currentColors.text.primary,
                border: `1px solid ${currentColors.border.default}`,
                borderRadius: radius.lg,
                padding: `${spacing['3']} ${spacing['4']}`,
                fontSize: typography.size.base,
                fontWeight: typography.weight.medium,
                cursor: 'pointer',
                transition: `all ${animations.duration.normal} ${animations.easing.easeInOut}`,
              }}
            >
              Botão Outline
            </motion.button>

            {/* Input */}
            <input
              placeholder="Digite algo..."
              style={{
                width: '100%',
                background: currentColors.background.primary,
                color: currentColors.text.primary,
                border: `1px solid ${currentColors.border.default}`,
                borderRadius: radius.md,
                padding: `${spacing['3']} ${spacing['4']}`,
                fontSize: typography.size.base,
                outline: 'none',
                transition: `all ${animations.duration.normal} ${animations.easing.easeInOut}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = currentColors.accent.primary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${currentColors.accent.subtle}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = currentColors.border.default;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </motion.div>

        {/* Card 4: Elevações */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: currentColors.background.secondary,
            border: `1px solid ${currentColors.border.default}`,
            borderRadius: radius.xl,
            padding: spacing.lg,
            boxShadow: isDark ? shadows.dark.md : shadows.light.md,
          }}
        >
          <h3 
            style={{
              fontSize: typography.size['2xl'],
              fontWeight: typography.weight.semibold,
              marginBottom: spacing['4'],
              color: currentColors.text.primary,
            }}
          >
            Elevações (Shadows)
          </h3>
          
          <div className="space-y-3">
            {[
              { label: 'Small', shadow: isDark ? shadows.dark.sm : shadows.light.sm },
              { label: 'Medium', shadow: isDark ? shadows.dark.md : shadows.light.md },
              { label: 'Large', shadow: isDark ? shadows.dark.lg : shadows.light.lg },
              { label: 'Extra Large', shadow: isDark ? shadows.dark.xl : shadows.light.xl },
            ].map((item) => (
              <div 
                key={item.label}
                style={{
                  background: currentColors.background.primary,
                  border: `1px solid ${currentColors.border.default}`,
                  borderRadius: radius.md,
                  padding: spacing['4'],
                  boxShadow: item.shadow,
                }}
              >
                <p 
                  style={{
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.medium,
                    color: currentColors.text.primary,
                  }}
                >
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Footer com Informações */}
      <div 
        className="max-w-6xl mx-auto mt-12 p-6 text-center"
        style={{
          background: currentColors.background.secondary,
          border: `1px solid ${currentColors.border.default}`,
          borderRadius: radius.xl,
          boxShadow: isDark ? shadows.dark.sm : shadows.light.sm,
        }}
      >
        <p 
          style={{
            fontSize: typography.size.sm,
            color: currentColors.text.secondary,
            marginBottom: spacing['2'],
          }}
        >
          🎨 Este componente demonstra o uso do Design System unificado
        </p>
        <p 
          style={{
            fontSize: typography.size.xs,
            color: currentColors.text.tertiary,
            fontFamily: typography.family.mono,
          }}
        >
          Todas as cores, espaçamentos e animações vêm de /design-tokens.ts
        </p>
      </div>
    </div>
  );
}
