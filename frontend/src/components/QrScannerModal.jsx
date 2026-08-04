import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, message, Space, Alert } from 'antd';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraOutlined, StopOutlined } from '@ant-design/icons';

const QrScannerModal = ({ open, onClose, onScanSuccess }) => {
    const scannerRef = useRef(null);
    const [cameraPermission, setCameraPermission] = useState('pending'); // pending, granted, denied
    const [isScanning, setIsScanning] = useState(false);
    const lastScannedText = useRef('');
    const lastScannedTime = useRef(0);
    const html5QrCodeInstance = useRef(null);

    // Bíp âm thanh khi quét thành công (Sử dụng Web Audio API tự tổng hợp tần số âm thanh)
    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(900, audioCtx.currentTime); // Tần số 900Hz thanh thoát
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // Âm lượng nhỏ vừa nghe
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                audioCtx.close();
            }, 120);
        } catch (e) {
            console.error("Không thể phát âm thanh beep", e);
        }
    };

    useEffect(() => {
        if (!open) {
            stopScanner();
            return;
        }

        // Khởi động trình quét sau khi DOM của Modal được render xong
        const timer = setTimeout(() => {
            startScanner();
        }, 300);

        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    }, [open]);

    const startScanner = async () => {
        const elementId = "qr-reader-container";
        const element = document.getElementById(elementId);
        if (!element) return;

        try {
            const html5QrCode = new Html5Qrcode(elementId);
            html5QrCodeInstance.current = html5QrCode;
            
            const config = {
                fps: 10,
                qrbox: (width, height) => {
                    const size = Math.min(width, height) * 0.65;
                    return { width: size, height: size };
                },
                aspectRatio: 1.0
            };

            setIsScanning(true);
            setCameraPermission('granted');

            await html5QrCode.start(
                { facingMode: "environment" }, // Ưu tiên camera sau
                config,
                (decodedText) => {
                    // Cơ chế chống trùng lặp: bỏ qua nếu trùng mã vừa quét trong vòng 2 giây
                    const now = Date.now();
                    if (decodedText === lastScannedText.current && (now - lastScannedTime.current < 2000)) {
                        return;
                    }

                    lastScannedText.current = decodedText;
                    lastScannedTime.current = now;

                    playBeep();
                    
                    // Nháy viền xanh lá để báo hiệu thành công trực quan
                    const readerBorder = document.querySelector("#qr-reader-container");
                    if (readerBorder) {
                        readerBorder.style.borderColor = "#52c41a";
                        setTimeout(() => {
                            if (readerBorder) readerBorder.style.borderColor = "#1677ff";
                        }, 500);
                    }

                    onScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // Không cần log lỗi này để tránh tràn console khi quét lỗi từng frame
                }
            );
        } catch (err) {
            console.error("Camera init error:", err);
            setCameraPermission('denied');
            setIsScanning(false);
            message.error("Không thể truy cập camera. Vui lòng kiểm tra quyền thiết bị.");
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeInstance.current && html5QrCodeInstance.current.isScanning) {
            try {
                await html5QrCodeInstance.current.stop();
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
        html5QrCodeInstance.current = null;
        setIsScanning(false);
        lastScannedText.current = '';
    };

    return (
        <Modal
            title={
                <Space>
                    <CameraOutlined style={{ color: '#1677ff' }} />
                    <span className="font-bold">Quét mã QR sản phẩm</span>
                </Space>
            }
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose} icon={<StopOutlined />}>
                    Đóng camera
                </Button>
            ]}
            destroyOnClose
            centered
            width={450}
        >
            <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                {cameraPermission === 'denied' && (
                    <Alert
                        message="Lỗi truy cập camera"
                        description="Trình duyệt không được phép truy cập camera. Bạn hãy cấp quyền camera trong cài đặt trình duyệt/thiết bị và thử lại."
                        type="error"
                        showIcon
                        style={{ marginBottom: '12px' }}
                    />
                )}

                <div 
                    id="qr-reader-container" 
                    style={{ 
                        width: '100%', 
                        overflow: 'hidden', 
                        borderRadius: '12px',
                        border: '2px solid #1677ff',
                        background: '#000',
                        transition: 'border-color 0.3s ease'
                    }}
                ></div>
                
                <div className="text-center mt-3 text-gray-500 text-sm">
                    {isScanning ? (
                        <span>Di chuyển camera trước mã QR sản phẩm. Hệ thống sẽ tự động quét liên tiếp.</span>
                    ) : (
                        <span>Đang kết nối camera...</span>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default QrScannerModal;
