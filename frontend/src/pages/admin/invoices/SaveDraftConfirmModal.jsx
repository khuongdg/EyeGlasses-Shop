import React from 'react';
import { Modal, Button } from 'antd';

const SaveDraftConfirmModal = ({
    showSaveDraftConfirm,
    setShowSaveDraftConfirm,
    handleDiscard,
    handleSaveDraft
}) => {
    return (
        <Modal
            title={<span className="font-bold text-gray-800">Lưu bản nháp?</span>}
            open={showSaveDraftConfirm}
            onCancel={() => setShowSaveDraftConfirm(false)}
            centered
            footer={
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button className="rounded-full w-full sm:w-auto" onClick={() => setShowSaveDraftConfirm(false)}>
                        Quay lại
                    </Button>
                    <Button danger className="rounded-full w-full sm:w-auto" onClick={handleDiscard}>
                        Không lưu
                    </Button>
                    <Button type="primary" className="rounded-full bg-blue-600 hover:!bg-blue-700 w-full sm:w-auto border-none" onClick={handleSaveDraft}>
                        Lưu bản nháp
                    </Button>
                </div>
            }
        >
            <div className="py-2">
                <p className="text-gray-600">Bạn có muốn lưu thông tin phiếu đang tạo này dưới dạng bản nháp để tiếp tục chỉnh sửa vào lần sau không?</p>
            </div>
        </Modal>
    );
};

export default SaveDraftConfirmModal;
