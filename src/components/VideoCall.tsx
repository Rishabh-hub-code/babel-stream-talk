import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Download } from 'lucide-react';
import { WebRTCManager } from '@/utils/webrtc';
import { WebSocketManager, CaptionMessage, SignalingMessage } from '@/utils/websocket';
import CaptionOverlay from './CaptionOverlay';
import { useToast } from '@/hooks/use-toast';

interface VideoCallProps {
  roomId: string;
  backendUrl?: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
];

const VideoCall = ({ roomId, backendUrl = 'ws://localhost:8000' }: VideoCallProps) => {
  const { toast } = useToast();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcRef = useRef<WebRTCManager>(new WebRTCManager());
  const wsRef = useRef<WebSocketManager>(new WebSocketManager(backendUrl));
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [captions, setCaptions] = useState<CaptionMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    initializeCall();
    return () => cleanup();
  }, [roomId]);

  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await webrtcRef.current.getLocalStream();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Connect signaling WebSocket
      wsRef.current.connectSignaling(roomId, handleSignalingMessage);

      // Connect captions WebSocket
      wsRef.current.connectCaptions(roomId, handleCaption);

      // Create peer connection
      webrtcRef.current.createPeerConnection(
        (candidate) => {
          wsRef.current.sendSignaling({
            type: 'ice-candidate',
            roomId,
            data: candidate,
          });
        },
        (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            setIsConnected(true);
            setConnectionStatus('connected');
            toast({
              title: 'Peer connected',
              description: 'You are now connected to another participant',
            });
          }
        }
      );

      setConnectionStatus('connecting');
    } catch (error) {
      console.error('Error initializing call:', error);
      setConnectionStatus('disconnected');
      toast({
        title: 'Connection error',
        description: 'Failed to initialize call. Please check your permissions.',
        variant: 'destructive',
      });
    }
  };

  const handleSignalingMessage = async (message: SignalingMessage) => {
    try {
      switch (message.type) {
        case 'peer-joined':
          // Create and send offer when peer joins
          const offer = await webrtcRef.current.createOffer();
          wsRef.current.sendSignaling({
            type: 'offer',
            roomId,
            data: offer,
          });
          break;

        case 'offer':
          await webrtcRef.current.setRemoteDescription(message.data);
          const answer = await webrtcRef.current.createAnswer();
          wsRef.current.sendSignaling({
            type: 'answer',
            roomId,
            data: answer,
          });
          break;

        case 'answer':
          await webrtcRef.current.setRemoteDescription(message.data);
          break;

        case 'ice-candidate':
          await webrtcRef.current.addIceCandidate(message.data);
          break;

        case 'peer-left':
          setIsConnected(false);
          setConnectionStatus('disconnected');
          toast({
            title: 'Peer disconnected',
            description: 'The other participant has left the call',
          });
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };

  const handleCaption = (caption: CaptionMessage) => {
    setCaptions((prev) => [...prev, caption]);
  };

  const toggleAudio = () => {
    webrtcRef.current.toggleAudio(!isAudioEnabled);
    setIsAudioEnabled(!isAudioEnabled);
  };

  const toggleVideo = () => {
    webrtcRef.current.toggleVideo(!isVideoEnabled);
    setIsVideoEnabled(!isVideoEnabled);
  };

  const endCall = () => {
    cleanup();
    window.location.href = '/';
  };

  const downloadTranscript = () => {
    const transcript = JSON.stringify(captions, null, 2);
    const blob = new Blob([transcript], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${roomId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cleanup = () => {
    webrtcRef.current.cleanup();
    wsRef.current.disconnect();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-foreground">Room: {roomId}</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-status-success' :
              connectionStatus === 'connecting' ? 'bg-status-warning animate-pulse' :
              'bg-status-error'
            }`} />
            <span className="text-sm text-muted-foreground capitalize">{connectionStatus}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Target language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={downloadTranscript} disabled={captions.length === 0}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Local Video */}
        <div className="relative bg-video-bg rounded-lg overflow-hidden border-2 border-video-border">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="text-sm font-medium text-foreground">You</span>
          </div>
          <CaptionOverlay captions={captions.filter(c => c.speaker === 'You')} />
        </div>

        {/* Remote Video */}
        <div className="relative bg-video-bg rounded-lg overflow-hidden border-2 border-border">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground text-lg">Waiting for peer...</p>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="text-sm font-medium text-foreground">Remote</span>
          </div>
          <CaptionOverlay captions={captions.filter(c => c.speaker !== 'You')} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-6 border-t border-border">
        <Button
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleAudio}
          className="rounded-full w-14 h-14"
        >
          {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        
        <Button
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleVideo}
          className="rounded-full w-14 h-14"
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        
        <Button
          variant="destructive"
          size="lg"
          onClick={endCall}
          className="rounded-full w-14 h-14"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default VideoCall;
