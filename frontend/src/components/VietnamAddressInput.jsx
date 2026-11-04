import React, { useState, useEffect, useRef } from 'react';
import { Select, Input } from 'antd';
import { getProvinces, getWardsByProvince } from '../services/vietnamAddressService';

const normalizeStr = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(tinh|thanh pho|tp\.|tp|phuong|xa|thi tran)\s+/gi, '')
    .trim();
};

const VietnamAddressInput = ({ value, onChange, placeholder = "Số nhà, tên đường, khu dân cư..." }) => {
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Lưu trữ mã và tên đã chọn (mô hình 2 cấp: Tỉnh/TP -> Phường/Xã theo API v2)
  const [selectedProvince, setSelectedProvince] = useState(null); // { code, name }
  const [selectedWard, setSelectedWard] = useState(null);         // { code, name }
  const [streetDetail, setStreetDetail] = useState('');

  const isUserInteracted = useRef(false);
  const parsedValueRef = useRef(null);

  // 1. Tải danh sách Tỉnh/Thành phố theo API v2 khi component mount
  useEffect(() => {
    let isMounted = true;
    const loadProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const list = await getProvinces();
        if (isMounted) {
          setProvinces(list);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách tỉnh thành (v2):', err);
      } finally {
        if (isMounted) setLoadingProvinces(false);
      }
    };
    loadProvinces();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tự động nhận diện và phân tích địa chỉ có sẵn nếu có value (khi bấm Sửa khách hàng)
  useEffect(() => {
    if (!value || isUserInteracted.current || parsedValueRef.current === value || provinces.length === 0) {
      return;
    }

    parsedValueRef.current = value;

    // Tách địa chỉ dạng: "Số nhà tên đường, Phường/Xã, Tỉnh/Thành phố"
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const provincePart = parts[parts.length - 1];
      const normProv = normalizeStr(provincePart);

      const matchedProv = provinces.find((p) => {
        const pNorm = normalizeStr(p.name);
        return pNorm.includes(normProv) || normProv.includes(pNorm);
      });

      if (matchedProv) {
        setSelectedProvince(matchedProv);
        // Tải danh sách phường/xã của tỉnh theo API v2
        getWardsByProvince(matchedProv.code).then((wList) => {
          setWards(wList);
          const wardPart = parts[parts.length - 2];
          const normWard = normalizeStr(wardPart);

          const matchedWard = wList.find((w) => {
            const wNorm = normalizeStr(w.name);
            return wNorm.includes(normWard) || normWard.includes(wNorm);
          });

          if (matchedWard) {
            setSelectedWard(matchedWard);
            const street = parts.slice(0, parts.length - 2).join(', ');
            setStreetDetail(street);
          } else {
            const street = parts.slice(0, parts.length - 1).join(', ');
            setStreetDetail(street);
          }
        });
      }
    } else {
      setStreetDetail(value);
    }
  }, [value, provinces]);

  // Ghép chuỗi địa chỉ hoàn chỉnh từ các thành phần
  const buildFullAddress = (street, ward, province) => {
    const parts = [
      street?.trim(),
      ward?.name?.trim(),
      province?.name?.trim()
    ].filter(Boolean);

    return parts.join(', ');
  };

  // Khi chọn Tỉnh/Thành phố
  const handleProvinceChange = async (code) => {
    isUserInteracted.current = true;
    const provinceObj = provinces.find((p) => p.code === code) || null;
    setSelectedProvince(provinceObj);
    setSelectedWard(null);
    setWards([]);

    if (code) {
      setLoadingWards(true);
      try {
        const wList = await getWardsByProvince(code);
        setWards(wList);
      } catch (err) {
        console.error('Lỗi khi tải phường xã:', err);
      } finally {
        setLoadingWards(false);
      }
    }

    const fullAddr = buildFullAddress(streetDetail, null, provinceObj);
    onChange?.(fullAddr);
  };

  // Khi chọn Phường/Xã
  const handleWardChange = (code) => {
    isUserInteracted.current = true;
    const wardObj = wards.find((w) => w.code === code) || null;
    setSelectedWard(wardObj);

    const fullAddr = buildFullAddress(streetDetail, wardObj, selectedProvince);
    onChange?.(fullAddr);
  };

  // Khi nhập Địa chỉ cụ thể (Số nhà, tên đường...)
  const handleStreetChange = (e) => {
    isUserInteracted.current = true;
    const val = e.target.value;
    setStreetDetail(val);

    const fullAddr = buildFullAddress(val, selectedWard, selectedProvince);
    onChange?.(fullAddr);
  };

  const currentPreview =
    buildFullAddress(streetDetail, selectedWard, selectedProvince) ||
    (value && !isUserInteracted.current ? value : '');

  return (
    <div className="space-y-2 w-full">
      {/* Hàng 2 Select: Tỉnh / Thành phố và Phường / Xã (Chuẩn API v2 sau sáp nhập) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Tỉnh / Thành phố</label>
          <Select
            showSearch
            className="w-full"
            placeholder="Chọn Tỉnh / TP"
            loading={loadingProvinces}
            value={selectedProvince?.code || undefined}
            onChange={handleProvinceChange}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={provinces.map((p) => ({
              value: p.code,
              label: p.name
            }))}
            allowClear
          />
        </div>

        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Phường / Xã</label>
          <Select
            showSearch
            className="w-full"
            placeholder={selectedProvince ? 'Chọn Phường / Xã' : 'Vui lòng chọn Tỉnh/TP trước'}
            loading={loadingWards}
            disabled={!selectedProvince}
            value={selectedWard?.code || undefined}
            onChange={handleWardChange}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={wards.map((w) => ({
              value: w.code,
              label: w.name
            }))}
            allowClear
          />
        </div>
      </div>

      {/* Ô nhập địa chỉ cụ thể */}
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Địa chỉ cụ thể (Số nhà, tên đường, khu dân cư...)</label>
        <Input
          value={streetDetail}
          onChange={handleStreetChange}
          placeholder={placeholder}
          allowClear
        />
      </div>

      {/* Hiển thị xem trước địa chỉ hoàn chỉnh */}
      {currentPreview && (
        <div className="p-2 bg-blue-50/60 border border-blue-200 rounded text-xs text-gray-700">
          <span className="font-semibold text-blue-900">Địa chỉ: </span>
          <span className="text-gray-800">{currentPreview}</span>
        </div>
      )}
    </div>
  );
};

export default VietnamAddressInput;
