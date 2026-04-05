import { Progress } from "./ui/progress";
import { CheckCircle } from "lucide-react";

interface Step {
  label: string;
  completed: boolean;
  current?: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  totalSteps: number;
  showLabels?: boolean;
  variant?: 'linear' | 'steps';
  className?: string;
}

export function ProgressIndicator({ 
  steps, 
  currentStep, 
  totalSteps, 
  showLabels = true,
  variant = 'linear',
  className = "" 
}: ProgressIndicatorProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  if (variant === 'steps') {
    return (
      <div className={`w-full ${className}`} role="progressbar" aria-valuenow={currentStep} aria-valuemax={totalSteps}>
        <div className="flex justify-between items-center mb-2">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                step.completed 
                  ? 'bg-primary border-primary text-primary-foreground'
                  : step.current
                    ? 'border-primary text-primary bg-background'
                    : 'border-muted-foreground text-muted-foreground bg-background'
              }`}>
                {step.completed ? (
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              {showLabels && (
                <span className={`text-xs mt-2 text-center max-w-20 ${
                  step.completed || step.current ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* Connecting lines */}
        <div className="flex justify-between items-center -mt-6 px-4">
          {steps.slice(0, -1).map((_, index) => (
            <div
              key={index}
              className={`h-0.5 flex-1 mx-2 transition-colors ${
                index < currentStep - 1 ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Progresso</span>
        <span className="font-medium">{currentStep} de {totalSteps}</span>
      </div>
      <Progress 
        value={progressPercentage} 
        className="h-2"
        aria-label={`Progresso: ${currentStep} de ${totalSteps} etapas concluídas`}
      />
      <div className="text-xs text-muted-foreground text-center">
        {Math.round(progressPercentage)}% concluído
      </div>
    </div>
  );
}