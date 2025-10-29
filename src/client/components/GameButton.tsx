import React from 'react';

interface GameButtonProps {
  variant: 'primary' | 'secondary' | 'creative';
  icon: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const GameButton: React.FC<GameButtonProps> = ({
  variant,
  icon,
  children,
  onClick,
  disabled = false,
  className = '',
  style = {}
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'game-btn-primary';
      case 'secondary':
        return 'game-btn-secondary';
      case 'creative':
        return 'game-btn-creative';
      default:
        return 'game-btn-secondary';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <button
      className={`game-btn ${getVariantClass()} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      style={style}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`${children} ${icon}`}
    >
      <span className="game-btn-icon" role="img" aria-label={icon}>
        {icon}
      </span>
      <span>{children}</span>
    </button>
  );
};

export default GameButton;