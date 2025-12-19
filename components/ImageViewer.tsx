
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
      className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 text-white bg-white/5 hover:bg-white/10 w-14 h-14 rounded-full flex items-center justify-center transition-all z-[110] border border-white/5"
      >
        <i className="fas fa-times text-xl"></i>
      </button>

      {images.length > 1 && (
        <>
          <button 
            onClick={prev}
            className="absolute left-8 top-1/2 -translate-y-1/2 text-white bg-white/5 hover:bg-white/10 w-20 h-20 rounded-full flex items-center justify-center transition-all z-[110] border border-white/5"
          >
            <i className="fas fa-chevron-left text-2xl"></i>
          </button>
          <button 
            onClick={next}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-white bg-white/5 hover:bg-white/10 w-20 h-20 rounded-full flex items-center justify-center transition-all z-[110] border border-white/5"
          >
            <i className="fas fa-chevron-right text-2xl"></i>
          </button>
        </>
      )}

      <div className="relative max-w-full max-h-full flex flex-col items-center">
        <div className="relative group p-4">
          <img 
            src={currentImage.data} 
            className="max-w-full max-h-[80vh] object-contain rounded-[2.5rem] shadow-2xl animate-zoom-in border-4 border-white/5"
            alt={`Visualização ${currentIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        <div className="mt-10 max-w-3xl w-full text-center space-y-4 px-6" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-2">
            <span className="text-orange-500 text-[11px] font-black uppercase tracking-[0.3em]">
              Evidência de Campo • {currentIndex + 1} de {images.length}
            </span>
          </div>

          <div className="flex items-center justify-center gap-6 pt-4">
            <a 
              href={currentImage.data} 
              download={`evidencia_tecnica_hv.png`}
              className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-4 shadow-2xl shadow-orange-600/20 active:scale-95"
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
