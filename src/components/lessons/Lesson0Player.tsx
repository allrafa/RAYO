// 🎯 LIÇÃO 0 - PLAYER COMPLETO
// "Frases que Destroem, Palavras que Constroem"

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Card } from '../ui/card';
import { PlayCircle, PauseCircle, Volume2, VolumeX, Check, X } from 'lucide-react';
import { lesson0Content, commonPhrasesMistakes } from '../../lib/lessons/lesson-0-content';
import { useApp } from '../AppContext';
import Confetti from 'react-confetti';

interface Lesson0PlayerProps {
  onComplete: () => void;
  userProfile?: {
    family_stage: 'solteiro' | 'namoro' | 'noivos' | 'casados' | 'pais';
  };
}

export function Lesson0Player({ onComplete, userProfile }: Lesson0PlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [startTime] = useState(Date.now());
  
  const totalSteps = 7; // Intro, Audio, Quiz, Reflection, Scenario, Revelation, Challenge
  const progressPercent = (currentStep / totalSteps) * 100;
  
  const handleStepComplete = useCallback((stepData: any) => {
    setAnswers({ ...answers, [`step_${currentStep}`]: stepData });
    
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Lição completa!
      handleLessonComplete();
    }
  }, [currentStep, answers]);
  
  const handleLessonComplete = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // 🔴 BACKEND REQUIRED - Salvar progresso
    // await supabase.from('user_lesson_progress').insert({
    //   user_id: userId,
    //   lesson_id: lesson0Content.id,
    //   completed_at: new Date(),
    //   time_spent_seconds: timeSpent,
    //   step_results: answers,
    //   xp_earned: lesson0Content.xp_reward,
    //   hearts_earned: lesson0Content.hearts_reward
    // });
    
    // MOCK - localStorage
    localStorage.setItem('lesson_0_completed', JSON.stringify({
      completed: true,
      completedAt: new Date(),
      answers,
      timeSpent
    }));
    
    // Analytics
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track('LESSON_COMPLETED', {
        lesson_id: lesson0Content.id,
        lesson_title: lesson0Content.title,
        time_spent_seconds: timeSpent,
        family_stage: userProfile?.family_stage
      });
    }
    
    // Celebração
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      onComplete();
    }, 5000);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      {/* Header com progresso */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b z-10 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">{lesson0Content.title}</h2>
            <span className="text-xs text-gray-500">
              {currentStep + 1}/{totalSteps}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>
      
      {/* Confetti */}
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      {/* Content */}
      <div className="max-w-2xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <IntroStep onComplete={handleStepComplete} />
          )}
          
          {currentStep === 1 && (
            <AudioStep onComplete={handleStepComplete} />
          )}
          
          {currentStep === 2 && (
            <QuizStep onComplete={handleStepComplete} />
          )}
          
          {currentStep === 3 && (
            <ReflectionStep onComplete={handleStepComplete} />
          )}
          
          {currentStep === 4 && (
            <ScenarioStep 
              onComplete={handleStepComplete}
              familyStage={userProfile?.family_stage || 'casados'}
            />
          )}
          
          {currentStep === 5 && (
            <RevelationStep onComplete={handleStepComplete} />
          )}
          
          {currentStep === 6 && (
            <ChallengeStep 
              onComplete={handleStepComplete}
              familyStage={userProfile?.family_stage || 'casados'}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// STEP 1: Intro
function IntroStep({ onComplete }: { onComplete: (data: any) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">{lesson0Content.intro.title}</h1>
        
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 space-y-3">
          {lesson0Content.intro.examples.map((example, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="text-left"
            >
              <p className="text-lg text-gray-700">💬 {example}</p>
            </motion.div>
          ))}
        </div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-lg text-gray-700"
        >
          {lesson0Content.intro.hook}
        </motion.p>
      </div>
      
      <Button 
        size="lg" 
        className="w-full"
        onClick={() => onComplete({ viewed: true })}
      >
        Continuar →
      </Button>
    </motion.div>
  );
}

// STEP 2: Audio
function AudioStep({ onComplete }: { onComplete: (data: any) => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [isMuted, setIsMuted] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  
  const progress = (currentTime / duration) * 100;
  
  // 🔴 BACKEND REQUIRED - Usar áudio real
  // const audioUrl = lesson0Content.audioStep.audio_url;
  
  // MOCK - Simular áudio
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime(t => {
          if (t >= duration) {
            setIsPlaying(false);
            setHasListened(true);
            return duration;
          }
          return t + 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, duration]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="text-6xl mb-4">🎧</div>
        <h2 className="text-2xl font-bold">Escute com atenção</h2>
        <p className="text-gray-600">
          Esta mensagem vai mudar a forma como você se comunica
        </p>
      </div>
      
      {/* Audio Player */}
      <Card className="p-6 space-y-4">
        {/* Waveform visual (decorativo) */}
        <div className="flex items-center justify-center gap-1 h-20">
          {Array.from({ length: 40 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-yellow-400 rounded-full"
              animate={{
                height: isPlaying 
                  ? [20, Math.random() * 60 + 20, 20]
                  : 20
              }}
              transition={{
                duration: 0.5,
                repeat: isPlaying ? Infinity : 0,
                delay: i * 0.05
              }}
            />
          ))}
        </div>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-gray-600" />
            ) : (
              <Volume2 className="w-5 h-5 text-gray-600" />
            )}
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-4 bg-yellow-400 hover:bg-yellow-500 rounded-full transition"
          >
            {isPlaying ? (
              <PauseCircle className="w-8 h-8 text-white" />
            ) : (
              <PlayCircle className="w-8 h-8 text-white" />
            )}
          </button>
          
          <button
            onClick={() => setCurrentTime(0)}
            className="p-2 hover:bg-gray-100 rounded-full transition text-sm"
          >
            Reiniciar
          </button>
        </div>
      </Card>
      
      {/* Transcript (opcional) */}
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="cursor-pointer text-sm text-gray-600 font-medium">
          Ver transcrição
        </summary>
        <div className="mt-4 text-sm text-gray-700 space-y-2 whitespace-pre-line">
          {lesson0Content.audioStep.script}
        </div>
      </details>
      
      <Button 
        size="lg" 
        className="w-full"
        onClick={() => onComplete({ listened: hasListened, timeListened: currentTime })}
        disabled={!hasListened}
      >
        {hasListened ? 'Continuar →' : 'Termine de ouvir para continuar'}
      </Button>
    </motion.div>
  );
}

// STEP 3: Quiz
function QuizStep({ onComplete }: { onComplete: (data: any) => void }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  const quizData = lesson0Content.quizStep;
  const selectedAnswer = quizData.options.find(opt => opt.id === selectedOption);
  
  const handleSelect = (optionId: string) => {
    setSelectedOption(optionId);
    setShowFeedback(true);
    
    // Analytics
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track('LESSON_STEP_COMPLETED', {
        lesson_id: lesson0Content.id,
        step_id: 'quiz',
        answer: optionId,
        correct: quizData.options.find(o => o.id === optionId)?.isCorrect
      });
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Quiz</h2>
        <p className="text-gray-600">{quizData.question}</p>
      </div>
      
      <div className="space-y-3">
        {quizData.options.map((option) => (
          <motion.button
            key={option.id}
            onClick={() => !showFeedback && handleSelect(option.id)}
            disabled={showFeedback}
            className={`
              w-full p-4 text-left rounded-xl border-2 transition
              ${selectedOption === option.id 
                ? option.isCorrect 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-yellow-400'
              }
              ${showFeedback && !option.isCorrect ? 'opacity-50' : ''}
            `}
            whileHover={{ scale: showFeedback ? 1 : 1.02 }}
            whileTap={{ scale: showFeedback ? 1 : 0.98 }}
          >
            <div className="flex items-start gap-3">
              <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${selectedOption === option.id 
                  ? option.isCorrect 
                    ? 'border-green-500 bg-green-500' 
                    : 'border-red-500 bg-red-500'
                  : 'border-gray-300'
                }
              `}>
                {selectedOption === option.id && (
                  option.isCorrect ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <X className="w-4 h-4 text-white" />
                  )
                )}
              </div>
              
              <div className="flex-1">
                <p className="font-medium">{option.text}</p>
                
                {showFeedback && selectedOption === option.id && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`mt-2 text-sm ${
                      option.isCorrect ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {option.feedback}
                  </motion.p>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
      
      {showFeedback && (
        <Button 
          size="lg" 
          className="w-full"
          onClick={() => onComplete({ 
            answer: selectedOption, 
            correct: selectedAnswer?.isCorrect 
          })}
        >
          Continuar →
        </Button>
      )}
    </motion.div>
  );
}

// STEP 4: Reflection
function ReflectionStep({ onComplete }: { onComplete: (data: any) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  
  const reflectionData = lesson0Content.reflectionStep;
  const selectedOption = reflectionData.options.find(opt => opt.value === selected);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="text-5xl mb-4">🤔</div>
        <h2 className="text-2xl font-bold mb-2">Momento de Reflexão</h2>
        <p className="text-gray-600">{reflectionData.question}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {reflectionData.options.map((option) => (
          <motion.button
            key={option.value}
            onClick={() => setSelected(option.value)}
            className={`
              p-6 rounded-xl border-2 transition text-center
              ${selected === option.value 
                ? 'border-yellow-400 bg-yellow-50' 
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-4xl mb-2">{option.emoji}</div>
            <p className="font-medium text-sm">{option.label}</p>
          </motion.button>
        ))}
      </div>
      
      {selected && selectedOption && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4"
        >
          <p className="text-sm text-blue-900">
            💡 {selectedOption.insight}
          </p>
        </motion.div>
      )}
      
      <Button 
        size="lg" 
        className="w-full"
        onClick={() => onComplete({ reflection: selected })}
        disabled={!selected}
      >
        {selected ? 'Continuar →' : 'Escolha uma opção para continuar'}
      </Button>
    </motion.div>
  );
}

// STEP 5: Scenario (adaptado por contexto familiar)
function ScenarioStep({ 
  onComplete, 
  familyStage 
}: { 
  onComplete: (data: any) => void;
  familyStage: string;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const scenarioData = lesson0Content.scenarioStep;
  const selectedChoice = scenarioData.options.find(opt => opt.id === selectedOption);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{scenarioData.title}</h2>
      </div>
      
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200">
        <p className="text-gray-700 whitespace-pre-line">
          {scenarioData.scenario}
        </p>
      </Card>
      
      <div>
        <p className="font-semibold mb-3">O que você diz?</p>
        
        <div className="space-y-3">
          {scenarioData.options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setSelectedOption(option.id);
                setShowAnalysis(true);
              }}
              disabled={showAnalysis}
              className={`
                w-full p-4 text-left rounded-xl border-2 transition
                ${selectedOption === option.id 
                  ? option.creates_connection
                    ? 'border-green-500 bg-green-50' 
                    : 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <p className="font-medium mb-2">{option.text}</p>
              
              {showAnalysis && selectedOption === option.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 pt-3 border-t space-y-2 text-sm"
                >
                  <p>
                    <span className="font-semibold">Tom:</span>{' '}
                    <span className={
                      option.tone === 'construtiva' ? 'text-green-700' : 'text-red-700'
                    }>
                      {option.tone}
                    </span>
                  </p>
                  
                  <p className="text-gray-700">
                    <span className="font-semibold">O que acontece:</span>{' '}
                    {option.consequence}
                  </p>
                  
                  {option.creates_connection && option.rayo_teaches && (
                    <div className="bg-green-100 p-3 rounded-lg mt-2">
                      <p className="text-green-900 font-medium">
                        ✨ {option.rayo_teaches}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {showAnalysis && (
        <Button 
          size="lg" 
          className="w-full"
          onClick={() => onComplete({ 
            scenario_choice: selectedOption,
            chose_constructive: selectedChoice?.creates_connection 
          })}
        >
          Continuar →
        </Button>
      )}
    </motion.div>
  );
}

// STEP 6: Revelation
function RevelationStep({ onComplete }: { onComplete: (data: any) => void }) {
  const revelationData = lesson0Content.revelationStep;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="text-6xl mb-4">💡</div>
        <h2 className="text-3xl font-bold">{revelationData.title}</h2>
      </div>
      
      <div className="space-y-4">
        {revelationData.points.map((point, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 }}
          >
            <Card className="p-4 border-l-4 border-l-red-400">
              <p className="font-medium text-gray-700 mb-2">{point.myth}</p>
              <p className="text-green-700 font-semibold">{point.truth}</p>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300">
        <p className="text-lg font-bold text-center text-gray-800">
          {revelationData.key_insight}
        </p>
      </Card>
      
      <Button 
        size="lg" 
        className="w-full"
        onClick={() => onComplete({ revelation_viewed: true })}
      >
        Continuar →
      </Button>
    </motion.div>
  );
}

// STEP 7: Challenge
function ChallengeStep({ 
  onComplete,
  familyStage 
}: { 
  onComplete: (data: any) => void;
  familyStage: string;
}) {
  const [accepted, setAccepted] = useState(false);
  
  const challengeData = lesson0Content.challengeStep;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-3xl font-bold">{challengeData.title}</h2>
      </div>
      
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300">
        <p className="text-lg font-semibold mb-4 text-gray-800">
          {challengeData.challenge}
        </p>
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">Exemplos:</p>
          {challengeData.examples.map((example, i) => (
            <p key={i} className="text-sm text-gray-700 pl-4 border-l-2 border-blue-300">
              {example}
            </p>
          ))}
        </div>
      </Card>
      
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 space-y-2">
        <p className="font-semibold text-gray-800">Por que fazer isso?</p>
        <p className="text-sm text-gray-700">{challengeData.why}</p>
        <p className="text-xs text-gray-600 italic">{challengeData.reminder}</p>
      </div>
      
      <div className="flex gap-3">
        <Button 
          size="lg" 
          className="flex-1"
          variant={accepted ? 'default' : 'outline'}
          onClick={() => setAccepted(true)}
        >
          {accepted ? '✅ Desafio Aceito!' : 'Aceitar Desafio'}
        </Button>
        
        {accepted && (
          <Button 
            size="lg" 
            className="flex-1"
            onClick={() => onComplete({ challenge_accepted: true })}
          >
            Finalizar Lição →
          </Button>
        )}
      </div>
      
      {!accepted && (
        <Button 
          variant="ghost"
          className="w-full"
          onClick={() => onComplete({ challenge_accepted: false })}
        >
          Pular desafio
        </Button>
      )}
    </motion.div>
  );
}
