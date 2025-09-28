import React, { useEffect, useRef } from 'react';

interface MatrixRainProps {
  backgroundColor?: string;
  matrixColor?: string;
}

const MatrixRain: React.FC<MatrixRainProps> = ({ backgroundColor = '#003300', matrixColor = '#00ff00' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Matrix characters
    const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}|;:,.<>?';
    const chars = matrixChars.split('');

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = [];

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * canvas.height;
    }

    // Convert matrixColor to RGB for variations
    const hexToRgbForMatrix = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 255, b: 0 };
    };

    const matrixRgb = hexToRgbForMatrix(matrixColor);
    
    const draw = () => {
      // Semi-transparent black to create trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Add some brightness variation using the matrix color
        const brightness = Math.random();
        if (brightness > 0.95) {
          ctx.fillStyle = '#ffffff'; // Bright white for highlights
        } else if (brightness > 0.8) {
          // Bright version of matrix color
          ctx.fillStyle = `rgb(${Math.min(255, matrixRgb.r + 40)}, ${Math.min(255, matrixRgb.g + 40)}, ${Math.min(255, matrixRgb.b + 40)})`;
        } else {
          // Dim version of matrix color
          ctx.fillStyle = `rgb(${Math.floor(matrixRgb.r * 0.7)}, ${Math.floor(matrixRgb.g * 0.7)}, ${Math.floor(matrixRgb.b * 0.7)})`;
        }

        ctx.fillText(text, x, y);

        // Reset drop if it falls off screen or randomly
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33); // ~30fps

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [matrixColor]);

  // Convert hex to RGB and create gradient
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 51, b: 0 };
  };

  const rgb = hexToRgb(backgroundColor);
  const gradient = `linear-gradient(180deg, #000000, rgb(${Math.floor(rgb.r * 0.3)}, ${Math.floor(rgb.g * 0.3)}, ${Math.floor(rgb.b * 0.3)}))`;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[-1]"
      style={{ background: gradient }}
    />
  );
};

export default MatrixRain;