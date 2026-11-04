// Service tích hợp Open API Tỉnh thành Việt Nam Phiên bản 2 (Sau sáp nhập 07/2025)
// Cấu trúc 2 cấp chuẩn: Tỉnh/Thành phố -> Phường/Xã
// Docs: https://provinces.open-api.vn/api/v2/

const API_V2_BASE = 'https://provinces.open-api.vn/api/v2';

const cache = {
  provinces: null,
  wardsByProvince: {}
};

/**
 * Lấy danh sách toàn bộ Tỉnh / Thành phố (Phiên bản v2 sau sáp nhập)
 */
export const getProvinces = async () => {
  if (cache.provinces && cache.provinces.length > 0) {
    return cache.provinces;
  }

  const res = await fetch(`${API_V2_BASE}/p/`);
  if (!res.ok) {
    throw new Error(`Lỗi tải danh sách tỉnh thành: ${res.statusText}`);
  }
  const data = await res.json();
  const list = (Array.isArray(data) ? data : []).map((item) => ({
    code: item.code,
    name: item.name
  }));

  cache.provinces = list;
  return list;
};

/**
 * Lấy danh sách Phường / Xã trực thuộc Tỉnh / Thành phố (depth=2)
 * @param {number|string} provinceCode
 */
export const getWardsByProvince = async (provinceCode) => {
  if (!provinceCode) return [];

  if (cache.wardsByProvince[provinceCode]) {
    return cache.wardsByProvince[provinceCode];
  }

  const res = await fetch(`${API_V2_BASE}/p/${provinceCode}?depth=2`);
  if (!res.ok) {
    throw new Error(`Lỗi tải danh sách phường xã: ${res.statusText}`);
  }
  const data = await res.json();
  const wards = (data?.wards || []).map((item) => ({
    code: item.code,
    name: item.name
  }));

  cache.wardsByProvince[provinceCode] = wards;
  return wards;
};
