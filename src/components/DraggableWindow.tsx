import React, { useState, useEffect } from 'react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { X } from 'lucide-react';

interface DraggableWindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  color?: string;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  constraintsRef?: React.RefObject<Element>;
  onFocus?: (id: string) => void;
  onClose?: (id: string) => void;
  onPositionChange?: (id: string, x: number, y: number) => void;
}

const DraggableWindow: React.FC<DraggableWindowProps> = ({ 
  id, 
  title, 
  children, 
  color = "bg-[#ffd6e0]",
  defaultPosition = { x: 0, y: 0 },
  zIndex = 10,
  constraintsRef,
  onFocus,
  onClose,
  onPositionChange
}) => {
  const dragControls = useDragControls();
  
  // Custom Size & Position State for 4-way resizing
  const [size, setSize] = useState({ width: 320, height: 400 });
  const x = useMotionValue(defaultPosition.x);
  const y = useMotionValue(defaultPosition.y);

  // Sync initial position (in case it changes)
  useEffect(() => {
    x.set(defaultPosition.x);
    y.set(defaultPosition.y);
  }, [defaultPosition.x, defaultPosition.y]);

  const handleDragEnd = () => {
    onPositionChange?.(id, x.get(), y.get());
  };

  const handleResize = (edge: string, info: any) => {
    let newWidth = size.width;
    let newHeight = size.height;
    let newX = x.get();
    let newY = y.get();

    if (edge.includes('right')) newWidth = Math.max(300, size.width + info.delta.x);
    if (edge.includes('bottom')) newHeight = Math.max(200, size.height + info.delta.y);
    
    if (edge.includes('left')) {
      const possibleWidth = size.width - info.delta.x;
      if (possibleWidth >= 300) {
        newWidth = possibleWidth;
        newX += info.delta.x;
      }
    }
    
    if (edge.includes('top')) {
      const possibleHeight = size.height - info.delta.y;
      if (possibleHeight >= 200) {
        newHeight = possibleHeight;
        newY += info.delta.y;
      }
    }

    setSize({ width: newWidth, height: newHeight });
    x.set(newX);
    y.set(newY);
    // Don't save position to storage until drag ends, but resize might need to save too in a full implementation.
  };

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragConstraints={constraintsRef}
      dragElastic={0.8}
      dragTransition={{ bounceStiffness: 400, bounceDamping: 10 }}
      onMouseDown={() => onFocus?.(id)}
      onDragEnd={handleDragEnd}
      style={{ 
        zIndex, 
        x, 
        y, 
        width: size.width, 
        height: size.height,
        position: 'absolute' 
      }}
      className="mobile-window-fallback flex flex-col bg-[#fdfaf6] border-[3px] border-[#5a5a5a] rounded-xl shadow-[4px_4px_0px_0px_#5a5a5a] overflow-hidden"
    >
      {/* Title Bar (Drag Handle) */}
      <div 
        className={`px-4 py-2 border-b-[3px] border-[#5a5a5a] flex items-center justify-between cursor-grab active:cursor-grabbing ${color}`}
        onPointerDown={(e) => dragControls.start(e)}
        style={{ touchAction: "none" }}
      >
        <h3 className="font-bold text-sm text-[#5a5a5a] truncate pr-4">{title}</h3>
        {onClose && (
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(id); }}
            className="w-5 h-5 rounded-full bg-white/50 border-2 border-[#5a5a5a] flex items-center justify-center hover:bg-white transition-colors"
          >
            <X className="w-3 h-3 text-[#5a5a5a]" />
          </button>
        )}
      </div>
      
      {/* Content Area */}
      <div className="p-4 flex-1 overflow-y-auto w-full h-full">
        {children}
      </div>
      
      {/* 4-Way Resize Handles */}
      <motion.div onPan={(e, i) => handleResize('right', i)} className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize z-50" />
      <motion.div onPan={(e, i) => handleResize('left', i)} className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize z-50" />
      <motion.div onPan={(e, i) => handleResize('bottom', i)} className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize z-50" />
      <motion.div onPan={(e, i) => handleResize('top', i)} className="absolute top-0 left-0 right-0 h-2 cursor-n-resize z-50" />
      
      {/* Corners */}
      <motion.div onPan={(e, i) => handleResize('bottom-right', i)} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50" />
      <motion.div onPan={(e, i) => handleResize('bottom-left', i)} className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50" />
      <motion.div onPan={(e, i) => handleResize('top-right', i)} className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-50" />
      <motion.div onPan={(e, i) => handleResize('top-left', i)} className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50" />

      {/* Visual Resize Indicator (Bottom Right) */}
      <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-[#5a5a5a]/50 pointer-events-none" />
    </motion.div>
  );
};

export default React.memo(DraggableWindow);
