import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, RTCView } from 'react-native-webrtc';
import io from 'socket.io-client';

const socket = io(''); // signaling server URL

const App = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [status, setStatus] = useState('Waiting for call...');
  const [isCalling, setIsCalling] = useState(false);

  // Set up peer connection and media stream
  const openMediaDevices = useCallback(async () => {
    try {
      const mediaStream = await mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(mediaStream);
    } catch (error) {
      console.error('Error accessing media devices: ', error);
      setStatus('Error accessing media devices');
    }
  }, []);

  // Handle incoming offer
  useEffect(() => {
    socket.on('offer', async (offer) => {
      console.log('Received offer', offer);
      setStatus('Receiving offer...');
      const pc = new RTCPeerConnection();
      setPeerConnection(pc);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('candidate', event.candidate);
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote track', event);
        setRemoteStream(event.streams[0]);
      };

      // Add local media tracks to the peer connection
      localStream?.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', answer);
        setStatus('Answering call...');
      } catch (error) {
        console.error('Error handling offer: ', error);
        setStatus('Error handling offer');
      }
    });

    // Handle incoming answer
    socket.on('answer', async (answer) => {
      console.log('Received answer', answer);
      setStatus('Call established');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // Handle ICE candidates
    socket.on('candidate', async (candidate) => {
      console.log('Received ICE candidate', candidate);
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('candidate');
    };
  }, [localStream, peerConnection]);

  // Start a call (create an offer)
  const startCall = async () => {
    if (!localStream) {
      setStatus('No local stream available');
      return;
    }

    const pc = new RTCPeerConnection();
    setPeerConnection(pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track', event);
      setRemoteStream(event.streams[0]);
    };

    // Add local media tracks to the peer connection
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', offer);
      setStatus('Calling...');
      setIsCalling(true);
    } catch (error) {
      console.error('Error creating offer: ', error);
      setStatus('Error starting call');
    }
  };

  // Hang up the call (close peer connection and reset state)
  const hangUp = () => {
    if (peerConnection) {
      peerConnection.close();
    }
    setPeerConnection(null);
    setRemoteStream(null);
    setIsCalling(false);
    setStatus('Call ended');
  };

  // Start by opening media devices
  useEffect(() => {
    openMediaDevices();
  }, [openMediaDevices]);

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      <View style={styles.videoContainer}>
        {/* Local video */}
        {localStream && (
          <RTCView
            style={styles.localVideo}
            streamURL={localStream.toURL()}
            mirror={true}
          />
        )}
        {/* Remote video */}
        {remoteStream && (
          <RTCView
            style={styles.remoteVideo}
            streamURL={remoteStream.toURL()}
          />
        )}
      </View>
      <View style={styles.buttons}>
        {isCalling ? (
          <Button title="Hang Up" onPress={hangUp} />
        ) : (
          <Button title="Start Call" onPress={startCall} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  status: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  videoContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  localVideo: {
    width: 100,
    height: 150,
    marginRight: 10,
    backgroundColor: 'black',
  },
  remoteVideo: {
    width: 300,
    height: 450,
    backgroundColor: 'black',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
});

export default App;
