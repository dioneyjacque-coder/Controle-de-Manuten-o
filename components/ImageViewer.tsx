
import React, { useState } from 'react';
import { MaintenanceImage } from '../types';

interface ImageViewerProps {
  images: MaintenanceImage[];
  initialIndex: number;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const currentImage = images[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 w-12 h-12 rounded-full flex items-center justify-center transition-all z-[110]"
      >
        <i className="fas fa-times text-xl"></i>
      </button>

      {images.length > 1 && (
        <>
          <button 
            onClick={prev}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 w-14 h-14 rounded-full flex items-center justify-center transition-all z-[110]"
          >
            <i className="fas fa-chevron-left text-2xl"></i>
          </button>
          <button 
            onClick={next}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 w-14 h-14 rounded-full flex items-center justify-center transition-all z-[110]"
          >
            <i className="fas fa-chevron-right text-2xl"></i>
          </button>
        </>
      )}

      <div className="relative max-w-full max-h-full flex flex-col items-center">
        <div className="relative group">
          <img 
            src={currentImage.data} 
            className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl animate-zoom-in border-2 border-white/10"
            alt={`Visualização ${currentIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        <div className="mt-8 max-w-2xl w-full text-center space-y-4 px-4" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1">
            <span className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">
              Evidência Técnica {currentIndex + 1} de {images.length}
            </span>
            {currentImage.description ? (
              <p className="text-white text-lg font-medium leading-relaxed bg-white/5 p-6 rounded-3xl border border-white/10 shadow-inner">
                {currentImage.description}
              </p>
            ) : (
              <p className="text-white/30 italic text-sm">Sem descrição técnica detalhada para esta foto.</p>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <a 
              href={currentImage.data} 
              download={`manutencao_imagem_${currentIndex + 1}.png`}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-2xl text-xs font-black transition-all flex items-center space-x-3 shadow-xl"
            >
              <i className="fas fa-download"></i>
              <span>Baixar Original</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
