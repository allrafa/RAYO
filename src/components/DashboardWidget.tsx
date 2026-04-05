import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Award, Target, Clock, Zap } from "lucide-react";

interface DashboardWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  progress?: {
    value: number;
    max: number;
    label?: string;
  };
  badges?: Array<{
    label: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  }>;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'minimal';
}

export function DashboardWidget({
  title,
  value,
  subtitle,
  icon,
  trend,
  progress,
  badges,
  action,
  className = "",
  size = 'md',
  variant = 'default'
}: DashboardWidgetProps) {
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8"
  };

  const variantClasses = {
    default: "",
    gradient: "bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20",
    minimal: "border-none shadow-none bg-transparent"
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (!trend) return "";
    
    switch (trend.direction) {
      case 'up':
        return "text-success";
      case 'down':
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card className={`${variantClasses[variant]} transition-all duration-200 hover:shadow-md`}>
        <CardContent className={sizeClasses[size]}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {icon}
                </div>
              )}
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">{title}</h3>
                {subtitle && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            
            {trend && (
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span className={`text-sm font-medium ${getTrendColor()}`}>
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
              </div>
            )}
          </div>

          {/* Main Value */}
          <div className="mb-4">
            <div className="text-2xl font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {trend?.label && (
              <p className="text-xs text-muted-foreground mt-1">{trend.label}</p>
            )}
          </div>

          {/* Progress */}
          {progress && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{progress.label || "Progresso"}</span>
                <span className="font-medium">
                  {progress.value}/{progress.max}
                </span>
              </div>
              <Progress 
                value={(progress.value / progress.max) * 100} 
                className="h-2"
              />
            </div>
          )}

          {/* Badges */}
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {badges.map((badge, index) => (
                <Badge
                  key={index}
                  variant={badge.variant || 'secondary'}
                  className="text-xs"
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          )}

          {/* Action */}
          {action && (
            <button
              onClick={action.onClick}
              className="w-full text-sm font-medium text-primary hover:text-primary/80 transition-colors text-left"
            >
              {action.label} →
            </button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Widgets pré-configurados para casos comuns
export function StatsWidget({
  title,
  value,
  change,
  period = "vs. mês anterior",
  icon
}: {
  title: string;
  value: number;
  change: number;
  period?: string;
  icon?: ReactNode;
}) {
  return (
    <DashboardWidget
      title={title}
      value={value}
      icon={icon}
      trend={{
        value: change,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
        label: period
      }}
    />
  );
}

export function ProgressWidget({
  title,
  current,
  target,
  unit = "",
  icon
}: {
  title: string;
  current: number;
  target: number;
  unit?: string;
  icon?: ReactNode;
}) {
  const percentage = Math.round((current / target) * 100);
  
  return (
    <DashboardWidget
      title={title}
      value={`${current}${unit}`}
      icon={icon}
      progress={{
        value: current,
        max: target,
        label: `Meta: ${target}${unit}`
      }}
      badges={[
        {
          label: `${percentage}% concluído`,
          variant: percentage >= 100 ? 'default' : 'secondary'
        }
      ]}
    />
  );
}

export function StreakWidget({
  currentStreak,
  bestStreak,
  unit = "dias"
}: {
  currentStreak: number;
  bestStreak: number;
  unit?: string;
}) {
  return (
    <DashboardWidget
      title="Sequência de Estudos"
      value={`${currentStreak} ${unit}`}
      subtitle={`Melhor: ${bestStreak} ${unit}`}
      icon={<Zap className="w-5 h-5" />}
      badges={[
        {
          label: currentStreak >= 7 ? "🔥 Em chamas!" : "Continue assim!",
          variant: currentStreak >= 7 ? 'default' : 'secondary'
        }
      ]}
      variant="gradient"
    />
  );
}

export function AchievementWidget({
  title,
  description,
  earned,
  total,
  recent
}: {
  title: string;
  description: string;
  earned: number;
  total: number;
  recent?: string;
}) {
  return (
    <DashboardWidget
      title={title}
      value={`${earned}/${total}`}
      subtitle={description}
      icon={<Award className="w-5 h-5" />}
      progress={{
        value: earned,
        max: total,
        label: "Conquistas desbloqueadas"
      }}
      badges={recent ? [
        {
          label: `✨ ${recent}`,
          variant: 'default'
        }
      ] : undefined}
    />
  );
}

export function TimeWidget({
  totalTime,
  weeklyGoal,
  unit = "horas"
}: {
  totalTime: number;
  weeklyGoal: number;
  unit?: string;
}) {
  const percentage = Math.round((totalTime / weeklyGoal) * 100);
  
  return (
    <DashboardWidget
      title="Tempo de Estudo"
      value={`${totalTime}h`}
      subtitle="Esta semana"
      icon={<Clock className="w-5 h-5" />}
      progress={{
        value: totalTime,
        max: weeklyGoal,
        label: `Meta semanal: ${weeklyGoal}h`
      }}
      trend={{
        value: percentage - 100,
        direction: percentage >= 100 ? 'up' : 'neutral',
        label: percentage >= 100 ? "Meta atingida!" : "Continue estudando"
      }}
    />
  );
}

// Container para organizar widgets
export function DashboardGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {children}
    </div>
  );
}