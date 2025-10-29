import React from 'react';

interface MascotHeaderProps {
  showAnimation?: boolean;
  username?: string | null;
}

const MascotHeader: React.FC<MascotHeaderProps> = ({ 
  showAnimation = true, 
  username 
}) => {
  return (
    <div className="text-center mb-4 sm:mb-6 lg:mb-8">
      {/* Logo */}
      <div className={`mb-2 sm:mb-3 lg:mb-4 ${showAnimation ? 'animate-breathe' : ''}`}>
        <img 
          src="/sudomojilogo.png" 
          alt="Sudomoji Logo" 
          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 mx-auto object-contain logo-image"
        />
      </div>
      
      {/* Game Title */}
      <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 ${showAnimation ? 'animate-slide-up' : ''} text-shadow`}>
        Sudomoji
      </h1>
      
      {/* Welcome Message */}
      {username && (
        <p 
          className={`text-sm sm:text-base lg:text-lg text-gray-200 mt-1 sm:mt-2 ${showAnimation ? 'animate-slide-up' : ''}`}
          style={showAnimation ? {animationDelay: '0.1s'} : {}}
        >
          Welcome back, {username}!
        </p>
      )}
    </div>
  );
};

export default MascotHeader;