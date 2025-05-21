import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';

const Calculator = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [isResult, setIsResult] = useState(false);
  const [scientific, setScientific] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const [selection, setSelection] = useState(null);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const handleCapture = () => {
    const image = webcamRef.current.getScreenshot();
    setImageSrc(image);
    setSelection(null);
  };

  const handleScan = async () => {
    if (!imageSrc || !selection) return;
    setLoading(true);
    try {
      const img = new Image();
      img.src = imageSrc;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = selection.width;
        canvas.height = selection.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          img,
          selection.x,
          selection.y,
          selection.width,
          selection.height,
          0,
          0,
          selection.width,
          selection.height
        );

        const croppedImage = canvas.toDataURL('image/png');
        const { data } = await Tesseract.recognize(croppedImage, 'eng', {
          tessedit_char_whitelist: '0123456789+-*/=().^√πe',
        });

        const cleanedText = data.text
          .toLowerCase()
          .replace(/kök/g, '√')
          .replace(/pi/g, 'π')
          .replace(/üst/g, '^')
          .replace(/log/g, 'log')
          .replace(/ln/g, 'ln')
          .replace(/[\s]+/g, '')
          .replace(/[^0-9+\-*/=().^√πe]/g, '')
          .replace(/=+$/, '');

        setInput(cleanedText);
        setShowScanner(false);
        setImageSrc(null);
        setSelection(null);
      };
    } catch (err) {
      alert('Ошибка при распознавании');
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e) => {
    const rect = e.target.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setSelection({ x: startX, y: startY, width: 0, height: 0, startX, startY });
  };

  const handleMouseMove = (e) => {
    if (!selection || selection.width !== 0 || selection.height !== 0) return;
    const rect = e.target.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const width = endX - selection.startX;
    const height = endY - selection.startY;
    setSelection((prev) => ({ ...prev, width, height }));
  };

  const handleClick = (value) => {
    if (value === 'AC' || value === 'C') {
      if (input.length === 0 || value === 'AC') {
        setInput('');
        setResult(null);
        setIsResult(false);
      } else {
        setInput((prev) => prev.slice(0, -1));
      }
    } else if (value === '=') {
      try {
        const replacedInput = input
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/√/g, 'Math.sqrt')
          .replace(/π/g, 'Math.PI')
          .replace(/(?<!Math\.)e/g, 'Math.E')
          .replace(/\^/g, '**');

        const evalResult = Function(`"use strict"; return (${replacedInput})`)();
        setResult(evalResult);
        setInput(String(evalResult));
        setIsResult(true);
      } catch {
        setResult('Error');
        setInput('');
        setIsResult(false);
      }
    } else if (['sin', 'cos', 'tan', 'log', 'ln'].includes(value)) {
      setInput((prev) => prev + value + '(');
      setIsResult(false);
    } else if (value === '√') {
      setInput((prev) => prev + '√(');
      setIsResult(false);
    } else if (value === 'x²') {
      setInput((prev) => prev + '**2');
      setIsResult(false);
    } else if (value === '^') {
      setInput((prev) => prev + '^');
      setIsResult(false);
    } else if (value === '%') {
      const match = input.match(/(\d+(\.\d+)?)/);
      if (match) {
        const number = parseFloat(match[0]);
        const percent = number / 100;
        const newInput = input.slice(0, -match[0].length) + percent;
        setInput(newInput);
        setIsResult(false);
      }
    } else if (value === '+/-') {
      if (input) {
        if (input.startsWith('-')) {
          setInput(input.slice(1));
        } else {
          setInput('-' + input);
        }
        setIsResult(false);
      }
    } else {
      if (isResult && !['+', '-', '*', '/', '^'].includes(value)) {
        setInput(value === ',' ? '0,' : value);
      } else {
        setInput((prev) => prev + (value === ',' ? '.' : value));
      }
      setResult(null);
      setIsResult(false);
    }
  };

  const basicButtons = [
    ['AC', '+/-', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
  ];

  const sciButtons = [
    ['sin', 'cos', 'tan', '^'],
    ['log', 'ln', '(', ')'],
    ['√', 'x²', 'π', 'e'],
  ];

  const renderButton = (btn) => {
    let displayValue = btn;

    if (btn === 'AC') {
      displayValue = input.length > 0 && !isResult ? 'C' : 'AC';
    }

    const isOperator = ['/', '*', '-', '+', '=', '^'].includes(displayValue);
    const isTop = ['AC', 'C', '+/-', '%'].includes(displayValue);
    const isZero = displayValue === '0';
    const isSci = ['sin', 'cos', 'tan', 'log', 'ln', '√', 'x²', 'π', 'e', '^', '(', ')'].includes(displayValue);

    return (
      <button
        key={btn}
        onClick={() => handleClick(displayValue)}
        className={`text-xl font-semibold rounded-full py-4 ${
          isZero ? 'col-span-2' : 'w-full'
        } ${
          isOperator
            ? 'bg-orange-400 text-white'
            : isTop
            ? 'bg-gray-300 text-black'
            : isSci
            ? 'bg-blue-200 text-black'
            : 'bg-white text-black'
        }`}
      >
        {displayValue}
      </button>
    );
  };

  return (
    <div className="min-h-screen animate-gradient flex items-center justify-center relative">
      <button
        onClick={() => setScientific(!scientific)}
        className="absolute top-4 right-4 bg-white text-black px-4 py-2 rounded-xl text-sm shadow"
      >
        {scientific ? 'Normal' : 'Sci'}
      </button>

      <button
        onClick={() => setShowScanner(true)}
        className="absolute top-4 left-4 bg-white text-black px-4 py-2 rounded-xl text-sm shadow"
      >
        Сканер
      </button>

      {showScanner && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50 p-4">
          <button
            onClick={() => setUseFrontCamera((prev) => !prev)}
            className="bg-white text-black px-4 py-2 rounded-xl mb-2"
          >
            Переключить камеру
          </button>

          {!imageSrc ? (
            <>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-72 h-56 rounded-xl mb-4"
                videoConstraints={{ facingMode: useFrontCamera ? 'user' : 'environment' }}
              />
              <button
                onClick={handleCapture}
                className="bg-white text-black px-6 py-2 rounded-xl mb-2"
              >
                Сделать снимок
              </button>
            </>
          ) : (
            <>
              <div
                className="relative"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
              >
                <img src={imageSrc} alt="Preview" className="rounded-xl max-w-xs mb-4" />
                {selection && (
                  <div
                    className="absolute border-2 border-green-500"
                    style={{
                      top: selection.y,
                      left: selection.x,
                      width: selection.width,
                      height: selection.height,
                    }}
                  ></div>
                )}
              </div>
              <button
                onClick={handleScan}
                className="bg-green-500 text-white px-6 py-2 rounded-xl text-lg"
              >
                {loading ? 'Сканирование...' : 'Сканировать'}
              </button>
              <button
                onClick={() => setImageSrc(null)}
                className="text-white underline mt-2"
              >
                Сделать другой снимок
              </button>
            </>
          )}
          <button
            onClick={() => {
              setShowScanner(false);
              setImageSrc(null);
              setSelection(null);
            }}
            className="absolute top-4 right-4 text-white text-xl"
          >
            ✕
          </button>
        </div>
      )}

      <div className="w-80 rounded-3xl bg-transparent p-4">
        <div className="bg-transparent text-white text-right text-5xl p-4 h-24 flex items-end justify-end overflow-x-auto">
          {input || '0'}
        </div>

        {scientific && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {sciButtons.flat().map(renderButton)}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          {basicButtons.flat().map(renderButton)}
          {renderButton('0')}
          {renderButton(',')}
          {renderButton('=')}
        </div>
      </div>
    </div>
  );
};

export default Calculator;