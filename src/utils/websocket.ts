export type SignalingMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'peer-joined' | 'peer-left';
  roomId: string;
  data?: any;
};

export type CaptionMessage = {
  speaker: string;
  text: string;
  translation: string;
  timestamp: number;
  language: string;
};

export class WebSocketManager {
  private signalingWs: WebSocket | null = null;
  private captionsWs: WebSocket | null = null;
  private backendUrl: string;
  
  constructor(backendUrl: string = 'ws://localhost:8000') {
    this.backendUrl = backendUrl;
  }

  connectSignaling(roomId: string, onMessage: (msg: SignalingMessage) => void) {
    this.signalingWs = new WebSocket(`${this.backendUrl}/ws/signaling`);
    
    this.signalingWs.onopen = () => {
      console.log('Signaling WebSocket connected');
      this.sendSignaling({ type: 'join-room', roomId });
    };

    this.signalingWs.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };

    this.signalingWs.onerror = (error) => {
      console.error('Signaling WebSocket error:', error);
    };

    this.signalingWs.onclose = () => {
      console.log('Signaling WebSocket closed');
    };
  }

  connectCaptions(roomId: string, onCaption: (caption: CaptionMessage) => void) {
    this.captionsWs = new WebSocket(`${this.backendUrl}/ws/captions/${roomId}`);
    
    this.captionsWs.onopen = () => {
      console.log('Captions WebSocket connected');
    };

    this.captionsWs.onmessage = (event) => {
      const caption = JSON.parse(event.data);
      onCaption(caption);
    };

    this.captionsWs.onerror = (error) => {
      console.error('Captions WebSocket error:', error);
    };

    this.captionsWs.onclose = () => {
      console.log('Captions WebSocket closed');
    };
  }

  sendSignaling(message: SignalingMessage) {
    if (this.signalingWs?.readyState === WebSocket.OPEN) {
      this.signalingWs.send(JSON.stringify(message));
    }
  }

  sendAudioChunk(audioBlob: Blob) {
    if (this.captionsWs?.readyState === WebSocket.OPEN) {
      this.captionsWs.send(audioBlob);
    }
  }

  disconnect() {
    this.signalingWs?.close();
    this.captionsWs?.close();
  }
}
