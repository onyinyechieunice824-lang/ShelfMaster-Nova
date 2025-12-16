import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera, RefreshCcw, Layers, Scan } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  continuous?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, continuous = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const codeReader = useRef(new BrowserMultiFormatReader());
  const lastResult = useRef<string>('');
  const lastScanTime = useRef<number>(0);
  
  // Internal state for continuous mode
  const [isContinuous, setIsContinuous] = useState(continuous);
  // Ref to access current state inside the scanner callback without restarting the effect
  const isContinuousRef = useRef(continuous);

  useEffect(() => {
    isContinuousRef.current = isContinuous;
  }, [isContinuous]);

  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1500, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      }
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  useEffect(() => {
    let mounted = true;

    codeReader.current.listVideoInputDevices()
      .then((videoInputDevices) => {
        if (mounted) {
          setVideoInputDevices(videoInputDevices);
          if (videoInputDevices.length > 0) {
             // Prefer back camera if available
             const backCamera = videoInputDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
             setSelectedDeviceId(backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Could not access camera devices.');
      });

    return () => {
      mounted = false;
      codeReader.current.reset();
    };
  }, []);

  useEffect(() => {
    if (!selectedDeviceId || !videoRef.current) return;

    codeReader.current.reset();

    codeReader.current.decodeFromVideoDevice(
      selectedDeviceId,
      videoRef.current,
      (result, err) => {
        if (result) {
          const text = result.getText();
          const now = Date.now();
          
          // Prevent rapid duplicate scans (debounce 1.5s for same code)
          if (text === lastResult.current && now - lastScanTime.current < 1500) {
            return;
          }

          lastResult.current = text;
          lastScanTime.current = now;
          playBeep();
          onScan(text);
          
          // Use the ref to check current mode
          if (!isContinuousRef.current) {
            onClose();
          }
        }
        if (err && !(err instanceof NotFoundException)) {
          console.error(err);
        }
      }
    ).then(() => {
        // Attempt to enable auto-focus for clearer barcode reading
        const video = videoRef.current;
        if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            if (track) {
                // Check capabilities safely
                const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
                
                if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                    track.applyConstraints({
                        advanced: [{ focusMode: 'continuous' } as any]
                    }).catch(e => console.debug('Auto-focus constraint failed:', e));
                }
            }
        }
    }).catch(err => {
        console.error(err);
        setError('Error starting camera stream.');
    });

    return () => {
        codeReader.current.reset();
    };
  }, [selectedDeviceId, onScan, onClose]); // Removed isContinuous from deps to prevent restart

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-700">
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
            <h3 className="text-white font-bold flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-400" />
                Scan Barcode
            </h3>
            <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="relative bg-black aspect-[4/3] w-full">
            {error ? (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 p-4 text-center">
                    {error}
                </div>
            ) : (
                <>
                    <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover"
                    />
                    {/* Visual Guide Overlay */}
                    <div className="absolute inset-0 border-2 border-red-500 opacity-50 pointer-events-none w-3/4 h-1/2 m-auto rounded-lg box-content shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="w-[80%] h-[2px] bg-red-600 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                    </div>
                </>
            )}
        </div>

        <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
            <div className="text-sm text-gray-400">
                {videoInputDevices.length > 1 && (
                    <button 
                        onClick={() => {
                            const currentIndex = videoInputDevices.findIndex(d => d.deviceId === selectedDeviceId);
                            const nextIndex = (currentIndex + 1) % videoInputDevices.length;
                            setSelectedDeviceId(videoInputDevices[nextIndex].deviceId);
                        }}
                        className="flex items-center gap-2 hover:text-white"
                    >
                        <RefreshCcw className="w-4 h-4" /> Switch Camera
                    </button>
                )}
            </div>
            
            <button 
                onClick={() => setIsContinuous(!isContinuous)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isContinuous 
                    ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
                {isContinuous ? (
                    <>
                        <Layers className="w-4 h-4" /> Multi-Scan ON
                    </>
                ) : (
                    <>
                        <Scan className="w-4 h-4" /> Single Scan
                    </>
                )}
            </button>
        </div>
      </div>
      <p className="text-white mt-4 text-sm opacity-75">Point camera at barcode to scan</p>
    </div>
  );
};

export default BarcodeScanner;