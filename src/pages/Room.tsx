import { useParams, Navigate } from 'react-router-dom';
import VideoCall from '@/components/VideoCall';

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();

  if (!roomId) {
    return <Navigate to="/" replace />;
  }

  return <VideoCall roomId={roomId} />;
};

export default Room;
