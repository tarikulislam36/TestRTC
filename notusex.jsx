import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    Button,
    Alert,
    StyleSheet,
    Dimensions,
} from 'react-native';
import Peer from 'react-native-peerjs';
import { RTCView, mediaDevices } from 'react-native-webrtc';

const { width } = Dimensions.get('window');

// Backend PeerJS server configuration
const PEER_SERVER = {
    host: '0.peerjs.com', // Replace with your server IP or hostname
    port: 443,
    path: '/',
    secure: false, // Set to true if using HTTPS
};

const App = () => {
    const [localPeer] = useState(() => new Peer(undefined, PEER_SERVER));
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [localPeerId, setLocalPeerId] = useState('');
    const [remotePeerId, setRemotePeerId] = useState('');
    const [status, setStatus] = useState('Initializing...');

    useEffect(() => {
        // Set up the local peer and acquire media
        setStatus('Setting up local peer...');
        mediaDevices
            .getUserMedia({
                audio: true,
                video: {
                    mandatory: {
                        minWidth: 640,
                        minHeight: 480,
                        minFrameRate: 30,
                    },
                },
            })
            .then((stream) => {
                setLocalStream(stream);
                setStatus('Local media stream acquired.');
            })
            .catch((error) => {
                setStatus(`Error getting media: ${error.message}`);
            });

        // Initialize PeerJS
        localPeer.on('open', (id) => {
            setLocalPeerId(id);
            setStatus(`Peer initialized with ID: ${id}`);
            console.log(`My peer ID is: ${id}`);
        });

        // Handle incoming calls
        localPeer.on('call', (call) => {
            setStatus('Incoming call...');
            call.answer(localStream);
            setStatus('Call answered. Waiting for remote stream...');
            call.on('stream', (stream) => {
                setRemoteStream(stream);
                setStatus('Remote stream received.');
            });
            call.on('error', (err) => {
                setStatus(`Call error: ${err.message}`);
            });
        });

        localPeer.on('error', (err) => {
            setStatus(`Peer error: ${err.message}`);
        });

        return () => {
            if (localPeer) localPeer.destroy();
        };
    }, [localPeer]);

    const connectToPeer = () => {
        if (!remotePeerId) {
            Alert.alert('Error', 'Please enter a valid Peer ID');
            return;
        }
        setStatus(`Connecting to remote peer: ${remotePeerId}...`);
        const call = localPeer.call(remotePeerId, localStream);

        call.on('stream', (stream) => {
            setRemoteStream(stream);
            setStatus('Connected and receiving remote stream.');
        });

        call.on('error', (err) => {
            setStatus(`Connection error: ${err.message}`);
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View>
                <Text style={styles.label}>Status:</Text>
                <Text style={styles.status}>{status}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Your Peer ID:</Text>
                <Text selectable style={styles.peerId}>
                    {localPeerId || 'Generating...'}
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Connect to Peer:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter remote Peer ID"
                    value={remotePeerId}
                    onChangeText={setRemotePeerId}
                />
                <Button title="Connect" onPress={connectToPeer} />
            </View>

            <View style={styles.videoContainer}>
                <Text style={styles.label}>Local Stream:</Text>
                {localStream ? (
                    <RTCView
                        streamURL={localStream.toURL()}
                        style={styles.video}
                    />
                ) : (
                    <Text>Initializing local stream...</Text>
                )}
            </View>

            <View style={styles.videoContainer}>
                <Text style={styles.label}>Remote Stream:</Text>
                {remoteStream ? (
                    <RTCView
                        streamURL={remoteStream.toURL()}
                        style={styles.video}
                    />
                ) : (
                    <Text>Waiting for remote stream...</Text>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    status: {
        fontSize: 14,
        color: 'blue',
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    peerId: {
        fontSize: 14,
        color: '#000',
        marginVertical: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
    },
    videoContainer: {
        marginVertical: 20,
    },
    video: {
        width: width * 0.9,
        height: 200,
        backgroundColor: 'gray',
    },
});

export default App;
