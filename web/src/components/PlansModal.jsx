import React from 'react';
import { X, Check, PawPrint, Sparkle, Crown } from '@phosphor-icons/react';

const PLANS = [
  {
    id: 'Free',
    icon: PawPrint,
    price: '0 ₽',
    period: '',
    tagline: '2 дня Base, потом Low-доступ',
    features: [
      '2 дня полного доступа к возможностям Base',
      'Затем 5 дней Low-доступа: без распознавания изображений',
      'Модели Deepseek и Qwen',
      'Без генерации изображений',
      'Дальше — только Research с текстовыми запросами на бесплатных моделях',
    ],
  },
  {
    id: 'Base',
    icon: Sparkle,
    price: '399 ₽',
    period: '/мес',
    tagline: 'Для учёбы каждый день',
    features: [
      'База учебников и веб-поиск',
      'Генерация изображений и документов моделью — до 2 в день',
      'Распознавание изображений и голосовой ввод',
      'Авто-ответы на Skysmart, ЯКласс и другие платформы',
      'Презентации, непохожие на ИИ-слоп',
      'Авто-обучаемые скиллы под конкретные предметы и учителей',
    ],
  },
  {
    id: 'Pro',
    icon: Crown,
    price: '990 ₽',
    period: '/мес',
    tagline: 'Максимум возможностей',
    features: [
      'Всё, что есть в Base',
      'Генерация шпаргалок',
      'Ссылки на сгенерированные файлы',
      'Генерация изображений — до 5 в день',
      'Экспериментальные модели и функции',
    ],
  },
];

export default function PlansModal({ open, onClose, currentPlan, onSelectPlan }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 overflow-y-auto py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl rounded-sm bg-bg-elevated border border-border p-5 md:p-6 animate-popIn"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-[21px] text-text-primary">Тарифы</h2>
            <p className="text-[13px] text-text-secondary mt-0.5">
              Выбери план под свои задачи, сменить можно в любой момент
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1"
            aria-label="Закрыть"
          >
            <X size={19} />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlan;
            const isFeatured = plan.id === 'Base';
            return (
              <div
                key={plan.id}
                className={`relative rounded-sm border p-4 flex flex-col
                  ${isFeatured ? 'border-accent' : 'border-border'} bg-bg`}
              >
                {isFeatured && (
                  <span className="absolute -top-2.5 left-4 text-[10px] font-medium px-2 py-0.5 rounded-xs bg-accent text-accent-on">
                    Популярный
                  </span>
                )}

                <span className="grid place-items-center w-8 h-8 rounded-sm mb-3 bg-bg-elevated text-text-secondary border border-border">
                  <Icon size={16} />
                </span>

                <h3 className="text-[15px] font-medium text-text-primary">{plan.id}</h3>
                <p className="text-[12px] text-text-secondary mt-0.5">{plan.tagline}</p>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[22px] font-display text-text-primary">{plan.price}</span>
                  <span className="text-[12px] text-text-tertiary">{plan.period}</span>
                </div>

                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12.5px] text-text-primary leading-snug">
                      <Check size={13} className="text-text-tertiary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onSelectPlan(plan.id)}
                  disabled={isCurrent}
                  className={`mt-4 w-full py-2 rounded-sm text-[13px] font-medium transition-colors
                    ${
                      isCurrent
                        ? 'bg-bg-hover text-text-tertiary cursor-default'
                        : isFeatured
                        ? 'bg-accent text-accent-on hover:bg-accent-hover'
                        : 'border border-border text-text-primary hover:bg-bg-hover'
                    }`}
                >
                  {isCurrent ? 'Текущий план' : 'Выбрать'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[12px] text-text-tertiary leading-relaxed">
          Без регистрации: Research с текстовыми запросами на бесплатных моделях, распознавание
          изображений через OCR — до 3 в день.
        </p>
      </div>
    </div>
  );
}
