import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, message, Space, Alert, Slider } from 'antd';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOutlined, StopOutlined } from '@ant-design/icons';

const QrScannerModal = ({ open, onClose, onScanSuccess }) => {
    const scannerRef = useRef(null);
    const [cameraPermission, setCameraPermission] = useState('pending'); // pending, granted, denied
    const [isScanning, setIsScanning] = useState(false);
    const [zoomCapabilities, setZoomCapabilities] = useState(null);
    const [currentZoom, setCurrentZoom] = useState(1);
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
                fps: 18, // Tăng tốc độ quét (quét liên tục nhiều khung hình hơn trên giây)
                qrbox: (width, height) => {
                    const size = Math.min(width, height) * 0.8; // Khung quét rộng hơn, không cần đưa quá sát
                    return { width: size, height: size };
                },
                formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ], // Chỉ tập trung giải mã QR_CODE, bỏ qua các định dạng barcode khác để tăng tốc độ và độ nhạy tối đa
                videoConstraints: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
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

            // Kiểm tra khả năng thu phóng (zoom) của camera sau khi khởi động thành công
            try {
                const track = html5QrCode.getRunningTrack();
                if (track) {
                    const capabilities = track.getCapabilities();
                    if (capabilities.zoom) {
                        setZoomCapabilities({
                            min: capabilities.zoom.min || 1,
                            max: capabilities.zoom.max || 1,
                            step: capabilities.zoom.step || 0.1
                        });
                        setCurrentZoom(track.getSettings().zoom || 1);
                    } else {
                        setZoomCapabilities(null);
                    }
                }
            } catch (e) {
                console.warn("Không thể lấy thông số Zoom của camera:", e);
            }
        } catch (err) {
            console.error("Camera init error:", err);
            setCameraPermission('denied');
            setIsScanning(false);
            message.error("Không thể truy cập camera. Vui lòng kiểm tra quyền thiết bị.");
        }
    };

    const handleZoomChange = async (value) => {
        setCurrentZoom(value);
        try {
            if (html5QrCodeInstance.current) {
                const track = html5QrCodeInstance.current.getRunningTrack();
                if (track) {
                    await track.applyConstraints({
                        advanced: [{ zoom: value }]
                    });
                }
            }
        } catch (err) {
            console.error("Không thể áp dụng thu phóng:", err);
        }
    };

    const stopScanner = async () => {
        setZoomCapabilities(null);
        setCurrentZoom(1);
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

                {zoomCapabilities && (
                    <div className="flex flex-col gap-2 mt-4 px-3 py-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 text-xs font-semibold">Thu phóng: {currentZoom.toFixed(1)}x</span>
                            <div className="flex gap-1.5">
                                {[1, 1.5, 2, 2.5, 3].map(z => {
                                    if (z >= zoomCapabilities.min && z <= zoomCapabilities.max) {
                                        return (
                                            <Button
                                                key={z}
                                                size="small"
                                                type={Math.abs(currentZoom - z) < 0.1 ? "primary" : "default"}
                                                className="rounded-md text-xs px-2"
                                                onClick={() => handleZoomChange(z)}
                                            >
                                                {z}x
                                            </Button>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                        <Slider
                            min={zoomCapabilities.min}
                            max={zoomCapabilities.max}
                            step={zoomCapabilities.step}
                            value={currentZoom}
                            onChange={handleZoomChange}
                            tooltip={{ formatter: (val) => `${val.toFixed(1)}x` }}
                            className="m-0 py-1"
                        />
                    </div>
                )}
                
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
